"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Star, Mail, Download, Printer, Search, ChevronDown, Calendar } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type SalesInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: string;
  itemsCount: number;
};

export default function SalesSummaryReport() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
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
        const snap = await getDocs(query(collection(db, "invoices"), where("userId", "==", user.uid)));
        const data: SalesInvoice[] = [];
        
        snap.docs.forEach(doc => {
          const d = doc.data();
          if (d.status !== "cancelled" && d.invoiceType !== "estimate") {
            data.push({
              id: doc.id,
              invoiceNumber: d.invoiceNumber || "-",
              customerName: d.customerName || d.partyName || "Cash Sale",
              date: d.date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
              total: Number(d.total || 0),
              status: d.status || "pending",
              itemsCount: Array.isArray(d.items) ? d.items.length : 0,
            });
          }
        });
        
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInvoices(data);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load sales summary.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(inv.date) < cutoff) return false;
    }
    
    return matchesSearch;
  });

  const totalSalesAmount = filteredInvoices.reduce((acc, curr) => acc + curr.total, 0);

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) return toast.error("No data to export");

    const headers = ["Date", "Invoice Number", "Party Name", "Items Count", "Status", "Total Amount (₹)"];
    const rows = filteredInvoices.map(inv => [
      inv.date,
      inv.invoiceNumber,
      inv.customerName,
      inv.itemsCount.toString(),
      inv.status.toUpperCase(),
      inv.total.toFixed(2)
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
        <h2>Sales Summary Report</h2>
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
              <td colspan="5" style="text-align: right; font-weight: bold;">Total Sales:</td>
              <td style="font-weight: bold;">₹ ${totalSalesAmount.toFixed(2)}</td>
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
    link.download = `Sales_Summary.xls`;
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

    if (filteredInvoices.length === 0) {
      toast.error("No data to email");
      return;
    }

    const headers = ["Date", "Invoice Number", "Party Name", "Items Count", "Status", "Total Amount (₹)"];
    const rows = filteredInvoices.map(inv => [
      inv.date,
      inv.invoiceNumber,
      inv.customerName,
      inv.itemsCount.toString(),
      inv.status.toUpperCase(),
      inv.total.toFixed(2)
    ]);

    const tableHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1e3a8a;">Sales Summary Report</h2>
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
              <td colspan="5" style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Total Sales:</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">₹ ${totalSalesAmount.toFixed(2)}</td>
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
          subject: "Sales Summary Report",
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
          <h1 className="text-base font-bold text-gray-800">Sales Summary</h1>
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
        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Sales Summary Report</h1>
        <p className="text-sm text-gray-500 mt-1 font-semibold">Total Revenue & Transactions</p>
        <p className="text-xs text-gray-400 mt-1">Generated on: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <div className="px-6 pt-4 pb-2 print:hidden flex justify-between items-center flex-wrap gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input 
            type="text" 
            placeholder="Search by party or invoice no..."
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

      <div className="px-6 pb-2 print:hidden">
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 inline-block shadow-sm">
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Total Sales Computed</p>
          <p className="text-xl font-bold text-gray-800 font-mono">₹ {totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white border-y sm:border sm:rounded-lg border-gray-200 mx-0 sm:mx-6 mt-2 mb-10 overflow-visible print:border-none print:shadow-none print:mx-0 print:mt-0 shadow-sm print:overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2 print:hidden">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span className="text-xs">Loading sales records...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 print:hidden">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">No sales transactions</p>
            <p className="text-xs mt-1 text-gray-400">No invoices matched your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px] print:bg-gray-100">
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Date</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Invoice Number</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Party Name</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-center">Items</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-center">Status</th>
                  <th className="px-4 py-3 text-right print:border-gray-300">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-200">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono border-r border-gray-50 print:border-gray-300">
                      {inv.date}
                    </td>
                    <td className="px-4 py-3 text-indigo-600 font-semibold border-r border-gray-50 print:border-gray-300">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold border-r border-gray-50 print:border-gray-300">
                      {inv.customerName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-center border-r border-gray-50 print:border-gray-300">
                      {inv.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-50 print:border-gray-300">
                       <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                         inv.status === "paid" ? "bg-green-50 text-brand-tertiary border border-green-100" :
                         inv.status === "pending" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                         "bg-gray-100 text-gray-600 border border-gray-200"
                       }`}>
                         {inv.status}
                       </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right text-gray-800 print:border-gray-300">
                      ₹ {inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="hidden print:table-footer-group">
                <tr className="bg-gray-50">
                  <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-700 uppercase text-[10px]">Total Sales:</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-gray-800">₹ {totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
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
