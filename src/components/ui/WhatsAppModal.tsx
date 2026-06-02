"use client";

import React, { useState, useEffect } from "react";
import { X, Phone, MessageCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface WhatsAppModalProps {
  customerName: string;
  existingPhone?: string;
  message: string;
  onClose: () => void;
}

export default function WhatsAppModal({
  customerName,
  existingPhone,
  message,
  onClose,
}: WhatsAppModalProps) {
  const [phone, setPhone] = useState(existingPhone || "");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLookedUp, setIsLookedUp] = useState(!!existingPhone);

  // Auto-lookup from customers collection if phone is missing
  useEffect(() => {
    if (!existingPhone && customerName && customerName !== "Cash Sale") {
      const lookup = async () => {
        setIsLookingUp(true);
        try {
          const user = auth.currentUser;
          if (!user) return;
          const q = query(
            collection(db, "customers"),
            where("userId", "==", user.uid),
            where("name", "==", customerName)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            const found = data.phone || data.mobile || data.phoneNumber || "";
            if (found) {
              setPhone(found);
              setIsLookedUp(true);
            }
          }
        } catch (_) {
          // silently fail
        } finally {
          setIsLookingUp(false);
        }
      };
      lookup();
    }
  }, [customerName, existingPhone]);

  const handleSend = () => {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 10) return;
    window.open(
      `https://wa.me/91${cleaned}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#25D366] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <FaWhatsapp size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Share via WhatsApp</p>
              <p className="text-white/80 text-[11px] font-medium">{customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Message preview */}
          <div className="bg-[#DCF8C6] rounded-xl p-3 text-xs text-gray-700 leading-relaxed font-medium border border-[#b2dfb2] relative">
            <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#DCF8C6] rotate-45 border-l border-t border-[#b2dfb2]" />
            <p className="whitespace-pre-wrap">{message}</p>
          </div>

          {/* Phone input */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Phone size={12} />
              WhatsApp Number
              {isLookingUp && (
                <span className="text-indigo-500 text-[10px] font-normal animate-pulse">
                  Looking up from customer records...
                </span>
              )}
              {isLookedUp && !isLookingUp && (
                <span className="text-brand-tertiary text-[10px] font-normal">
                  ✓ Auto-filled from customer records
                </span>
              )}
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#25D366] focus-within:ring-2 focus-within:ring-[#25D366]/20 transition-all">
              <span className="bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-600 border-r border-gray-200 shrink-0">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                maxLength={12}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white text-gray-800 font-semibold placeholder-gray-400"
              />
            </div>
            {phone && phone.replace(/\D/g, "").length < 10 && (
              <p className="text-[10px] text-red-500 mt-1 font-semibold">
                Please enter a valid 10-digit number
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={phone.replace(/\D/g, "").length < 10}
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBD5A] disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <FaWhatsapp size={16} />
            Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
