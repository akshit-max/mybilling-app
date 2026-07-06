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
    <section className="bg-slate-50 py-24 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.15]"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* HEADING */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-[40px] font-bold text-brand-primary tracking-tight drop-shadow-sm pb-1">
            Everything you need to run your business
          </h2>
          <p className="text-brand-primary/60 mt-4 text-[16px] font-medium">
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
    <div className="bg-white border border-gray-200 rounded-[12px] p-8 text-left transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 group">
      <div className="mb-6">
        <div className="p-3 bg-slate-50 text-brand-primary rounded-[8px] w-fit border border-gray-100 transition-colors group-hover:bg-brand-secondary group-hover:text-white duration-300">
          {icon}
        </div>
      </div>

      <h4 className="font-bold text-brand-primary text-[20px] mb-3 transition-colors group-hover:text-brand-secondary duration-300">{title}</h4>

      <p className="text-[16px] text-brand-primary/60 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

function Testimonial({ name, company, text }: TestimonialProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-[12px] p-6 flex gap-4 items-start shadow-sm">
      {/* AVATAR */}
      <div className="w-12 h-12 rounded-[12px] bg-brand-neutral/50 flex-shrink-0" />

      {/* CONTENT */}
      <div>
        <p className="text-[16px] text-brand-primary/80 font-medium leading-relaxed mb-3">“{text}”</p>

        <p className="text-[16px] font-bold text-brand-primary">{name}</p>

        <p className="text-[13px] font-bold text-brand-primary/40 uppercase tracking-wider mt-0.5">{company}</p>

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
