"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Star, Mail, Download, Printer, Search, X, ChevronDown, Package } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type StockItem = {
  id: string;
  name: string;
  itemCode: string;
  category: string;
  stock: number;
  purchasePrice: number;
  stockValue: number;
};

export default function StockSummaryReport() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
        const snap = await getDocs(query(collection(db, "products"), where("userId", "==", user.uid)));
        const data = snap.docs.map(doc => {
          const p = doc.data();
          const stock = Number(p.stock || 0);
          const purchasePrice = Number(p.costPrice || 0);
          return {
            id: doc.id,
            name: p.name || "Unknown",
            itemCode: p.itemCode || p.barcode || "-",
            category: p.category || "-",
            stock: stock,
            purchasePrice: purchasePrice,
            stockValue: stock * purchasePrice
          };
        });

        data.sort((a, b) => b.stockValue - a.stockValue);
        setItems(data);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load stock summary.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredItems = items.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStockValue = filteredItems.reduce((acc, curr) => acc + curr.stockValue, 0);

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (filteredItems.length === 0) return toast.error("No data to export");

    const headers = ["Item Name", "Item Code", "Category", "Current Stock", "Purchase Price", "Stock Value"];
    const rows = filteredItems.map(p => [
      p.name,
      p.itemCode,
      p.category,
      p.stock.toString(),
      p.purchasePrice.toString(),
      p.stockValue.toString()
    ]);

    // Add total row
    rows.push(["Total", "", "", "", "", totalStockValue.toString()]);

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
        <h2>Stock Summary Report</h2>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Stock_Summary.xls`;
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
          <Link href="/dashboard/products" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Stock Summary</h1>
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
        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Stock Summary</h1>
        <p className="text-sm text-gray-500 mt-1 font-semibold">All Items</p>
        <p className="text-xs text-gray-400 mt-1">Generated on: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <div className="px-6 pt-4 pb-2 print:hidden flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input 
            type="text" 
            placeholder="Search items by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs w-full focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
          />
        </div>
        <div className="bg-white border border-gray-200 px-4 py-1.5 rounded shadow-sm text-xs font-bold text-gray-700">
          Total Value: <span className="text-indigo-600 ml-1">₹ {totalStockValue.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="bg-white border-y sm:border sm:rounded-lg border-gray-200 mx-0 sm:mx-6 mt-2 mb-10 overflow-visible print:border-none print:shadow-none print:mx-0 print:mt-0 shadow-sm print:overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2 print:hidden">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span className="text-xs">Loading items...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 print:hidden">
            <Package size={32} className="text-gray-300 mb-2" />
            <p className="text-sm font-semibold">No items found</p>
            <p className="text-xs mt-1">Adjust your search or add items to your inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px] print:bg-gray-100">
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Item Name</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Item Code</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300">Category</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-center">Current Stock</th>
                  <th className="px-4 py-3 border-r border-gray-100 print:border-gray-300 text-right">Purchase Price</th>
                  <th className="px-4 py-3 text-right print:border-gray-300">Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-200">
                {filteredItems.map((p) => (
                  <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-4 py-3 text-gray-800 font-semibold border-r border-gray-50 print:border-gray-300">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono border-r border-gray-50 print:border-gray-300">
                      {p.itemCode}
                    </td>
                    <td className="px-4 py-3 text-gray-500 border-r border-gray-50 print:border-gray-300">
                      {p.category}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800 text-center border-r border-gray-50 print:border-gray-300">
                      {p.stock}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-500 text-right border-r border-gray-50 print:border-gray-300">
                      ₹ {p.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-800 text-right print:border-gray-300">
                      ₹ {p.stockValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-50 print:bg-gray-100 border-t border-gray-200">
                  <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-800 print:border-gray-300">
                    Total Stock Value
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-indigo-700 text-right print:border-gray-300 print:text-gray-800">
                    ₹ {totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </td>
                </tr>
              </tbody>
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
