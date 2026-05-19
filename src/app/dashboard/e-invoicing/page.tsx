"use client";

import React from "react";
import { PlayCircle, MessageCircle, FileCode2, Truck, LineChart } from "lucide-react";
import toast from "react-hot-toast";

export default function EInvoicingPage() {
  const handleComingSoon = () => {
    toast("E-Invoicing feature is coming soon!", { icon: "🚀" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">e-Invoicing</h1>
          <button className="flex items-center gap-1.5 text-[11px] text-blue-500 border border-blue-200 bg-blue-50/50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors font-bold uppercase tracking-wider">
            <PlayCircle size={14} />
            <span>What is e-Invoicing</span>
          </button>
        </div>
        <div>
          <button className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 px-4 py-1.5 rounded hover:bg-blue-100 font-bold uppercase tracking-wider transition-colors">
            <MessageCircle size={14} />
            <span>Chat Support</span>
          </button>
        </div>
      </header>

      {/* ONBOARDING CONTENT */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-12 flex flex-col items-center justify-center">
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
          
          {/* Card 1 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center justify-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-10 relative">
              <div className="w-32 h-32 bg-teal-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
                 <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
                 <FileCode2 size={48} className="text-slate-700 stroke-[1.5]" />
              </div>
              <div className="w-36 h-2 bg-teal-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
            </div>
            <p className="text-xs font-bold text-gray-700 text-center uppercase tracking-wider">
              Automatic e-invoice generation
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center justify-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-10 relative">
              <div className="w-32 h-32 bg-amber-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
                 <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
                 <Truck size={48} className="text-slate-700 stroke-[1.5]" />
              </div>
              <div className="w-36 h-2 bg-amber-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
            </div>
            <p className="text-xs font-bold text-gray-700 text-center uppercase tracking-wider">
              Hassle e-way bill generation using IRN
            </p>
          </div>

          {/* Card 3 */}
          <div className="border border-gray-200 rounded-lg flex flex-col items-center justify-center pt-16 pb-12 px-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-10 relative">
              <div className="w-32 h-32 bg-rose-50 rounded-lg border-2 border-slate-700 flex items-center justify-center relative z-10 bg-white">
                 <div className="w-full h-4 bg-slate-100 absolute top-0 border-b-2 border-slate-700"></div>
                 <LineChart size={48} className="text-slate-700 stroke-[1.5]" />
              </div>
              <div className="w-36 h-2 bg-rose-400 absolute -bottom-2 -left-2 z-0 border-2 border-slate-700 rounded-sm"></div>
            </div>
            <p className="text-xs font-bold text-gray-700 text-center uppercase tracking-wider">
              Easy GSTR1 reconciliation
            </p>
          </div>

        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-6 mt-4">
          <p className="text-xl font-medium text-gray-800">
            Try India's easiest and fastest e-invoicing solution today
          </p>
          <button 
            onClick={handleComingSoon}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded text-sm transition-colors shadow-md"
          >
            Start Generating e-Invoices
          </button>
        </div>

      </main>
    </div>
  );
}
