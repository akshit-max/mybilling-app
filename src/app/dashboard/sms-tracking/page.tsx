"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, Clock, CheckCircle2, AlertCircle, Search, Calendar, ChevronDown, MessageCircle } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import Link from "next/link";
import toast from "react-hot-toast";

type SMSLog = {
  id: string;
  customerName: string;
  phoneNumber: string;
  invoiceNumber: string;
  message: string;
  status: "Pending" | "Sent" | "Failed";
  scheduledDate: any;
  createdAt: any;
  type: string;
};

export default function SMSTrackingPage() {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const fetchLogs = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(collection(db, "smsLogs"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SMSLog));
        
        // Sort descending
        data.sort((a, b) => {
          const timeA = a.scheduledDate?.toDate ? a.scheduledDate.toDate().getTime() : new Date(a.scheduledDate).getTime();
          const timeB = b.scheduledDate?.toDate ? b.scheduledDate.toDate().getTime() : new Date(b.scheduledDate).getTime();
          return timeB - timeA;
        });

        setLogs(data);
      } catch (error) {
        console.error("Failed to load SMS logs", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) fetchLogs();
      else setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSimulateSend = async (id: string) => {
    try {
      await updateDoc(doc(db, "smsLogs", id), {
        status: "Sent"
      });
      setLogs(logs.map(log => log.id === id ? { ...log, status: "Sent" } : log));
      toast.success("SMS marked as sent!");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          log.phoneNumber.includes(search) ||
                          log.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending": return <Clock size={14} className="text-amber-500" />;
      case "Sent": return <CheckCircle2 size={14} className="text-green-500" />;
      case "Failed": return <AlertCircle size={14} className="text-red-500" />;
      default: return <Clock size={14} className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending": return "bg-amber-50 text-amber-600 border border-amber-200/50";
      case "Sent": return "bg-green-50 text-green-600 border border-green-200/50";
      case "Failed": return "bg-red-50 text-red-600 border border-red-200/50";
      default: return "bg-gray-50 text-gray-600 border border-gray-200/50";
    }
  };

  const formatDate = (dateObj: any) => {
    if (!dateObj) return "-";
    try {
      const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/automated-bills" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Automated Bills SMS Tracking</h1>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Track and monitor your scheduled SMS broadcasts</p>
          </div>
        </div>
      </header>

      {/* WORKSPACE */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col space-y-4">
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search Party / Phone / Invoice" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 border border-gray-200 rounded text-xs w-64 focus:outline-none focus:border-indigo-500 bg-white shadow-sm font-semibold"
              />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none border border-gray-200 bg-white rounded px-3 py-2 pr-8 text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer w-40"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Sent">Sent</option>
                <option value="Failed">Failed</option>
              </select>
              <ChevronDown size={14} className="text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4 uppercase">Scheduled Date</th>
                  <th className="px-6 py-4 uppercase">Party Name</th>
                  <th className="px-6 py-4 uppercase">Phone Number</th>
                  <th className="px-6 py-4 uppercase">Invoice No.</th>
                  <th className="px-6 py-4 uppercase w-1/3">Message Content</th>
                  <th className="px-6 py-4 uppercase text-center">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">Loading tracking data...</td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-600 font-semibold">{formatDate(log.scheduledDate)}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{log.customerName}</td>
                      <td className="px-6 py-4 font-mono text-gray-600">{log.phoneNumber}</td>
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">#{log.invoiceNumber}</td>
                      <td className="px-6 py-4 text-gray-600 truncate max-w-xs" title={log.message}>
                        <div className="flex items-center gap-2">
                           <MessageCircle size={14} className="text-gray-400 shrink-0"/>
                           <span className="truncate">{log.message}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.status === "Pending" && (
                          <button 
                            onClick={() => handleSimulateSend(log.id)}
                            className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded hover:bg-indigo-100 uppercase tracking-wider transition-colors"
                          >
                            Mark Sent
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="mb-4 text-slate-300">
                           <MessageSquare size={64} className="stroke-[1]" />
                        </div>
                        <p className="text-xs text-gray-400 font-medium text-center">No SMS tracking records found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
