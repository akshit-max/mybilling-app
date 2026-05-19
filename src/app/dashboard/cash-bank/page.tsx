"use client";

import React, { useState } from "react";
import { Plus, ArrowRightLeft, Download, Building2, Calendar, FileText, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

export default function CashAndBankPage() {
  const [dateFilter, setDateFilter] = useState("Last 30 Days");

  const handleComingSoon = () => {
    toast("This feature is coming soon!", { icon: "🚀" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Cash and Bank</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleComingSoon} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 font-semibold shadow-sm transition-colors">
            <Plus size={13} className="text-gray-500" />
            <span>Add/Reduce Money</span>
          </button>
          <button onClick={handleComingSoon} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 font-semibold shadow-sm transition-colors">
            <ArrowRightLeft size={13} className="text-gray-500" />
            <span>Transfer Money</span>
          </button>
          <button onClick={handleComingSoon} className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 border border-indigo-600 px-4 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-colors">
            <Plus size={14} />
            <span>Add New Account</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT SPLIT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT PANEL - BALANCES */}
        <div className="w-full lg:w-[340px] space-y-6 shrink-0">
          
          {/* Total & Cash */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Total Balance:</span>
              <span className="text-sm font-bold text-gray-900">₹ 1,289</span>
            </div>
            
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cash</span>
            </div>
            
            <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
              <span className="text-sm font-semibold text-gray-700">Cash in hand</span>
              <span className="text-sm font-bold text-gray-900">₹ 1,289</span>
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bank Accounts</span>
              <button onClick={handleComingSoon} className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                <Plus size={10} /> Add New Bank
              </button>
            </div>
            
            <div className="px-4 py-3 flex items-center justify-between bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-indigo-400" />
                <span className="text-sm font-semibold text-gray-700">Unlinked Transactions</span>
              </div>
              <span className="text-sm font-bold text-gray-900">₹ 0</span>
            </div>
          </div>
          
        </div>

        {/* RIGHT PANEL - TRANSACTIONS */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          
          {/* Tabs */}
          <div className="border-b border-gray-200 px-2 flex">
            <button className="px-6 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600">
              Transactions
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <div className="relative">
              <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">{dateFilter}</span>
                <ChevronDown size={14} className="text-gray-400 ml-2" />
              </div>
            </div>
            <button onClick={handleComingSoon} className="p-2 border border-gray-200 rounded hover:bg-gray-50 text-gray-400">
              <Download size={14} />
            </button>
          </div>

          {/* Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px]">
            <div className="w-24 h-24 mb-4 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-50 rounded-full opacity-50"></div>
              <FileText size={48} className="text-slate-300 relative z-10 stroke-[1.5]" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                <div className="w-6 h-6 border-2 border-slate-300 rounded-full flex items-center justify-center">
                  <div className="w-3 h-0.5 bg-slate-300"></div>
                </div>
              </div>
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">No Transactions</h3>
            <p className="text-xs text-gray-400 font-medium text-center">You don't have any transaction in selected period</p>
          </div>

        </div>

      </main>
    </div>
  );
}
