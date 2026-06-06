"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Key, Clock, CheckCircle2 } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { hashPin } from "@/lib/crypto";
import toast from "react-hot-toast";

export default function SecuritySettingsPage() {
  const { activeProfile, adminPin } = useSession();

  const [pinLastChangedAt, setPinLastChangedAt] = useState<Date | null>(null);

  // Change PIN State
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeError, setPinChangeError] = useState("");
  const [pinChangeSuccess, setPinChangeSuccess] = useState("");

  // Fetch audit fields on mount
  useEffect(() => {
    const fetchSecurityMeta = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "settings", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.pinLastChangedAt) {
            setPinLastChangedAt(d.pinLastChangedAt.toDate ? d.pinLastChangedAt.toDate() : new Date(d.pinLastChangedAt));
          }
        }
      } catch (err) {}
    };
    fetchSecurityMeta();
  }, []);

  // Ensure only Admins can access
  if (!activeProfile.isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500 mt-2">Only company administrators can manage security settings.</p>
      </div>
    );
  }

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError("");
    setPinChangeSuccess("");

    if (!currentPin || !newPin || !confirmPin) {
      setPinChangeError("All fields are required.");
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinChangeError("New PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeError("New PINs do not match.");
      return;
    }

    setIsChangingPin(true);
    try {
      const hashedCurrent = await hashPin(currentPin);
      if (hashedCurrent !== adminPin) {
        setPinChangeError("Current PIN is incorrect.");
        setIsChangingPin(false);
        return;
      }

      const hashedNew = await hashPin(newPin);
      const user = auth.currentUser;
      if (!user) throw new Error("Unauthenticated");

      await updateDoc(doc(db, "settings", user.uid), {
        adminPin: hashedNew,
        pinLastChangedAt: new Date()
      });

      setPinChangeSuccess("Master PIN updated successfully!");
      setPinLastChangedAt(new Date());
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      toast.success("PIN changed successfully!");
    } catch (err) {
      console.error(err);
      setPinChangeError("Failed to update PIN.");
    } finally {
      setIsChangingPin(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 overflow-y-auto font-sans h-full">
      {/* Top Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs bg-white">
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-secondary" /> Security & Access
          </h2>
          <p className="text-[10px] text-gray-500 font-medium">Manage company master PIN</p>
        </div>
      </div>

      <main className="w-full max-w-4xl mx-auto p-6 space-y-6">

        {/* Change Master PIN Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Key size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 tracking-tight">Company Master PIN</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Change the 4-digit PIN used to protect Admin features and sensitive operations.</p>
            </div>
          </div>
          
          <div className="p-6">
            <form onSubmit={handlePinChange} className="space-y-5 max-w-sm">
              {pinChangeError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <ShieldAlert size={14} /> {pinChangeError}
                </div>
              )}
              {pinChangeSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 size={14} /> {pinChangeSuccess}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Current PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg tracking-[0.5em] font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                  placeholder="••••"
                />
              </div>

              <div className="pt-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">New PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg tracking-[0.5em] font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                  placeholder="••••"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Confirm New PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg tracking-[0.5em] font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                  placeholder="••••"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {pinLastChangedAt ? (
                  <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <Clock size={10} /> Last changed: {pinLastChangedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                ) : <span />}
                
                <button 
                  type="submit" 
                  disabled={isChangingPin || newPin.length !== 4 || confirmPin.length !== 4}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-sm"
                >
                  {isChangingPin ? "Updating..." : "Update PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
}
