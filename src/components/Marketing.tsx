"use client";

import Image from "next/image";
import { MessageSquare, Gift, ShoppingCart, Bell } from "lucide-react";
import { ReactNode } from "react";

export default function Marketing() {
  return (
    <section className=" bg-gray-50 py-24 my-2">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

        {/* LEFT IMAGE */}
        <div className="flex justify-center md:justify-start">
          <Image
            src="/customer.png"
            alt="marketing"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* RIGHT CONTENT */}
        <div className="max-w-xl">
          <p className="text-purple-600 text-sm mb-2">
            Your personal marketing assistant
          </p>

          <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Get more customers, get more from your customers
          </h2>

          <div className="grid grid-cols-2 gap-6 mt-6">

            <Feature icon={<MessageSquare />} text="WhatsApp & SMS Marketing" />
            <Feature icon={<Gift />} text="Loyalty & Rewards Program" />
            <Feature icon={<ShoppingCart />} text="Online Store & Catalogue" />
            <Feature icon={<Bell />} text="Service Reminders & CRM" />

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
    <div className="flex items-center gap-3">
      <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
        {icon}
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}