import { dbPromise } from "./indexedDB";

type OfflineInvoice = {
  userId: string;
  invoiceNumber: string;
  customerName: string;
  customerGSTIN?: string;
  customerPhone?: string;

  items: {
    productId?: string;
    name: string;
    qty: number;
    price: number;
  }[];

  subtotal: number;

  discountType: string;
  discountValue: number;
  discountAmount: number;

  gstEnabled: boolean;

  cgst: number;
  sgst: number;

  total: number;

  status: string;

  createdAt: Date;
};

export const saveOfflineInvoice =
async (
  invoice: OfflineInvoice
) => {

  const db =
    await dbPromise;

  await db.add(
    "offlineInvoices",
    invoice
  );

};

export const getOfflineInvoices =
async (): Promise<
  OfflineInvoice[]
> => {

  const db =
    await dbPromise;

  return await db.getAll(
    "offlineInvoices"
  );

};

export const clearOfflineInvoices =
async () => {

  const db =
    await dbPromise;

  const tx = db.transaction(
    "offlineInvoices",
    "readwrite"
  );

  await tx.objectStore(
    "offlineInvoices"
  ).clear();

  await tx.done;

};