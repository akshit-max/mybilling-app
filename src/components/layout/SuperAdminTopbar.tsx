"use client";

import { usePathname } from "next/navigation";
import { 
  Indent,
  Menu,
  ShieldCheck,
  Lock
} from "lucide-react";
import { auth } from "@/lib/firebase";

export function SuperAdminTopbar({ toggleSidebar, toggleMobileMenu }: { toggleSidebar?: () => void, toggleMobileMenu?: () => void }) {
  const pathname = usePathname();
  
  // Basic title mapping based on pathname
  const getPageTitle = () => {
    if (pathname === "/superadmin") return "Platform Command Center";
    if (pathname === "/superadmin/settings") return "Global Settings";
    return "SaaS Admin";
  };

  return (
    <header className="h-16 border-b flex items-center justify-between px-4 md:px-8 flex-shrink-0 font-sans relative shadow-sm bg-white border-slate-200 z-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileMenu} 
          className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu size={22} />
        </button>
        <button 
          onClick={toggleSidebar} 
          className="hidden md:block p-2 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-[#F97316] rounded-xl transition-colors"
          title="Toggle Sidebar"
        >
          <Indent size={20} />
        </button>
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Lock size={16} className="text-[#F97316] hidden sm:block" /> {getPageTitle()}
          </h2>
          {pathname === "/superadmin" && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Global SaaS Analytics & Oversight</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-5">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF7ED] border border-[#F97316]/20 rounded-full">
           <ShieldCheck size={14} className="text-[#F97316]" />
           <span className="text-xs font-bold text-[#F97316] uppercase tracking-widest">Platform Owner</span>
        </div>
      </div>
    </header>
  );
}
