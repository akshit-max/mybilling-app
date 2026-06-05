"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Star, Mail, Download, Printer, Search, ChevronDown, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type DaybookEntry = {
  id: string;
  date: string;
  type: "Sales Invoice" | "Purchase Bill" | "Expense";
  number: string;
  partyName: string;
  cashIn: number;
  cashOut: number;
};

export default function DaybookPurchaseReport() {
  const [entries, setEntries] = useState<DaybookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("30");
  const [isFavourite, setIsFavourite] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: "", cc: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data: DaybookEntry[] = [];
        
        // Fetch Purchases (Cash Out)
        const purSnap = await getDocs(query(collection(db, "purchases"), where("userId", "==", user.uid)));
        purSnap.docs.forEach(doc => {
          const d = doc.data();
          if (d.status !== "cancelled") {
            data.push({
              id: doc.id,
              date: d.date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
              type: "Purchase Bill",
              number: d.billNumber || d.invoiceNumber || "-",
              partyName: d.supplierName || d.partyName || "Cash Purchase",
              cashIn: 0,
              cashOut: Number(d.total || d.amount || 0),
            });
          }
        });

        // Try Fetching Expenses (Cash Out)
        try {
          const expSnap = await getDocs(query(collection(db, "expenses"), where("userId", "==", user.uid)));
          expSnap.docs.forEach(doc => {
            const d = doc.data();
            data.push({
              id: doc.id,
              date: d.date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
              type: "Expense",
              number: d.expenseNumber || "-",
              partyName: d.category || "General Expense",
              cashIn: 0,
              cashOut: Number(d.amount || d.total || 0),
            });
          });
        } catch (e) {
          // Expenses collection might not exist yet, safe to ignore
        }
        
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(data);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load Daybook entries.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.partyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          entry.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          entry.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(entry.date) < cutoff) return false;
    }
    
    return matchesSearch;
  });

  const totalCashIn = filteredEntries.reduce((acc, curr) => acc + curr.cashIn, 0);
  const totalCashOut = filteredEntries.reduce((acc, curr) => acc + curr.cashOut, 0);

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (filteredEntries.length === 0) return toast.error("No data to export");

    const headers = ["Date", "Type", "Ref Number", "Party / Category Name", "Cash In (₹)", "Cash Out (₹)"];
    const rows = filteredEntries.map(entry => [
      entry.date,
      entry.type,
      entry.number,
      entry.partyName,
      entry.cashIn > 0 ? entry.cashIn.toFixed(2) : "-",
      entry.cashOut > 0 ? entry.cashOut.toFixed(2) : "-"
    ]);

    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #f3f4f6; color: #111827; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          td { border: 1px solid #e5e7eb; padding: 6px; color: #374151; }
        </style>
      </head>
      <body>
        <h2>Purchase Daybook Report</h2>
        <p>Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; font-weight: bold;">Total:</td>
              <td style="font-weight: bold; color: green;">₹ ${totalCashIn.toFixed(2)}</td>
              <td style="font-weight: bold; color: red;">₹ ${totalCashOut.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Daybook.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Excel downloaded successfully 📊");
  };

  const handleEmailExcel = async () => {
    if (!emailData.to.trim()) {
      toast.error("Please enter your Email ID");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (emailData.cc && !emailRegex.test(emailData.cc.trim())) {
      toast.error("Please enter a valid CA email address");
      return;
    }

    const headers = ["Date", "Type", "Ref Number", "Party / Category Name", "Cash In (₹)", "Cash Out (₹)"];
    const rows = filteredEntries.map(entry => [
      entry.date,
      entry.type,
      entry.number,
      entry.partyName,
      entry.cashIn > 0 ? entry.cashIn.toFixed(2) : "-",
      entry.cashOut > 0 ? entry.cashOut.toFixed(2) : "-"
    ]);

    const tableHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1e3a8a;">Purchase Daybook Report</h2>
        <p style="color: #4b5563;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #111827;">
              ${headers.map(h => `<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td style="border: 1px solid #e5e7eb; padding: 6px; color: #374151;">${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f9fafb;">
              <td colspan="4" style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Total:</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: green;">₹ ${totalCashIn.toFixed(2)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: red;">₹ ${totalCashOut.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const emails = [emailData.to.trim(), emailData.cc?.trim()].filter(Boolean);

    await toast.promise(
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emails,
          subject: "Purchase Daybook Report",
          html: tableHTML
        })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Email send failed");
        return data;
      }),
      {
        loading: 'Generating and emailing Excel report...',
        success: `Excel Report sent successfully to ${emailData.to}! 📧`,
        error: (err) => err.message || 'Failed to send email.',
      }
    );

    setShowEmailModal(false);
    setEmailData({ to: "", cc: "" });
  };

  return (
    <div id="print-area" className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen print:bg-white print:pb-0">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Purchase Daybook</h1>
          <button 
            onClick={() => {
              setIsFavourite(!isFavourite);
              toast.success(isFavourite ? "Removed from favourites" : "Added to favourites ⭐");
            }}
            className={`flex items-center gap-1.5 border px-2 py-1 rounded text-[10px] font-bold transition-colors ${
              isFavourite ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Star size={12} fill={isFavourite ? "currentColor" : "none"} />
            <span>Favourite</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition">
            <Mail size={13} className="text-gray-500" />
            <span>Email Excel</span>
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition">
            <Download size={13} className="text-gray-500" />
            <span>Download Excel</span>
            <ChevronDown size={11} className="text-gray-400 ml-1" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 px-4 py-1.5 rounded hover:bg-gray-50 font-bold transition shadow-sm">
            <Printer size={13} className="text-gray-500" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      <div className="hidden print:block text-center py-6 border-b border-gray-200 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Purchase Daybook Report</h1>
        <p className="text-sm text-gray-500 mt-1 font-semibold">Cash In & Cash Out Transactions</p>
        <p className="text-xs text-gray-400 mt-1">Generated on: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <div className="px-6 pt-4 pb-2 print:hidden flex justify-between items-center flex-wrap gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input 
            type="text" 
            placeholder="Search by party, type or ref no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs w-full focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 text-xs text-gray-700 font-semibold shadow-sm">
          <Calendar size={13} className="text-gray-400" />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent border-none focus:outline-none cursor-pointer text-gray-700"
          >
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last 365 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="px-6 pb-2 print:hidden flex gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 inline-flex items-center gap-3 shadow-sm min-w-[200px]">
          <div className="bg-emerald-100 p-2 rounded-full text-brand-tertiary"><ArrowUpRight size={20} /></div>
          <div>
            <p className="text-[10px] text-brand-tertiary font-bold uppercase tracking-wider mb-0.5">Total Cash In</p>
            <p className="text-xl font-bold text-gray-800 font-mono">₹ {totalCashIn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 inline-flex items-center gap-3 shadow-sm min-w-[200px]">
          <div className="bg-rose-100 p-2 rounded-full text-rose-600"><ArrowDownRight size={20} /></div>
          <div>
            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-0.5">Total Cash Out</p>
            <p className="text-xl font-bold text-gray-800 font-mono">₹ {totalCashOut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-y sm:border sm:rounded-lg border-gray-200 mx-0 sm:mx-6 mt-2 mb-10 overflow-visible print:border-none print:shadow-none print:mx-0 print:mt-0 shadow-sm print:overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2 print:hidden">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span className="text-xs">Loading daybook records...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 print:hidden">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">No daybook entries</p>
            <p className="text-xs mt-1 text-gray-400">No transactions matched your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px] print:bg-gray-100">
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Date</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Type</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Ref Number</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Party / Category Name</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-right">Cash In</th>
                  <th className="px-4 py-3 text-right print:border-gray-300">Cash Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-200">
                {filteredEntries.map((entry, idx) => (
                  <tr key={`${entry.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono border-r border-gray-50 print:border-gray-300">
                      {entry.date}
                    </td>
                    <td className="px-4 py-3 font-semibold border-r border-gray-50 print:border-gray-300">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        entry.type === "Sales Invoice" ? "bg-emerald-50 text-brand-tertiary border border-emerald-100" :
                        entry.type === "Purchase Bill" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                        "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono border-r border-gray-50 print:border-gray-300">
                      {entry.number}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold border-r border-gray-50 print:border-gray-300">
                      {entry.partyName}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right text-brand-tertiary border-r border-gray-50 print:border-gray-300 bg-emerald-50/10">
                      {entry.cashIn > 0 ? `₹ ${entry.cashIn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right text-rose-600 print:border-gray-300 bg-rose-50/10">
                      {entry.cashOut > 0 ? `₹ ${entry.cashOut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="hidden print:table-footer-group">
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700 uppercase text-[10px]">Total:</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700">₹ {totalCashIn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-rose-700">₹ {totalCashOut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEmailModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Mail size={16} className="text-indigo-600" />
                Email Excel Report
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">To Email ID <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                  placeholder="client@example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">CC (Optional)</label>
                <input 
                  type="email" 
                  value={emailData.cc}
                  onChange={(e) => setEmailData({...emailData, cc: e.target.value})}
                  placeholder="accounts@example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-400"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button 
                onClick={() => setShowEmailModal(false)}
                className="border border-gray-300 text-gray-600 hover:bg-gray-100 px-4 py-1.5 rounded text-xs font-bold transition select-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleEmailExcel}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition select-none flex items-center gap-1.5"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
