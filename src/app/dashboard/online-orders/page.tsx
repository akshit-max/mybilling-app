"use client";

import React, { useState } from "react";
import { Mail, Search, ChevronDown, ReceiptText, Store } from "lucide-react";
import toast from "react-hot-toast";

export default function OnlineOrdersPage() {
  const [search, setSearch] = useState("");

  const handleComingSoon = () => {
    toast("Online store features coming soon!", { icon: "🚀" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Online Orders</h1>
        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 border border-gray-200 rounded hover:bg-gray-50">
          <Mail size={16} />
        </button>
      </header>

      {/* WORKSPACE */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col space-y-4">
        
        {/* Promotional Banner */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden">
          <div className="z-10 relative space-y-4">
            <h2 className="text-[15px] font-bold text-gray-800">
              Increase your sales, get <span className="text-orange-500">Online Orders</span> with a single click
            </h2>
            <button 
              onClick={handleComingSoon}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2 rounded text-sm transition-colors shadow-sm shadow-orange-200"
            >
              Create Online Store
            </button>
          </div>
          
          {/* Decorative Graphic */}
          <div className="absolute right-0 bottom-0 opacity-10 md:opacity-100 md:relative w-48 h-24 flex items-end justify-end pointer-events-none">
            <div className="w-40 h-20 bg-blue-50 border-2 border-slate-700 rounded-t-xl relative flex flex-col overflow-hidden">
               {/* Store awning */}
               <div className="flex w-full h-4">
                 <div className="flex-1 bg-red-400"></div>
                 <div className="flex-1 bg-white"></div>
                 <div className="flex-1 bg-red-400"></div>
                 <div className="flex-1 bg-white"></div>
                 <div className="flex-1 bg-red-400"></div>
               </div>
               {/* Store body */}
               <div className="flex-1 flex items-center justify-center bg-white relative">
                  <div className="w-20 h-10 border-2 border-slate-700 rounded flex items-center justify-center bg-gray-50">
                     <Store size={20} className="text-slate-400" />
                  </div>
                  <div className="absolute bottom-0 right-2 w-8 h-8 bg-blue-100 border-2 border-slate-700 border-b-0 rounded-t flex items-center justify-center">
                     <div className="w-4 h-4 bg-slate-700 rounded-sm"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-56 focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50">
            <span className="text-xs font-semibold text-gray-700">Last 365 Days</span>
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
                  <th className="px-6 py-3">Quotation Number</th>
                  <th className="px-6 py-3">Party Name</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Mode of Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Empty State exactly matching the screenshot */}
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="flex flex-col items-center justify-center py-24 bg-white">
                      <div className="mb-4 text-slate-300">
                         <ReceiptText size={64} className="stroke-[1.5]" />
                      </div>
                      <p className="text-xs text-gray-400 font-medium text-center">No Transactions Matching the current filter</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
