"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith("/dashboard/settings");

  return (
    <ProtectedRoute>
      <div className="flex h-screen print:h-auto print:block w-full bg-[#f4f5f7] overflow-hidden print:overflow-visible font-sans text-gray-800">
        <div className="print:hidden">
          {!isSettings && <Sidebar />}
        </div>
        <div className="flex flex-col flex-1 min-w-0 print:block">
          <div className="print:hidden">
            {!isSettings && <Topbar />}
          </div>
          <main className={`flex-1 overflow-y-auto print:overflow-visible ${isSettings ? "" : "p-6 print:p-0"}`}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}