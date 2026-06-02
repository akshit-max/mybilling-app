"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronDown, Plus, FileText, Download } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type PaymentIn = {
  id: string;
  paymentNumber: string;
  partyName: string;
  paymentDate: string;
  paymentMode: string;
  amountReceived: number;
  totalSettled: number;
  createdAt?: any;
};

export default function PaymentInPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("365");

  const fetchPayments = async (userId: string) => {
    try {
      setLoading(true);
      
      const q = query(
        collection(db, "paymentIn"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          paymentNumber: d.paymentNumber || "",
          partyName: d.partyName || "Unknown",
          paymentDate: d.paymentDate || "",
          paymentMode: d.paymentMode || "Cash",
          amountReceived: Number(d.amountReceived || 0),
          totalSettled: Number(d.totalSettled || 0),
          createdAt: d.createdAt,
        };
      });

      // Sort locally by createdAt desc to avoid composite index requirement
      data.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });

      setPayments(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payment records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPayments(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredPayments = payments.filter((p) => {
    if (search && !p.partyName.toLowerCase().includes(search.toLowerCase()) && !p.paymentNumber.toLowerCase().includes(search.toLowerCase())) return false;
    // Basic date filter dummy logic for 365 days
    return true;
  });

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return toast.error("No payments to export");
    
    let tableHTML = `
      <table border="1">
        <thead>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <th>Date</th>
            <th>Payment Number</th>
            <th>Party Name</th>
            <th>Total Amount Settled (INR)</th>
            <th>Amount Received (INR)</th>
            <th>Payment Mode</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredPayments.forEach(p => {
      tableHTML += `
        <tr>
          <td>${p.paymentDate}</td>
          <td>${p.paymentNumber}</td>
          <td>${p.partyName}</td>
          <td>${p.totalSettled}</td>
          <td>${p.amountReceived}</td>
          <td>${p.paymentMode}</td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payment_In_Export_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Payment records exported successfully! ✅");
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col min-h-[calc(100vh-80px)]">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Payment In</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
          >
            <Download size={16} />
            Export
          </button>
          <Link
            href="/dashboard/payment-in/create"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus size={16} />
            Create Payment In
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col">
        {/* TABS */}
        <div className="flex items-center gap-6 px-4 border-b border-gray-100">
          <button className="px-1 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 p-1 rounded-full"><FileText size={14} /></span>
            Payment Received
          </button>
        </div>

        {/* CONTROLS */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative relative-w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search party or payment no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium text-gray-600 bg-white"
              />
            </div>

            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 appearance-none font-semibold text-gray-700 bg-white"
              >
                <option value="365">Last 365 Days</option>
                <option value="today">Today</option>
              </select>
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Payment Number</th>
                <th className="p-4 font-bold">Party Name</th>
                <th className="p-4 font-bold text-right">Total Amount Settled (₹)</th>
                <th className="p-4 font-bold text-right">Amount Received (₹)</th>
                <th className="p-4 font-bold text-center">Payment Mode</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FileText size={48} className="mb-4 text-gray-300 opacity-50" />
                      <p className="font-semibold text-gray-500">No Transactions Matching the current filter</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    className="border-b border-gray-50 hover:bg-indigo-50/30 transition cursor-pointer group"
                    onClick={() => router.push(`/dashboard/payment-in/${payment.id}`)}
                  >
                    <td className="p-4 text-gray-600 font-medium whitespace-nowrap">
                      {payment.paymentDate}
                    </td>
                    <td className="p-4 text-gray-900 font-semibold uppercase tracking-wide">
                      {payment.paymentNumber}
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {payment.partyName}
                    </td>
                    <td className="p-4 text-right font-bold text-gray-700">
                      ₹{payment.totalSettled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-bold text-brand-tertiary">
                      ₹{payment.amountReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-gray-100 text-gray-600">
                        {payment.paymentMode}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
