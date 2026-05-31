"use client";

import React, { useEffect, useState } from "react";
import { PlayCircle, MessageCircle, FileCode2, CheckSquare } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@/context/ChatContext";

export default function EInvoicingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"einvoice" | "ewaybill">("einvoice");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [ewayBills, setEwayBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { openChat } = useChat();

  useEffect(() => {
    const fetchEInvoices = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const qEinv = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid),
          where("eInvoiceGenerated", "==", true)
        );
        const snapEinv = await getDocs(qEinv);
        const dataEinv = snapEinv.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dataEinv.sort((a: any, b: any) => new Date(b.createdAt?.toDate() || b.createdAt).getTime() - new Date(a.createdAt?.toDate() || a.createdAt).getTime());
        setInvoices(dataEinv);

        const qEway = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid),
          where("ewayBillGenerated", "==", true)
        );
        const snapEway = await getDocs(qEway);
        const dataEway = snapEway.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dataEway.sort((a: any, b: any) => new Date(b.createdAt?.toDate() || b.createdAt).getTime() - new Date(a.createdAt?.toDate() || a.createdAt).getTime());
        setEwayBills(dataEway);
      } catch (err) {
        console.error("Failed to load e-invoices", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEInvoices();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">Generated e-Invoices</h1>
          <button className="flex items-center gap-1.5 text-[11px] text-blue-500 border border-blue-200 bg-blue-50/50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors font-bold uppercase tracking-wider">
            <PlayCircle size={14} />
            <span>What is e-Invoicing</span>
          </button>
        </div>
        <div>
          <button 
            onClick={openChat}
            className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 px-4 py-1.5 rounded hover:bg-blue-100 font-bold uppercase tracking-wider transition-colors"
          >
            <MessageCircle size={14} />
            <span>Chat Support</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto p-8">
        
        {/* TABS */}
        <div className="flex items-center gap-6 mb-8 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab("einvoice")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "einvoice" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            Generated e-Invoices
          </button>
          <button 
            onClick={() => setActiveTab("ewaybill")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "ewaybill" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            Generated e-Way Bills
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading documents...</div>
        ) : (
          <>
            {/* E-INVOICE TAB */}
            {activeTab === "einvoice" && (
              invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                    <FileCode2 size={40} className="text-gray-300" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-700 mb-2">No e-Invoices Generated Yet</h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-md">Generate your first e-Invoice by opening any standard Sales Invoice and clicking the "Generate e-Invoice" button at the top.</p>
                  <Link href="/dashboard/invoices" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded text-sm transition-colors shadow-sm">
                    Go to Sales Invoices
                  </Link>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4">Invoice No</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Ack No</th>
                        <th className="px-6 py-4 text-right">Total Amount</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                            <Link href={`/dashboard/e-invoicing/print/${inv.id}`}>{inv.invoiceNumber}</Link>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-800">{inv.customerName}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-600 text-xs">{inv.ackNo}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">₹{inv.total?.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center">
                            <Link href={`/dashboard/e-invoicing/print/${inv.id}`} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5">
                               <CheckSquare size={13} />
                               View e-Invoice
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* E-WAY BILL TAB */}
            {activeTab === "ewaybill" && (
              ewayBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                    <FileCode2 size={40} className="text-gray-300" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-700 mb-2">No e-Way Bills Generated Yet</h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-md">Generate your first e-Way Bill by opening any standard Sales Invoice and clicking the "Generate E-way Bill" button at the top.</p>
                  <Link href="/dashboard/invoices" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded text-sm transition-colors shadow-sm">
                    Go to Sales Invoices
                  </Link>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4">Invoice No</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">e-Way Bill No</th>
                        <th className="px-6 py-4 text-right">Total Amount</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ewayBills.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                            <Link href={`/dashboard/e-way-bill/print/${inv.id}`}>{inv.invoiceNumber}</Link>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-800">{inv.customerName}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-600 text-xs">{inv.ewayBillNo}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">₹{inv.total?.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center">
                            <Link href={`/dashboard/e-way-bill/print/${inv.id}`} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5">
                               <CheckSquare size={13} />
                               View e-Way Bill
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}

      </main>
    </div>
  );
}
