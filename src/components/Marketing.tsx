"use client";

import Image from "next/image";
import { MessageSquare, Gift, ShoppingCart, Bell } from "lucide-react";
import { ReactNode } from "react";

export default function Marketing() {
  return (
    <section className="bg-white py-24 select-none relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

        {/* LEFT IMAGE */}
        <div className="flex justify-center md:justify-start relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur-md opacity-25"></div>
          <Image
            src="/customer.png"
            alt="Customer Marketing and Engagement Support"
            width={500}
            height={300}
            className="rounded-2xl shadow-xl relative z-10 border border-slate-100 object-cover"
          />
        </div>

        {/* RIGHT CONTENT */}
        <div className="max-w-xl text-left space-y-6">
          <div className="space-y-2">
            <span className="text-indigo-600 font-extrabold text-xs uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full">
              Your Personal Marketing Assistant
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight pt-1">
              Get more customers, get more from your customers
            </h2>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed">
            Nurture your customer relationships, launch standard campaigns, and create a modern online shop front in seconds.
          </p>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <Feature icon={<MessageSquare size={18} />} text="WhatsApp & SMS Marketing" />
            <Feature icon={<Gift size={18} />} text="Loyalty & Rewards Program" />
            <Feature icon={<ShoppingCart size={18} />} text="Online Store & Catalogue" />
            <Feature icon={<Bell size={18} />} text="Service Reminders & CRM" />
          </div>
        </div>
      </div>
    </section>
  );
}

type FeatureProps = {
  icon: ReactNode;
  text: string;
};

function Feature({ icon, text }: FeatureProps) {
  return (
    <div className="flex items-center gap-3.5 p-3.5 border border-slate-50 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200">
      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
        {icon}
      </div>
      <p className="text-xs font-bold text-gray-700 leading-tight">{text}</p>
    </div>
  );
}