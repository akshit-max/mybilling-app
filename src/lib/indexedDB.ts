import { openDB } from "idb";

export const dbPromise = openDB(
  "Cloud Ledger-db",
  2,
  {
    upgrade(db) {

      if (
        !db.objectStoreNames.contains(
          "offlineInvoices"
        )
      ) {

        db.createObjectStore(
          "offlineInvoices",
          {
            keyPath: "id",
            autoIncrement: true,
          }
        );

      }

      if (
        !db.objectStoreNames.contains(
          "offlineProducts"
        )
      ) {
        db.createObjectStore(
          "offlineProducts",
          {
            keyPath: "id",
            autoIncrement: true,
          }
        );
      }

      if (
        !db.objectStoreNames.contains(
          "products"
        )
      ) {

        db.createObjectStore(
          "products",
          {
            keyPath: "id",
          }
        );

      }

      if (
        !db.objectStoreNames.contains(
          "customers"
        )
      ) {

        db.createObjectStore(
          "customers",
          {
            keyPath: "id",
          }
        );

      }

    },
  }
);

type CachedCustomer = {
  id: string;
  userId?: string;
  name: string;
  gstin?: string;
  phone?: string;
  address?: string;
  state?: string;
};

type CachedProduct = {
  id: string;
  userId?: string;
  name: string;
  price: number;
  barcode?: string;
  stock?: number;
  unit?: string;
  gst?: number;
  hsnCode?: string;
};

export const cacheCustomers = async (
  customers: CachedCustomer[]
) => {
  const db = await dbPromise;
  const tx = db.transaction("customers", "readwrite");
  const store = tx.objectStore("customers");
  for (const customer of customers) {
    await store.put(customer);
  }
  await tx.done;
};

export const cacheProducts = async (
  products: CachedProduct[]
) => {
  const db = await dbPromise;
  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");
  for (const product of products) {
    await store.put(product);
  }
  await tx.done;
};

export const getCachedCustomers =
  async (userId?: string): Promise<CachedCustomer[]> => {
    const db = await dbPromise;
    const all = await db.getAll("customers");
    if (userId) return all.filter((c) => c.userId === userId);
    return all;
  };

export const getCachedProducts =
  async (userId?: string): Promise<CachedProduct[]> => {
    const db = await dbPromise;
    const all = await db.getAll("products");
    if (userId) return all.filter((p) => p.userId === userId);
    return all;
  };