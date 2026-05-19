"use client";

export default function Testimonials() {
  return (
    <section className="bg-slate-50 py-20 text-center select-none overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6">

        {/* HEADING */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Trusted Across Industries
          </h2>
          <p className="text-gray-500 mt-3 text-sm sm:text-base">
            See how small and medium enterprise owners simplified bookkeeping and accelerated cash collections.
          </p>
        </div>

        {/* CARDS */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              role: "Retail Store Owner",
              name: "Rajesh Kumar",
              quote: "Creating GST invoices is incredibly fast now. The dynamic stock adjustment saves me hours every single week!"
            },
            {
              role: "Wholesale Distributor",
              name: "Priyanka Patel",
              quote: "Outstanding balance calculations are perfectly transparent. Sending automated reminders reduced our collection cycles by 30%."
            },
            {
              role: "SME Manufacturer",
              name: "Anil Sharma",
              quote: "The hybrid offline mode is a lifesaver. We record transactions seamlessly even during connection fluctuations."
            }
          ].map((t, i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 flex flex-col justify-between"
            >
              {/* Quote Mark */}
              <div className="space-y-4">
                <span className="text-5xl font-serif text-indigo-200 leading-none select-none">“</span>
                <p className="text-sm text-gray-500 leading-relaxed italic">
                  {t.quote}
                </p>
              </div>

              {/* Author badge */}
              <div className="flex items-center gap-3.5 mt-8 pt-6 border-t border-slate-50">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{t.name}</p>
                  <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{t.role}</p>
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}