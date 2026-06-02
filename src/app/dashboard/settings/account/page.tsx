"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  FileText, 
  Printer, 
  Users, 
  Bell, 
  Share2, 
  Tag, 
  Gift, 
  HelpCircle, 
  LogOut,
  MessageSquare
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";

import SettingsSidebar from "../SettingsSidebar";
import { useChat } from "@/context/ChatContext";

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true);
  const { openChat } = useChat();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Account states
  const [displayName, setDisplayName] = useState("self");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [planName, setPlanName] = useState("Trial Plan");

  useEffect(() => {
    let unsubUsers: () => void;
    
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.businessName) setDisplayName(data.businessName);
            if (data.phone) setPhone(data.phone);
            if (data.email) setEmail(data.email);
            if (data.referralCode) setReferralCode(data.referralCode);
          }

          unsubUsers = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setIsPaid(data.isPaid || false);
              setPlanName(data.plan || "Trial Plan");
            } else {
              setIsPaid(false);
              setPlanName("Trial Plan");
            }
          });
        } catch (err) {
          console.error("Error loading account settings:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    
    return () => {
      unsubAuth();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const triggerChange = (setter: any, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      setSaving(true);
      
      if (!displayName.trim()) {
        setSaving(false);
        return toast.error("Name is required");
      }
      if (phone.trim() && phone.replace(/\D/g, "").length !== 10) {
        setSaving(false);
        return toast.error("Mobile Number must be exactly 10 digits");
      }
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setSaving(false);
        return toast.error("Invalid email address");
      }

      await setDoc(doc(db, "settings", user.uid), {
        businessName: displayName,
        phone,
        email,
        referralCode,
        updatedAt: new Date()
      }, { merge: true });

      setHasChanges(false);
      toast.success("Account settings updated successfully! ✅");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const premiumFeatures = [
    { icon: "👥", label: "Multi User and Staff Access" },
    { icon: "🔄", label: "EWay Bill Generation" },
    { icon: "📱", label: "SMS Marketing" },
    { icon: "🏢", label: "Multiple Businesses" },
    { icon: "🖥️", label: "Desktop App" },
    { icon: "📊", label: "Scan & Print Barcode" },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400 gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold">Configuring account settings...</span>
      </div>
    );
  }

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">

      {/* Shared Settings Sidebar */}
      <SettingsSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Account Settings</h2>
            <p className="text-[10px] text-gray-500 font-medium">Manage your subscription account and profile details</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openChat} className="flex items-center gap-1.5 text-xs text-brand-primary hover:bg-blue-50 px-3 py-1.5 rounded-md font-semibold transition-colors">
              <MessageSquare size={13} /> Chat Support
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`text-xs px-5 py-1.5 rounded font-bold transition-all shadow-xs ${
                hasChanges 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              }`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Help us banner */}
        <div className="bg-brand-neutral border-b border-orange-100 px-6 py-2.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-700 font-bold">Help us make myBillBook better for your business!</span>
          <button className="flex items-center gap-1.5 bg-brand-secondary hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded transition-colors">
            🎁 Share Suggestion
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* General Information */}
          <div className="px-8 py-6 border-b border-gray-100 space-y-4">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">General Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  NAME *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => triggerChange(setDisplayName, e.target.value)}
                  placeholder="Enter name"
                  className="w-full border-b border-gray-250 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-500 font-bold bg-transparent"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">MOBILE NUMBER</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => triggerChange(setPhone, e.target.value)}
                  className="w-full border-b border-gray-250 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-500 font-semibold bg-transparent"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => triggerChange(setEmail, e.target.value)}
                  placeholder="Enter email"
                  className="w-full border-b border-gray-250 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-500 bg-transparent placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Referral Code */}
          <div className="px-8 py-6 border-b border-gray-100 space-y-3">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Referral code for{" "}
              <span className="text-indigo-500 underline cursor-pointer">subscription discount</span>
            </h3>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="text"
                placeholder="Referral Code"
                value={referralCode}
                onChange={(e) => triggerChange(setReferralCode, e.target.value)}
                className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button 
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-all"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="px-8 py-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Subscription Plan</h3>

            <div className="flex flex-col lg:flex-row items-start gap-12">

              {/* Current Plan */}
              <div className="flex flex-col gap-4 max-w-xs w-full">
                <div className={`border p-4 rounded-lg ${isPaid ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-150"}`}>
                  <p className={`text-[9px] uppercase tracking-wider font-bold ${isPaid ? "text-brand-tertiary" : "text-gray-400"}`}>CURRENT PLAN</p>
                  <p className={`text-3xl font-extrabold mt-1 capitalize ${isPaid ? "text-emerald-800" : "text-gray-800"}`}>
                    {isPaid ? `${planName} Plan` : "Trial Plan"}
                  </p>
                </div>
                
                {!isPaid && (
                  <button className="bg-brand-secondary hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-xs text-center">
                    Buy Premium Subscription
                  </button>
                )}
                
                <div className="flex items-center gap-2.5 pt-2">
                  <div className="flex -space-x-2">
                    {["bg-indigo-400", "bg-purple-400", "bg-pink-400"].map((c, i) => (
                      <div key={i} className={`w-5 h-5 rounded-full ${c} border border-white`} />
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 font-semibold leading-normal">
                    10,00,000+ Vyaparis running their business on premium.
                  </p>
                </div>
              </div>

              {/* Premium Features */}
              {!isPaid && (
                <div className="flex-1 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-12 space-y-4">
                  <p className="text-xs font-bold text-gray-700">Upgrade your plan today and get access to premium features:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {premiumFeatures.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5 bg-gray-50/50 p-2.5 rounded border border-gray-100">
                        <span className="text-base shrink-0">{f.icon}</span>
                        <span className="text-xs text-gray-600 font-semibold">{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
