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

  if (loading) return null;
  if (!activeProfile.isAdmin) return null;
  if (adminPin) return null;

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
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("PIN Save Error:", err);
      toast.error(err.message || "Failed to save Master PIN.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col relative border border-gray-100">
        
        {/* Clean Premium Header */}
        <div className="bg-slate-50 border-b border-gray-100 p-8 flex flex-col items-center justify-center relative">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-indigo-100">
            <ShieldCheck size={28} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Secure Your Dashboard</h2>
          <p className="text-gray-500 text-xs mt-1.5 font-medium text-center max-w-[90%] leading-relaxed">
            Create a Master PIN to protect your admin privileges from unauthorized access.
          </p>
        </div>

        {/* Content Area */}
        <div className="p-8 bg-white flex flex-col items-center">
          
          <div className="w-full flex items-start gap-3 bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 shadow-sm">
            <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-bold text-amber-800 mb-1">Mandatory Security Step</h4>
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                Your Admin profile currently has no PIN. You must create one to prevent session hijacking.
              </p>
            </div>
          </div>

          <div className="w-full max-w-[280px]">
            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              <KeyRound size={13} className="text-indigo-500" /> Create Master PIN
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input 
                type="password"
                maxLength={4}
                placeholder="• • • •"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-center text-2xl tracking-[1em] font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            onClick={handleSavePin}
            disabled={newPin.length !== 4 || saving}
            className="w-full max-w-[280px] mt-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:border-transparent text-white py-3.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 border border-indigo-700/50"
          >
            {saving ? "Securing Profile..." : "Enable Master PIN"}
            {!saving && <ArrowRight size={16} />}
          </button>
          
        </div>
      </div>
    </div>
  );
}

