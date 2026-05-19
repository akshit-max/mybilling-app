"use client";

import {
  FileText,
  Boxes,
  Users,
  BarChart3,
  Landmark,
  ShieldCheck,
  Star,
} from "lucide-react";
import { ReactNode } from "react";

export default function Features() {
  return (
    <section className="bg-slate-50 py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* HEADING */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Everything you need to run your business
          </h2>
          <p className="text-gray-500 mt-3 text-sm sm:text-base">
            Powering small and medium enterprises with tools that automate invoicing, bookkeeping, and inventory.
          </p>
        </div>

        {/* FEATURE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <Card
            icon={<FileText size={22} />}
            title="GST Invoicing"
            desc="Create professional invoices in seconds with custom styles, colors, and GST compliance."
          />
          <Card
            icon={<Boxes size={22} />}
            title="Inventory Management"
            desc="Track stock levels in real-time, auto-adjust items, and receive low stock alerts."
          />
          <Card
            icon={<Users size={22} />}
            title="Customer Ledger"
            desc="Manage complete customer ledgers, track dynamic outstanding balances, and send WhatsApp alerts."
          />
          <Card
            icon={<BarChart3 size={22} />}
            title="Business Reports"
            desc="Obtain detailed sales reports, party outstanding, and profit-and-loss insights instantly."
          />
          <Card
            icon={<Landmark size={22} />}
            title="Payment Tracking"
            desc="Record standard payments, partial transactions, and update receipts dynamically."
          />
          <Card
            icon={<ShieldCheck size={22} />}
            title="GST Compliance"
            desc="Fully customized tax computations and automatic CGST/SGST splitting."
          />
        </div>
      </div>
    </section>
  );
}

/* ================= TYPES ================= */

type CardProps = {
  icon: ReactNode;
  title: string;
  desc: string;
};

type TestimonialProps = {
  name: string;
  company: string;
  text: string;
};

/* ================= COMPONENTS ================= */

function Card({ icon, title, desc }: CardProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 group">
      <div className="mb-5">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit transition-colors group-hover:bg-indigo-600 group-hover:text-white duration-300">
          {icon}
        </div>
      </div>

      <h4 className="font-bold text-gray-900 text-lg mb-2.5 transition-colors group-hover:text-indigo-600 duration-300">{title}</h4>

      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Testimonial({ name, company, text }: TestimonialProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4 items-start">
      {/* AVATAR */}
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />

      {/* CONTENT */}
      <div>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">“{text}”</p>

        <p className="text-sm font-medium text-gray-900">{name}</p>

        <p className="text-xs text-gray-500">{company}</p>

        {/* STARS */}
        <div className="flex gap-1 mt-2 text-yellow-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} fill="currentColor" />
          ))}
        </div>
      </div>
    </div>
  );
}
