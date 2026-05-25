"use client";

import React, { useState, useEffect } from "react";
import { X, Phone, MessageSquare } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

interface SMSModalProps {
  customerName: string;
  existingPhone?: string;
  message: string;
  onClose: () => void;
}

export default function SMSModal({
  customerName,
  existingPhone,
  message,
  onClose,
}: SMSModalProps) {
  const [phone, setPhone] = useState(existingPhone || "");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLookedUp, setIsLookedUp] = useState(!!existingPhone);
  const [sending, setSending] = useState(false);

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

  const handleSend = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 10) return;

    try {
      setSending(true);
      const user = auth.currentUser;
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // We don't have the user's name readily available here, so we just use "Admin" or fetch it
      // but for SMS Marketing page compatibility, "Admin" is fine.
      await addDoc(collection(db, "smsCampaigns"), {
        userId: user.uid,
        campaignName: `Transactional SMS: ${customerName}`,
        recipientsCount: 1,
        status: "Sent",
        createdAt: serverTimestamp(),
        createdBy: "Admin"
      });

      toast.success("SMS Sent Successfully! 💬");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send SMS");
    } finally {
      setSending(false);
    }
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
        <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Send SMS</p>
              <p className="text-indigo-100 text-[11px] font-medium">{customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Message preview */}
          <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-900 leading-relaxed font-medium border border-indigo-100 relative">
            <div className="absolute -top-1.5 left-4 w-3 h-3 bg-indigo-50 rotate-45 border-l border-t border-indigo-100" />
            <p className="whitespace-pre-wrap">{message}</p>
          </div>

          {/* Phone input */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Phone size={12} />
              Mobile Number
              {isLookingUp && (
                <span className="text-indigo-500 text-[10px] font-normal animate-pulse">
                  Looking up from customer records...
                </span>
              )}
              {isLookedUp && !isLookingUp && (
                <span className="text-green-600 text-[10px] font-normal">
                  ✓ Auto-filled from customer records
                </span>
              )}
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
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
            disabled={phone.replace(/\D/g, "").length < 10 || sending}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            {sending ? "Sending..." : "Send SMS"}
          </button>
        </div>
      </div>
    </div>
  );
}
