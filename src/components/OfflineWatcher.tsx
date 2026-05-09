"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

type OfflineWatcherProps = {
  enableGlobalSync?: boolean;
};

export default function OfflineWatcher({
  enableGlobalSync = false,
}: OfflineWatcherProps) {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof indexedDB === "undefined"
    ) {
      return;
    }

    const runSync = async () => {
      if (!enableGlobalSync || !navigator.onLine) return;
      const { syncOfflineInvoices } = await import(
        "@/lib/syncOfflineInvoices"
      );
      toast.success("Syncing offline invoices...");
      await syncOfflineInvoices();
    };

    const handleOnline = () => {
      void runSync();
    };

    const handleOffline = () => {
      toast("You are offline. Changes will sync after reconnect.");
    };

    if (enableGlobalSync && navigator.onLine) {
      void runSync();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enableGlobalSync]);

  return null;
}