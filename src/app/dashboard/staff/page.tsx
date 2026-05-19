"use client";

import React from "react";
import { CalendarCheck2, FileSpreadsheet, BellRing } from "lucide-react";
import toast from "react-hot-toast";

export default function StaffPage() {
  const handleComingSoon = () => {
    toast("Staff management is coming soon!", { icon: "🚀" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Staff Attendance & Payroll</h1>
      </header>

      {/* ONBOARDING CONTENT */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-12 flex flex-col items-center justify-center">
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
          
          {/* Card 1 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="mb-10 flex-1 flex items-center justify-center">
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center relative shadow-inner border border-amber-100">
                 <CalendarCheck2 size={40} className="text-amber-600 stroke-[1.5]" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-gray-700 leading-relaxed uppercase tracking-wider px-2">
                Mark your staff's attendance digitally
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="mb-10 flex-1 flex items-center justify-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center relative shadow-inner border border-indigo-100">
                 <FileSpreadsheet size={40} className="text-indigo-600 stroke-[1.5]" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-gray-700 leading-relaxed uppercase tracking-wider px-2">
                Simplify payroll by adding salary, advance & pending payments
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="mb-10 flex-1 flex items-center justify-center">
              <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center relative shadow-inner border border-orange-100">
                 <BellRing size={40} className="text-orange-500 stroke-[1.5]" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-gray-700 leading-relaxed uppercase tracking-wider px-2">
                Set custom reminders to mark attendance timely
              </p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 mt-2">
          <h2 className="text-xl font-bold text-gray-900">
            Mark attendance and manage payroll
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Add staff to Mark attendance and manage payroll with ease!
          </p>
          <button 
            onClick={handleComingSoon}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2.5 rounded text-sm transition-colors shadow-sm"
          >
            + Add Staff
          </button>
        </div>

      </main>
    </div>
  );
}
