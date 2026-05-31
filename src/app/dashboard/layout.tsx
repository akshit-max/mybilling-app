"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AutomatedBillsProcessor from "@/components/AutomatedBillsProcessor";
import { SessionProvider } from "@/context/SessionContext";
import FirstTimeAdminSetup from "@/components/auth/FirstTimeAdminSetup";
import TrialEnforcer from "@/components/TrialEnforcer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith("/dashboard/settings");
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <SessionProvider>
        <TrialEnforcer />
        <FirstTimeAdminSetup />
        <AutomatedBillsProcessor />
        <div className="flex h-screen print:h-auto w-full bg-[#f4f5f7] overflow-hidden print:overflow-visible font-sans text-gray-800">
          
          {/* Mobile Overlay */}
          {!isSettings && isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar Area */}
          <div className={`
            print:hidden fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}>
            {!isSettings && (
              <Sidebar 
                collapsed={isSidebarCollapsed} 
                setCollapsed={setIsSidebarCollapsed} 
                mobileOpen={isMobileMenuOpen}
                setMobileOpen={setIsMobileMenuOpen}
              />
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0 print:block">
            <div className="print:hidden">
              {!isSettings && (
                <Topbar 
                  toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                  toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                />
              )}
            </div>
            <main className={`flex-1 overflow-y-auto print:overflow-visible ${isSettings ? "" : "p-4 md:p-6 print:p-0"}`}>
              {children}
            </main>
          </div>
        </div>
      </SessionProvider>
    </ProtectedRoute>
  );
}