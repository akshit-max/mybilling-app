import { dbPromise } from "./indexedDB";

export type OfflineProduct = {
  id?: number; // IndexedDB auto-increment id
  userId: string;
  name: string;
  type: string;
  category: string;
  price: number;
  taxIncluded: boolean;
  gst: number;
  unit: string;
  stock: number;
  itemCode: string | null;
  barcode: string | null;
  hsnCode: string | null;
  asOfDate: string;
  lowStockWarning: boolean;
  lowStockThreshold: number;
  description: string;
  costPrice: number;
  costTaxIncluded: boolean;
  discountOnSales: number;
  createdAt: Date;
  createdBy: string;
  isOffline: boolean; // Flag to identify it's an offline draft
  isEdit?: boolean; // Flag to indicate if it's an edit of an existing product
  originalProductId?: string; // If isEdit is true, this holds the original Firestore ID
};

export const saveOfflineProduct = async (product: OfflineProduct) => {
  const db = await dbPromise;
  await db.add("offlineProducts", product);
};

export const updateOfflineProduct = async (product: OfflineProduct & { id: number }) => {
  const db = await dbPromise;
  await db.put("offlineProducts", product);
};

export const getOfflineProducts = async (): Promise<OfflineProduct[]> => {
  const db = await dbPromise;
  return await db.getAll("offlineProducts");
};

export const deleteOfflineProduct = async (id: number) => {
  const db = await dbPromise;
  await db.delete("offlineProducts", id);
};

export const clearOfflineProducts = async () => {
  const db = await dbPromise;
  const tx = db.transaction("offlineProducts", "readwrite");
  await tx.objectStore("offlineProducts").clear();
  await tx.done;
};
