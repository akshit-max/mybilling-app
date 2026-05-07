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
//                     href="/features"
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
//                       href="/features"
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
//                     href="/solutions"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Retail
//                   </Link>
//                   <Link
//                     href="/solutions"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Wholesale
//                   </Link>
//                   <Link
//                     href="/solutions"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Manufacturing
//                   </Link>
//                 </div>

//                 <div>
//                   <p className="text-xs text-gray-500 mb-2">Sectors</p>
//                   <Link
//                     href="/solutions"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Restaurant
//                   </Link>
//                   <Link
//                     href="/solutions"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     Pharmacy
//                   </Link>
//                   <Link
//                     href="/solutions"
//                     className="block text-sm hover:text-purple-600 transition"
//                   >
//                     FMCG
//                   </Link>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* PRICING */}
//           <Link href="/pricing" className="hover:text-gray-900 transition">
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
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center text-lg font-semibold text-gray-900 z-50"
        >
          <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
            my
          </span>
          BillBook
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          {/* FEATURES */}
          <div
            onMouseEnter={() => setOpen("features")}
            onMouseLeave={() => setOpen(null)}
            className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition py-4"
          >
            Features <ChevronDown size={14} className="opacity-70" />
            {open === "features" && (
              <div className="absolute top-14 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Core</p>
                {[
                  "GST Billing & Invoicing",
                  "Inventory Management",
                  "Bookkeeping",
                  "POS Billing",
                ].map((item, i) => (
                  <Link
                    key={i}
                    href="/features"
                    className="block px-3 py-2 rounded-md text-sm hover:bg-gray-50 hover:text-purple-600 transition"
                  >
                    {item}
                  </Link>
                ))}
                <div className="border-t my-3" />
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Advanced</p>
                {["E-Invoicing", "E-Way Billing", "Marketing Tools"].map((item, i) => (
                  <Link
                    key={i}
                    href="/features"
                    className="block px-3 py-2 rounded-md text-sm hover:bg-gray-50 hover:text-purple-600 transition"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* SOLUTIONS */}
          <div
            onMouseEnter={() => setOpen("solutions")}
            onMouseLeave={() => setOpen(null)}
            className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition py-4"
          >
            Solutions <ChevronDown size={14} className="opacity-70" />
            {open === "solutions" && (
              <div className="absolute top-14 left-0 w-96 bg-white border border-gray-200 rounded-xl shadow-lg p-6 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Industry</p>
                  <div className="space-y-2">
                    {["Retail", "Wholesale", "Manufacturing"].map((item) => (
                      <Link key={item} href="/solutions" className="block text-sm hover:text-purple-600 transition">
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Sectors</p>
                  <div className="space-y-2">
                    {["Restaurant", "Pharmacy", "FMCG"].map((item) => (
                      <Link key={item} href="/solutions" className="block text-sm hover:text-purple-600 transition">
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="/pricing" className="hover:text-gray-900 transition">
            Pricing
          </Link>
        </div>

        {/* DESKTOP CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition">
            Login
          </Link>
          <Link href="/demo" className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            Book Demo
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-sm hover:shadow-md"
          >
            Start Free
          </Link>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button 
          className="md:hidden p-2 text-gray-600 z-50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
                  <Link href="/features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
                  <Link href="/solutions" onClick={() => setMobileMenuOpen(false)}>Solutions</Link>
                  <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <p className="text-xs font-bold text-gray-400 uppercase mb-4">Account</p>
                <Link href="/login" className="block text-lg font-medium text-gray-900 mb-4">Login</Link>
              </div>
            </div>

            <div className="mt-auto space-y-3">
              <Link
                href="/demo"
                className="block w-full text-center py-3 border border-gray-300 rounded-xl font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Book Demo
              </Link>
              <Link
                href="/signup"
                className="block w-full text-center py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>

      </div>
    </nav>
  );
}