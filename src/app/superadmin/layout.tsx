"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Loader from "@/components/Loader";
import { SuperAdminSidebar } from "@/components/layout/SuperAdminSidebar";
import { SuperAdminTopbar } from "@/components/layout/SuperAdminTopbar";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace("/admin");
        return;
      }

      try {
        const platSnap = await getDoc(doc(db, "platformSettings", "security"));
        if (platSnap.exists() && platSnap.data().superAdminUid === user.uid) {
           setAuthorized(true);
        } else {
           router.replace("/admin");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/admin");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader size={48} />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex h-screen w-full bg-[#f4f5f7] overflow-hidden font-sans text-gray-800">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Area */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <SuperAdminSidebar 
          collapsed={isSidebarCollapsed} 
          setCollapsed={setIsSidebarCollapsed} 
          mobileOpen={isMobileMenuOpen}
          setMobileOpen={setIsMobileMenuOpen}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <SuperAdminTopbar 
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
