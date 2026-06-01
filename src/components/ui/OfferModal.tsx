"use client";

import React from "react";
import { X, Crown, Info, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OfferModal({ isOpen, onClose, hideClose = false }: { isOpen: boolean, onClose: () => void, hideClose?: boolean }) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleBuy = () => {
    onClose();
    // Pass special promotion parameter to checkout
    router.push(`/dashboard/settings/pricing/checkout?plan=Platinum&cycle=Monthly&promo=31DAYS2`);
  };

  const handleSkip = () => {
    onClose();
    router.push('/dashboard/settings/pricing');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-slate-900/70 backdrop-blur-md ${!hideClose ? 'cursor-pointer' : ''}`} onClick={hideClose ? undefined : onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col font-sans border border-slate-200">
        
        {/* Premium Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-10 pb-12 px-8 text-center overflow-hidden">
           {/* Close Button */}
           {!hideClose && (
             <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all z-20">
               <X size={18} />
             </button>
           )}
           
           {/* Ambient Gold Glow */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none"></div>

           <div className="relative z-10 flex flex-col items-center">
             <div className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4 flex items-center gap-1.5 shadow-sm">
                <Sparkles size={12} />
                Exclusive VIP Offer
             </div>
             <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
               Unlock 31 Days for <span className="text-amber-400">₹2</span>
             </h2>
             <p className="text-slate-400 mt-3 font-medium text-sm">
               Experience the full power of our Platinum Plan.
             </p>
           </div>
        </div>

        {/* Offer Body */}
        <div className="p-6 md:p-8 pt-0 relative z-20 -mt-8">
           
           {/* Pricing Card */}
           <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col items-center max-w-lg mx-auto">
              
              <div className="w-full py-8 px-6 flex flex-col items-center relative">
                 
                 {/* Plan Name */}
                 <div className="flex items-center gap-2 text-slate-800 font-bold text-xl mb-4">
                    <Crown size={24} className="text-amber-500 fill-amber-500" />
                    <span>Platinum Plan</span>
                 </div>

                 {/* Pricing Info */}
                 <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-1.5 justify-center">
                       <span className="text-5xl font-black text-slate-900 tracking-tighter">₹2</span>
                       <span className="text-sm font-bold text-slate-500">for 31 days</span>
                    </div>
                    
                    <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-full text-sm text-slate-500 font-medium border border-slate-200">
                       <span className="line-through text-slate-400">₹299</span>
                       <span className="text-slate-700">then ₹231/month</span>
                    </div>
                 </div>
              </div>

           </div>
           
           {/* Actions */}
           <div className="mt-8 max-w-lg mx-auto flex flex-col gap-3">
              <button 
                 onClick={handleBuy}
                 className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_8px_20px_-4px_rgba(245,158,11,0.5)] transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                 Claim ₹2 Offer Now <ArrowRight size={20} />
              </button>
              
              <button 
                onClick={handleSkip} 
                className="w-full bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-slate-300 font-bold text-sm py-3.5 rounded-xl transition-all"
              >
                 {hideClose ? "No thanks, view all premium plans" : "View all premium plans"}
              </button>
           </div>
           
           {/* Footer Note */}
           <div className="mt-6 flex flex-col items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Info size={14} className="text-slate-300" />
                <span>Auto-renews at ₹231/month. Cancel anytime.</span>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
