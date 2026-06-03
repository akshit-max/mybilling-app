"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Calendar, FileText, ChevronDown } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SalesReturn = {
  id: string;
  date: string;
  salesReturnNumber: string;
  partyName: string;
  linkedInvoiceNumber: string;
  totalAmount: number;
  status: string;
  isOffline?: boolean;
};

export default function SalesReturnList() {
  const router = useRouter();
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("Last 365 Days");

  const fetchReturns = async (userId: string) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "salesReturns"),
        where("userId", "==", userId)
      );
      
      let onlineData: SalesReturn[] = [];
      try {
        const snapshot = await getDocs(q);
        onlineData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date || "",
            salesReturnNumber: data.salesReturnNumber || "-",
            partyName: data.customerName || data.partyName || "Unknown",
            linkedInvoiceNumber: data.linkedInvoiceNumber || "-",
            totalAmount: Number(data.total || data.totalAmount || 0),
            status: data.status || "Settled",
            isOffline: false
          };
        });
      } catch (err) {
        console.warn("Firestore fetch offline fallback:", err);
      }

      let offlineData: SalesReturn[] = [];
      try {
        const { getOfflineInvoices } = await import("@/lib/offlineInvoices");
        const cached = await getOfflineInvoices(userId);
        offlineData = cached
          .filter((c: any) => c.salesReturnNumber)
          .map((c: any) => ({
            id: c.id?.toString() || c.salesReturnNumber,
            date: c.date || new Date().toISOString().split("T")[0],
            salesReturnNumber: c.salesReturnNumber || "-",
            partyName: c.customerName || c.partyName || "Unknown",
            linkedInvoiceNumber: c.linkedInvoiceNumber || "-",
            totalAmount: Number(c.total || c.totalAmount || 0),
            status: c.status || "Settled",
            isOffline: true
          }));
      } catch (err) {
        console.error("IndexedDB fetch error:", err);
      }

      const combined = [...onlineData, ...offlineData];
      
      const uniqueMap = new Map<string, SalesReturn>();
      combined.forEach(inv => {
        if (!uniqueMap.has(inv.id) || !inv.isOffline) {
          uniqueMap.set(inv.id, inv);
        }
      });
      
      const list = Array.from(uniqueMap.values());
      // We already mapped in the blocks above
      
      // Sort client side by date desc
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setReturns(list);
    } catch (e) {
      console.error("Error fetching sales returns:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchReturns(user.uid);
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

  // Filters
  const filteredReturns = returns.filter((item) => {
    const term = search.toLowerCase();
    const matchSearch =
      item.partyName.toLowerCase().includes(term) ||
      item.salesReturnNumber.toLowerCase().includes(term) ||
      item.linkedInvoiceNumber.toLowerCase().includes(term);

    // Simple date filtering
    let matchDate = true;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const itemDate = new Date(item.date);

    if (dateFilter === "Today") {
      matchDate = item.date === todayStr;
    } else if (dateFilter === "Last 7 Days") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      matchDate = itemDate >= past && itemDate <= now;
    } else if (dateFilter === "Last 30 Days") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      matchDate = itemDate >= past && itemDate <= now;
    }
    
    return matchSearch && matchDate;
  });

  return (
    <div className="flex flex-col flex-1 min-w-0 font-sans min-h-screen pb-20 bg-gray-50/50">
      <div className="max-w-7xl mx-auto w-full pt-6 px-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sales Return</h1>
          <Link
            href="/dashboard/sales-return/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            Create Sales Return
          </Link>
        </div>

        {/* FILTERS */}
        <div className="bg-white border border-gray-200 rounded-t-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-b-0 shadow-xs">
           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search Sales Returns"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow bg-gray-50/50 hover:bg-gray-50"
                />
              </div>
              <div className="relative hidden md:block">
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition">
                  <Calendar size={16} className="text-gray-400" />
                  <select 
                    className="bg-transparent outline-none cursor-pointer appearance-none pr-4"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option>All Time</option>
                    <option>Today</option>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 365 Days</option>
                  </select>
                  <ChevronDown size={14} className="text-gray-400 absolute right-3 pointer-events-none" />
                </div>
              </div>
           </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-gray-200 rounded-b-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
             {loading ? (
                <div className="flex justify-center items-center h-64 text-gray-400">Loading sales returns...</div>
             ) : filteredReturns.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-4">
                  <div className="p-4 bg-gray-50 rounded-full">
                    <FileText size={32} className="text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-500">No Transactions Matching the current filter</p>
                </div>
             ) : (
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
                     <th className="p-4 font-bold cursor-pointer hover:bg-gray-100/50 transition">Date</th>
                     <th className="p-4 font-bold">Sales Return Number</th>
                     <th className="p-4 font-bold">Party Name</th>
                     <th className="p-4 font-bold">Invoice No</th>
                     <th className="p-4 font-bold cursor-pointer hover:bg-gray-100/50 transition">Amount</th>
                     <th className="p-4 font-bold">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                    {filteredReturns.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => router.push(`/dashboard/sales-return/${item.id}`)}
                        className="border-b border-gray-50 hover:bg-indigo-50/30 transition cursor-pointer group"
                      >
                        <td className="p-4 text-sm font-medium text-gray-600">
                          {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {item.isOffline ? (
                            <span className="text-gray-500 bg-gray-50 border border-gray-200 rounded-sm text-[9px] px-1 py-0.5 mr-1 font-bold">DRAFT</span>
                          ) : null}
                          {item.salesReturnNumber}
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-800">{item.partyName}</td>
                        <td className="p-4 text-sm font-medium text-gray-600">{item.linkedInvoiceNumber}</td>
                        <td className="p-4 text-sm font-bold text-gray-900">
                          ₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-green-100 text-green-700">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
