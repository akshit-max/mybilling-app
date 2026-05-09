import {
  collection,
  doc,
  runTransaction,
} from "firebase/firestore";

import { db }
from "@/lib/firebase";

import {
  getOfflineInvoices,
} from "./offlineInvoices";

import { dbPromise } from "./indexedDB";

let isSyncInProgress = false;

type StoredOfflineInvoice = {
  id?: number;

  items: {
    productId?: string;
    qty: number;
    name?: string;
  }[];

  [key: string]: unknown;
};

const removeOfflineInvoiceByKey =
async (
  invoice: StoredOfflineInvoice
) => {
  const key = invoice.id;
  if (typeof key !== "number") {
    return;
  }
  const idb =
    await dbPromise;
  await idb.delete(
    "offlineInvoices",
    key,
  );
};

const syncOneInvoice =
async (
  invoice: StoredOfflineInvoice
) => {
  const firestoreInvoice = {
    ...invoice,
  };
  delete firestoreInvoice.id;

  const usage =
    new Map<
      string,
      number
    >();

  for (const item of invoice.items ||
    []) {
    if (
      !item.productId
    ) continue;
    usage.set(
      item.productId,
      (usage.get(
        item.productId
      ) || 0) +
        item.qty
    );
  }

  await runTransaction(
    db,
    async (tx) => {
      for (
        const [
          productId,
          qtyNeeded,
        ] of usage
      ) {

        const productRef =
          doc(
            db,
            "products",
            productId
          );

        const productSnap =
          await tx.get(
            productRef
          );

        if (
          !productSnap.exists()
        ) {

          throw new Error(
            `Missing product ${productId}`
          );
        }

        const stock =
          productSnap.data()
            ?.stock || 0;

        if (
          qtyNeeded > stock
        ) {

          throw new Error(
            `Insufficient stock for ${productId}`
          );
        }

        tx.update(
          productRef,
          {
            stock:
              stock -
              qtyNeeded,
          }
        );
      }

      const invRef =
        doc(
          collection(
            db,
            "invoices"
          )
        );

      tx.set(
        invRef,
        {
          ...firestoreInvoice,
          syncedAt:
            new Date(),
        }
      );
    }
  );
};

export const syncOfflineInvoices =
async () => {
  if (isSyncInProgress) return;
  isSyncInProgress = true;

  try {

    const invoices =
      (await getOfflineInvoices()) as StoredOfflineInvoice[];

    if (!invoices.length)
      return;

    for (const invoice of invoices) {
      try {
        await syncOneInvoice(
          invoice
        );
        await removeOfflineInvoiceByKey(
          invoice
        );
      } catch (err) {
        console.error(err);
      }
    }

    console.log(
      "Offline invoice sync attempt finished"
    );

  } catch (err) {

    console.error(err);

  } finally {
    isSyncInProgress = false;
  }

};