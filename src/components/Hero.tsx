"use client";
import Image from "next/image";
import { CheckCircle } from "lucide-react";

export default function Hero() {
  return (
    <section className="bg-white  border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-12 items-center">

        {/* LEFT */}
        <div className="max-w-xl">

          {/* TAG */}
          <p className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded-md inline-block mb-4">
            #1 GST Billing Software in India
          </p>

          {/* HEADING */}
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
            Smart GST Billing Software for{" "}
            <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Modern Businesses
            </span>
          </h1>

          {/* DESCRIPTION */}
          <p className="mt-5 text-gray-600 text-base leading-relaxed">
            Create invoices in seconds, manage inventory, track payments and
            simplify GST compliance — all in one platform.
          </p>

          {/* FEATURES */}
          <div className="mt-6 space-y-3">
            {[
              "Create GST bills in seconds",
              "Manage inventory efficiently",
              "Track and collect payments faster",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="text-green-500 w-5 h-5" />
                {item}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 flex gap-4">
            <button
              className="
                bg-gradient-to-r 
                from-purple-600 
                to-indigo-600 
                hover:from-purple-700 
                hover:to-indigo-700
                text-white 
                px-6 py-3 
                rounded-lg 
                text-sm 
                font-medium 
                transition
                shadow-sm hover:shadow-md
              "
            >
              Start Free →
            </button>

            <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-sm hover:bg-gray-50 transition">
              Book Demo
            </button>
          </div>

          {/* TRUST */}
          <div className="mt-10 flex items-center gap-8 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-gray-900">100%</p>
              <p>Secure</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">4.7★</p>
              <p>Rating</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">1Cr+</p>
              <p>Businesses</p>
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="relative flex justify-center md:justify-end">

          {/* SOFT BACKGROUND */}
          <div
            className="
              absolute 
              w-[520px] 
              h-[400px] 
              bg-gradient-to-br 
              from-purple-100 
              via-indigo-100 
              to-purple-100 
              rounded-3xl 
              opacity-50
            "
          />

          {/* IMAGE */}
          <Image
            src="/heroo.png"
            alt="Dashboard preview"
            width={700}
            height={600}
            priority
            className="relative z-10 max-w-[700px]"
          />
        </div>

      </div>
    </section>
  );
}