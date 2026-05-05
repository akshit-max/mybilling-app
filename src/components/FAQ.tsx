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
    <section className="py-24  bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">

        {/* HEADING */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-10">
          Frequently Asked Questions
        </h2>

        {/* FAQ LIST */}
        <div className="space-y-4">
          {faqs.map((item, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >

              {/* QUESTION */}
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-medium text-gray-900">
                  {item.q}
                </span>

                <ChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${
                    open === i ? "rotate-180 text-purple-600" : "text-gray-500"
                  }`}
                />
              </button>

              {/* ANSWER */}
              <div
                className={`px-6 transition-all duration-300 ease-in-out ${
                  open === i
                    ? "max-h-40 pb-4 opacity-100"
                    : "max-h-0 opacity-0"
                } overflow-hidden`}
              >
                <p className="text-gray-600 text-sm leading-relaxed">
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