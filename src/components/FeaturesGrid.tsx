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
    <section className="bg-white py-24 select-none relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 text-center">

        {/* HEADING */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            A lot more than you can imagine
          </h2>
          <p className="text-gray-500 mt-3 text-sm sm:text-base">
            Engineered with enterprisegrade tools and modern safeguards to give your business a digital edge.
          </p>
        </div>

        {/* GRID */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">

          {features.map((f, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 group"
            >
              <div className="mb-5">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit transition-colors group-hover:bg-indigo-600 group-hover:text-white duration-300">
                  {f.icon}
                </div>
              </div>

              <p className="text-sm font-bold text-gray-700 leading-relaxed transition-colors group-hover:text-gray-900 duration-300">
                {f.text}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}