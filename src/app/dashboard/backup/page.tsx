"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

import { db, auth } from "@/lib/firebase";

import toast from "react-hot-toast";

import {
  Download,
  Upload,
  ShieldCheck,
  Database,
  ArrowLeft,
} from "lucide-react";

/* TYPES */

type Customer = {
  id?: string;
  userId?: string;

  name?: string;
  phone?: string;
  address?: string;
  gstin?: string;
};

type Product = {
  id?: string;
  userId?: string;

  name?: string;
  price?: number;
  gst?: number;
  stock?: number;
};

type Invoice = {
  id?: string;
  userId?: string;

  customerName?: string;
  customerPhone?: string;
  customerGSTIN?: string;

  subtotal?: number;
  discountAmount?: number;

  cgst?: number;
  sgst?: number;

  total?: number;

  status?: string;
  gstEnabled?: boolean;

  invoiceNumber?: string;

  items?: unknown[];
};

type BackupData = {
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
};

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);

  const [restoring, setRestoring] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* EXPORT BACKUP */
  const handleExportBackup = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        toast.error("User not logged in");
        return;
      }

      setExporting(true);

      /* FETCH DATA */
      const customerSnap = await getDocs(collection(db, "customers"));

      const productSnap = await getDocs(collection(db, "products"));

      const invoiceSnap = await getDocs(collection(db, "invoices"));

      /* FILTER USER DATA */
      const customers: Customer[] = customerSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Customer),
        }))
        .filter((c) => c.userId === user.uid);

      const products: Product[] = productSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Product),
        }))
        .filter((p) => p.userId === user.uid);

      const invoices: Invoice[] = invoiceSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Invoice),
        }))
        .filter((i) => i.userId === user.uid);

      const backupData: BackupData = {
        customers,
        products,
        invoices,
      };

      /* CREATE FILE */
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `mybill-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;

      a.click();

      URL.revokeObjectURL(url);

      toast.success("Backup exported successfully ✅");
    } catch (err) {
      console.error(err);

      toast.error("Failed to export backup");
    } finally {
      setExporting(false);
    }
  };

  /* RESTORE BACKUP */
  const handleRestoreBackup = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      const user = auth.currentUser;

      if (!user) {
        toast.error("User not logged in");
        return;
      }

      const file = e.target.files?.[0];

      if (!file) return;

      setRestoring(true);

      const text = await file.text();

      const data: BackupData = JSON.parse(text);

      const batch = writeBatch(db);

      /* CUSTOMERS */
      data.customers?.forEach((customer) => {
        const ref = doc(collection(db, "customers"));

        const { id, ...customerData } = customer;

        batch.set(ref, {
          ...customerData,
          userId: user.uid,
        });
      });

      /* PRODUCTS */
      data.products?.forEach((product) => {
        const ref = doc(collection(db, "products"));

        const { id, ...productData } = product;

        batch.set(ref, {
          ...productData,
          userId: user.uid,
        });
      });

      /* INVOICES */
      data.invoices?.forEach((invoice) => {
        const ref = doc(collection(db, "invoices"));

        const { id, ...invoiceData } = invoice;

        batch.set(ref, {
          ...invoiceData,
          userId: user.uid,
        });
      });

      await batch.commit();

      toast.success("Backup restored successfully ✅");
    } catch (err) {
      console.error(err);

      toast.error("Failed to restore backup");
    } finally {
      setRestoring(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-6 space-y-6">
        {/* PAGE HEADER */}
        {/* PAGE HEADER */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-purple-600" />

            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>

              <p className="text-sm text-gray-500 mt-1">
                Backup and restore your billing data securely.
              </p>
            </div>
          </div>

          {/* BACK BUTTON */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* BACKUP CARD */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            {/* LEFT */}
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Database size={20} className="text-purple-600" />

                <h2 className="text-xl font-semibold text-gray-900">
                  Backup & Restore
                </h2>
              </div>

              <p className="text-sm text-gray-500 leading-6">
                Export your customers, products, and invoices as a backup file.
                You can restore the data anytime later.
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* EXPORT */}
              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <Download size={16} />

                {exporting ? "Exporting..." : "Export Backup"}
              </button>

              {/* RESTORE */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
                className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-3 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <Upload size={16} />

                {restoring ? "Restoring..." : "Restore Backup"}
              </button>

              {/* FILE INPUT */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleRestoreBackup}
              />
            </div>
          </div>

          {/* INFO */}
          <div className="mt-6 border-t border-gray-200 pt-5 space-y-2">
            <p className="text-sm text-gray-600">
              • Backup includes customers, products, and invoices.
            </p>

            <p className="text-sm text-gray-600">
              • Restore will add data back into your account.
            </p>

            <p className="text-sm text-gray-600">
              • Keep backup files safe and private.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
