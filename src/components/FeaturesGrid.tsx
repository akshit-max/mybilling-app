"use client";

import {
  Shield,
  Globe,
  Phone,
  RefreshCcw,
  Users,
} from "lucide-react";

export default function FeaturesGrid() {
  const features = [
    { icon: <Globe size={22} />, text: "Available in multiple regional languages" },
    { icon: <Phone size={22} />, text: "Instant customer support via call, WhatsApp & email" },
    { icon: <Shield size={22} />, text: "Highly secure cloud storage with end-to-end encryption" },
    { icon: <RefreshCcw size={22} />, text: "Automatic updates & routine feature upgrades" },
    { icon: <Users size={22} />, text: "Access to India's thriving MSME community network" },
  ];

  return (
    <section className="bg-slate-50 py-24 select-none relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">

        {/* HEADING */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-gray-500 tracking-tight pb-1 drop-shadow-sm">
            A lot more than you can imagine
          </h2>
          <p className="text-brand-primary/60 mt-4 text-sm sm:text-lg font-medium">
            Engineered with enterprise-grade tools and modern safeguards to give your business a digital edge.
          </p>
        </div>

        {/* GRID */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">

          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-brand-primary/5 rounded-[2rem] p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-brand-secondary/15 hover:-translate-y-1 group ring-1 ring-black/5"
            >
              <div className="mb-6">
                <div className="p-3.5 bg-brand-neutral/50 text-brand-primary rounded-xl w-fit transition-colors group-hover:bg-brand-secondary group-hover:text-white duration-300 shadow-sm">
                  {f.icon}
                </div>
              </div>

              <p className="text-sm font-bold text-brand-primary leading-relaxed transition-colors group-hover:text-brand-primary/80 duration-300">
                {f.text}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}