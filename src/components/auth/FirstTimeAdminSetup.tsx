"use client";

import React, { useState } from "react";
import { useSession } from "@/context/SessionContext";
import { ShieldCheck, Lock, ArrowRight, ShieldAlert, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { hashPin } from "@/lib/crypto";

export default function FirstTimeAdminSetup() {
  const { activeProfile, adminPin, loading } = useSession();
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  // Only show if fully loaded, user is Admin, and no adminPin exists
  if (loading) return null;
  if (!activeProfile.isAdmin) return null;
  if (adminPin) return null; // Already setup

  const handleSavePin = async () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return toast.error("PIN must be exactly 4 digits");
    }

    const user = auth.currentUser;
    if (!user) return toast.error("Authentication error");

    setSaving(true);
    try {
      const hashedPin = await hashPin(newPin);
      await setDoc(doc(db, "settings", user.uid), { adminPin: hashedPin }, { merge: true });
      toast.success("Master PIN successfully configured!");
      
      // Force a hard reload to ensure all contexts pick up the new PIN
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save Master PIN.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-gray-100">
        
        {/* Premium Header Illustration Area */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-8 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-indigo-500/30 rounded-full blur-xl"></div>
          
          <div className="w-16 h-16 bg-white/10 rounded-full border border-white/20 flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm z-10">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight z-10">Premium Security Setup</h2>
          <p className="text-indigo-100 text-xs mt-2 font-medium z-10 text-center max-w-[80%] leading-relaxed">
            Welcome to your new enterprise dashboard. Let's secure your Master Admin profile before we begin.
          </p>
        </div>

        {/* Content Area */}
        <div className="p-8 bg-slate-50/50 flex flex-col items-center">
          
          <div className="w-full flex items-start gap-4 bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 shadow-sm">
            <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-xs font-bold text-amber-800 mb-1">Mandatory Action Required</h4>
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                Your Admin profile currently has no PIN. To prevent unauthorized switching from employee sessions, you must create a Master PIN.
              </p>
            </div>
          </div>

          <div className="w-full max-w-[280px]">
            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
              <KeyRound size={14} className="text-indigo-500" /> Create Master PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input 
                type="password"
                maxLength={4}
                placeholder="• • • •"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-center text-2xl tracking-[1em] font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            onClick={handleSavePin}
            disabled={newPin.length !== 4 || saving}
            className="w-full max-w-[280px] mt-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? "Securing Profile..." : "Secure My Dashboard"}
            {!saving && <ArrowRight size={16} />}
          </button>
          
        </div>
      </div>
    </div>
  );
}
