"use client";

import Image from "next/image";
import { MessageSquare, Gift, ShoppingCart, Bell } from "lucide-react";
import { ReactNode } from "react";

export default function Marketing() {
  return (
    <section className="bg-slate-50 py-24 md:py-32 select-none relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.15]"></div>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

        {/* LEFT IMAGE */}
        <div className="flex justify-center md:justify-start relative z-10">
          <div className="relative rounded-[16px] p-2 bg-white border border-gray-200 shadow-md">
            <Image
              src="/customer.png"
              alt="Customer Marketing and Engagement Support"
              width={520}
              height={340}
              className="rounded-[12px] shadow-sm relative z-10 object-cover border border-gray-100"
            />
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="max-w-xl text-left space-y-6 relative z-10">
          <div className="space-y-4">
            <span className="text-brand-primary font-bold text-[13px] uppercase tracking-widest bg-white shadow-sm px-4 py-2 rounded-[8px] border border-gray-200 inline-block">
              Your Personal Marketing Assistant
            </span>
            <h2 className="text-3xl md:text-[40px] font-bold text-brand-primary leading-[1.15] tracking-tight pt-2 pb-1 drop-shadow-sm">
              Get more customers, get more from your customers
            </h2>
          </div>

          <p className="text-brand-primary/70 font-medium text-[16px] leading-relaxed">
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
    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-[12px] bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
      <div className="p-3 bg-slate-50 text-brand-secondary rounded-[8px] border border-gray-100 transition-colors group-hover:bg-brand-secondary group-hover:text-white duration-300">
        {icon}
      </div>
      <p className="text-[16px] font-bold text-brand-primary/90 leading-tight">{text}</p>
    </div>
  );
}