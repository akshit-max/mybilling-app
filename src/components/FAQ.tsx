"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is billing software?",
      a: "Billing software helps businesses automate invoices, manage payments, and track finances efficiently.",
    },
    {
      q: "What is an invoice?",
      a: "An invoice is a document issued to a customer listing products/services and the amount due.",
    },
    {
      q: "Which billing software is best?",
      a: "The best billing software depends on your needs, but cloud-based GST billing tools are widely preferred.",
    },
  ];

  return (
    <section className="py-24 bg-white font-sans">
      <div className="max-w-4xl mx-auto px-6">

        {/* HEADING */}
        <h2 className="text-3xl md:text-[40px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-gray-500 text-center mb-10 tracking-tight pb-1 drop-shadow-sm">
          Frequently Asked Questions
        </h2>

        {/* FAQ LIST */}
        <div className="space-y-4">
          {faqs.map((item, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-[12px] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >

              {/* QUESTION */}
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-bold text-[16px] text-brand-primary">
                  {item.q}
                </span>

                <ChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${
                    open === i ? "rotate-180 text-brand-secondary" : "text-brand-primary/40"
                  }`}
                />
              </button>

              <div
                className={`px-6 transition-all duration-300 ease-in-out ${
                  open === i
                    ? "max-h-40 pb-5 opacity-100"
                    : "max-h-0 opacity-0"
                } overflow-hidden`}
              >
                <p className="text-brand-primary/70 font-medium text-[14px] leading-relaxed">
                  {item.a}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}