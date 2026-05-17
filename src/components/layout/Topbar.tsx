"use client";

import { usePathname } from "next/navigation";
import { 
  Monitor, 
  Headphones, 
  Gift, 
  Users, 
  FileText, 
  Search
} from "lucide-react";

export function Topbar() {
  const pathname = usePathname();
  
  // Basic title mapping based on pathname
  const getPageTitle = () => {
    if (!pathname) return "Dashboard";
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.includes("/dashboard/reports")) return "Reports";
    if (pathname.includes("/dashboard/products")) return "Items";
    if (pathname.includes("/dashboard/customers")) return "Parties";
    if (pathname.includes("/dashboard/purchases")) return "Purchase Invoices";
    if (pathname.includes("/dashboard/settings")) return "Settings";
    
    // Fallback: capitalize the last segment
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return last ? last.charAt(0).toUpperCase() + last.slice(1) : "Dashboard";
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 font-sans">
      <h1 className="text-lg font-medium text-gray-800">{getPageTitle()}</h1>
      
      <div className="flex items-center gap-4">
        {/* Icon Nav */}
        <div className="flex items-center gap-3 text-gray-500">
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Desktop App">
            <Monitor size={20} strokeWidth={1.5} />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Help & Support">
            <Headphones size={20} strokeWidth={1.5} />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Offers">
            <Gift size={20} strokeWidth={1.5} />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Manage Users">
            <Users size={20} strokeWidth={1.5} />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Shortcuts">
            <FileText size={20} strokeWidth={1.5} />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Search">
            <Search size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Action Button */}
        <button className="ml-2 border border-blue-100 text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
          Book Demo
        </button>
      </div>
    </header>
  );
}
