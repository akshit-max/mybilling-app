"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Star, Mail, Download, Printer, Search, ChevronDown,
  Calendar, Receipt, TrendingDown
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type ExpenseEntry = {
  id: string;
  date: string;
  expenseNumber: string;
  partyName: string;
  category: string;
  amount: number;
};

export default function ExpenseTransactionReport() {
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("30");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isFavourite, setIsFavourite] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: "", cc: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDocs(query(collection(db, "expenses"), where("userId", "==", user.uid)));
        const data: ExpenseEntry[] = snap.docs
          .filter(doc => doc.data().status !== "Reversed")
          .map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              date: d.date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
              expenseNumber: d.expenseNumber || "-",
              partyName: d.partyName || "-",
              category: d.category || "General",
              amount: Number(d.amount || 0),
            };
          });
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(data);
      } catch (err) {
        toast.error("Failed to load expense transactions.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const allCategories = [...new Set(entries.map(e => e.category))].sort();

  const filtered = entries.filter(e => {
    const matchSearch =
      e.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter ? e.category === categoryFilter : true;
    if (dateFilter !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(dateFilter));
      if (new Date(e.date) < cutoff) return false;
    }
    return matchSearch && matchCat;
  });

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (filtered.length === 0) return toast.error("No data to export");
    const headers = ["Date", "Expense No.", "Party Name", "Category", "Amount (₹)"];
    const rows = filtered.map(e => [
      e.date, e.expenseNumber, e.partyName, e.category, e.amount.toFixed(2)
    ]);
    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /><style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th { background-color: #f3f4f6; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        td { border: 1px solid #e5e7eb; padding: 6px; }
        .amount { color: #dc2626; font-weight: bold; }
      </style></head>
      <body>
        <h2>Expense Transaction Report</h2>
        <p>Generated on: ${new Date().toLocaleDateString("en-IN")} | Total: ₹${totalAmount.toFixed(2)}</p>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 4 ? "amount" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody>
          <tfoot>
            <tr><td colspan="4" style="text-align:right;font-weight:bold;">Total:</td>
            <td class="amount">₹${totalAmount.toFixed(2)}</td></tr>
          </tfoot>
        </table>
      </body></html>`;
    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Expense_Transaction_Report.xls";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Excel downloaded! 📊");
  };

  const handleEmailExcel = () => {
    if (!emailData.to) return toast.error("Please enter your Email ID");
    toast.promise(new Promise(r => setTimeout(r, 1500)), {
      loading: "Sending report...", success: `Sent to ${emailData.to}! 📧`, error: "Failed."
    }).then(() => { setShowEmailModal(false); setEmailData({ to: "", cc: "" }); });
  };

  return (
    <div id="print-area" className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen print:bg-white print:pb-0">

      {/* Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/expenses" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Expense Transaction Report</h1>
          <button
            onClick={() => { setIsFavourite(!isFavourite); toast.success(isFavourite ? "Removed from favourites" : "Added to favourites ⭐"); }}
            className={`flex items-center gap-1.5 border px-2 py-1 rounded text-[10px] font-bold transition-colors ${isFavourite ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
          >
            <Star size={12} fill={isFavourite ? "currentColor" : "none"} />
            <span>Favourite</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition">
            <Mail size={13} className="text-gray-500" /> <span>Email Excel</span>
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition">
            <Download size={13} className="text-gray-500" /> <span>Download Excel</span>
            <ChevronDown size={11} className="text-gray-400 ml-1" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 px-4 py-1.5 rounded hover:bg-gray-50 font-bold transition shadow-sm">
            <Printer size={13} className="text-gray-500" /> <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Print title */}
      <div className="hidden print:block text-center py-6 border-b border-gray-200 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Expense Transaction Report</h1>
        <p className="text-xs text-gray-400 mt-1">Generated on: {new Date().toLocaleDateString("en-IN")}</p>
      </div>

      {/* Filters */}
      <div className="px-6 pt-4 pb-2 print:hidden flex justify-between items-center flex-wrap gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input
            type="text" placeholder="Search party, category, ref no..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs w-full focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 text-xs text-gray-700 font-semibold shadow-sm">
            <Calendar size={13} className="text-gray-400" />
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-transparent border-none focus:outline-none cursor-pointer">
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 365 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 text-xs text-gray-700 font-semibold shadow-sm">
            <ChevronDown size={13} className="text-gray-400" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-transparent border-none focus:outline-none cursor-pointer">
              <option value="">All Categories</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 pb-2 print:hidden flex gap-4">
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 inline-flex items-center gap-3 shadow-sm min-w-[220px]">
          <div className="bg-rose-100 p-2 rounded-full text-rose-600"><TrendingDown size={20} /></div>
          <div>
            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-0.5">Total Expenses</p>
            <p className="text-xl font-bold text-gray-800 font-mono">₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 inline-flex items-center gap-3 shadow-sm min-w-[220px]">
          <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><Receipt size={20} /></div>
          <div>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Transactions</p>
            <p className="text-xl font-bold text-gray-800 font-mono">{filtered.length}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-y sm:border sm:rounded-lg border-gray-200 mx-0 sm:mx-6 mt-2 mb-10 overflow-visible shadow-sm print:border-none print:shadow-none print:mx-0 print:mt-0">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span className="text-xs">Loading expense records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Receipt size={40} className="text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-700">No expense entries found</p>
            <p className="text-xs mt-1 text-gray-400">Try adjusting filters or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px] print:bg-gray-100">
                  <th className="px-4 py-3 border-r border-gray-100">Date</th>
                  <th className="px-4 py-3 border-r border-gray-100">Expense No.</th>
                  <th className="px-4 py-3 border-r border-gray-100">Party Name</th>
                  <th className="px-4 py-3 border-r border-gray-100">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-200">
                {filtered.map((entry, idx) => (
                  <tr key={`${entry.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono border-r border-gray-50">{entry.date}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600 border-r border-gray-50">{entry.expenseNumber}</td>
                    <td className="px-4 py-3 text-gray-800 font-semibold border-r border-gray-50">{entry.partyName}</td>
                    <td className="px-4 py-3 border-r border-gray-50">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-gray-100 text-gray-600 border border-gray-200">{entry.category}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right text-rose-600">
                      ₹ {entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="hidden print:table-footer-group">
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700 uppercase text-[10px]">Total:</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-rose-700">₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEmailModal(false)} />
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden z-10">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Mail size={16} className="text-indigo-600" />Email Excel Report</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">To Email ID <span className="text-red-500">*</span></label>
                <input type="email" value={emailData.to} onChange={e => setEmailData({ ...emailData, to: e.target.value })} placeholder="client@example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">CC (Optional)</label>
                <input type="email" value={emailData.cc} onChange={e => setEmailData({ ...emailData, cc: e.target.value })} placeholder="accounts@example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowEmailModal(false)} className="border border-gray-300 text-gray-600 hover:bg-gray-100 px-4 py-1.5 rounded text-xs font-bold transition">Cancel</button>
              <button onClick={handleEmailExcel} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition flex items-center gap-1.5">Send Email</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
