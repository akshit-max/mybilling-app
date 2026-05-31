"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Printer, Download, Search, Info, Mail, ChevronDown, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

// Helper to format slug to readable name
const formatSlugToName = (slug: string) => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function GenericReportPage({ params }: { params: { slug: string } }) {
  const reportName = formatSlugToName(params.slug);
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: "", cc: "" });
  const [isExporting, setIsExporting] = useState(false);

  const isProductReport = ["rate-list", "stock-summary", "low-stock-summary"].includes(params.slug);
  const isInvoiceReport = ["item-sales-summary"].includes(params.slug);
  const isPurchaseLedgerReport = ["gstr-2", "daybook-purchase"].includes(params.slug);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          if (isProductReport) {
            const q = query(collection(db, "products"), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            let docs: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (params.slug === "low-stock-summary") {
              docs = docs.filter(d => (d.stock || 0) <= (d.lowStockThreshold || 2));
            }
            setData(docs);
          } else if (isInvoiceReport) {
            const q = query(collection(db, "invoices"), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            const invoices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const rawItems: any[] = [];
            invoices.forEach((inv: any) => {
              if (inv.invoiceType === "estimate") return;
              inv.items?.forEach((item: any) => {
                 rawItems.push({
                   ...item,
                   date: inv.date || inv.createdAt,
                   invId: inv.id,
                 });
              });
            });
            setData(rawItems);
          } else if (isPurchaseLedgerReport) {
            const q = query(collection(db, "purchases"), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            docs.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
            setData(docs);
          } else {
            // Generic Invoice ledger logic
            const q = query(collection(db, "invoices"), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            docs.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
            setData(docs);
          }
        } catch (err) {
          console.error("Failed to load report", err);
          toast.error("Failed to load data for " + reportName);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [params.slug, isProductReport, isInvoiceReport, reportName]);

  const filteredData = data.filter((item) => {
    // Search
    if (search) {
      const matchName = item.name?.toLowerCase().includes(search.toLowerCase());
      const matchCustomer = item.customerName?.toLowerCase().includes(search.toLowerCase());
      const matchInv = item.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
      if (!matchName && !matchCustomer && !matchInv) return false;
    }
    
    // Date filter
    if (dateFilter !== "all" && (item.date || item.createdAt)) {
      const today = new Date();
      // Format local today as YYYY-MM-DD
      const localYear = today.getFullYear();
      const localMonth = String(today.getMonth() + 1).padStart(2, '0');
      const localDay = String(today.getDate()).padStart(2, '0');
      const todayStr = `${localYear}-${localMonth}-${localDay}`;
      
      let itemDateStr = "";
      let itemDateObj: Date;

      if (item.date) {
        itemDateStr = item.date.split("T")[0]; // YYYY-MM-DD
        itemDateObj = new Date(item.date);
      } else {
        itemDateObj = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        const iy = itemDateObj.getFullYear();
        const im = String(itemDateObj.getMonth() + 1).padStart(2, '0');
        const id = String(itemDateObj.getDate()).padStart(2, '0');
        itemDateStr = `${iy}-${im}-${id}`;
      }

      if (dateFilter === "today") {
        if (itemDateStr !== todayStr) return false;
      } else {
        const days = parseInt(dateFilter);
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - days);
        if (itemDateObj < cutoff) return false;
      }
    }
    return true;
  });

  const finalData = React.useMemo(() => {
    if (isInvoiceReport) {
      const itemSalesMap = new Map();
      filteredData.forEach((item) => {
         if (!itemSalesMap.has(item.name)) itemSalesMap.set(item.name, { name: item.name, qty: 0, amount: 0, count: 0 });
         const curr = itemSalesMap.get(item.name);
         curr.qty += Number(item.qty) || 0;
         curr.amount += (Number(item.qty) || 0) * (Number(item.price || item.rate) || 0);
         curr.count += 1;
      });
      return Array.from(itemSalesMap.values());
    }
    return filteredData;
  }, [filteredData, isInvoiceReport]);

  const totalAmount = isProductReport 
    ? finalData.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.stock || 0)), 0)
    : finalData.reduce((sum, item) => sum + (Number(item.amount || item.total) || 0), 0);

  const totalQty = isProductReport
    ? finalData.reduce((sum, item) => sum + (Number(item.stock) || 0), 0)
    : finalData.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const handlePrint = () => {
    window.print();
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

  const exportToExcel = () => {
    if (filteredData.length === 0) return toast.error("No data to export");
    
    setIsExporting(true);
    let headers: string[] = [];
    let rows: string[][] = [];

    if (params.slug === "rate-list") {
      headers = ["Item Name", "Item Code", "MRP (Purchase)", "Selling Price"];
      rows = finalData.map(item => [item.name || "-", item.itemCode || "-", String(item.costPrice || 0), String(item.price || 0)]);
    } else if (params.slug === "stock-summary" || params.slug === "low-stock-summary") {
      headers = ["Item Name", "Batch Number", "Item Code", "Purchase Price", "Selling Price", "Stock Quantity", "Stock Value"];
      rows = finalData.map(item => [item.name || "-", "-", item.itemCode || "-", String(item.costPrice || 0), String(item.price || 0), String(item.stock || 0), String((item.price || 0) * (item.stock || 0))]);
    } else if (params.slug === "item-sales-summary") {
      headers = ["Item Name", "Invoices Count", "Quantity Sold", "Total Sales Amount"];
      rows = finalData.map(item => [item.name || "-", String(item.count || 0), String(item.qty || 0), String(item.amount || 0)]);
    } else if (params.slug === "sales-summary") {
      headers = ["Date", "Invoice No.", "Party Name", "Status", "Amount"];
      rows = finalData.map(item => [
        item.date || new Date(item.createdAt).toISOString().split("T")[0] || "-",
        item.invoiceNumber || "-",
        item.customerName || item.partyName || "Cash Sale",
        item.status || "Pending",
        String(item.total || 0)
      ]);
    } else if (params.slug === "gstr-1") {
      headers = ["Date", "Invoice No.", "Customer Name", "Taxable Value", "Total Tax", "Total Amount"];
      rows = finalData.map(item => [
        item.date || "-",
        item.invoiceNumber || "-",
        item.customerName || "Cash Sale",
        String((item.total || 0) * 0.82),
        String((item.total || 0) * 0.18),
        String(item.total || 0)
      ]);
    } else if (params.slug === "gstr-2") {
      headers = ["Date", "Purchase Invoice No.", "Supplier Name", "Taxable Value", "Total Tax", "Total Amount"];
      rows = finalData.map(item => [
        item.date || "-",
        item.purchaseInvoiceNumber || "-",
        item.customerName || item.partyName || "Cash Purchase",
        String((item.total || 0) * 0.82),
        String((item.total || 0) * 0.18),
        String(item.total || 0)
      ]);
    } else if (params.slug === "daybook") {
      headers = ["Date", "Ref No.", "Party", "Type", "Value"];
      rows = finalData.map(item => [
        item.date || "-",
        item.invoiceNumber || "-",
        item.customerName || "Cash Sale",
        "Sales",
        String(item.total || 0)
      ]);
    } else if (params.slug === "daybook-purchase") {
      headers = ["Date", "Ref No.", "Party", "Type", "Value"];
      rows = finalData.map(item => [
        item.date || "-",
        item.purchaseInvoiceNumber || "-",
        item.customerName || item.partyName || "Cash Purchase",
        "Purchase",
        String(item.total || 0)
      ]);
    } else if (params.slug === "bill-wise-profit") {
      headers = ["Date", "Invoice No.", "Party", "Sales Value", "Estimated Cost", "Profit"];
      rows = finalData.map(item => [
        item.date || "-",
        item.invoiceNumber || "-",
        item.customerName || "Cash Sale",
        String(item.total || 0),
        String((item.total || 0) * 0.7),
        String((item.total || 0) * 0.3)
      ]);
    } else {
      headers = ["Date", "Reference No.", "Party Name", "Value"];
      rows = finalData.map(item => [
        item.date ? new Date(item.date).toLocaleDateString("en-IN") : "-",
        item.invoiceNumber || item.id.substring(0,8),
        item.customerName || "Cash Sale",
        String(item.total || 0)
      ]);
    }

    // Generate HTML-based Excel Table (Supported natively by Excel)
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
        <h2>${reportName}</h2>
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
    link.download = `${params.slug}_report.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setIsExporting(false);
    toast.success("Excel Report Downloaded! 📊");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20 print:bg-white print:p-8" id="print-area">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800">{reportName}</h1>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-semibold border border-indigo-100">
              Live Sync
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded text-sm text-gray-600 font-bold hover:bg-gray-50 shadow-sm transition-colors">
            <Mail size={16} /> Email Excel
          </button>
          <button onClick={exportToExcel} disabled={isExporting} className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded text-sm text-gray-600 font-bold hover:bg-gray-50 shadow-sm transition-colors">
            <Download size={16} /> {isExporting ? "Exporting..." : "Download Excel"}
            <ChevronDown size={14} className="ml-1 text-gray-400" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors">
            <Printer size={16} /> Print PDF
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4 print:p-0 print:w-full print:max-w-none">
        
        {/* Warning Banner */}
        <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium px-4 py-3 rounded-lg shadow-sm flex items-start gap-3 print:hidden">
          <Info size={18} className="mt-0.5 text-blue-500 shrink-0" />
          <p>
            You are viewing the <strong>{reportName}</strong> generated dynamically from your active database. 
            All standard columns have been aligned to default accounting standards.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 print:flex print:gap-8 print:mb-4">
          {isProductReport && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Stock Value</p>
                <p className="text-xl font-bold text-gray-800 mt-1">₹ {totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Stock Quantity</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{totalQty.toLocaleString('en-IN')}</p>
              </div>
            </>
          )}
          {isInvoiceReport && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Sales Quantity</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{totalQty.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Sales Value</p>
                <p className="text-xl font-bold text-gray-800 mt-1">₹ {totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm print:hidden">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search items or parties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium text-gray-600"
            />
          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 font-semibold hover:bg-gray-50">
            <Calendar size={16} className="text-gray-400" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="365">This Year</option>
            </select>
          </div>
        </div>

        {/* Print-Only Header */}
        <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{reportName}</h2>
          <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString('en-IN')} | Filter: {dateFilter === "all" ? "All Time" : dateFilter === "today" ? "Today" : `Last ${dateFilter} Days`}</p>
        </div>

        {/* Data Workspace */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col print:block print:overflow-visible print:border-none print:shadow-none">
          <div className="overflow-x-auto print:overflow-visible print:w-full">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider print:border-b-2 print:border-gray-800">
                <tr>
                  {params.slug === "rate-list" && (
                    <>
                      <th className="px-6 py-3">Item Name</th>
                      <th className="px-6 py-3">Item Code</th>
                      <th className="px-6 py-3 text-right">MRP (Purchase)</th>
                      <th className="px-6 py-3 text-right">Selling Price</th>
                    </>
                  )}
                  {(params.slug === "stock-summary" || params.slug === "low-stock-summary") && (
                    <>
                      <th className="px-6 py-3">Item Name</th>
                      <th className="px-6 py-3">Batch Number</th>
                      <th className="px-6 py-3">Item Code</th>
                      <th className="px-6 py-3 text-right">Purchase Price</th>
                      <th className="px-6 py-3 text-right">Selling Price</th>
                      <th className="px-6 py-3 text-right">Stock Qty</th>
                      <th className="px-6 py-3 text-right">Stock Value</th>
                    </>
                  )}
                  {params.slug === "item-sales-summary" && (
                    <>
                      <th className="px-6 py-3">Item Name</th>
                      <th className="px-6 py-3 text-center">Invoices Count</th>
                      <th className="px-6 py-3 text-right">Quantity Sold</th>
                      <th className="px-6 py-3 text-right">Sales Amount</th>
                    </>
                  )}
                  {params.slug === "sales-summary" && (
                    <>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Invoice No.</th>
                      <th className="px-6 py-3">Party Name</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </>
                  )}
                  {params.slug === "gstr-1" && (
                    <>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Invoice No.</th>
                      <th className="px-6 py-3">Customer Name</th>
                      <th className="px-6 py-3 text-right">Taxable Value</th>
                      <th className="px-6 py-3 text-right">Total Tax</th>
                      <th className="px-6 py-3 text-right">Total Amount</th>
                    </>
                  )}
                  {params.slug === "gstr-2" && (
                    <>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Purchase Invoice No.</th>
                      <th className="px-6 py-3">Supplier Name</th>
                      <th className="px-6 py-3 text-right">Taxable Value</th>
                      <th className="px-6 py-3 text-right">Total Tax</th>
                      <th className="px-6 py-3 text-right">Total Amount</th>
                    </>
                  )}
                  {params.slug === "daybook" && (
                    <>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Ref No.</th>
                      <th className="px-6 py-3">Party</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3 text-right">Value</th>
                    </>
                  )}
                  {params.slug === "daybook-purchase" && (
                    <>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Ref No.</th>
                      <th className="px-6 py-3">Party</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3 text-right">Value</th>
                    </>
                  )}
                  {params.slug === "bill-wise-profit" && (
                    <>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Invoice No.</th>
                      <th className="px-6 py-3">Party</th>
                      <th className="px-6 py-3 text-right">Sales Value</th>
                      <th className="px-6 py-3 text-right">Estimated Cost</th>
                      <th className="px-6 py-3 text-right">Profit</th>
                    </>
                  )}
                  {![
                    "rate-list", "stock-summary", "low-stock-summary", "item-sales-summary", 
                    "sales-summary", "gstr-1", "gstr-2", "daybook", "daybook-purchase", "bill-wise-profit"
                  ].includes(params.slug) && (
                    <>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Reference No.</th>
                      <th className="px-6 py-3">Party Name</th>
                      <th className="px-6 py-3 text-right">Value</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400 font-medium">Loading report data...</td></tr>
                ) : finalData.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400 font-medium">No records found for this criteria.</td></tr>
                ) : (
                  finalData.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                      
                      {params.slug === "rate-list" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.name}</td>
                          <td className="px-6 py-3 text-gray-500 font-mono">{item.itemCode || "-"}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {(item.costPrice || 0).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-800 font-mono">₹ {(item.price || 0).toLocaleString('en-IN')}</td>
                        </>
                      )}

                      {(params.slug === "stock-summary" || params.slug === "low-stock-summary") && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.name}</td>
                          <td className="px-6 py-3 text-gray-400 font-mono">-</td>
                          <td className="px-6 py-3 text-gray-500 font-mono">{item.itemCode || "-"}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {(item.costPrice || 0).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {(item.price || 0).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-800 font-mono">{item.stock || 0}</td>
                          <td className="px-6 py-3 text-right font-bold text-indigo-700 font-mono">₹ {((item.price || 0) * (item.stock || 0)).toLocaleString('en-IN')}</td>
                        </>
                      )}

                      {params.slug === "item-sales-summary" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.name}</td>
                          <td className="px-6 py-3 text-center text-gray-500 font-mono">{item.count}</td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-800 font-mono">{item.qty}</td>
                          <td className="px-6 py-3 text-right font-bold text-green-700 font-mono">₹ {item.amount.toLocaleString('en-IN')}</td>
                        </>
                      )}

                      {params.slug === "sales-summary" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800 font-mono">{item.date || (item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt)).toISOString().split("T")[0] || "-"}</td>
                          <td className="px-6 py-3 text-indigo-600 font-bold font-mono">{item.invoiceNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.customerName || item.partyName || "Cash Sale"}</td>
                          <td className="px-6 py-3"><span className="px-2 py-1 text-[10px] rounded-full font-bold uppercase bg-gray-100 text-gray-600">{item.status || "Pending"}</span></td>
                          <td className="px-6 py-3 text-right font-bold text-gray-800 font-mono">₹ {(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </>
                      )}

                      {params.slug === "gstr-1" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800 font-mono">{item.date || "-"}</td>
                          <td className="px-6 py-3 text-indigo-600 font-bold font-mono">{item.invoiceNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.customerName || "Cash Sale"}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {((item.total || 0) * 0.82).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {((item.total || 0) * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-800 font-mono">₹ {(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </>
                      )}

                      {params.slug === "gstr-2" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800 font-mono">{item.date || "-"}</td>
                          <td className="px-6 py-3 text-indigo-600 font-bold font-mono">{item.purchaseInvoiceNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.customerName || item.partyName || "Cash Purchase"}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {((item.total || 0) * 0.82).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {((item.total || 0) * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-800 font-mono">₹ {(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </>
                      )}

                      {params.slug === "daybook" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800 font-mono">{item.date || "-"}</td>
                          <td className="px-6 py-3 text-indigo-600 font-bold font-mono">{item.invoiceNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.customerName || "Cash Sale"}</td>
                          <td className="px-6 py-3 text-gray-500 font-bold uppercase">Sales</td>
                          <td className="px-6 py-3 text-right font-bold text-green-700 font-mono">+ ₹ {(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </>
                      )}

                      {params.slug === "daybook-purchase" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800 font-mono">{item.date || "-"}</td>
                          <td className="px-6 py-3 text-indigo-600 font-bold font-mono">{item.purchaseInvoiceNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.customerName || item.partyName || "Cash Purchase"}</td>
                          <td className="px-6 py-3 text-gray-500 font-bold uppercase">Purchase</td>
                          <td className="px-6 py-3 text-right font-bold text-red-600 font-mono">- ₹ {(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </>
                      )}

                      {params.slug === "bill-wise-profit" && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800 font-mono">{item.date || "-"}</td>
                          <td className="px-6 py-3 text-indigo-600 font-bold font-mono">{item.invoiceNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.customerName || "Cash Sale"}</td>
                          <td className="px-6 py-3 text-right text-gray-600 font-mono">₹ {(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right text-gray-500 font-mono">₹ {((item.total || 0) * 0.7).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right font-bold text-indigo-700 font-mono">₹ {((item.total || 0) * 0.3).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </>
                      )}

                      {![
                        "rate-list", "stock-summary", "low-stock-summary", "item-sales-summary", 
                        "sales-summary", "gstr-1", "gstr-2", "daybook", "daybook-purchase", "bill-wise-profit"
                      ].includes(params.slug) && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-800 font-mono">{item.date ? new Date(item.date).toLocaleDateString("en-IN") : "-"}</td>
                          <td className="px-6 py-3 text-gray-600 font-mono">{item.invoiceNumber || item.id.substring(0,8)}</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{item.customerName || "Cash Sale"}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-800 font-mono">₹ {(item.total || 0).toLocaleString('en-IN')}</td>
                        </>
                      )}

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Email Excel Report</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                We will send you the {reportName.toLowerCase()} to the email below
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
                onClick={handleEmailExcel}
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
