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
      <div className="flex h-screen w-full bg-[#f4f5f7] overflow-hidden font-sans text-gray-800">
        {!isSettings && <Sidebar />}
        <div className="flex flex-col flex-1 min-w-0">
          {!isSettings && <Topbar />}
          <main className={`flex-1 overflow-y-auto ${isSettings ? "" : "p-6"}`}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}