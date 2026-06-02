"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Star, Calendar, Printer, ChevronDown, Download, Mail, Info, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

type ReportItem = {
  id: string;
  type: "invoice" | "creditNote";
  customerGSTIN: string;
  customerName: string;
  purchaseInvoiceNumber: string;
  date: string;
  total: number;
  subtotal: number;
  placeOfSupply: string;
  isInterstate: boolean;
  items: any[];
  createdAt: any;
};

export default function GSTR2ReportPage() {
  const [allData, setAllData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeTab, setActiveTab] = useState("B2B");
  const [dateFilter, setDateFilter] = useState("365"); // days
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: "", cc: "" });

  // Fetch all relevant data (Invoices + Credit Notes)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch Invoices
          const invQ = query(collection(db, "purchases"), where("userId", "==", user.uid));
          const invSnap = await getDocs(invQ);
          const purchasesData: ReportItem[] = invSnap.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              type: "invoice",
              customerGSTIN: d.customerGSTIN || "",
              customerName: d.customerName || "Unknown",
              purchaseInvoiceNumber: d.purchaseInvoiceNumber || "",
              date: d.date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : ""),
              total: Number(d.total) || 0,
              subtotal: Number(d.subtotal) || 0,
              placeOfSupply: d.placeOfSupply || "State",
              isInterstate: !!d.isInterstate,
              items: d.items || [],
              createdAt: d.createdAt
            };
          });

          // Fetch Credit Notes
          const cnQ = query(collection(db, "creditNotes"), where("userId", "==", user.uid));
          const cnSnap = await getDocs(cnQ);
          const creditNotesData: ReportItem[] = cnSnap.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              type: "creditNote",
              customerGSTIN: d.customerGSTIN || "", // Assuming it might be saved
              customerName: d.customerName || "Unknown",
              purchaseInvoiceNumber: d.creditNoteNumber || "",
              date: d.date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : ""),
              total: Number(d.total) || 0,
              subtotal: Number(d.subtotal || d.total) || 0,
              placeOfSupply: "State",
              isInterstate: false,
              items: [],
              createdAt: d.createdAt
            };
          });

          let combined = [...purchasesData, ...creditNotesData];
          
          // Sort desc by date
          combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setAllData(combined);
        } catch (err) {
          console.error("Failed to load report data", err);
          toast.error("Failed to load report data");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Filter Data based on Date & Tab
  const filteredData = useMemo(() => {
    let result = allData;

    // 1. Date Filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(item => {
        if (!item.date) return false;
        return new Date(item.date) >= cutoff;
      });
    }

    // 2. Tab Filter
    result = result.filter(item => {
      const hasGSTIN = item.customerGSTIN && item.customerGSTIN.trim().length > 0;
      
      switch (activeTab) {
        case "B2B":
          return item.type === "invoice" && hasGSTIN;
        case "B2CL":
          return item.type === "invoice" && !hasGSTIN && item.isInterstate && item.total > 250000;
        case "B2CS":
          return item.type === "invoice" && !hasGSTIN && !(item.isInterstate && item.total > 250000);
        case "CDNR":
          return item.type === "creditNote" && hasGSTIN;
        case "CDNUR":
          return item.type === "creditNote" && !hasGSTIN;
        case "EXEMP":
          // Check if all items are 0% GST or Exempt
          return item.type === "invoice" && item.items.every((i: any) => !i.gstRate || i.gstRate === 0);
        case "HSN":
          // HSN is usually a summary view, but for now we'll just show all purchases with HSN codes
          return item.type === "invoice" && item.items.some((i: any) => i.hsn);
        default:
          return true;
      }
    });

    return result;
  }, [allData, activeTab, dateFilter]);

  // Calculate Stats based on FILTERED data
  const stats = useMemo(() => {
    const uniqueCustomers = new Set(filteredData.map(i => i.customerName));
    const sumTotal = filteredData.reduce((sum, item) => sum + item.total, 0);
    const sumTaxable = filteredData.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      recipients: uniqueCustomers.size,
      purchases: filteredData.length,
      totalValue: sumTotal,
      taxableValue: sumTaxable
    };
  }, [filteredData]);

  const handleDownloadExcel = () => {
    if (filteredData.length === 0) return toast.error("No data to download");
    
    const headers = [
      "GSTIN/UIN OF RECIPIENT", "RECEIVERS NAME", "INVOICE NUMBER", 
      "INVOICE DATE", "INVOICE VALUE", "PLACE OF SUPPLY", "REVERSE CHARGE", 
      "APPLICABLE TAX %", "INVOICE TYPE", "ECOMMERCE GSTIN", "RATE", 
      "TAXABLE VALUE", "CESS AMOUNT"
    ];
    
    const rows = filteredData.map(item => [
      item.customerGSTIN || "-",
      item.customerName || "-",
      item.purchaseInvoiceNumber || "-",
      item.date || "-",
      item.total.toFixed(2),
      item.placeOfSupply,
      "N",
      "-",
      item.type === "invoice" ? "Regular" : "Credit Note",
      "-",
      item.items?.[0]?.gstRate || "-",
      item.subtotal.toFixed(2),
      "-"
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
        <h2>GSTR-2 (Sales) Report - ${activeTab}</h2>
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
    link.download = `GSTR-2_${activeTab}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Excel downloaded successfully 📊");
    setShowDownloadMenu(false);
  };

  const handlePrint = () => {
    window.print();
    setShowDownloadMenu(false);
  };

  const tabs = ["B2B", "B2CL", "B2CS", "CDNR", "CDNUR", "EXEMP", "HSN"];

  return (
    <div id="print-area" className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20 print:block print:min-h-0 print:bg-white">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/reports" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800">GSTR-2 (Sales)</h1>
            <button className="flex items-center gap-1.5 text-xs text-brand-primary border border-blue-200 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 font-semibold transition-colors">
              <PlayCircle size={14} /> Watch how to use JSON file
            </button>
            <button className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 bg-white px-2 py-1 rounded hover:bg-gray-50 font-semibold transition-colors">
              <Star size={14} className="text-gray-400" /> Favourite
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 space-y-4">
        
        {/* Warning Banner */}
        <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold text-center py-2 rounded shadow-sm print:hidden">
          This report aggregates live synced data across your Invoices and Credit Notes. Ensure your GSTIN entries are accurate for proper B2B/B2C bucketing.
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm print:hidden">
          
          <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 font-semibold hover:bg-gray-50">
            <Calendar size={16} className="text-gray-400" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 365 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded text-sm text-gray-600 font-bold hover:bg-gray-50 shadow-sm transition-colors">
              <Printer size={16} /> Print
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded text-sm text-gray-600 font-bold hover:bg-gray-50 shadow-sm transition-colors"
              >
                JSON Download <ChevronDown size={16} />
              </button>
              
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-30 py-1">
                  <button onClick={handleDownloadExcel} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-semibold">
                    Download Excel
                  </button>
                  <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-semibold">
                    Download Pdf
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded text-sm text-gray-600 font-bold hover:bg-gray-50 shadow-sm transition-colors"
            >
              <Mail size={16} /> Email JSON <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Promo Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center text-sm font-semibold text-gray-800 shadow-sm print:hidden">
          Get all your data for GST filing by downloading the <span className="text-brand-primary">JSON file</span> and uploading on GST portal
        </div>

        {/* Data Workspace */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col print:block print:overflow-visible print:border-none print:shadow-none">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar print:hidden">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? "border-indigo-600 text-indigo-700 bg-indigo-50/30" 
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {tab} {tab === "B2B" && <Info size={12} className="inline ml-1 text-gray-400" />}
              </button>
            ))}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-gray-100 border-b border-gray-200">
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-gray-500 font-bold mb-1">Number of Recipients</span>
              <span className="text-lg font-black text-gray-800">{stats.recipients}</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-gray-500 font-bold mb-1">Number of Documents</span>
              <span className="text-lg font-black text-gray-800">{stats.purchases}</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-gray-500 font-bold mb-1">Total Invoice Value</span>
              <span className="text-lg font-black text-gray-800">{stats.totalValue.toFixed(2)}</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-gray-500 font-bold mb-1">Total Taxable Value</span>
              <span className="text-lg font-black text-gray-800">{stats.taxableValue.toFixed(2)}</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-gray-500 font-bold mb-1">Total CESS</span>
              <span className="text-lg font-black text-gray-800">0</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto print:overflow-visible print:w-full">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">GSTIN/UIN OF RECIPIENT</th>
                  <th className="px-4 py-3">RECEIVERS NAME</th>
                  <th className="px-4 py-3">INVOICE NUMBER</th>
                  <th className="px-4 py-3">INVOICE DATE</th>
                  <th className="px-4 py-3 text-right">INVOICE VALUE</th>
                  <th className="px-4 py-3">PLACE OF SUPPLY</th>
                  <th className="px-4 py-3 text-center">REVERSE CHARGE</th>
                  <th className="px-4 py-3 text-center">APPLICABLE TAX %</th>
                  <th className="px-4 py-3">INVOICE TYPE</th>
                  <th className="px-4 py-3 text-center">ECOMMERCE GSTIN</th>
                  <th className="px-4 py-3 text-center">RATE</th>
                  <th className="px-4 py-3 text-right">TAXABLE VALUE</th>
                  <th className="px-4 py-3 text-center">CESS AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={13} className="py-12 text-center text-gray-400 font-medium">Loading report data...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={13} className="py-12 text-center text-gray-400 font-medium">No sales data found for this period and category.</td></tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 font-mono">{item.customerGSTIN || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{item.customerName || "-"}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{item.purchaseInvoiceNumber || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{item.date || "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 font-mono">{item.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{item.placeOfSupply || "State"}</td>
                      <td className="px-4 py-3 text-center text-gray-500">N</td>
                      <td className="px-4 py-3 text-center text-gray-500">-</td>
                      <td className="px-4 py-3 text-gray-600">{item.type === "invoice" ? "Regular" : "Credit Note"}</td>
                      <td className="px-4 py-3 text-center text-gray-500">-</td>
                      <td className="px-4 py-3 text-center text-gray-600 font-mono">{item.items?.[0]?.gstRate || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800 font-mono">{item.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-gray-500">-</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Warning */}
          <div className="bg-yellow-50/50 border-t border-gray-200 p-3 text-center text-[11px] font-bold text-gray-600">
            Invoices <span className="text-gray-800">pushed to IRN</span> will be autopopulated on govt GST portal. However, the tax payer should still verify all the data in this report at the time of filing to avoid any errors.
          </div>

        </div>

      </main>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Email JSON / Excel Report</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                We will send you the GSTR-2 report to the email below
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Your Email ID *</label>
                <input 
                  type="email" 
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="abc@gmail.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CA Email ID (Optional)</label>
                <input 
                  type="email" 
                  value={emailData.cc}
                  onChange={(e) => setEmailData({...emailData, cc: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="abc@gmail.com"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-200 rounded text-gray-600 text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!emailData.to) {
                    toast.error("Please enter your Email ID");
                    return;
                  }
                  toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 1500)),
                    {
                      loading: 'Generating and emailing JSON report...',
                      success: `Report sent successfully to ${emailData.to}! 📧`,
                      error: 'Failed to send email.',
                    }
                  ).then(() => {
                    setShowEmailModal(false);
                    setEmailData({ to: "", cc: "" });
                  });
                }}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded text-sm font-bold hover:bg-indigo-200 transition-colors"
              >
                Send Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
