"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, FileText, Printer, Users, Bell, Share2, Tag, Gift, HelpCircle, LogOut, Package, Shield } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { clearAllSessionStorage } from "@/components/TrialEnforcer";

export default function SettingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("self");
  const [phone, setPhone] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.businessName) setBusinessName(data.businessName);
            if (data.phone) setPhone(data.phone);
          }
        } catch (err) {
          console.error("Error loading settings sidebar info:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      clearAllSessionStorage();
      await signOut(auth);
      toast.success("Successfully logged out!");
      router.push("/login");
    } catch (err) {
      console.error(err);
      toast.error("Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { name: "Account", icon: <Building2 size={15} />, href: "/dashboard/settings/account" },
    { name: "Manage Business", icon: <Building2 size={15} />, href: "/dashboard/settings" },
    { name: "Invoice Settings", icon: <FileText size={15} />, href: "/dashboard/settings/invoice" },
    { name: "Item Settings", icon: <Package size={15} />, href: "/dashboard/settings/item" },
    { name: "Print Settings", icon: <Printer size={15} />, href: "/dashboard/settings/print" },
    { name: "Manage Users", icon: <Users size={15} />, href: "/dashboard/settings/manage-users" },
    { name: "Reminders", icon: <Bell size={15} />, href: "/dashboard/settings/reminders" },
    { name: "CA Reports Sharing", icon: <Share2 size={15} />, href: "/dashboard/settings/ca-reports" },
    { name: "Pricing", icon: <Tag size={15} />, href: "/dashboard/settings/pricing" },
    { name: "Refer & Earn", icon: <Gift size={15} />, href: "/dashboard/settings/refer-and-earn" },
    { name: "Help And Support", icon: <HelpCircle size={15} />, href: "/dashboard/settings/help-support" },
  ];

  return (
    <div className="w-64 border-r border-gray-200 flex flex-col bg-white shrink-0 font-sans">
      
      {/* User profile capsule block (Screenshot style) */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-150">
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-base shrink-0">
          {businessName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs text-gray-800 truncate">{businessName}</p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{phone}</p>
        </div>
      </div>

      {/* Capsule button back to dashboard */}
      <div className="p-3 border-b border-gray-100">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-[#141725] w-full py-2 rounded justify-center hover:bg-gray-800 transition-colors uppercase tracking-wider shadow-xs"
        >
          <span>← Back to Dashboard</span>
        </Link>
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto py-2 divide-y divide-gray-50">
        <div className="space-y-0.5 px-2">
          {navItems.map((item, idx) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                href={item.href}
                key={idx}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-all ${
                  isActive 
                    ? "bg-[#5C6BC0] text-white font-bold shadow-xs" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
                }`}
              >
                <span className={isActive ? "text-white" : "text-gray-400"}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Separator logout block */}
        <div className="px-2 pt-2 mt-2">
          <button 
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-red-600 hover:bg-red-50 hover:text-red-700 transition-all font-semibold"
          >
            <LogOut size={15} />
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>

      {/* Footer FloBiz metadata branding */}
      <div className="p-4 border-t border-gray-150 space-y-2">
        <div className="text-[10px] text-gray-400 leading-normal">
          <p>App Version: 9.8.0</p>
          <p className="mt-0.5">🔒 100% Secure • ISO Certified</p>
        </div>
        <div className="border-t border-gray-100 pt-2 flex items-center gap-1">
          <span className="text-[9px] font-bold text-gray-400">Cloud Ledger</span>
        </div>
      </div>

    </div>
  );
}
