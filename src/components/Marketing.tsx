"use client";

import Image from "next/image";
import { MessageSquare, Gift, ShoppingCart, Bell } from "lucide-react";
import { ReactNode } from "react";

export default function Marketing() {
  return (
    <section className="bg-slate-50 py-24 md:py-32 select-none relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

        {/* LEFT IMAGE */}
        <div className="flex justify-center md:justify-start relative z-10">
          <div className="absolute -inset-4 bg-gradient-to-tr from-brand-secondary/30 via-brand-primary/10 to-brand-secondary/20 rounded-[2.5rem] blur-2xl opacity-60"></div>
          <div className="relative rounded-[2rem] p-3 bg-white/40 border border-white/60 shadow-2xl backdrop-blur-xl">
            <Image
              src="/customer.png"
              alt="Customer Marketing and Engagement Support"
              width={520}
              height={340}
              className="rounded-2xl shadow-sm relative z-10 object-cover border border-white/50"
            />
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="max-w-xl text-left space-y-6 relative z-10">
          <div className="space-y-4">
            <span className="text-brand-primary font-extrabold text-[11px] uppercase tracking-widest bg-white shadow-sm px-4 py-2 rounded-full border border-brand-primary/10 inline-block">
              Your Personal Marketing Assistant
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-gray-700 to-gray-500 leading-[1.15] tracking-tight pt-2 pb-1 drop-shadow-sm">
              Get more customers, get more from your customers
            </h2>
          </div>

          <p className="text-brand-primary/70 font-semibold text-sm sm:text-lg leading-relaxed">
            Nurture your customer relationships, launch standard campaigns, and create a modern online shop front in seconds.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            <Feature icon={<MessageSquare size={20} />} text="WhatsApp & SMS Marketing" />
            <Feature icon={<Gift size={20} />} text="Loyalty & Rewards Program" />
            <Feature icon={<ShoppingCart size={20} />} text="Online Store & Catalogue" />
            <Feature icon={<Bell size={20} />} text="Service Reminders & CRM" />
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
    <div className="flex items-center gap-4 p-4 border border-brand-primary/10 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:shadow-brand-secondary/10 hover:border-brand-secondary/30 hover:-translate-y-1 transition-all duration-300">
      <div className="p-3 bg-slate-50 text-brand-secondary rounded-xl shadow-inner ring-1 ring-black/5">
        {icon}
      </div>
      <p className="text-sm font-extrabold text-brand-primary/90 leading-tight">{text}</p>
    </div>
  );
}