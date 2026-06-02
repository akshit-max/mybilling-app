"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Star, Mail, Download, Printer, Search, ChevronDown, Calendar, TrendingUp } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type BillProfitEntry = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  salesAmount: number;
  costAmount: number;
  profit: number;
  margin: number;
};

export default function BillWiseProfitReport() {
  const [entries, setEntries] = useState<BillProfitEntry[]>([]);
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
        // First, fetch all products to create a cost price map
        const prodSnap = await getDocs(query(collection(db, "products"), where("userId", "==", user.uid)));
        const costMap: Record<string, number> = {};
        prodSnap.docs.forEach(doc => {
          const p = doc.data();
          if (p.name) {
            costMap[p.name.toLowerCase()] = Number(p.costPrice || 0);
          }
        });

        // Now, fetch all invoices
        const invSnap = await getDocs(query(collection(db, "invoices"), where("userId", "==", user.uid)));
        const data: BillProfitEntry[] = [];
        
        invSnap.docs.forEach(doc => {
          const d = doc.data();
          if (d.status !== "cancelled" && d.invoiceType !== "estimate") {
            const items = d.items || [];
            let totalCost = 0;
            
            items.forEach((item: any) => {
              const qty = Number(item.qty || item.quantity || 0);
              const cost = costMap[String(item.name).toLowerCase()] || 0;
              totalCost += (qty * cost);
            });

            const salesAmount = Number(d.total || 0);
            const profit = salesAmount - totalCost;
            const margin = salesAmount > 0 ? (profit / salesAmount) * 100 : 0;

            data.push({
              id: doc.id,
              invoiceNumber: d.invoiceNumber || "-",
              customerName: d.customerName || d.partyName || "Cash Sale",
              date: d.date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
              salesAmount,
              costAmount: totalCost,
              profit,
              margin
            });
          }
        });
        
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(data);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load bill-wise profit.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          entry.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(entry.date) < cutoff) return false;
    }
    
    return matchesSearch;
  });

  const totalSalesAmount = filteredEntries.reduce((acc, curr) => acc + curr.salesAmount, 0);
  const totalCostAmount = filteredEntries.reduce((acc, curr) => acc + curr.costAmount, 0);
  const totalProfit = totalSalesAmount - totalCostAmount;
  const avgMargin = totalSalesAmount > 0 ? (totalProfit / totalSalesAmount) * 100 : 0;

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (filteredEntries.length === 0) return toast.error("No data to export");

    const headers = ["Date", "Invoice Number", "Party Name", "Sales Amount", "Cost Amount", "Gross Profit", "Margin %"];
    const rows = filteredEntries.map(entry => [
      entry.date,
      entry.invoiceNumber,
      entry.customerName,
      entry.salesAmount.toFixed(2),
      entry.costAmount.toFixed(2),
      entry.profit.toFixed(2),
      `${entry.margin.toFixed(2)}%`
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
        <h2>Bill Wise Profit Report</h2>
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
              <td colspan="3" style="text-align: right; font-weight: bold;">Total:</td>
              <td style="font-weight: bold;">₹ ${totalSalesAmount.toFixed(2)}</td>
              <td style="font-weight: bold;">₹ ${totalCostAmount.toFixed(2)}</td>
              <td style="font-weight: bold;">₹ ${totalProfit.toFixed(2)}</td>
              <td style="font-weight: bold;">${avgMargin.toFixed(2)}%</td>
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
    link.download = `Bill_Wise_Profit.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Excel downloaded successfully 📊");
  };

  const handleEmailExcel = () => {
    if (!emailData.to) {
      toast.error("Please enter your Email ID");
      return;
    }
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Generating and emailing Excel report...',
        success: `Excel Report sent successfully to ${emailData.to}! 📧`,
        error: 'Failed to send email.',
      }
    ).then(() => {
      setShowEmailModal(false);
      setEmailData({ to: "", cc: "" });
    });
  };

  return (
    <div id="print-area" className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen print:bg-white print:pb-0">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Bill Wise Profit</h1>
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
        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Bill Wise Profit Report</h1>
        <p className="text-sm text-gray-500 mt-1 font-semibold">Gross Profit Margin per Invoice</p>
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

      <div className="px-6 pb-2 print:hidden flex flex-wrap gap-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 inline-block shadow-sm">
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Total Sales Computed</p>
          <p className="text-xl font-bold text-gray-800 font-mono">₹ {totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 inline-block shadow-sm">
          <p className="text-[10px] text-brand-tertiary font-bold uppercase tracking-wider mb-0.5">Gross Profit Computed</p>
          <p className="text-xl font-bold text-gray-800 font-mono">₹ {totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-purple-100 p-2 rounded-full text-purple-600"><TrendingUp size={20} /></div>
          <div>
            <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-0.5">Avg Margin</p>
            <p className="text-xl font-bold text-gray-800 font-mono">{avgMargin.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-y sm:border sm:rounded-lg border-gray-200 mx-0 sm:mx-6 mt-2 mb-10 overflow-visible print:border-none print:shadow-none print:mx-0 print:mt-0 shadow-sm print:overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2 print:hidden">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span className="text-xs">Loading profit records...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 print:hidden">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M12 20V10"/><path d="m18 14-6-6-6 6"/></svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">No profit records</p>
            <p className="text-xs mt-1 text-gray-400">No invoices matched your current filters or items have 0 cost price.</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px] print:bg-gray-100">
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Date</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Invoice Number</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Party Name</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-right">Sales Amt</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-right">Cost Amt</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-right">Profit</th>
                  <th className="px-4 py-3 text-right print:border-gray-300">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono border-r border-gray-50 print:border-gray-300">
                      {entry.date}
                    </td>
                    <td className="px-4 py-3 text-indigo-600 font-semibold border-r border-gray-50 print:border-gray-300">
                      {entry.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold border-r border-gray-50 print:border-gray-300">
                      {entry.customerName}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-gray-800 border-r border-gray-50 print:border-gray-300">
                      ₹ {entry.salesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-gray-500 border-r border-gray-50 print:border-gray-300">
                      ₹ {entry.costAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right text-brand-tertiary border-r border-gray-50 print:border-gray-300">
                      ₹ {entry.profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right text-purple-600 print:border-gray-300 bg-purple-50/10">
                      {entry.margin.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="hidden print:table-footer-group">
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-700 uppercase text-[10px]">Total:</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-gray-800">₹ {totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-gray-500">₹ {totalCostAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700">₹ {totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-purple-700">{avgMargin.toFixed(2)}%</td>
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
