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
  X,
  ChevronDown,
  Menu,
  Indent
} from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "@/context/SessionContext";
import { useChat } from "@/context/ChatContext";

export function Topbar({ toggleSidebar, toggleMobileMenu }: { toggleSidebar?: () => void, toggleMobileMenu?: () => void }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { isChatOpen, openChat, closeChat } = useChat();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const { activeProfile, subUsers, switchProfile } = useSession();

  // Listen to keyboard shortcuts
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      if (e.key === "h" && e.altKey) {
        e.preventDefault();
        if (isChatOpen) closeChat();
        else openChat();
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
    if (pathname.includes("/dashboard/payment-in")) return "Payment-in";
    if (pathname.includes("/dashboard/payment-out")) return "Payment-out";
    if (pathname.includes("/dashboard/sales-return")) return "Sales Return";
    if (pathname.includes("/dashboard/settings")) return "Settings";
    
    // Fallback: capitalize the last segment
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return last ? last.charAt(0).toUpperCase() + last.slice(1) : "Dashboard";
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 font-sans relative">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleMobileMenu} 
          className="md:hidden p-1.5 -ml-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <Menu size={20} />
        </button>
        <button 
          onClick={toggleSidebar} 
          className="hidden md:block p-1.5 -ml-2 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 rounded-md transition-colors"
          title="Toggle Sidebar"
        >
          <Indent size={18} />
        </button>
        <h1 className="text-lg font-medium text-gray-800">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
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

          {/* Profile Switcher Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 rounded-full transition-colors border border-transparent hover:border-gray-200"
              title="Switch Active Profile"
            >
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold">
                {activeProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-gray-800 leading-tight">{activeProfile.name}</span>
                <span className="text-[9px] text-gray-500 leading-tight">{activeProfile.role}</span>
              </div>
              <ChevronDown size={12} className="text-gray-400 ml-1" />
            </button>

            {showProfileDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Switch Session</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                    {/* Admin Option */}
                    <button
                      onClick={() => {
                        switchProfile({ id: "admin", name: "Admin", role: "Admin", isAdmin: true });
                        setShowProfileDropdown(false);
                        toast.success("Switched to Admin");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${activeProfile.id === "admin" ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
                      <div>
                        <p className={`text-xs font-bold ${activeProfile.id === "admin" ? "text-indigo-700" : "text-gray-800"}`}>Admin</p>
                        <p className="text-[9px] text-gray-500">Full Access</p>
                      </div>
                    </button>
                    
                    {/* Sub-Users List */}
                    {subUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchProfile(user);
                          setShowProfileDropdown(false);
                          toast.success(`Switched to ${user.name}`);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${activeProfile.id === user.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                      >
                        <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${activeProfile.id === user.id ? "text-indigo-700" : "text-gray-800"}`}>{user.name}</p>
                          <p className="text-[9px] text-gray-500">{user.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={() => isChatOpen ? closeChat() : openChat()}
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

      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
    </header>
  );
}
