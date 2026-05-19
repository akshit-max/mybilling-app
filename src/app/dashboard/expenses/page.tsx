"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronDown, FileText, Settings, Plus, Receipt } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import toast from "react-hot-toast";

type Expense = {
  id: string;
  expenseNumber: string;
  date: string;
  partyName: string;
  category: string;
  amount: number;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchExpenses = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(
          collection(db, "expenses"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Expense[];
        setExpenses(data);
      } catch (err) {
        console.error("Error fetching expenses:", err);
      } finally {
        setLoading(false);
      }
    };

    // Firebase auth observer
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchExpenses();
      else setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredExpenses = expenses.filter(e => 
    (e.expenseNumber?.toLowerCase().includes(search.toLowerCase()) || "") ||
    (e.partyName?.toLowerCase().includes(search.toLowerCase()) || "")
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Expenses</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded hover:bg-indigo-50 font-semibold shadow-sm transition-colors">
            <FileText size={14} />
            <span>Reports</span>
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            <Settings size={16} />
          </button>
          <Link href="/dashboard/expenses/create" className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-colors">
            <span>Create Expense</span>
          </Link>
        </div>
      </header>

      {/* WORKSPACE */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col space-y-4">
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-48 focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50">
            <span className="text-xs font-semibold text-gray-700">Last 365 Days</span>
            <ChevronDown size={14} className="text-gray-400 ml-2" />
          </div>

          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50">
            <span className="text-xs font-semibold text-gray-700">All Expenses Categories</span>
            <ChevronDown size={14} className="text-gray-400 ml-2" />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 flex items-center gap-1">Date <ChevronDown size={12}/></th>
                  <th className="px-6 py-3">Expense Number</th>
                  <th className="px-6 py-3">Party Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100">Amount <ChevronDown size={12} className="inline ml-1"/></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td>
                  </tr>
                ) : filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-gray-600">{expense.date}</td>
                      <td className="px-6 py-3 text-indigo-600 font-semibold cursor-pointer hover:underline">{expense.expenseNumber}</td>
                      <td className="px-6 py-3 font-semibold text-gray-800">{expense.partyName || "-"}</td>
                      <td className="px-6 py-3 text-gray-600">{expense.category || "-"}</td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-gray-800">₹ {expense.amount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="mb-4 text-slate-300">
                           <Receipt size={64} className="stroke-[1]" />
                        </div>
                        <p className="text-xs text-gray-400 font-medium text-center">No Transactions Matching the current filter</p>
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
