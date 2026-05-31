"use client";

import React from "react";
import { X, Crown, Info } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OfferModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleBuy = () => {
    onClose();
    // Pass special promotion parameter to checkout
    router.push(`/dashboard/settings/pricing/checkout?plan=Platinum&cycle=Monthly&promo=31DAYS2`);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col font-sans">
        
        {/* Festive Header Background */}
        <div className="relative bg-[#FFFBF2] pt-8 pb-6 px-8 text-center border-b border-orange-50">
           {/* Close Button */}
           <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full transition-colors z-10">
             <X size={20} />
           </button>
           
           {/* Confetti / Decor pattern (CSS representation) */}
           <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FDE68A 2px, transparent 2px), radial-gradient(#FCA5A5 2px, transparent 2px)', backgroundSize: '40px 40px, 30px 30px', backgroundPosition: '0 0, 15px 15px' }}></div>

           <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 relative z-10 tracking-tight">
             Unlock 31 days Trial for ₹ 2
           </h2>
        </div>

        {/* Offer Body */}
        <div className="p-6 md:p-8 pt-0 relative z-10 -mt-2">
           <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden flex flex-col items-center max-w-lg mx-auto">
              
              {/* Blue Banner */}
              <div className="w-full bg-[#4F5B9A] text-white text-center py-2 text-sm font-bold tracking-wide uppercase">
                 Exclusive Offer
              </div>
              
              <div className="w-full py-8 px-6 flex flex-col items-center relative overflow-hidden">
                 
                 {/* Laurel Wreath SVGs (Left/Right) - Approximations */}
                 <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-32 text-gray-200" viewBox="0 0 24 64" fill="currentColor">
                    <path d="M12,2 C10,12 2,16 2,24 C2,32 10,36 12,46 C14,36 22,32 22,24 C22,16 14,12 12,2 Z" />
                 </svg>
                 <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-32 text-gray-200 transform scale-x-[-1]" viewBox="0 0 24 64" fill="currentColor">
                    <path d="M12,2 C10,12 2,16 2,24 C2,32 10,36 12,46 C14,36 22,32 22,24 C22,16 14,12 12,2 Z" />
                 </svg>

                 {/* Plan Name */}
                 <div className="flex items-center gap-2 text-[#4F5B9A] font-bold text-lg mb-4">
                    <Crown size={20} className="fill-[#4F5B9A]" />
                    <span>Platinum Plan</span>
                 </div>

                 {/* Pricing Info */}
                 <div className="flex items-baseline gap-1.5 justify-center mt-2">
                    <span className="text-4xl font-black text-gray-900">₹ 2</span>
                    <span className="text-sm font-bold text-gray-600">for 1st 31 days</span>
                 </div>
                 
                 <div className="mt-3 text-sm text-gray-500 font-medium">
                    then ₹ 299/month <span className="text-[10px]">(GST excl.)</span>
                 </div>
              </div>

           </div>
           
           {/* Footer Note */}
           <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
              <Info size={14} className="text-gray-400" />
              <span>Renews every month. Cancel anytime</span>
           </div>

           {/* Call to Action */}
           <div className="mt-6 max-w-lg mx-auto">
              <button 
                 onClick={handleBuy}
                 className="w-full bg-[#4F5B9A] hover:bg-[#3F4B8A] text-white font-bold text-lg py-3.5 rounded-lg shadow-md transition-colors"
              >
                 Buy Plan at ₹ 2
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
