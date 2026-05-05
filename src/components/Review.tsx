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
    <section className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* HEADING */}
        <h2 className="text-center text-2xl md:text-3xl font-bold text-gray-900 mb-12">
          Everything you need to run your business
        </h2>

        {/* FEATURE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <Card
            icon={<FileText size={20} />}
            title="GST Invoicing"
            desc="Create professional invoices in seconds with GST."
          />
          <Card
            icon={<Boxes size={20} />}
            title="Inventory Management"
            desc="Track stock in real-time and never run out."
          />
          <Card
            icon={<Users size={20} />}
            title="Customer Management"
            desc="Manage customers, due payments and history."
          />
          <Card
            icon={<BarChart3 size={20} />}
            title="Business Reports"
            desc="Detailed reports to help you grow your business."
          />
          <Card
            icon={<Landmark size={20} />}
            title="Payment Tracking"
            desc="Track payments and send payment reminders."
          />
          <Card
            icon={<ShieldCheck size={20} />}
            title="GST Compliance"
            desc="Stay compliant with latest GST rules and filing."
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
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center transition hover:shadow-md">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
          {icon}
        </div>
      </div>

      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>

      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
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
