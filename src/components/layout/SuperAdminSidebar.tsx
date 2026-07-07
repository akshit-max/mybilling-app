"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  Indent,
  Lock,
  FileText,
  DollarSign
} from "lucide-react";
import { auth } from "@/lib/firebase";

export function SuperAdminSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: any) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    {
      name: "Dashboard",
      href: "/superadmin",
      icon: LayoutDashboard,
    },
    {
      name: "Pricing",
      href: "/superadmin/pricing",
      icon: DollarSign,
    },
    {
      name: "Settings",
      href: "/superadmin/settings",
      icon: Settings,
    },
    {
      name: "Legal CMS",
      href: "/superadmin/legal",
      icon: FileText,
    }
  ];

  return (
    <>
      <aside 
        className={`bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl transition-all duration-300 ease-in-out relative
          ${collapsed ? "w-20" : "w-64"}
        `}
      >
        <div className="h-16 flex items-center px-4 shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-white/5 relative z-10 overflow-hidden group">
           {!collapsed ? (
             <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-4 duration-300 whitespace-nowrap">
               <div className="p-1.5 bg-[#F97316] rounded-lg text-white shadow-lg shadow-[#F97316]/20 flex items-center justify-center shrink-0">
                 <ShieldCheck size={18} strokeWidth={2.5}/>
               </div>
               <span className="text-[17px] font-black text-white tracking-tight leading-none pt-0.5">
                 Cloud <span className="text-[#F97316]">Ledger</span> Admin
               </span>
             </div>
           ) : (
             <div className="mx-auto w-full flex justify-center animate-in fade-in zoom-in-50 duration-300">
               <div className="p-2 bg-[#F97316] rounded-lg text-white shadow-lg flex items-center justify-center shrink-0">
                 <ShieldCheck size={20} strokeWidth={2.5}/>
               </div>
             </div>
           )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-6 px-3 flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group relative
                  ${isActive ? "bg-[#F97316] text-white shadow-md shadow-[#F97316]/20 font-bold" : "hover:bg-slate-800 hover:text-white font-medium"}
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? item.name : ""}
              >
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                )}
                
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                
                {!collapsed && (
                  <span className="text-sm whitespace-nowrap tracking-wide">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/5 space-y-2">
           <button 
             onClick={handleLogout}
             className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group relative hover:bg-red-500/10 text-red-400 hover:text-red-300 font-bold
               ${collapsed ? "justify-center" : ""}
             `}
             title={collapsed ? "Logout" : ""}
           >
             <LogOut size={20} strokeWidth={2.5} className="shrink-0" />
             {!collapsed && (
               <span className="text-sm whitespace-nowrap tracking-wide">Logout</span>
             )}
           </button>
        </div>
      </aside>
    </>
  );
}
