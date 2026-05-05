"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center text-lg font-semibold text-gray-900"
        >
          <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
            my
          </span>
          BillBook
        </Link>

        {/* LINKS */}
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          {/* FEATURES */}
          <div
            onMouseEnter={() => setOpen("features")}
            onMouseLeave={() => setOpen(null)}
            className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition"
          >
            Features <ChevronDown size={14} className="opacity-70" />
            {open === "features" && (
              <div className="absolute top-12 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-md p-4">
                <p className="text-xs text-gray-500 mb-2">Core</p>

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

                <p className="text-xs text-gray-500 mb-2">Advanced</p>

                {["E-Invoicing", "E-Way Billing", "Marketing Tools"].map(
                  (item, i) => (
                    <Link
                      key={i}
                      href="/features"
                      className="block px-3 py-2 rounded-md text-sm hover:bg-gray-50 hover:text-purple-600 transition"
                    >
                      {item}
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>

          {/* SOLUTIONS */}
          <div
            onMouseEnter={() => setOpen("solutions")}
            onMouseLeave={() => setOpen(null)}
            className="relative flex items-center gap-1 cursor-pointer hover:text-gray-900 transition"
          >
            Solutions <ChevronDown size={14} className="opacity-70" />
            {open === "solutions" && (
              <div className="absolute top-12 left-0 w-96 bg-white border border-gray-200 rounded-xl shadow-md p-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Industry</p>
                  <Link
                    href="/solutions"
                    className="block text-sm hover:text-purple-600 transition"
                  >
                    Retail
                  </Link>
                  <Link
                    href="/solutions"
                    className="block text-sm hover:text-purple-600 transition"
                  >
                    Wholesale
                  </Link>
                  <Link
                    href="/solutions"
                    className="block text-sm hover:text-purple-600 transition"
                  >
                    Manufacturing
                  </Link>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Sectors</p>
                  <Link
                    href="/solutions"
                    className="block text-sm hover:text-purple-600 transition"
                  >
                    Restaurant
                  </Link>
                  <Link
                    href="/solutions"
                    className="block text-sm hover:text-purple-600 transition"
                  >
                    Pharmacy
                  </Link>
                  <Link
                    href="/solutions"
                    className="block text-sm hover:text-purple-600 transition"
                  >
                    FMCG
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* PRICING */}
          <Link href="/pricing" className="hover:text-gray-900 transition">
            Pricing
          </Link>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Login
          </Link>

          <Link
            href="/demo"
            className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Book Demo
          </Link>

          {/* 🔥 GRADIENT CTA (matches Hero) */}
          <Link
            href="/signup"
            className="
              text-sm 
              bg-gradient-to-r 
              from-purple-600 
              to-indigo-600 
              hover:from-purple-700 
              hover:to-indigo-700
              text-white 
              px-5 py-2 
              rounded-lg 
              font-medium 
              transition
              shadow-sm hover:shadow-md
            "
          >
            Start Free
          </Link>
        </div>
      </div>
    </nav>
  );
}
