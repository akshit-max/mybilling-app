import { openDB } from "idb";

export const dbPromise = openDB(
  "mybillbook-db",
  1,
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
  name: string;
  gstin?: string;
  phone?: string;
};

type CachedProduct = {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  stock?: number;
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
  async (): Promise<CachedCustomer[]> => {
    const db = await dbPromise;
    return db.getAll("customers");
  };

export const getCachedProducts =
  async (): Promise<CachedProduct[]> => {
    const db = await dbPromise;
    return db.getAll("products");
  };