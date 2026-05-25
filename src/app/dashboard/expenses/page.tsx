"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, FileText, Settings, Plus, Receipt, HelpCircle, Calendar, MoreVertical, Edit2, Trash2 } from "lucide-react";
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
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [fiscalYearFilter, setFiscalYearFilter] = useState<"current" | "all">("all");
  const [showFiscalYearDropdown, setShowFiscalYearDropdown] = useState(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(
          collection(db, "expenses"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Expense[];
        
        // Sort descending by createdAt or date
        data.sort((a: any, b: any) => {
           const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.date).getTime();
           const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.date).getTime();
           return timeB - timeA;
        });

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

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = 
      (e.expenseNumber?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (e.partyName?.toLowerCase().includes(search.toLowerCase()) || false);
    
    const matchesCategory = filterCategory ? e.category === filterCategory : true;
    
    let matchesDate = true;
    if (fiscalYearFilter === "current") {
      const now = new Date();
      // Indian Fiscal Year starts April 1st
      const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const startDate = new Date(startYear, 3, 1); // Apr 1
      const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59); // Mar 31 next year
      const expenseDate = new Date(e.date);
      matchesDate = expenseDate >= startDate && expenseDate <= endDate;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Expenses</h1>
        <div className="flex items-center gap-3 relative">
          <button 
            onClick={() => setActiveMenuId(activeMenuId === 'reports' ? null : 'reports')}
            className="flex items-center gap-1.5 text-xs text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded hover:bg-indigo-50 font-semibold shadow-sm transition-colors"
          >
            <FileText size={14} />
            <span>Reports</span>
            <ChevronDown size={12} className="ml-0.5" />
          </button>
          
          {activeMenuId === 'reports' && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
              <div className="absolute right-32 top-10 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 flex flex-col text-left">
                <Link 
                  href="/dashboard/reports/expense-transaction-report"
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  Expense Transactions
                </Link>
                <Link 
                  href="/dashboard/reports/expense-category-report"
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  Expense Category
                </Link>
              </div>
            </>
          )}

          <button className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            <Settings size={16} />
          </button>
          <Link href="/dashboard/expenses/create" className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-2 rounded hover:bg-indigo-700 font-bold shadow-sm transition-colors">
            <Plus size={14} />
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
              placeholder="Search Expense/Party" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-200 rounded text-xs w-56 focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
            />
          </div>
          
          <div className="relative">
            <div 
              onClick={() => setShowFiscalYearDropdown(!showFiscalYearDropdown)}
              className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-2 cursor-pointer hover:bg-gray-50 shadow-sm"
            >
              <span className="text-xs font-semibold text-gray-700">
                {fiscalYearFilter === "current" ? "Current Fiscal Year" : "All Time"}
              </span>
              <Calendar size={14} className="text-gray-400 ml-2" />
            </div>
            
            {showFiscalYearDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFiscalYearDropdown(false)}></div>
                <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 text-left">
                  <button 
                    onClick={() => { setFiscalYearFilter("all"); setShowFiscalYearDropdown(false); }}
                    className={`w-full px-4 py-2 text-xs font-semibold text-left transition-colors ${fiscalYearFilter === "all" ? "bg-indigo-50 text-indigo-600" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    All Time
                  </button>
                  <button 
                    onClick={() => { setFiscalYearFilter("current"); setShowFiscalYearDropdown(false); }}
                    className={`w-full px-4 py-2 text-xs font-semibold text-left transition-colors ${fiscalYearFilter === "current" ? "bg-indigo-50 text-indigo-600" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    Current Fiscal Year
                  </button>
                </div>
              </>
            )}
          </div>

          <button className="text-gray-400 hover:text-indigo-600 transition">
            <HelpCircle size={16} />
          </button>

          <div className="relative ml-auto">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none border border-gray-200 bg-white rounded px-3 py-2 pr-8 text-xs font-semibold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="">All Expense Categories</option>
              <option value="Printing and Stationery">Printing and Stationery</option>
              <option value="Employee Salaries & Advances">Employee Salaries & Advances</option>
              <option value="Family Expenses">Family Expenses</option>
              <option value="Telephone & Internet Expense">Telephone & Internet Expense</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Travel">Travel</option>
              <option value="Meals & Entertainment">Meals & Entertainment</option>
              <option value="Rent">Rent</option>
            </select>
            <ChevronDown size={14} className="text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 flex items-center gap-1 uppercase">Date <ChevronDown size={12}/></th>
                  <th className="px-6 py-4 uppercase">Expense Number</th>
                  <th className="px-6 py-4 uppercase">Party Name</th>
                  <th className="px-6 py-4 uppercase">Category</th>
                  <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 uppercase">Amount <ChevronDown size={12} className="inline ml-1"/></th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td>
                  </tr>
                ) : filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-600">{formatDate(expense.date)}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800 mb-1">{expense.expenseNumber}</div>
                        <button 
                          onClick={() => router.push(`/dashboard/expenses/${expense.id}`)}
                          className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-semibold transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{expense.partyName || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium border border-gray-200 text-[10px]">
                          {expense.category || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-800">₹{expense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === expense.id ? null : expense.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeMenuId === expense.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                            <div className="absolute right-6 top-10 w-36 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 flex flex-col text-left">
                              <button 
                                onClick={() => router.push(`/dashboard/expenses/edit/${expense.id}`)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 size={12} />
                                Edit Expense
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-0">
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
