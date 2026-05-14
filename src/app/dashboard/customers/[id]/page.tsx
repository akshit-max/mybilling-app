"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, User } from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  total: number;
  status: "paid" | "pending" | "credit";
  invoiceType?: string;
  createdAt: any;
  items: any[];
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  address?: string;
  state?: string;
};

export default function CustomerDetailsPage() {
  const { id } = useParams() as { id: string };

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalSales, setTotalSales] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [lastPurchaseDate, setLastPurchaseDate] = useState<Date | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Customer
        const customerRef = doc(db, "customers", id);
        const customerSnap = await getDoc(customerRef);

        if (!customerSnap.exists() || customerSnap.data().userId !== user.uid) {
          toast.error("Customer not found");
          setLoading(false);
          return;
        }

        const customerData = {
          id: customerSnap.id,
          name: customerSnap.data().name || "",
          phone: customerSnap.data().phone || "",
          gstin: customerSnap.data().gstin || "",
          address: customerSnap.data().address || "",
          state: customerSnap.data().state || "",
        };

        setCustomer(customerData);

        // 2. Fetch Invoices for this customer
        const iq = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid),
          where("customerName", "==", customerData.name)
        );

        const isnap = await getDocs(iq);
        const fetchedInvoices: Invoice[] = isnap.docs.map((docSnap) => ({
          id: docSnap.id,
          invoiceNumber: docSnap.data().invoiceNumber || "N/A",
          total: Number(docSnap.data().total || 0),
          status: docSnap.data().status || "pending",
          invoiceType: docSnap.data().invoiceType || "invoice",
          createdAt: docSnap.data().createdAt,
          items: docSnap.data().items || [],
        }));

        // Sort invoices by date descending
        fetchedInvoices.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setInvoices(fetchedInvoices);

        // 3. Calculate Stats
        let tSales = 0;
        let pAmount = 0;
        let count = 0;
        let lastDate: Date | null = null;

        fetchedInvoices.forEach((inv) => {
          if (inv.invoiceType === "estimate") return; // skip estimates
          tSales += inv.total;
          count += 1;
          if (inv.status === "pending" || inv.status === "credit") {
            pAmount += inv.total;
          }

          if (inv.createdAt) {
            const invDate = inv.createdAt.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt);
            if (!lastDate || invDate > lastDate) {
              lastDate = invDate;
            }
          }
        });

        setTotalSales(tSales);
        setPendingAmount(pAmount);
        setTotalInvoicesCount(count);
        setLastPurchaseDate(lastDate);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load customer details");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex justify-center pt-20">
        <p className="text-gray-500 animate-pulse">Loading details...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center pt-20">
        <p className="text-gray-500 mb-4">Customer not found.</p>
        <Link href="/dashboard/customers" className="text-purple-600 hover:underline">
          Go back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="text-purple-600" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          </div>
          <Link
            href="/dashboard/customers"
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>

        {/* TOP SECTION: CUSTOMER INFO & STATS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CUSTOMER INFO */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Customer Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-medium text-gray-900">{customer.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GSTIN:</span>
                <span className="font-medium text-gray-900">{customer.gstin || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">State:</span>
                <span className="font-medium text-gray-900">{customer.state || "N/A"}</span>
              </div>
              <div className="pt-2 border-t mt-2">
                <span className="text-gray-500 block mb-1">Address:</span>
                <p className="font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {customer.address || "No address provided."}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href={`/dashboard/customers/edit/${customer.id}`}
                className="block w-full text-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              >
                Edit Customer
              </Link>
            </div>
          </div>

          {/* STATS OVERVIEW */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Sales Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
                <p className="text-xl font-bold text-gray-900">{totalInvoicesCount}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 mb-1">Total Sales</p>
                <p className="text-xl font-bold text-blue-900">₹{totalSales.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs text-green-700 mb-1">Paid Amount</p>
                <p className="text-xl font-bold text-green-900">₹{(totalSales - pendingAmount).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <p className="text-xs text-yellow-700 mb-1">Pending Amount</p>
                <p className="text-xl font-bold text-yellow-800">₹{pendingAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 mb-1">Last Purchase Date</p>
                <p className="text-sm font-semibold text-purple-900">
                  {lastPurchaseDate ? lastPurchaseDate.toLocaleDateString() : "Never"}
                </p>
              </div>
              <Link
                href="/dashboard/invoices/create"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                + New Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* INVOICES LIST */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-gray-500" />
              Recent Invoices
            </h3>
          </div>
          
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No invoices found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">Invoice No</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => {
                    const dateStr = inv.createdAt?.toDate 
                      ? inv.createdAt.toDate().toLocaleDateString() 
                      : inv.createdAt 
                        ? new Date(inv.createdAt).toLocaleDateString() 
                        : "N/A";
                    
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-6 py-4">{dateStr}</td>
                        <td className="px-6 py-4">
                          {inv.invoiceType === "estimate" ? (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Estimate</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">Invoice</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          ₹{inv.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          {inv.status === "paid" && (
                            <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-xs font-medium">Paid</span>
                          )}
                          {inv.status === "pending" && (
                            <span className="text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full text-xs font-medium">Pending</span>
                          )}
                          {inv.status === "credit" && (
                            <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-xs font-medium">Credit</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/invoices/${inv.id}`}
                            className="text-purple-600 hover:text-purple-700 font-medium text-sm transition"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
