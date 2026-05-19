"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, PlayCircle, Settings, X, Plus, Search, PackageOpen, Maximize, Edit3, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

export default function POSBillingPage() {
  const handleComingSoon = () => toast("POS Actions coming soon!", { icon: "🚀" });

  return (
    <div className="h-[calc(100vh-60px)] bg-white flex flex-col font-sans overflow-hidden">
      
      {/* TOP HEADER */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
          <ChevronLeft size={14} /> Exit POS <span className="text-gray-400 font-normal ml-1">[CTRL + ESC]</span>
        </Link>
        <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">POS Billing</div>
        <div className="flex items-center gap-2">
          <button onClick={handleComingSoon} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 border border-blue-200 bg-blue-50/50 px-3 py-1 rounded hover:bg-blue-100 transition-colors">
            <PlayCircle size={12} /> Watch how to use POS Billing
          </button>
          <button onClick={handleComingSoon} className="flex items-center gap-1 text-[11px] font-bold text-gray-600 border border-gray-200 px-3 py-1 rounded hover:bg-gray-50 transition-colors">
            Settings <span className="text-gray-400 font-normal ml-1">[CTRL + S]</span>
          </button>
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="flex items-center px-4 pt-2 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 border-b-0 rounded-t-lg px-4 py-2">
          <span className="text-xs font-bold text-gray-800">Billing Screen 1 <span className="text-gray-400 font-normal ml-1">[CTRL + 1]</span></span>
          <button className="text-gray-400 hover:text-gray-800 ml-2"><X size={14} /></button>
        </div>
        <button onClick={handleComingSoon} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 px-4 py-2 hover:bg-indigo-50 rounded-t-lg transition-colors ml-2">
          <Plus size={12} /> Hold Bill & Create Another <span className="text-indigo-400 font-normal ml-1">[CTRL + D]</span>
        </button>
      </div>

      {/* MAIN POS WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT COLUMN - ITEM ENTRY */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          
          {/* Action Toolbar */}
          <div className="flex items-center gap-2 p-3 border-b border-gray-100">
            <button onClick={handleComingSoon} className="flex items-center gap-1 text-[10px] font-bold text-gray-700 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
              <Plus size={10} /> New Item <span className="text-gray-400 ml-1">[CTRL + I]</span>
            </button>
            <button onClick={handleComingSoon} className="flex items-center gap-1 text-[10px] font-bold text-gray-700 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
              Change Price <span className="text-gray-400 ml-1">[P]</span>
            </button>
            <button onClick={handleComingSoon} className="flex items-center gap-1 text-[10px] font-bold text-gray-700 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
              Change QTY <span className="text-gray-400 ml-1">[Q]</span>
            </button>
            <button onClick={handleComingSoon} className="flex items-center gap-1 text-[10px] font-bold text-gray-700 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
              Change Discount <span className="text-gray-400 ml-1">[D]</span>
            </button>
            <button onClick={handleComingSoon} className="flex items-center gap-1 text-[10px] font-bold text-red-600 border border-red-200 bg-red-50/50 px-2 py-1 rounded hover:bg-red-100 ml-auto">
              Delete Item <span className="text-red-400 ml-1">[DEL]</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200 flex items-stretch">
            <div className="flex items-center gap-1 px-3 border border-r-0 border-gray-200 rounded-l bg-gray-50 text-[11px] font-bold text-gray-600 cursor-pointer">
              Category <ChevronDown size={12} />
            </div>
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field / Category or Scan Barcode"
                className="w-full border border-gray-200 rounded-r py-2 pl-3 pr-10 text-xs focus:outline-none focus:border-indigo-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded bg-gray-50">
                F1
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="flex border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase bg-gray-50">
            <div className="w-12 px-3 py-2 border-r border-gray-200">NO</div>
            <div className="flex-1 px-3 py-2 border-r border-gray-200">ITEMS</div>
            <div className="w-24 px-3 py-2 border-r border-gray-200">ITEM CODE</div>
            <div className="w-24 px-3 py-2 border-r border-gray-200 text-right">MRP</div>
            <div className="w-24 px-3 py-2 border-r border-gray-200 text-right">SP (₹)</div>
            <div className="w-20 px-3 py-2 border-r border-gray-200 text-right">DISC (%)</div>
            <div className="w-20 px-3 py-2 border-r border-gray-200 text-right">QUANTITY</div>
            <div className="w-28 px-3 py-2 text-right">AMOUNT (₹)</div>
          </div>

          {/* Table Body (Empty State) */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/30">
            <PackageOpen size={48} className="text-gray-300 stroke-[1.5] mb-4" />
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <p className="text-sm font-medium flex items-center gap-2">
                <Search size={16} /> Add items by searching item name or item code
              </p>
              <p className="text-xs">Or</p>
              <p className="text-sm font-medium flex items-center gap-2">
                <Maximize size={16} /> Simply scan barcode to add items
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - BILLING DETAILS */}
        <div className="w-[360px] flex flex-col bg-gray-50/30 shrink-0">
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Top Inputs */}
            <div className="flex gap-2">
               <div className="flex-1 relative">
                 <input type="text" placeholder="Add Discount" className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
                 <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-300">[F2]</span>
               </div>
               <div className="flex-1 relative">
                 <input type="text" placeholder="Add Additional Charge" className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
                 <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-300">[F3]</span>
               </div>
            </div>

            {/* Bill Details Block */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
               <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bill details</span>
               </div>
               <div className="p-4 space-y-3">
                 <div className="flex justify-between text-xs font-semibold text-gray-500">
                   <span>Sub Total</span>
                   <span>₹ 0</span>
                 </div>
                 <div className="flex justify-between text-xs font-semibold text-gray-500">
                   <span>Tax</span>
                   <span>₹ 0</span>
                 </div>
               </div>
               <div className="bg-emerald-50/50 px-4 py-3 border-t border-emerald-100 flex justify-between items-center">
                 <span className="text-sm font-bold text-emerald-800">Total Amount</span>
                 <span className="text-lg font-bold text-emerald-700 font-mono">₹ 0</span>
               </div>
            </div>

            {/* Received Amount Block */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
               <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Received Amount</span>
                 <span className="text-[9px] font-bold text-gray-300">[F4]</span>
               </div>
               <div className="p-3">
                 <div className="flex border border-gray-200 rounded overflow-hidden">
                   <div className="flex-1 flex items-center px-3 border-r border-gray-200 bg-gray-50">
                     <span className="text-gray-500 font-bold mr-2">₹</span>
                     <input type="text" placeholder="0" className="w-full bg-transparent text-sm font-bold text-gray-800 focus:outline-none" />
                   </div>
                   <div className="w-24 px-2 py-1.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 bg-white">
                     <span className="text-xs font-semibold text-gray-600">Cash</span>
                     <ChevronDown size={12} className="text-gray-400" />
                   </div>
                 </div>
               </div>
            </div>

            {/* Customer Details Block */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
               <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer Details</span>
                 <span className="text-[9px] font-bold text-gray-300">[F5]</span>
               </div>
               <div className="px-4 py-3 flex justify-between items-center group cursor-pointer hover:bg-gray-50">
                 <span className="text-sm font-semibold text-gray-700">Cash Sale</span>
                 <Edit3 size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
               </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-200 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={handleComingSoon} className="flex-1 border border-indigo-200 text-indigo-600 font-bold text-xs py-3 rounded hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1">
              Save & Print <span className="text-[10px] font-normal opacity-70">[F6]</span>
            </button>
            <button onClick={handleComingSoon} className="flex-[1.5] bg-indigo-600 text-white font-bold text-sm py-3 rounded hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center gap-1">
              Save Bill <span className="text-[10px] font-normal opacity-70">[F7]</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
