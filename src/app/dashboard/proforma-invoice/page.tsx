"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, FileText, Pencil, Eye, Trash2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type CreditNote = {
  id: string;
  proformaInvoiceNumber: string;
  customerName: string;
  linkedInvoiceNumber: string;
  date: string;
  total: number;
  status: string;
  createdAt?: any;
};

export default function CreditNotePage() {
  const router = useRouter();
  const [proformaInvoices, setProformaInvoices] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("365");

  const fetchProformaInvoices = async (userId: string) => {
    try {
      setLoading(true);
      const q = query(collection(db, "proformaInvoices"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const data: CreditNote[] = snap.docs.map((d) => {
        const doc = d.data();
        return {
          id: d.id,
          proformaInvoiceNumber: doc.proformaInvoiceNumber || "",
          customerName: doc.customerName || "Unknown",
          linkedInvoiceNumber: doc.linkedInvoiceNumber || "-",
          date: doc.date || "",
          total: Number(doc.total || 0),
          status: doc.status || "issued",
          createdAt: doc.createdAt,
        };
      });

      data.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });

      setProformaInvoices(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load credit notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) fetchProformaInvoices(user.uid);
      else setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string, noteNumber: string) => {
    if (!confirm(`Delete Proforma Invoice ${noteNumber}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "proformaInvoices", id));
      toast.success("Credit note deleted");
      setProformaInvoices((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("Failed to delete credit note");
    }
  };

  const now = new Date();
  const filtered = proformaInvoices.filter((c) => {
    if (search && !c.customerName.toLowerCase().includes(search.toLowerCase()) && !c.proformaInvoiceNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFilter !== "all" && c.date) {
      const d = new Date(c.date);
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > Number(dateFilter)) return false;
    }
    return true;
  });

  const statusColor = (status: string) => {
    if (status === "issued") return "bg-blue-50 text-brand-primary border-blue-100";
    if (status === "adjusted") return "bg-green-50 text-brand-tertiary border-green-100";
    if (status === "cancelled") return "bg-red-50 text-red-500 border-red-100";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col min-h-[calc(100vh-80px)]">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Proforma Invoice</h1>
        <Link
          href="/dashboard/proforma-invoice/create"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
        >
          <Plus size={16} />
          Create Proforma Invoice
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col">
        {/* CONTROLS */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-center border-b border-gray-100 bg-gray-50/40">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search party or credit note no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium text-gray-600 bg-white"
            />
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="365">Last 365 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="7">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Proforma Invoice Number</th>
                <th className="p-4 font-bold">Party Name</th>
                <th className="p-4 font-bold">Invoice No</th>
                <th className="p-4 font-bold text-right">Amount</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400 font-medium">
                    Loading credit notes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FileText size={48} className="mb-4 text-gray-200" />
                      <p className="font-semibold text-gray-500">No Transactions Matching the current filter</p>
                      <Link href="/dashboard/proforma-invoice/create" className="mt-4 text-sm font-bold text-indigo-600 hover:underline">
                        + Create Proforma Invoice
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((cn) => (
                  <tr
                    key={cn.id}
                    className="border-b border-gray-50 hover:bg-indigo-50/20 transition group cursor-pointer"
                    onClick={() => router.push(`/dashboard/proforma-invoice/${cn.id}`)}
                  >
                    <td className="p-4 text-gray-600 font-medium whitespace-nowrap">
                      {cn.date ? new Date(cn.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                    </td>
                    <td className="p-4 font-bold text-gray-800 uppercase tracking-wide">{cn.proformaInvoiceNumber}</td>
                    <td className="p-4 font-semibold text-gray-800">{cn.customerName}</td>
                    <td className="p-4 text-gray-600 font-medium">{cn.linkedInvoiceNumber || "-"}</td>
                    <td className="p-4 text-right font-bold text-gray-800">
                      ₹{cn.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColor(cn.status)}`}>
                        {cn.status}
                      </span>
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2 opacity-100 transition">
                        <button
                          onClick={() => router.push(`/dashboard/proforma-invoice/${cn.id}`)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/proforma-invoice/edit/${cn.id}`)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cn.id, cn.proformaInvoiceNumber)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
