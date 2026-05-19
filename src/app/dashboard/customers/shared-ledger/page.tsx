"use client";

import React, { useState } from "react";
import { Search, Settings, PlayCircle, Gift } from "lucide-react";

export default function SharedLedgerPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      
      {/* LEFT COLUMN: List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-800">SharedLedger</h2>
            <button className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold uppercase hover:bg-blue-100 transition-colors">
              <PlayCircle size={12} />
              How it Works?
            </button>
          </div>
          <button className="p-1.5 text-gray-400 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            <Settings size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by Party Name or Number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-8 text-center flex items-center justify-center">
          <p className="text-xs font-semibold text-gray-400">No SharedLedgers Found</p>
        </div>
      </div>

      {/* RIGHT COLUMN: Details / Empty State */}
      <div className="flex-1 flex flex-col bg-[#fafafc] items-center justify-center p-8 text-center">
        
        {/* Empty State Illustration (CSS abstract representation) */}
        <div className="relative w-64 h-32 mb-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center px-4 gap-3 opacity-50 translate-y-2">
             <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center text-orange-500"><Gift size={10} /></div>
             <div className="flex-1 space-y-2"><div className="h-2 bg-gray-100 rounded w-full"></div><div className="h-2 bg-gray-100 rounded w-1/2"></div></div>
          </div>
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-56 h-14 bg-white rounded-lg border border-gray-200 shadow-md flex items-center px-4 gap-3 z-10">
             <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center text-orange-500"><Gift size={12} /></div>
             <div className="flex-1 space-y-2"><div className="h-2.5 bg-gray-200 rounded w-full"></div><div className="h-2.5 bg-gray-100 rounded w-2/3"></div></div>
          </div>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-12 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center px-4 gap-3 opacity-50 -translate-y-2">
             <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center text-orange-500"><Gift size={10} /></div>
             <div className="flex-1 space-y-2"><div className="h-2 bg-gray-100 rounded w-full"></div><div className="h-2 bg-gray-100 rounded w-1/2"></div></div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-800 mb-3">No SharedLedgers Found</h3>
        <p className="text-sm font-medium text-gray-500 max-w-sm mb-6 leading-relaxed">
          Ask your parties to join myBillBook — once they record transactions, their SharedLedgers will appear here.
        </p>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-indigo-200 text-indigo-600 rounded shadow-sm hover:bg-indigo-50 font-bold text-xs transition-colors">
          <Gift size={14} />
          Refer Now
        </button>
      </div>

    </div>
  );
}
