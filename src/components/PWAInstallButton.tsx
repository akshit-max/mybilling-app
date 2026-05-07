"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();

      setDeferredPrompt(
        e as BeforeInstallPromptEvent
      );
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

  return (
  <div className="fixed bottom-6 right-6 z-[9999]">
    <button
      onClick={handleInstall}
      className="
        bg-gradient-to-r
        from-purple-600
        to-indigo-600
        hover:from-purple-700
        hover:to-indigo-700
        text-white
        px-5
        py-3
        rounded-2xl
        shadow-xl
        text-sm
        font-medium
        transition-all
        duration-200
        hover:scale-105
      "
    >
      Install App
    </button>
  </div>
);
}