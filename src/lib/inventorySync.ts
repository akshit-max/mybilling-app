import { db } from "./firebase";
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from "firebase/firestore";

/**
 * Utility to sync inventory across the application.
 * Note: Uses sequential reads/writes for simplicity. In a high-concurrency production app,
 * this would ideally be done inside a Firestore runTransaction block or via Cloud Functions.
 */

export const syncInventory = async (
  userId: string,
  items: { id: string; quantity: number }[],
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
      const currentStock = Number(productData.stock) || 0;
      const qtyChange = action === "INCREASE" ? Number(item.quantity) : -Number(item.quantity);
      
      const updates: any = {
        stock: increment(qtyChange)
      };

      // Adjust godown stock if applicable
      if (mainGodownId && productData.stockByGodown) {
        const currentGodownStock = Number(productData.stockByGodown[mainGodownId]) || 0;
        updates[`stockByGodown.${mainGodownId}`] = increment(qtyChange);
      }

      await updateDoc(productRef, updates);
    }
  } catch (err) {
    console.error("Failed to sync inventory:", err);
    throw err; // Re-throw to allow callers to handle it if necessary
  }
};
