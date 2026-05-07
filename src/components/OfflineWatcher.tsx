"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfflineWatcher() {
  const router = useRouter();

  useEffect(() => {
    const handleOffline = () => {
      router.push("/offline");
    };

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  return null;
}