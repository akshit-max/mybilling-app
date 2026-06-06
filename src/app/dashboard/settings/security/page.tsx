"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Key, Clock, CheckCircle2 } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { hashPin } from "@/lib/crypto";
import toast from "react-hot-toast";

export default function SecuritySettingsPage() {
  const { activeProfile, adminPin, superAdminPin, isSuperAdminUser, isSuperAdminEligible } = useSession();

  const [loading, setLoading] = useState(false);
  const [pinLastChangedAt, setPinLastChangedAt] = useState<Date | null>(null);
  const [superAdminActivatedAt, setSuperAdminActivatedAt] = useState<Date | null>(null);

  // Change PIN State
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeError, setPinChangeError] = useState("");
  const [pinChangeSuccess, setPinChangeSuccess] = useState("");

  // Change Super Admin PIN State
  const [saCurrentPin, setSaCurrentPin] = useState("");
  const [saNewPin, setSaNewPin] = useState("");
  const [saConfirmPin, setSaConfirmPin] = useState("");
  const [isChangingSaPin, setIsChangingSaPin] = useState(false);
  const [saPinChangeError, setSaPinChangeError] = useState("");
  const [saPinChangeSuccess, setSaPinChangeSuccess] = useState("");
  const [saPinLastChangedAt, setSaPinLastChangedAt] = useState<Date | null>(null);

  // Setup Super Admin State
  const [setupPin, setSetupPin] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState("");

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
          if (d.superAdminActivatedAt) {
            setSuperAdminActivatedAt(d.superAdminActivatedAt.toDate ? d.superAdminActivatedAt.toDate() : new Date(d.superAdminActivatedAt));
          }
          if (d.saPinLastChangedAt) {
            setSaPinLastChangedAt(d.saPinLastChangedAt.toDate ? d.saPinLastChangedAt.toDate() : new Date(d.saPinLastChangedAt));
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

  const handleSaPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaPinChangeError("");
    setSaPinChangeSuccess("");

    if (!saCurrentPin || !saNewPin || !saConfirmPin) {
      setSaPinChangeError("All fields are required.");
      return;
    }
    if (saNewPin.length !== 4 || isNaN(Number(saNewPin))) {
      setSaPinChangeError("New PIN must be exactly 4 digits.");
      return;
    }
    if (saNewPin !== saConfirmPin) {
      setSaPinChangeError("New PINs do not match.");
      return;
    }

    setIsChangingSaPin(true);
    try {
      const hashedCurrent = await hashPin(saCurrentPin);
      if (hashedCurrent !== superAdminPin) {
        setSaPinChangeError("Current PIN is incorrect.");
        setIsChangingSaPin(false);
        return;
      }

      const hashedNew = await hashPin(saNewPin);
      const user = auth.currentUser;
      if (!user) throw new Error("Unauthenticated");

      await updateDoc(doc(db, "settings", user.uid), {
        superAdminPin: hashedNew,
        saPinLastChangedAt: new Date()
      });

      setSaPinChangeSuccess("Super Admin PIN updated successfully!");
      setSaPinLastChangedAt(new Date());
      setSaCurrentPin("");
      setSaNewPin("");
      setSaConfirmPin("");
      toast.success("Super Admin PIN changed successfully!");
    } catch (err) {
      console.error(err);
      setSaPinChangeError("Failed to update Super Admin PIN.");
    } finally {
      setIsChangingSaPin(false);
    }
  };

  const handleSuperAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");

    if (!setupPin) {
      setSetupError("Master PIN is required.");
      return;
    }

    setIsSettingUp(true);
    try {
      const hashedInput = await hashPin(setupPin);
      if (hashedInput !== adminPin) {
        setSetupError("Incorrect Master PIN.");
        setIsSettingUp(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) throw new Error("Unauthenticated");

      const activatedAt = new Date();
      await updateDoc(doc(db, "settings", user.uid), {
        isSuperAdmin: true,
        superAdminActivatedAt: activatedAt,
        superAdminPin: adminPin // MIGRATION: Inherit at birth
      });

      setSuperAdminActivatedAt(activatedAt);
      toast.success("Super Admin Activated! Please refresh your browser to apply changes.");
      
      // Attempting soft reload
      setTimeout(() => {
         window.location.reload();
      }, 1500);

    } catch (err) {
      console.error(err);
      setSetupError("Activation failed. Please try again.");
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50/30 overflow-y-auto p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Security Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account security, Master PIN, and platform-wide privileges.</p>
        </div>

        {/* 1. Master PIN Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-indigo-600" />
            <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider">Master PIN Management</h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
               <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-sm">
                 Your Master PIN secures your company's critical settings, user management, and session switching.
               </p>
               <div className="bg-gray-50 rounded-md p-4 border border-gray-100 max-w-sm">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock size={12}/> Last PIN Change</p>
                 <p className="text-base font-bold text-gray-800">
                   {pinLastChangedAt ? pinLastChangedAt.toLocaleString('en-IN') : "Never Changed"}
                 </p>
               </div>
            </div>
            
            <form onSubmit={handlePinChange} className="flex-1 max-w-md bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
               {pinChangeError && <div className="text-xs text-red-600 bg-red-50 p-3 rounded mb-4 font-medium border border-red-100">{pinChangeError}</div>}
               {pinChangeSuccess && <div className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded mb-4 font-medium border border-emerald-100">{pinChangeSuccess}</div>}
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-600 mb-1.5">Current PIN</label>
                   <input type="password" maxLength={4} value={currentPin} onChange={e=>setCurrentPin(e.target.value)} className="w-full text-sm p-2.5 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="••••" />
                 </div>
                 <div className="flex gap-4">
                   <div className="flex-1">
                     <label className="block text-xs font-bold text-gray-600 mb-1.5">New PIN</label>
                     <input type="password" maxLength={4} value={newPin} onChange={e=>setNewPin(e.target.value)} className="w-full text-sm p-2.5 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="••••" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-xs font-bold text-gray-600 mb-1.5">Confirm PIN</label>
                     <input type="password" maxLength={4} value={confirmPin} onChange={e=>setConfirmPin(e.target.value)} className="w-full text-sm p-2.5 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="••••" />
                   </div>
                 </div>
                 <button type="submit" disabled={isChangingPin} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-md transition-colors mt-2 disabled:opacity-50">
                   {isChangingPin ? "Updating..." : "Update Master PIN"}
                 </button>
               </div>
            </form>
          </div>
        </div>

        {/* 2. Super Admin Activation / Status */}
        {isSuperAdminUser ? (
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={20} className="text-emerald-600" />
              <h3 className="text-base font-bold text-emerald-800 uppercase tracking-wider">Platform Super Admin Status</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-center">
               <div className="flex-1">
                 <p className="text-sm text-emerald-700/80 font-medium max-w-lg leading-relaxed">
                   Your account has been permanently upgraded to a Platform Owner. You can now use the Session Switcher (top right) to enter Super Admin mode and view global SaaS metrics.
                 </p>
               </div>
               <div className="flex-1 w-full grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-md p-4 border border-emerald-100 shadow-sm">
                     <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Status</p>
                     <p className="text-base font-black text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={16}/> ACTIVE</p>
                  </div>
                  <div className="bg-white rounded-md p-4 border border-emerald-100 shadow-sm">
                     <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Activated On</p>
                     <p className="text-sm font-bold text-emerald-800">
                       {superAdminActivatedAt ? superAdminActivatedAt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}
                     </p>
                  </div>
               </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-emerald-100 flex flex-col md:flex-row gap-8 items-start">
               <div className="flex-1 space-y-2">
                 <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Super Admin PIN</h4>
                 <p className="text-xs text-emerald-700/80 font-medium max-w-sm">
                   Your Super Admin PIN is isolated from your Company Admin PIN. Changing one will not affect the other.
                 </p>
                 <div className="bg-white/50 rounded-md p-3 border border-emerald-100 max-w-sm mt-2">
                   <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock size={10}/> Last PIN Change</p>
                   <p className="text-sm font-bold text-emerald-800">
                     {saPinLastChangedAt ? saPinLastChangedAt.toLocaleString('en-IN') : "Inherited from Master PIN"}
                   </p>
                 </div>
               </div>
               
               <form onSubmit={handleSaPinChange} className="flex-1 max-w-md w-full bg-white p-5 rounded-lg border border-emerald-200 shadow-sm">
                 {saPinChangeError && <div className="text-xs text-red-600 bg-red-50 p-3 rounded mb-4 font-medium border border-red-100">{saPinChangeError}</div>}
                 {saPinChangeSuccess && <div className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded mb-4 font-medium border border-emerald-100">{saPinChangeSuccess}</div>}
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-600 mb-1.5">Current Super Admin PIN</label>
                     <input type="password" maxLength={4} value={saCurrentPin} onChange={e=>setSaCurrentPin(e.target.value)} className="w-full text-sm p-2.5 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" placeholder="••••" />
                   </div>
                   <div className="flex gap-4">
                     <div className="flex-1">
                       <label className="block text-xs font-bold text-gray-600 mb-1.5">New PIN</label>
                       <input type="password" maxLength={4} value={saNewPin} onChange={e=>setSaNewPin(e.target.value)} className="w-full text-sm p-2.5 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" placeholder="••••" />
                     </div>
                     <div className="flex-1">
                       <label className="block text-xs font-bold text-gray-600 mb-1.5">Confirm PIN</label>
                       <input type="password" maxLength={4} value={saConfirmPin} onChange={e=>setSaConfirmPin(e.target.value)} className="w-full text-sm p-2.5 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" placeholder="••••" />
                     </div>
                   </div>
                   <button type="submit" disabled={isChangingSaPin} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-md transition-colors mt-2 disabled:opacity-50">
                     {isChangingSaPin ? "Updating..." : "Update Super Admin PIN"}
                   </button>
                 </div>
               </form>
            </div>
            
          </div>
        ) : isSuperAdminEligible ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 overflow-hidden relative">
            {/* Warning Background Stripe */}
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>

            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={18} className="text-red-500" />
              <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider">Setup Platform Super Admin</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-4">
                 <p className="text-sm text-gray-600 font-medium leading-relaxed max-w-sm">
                   This action upgrades your account to a **Platform Owner**, granting access to global SaaS metrics and subscription oversight. 
                 </p>
                 <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded border border-amber-200 font-medium max-w-sm">
                   Warning: This action is permanent and should only be performed by the authorized platform owner.
                 </div>
              </div>
              
              <form onSubmit={handleSuperAdminSetup} className="flex-1 max-w-md bg-gray-50/50 p-5 rounded-lg border border-gray-100">
                 {setupError && <div className="text-xs text-red-600 bg-red-50 p-3 rounded mb-4 font-medium border border-red-100">{setupError}</div>}
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-600 mb-1.5">Verify Master PIN to Activate</label>
                     <input type="password" maxLength={4} value={setupPin} onChange={e=>setSetupPin(e.target.value)} className="w-full text-center tracking-[1em] text-lg p-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" placeholder="••••" />
                   </div>
                   <button type="submit" disabled={isSettingUp} className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold text-sm py-3 rounded-md transition-colors mt-2 disabled:opacity-50 flex justify-center items-center gap-2">
                     <ShieldCheck size={16} /> {isSettingUp ? "Verifying..." : "Activate Super Admin Privileges"}
                   </button>
                 </div>
              </form>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
