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
      <div className="min-h-screen flex items-center justify-center 
      bg-gradient-to-br from-[#0B1120] via-[#1E1B4B] to-[#4C1D95]">

        <div className="flex flex-col items-center gap-4">

          {/* Spinner */}
          <div className="w-12 h-12 border-4 border-white/20 border-t-purple-500 rounded-full animate-spin" />

          {/* Optional text */}
          <p className="text-white/60 text-sm">
            Checking authentication...
          </p>

        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}