"use client";

import React from "react";
import { PlayCircle, Clock, CalendarDays, BellRing } from "lucide-react";
import toast from "react-hot-toast";

export default function AutomatedBillsPage() {
  const handleComingSoon = () => {
    toast("Automated Bills feature is coming soon!", { icon: "🚀" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">Automated Bills</h1>
          <button className="flex items-center gap-1.5 text-[11px] text-blue-500 border border-blue-200 bg-blue-50/50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors font-bold uppercase tracking-wider">
            <PlayCircle size={14} />
            <span>What is Automated Bills</span>
          </button>
        </div>
      </header>

      {/* ONBOARDING CONTENT */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-12 flex flex-col items-center justify-center">
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
          
          {/* Card 1 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="mb-10 relative flex-1 flex items-center justify-center">
              <div className="w-32 h-32 bg-sky-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
                 <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
                 <Clock size={48} className="text-slate-700 stroke-[1.5]" />
              </div>
              <div className="w-36 h-2 bg-sky-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-sm font-bold text-gray-800">Creating repeated bills?</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Automate sending of repeat bills based on a schedule of your choice
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="mb-10 relative flex-1 flex items-center justify-center">
              <div className="w-32 h-32 bg-indigo-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
                 <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
                 <CalendarDays size={48} className="text-slate-700 stroke-[1.5]" />
              </div>
              <div className="w-36 h-2 bg-indigo-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-sm font-bold text-gray-800">Automated Billing</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Send SMS reminders to customers daily/weekly/monthly
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="mb-10 relative flex-1 flex items-center justify-center">
              <div className="w-32 h-32 bg-orange-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
                 <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
                 <BellRing size={48} className="text-slate-700 stroke-[1.5]" />
              </div>
              <div className="w-36 h-2 bg-orange-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-sm font-bold text-gray-800">Easy Reminders & Payment</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Automatically receive notifications and collect payments
              </p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-6 mt-4">
          <p className="text-sm text-gray-500 font-medium">
            Schedule your repeated bills hassle-free
          </p>
          <button 
            onClick={handleComingSoon}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2.5 rounded text-sm transition-colors shadow-sm"
          >
            Create Automated Bill
          </button>
        </div>

      </main>
    </div>
  );
}
