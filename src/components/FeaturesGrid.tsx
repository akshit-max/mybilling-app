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
    { icon: <Globe size={20} />, text: "Available in multiple languages" },
    { icon: <Phone size={20} />, text: "Customer support via call, WhatsApp & email" },
    { icon: <Shield size={20} />, text: "Secure cloud storage with encryption" },
    { icon: <RefreshCcw size={20} />, text: "Regular updates & upgrades" },
    { icon: <Users size={20} />, text: "MSME community access" },
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-6 text-center">

        {/* HEADING */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">
          A lot more than you can imagine
        </h2>

        {/* GRID */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">

          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-6 text-left transition hover:shadow-md"
            >
              <div className="mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-md w-fit">
                  {f.icon}
                </div>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">
                {f.text}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}