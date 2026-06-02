"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Crown, Percent } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TrialExpiredModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"Diamond" | "Platinum" | "Enterprise">("Platinum");

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    router.push(`/dashboard/settings/pricing/checkout?plan=${selectedPlan}&cycle=Yearly`);
  };

  const handleViewPlans = () => {
    onClose();
    router.push('/dashboard/settings/pricing');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-in zoom-in-95 duration-200 flex flex-col font-sans">
        
        {/* Wavy/Gradient Header Area */}
        <div className="h-32 bg-gradient-to-br from-orange-50 via-orange-100/50 to-white rounded-t-2xl relative flex flex-col items-center justify-end pb-4 border-b border-orange-100/50">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-white/50 hover:bg-white rounded-full p-1.5 transition-colors">
            <X size={18} />
          </button>
          
          <div className="absolute -top-6 w-20 h-20 bg-brand-secondary rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            <AlertTriangle size={32} className="text-white" />
          </div>
          
          <div className="text-center mt-8">
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Your Free Trial has expired</h2>
            <p className="text-xs text-gray-600 mt-1">Upgrade plan to continue enjoying all the benefits</p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 md:p-8 pt-10 grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          
          {/* Diamond */}
          <div 
            onClick={() => setSelectedPlan("Diamond")}
            className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 relative group flex flex-col justify-between ${selectedPlan === "Diamond" ? "border-[#F16D31] shadow-md bg-brand-neutral/10" : "border-gray-200 hover:border-orange-300"}`}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-[#F16D31] flex items-center gap-1">
                   <Crown size={14} /> Diamond
                </span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan === "Diamond" ? "border-[#F16D31]" : "border-gray-300"}`}>
                   {selectedPlan === "Diamond" && <div className="w-2 h-2 bg-[#F16D31] rounded-full" />}
                </div>
              </div>
              
              <div className="mt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-gray-400 line-through">₹300</span>
                  <span className="text-lg font-black text-gray-900">₹217</span>
                  <span className="text-[10px] text-gray-500">/month</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Pay ₹2,599/year</p>
              </div>
            </div>
            
            {selectedPlan === "Diamond" && (
               <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                 <button onClick={handleUpgrade} className="w-full bg-[#F16D31] hover:bg-[#d95a23] text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors">
                   Upgrade
                 </button>
                 <button onClick={handleViewPlans} className="w-full text-[#F16D31] font-bold py-2 rounded-lg text-xs hover:bg-[#F16D31]/10 transition-colors">
                   View Plans
                 </button>
               </div>
            )}
          </div>

          {/* Platinum (Recommended) */}
          <div 
            onClick={() => setSelectedPlan("Platinum")}
            className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 relative shadow-lg flex flex-col justify-between ${selectedPlan === "Platinum" ? "border-indigo-600 bg-white scale-[1.02] z-10" : "border-indigo-300 bg-indigo-50/30"}`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm whitespace-nowrap">
              Recommended for you
            </div>
            
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-base font-bold text-indigo-700 flex items-center gap-1">
                   <Crown size={16} /> Platinum
                </span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan === "Platinum" ? "border-indigo-600" : "border-indigo-300"}`}>
                   {selectedPlan === "Platinum" && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                </div>
              </div>
              
              <div className="mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-400 line-through">₹500</span>
                  <span className="text-2xl font-black text-gray-900">₹250</span>
                  <span className="text-xs text-gray-500">/month</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Pay ₹2,999/year</p>
              </div>
            </div>

            {selectedPlan === "Platinum" && (
               <div className="mt-5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                 <button onClick={handleUpgrade} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors">
                   Upgrade
                 </button>
                 <button onClick={handleViewPlans} className="w-full text-indigo-600 font-bold py-2 rounded-lg text-xs hover:bg-indigo-50 transition-colors">
                   View Plans
                 </button>
               </div>
            )}
          </div>

          {/* Enterprise */}
          <div 
            onClick={() => setSelectedPlan("Enterprise")}
            className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 relative group flex flex-col justify-between ${selectedPlan === "Enterprise" ? "border-emerald-500 shadow-md bg-emerald-50/10" : "border-gray-200 hover:border-emerald-300"}`}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-brand-tertiary flex items-center gap-1">
                   <Crown size={14} /> Enterprise
                </span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan === "Enterprise" ? "border-emerald-500" : "border-gray-300"}`}>
                   {selectedPlan === "Enterprise" && <div className="w-2 h-2 bg-brand-tertiary rounded-full" />}
                </div>
              </div>
              
              <div className="mt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] text-gray-500">Starts @</span>
                  <span className="text-xs text-gray-400 line-through">₹750</span>
                  <span className="text-lg font-black text-gray-900">₹417</span>
                  <span className="text-[10px] text-gray-500">/month</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Pay ₹4,999/year</p>
              </div>
            </div>
            
            {selectedPlan === "Enterprise" && (
               <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                 <button onClick={handleUpgrade} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors">
                   Upgrade
                 </button>
                 <button onClick={handleViewPlans} className="w-full text-brand-tertiary font-bold py-2 rounded-lg text-xs hover:bg-emerald-50 transition-colors">
                   View Plans
                 </button>
               </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 rounded-b-2xl py-3 px-6 text-center flex items-center justify-center gap-2">
          <Percent size={14} className="text-gray-400" />
          <p className="text-[11px] text-gray-600">Get up to <span className="font-bold text-gray-800">25% off</span> on multi year plans. <button className="text-indigo-600 font-bold hover:underline">Talk To Sales</button></p>
        </div>

      </div>
    </div>
  );
}
