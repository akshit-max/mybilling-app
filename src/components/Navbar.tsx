// "use client";

// import { useState } from "react";
// import { ChevronDown } from "lucide-react";
// import Link from "next/link";

// export default function Navbar() {
//   const [open, setOpen] = useState<string | null>(null);

//   return (
//     <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
//       <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
//         {/* LOGO */}
//         <Link
//           href="/"
//           className="flex items-center text-lg font-semibold text-gray-900"
//         >
//           <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
//             my
//           </span>
//           BillBook
//         </Link>

//         {/* LINKS */}
//         <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
//           {/* FEATURES */}
//           <div
//             onMouseEnter={() => setOpen("features")}
//             onMouseLeave={() => setOpen(null)}
//             className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition"
//           >
//             Features <ChevronDown size={14} className="opacity-70" />
//             {open === "features" && (
//               <div className="absolute top-12 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-md p-4">
//                 <p className="text-xs text-gray-500 mb-2">Core</p>

//                 {[
//                   "GST Billing & Invoicing",
//                   "Inventory Management",
//                   "Bookkeeping",
//                   "POS Billing",
//                 ].map((item, i) => (
//                   <Link
//                     key={i}
//                     href="/login"
//                     className="block px-3 py-2 rounded-md text-sm hover:bg-gray-50 hover:text-purple-600 transition"
//                   >
//                     {item}
//                   </Link>
//                 ))}

//                 <div className="border-t my-3" />

//                 <p className="text-xs text-gray-500 mb-2">Advanced</p>

//                 {["E-Invoicing", "E-Way Billing", "Marketing Tools"].map(
//                   (item, i) => (
//                     <Link
//                       key={i}
//                       href="/login"
//                       className="block px-3 py-2 rounded-md text-sm hover:bg-gray-50 hover:text-purple-600 transition"
//                     >
//                       {item}
//                     </Link>
//                   ),
//                 )}
//               </div>
//             )}
//           </div>

//           {/* SOLUTIONS */}
//           <div
//             onMouseEnter={() => setOpen("solutions")}
//             onMouseLeave={() => setOpen(null)}
//             className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition"
//           >
//             Solutions <ChevronDown size={14} className="opacity-70" />
//             {open === "solutions" && (
//               <div className="absolute top-12 left-0 w-96 bg-white border border-gray-200 rounded-xl shadow-md p-6 grid grid-cols-2 gap-6">
//                 <div>
//                   <p className="text-xs text-gray-500 mb-2">Industry</p>
//                   <Link
//                     href="/login"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Retail
//                   </Link>
//                   <Link
//                     href="/login"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Wholesale
//                   </Link>
//                   <Link
//                     href="/login"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Manufacturing
//                   </Link>
//                 </div>

//                 <div>
//                   <p className="text-xs text-gray-500 mb-2">Sectors</p>
//                   <Link
//                     href="/login"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Restaurant
//                   </Link>
//                   <Link
//                     href="/login"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Pharmacy
//                   </Link>
//                   <Link
//                     href="/login"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     FMCG
//                   </Link>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* PRICING */}
//           <Link href="/login" className="hover:text-gray-900 transition">
//             Pricing
//           </Link>
//         </div>

//         {/* CTA */}
//         <div className="flex items-center gap-3">
//           <Link
//             href="/login"
//             className="text-sm text-gray-600 hover:text-gray-900 transition"
//           >
//             Login
//           </Link>

//           <Link
//             href="/demo"
//             className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
//           >
//             Book Demo
//           </Link>

//           {/* 🔥 GRADIENT CTA (matches Hero) */}
//           <Link
//             href="/signup"
//             className="
//               text-sm 
//               bg-gradient-to-r 
//               from-purple-600 
//               to-indigo-600 
//               hover:from-purple-700 
//               hover:to-indigo-700
//               text-white 
//               px-5 py-2 
//               rounded-lg 
//               font-medium 
//               transition
//               shadow-sm hover:shadow-md
//             "
//           >
//             Start Free
//           </Link>
//         </div>
//       </div>
//     </nav>
//   );
// }





"use client";

import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full flex flex-col sticky top-0 z-50">
      {/* 1. TOP PROMO BAR WITH SOFT COLOR GRADIENT */}
      <div className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary text-center py-2.5 text-[11px] font-bold text-white select-none border-b border-brand-primary/10">
        Save up to 55% today{" "}
        <Link href="/login" className="text-white hover:text-white/80 underline underline-offset-2 transition-colors ml-1 font-extrabold">
          Book 1:1 Demo →
        </Link>
      </div>

      {/* 2. MAIN NAVIGATION HEADER */}
      <nav className="bg-white border-b border-gray-200 h-16 w-full">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-1.5 z-50">
            <div className="bg-brand-secondary text-white rounded-lg p-1.5 flex items-center justify-center shadow-md">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-45 transform">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
            <span className="font-extrabold text-gray-800 text-base tracking-tight font-sans">
              Cloud <span className="text-brand-secondary">Ledger</span>
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-600">
            {/* FEATURES dropdown */}
            <div
              onMouseEnter={() => setOpen("features")}
              onMouseLeave={() => setOpen(null)}
              className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition py-4"
            >
              Features <ChevronDown size={12} className="opacity-70" />
              {open === "features" && (
                <div className="absolute top-14 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-wider">Core</p>
                  {[
                    "GST Billing & Invoicing",
                    "Inventory Management",
                    "Bookkeeping",
                    "POS Billing",
                  ].map((item, i) => (
                    <Link
                      key={i}
                      href="/login"
                      className="block px-3 py-2 rounded-md text-xs hover:bg-brand-neutral/50 hover:text-brand-primary transition"
                    >
                      {item}
                    </Link>
                  ))}
                  <div className="border-t my-3" />
                  <p className="text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-wider">Advanced</p>
                  {["E-Invoicing", "E-Way Billing", "Marketing Tools"].map((item, i) => (
                    <Link
                      key={i}
                      href="/login"
                      className="block px-3 py-2 rounded-md text-xs hover:bg-brand-neutral/50 hover:text-brand-primary transition"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* SOLUTIONS dropdown */}
            <div
              onMouseEnter={() => setOpen("solutions")}
              onMouseLeave={() => setOpen(null)}
              className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition py-4"
            >
              Solutions <ChevronDown size={12} className="opacity-70" />
              {open === "solutions" && (
                <div className="absolute top-14 left-0 w-96 bg-white border border-gray-200 rounded-xl shadow-lg p-6 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-3 font-bold uppercase tracking-wider">Industry</p>
                    <div className="space-y-2">
                      {["Retail", "Wholesale", "Manufacturing"].map((item) => (
                        <Link key={item} href="/login" className="block text-xs hover:text-brand-primary transition">
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-3 font-bold uppercase tracking-wider">Sectors</p>
                    <div className="space-y-2">
                      {["Restaurant", "Pharmacy", "FMCG"].map((item) => (
                        <Link key={item} href="/login" className="block text-xs hover:text-brand-primary transition">
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* KNOWLEDGE CENTRE dropdown placeholder */}
            <div
              onMouseEnter={() => setOpen("knowledge")}
              onMouseLeave={() => setOpen(null)}
              className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition py-4"
            >
              Knowledge Centre <ChevronDown size={12} className="opacity-70" />
              {open === "knowledge" && (
                <div className="absolute top-14 left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {["Help Guides", "GST Updates", "Video Tutorials"].map((item) => (
                    <Link key={item} href="/login" className="block px-3 py-1.5 rounded-md text-xs hover:bg-brand-neutral/50 hover:text-brand-primary transition">
                      {item}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login" className="hover:text-gray-900 transition">
              Pricing
            </Link>
          </div>

          {/* DESKTOP CTA - MODERN PILL STYLED */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition">
              Login
            </Link>
            <Link 
              href="/login" 
              className="text-xs font-bold border-2 border-brand-primary text-brand-primary px-5 py-2.5 rounded-full hover:bg-brand-primary/5 transition-colors shadow-sm select-none"
            >
              Book Free Demo
            </Link>
            <Link
              href="/signup"
              className="text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white px-5 py-2.5 rounded-full transition-all shadow-md select-none hover:shadow-lg active:scale-[0.98]"
            >
              Start Free Billing
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button 
            className="md:hidden p-2 text-gray-600 z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* MOBILE DRAWER */}
          <div className={`
            fixed inset-0 bg-white z-40 md:hidden transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}
          `}>
            <div className="flex flex-col h-full pt-20 px-6 pb-8">
              <div className="flex-1 space-y-6 overflow-y-auto">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-4">Product</p>
                  <div className="grid grid-cols-1 gap-4 text-lg font-medium text-gray-900">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Features</Link>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Solutions</Link>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-4">Account</p>
                  <Link href="/login" className="block text-lg font-medium text-gray-900 mb-4">Login</Link>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <Link
                  href="/login"
                  className="block w-full text-center py-3 border-2 border-brand-primary text-brand-primary rounded-full font-bold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Book Free Demo
                </Link>
                <Link
                  href="/signup"
                  className="block w-full text-center py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-full font-bold shadow-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Start Free Billing
                </Link>
              </div>
            </div>
          </div>

        </div>
      </nav>
    </div>
  );
}