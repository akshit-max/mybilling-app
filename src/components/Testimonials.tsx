"use client";

export default function Testimonials() {
  return (
    <section className="bg-white py-24 text-center select-none overflow-hidden relative font-sans">
      <div className="max-w-7xl mx-auto px-6">

        {/* HEADING */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-gray-500 tracking-tight pb-1 drop-shadow-sm">
            Trusted Across Industries
          </h2>
          <p className="text-brand-primary/60 mt-4 text-sm sm:text-lg font-medium">
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
              className="bg-slate-50 border border-brand-primary/5 rounded-[2rem] p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-brand-secondary/15 hover:-translate-y-1 flex flex-col justify-between ring-1 ring-black/5"
            >
              {/* Quote Mark */}
              <div className="space-y-4">
                <span className="text-5xl font-serif text-brand-primary/20 leading-none select-none">“</span>
                <p className="text-sm text-brand-primary/70 font-medium leading-relaxed italic">
                  {t.quote}
                </p>
              </div>

              {/* Author badge */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-brand-primary/5">
                <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-brand-primary leading-tight">{t.name}</p>
                  <p className="text-[10px] font-bold text-brand-primary/40 uppercase tracking-wider mt-0.5">{t.role}</p>
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}