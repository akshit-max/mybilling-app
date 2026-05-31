"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // 🔥 FULL SCREEN LOADER
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <div className="flex flex-col items-center gap-6">
          {/* Sleek Premium Spinner */}
          <div className="relative flex items-center justify-center w-12 h-12">
            {/* Background Track */}
            <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100"></div>
            {/* Spinning Indicator */}
            <div className="absolute inset-0 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin"></div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <h3 className="text-gray-800 font-bold tracking-tight text-lg">Billing App</h3>
            <p className="text-indigo-600/70 text-xs font-bold uppercase tracking-widest animate-pulse">
              Authenticating...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}