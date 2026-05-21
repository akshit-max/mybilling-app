"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, ChevronDown, FileText, ShoppingCart, Settings2, MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const [totalPurchases, setTotalPurchases] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [unpaidAmount, setUnpaidAmount] = useState(0);

  const fetchPurchases = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "purchases"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      
      let tPurchases = 0;
      let tPaid = 0;
      let tUnpaid = 0;

      let data = snap.docs.map(doc => {
        const d = doc.data();
        const total = Number(d.total) || 0;
        const paid = Number(d.amountPaid) || Number(d.amountReceived) || 0;
        const unpaid = total - paid;

        tPurchases += total;
        tPaid += paid;
        if (unpaid > 0) tUnpaid += unpaid;

        return {
          id: doc.id,
          ...d,
          unpaidAmount: unpaid,
          createdAtTime: d.createdAt ? (d.createdAt.toMillis ? d.createdAt.toMillis() : new Date(d.createdAt).getTime()) : 0
        };
      });

      // Sort by createdAt descending client-side
      data.sort((a, b) => b.createdAtTime - a.createdAtTime);

      setTotalPurchases(tPurchases);
      setPaidAmount(tPaid);
      setUnpaidAmount(tUnpaid);
      setPurchases(data);
    } catch (err) {
      console.error("Error fetching purchases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPurchases();
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete purchase invoice ${invoiceNumber}?`)) return;
    try {
      await deleteDoc(doc(db, "purchases", id));
      toast.success("Purchase invoice deleted successfully");
      fetchPurchases();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    } finally {
      setActiveDropdownId(null);
    }
  };

  const purchaseColumns = [
    { 
      header: "DATE", 
      accessorKey: "date",
      cell: (row: any) => {
        if (!row.date) return "-";
        const d = new Date(row.date);
        return <span className="text-gray-600 font-medium">{d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
      }
    },
    { 
      header: "PURCHASE INVOICE NUMBER", 
      accessorKey: "purchaseInvoiceNumber",
      cell: (row: any) => (
        <span className="text-gray-800 font-medium">{row.purchaseInvoiceNumber}</span>
      )
    },
    { 
      header: "PARTY NAME", 
      accessorKey: "customerName",
      cell: (row: any) => (
        <span className="text-gray-800 font-medium">{row.customerName}</span>
      )
    },
    { 
      header: "DUE IN", 
      accessorKey: "dueDate",
      cell: (row: any) => {
        if (row.unpaidAmount <= 0) return "-";
        if (!row.dueDate) return "-";
        const due = new Date(row.dueDate);
        const today = new Date();
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          return <span className="text-red-500 font-medium text-xs">Overdue by {Math.abs(diffDays)} days</span>;
        } else if (diffDays === 0) {
          return <span className="text-orange-500 font-medium text-xs">Due Today</span>;
        }
        return <span className="text-gray-600 font-medium text-xs">Due in {diffDays} days</span>;
      }
    },
    { 
      header: "AMOUNT", 
      accessorKey: "total",
      cell: (row: any) => (
        <div>
          <div className="text-gray-800 font-bold">₹ {Number(row.total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
          {row.unpaidAmount > 0 && (
            <div className="text-gray-500 text-[10px] font-semibold">(₹ {row.unpaidAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} unpaid)</div>
          )}
        </div>
      )
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex items-center justify-end gap-3 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/purchases/receipt/${row.id}`);
            }}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            title="View / Print"
          >
            <Eye size={16} />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/purchases/edit/${row.id}`);
            }}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id, row.purchaseInvoiceNumber);
            }}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const filteredPurchases = purchases.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.purchaseInvoiceNumber || "").toLowerCase().includes(q) ||
      (p.customerName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans">
      
      {/* Outer White Card Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[600px]">
        
        {/* Header inside the card */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">Purchase Invoices</h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-blue-600 border border-blue-200 px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-50 transition-colors">
              <FileText size={14} /> Reports <ChevronDown size={12} />
            </button>
            <button className="flex items-center gap-2 text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded hover:bg-gray-50 transition-colors">
              <Settings2 size={14} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pt-5 pb-5 border-b border-gray-100">
          <div className="bg-indigo-50/30 border border-indigo-100 rounded-lg p-4 flex flex-col justify-center h-24">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <span className="font-bold text-sm">$</span>
              <span className="text-xs font-bold tracking-wider uppercase">Total Purchases</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">₹ {totalPurchases.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col justify-center h-24 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <span className="font-bold text-sm">$</span>
              <span className="text-xs font-bold tracking-wider uppercase">Paid</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">₹ {paidAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col justify-center h-24 shadow-xs">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <span className="font-bold text-sm">$</span>
              <span className="text-xs font-bold tracking-wider uppercase">Unpaid</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">₹ {unpaidAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 flex flex-wrap gap-4 justify-between items-center bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-56 focus:outline-none focus:border-indigo-500 bg-white shadow-xs"
              />
            </div>
            <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-50 shadow-xs font-medium">
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Last 365 Days
              </span>
              <ChevronDown size={12} />
            </button>
          </div>

          <Link href="/dashboard/purchases/create">
            <button className="bg-[#5B3DF5] text-white px-5 py-2 rounded text-[11px] font-bold uppercase tracking-wider hover:bg-[#4A2FE0] transition-colors shadow-sm">
              Create Purchase Invoice
            </button>
          </Link>
        </div>

        {/* Table / Empty State */}
        <div className="flex-1 flex flex-col bg-white">
          <DataTable
            columns={purchaseColumns}
            data={filteredPurchases}
            keyExtractor={(row) => row.id}
            emptyState={
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                {loading ? (
                  <p className="text-gray-400 text-sm">Loading purchases...</p>
                ) : (
                  <EmptyState
                    title="No Transactions Matching the current filter"
                    icon={<ShoppingCart size={48} className="text-gray-300" />}
                  />
                )}
              </div>
            }
          />
        </div>

      </div>
    </div>
  );
}
