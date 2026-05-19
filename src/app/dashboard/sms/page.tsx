"use client";

import React from "react";
import { MessageSquare, BarChart3, Smartphone, Tag, Gift, Sparkles, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";

export default function SMSMarketingPage() {
  const handleComingSoon = () => toast("SMS Campaigns coming soon!", { icon: "🚀" });

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">SMS Promotion</h1>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600">
            <ReceiptText size={18} />
          </button>
          <button onClick={handleComingSoon} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-1.5 rounded text-sm transition-colors shadow-sm">
            Create Campaign
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 max-w-[900px] w-full mx-auto p-12 flex flex-col items-center justify-center space-y-12">
        
        {/* Top Graphic & Title */}
        <div className="flex flex-col items-center text-center space-y-6">
          
          {/* Custom Illustration */}
          <div className="relative w-64 h-48 flex items-end justify-center select-none">
             {/* Chart bars */}
             <div className="absolute bottom-0 left-4 flex items-end gap-2 opacity-20">
                <div className="w-8 h-12 bg-blue-500 rounded-t-sm"></div>
                <div className="w-8 h-20 bg-blue-500 rounded-t-sm"></div>
                <div className="w-8 h-32 bg-blue-500 rounded-t-sm"></div>
                <div className="w-8 h-40 bg-blue-500 rounded-t-sm"></div>
             </div>
             {/* Trend line */}
             <div className="absolute bottom-12 left-0 right-16 h-32 border-l-4 border-t-4 border-blue-300 rounded-tl-xl transform -skew-y-12 opacity-50"></div>
             
             {/* Phone */}
             <div className="relative z-10 w-32 h-40 bg-white border-2 border-slate-300 rounded-xl shadow-md p-2 flex flex-col">
                <div className="w-1/3 h-1 bg-slate-200 rounded-full mx-auto mb-2"></div>
                <div className="flex-1 border border-slate-100 rounded bg-gray-50 flex flex-col p-2 space-y-2">
                   <div className="w-full bg-indigo-100 rounded p-1.5 text-[6px] text-indigo-800 font-medium ml-auto shadow-sm">
                      New Year Sale is Live! Flat 50% off on all items. Hurry Now!!
                   </div>
                   <div className="w-3/4 bg-slate-200 rounded p-1.5 text-[6px] text-slate-500 mr-auto">
                      Thank you!
                   </div>
                </div>
             </div>

             {/* Floating bubbles */}
             <div className="absolute top-12 right-0 bg-orange-100 text-orange-600 text-[8px] font-bold px-2 py-1 rounded shadow-sm border border-orange-200">
               Holi Sale
             </div>
             <div className="absolute top-24 right-4 bg-teal-100 text-teal-700 text-[8px] font-bold px-2 py-1 rounded shadow-sm border border-teal-200">
               Diwali Sale
             </div>
             <div className="absolute top-36 -right-4 bg-rose-100 text-rose-600 text-[8px] font-bold px-2 py-1 rounded shadow-sm border border-rose-200">
               50% Discount
             </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800">Grow Your Business through SMS Promotions</h2>
            <p className="text-xs text-gray-500 mt-2 max-w-xl mx-auto leading-relaxed">
              Want to share festival sale and discount offer with your customer? Start an SMS campaign today with myBillBook and make your sale a success
            </p>
          </div>
        </div>

        {/* Promo Cards */}
        <div className="w-full flex flex-col gap-4">
          
          {/* Blue Card */}
          <div className="bg-sky-500 rounded-lg p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="z-10 text-white space-y-3">
              <h3 className="font-bold text-base">Share festival offer with Your customer</h3>
              <p className="text-xs text-sky-100">Increase your sale this festival season with our Festival SMS Campaign</p>
              <button onClick={handleComingSoon} className="mt-2 bg-white text-sky-600 font-bold px-4 py-1.5 rounded text-xs shadow-sm hover:bg-sky-50 transition-colors">
                Select Template
              </button>
            </div>
            {/* Graphics */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-8 gap-2 opacity-90">
               <div className="w-12 h-12 bg-rose-400 rounded-lg shadow-sm flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform">
                  <Gift className="text-white" size={24} />
               </div>
               <div className="w-12 h-12 bg-amber-400 rounded-lg shadow-sm flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform">
                  <Sparkles className="text-white" size={24} />
               </div>
            </div>
          </div>

          {/* Orange Card */}
          <div className="bg-[#E67E4D] rounded-lg p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="z-10 text-white space-y-3">
              <h3 className="font-bold text-base">Share discount Your customer will love</h3>
              <p className="text-xs text-orange-100">Share discount offers with your customers and watch your business grow</p>
              <button onClick={handleComingSoon} className="mt-2 bg-white text-orange-600 font-bold px-4 py-1.5 rounded text-xs shadow-sm hover:bg-orange-50 transition-colors">
                Select Template
              </button>
            </div>
            {/* Graphics */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-xl shadow-lg rotate-12 group-hover:rotate-6 transition-transform flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
               <div className="w-3 h-3 bg-gray-200 rounded-full absolute -top-1.5"></div>
               <span className="font-black text-2xl text-gray-800">50%</span>
               <span className="font-bold text-sm text-gray-500">OFF</span>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
