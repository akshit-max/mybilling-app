"use client";

import React from "react";
import { PackageSearch } from "lucide-react";

export default function GodownPage() {
  return (
    <div className="flex flex-col bg-white min-h-[85vh] border border-gray-200 rounded-lg shadow-sm font-sans">
      
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center px-6 shrink-0 shadow-xs">
        <h2 className="text-sm font-bold text-gray-800">Godown Management</h2>
      </div>

      {/* Main Content (Empty State) */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
        
        {/* CSS Abstract Illustration of Warehouse */}
        <div className="relative w-72 h-40 mb-8 flex items-end justify-center">
          {/* Main Warehouse Building */}
          <div className="w-56 h-32 bg-[#e2e8f0] rounded-t-lg border-2 border-gray-300 relative overflow-hidden flex flex-col justify-end items-center pb-2">
            <div className="absolute top-2 w-full text-center text-gray-400 font-bold tracking-widest text-lg opacity-50">GODOWN</div>
            {/* Garage Door */}
            <div className="w-24 h-20 bg-gray-400/20 border-t-2 border-l-2 border-r-2 border-gray-300 flex flex-col justify-evenly px-2">
              <div className="h-0.5 bg-gray-300 w-full"></div>
              <div className="h-0.5 bg-gray-300 w-full"></div>
              <div className="h-0.5 bg-gray-300 w-full"></div>
              <div className="h-0.5 bg-gray-300 w-full"></div>
            </div>
          </div>
          
          {/* Stacked Boxes Left */}
          <div className="absolute left-4 bottom-0 flex flex-col items-center">
            <div className="w-10 h-10 bg-amber-400/80 border-2 border-amber-500 rounded-sm relative overflow-hidden">
               <div className="absolute -inset-2 border border-amber-300/50 rotate-45"></div>
            </div>
            <div className="flex gap-0.5 mt-0.5">
              <div className="w-10 h-10 bg-amber-500/80 border-2 border-amber-600 rounded-sm"></div>
              <div className="w-10 h-10 bg-amber-400/80 border-2 border-amber-500 rounded-sm"></div>
            </div>
          </div>

          {/* Abstract Worker / Forklift right */}
          <div className="absolute right-8 bottom-0 flex items-end gap-1">
            <div className="w-8 h-12 bg-blue-600/80 rounded flex flex-col items-center justify-end pb-1 border border-blue-700">
               <div className="w-3 h-3 bg-yellow-400 rounded-full mb-1"></div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="w-12 h-8 bg-amber-300/80 border-2 border-amber-400 rounded-sm"></div>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-3">Start managing multiple Godowns!</h3>
        <p className="text-xs font-medium text-gray-500 max-w-lg mb-8 leading-relaxed">
          You can easily monitor and track your inventory across various Godowns and Store locations
        </p>
        <button className="px-8 py-2.5 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700 shadow-md transition-colors">
          Enable Godown
        </button>
      </div>

    </div>
  );
}
