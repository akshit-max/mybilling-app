"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronDown, Plus, FileText, Pencil, Trash2, Eye, MoreVertical, Calendar, Filter, Download } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, deleteDoc, doc, orderBy, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type InvoiceItem = {
  name: string;
  qty: number;
  price: number;
  total?: number;
};

type Invoice = {
  id: string;
  customerName: string;
  total: number;
  status: "paid" | "pending" | "credit" | "cancelled" | string;
  invoiceNumber: string;
  invoiceType?: "invoice" | "estimate" | "pos";
  date?: string;
  dueDate?: string;
  createdAt?: any;
  items?: InvoiceItem[];
  isOffline?: boolean;
  amountReceived?: number;
};

export default function SalesInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"365" | "today" | "all">("365");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "credit" | "cancelled">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "invoice" | "estimate">("all");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const fetchInvoicesList = async (userId: string) => {
    try {
      setLoading(true);
      
      // 1. Fetch Online from Firestore
      let onlineData: Invoice[] = [];
      try {
        const q = query(
          collection(db, "invoices"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        onlineData = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            customerName: d.customerName || d.partyName || "Cash Sale",
            total: Number(d.total || 0),
            status: d.status || "pending",
            invoiceNumber: d.invoiceNumber || docSnap.id.substring(0, 8).toUpperCase(),
            invoiceType: d.invoiceType || "invoice",
            date: d.date || (d.createdAt ? new Date(d.createdAt.toDate ? d.createdAt.toDate() : d.createdAt).toISOString().split("T")[0] : ""),
            dueDate: d.dueDate || "",
            isOffline: false,
            amountReceived: typeof d.amountReceived === "number" ? d.amountReceived : undefined,
          };
        });
      } catch (err) {
        console.warn("Firestore fetch offline fallback:", err);
      }

      // 2. Fetch Offline from IndexedDB
      let offlineData: Invoice[] = [];
      try {
        const { getOfflineInvoices } = await import("@/lib/offlineInvoices");
        const cached = await getOfflineInvoices();
        offlineData = cached.map((c: any) => ({
          id: c.id?.toString() || c.invoiceNumber,
          customerName: c.customerName || "Cash Sale",
          total: Number(c.total || 0),
          status: c.status || "pending",
          invoiceNumber: c.invoiceNumber,
          invoiceType: c.invoiceType || "invoice",
          date: c.date || new Date().toISOString().split("T")[0],
          dueDate: c.dueDate || "",
          isOffline: true,
          amountReceived: typeof c.amountReceived === "number" ? c.amountReceived : undefined,
        }));
      } catch (err) {
        console.error("IndexedDB fetch error:", err);
      }

      // Combine both sources
      const combined = [...offlineData, ...onlineData];
      
      // Remove duplicate IDs just in case
      const uniqueMap = new Map<string, Invoice>();
      combined.forEach(inv => {
        uniqueMap.set(inv.id, inv);
      });

      setInvoices(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchInvoicesList(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) return;
    try {
      if (invoice.isOffline) {
        const { deleteOfflineInvoice } = await import("@/lib/offlineInvoices");
        await deleteOfflineInvoice(invoice.id);
      } else {
        await deleteDoc(doc(db, "invoices", invoice.id));
      }
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
      toast.success("Invoice deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    } finally {
      setActiveDropdownId(null);
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (invoice.isOffline) {
      toast.error("Offline invoice drafts cannot be cancelled directly");
      return;
    }
    if (!confirm(`Cancel invoice ${invoice.invoiceNumber}?`)) return;
    try {
      await updateDoc(doc(db, "invoices", invoice.id), {
        status: "cancelled",
      });
      setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, status: "cancelled" } : inv));
      toast.success("Invoice cancelled");
    } catch (err) {
      console.error(err);
      toast.error("Cancel operation failed");
    } finally {
      setActiveDropdownId(null);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === "paid") return "bg-green-50 text-green-700 border border-green-100";
    if (s === "pending" || s === "credit") return "bg-amber-50 text-amber-700 border border-amber-100";
    if (s === "cancelled") return "bg-gray-100 text-gray-500 border border-gray-200";
    return "bg-gray-50 text-gray-700 border border-gray-200";
  };

  // Real aggregations (excluding cancelled and estimates from active sales calculations)
  const activeInvoices = invoices.filter(i => i.status !== "cancelled" && i.invoiceType !== "estimate");
  const totalSales = activeInvoices.reduce((acc, curr) => acc + curr.total, 0);
  const totalPaid = activeInvoices.reduce((acc, curr) => {
    const received = typeof curr.amountReceived === "number"
      ? curr.amountReceived
      : (curr.status === "paid" ? curr.total : 0);
    return acc + received;
  }, 0);
  const totalUnpaid = activeInvoices.reduce((acc, curr) => {
    const received = typeof curr.amountReceived === "number"
      ? curr.amountReceived
      : (curr.status === "paid" ? curr.total : 0);
    return acc + Math.max(0, curr.total - received);
  }, 0);
  const estimateCount = invoices.filter(i => i.invoiceType === "estimate").length;

  // Apply filters
  const filteredInvoices = invoices.filter((inv) => {
    if (inv.invoiceType === "estimate") return false;
    // 1. Search Query
    const searchMatch = 
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());

    // 2. Status Filter
    const statusMatch = statusFilter === "all" || inv.status.toLowerCase() === statusFilter;

    // 3. Invoice Type Filter
    const typeMatch = typeFilter === "all" || (inv.invoiceType || "invoice") === typeFilter;

    // 4. Date Filter
    if (dateFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      if (inv.date !== todayStr) return false;
    } else if (dateFilter === "365") {
      const yearAgo = new Date();
      yearAgo.setDate(yearAgo.getDate() - 365);
      const invDate = new Date(inv.date || "");
      if (invDate < yearAgo) return false;
    }

    return searchMatch && statusMatch && typeMatch;
  });

  return (
    <div className="space-y-6 max-w-full mx-auto pb-12 font-sans relative">
      
      {/* HEADER ACTION BAR */}
      <div className="flex justify-between items-center bg-white px-6 py-4 border-b border-gray-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-base font-bold text-gray-800">Sales Invoices</h1>
          <p className="text-[11px] text-gray-400 font-medium">Create, track and generate professional tax invoices & estimates</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded bg-white hover:bg-indigo-50 font-semibold transition-colors">
            <FileText size={13} />
            <span>Reports</span>
            <ChevronDown size={12} />
          </button>
          <button className="p-2 text-gray-400 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center shrink-0">
            <Filter size={13} />
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS GROUP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-6">
        
        {/* Total Sales */}
        <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-4 flex flex-col justify-center h-22 shadow-xs">
          <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-1">Total Sales</span>
          <span className="text-xl font-bold text-gray-800 font-mono">₹ {totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Paid */}
        <div className="bg-green-50/40 border border-green-100 rounded-lg p-4 flex flex-col justify-center h-22 shadow-xs">
          <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">Paid</span>
          <span className="text-xl font-bold text-gray-800 font-mono">₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Pending / Unpaid */}
        <div className="bg-amber-50/40 border border-amber-100 rounded-lg p-4 flex flex-col justify-center h-22 shadow-xs">
          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Unpaid</span>
          <span className="text-xl font-bold text-gray-800 font-mono">₹ {totalUnpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Estimates / Quotations */}
        

      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white border border-gray-200 rounded-lg mx-6 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
        
        <div className="p-3 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
          
          {/* Left Filters */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input 
                type="text" 
                placeholder="Search party or invoice no..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-56 focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>

            {/* Date Range Selector */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="border border-gray-200 rounded text-xs px-2.5 py-1.5 focus:outline-none bg-white font-semibold text-gray-600"
            >
              <option value="365">Last 365 Days</option>
              <option value="today">Today</option>
              <option value="all">All Time</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-gray-200 rounded text-xs px-2.5 py-1.5 focus:outline-none bg-white font-semibold text-gray-600"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="credit">Credit</option>
              <option value="cancelled">Cancelled</option>
            </select>

            

          </div>

          {/* Right Create Button */}
          <div>
            <Link href="/dashboard/invoices/create" className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs px-4 py-1.5 rounded font-semibold transition-colors flex items-center gap-1 shadow-sm">
              <Plus size={13} />
              <span>Create Sales Invoice</span>
            </Link>
          </div>

        </div>

        {/* DENSE SaaS TABLE WORKSPACE */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-gray-400 gap-2 text-xs">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span>Loading invoice logs...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-20 text-gray-400 space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-xl shadow-xs">
                📄
              </div>
              <p className="text-xs font-semibold text-gray-700">No invoices or estimates found</p>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">Create a new sales invoice or quotation draft to populate the records.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="px-5 py-3 w-10 text-center">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Invoice Number</th>
                  <th className="px-4 py-3 font-semibold">Party Name</th>
                  <th className="px-4 py-3 font-semibold">Due In</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center w-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredInvoices.map((inv) => {
                  const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "paid" && inv.status !== "cancelled";
                  
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/45 transition-colors">
                      <td className="px-5 py-3 w-10 text-center">
                        <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{inv.date || "-"}</td>
                      <td className="px-4 py-3 font-bold font-mono text-gray-700">
                        {inv.invoiceType === "estimate" ? (
                          <span className="text-orange-600 bg-orange-50 border border-orange-100 rounded-sm text-[9px] px-1 py-0.5 mr-1 font-bold">EST</span>
                        ) : inv.invoiceType === "pos" ? (
                          <span className="text-blue-600 bg-blue-50 border border-blue-100 rounded-sm text-[9px] px-1 py-0.5 mr-1 font-bold">POS</span>
                        ) : null}
                        {inv.isOffline ? (
                          <span className="text-gray-500 bg-gray-50 border border-gray-200 rounded-sm text-[9px] px-1 py-0.5 mr-1 font-bold">DRAFT</span>
                        ) : null}
                        <Link href={`/dashboard/invoices/${inv.id}`} className="hover:text-indigo-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{inv.customerName}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {isOverdue ? (
                          <span className="text-red-500 font-semibold font-mono">Overdue</span>
                        ) : inv.dueDate ? (
                          <span className="text-gray-650 font-mono font-medium">{inv.dueDate}</span>
                        ) : (
                          <span className="text-gray-400 font-medium">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-gray-800">
                        ₹ {inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${getStatusStyle(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center relative">
                        
                        {/* Vertical menu toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id);
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {/* Interactive Dropdown Box */}
                        {activeDropdownId === inv.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-12 top-2 z-30 bg-white border border-gray-200 rounded-md shadow-lg w-40 py-1 text-left"
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/invoices/${inv.id}`);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs text-gray-700 font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <Eye size={12} className="text-gray-400" />
                              <span>View / Print</span>
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (inv.invoiceType === "estimate") {
                                  router.push(`/dashboard/quotations/edit/${inv.id}`);
                                } else {
                                  router.push(`/dashboard/invoices/edit/${inv.id}`);
                                }
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs text-gray-700 font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <Pencil size={12} className="text-indigo-500" />
                              <span>Edit</span>
                            </button>

                            {inv.status !== "cancelled" && (
                              <button 
                                onClick={() => handleCancelInvoice(inv)}
                                className="w-full px-3 py-1.5 hover:bg-gray-50 text-xs text-gray-700 font-medium flex items-center gap-1.5 transition-colors text-left"
                              >
                                <span className="text-gray-400">✕</span>
                                <span>Cancel Invoice</span>
                              </button>
                            )}

                            <button 
                              onClick={() => handleDelete(inv)}
                              className="w-full px-3 py-1.5 hover:bg-gray-50 text-xs text-red-600 font-medium flex items-center gap-1.5 transition-colors text-left border-t border-gray-50"
                            >
                              <Trash2 size={12} className="text-red-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}

                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
