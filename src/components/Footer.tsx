"use client";

import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-brand-primary text-white pt-20 pb-10 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        {/* TOP GRID */}
        <div className="grid md:grid-cols-5 gap-12">
          {/* BRAND */}
          <div>
            <div className="flex items-center gap-1.5 z-50 mb-4">
              <div className="bg-brand-secondary text-white rounded-lg p-1 flex items-center justify-center shadow-md">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-45 transform">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <span className="font-extrabold text-white text-xl tracking-tight font-sans">
                Cloud <span className="text-brand-secondary">Ledger</span>
              </span>
            </div>

            <p className="text-sm text-white/60 leading-relaxed">
              Smart GST billing software built for modern businesses in India.
              Manage invoices, inventory, and payments — all in one place.
            </p>

            {/* SOCIAL */}
            <div className="flex gap-4 mt-6">
              <IconWrap>
                <FaYoutube />
              </IconWrap>
              <IconWrap>
                <FaFacebook />
              </IconWrap>
              <IconWrap>
                <FaInstagram />
              </IconWrap>
            </div>
          </div>

          {/* COMPANY */}
          <FooterCol
            title="Company"
            items={["About Us", "Pricing", "Blog", "Careers"]}
          />

          {/* PRODUCT */}
          <FooterCol
            title="Product"
            items={["GST Billing", "Inventory", "Reports", "E-Invoicing"]}
          />

          {/* RESOURCES */}
          <FooterCol
            title="Resources"
            items={["Invoice Formats", "GST Guide", "Help Center", "FAQs"]}
          />

          {/* CONTACT */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Contact</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>support@Cloud Ledger.com</li>
              <li>+91 88911 77850</li>
              <li>Mon–Sat, 9AM–9PM</li>
            </ul>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Cloud Ledger. All rights reserved.
          </p>

          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/privacy-policy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-white transition">
              Terms & Conditions
            </Link>
            <span className="hover:text-white cursor-pointer transition">
              Refund Policy
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* 🔹 Reusable Column */
function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-semibold mb-4 text-white">{title}</h4>
      <ul className="space-y-2 text-sm text-white/60">
        {items.map((item, i) => (
          <li key={i} className="hover:text-white cursor-pointer transition">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* 🔹 Icon Wrapper */
function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition cursor-pointer text-lg">
      {children}
    </div>
  );
}
