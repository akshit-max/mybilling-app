import { db } from "./firebase";
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, runTransaction } from "firebase/firestore";

export const calculateInventoryUpdates = (
  pData: any,
  item: any,
  action: "DECREASE" | "INCREASE",
  mainGodownId: string | null
) => {
  let batches = pData.batches ? [...pData.batches] : [];
  let newStock = Number(pData.stock) || 0;
  const qtyChange = action === "INCREASE" ? Number(item.quantity) : -Number(item.quantity);

  if (action === "INCREASE") {
      if (item.selectedBatchId) {
          const bIdx = batches.findIndex((b: any) => b.batchId === item.selectedBatchId);
          if (bIdx > -1) {
              batches[bIdx] = { ...batches[bIdx], qty: batches[bIdx].qty + Number(item.quantity) };
              batches[bIdx].isDepleted = batches[bIdx].qty <= 0;
          } else {
              batches.push({
                  batchId: item.selectedBatchId,
                  batchNumber: item.batchNumber || "RET-UNKNOWN",
                  mfgDate: item.mfgDate || "",
                  expDate: item.expDate || "",
                  qty: Number(item.quantity),
                  isDepleted: false
              });
          }
      } else if (item.batchNumber) {
          batches.push({
              batchId: `B-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate || "",
              expDate: item.expDate || "",
              qty: Number(item.quantity),
              isDepleted: false
          });
      }
      newStock += Number(item.quantity);
  } else {
      if (item.selectedBatchId) {
         const bIdx = batches.findIndex((b: any) => b.batchId === item.selectedBatchId);
         if (bIdx > -1) {
             batches[bIdx] = { ...batches[bIdx], qty: batches[bIdx].qty - Number(item.quantity) };
             batches[bIdx].isDepleted = batches[bIdx].qty <= 0;
         }
      } else {
         let needed = Number(item.quantity);
         batches.sort((a: any, b: any) => {
            if (!a.expDate) return 1;
            if (!b.expDate) return -1;
            return new Date(a.expDate).getTime() - new Date(b.expDate).getTime();
         });
         for (let b of batches) {
            if (needed <= 0) break;
            if (b.isDepleted || b.qty <= 0) continue;
            if (b.qty >= needed) {
                b.qty -= needed;
                needed = 0;
            } else {
                needed -= b.qty;
                b.qty = 0;
            }
            b.isDepleted = b.qty <= 0;
         }
         if (needed > 0) {
            throw new Error(`Insufficient batch stock for ${pData.name || 'item'}.`);
         }
      }
      newStock -= Number(item.quantity);
      if (newStock < 0) {
         throw new Error(`Negative stock not allowed for ${pData.name || 'item'}.`);
      }
  }

  // PRUNING: Remove depleted batches older than 90 days
  const now = Date.now();
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  batches = batches.filter((b: any) => {
      if (b.isDepleted && b.expDate) {
          const expTime = new Date(b.expDate).getTime();
          if (now - expTime > NINETY_DAYS) return false;
      }
      return true;
  });

  const updates: any = { stock: newStock, batches };
  if (mainGodownId && pData.stockByGodown) {
     updates[`stockByGodown.${mainGodownId}`] = (Number(pData.stockByGodown[mainGodownId]) || 0) + qtyChange;
  }
  return updates;
};

export const syncInventory = async (
  userId: string,
  items: { 
    id: string; 
    quantity: number;
    batchNumber?: string;
    mfgDate?: string;
    expDate?: string;
    selectedBatchId?: string;
  }[],
  action: "DECREASE" | "INCREASE"
) => {
  if (!userId || !items || items.length === 0) return;

  try {
    // 1. Fetch main godown (if Godown management is enabled, we default to adjusting Main Godown)
    let mainGodownId: string | null = null;
    const godownsQ = query(collection(db, "godowns"), where("userId", "==", userId), where("isMain", "==", true));
    const godownsSnap = await getDocs(godownsQ);
    if (!godownsSnap.empty) {
      mainGodownId = godownsSnap.docs[0].id;
    }

    // 2. Loop through items and update
    for (const item of items) {
      if (!item.id || !item.quantity) continue;
      
      const productRef = doc(db, "products", item.id);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) continue;
      
      const productData = productSnap.data();
      const qtyChange = action === "INCREASE" ? Number(item.quantity) : -Number(item.quantity);

      // STRICT FEATURE FLAG ENFORCEMENT
      if (productData.enableBatching && productData.batches !== undefined) {
         // --- NEW BATCH ENGINE ---
         await runTransaction(db, async (t) => {
             const pSnap = await t.get(productRef);
             if (!pSnap.exists()) return;
             
             const updates = calculateInventoryUpdates(pSnap.data(), item, action, mainGodownId);

             t.update(productRef, updates);
         });
      } else {
         // --- EXACT LEGACY PATH ---
         const updates: any = {
           stock: increment(qtyChange)
         };

         // Adjust godown stock if applicable
         if (mainGodownId && productData.stockByGodown) {
           updates[`stockByGodown.${mainGodownId}`] = increment(qtyChange);
         }

         await updateDoc(productRef, updates);
      }
    }
  } catch (err) {
    console.error("Failed to sync inventory:", err);
    throw err; 
  }
};
