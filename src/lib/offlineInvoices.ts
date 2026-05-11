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

export const updateOfflineInvoice = async (invoice: OfflineInvoice & { id?: number }) => {
  const db = await dbPromise;
  await db.put("offlineInvoices", invoice);
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

export const deleteOfflineInvoice = async (id: number | string) => {
  const db = await dbPromise;
  await db.delete("offlineInvoices", Number(id));
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