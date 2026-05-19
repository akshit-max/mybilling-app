"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ChatBot from "../ui/ChatBot";
import ShortcutsPanel from "../ui/ShortcutsPanel";
import { 
  Monitor, 
  Gift, 
  Megaphone, 
  User,
  MessagesSquare, 
  Keyboard,
  X
} from "lucide-react";
import toast from "react-hot-toast";

export function Topbar() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Listen to keyboard shortcuts
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, []);

  // Listen to PWA install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      toast.success("Desktop App Installed Successfully! 🎉");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Prioritize PWA installation so it syncs perfectly with Vercel deployment!
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
      setShowInstallModal(false);
    } else {
      // Fallback: Programmatically trigger the browser download of the pre-compiled native desktop application launcher
      const link = document.createElement("a");
      link.href = "/MyBillBook-32-bit.exe";
      link.download = "MyBillBook-32-bit.exe";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Downloading desktop launcher... 📦");
      setShowInstallModal(false);
    }
  };
  
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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 font-sans relative">
      <h1 className="text-lg font-medium text-gray-800">{getPageTitle()}</h1>
      
      <div className="flex items-center gap-4">
        {/* Icon Nav */}
        <div className="flex items-center gap-3 text-gray-500">
          <button 
            onClick={() => setShowInstallModal(true)}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center relative" 
            title="Download Desktop App"
          >
            <Monitor size={20} strokeWidth={1.5} className="text-gray-500 hover:text-indigo-600 transition-colors" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          </button>
          
          <a 
            href="https://mybillbook.featurebase.app/changelog" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center" 
            title="Announcements"
          >
            <Megaphone size={20} strokeWidth={1.5} className="hover:text-indigo-600 transition-colors" />
          </a>

          <Link 
            href="/dashboard/settings/refer-and-earn" 
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center" 
            title="Refer a friend"
          >
            <Gift size={20} strokeWidth={1.5} className="hover:text-indigo-600 transition-colors" />
          </Link>

          <a 
            href="https://mybillbook.featurebase.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center" 
            title="Share a suggestion"
          >
            <User size={20} strokeWidth={1.5} className="hover:text-indigo-600 transition-colors" />
          </a>

          <button 
            onClick={() => setShowChat(!showChat)}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center" 
            title="Chat Support"
          >
            <MessagesSquare size={20} strokeWidth={1.5} className="hover:text-blue-600 transition-colors" />
          </button>

          <button 
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center" 
            title="Press ALT to open or close the shortcuts panel"
          >
            <Keyboard size={20} strokeWidth={1.5} className="hover:text-indigo-600 transition-colors" />
          </button>
        </div>

        {/* Action Button */}
        <button className="ml-2 border border-blue-100 text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
          Book Demo
        </button>
      </div>

      {/* PWA INSTALLATION MODAL EXACTLY AS REQUESTED */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-150 animate-in fade-in zoom-in-95 duration-200 relative">
            
            {/* Close Button X */}
            <button 
              onClick={() => setShowInstallModal(false)}
              className="absolute right-4 top-4 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-400 hover:text-gray-700 shadow-md transition-colors"
            >
              <X size={15} />
            </button>

            {/* Laptop mockup on soft pink bg */}
            <div className="bg-[#FFF0F0] py-10 px-6 flex items-center justify-center border-b border-[#FFE4E4]">
              <img 
                src="/desktop_app_laptop_mockup.png" 
                alt="Desktop App Preview" 
                className="h-36 w-auto object-contain drop-shadow-xl"
              />
            </div>

            {/* Details panel */}
            <div className="p-6 text-center space-y-4">
              <h2 className="text-base font-bold text-gray-800 tracking-tight">
                New Desktop App Available Now!
              </h2>
              
              <button 
                onClick={handleInstallClick}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow transition-all duration-150 active:scale-[0.98]"
              >
                Download Desktop App
              </button>
            </div>

          </div>
        </div>
      )}

      {showChat && <ChatBot onClose={() => setShowChat(false)} />}
      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
    </header>
  );
}
