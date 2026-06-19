/**
 * saveToInventory.ts
 *
 * Shared utility for the "Save Custom Item to Inventory" feature.
 *
 * GUARANTEES:
 *  - This file never modifies any existing invoice, transaction, or product.
 *  - It never touches stock, batch tracking, inventory sync, GST logic,
 *    discount validation, offline invoice flows, or reporting.
 *  - It only creates a brand-new product document and optionally queues
 *    an offline product draft — both additive-only operations.
 *  - The product schema exactly matches what products/page.tsx > handleSaveModal()
 *    produces, including all audit fields and defaults.
 *  - The current transaction item keeps productId "CUSTOM"; deferred linking
 *    ensures zero risk of stock check errors in the same session.
 */

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Minimal item fields required to save to inventory
export type SaveToInventoryItem = {
  name: string;
  price: number | string;
  gstRate?: number;
  hsn?: string;
  description?: string;
};

// Minimal product shape for duplicate detection (already loaded in each page)
export type ExistingProduct = {
  id: string;
  name: string;
};

export type SaveToInventoryResult =
  | { success: true; productId: string }
  | { success: false; error: string };

/**
 * Online path: creates a new product in Firestore.
 * Schema is identical to handleSaveModal() in products/page.tsx.
 * Returns the new Firestore document ID on success.
 */
export async function saveCustomItemToInventory(
  item: SaveToInventoryItem,
  userId: string,
  existingProducts: ExistingProduct[],
  createdBy: string
): Promise<SaveToInventoryResult> {
  const trimmedName = (item.name || "").trim();
  if (!trimmedName) {
    return { success: false, error: "Item name cannot be empty." };
  }
  if (!userId) {
    return { success: false, error: "Authentication required." };
  }

  // Case-insensitive duplicate check against already-loaded products list
  const isDuplicate = existingProducts.some(
    (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return {
      success: false,
      error: `'${trimmedName}' already exists in inventory. Select it from the dropdown instead.`,
    };
  }

  // Exact schema match with products/page.tsx > handleSaveModal() > productData
  const productData = {
    userId,
    name: trimmedName,
    type: "Product" as const,
    category: "-",
    price: Number(item.price) || 0,
    taxIncluded: false,
    gst: Number(item.gstRate ?? 18),
    unit: "PCS",
    stock: 0,
    itemCode: null,
    barcode: null,
    batch: null,
    enableBatching: false,
    hsnCode: (item.hsn || "").trim() || null,
    asOfDate: new Date().toISOString().split("T")[0],
    lowStockWarning: false,
    lowStockThreshold: 2,
    description: (item.description || "").trim(),
    costPrice: 0,
    costTaxIncluded: false,
    discountOnSales: 0,
    partyPrices: [],
    customFields: [],
    createdAt: serverTimestamp(),
    createdBy: createdBy || "Admin",
  };

  // Server-side duplicate protection against race conditions
  const { query, where, getDocs } = await import("firebase/firestore");
  const duplicateQuery = query(
    collection(db, "products"),
    where("userId", "==", userId),
    where("name", "==", trimmedName)
  );
  
  // Note: Firestore doesn't support case-insensitive queries natively, 
  // but an exact match check handles the majority of race conditions.
  const duplicateSnap = await getDocs(duplicateQuery);
  if (!duplicateSnap.empty) {
    return {
      success: false,
      error: `'${trimmedName}' was just created on the server by another session.`,
    };
  }

  const docRef = await addDoc(collection(db, "products"), productData);
  return { success: true, productId: docRef.id };
}

/**
 * Offline path: queues a new product in the IndexedDB offlineProducts store.
 * On reconnect, the existing syncOfflineProducts() flow uploads it automatically —
 * no new sync logic is introduced.
 */
export async function saveCustomItemToInventoryOffline(
  item: SaveToInventoryItem,
  userId: string,
  existingProducts: ExistingProduct[],
  createdBy: string
): Promise<SaveToInventoryResult> {
  const trimmedName = (item.name || "").trim();
  if (!trimmedName) {
    return { success: false, error: "Item name cannot be empty." };
  }
  if (!userId) {
    return { success: false, error: "Authentication required." };
  }

  const isDuplicate = existingProducts.some(
    (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return {
      success: false,
      error: `'${trimmedName}' already exists in inventory. Select it from the dropdown instead.`,
    };
  }

  const { saveOfflineProduct } = await import("@/lib/offlineProducts");

  // Schema mirrors products/page.tsx offline path exactly
  await saveOfflineProduct({
    userId,
    name: trimmedName,
    type: "Product",
    category: "-",
    price: Number(item.price) || 0,
    taxIncluded: false,
    gst: Number(item.gstRate ?? 18),
    unit: "PCS",
    stock: 0,
    itemCode: null,
    barcode: null,
    hsnCode: (item.hsn || "").trim() || null,
    asOfDate: new Date().toISOString().split("T")[0],
    lowStockWarning: false,
    lowStockThreshold: 2,
    description: (item.description || "").trim(),
    costPrice: 0,
    costTaxIncluded: false,
    discountOnSales: 0,
    createdAt: new Date(),
    createdBy: createdBy || "Admin",
    isOffline: true,
    isEdit: false,
    originalProductId: undefined,
  });

  // Return a synthetic ID so the caller can mark the row as saved
  return { success: true, productId: `offline-pending-${Date.now()}` };
}
