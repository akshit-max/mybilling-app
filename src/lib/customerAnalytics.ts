import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export async function getCustomerAnalytics(
  customerId: string
) {
  const invoicesRef = collection(db, "invoices");

  const q = query(
    invoicesRef,
    where("customerId", "==", customerId)
  );

  const snapshot = await getDocs(q);

  let totalSales = 0;
  let pendingAmount = 0;

  snapshot.forEach((doc) => {
    const invoice = doc.data();

    const total = Number(invoice.total || 0);

    totalSales += total;

    if (
      invoice.paymentStatus === "Pending" ||
      invoice.paymentStatus === "Credit"
    ) {
      pendingAmount += total;
    }
  });

  return {
    totalSales,
    pendingAmount,
  };
}