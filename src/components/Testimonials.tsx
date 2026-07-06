"use client";

export default function Testimonials() {
  return (
    <section className="bg-white py-24 text-center select-none overflow-hidden relative font-sans">
      <div className="max-w-7xl mx-auto px-6">

        {/* HEADING */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-[40px] font-bold text-brand-primary tracking-tight pb-1 drop-shadow-sm">
            Trusted Across Industries
          </h2>
          <p className="text-brand-primary/60 mt-4 text-[16px] font-medium">
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
              className="bg-white border border-gray-200 rounded-[12px] p-8 text-left transition-all duration-300 hover:shadow-md hover:-translate-y-1 shadow-sm flex flex-col justify-between"
            >
              {/* Quote Mark */}
              <div className="space-y-4">
                <span className="text-5xl font-serif text-brand-primary/20 leading-none select-none">“</span>
                <p className="text-[16px] text-brand-primary/70 font-medium leading-relaxed italic">
                  {t.quote}
                </p>
              </div>

              {/* Author badge */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                <div className="w-10 h-10 rounded-[8px] bg-brand-primary flex items-center justify-center text-white font-bold text-[16px] shadow-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-[16px] font-bold text-brand-primary leading-tight">{t.name}</p>
                  <p className="text-[13px] font-bold text-brand-primary/40 uppercase tracking-wider mt-0.5">{t.role}</p>
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}