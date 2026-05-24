"use client";

import React, { useState, useEffect } from "react";
import { PlayCircle, Clock, CalendarDays, BellRing, Search, ChevronDown, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AutomatedBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const q = query(
          collection(db, "automatedBills"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Manual sort by created date
        data.sort((a: any, b: any) => new Date(b.createdAt?.toDate() || b.createdAt).getTime() - new Date(a.createdAt?.toDate() || a.createdAt).getTime());
        setBills(data);
      } catch (err) {
        console.error("Failed to load automated bills", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = (bill.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || (bill.status || "Active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <span className="text-[10px] font-bold px-3 py-1 bg-green-100 text-green-700 rounded w-16 text-center inline-block">Active</span>;
      case "Paused":
        return <span className="text-[10px] font-bold px-3 py-1 bg-gray-200 text-gray-600 rounded w-16 text-center inline-block">Paused</span>;
      case "Stopped":
        return <span className="text-[10px] font-bold px-3 py-1 bg-red-100 text-red-600 rounded w-16 text-center inline-block">Stopped</span>;
      default:
        return <span className="text-[10px] font-bold px-3 py-1 bg-green-100 text-green-700 rounded w-16 text-center inline-block">Active</span>;
    }
  };

  const SplashContent = () => (
    <main className="flex-1 max-w-[1200px] w-full mx-auto p-12 flex flex-col items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
        {/* Card 1 */}
        <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="mb-10 relative flex-1 flex items-center justify-center">
            <div className="w-32 h-32 bg-sky-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
               <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
               <Clock size={48} className="text-slate-700 stroke-[1.5]" />
            </div>
            <div className="w-36 h-2 bg-sky-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-sm font-bold text-gray-800">Creating repeated bills?</h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Automate sending of repeat bills based on a schedule of your choice
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="mb-10 relative flex-1 flex items-center justify-center">
            <div className="w-32 h-32 bg-indigo-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
               <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
               <CalendarDays size={48} className="text-slate-700 stroke-[1.5]" />
            </div>
            <div className="w-36 h-2 bg-indigo-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-sm font-bold text-gray-800">Automated Billing</h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Send SMS reminders to customers daily/weekly/monthly
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="mb-10 relative flex-1 flex items-center justify-center">
            <div className="w-32 h-32 bg-orange-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
               <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
               <BellRing size={48} className="text-slate-700 stroke-[1.5]" />
            </div>
            <div className="w-36 h-2 bg-orange-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-sm font-bold text-gray-800">Easy Reminders & Payment</h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Automatically receive notifications and collect payments
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 mt-4">
        <p className="text-sm text-gray-500 font-medium">
          Schedule your repeated bills hassle-free
        </p>
        <Link 
          href="/dashboard/automated-bills/create"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2.5 rounded text-sm transition-colors shadow-sm"
        >
          Create Automated Bill
        </Link>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">Automated Bills</h1>
          <button className="flex items-center gap-1.5 text-[11px] text-blue-500 border border-blue-200 bg-blue-50/50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors font-bold uppercase tracking-wider">
            <PlayCircle size={14} />
            <span>What is Automated Bills</span>
          </button>
        </div>
        {bills.length > 0 && (
          <Link 
            href="/dashboard/automated-bills/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded transition-colors shadow-sm inline-flex items-center gap-2"
          >
            Create Automated Invoice
          </Link>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">Loading automated bills...</div>
      ) : bills.length === 0 ? (
        <SplashContent />
      ) : (
        <main className="flex-1 max-w-[1200px] w-full mx-auto p-8">
          
          {/* Filters Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by party name"
                className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-40 border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                <span>{statusFilter}</span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              
              {dropdownOpen && (
                <div className="absolute top-full mt-1 left-0 w-40 bg-white border border-gray-200 shadow-lg rounded z-20 py-1">
                  {["All", "Active", "Stopped", "Paused"].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setDropdownOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm ${statusFilter === status ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700 hover:bg-gray-100"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Party</th>
                  <th className="px-6 py-4">Frequency</th>
                  <th className="px-6 py-4">Previous Invoice Date</th>
                  <th className="px-6 py-4">Next Invoice Date</th>
                  <th className="px-6 py-4 text-center">Vouchers Made</th>
                  <th className="px-6 py-4 text-center">Pending Vouchers</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      No automated bills found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/automated-bills/${bill.id}`)}>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        {bill.customerName}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {bill.repeatFrequency} {bill.repeatUnit}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                        {bill.previousInvoiceDate || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                        {bill.nextInvoiceDate ? new Date(bill.nextInvoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-medium text-gray-700">
                        {bill.vouchersMade || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-medium text-gray-700">
                        {bill.pendingVouchers || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                        ₹{bill.total?.toLocaleString('en-IN') || "0"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(bill.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}
    </div>
  );
}
