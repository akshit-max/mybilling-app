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
  Indent,
  Lock,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";
import { useSession, SessionProfile } from "@/context/SessionContext";
import { useChat } from "@/context/ChatContext";
import { hashPin } from "@/lib/crypto";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";

export function Topbar({ toggleSidebar, toggleMobileMenu }: { toggleSidebar?: () => void, toggleMobileMenu?: () => void }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { isChatOpen, openChat, closeChat } = useChat();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const { activeProfile, subUsers, switchProfile, adminPin, isSessionUnlocked, unlockSession } = useSession();

  // Premium PIN Modal State
  const [pendingProfile, setPendingProfile] = useState<SessionProfile | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Lockout Timer Effect
  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => setLockoutTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Handle number pad input
  const handlePinKey = (num: string) => {
    if (pinInput.length < 4 && !lockoutTimer && !verifying) {
      setPinInput(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    if (!lockoutTimer && !verifying) setPinInput(prev => prev.slice(0, -1));
  };

  // Verify PIN Effect when length is 4
  useEffect(() => {
    if (pinInput.length === 4 && pendingProfile && !lockoutTimer) {
      verifyPin();
    }
  }, [pinInput]);

  const verifyPin = async () => {
    setVerifying(true);
    const hashedInput = await hashPin(pinInput);
    
    let isCorrect = false;
    if (pendingProfile?.id === "admin") {
       isCorrect = hashedInput === adminPin;
    } else {
       isCorrect = hashedInput === pendingProfile?.passcode;
    }

    if (isCorrect) {
        setPinSuccess(true);
       
       // Log to Activity Tracker securely
       try {
           const user = auth.currentUser;
           if (user) {
              await addDoc(collection(db, "systemLogs"), {
                 userId: user.uid,
                 activity: "Session Switched",
                 details: `${activeProfile.name} securely switched to ${pendingProfile?.name || 'Unknown'}`,
                 performedBy: activeProfile.name,
                 createdAt: new Date()
              });
           }
       } catch (e) {}

       // Reset attempts on success
       localStorage.removeItem("pin_attempts");

       setTimeout(() => {
           if (pendingProfile) {
               unlockSession(pendingProfile.id);
               switchProfile(pendingProfile);
               toast.success(`Welcome, ${pendingProfile.name}`);
               setTimeout(() => { window.location.href = '/dashboard'; }, 800);
           }
           setPendingProfile(null);
           setVerifying(false);
           setPinInput("");
           setPinSuccess(false);
       }, 800); // Wait for success animation
    } else {
       setPinError(true);
       
       // Progressive Lockout logic
       const attempts = parseInt(localStorage.getItem("pin_attempts") || "0") + 1;
       localStorage.setItem("pin_attempts", attempts.toString());
       
       if (attempts >= 6) {
           setLockoutTimer(300); // 5 mins
           toast.error("Too many failed attempts. System locked for 5 minutes.");
           localStorage.setItem("pin_attempts", "0"); 
       } else if (attempts >= 3) {
           setLockoutTimer(30); // 30 secs
           toast.error("Too many failed attempts. Try again in 30 seconds.");
       } else {
           toast.error(`Incorrect PIN. ${3 - attempts} attempts left.`);
       }

       setTimeout(() => {
          setPinInput("");
          setPinError(false);
          setVerifying(false);
       }, 500); // Wait for shake animation
    }
  };

  const handleProfileClick = (profile: SessionProfile) => {
    setShowProfileDropdown(false);
    
    if (profile.id === activeProfile.id) return;
    
    // First-use Setup: If switching to Admin and no Admin PIN is set
    if (profile.id === "admin" && !adminPin) {
       toast.error("Admin Master PIN not configured. Please setup in Settings first.");
       return;
    }

    // Strict Enforcement: If sub-user has no PIN
    if (profile.id !== "admin" && !profile.passcode) {
        toast.error(`Setup Required: Go to Manage Users to configure a PIN for ${profile.name} before switching.`);
        return;
    }

    // Security: Always prompt for PIN, bypassing the 15-min cache 
    // to ensure maximum security on every profile switch.
    
    // Mount Premium Modal
    setPendingProfile(profile);
    setPinInput("");
    setPinError(false);
    setPinSuccess(false);
  };

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

    // Clean nested sub-routes
    if (pathname.includes("/dashboard/invoices/edit/")) return "Edit Sales Invoice";
    if (pathname.includes("/dashboard/invoices/create")) return "Create Sales Invoice";
    if (pathname.startsWith("/dashboard/invoices/")) return "Sales Invoice Details";

    if (pathname.includes("/dashboard/purchases/edit/")) return "Edit Purchase Invoice";
    if (pathname.includes("/dashboard/purchases/create")) return "Create Purchase Invoice";
    if (pathname.startsWith("/dashboard/purchases/")) return "Purchase Invoice Details";

    if (pathname.includes("/dashboard/payment-in/edit/")) return "Edit Payment In";
    if (pathname.includes("/dashboard/payment-in/create")) return "Record Payment In";
    if (pathname.startsWith("/dashboard/payment-in/")) return "Payment In Details";

    if (pathname.includes("/dashboard/payment-out/edit/")) return "Edit Payment Out";
    if (pathname.includes("/dashboard/payment-out/create")) return "Record Payment Out";
    if (pathname.startsWith("/dashboard/payment-out/")) return "Payment Out Details";

    if (pathname.includes("/dashboard/sales-return/edit/")) return "Edit Sales Return";
    if (pathname.includes("/dashboard/sales-return/create")) return "Create Sales Return";
    if (pathname.startsWith("/dashboard/sales-return/")) return "Sales Return Details";

    if (pathname.includes("/dashboard/purchase-return/edit/")) return "Edit Purchase Return";
    if (pathname.includes("/dashboard/purchase-return/create")) return "Create Purchase Return";
    if (pathname.startsWith("/dashboard/purchase-return/")) return "Purchase Return Details";

    if (pathname.includes("/dashboard/quotations/edit/")) return "Edit Quotation";
    if (pathname.includes("/dashboard/quotations/create")) return "Create Quotation";
    if (pathname.startsWith("/dashboard/quotations/")) return "Quotation Details";

    if (pathname.includes("/dashboard/reports")) return "Reports";
    if (pathname.includes("/dashboard/products")) return "Items";
    if (pathname.includes("/dashboard/customers")) return "Parties";
    if (pathname.includes("/dashboard/purchases")) return "Purchase Invoices";
    if (pathname.includes("/dashboard/payment-in")) return "Payment-in";
    if (pathname.includes("/dashboard/payment-out")) return "Payment-out";
    if (pathname.includes("/dashboard/sales-return")) return "Sales Return";
    if (pathname.includes("/dashboard/settings")) return "Settings";
    
    // Fallback: capitalize the last segment, but strip Firestore ID / UUID
    const segments = pathname.split('/').filter(Boolean);
    let last = segments[segments.length - 1];
    if (last && (last.length > 15 || /^[0-9a-fA-F-]{20,}$/.test(last))) {
      // Use parent segment instead
      last = segments[segments.length - 2] || "Dashboard";
    }
    return last ? last.charAt(0).toUpperCase() + last.slice(1) : "Dashboard";
  };

  return (
    <header className="h-16 border-b flex items-center justify-between px-4 md:px-8 flex-shrink-0 font-sans relative shadow-sm bg-white border-brand-primary/10">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileMenu} 
          className="md:hidden p-2 -ml-2 text-brand-primary/70 hover:bg-brand-neutral rounded-xl transition-colors"
        >
          <Menu size={22} />
        </button>
        <button 
          onClick={toggleSidebar} 
          className="hidden md:block p-2 -ml-2 text-brand-primary/60 hover:bg-brand-neutral hover:text-brand-secondary rounded-xl transition-colors"
          title="Toggle Sidebar"
        >
          <Indent size={20} />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-brand-primary tracking-tight">{getPageTitle()}</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-5">
        {/* Icon Nav */}
        <div className="flex items-center gap-2 text-brand-primary/60">
          <button 
            onClick={() => setShowInstallModal(true)}
            className="p-2.5 hover:bg-brand-neutral rounded-xl transition-colors flex items-center justify-center relative" 
            title="Download Desktop App"
          >
            <Monitor size={22} strokeWidth={1.5} className="text-brand-primary/70 hover:text-brand-secondary transition-colors" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-secondary rounded-full shadow-sm"></span>
          </button>
          
          {/* <a 
            href="https://mybillbook.featurebase.app/changelog" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center" 
            title="Announcements"
          >
            <Megaphone size={20} strokeWidth={1.5} className="hover:text-indigo-600 transition-colors" />
          </a> */}

          <Link 
            href="/dashboard/settings/refer-and-earn" 
            className="p-2.5 hover:bg-brand-neutral rounded-xl transition-colors flex items-center justify-center" 
            title="Refer a friend"
          >
            <Gift size={22} strokeWidth={1.5} className="text-brand-primary/70 hover:text-brand-secondary transition-colors" />
          </Link>

          {/* Profile Switcher Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-brand-neutral rounded-xl transition-colors border border-transparent hover:border-brand-primary/10 ml-2"
              title="Switch Active Profile"
            >
              <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {activeProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-[12px] font-bold text-brand-primary leading-tight">{activeProfile.name}</span>
                <span className="text-[10px] text-brand-primary/60 leading-tight tracking-wide uppercase font-medium">{activeProfile.role}</span>
              </div>
              <ChevronDown size={14} className="text-brand-primary/40 ml-1 hidden sm:block" />
            </button>

            {showProfileDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)}></div>
                <div className="absolute right-0 mt-3 w-64 bg-white border border-brand-primary/10 rounded-2xl shadow-xl shadow-brand-primary/5 z-50 overflow-hidden">
                  <div className="px-5 py-3 bg-brand-neutral/50 border-b border-brand-primary/5">
                    <p className="text-[10px] font-bold text-brand-primary/50 uppercase tracking-widest">Switch Session</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                    {/* Admin Option */}
                    <button
                      onClick={() => handleProfileClick({ id: "admin", name: "Admin", role: "Admin", isAdmin: true })}
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
                        onClick={() => handleProfileClick(user)}
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
            className="p-2.5 hover:bg-brand-neutral rounded-xl transition-colors flex items-center justify-center ml-2" 
            title="Chat Support"
          >
            <MessagesSquare size={22} strokeWidth={1.5} className="text-brand-primary/70 hover:text-brand-secondary transition-colors" />
          </button>

          <button 
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2.5 hover:bg-brand-neutral rounded-xl transition-colors flex items-center justify-center" 
            title="Press ALT to open or close the shortcuts panel"
          >
            <Keyboard size={22} strokeWidth={1.5} className="text-brand-primary/70 hover:text-brand-secondary transition-colors" />
          </button>
        </div>

        {/* Action Button */}
        {/* <button className="ml-2 border border-blue-100 text-brand-primary hover:bg-blue-50 px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
          Book Demo
        </button> */}
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

      {/* PREMIUM PASSCODE MODAL */}
      {pendingProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setPendingProfile(null)}></div>
          
          <div className={`relative w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 animate-in zoom-in-95 duration-200 ${pinError ? "animate-[shake_0.4s_ease-in-out]" : ""} ${pinSuccess ? "ring-4 ring-green-500/50" : ""}`}>
            
            {/* Modal Header/Profile Info */}
            <div className="pt-8 pb-4 px-6 flex flex-col items-center justify-center relative">
              <button 
                onClick={() => setPendingProfile(null)}
                className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-lg mb-4 transition-transform duration-500 ${pinSuccess ? 'scale-110 bg-brand-tertiary text-white' : pendingProfile.id === 'superadmin' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : pendingProfile.id === 'admin' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                {pendingProfile.name.charAt(0).toUpperCase()}
              </div>
              
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">{pendingProfile.name}</h2>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full mt-1.5 uppercase tracking-widest">{pendingProfile.role}</span>
              
              <p className="text-xs text-gray-500 mt-4 font-medium">Enter 4-digit PIN to switch session</p>
            </div>

            {/* PIN Indicator Circles */}
            <div className="flex justify-center items-center gap-4 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-inner
                    ${pinSuccess ? "bg-brand-tertiary scale-110" : 
                      pinError ? "bg-red-500" : 
                      i < pinInput.length ? "bg-indigo-600 scale-110 shadow-indigo-600/50" : "bg-gray-200"
                    }
                  `}
                />
              ))}
            </div>

            {/* Lockout Timer Overlay */}
            {lockoutTimer > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-64 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-10 p-6 text-center border-t border-gray-100">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4 animate-pulse">
                  <Lock size={24} />
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Session Locked</h3>
                <p className="text-xs text-gray-500 font-medium">Too many incorrect attempts.</p>
                <div className="text-2xl font-black text-red-600 mt-4 tabular-nums">
                  {Math.floor(lockoutTimer / 60)}:{(lockoutTimer % 60).toString().padStart(2, '0')}
                </div>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="px-8 pb-8 pt-4">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinKey(num.toString())}
                    disabled={lockoutTimer > 0 || verifying}
                    className="h-14 rounded-2xl bg-gray-50/50 hover:bg-gray-100/80 active:bg-indigo-100 text-xl font-medium text-gray-800 flex items-center justify-center transition-colors border border-gray-100/50 hover:border-gray-200 disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
                <div className="col-start-2">
                  <button
                    onClick={() => handlePinKey("0")}
                    disabled={lockoutTimer > 0 || verifying}
                    className="w-full h-14 rounded-2xl bg-gray-50/50 hover:bg-gray-100/80 active:bg-indigo-100 text-xl font-medium text-gray-800 flex items-center justify-center transition-colors border border-gray-100/50 hover:border-gray-200 disabled:opacity-50"
                  >
                    0
                  </button>
                </div>
                <div className="col-start-3">
                  <button
                    onClick={handleBackspace}
                    disabled={lockoutTimer > 0 || verifying || pinInput.length === 0}
                    className="w-full h-14 rounded-2xl text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 active:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-30"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-10px); }
              40%, 80% { transform: translateX(10px); }
            }
          `}} />
        </div>
      )}
    </header>
  );
}
