"use client";

import React, { useState } from "react";
import { Share2, Download, Gift, UserPlus, PhoneForwarded, Building2 } from "lucide-react";
import SettingsSidebar from "../SettingsSidebar";

export default function ReferAndEarnPage() {
  const [activeTab, setActiveTab] = useState<"signedUp" | "purchased">("signedUp");

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      
      {/* Shared Settings Sidebar */}
      <SettingsSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Refer & Earn</h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Banner */}
          <div className="relative bg-[#1A0B2E] rounded-xl p-8 overflow-hidden flex justify-between items-center text-white min-h-[160px]">
            {/* Background Decor */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-900/50 to-transparent"></div>
            
            <div className="relative z-10 space-y-4 max-w-xl">
              <h1 className="text-3xl font-extrabold tracking-tight">Earn ₹501 for each Referral</h1>
              <p className="text-sm font-medium text-gray-200">
                When your friend buys a plan, they'll get <span className="text-yellow-400 font-bold">flat 15% off</span> on the plan purchase
              </p>
              
              <div className="flex items-center gap-4 pt-2">
                <button className="bg-white text-[#1A0B2E] font-bold text-xs px-6 py-2.5 rounded hover:bg-gray-100 transition-colors shadow-sm">
                  Refer Now
                </button>
                <button className="flex items-center gap-2 text-white font-medium text-xs px-4 py-2.5 hover:bg-white/10 rounded transition-colors">
                  <PhoneForwarded size={14} />
                  Send Code to my device
                </button>
              </div>
            </div>
            
            {/* Abstract Graphic Replacement */}
            <div className="relative z-10 pr-8 hidden md:block">
              <Gift size={80} className="text-yellow-400 opacity-90 drop-shadow-lg" />
            </div>
          </div>

          {/* Rewards Earned */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Rewards Earned</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-xs">
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                  <div className="p-1 rounded bg-indigo-50"><Gift size={14} /></div>
                  <span className="text-xs font-semibold">Total Claimed</span>
                </div>
                <p className="text-lg font-bold text-gray-800">₹ 0.0</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-xs">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <div className="p-1 rounded bg-emerald-50"><Building2 size={14} /></div>
                  <span className="text-xs font-semibold">Ready to Withdraw</span>
                </div>
                <p className="text-lg font-bold text-gray-800">₹ 0.0</p>
              </div>
            </div>
          </div>

          {/* Tabs & Empty State */}
          <div className="space-y-6">
            <div className="flex items-center gap-6 border-b border-gray-200">
              <button 
                onClick={() => setActiveTab("signedUp")}
                className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "signedUp" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <UserPlus size={14} /> Signed Up
              </button>
              <button 
                onClick={() => setActiveTab("purchased")}
                className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "purchased" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <Gift size={14} /> Plan Purchased
              </button>
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                <UserPlus size={24} />
              </div>
              <p className="text-sm font-medium text-gray-500">No signed up users yet!</p>
              <button className="bg-indigo-600 text-white font-bold text-xs px-6 py-2 rounded hover:bg-indigo-700 transition-colors shadow-xs">
                Refer Now
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-800">How it works?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-6 flex flex-col items-center text-center space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <Share2 size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600 leading-relaxed max-w-[200px]">
                  1. Share the referral link with your friends
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 flex flex-col items-center text-center space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Download size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600 leading-relaxed max-w-[200px]">
                  2. Your friend download myBillBook and subscribe the plan
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 flex flex-col items-center text-center space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500">
                  <Gift size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600 leading-relaxed max-w-[200px]">
                  3. You earn ₹501, they get 15% discount
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
