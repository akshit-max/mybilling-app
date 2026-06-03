"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Receipt,
} from "lucide-react";
import Link from "next/link";

/* TYPES */
type Item = {
  name: string;
  qty: number;
  price: number;
};

type Invoice = {
  customerName: string;
  customerPhone?: string;
  customerGSTIN?: string;

  items: Item[];

  subtotal: number;
  discountAmount: number;

  cgst: number;
  sgst: number;
  igst?: number;
  isInterstate?: boolean;

  total: number;

  status: string;
  gstEnabled: boolean;
  dueDate?: string;

  invoiceNumber?: string;
  createdAt?: Timestamp;
  invoiceType?: string;
};

type Company = {
  name: string;
  address: string;
  gstin?: string;
};

export default function ThermalReceipt() {
  const { id } = useParams() as { id: string };

  const [invoice, setInvoice] =
    useState<Invoice | null>(null);

  const [company, setCompany] =
    useState<Company | null>(null);

  const [loading, setLoading] =
    useState(true);

  /* FETCH INVOICE */
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const ref = doc(db, "invoices", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setInvoice(snap.data() as Invoice);
        } else {
          throw new Error("Not in Firestore");
        }
      } catch (err) {
        // Fallback to IndexedDB
        console.warn("Falling back to offline invoices", err);
        try {
          const { getOfflineInvoices } = await import("@/lib/offlineInvoices");
          const offlineInvoices = await getOfflineInvoices(auth.currentUser?.uid);
          const foundOffline = offlineInvoices.find(
            (inv: any) =>
              inv.id?.toString() === id || inv.invoiceNumber === id
          );

          if (foundOffline) {
            setInvoice(foundOffline as any);
          }
        } catch (offlineErr) {
          console.error("Offline fetch failed", offlineErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  /* FETCH COMPANY */
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const user = auth.currentUser;

        if (!user) return;

        const ref = doc(
          db,
          "settings",
          user.uid
        );

        const snap = await getDoc(ref);

        if (snap.exists()) {
          setCompany(snap.data() as Company);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCompany();
  }, []);

  if (loading) {
    return (
      <p className="p-6 text-gray-500">
        Loading...
      </p>
    );
  }

  if (!invoice) {
    return (
      <p className="p-6 text-gray-500">
        Receipt not found
      </p>
    );
  }

  return (
    <section className="bg-gray-100 min-h-screen py-8 print:bg-white print:py-0">

      <div className="w-[360px] mx-auto space-y-4 print:w-full">

        {/* ACTIONS */}
        <div className="flex items-center justify-between print:hidden">

          <div className="flex items-center gap-2">

            <Receipt
              size={20}
              className="text-purple-600"
            />

            <h1 className="text-xl font-semibold text-gray-900">
              Thermal Receipt
            </h1>

          </div>

          <div className="flex items-center gap-2">

            <Link
              href={`/dashboard/invoices/${id}`}
              className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            >
              <ArrowLeft size={15} />
              Back
            </Link>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Printer size={15} />
              Print
            </button>

          </div>
        </div>

        {/* RECEIPT */}
        <div
          id="thermal-print"
          className="bg-white shadow-sm border border-gray-200 rounded-2xl px-6 py-5 print:shadow-none print:border-none print:rounded-none"
        >

          {/* COMPANY */}
          <div className="text-center">

            <h2 className="text-[32px] font-semibold tracking-tight text-gray-900 leading-none">
              {company?.name || "mybill.com"}
            </h2>

            <p className="text-xs text-gray-500 mt-2">
              {company?.address || "Address"}
            </p>

            {company?.gstin && (
              <p className="text-xs text-gray-500 mt-1">
                GSTIN:
                {" "}
                {company.gstin}
              </p>
            )}

          </div>

          {/* DIVIDER */}
          <div className="border-t border-dashed border-gray-300 my-5" />

          {/* META */}
          <div className="space-y-3 text-sm">

            <div className="flex justify-between items-start gap-3">

              <span className="text-gray-500 font-bold">
                {(invoice.invoiceType || "invoice") === "estimate" ? "ESTIMATE" : "TAX INVOICE"}
              </span>

              <span className="font-semibold text-right text-gray-900 break-all">
                {invoice.invoiceNumber}
              </span>

            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">
                {invoice.createdAt
                  ? typeof (invoice.createdAt as any).toDate === "function"
                    ? (invoice.createdAt as any).toDate().toLocaleDateString()
                    : new Date(invoice.createdAt as any).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>

          </div>

          {/* DIVIDER */}
          <div className="border-t border-dashed border-gray-300 my-5" />

          {/* CUSTOMER */}
          <div className="space-y-2">

            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
              Customer
            </p>

            <p className="font-semibold text-xl text-gray-900">
              {invoice.customerName}
            </p>

            {invoice.customerPhone && (
              <p className="text-sm text-gray-500">
                +91 {invoice.customerPhone}
              </p>
            )}

            {invoice.customerGSTIN && (
              <p className="text-xs text-gray-500 break-all">
                GSTIN:
                {" "}
                {invoice.customerGSTIN}
              </p>
            )}

          </div>

          {/* DIVIDER */}
          <div className="border-t border-dashed border-gray-300 my-5" />

          {/* ITEMS */}
          <div className="space-y-4">

            {invoice.items.map((item, i) => (
              <div
                key={i}
                className="space-y-1.5"
              >

                <div className="flex justify-between items-start gap-3 text-sm">

                  <span className="text-gray-900 break-words">
                    {item.name}
                  </span>

                  <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    ₹
                    {(
                      item.qty * item.price
                    ).toFixed(2)}
                  </span>

                </div>

                <div className="text-xs text-gray-500">
                  {item.qty}
                  {" × "}
                  ₹
                  {item.price}
                </div>

              </div>
            ))}

          </div>

          {/* DIVIDER */}
          <div className="border-t border-dashed border-gray-300 my-5" />

          {/* TOTALS */}
          <div className="space-y-3 text-sm">

            <div className="flex justify-between">

              <span className="text-gray-500">
                Subtotal
              </span>

              <span className="font-medium text-gray-900 tabular-nums">
                ₹
                {invoice.subtotal.toFixed(2)}
              </span>

            </div>

            <div className="flex justify-between">

              <span className="text-gray-500">
                Discount
              </span>

              <span className="font-medium text-gray-900 tabular-nums">
                ₹
                {invoice.discountAmount.toFixed(
                  2
                )}
              </span>

            </div>

            {invoice.gstEnabled && (
              invoice.isInterstate ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">IGST</span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    ₹{(invoice.igst ?? 0).toFixed(2)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CGST</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      ₹{invoice.cgst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SGST</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      ₹{invoice.sgst.toFixed(2)}
                    </span>
                  </div>
                </>
              )
            )}

          </div>

          {/* GRAND TOTAL */}
          <div className="border-t-2 border-dashed border-gray-400 mt-4 pt-4">

            <div className="flex justify-between items-center">

              <span className="text-[26px] font-bold text-gray-900 leading-none">
                TOTAL
              </span>

              <span className="text-[26px] font-bold text-gray-900 tabular-nums leading-none">
                ₹
                {invoice.total.toFixed(2)}
              </span>

            </div>

          </div>

          {/* STATUS */}
          <div className="flex justify-center mt-4">

            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize
                ${
                  invoice.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : invoice.status ===
                      "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
            >
              {invoice.status}
            </span>

          </div>

          {/* DUE DATE — credit invoices only */}
          {invoice.status === "credit" && invoice.dueDate && (
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Due Date</span>
              <span className="font-medium text-red-600">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-4 text-center">

            <p className="text-xs text-gray-500">
              Thank you for your purchase
            </p>

          </div>

        </div>
      </div>
    </section>
  );
}