import Image from "next/image";

export default function CTA() {
  return (
    <section className="bg-brand-primary text-white py-28 overflow-hidden font-sans relative">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none select-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-waves" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 0 100 Q 50 50, 100 100 T 200 100" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-secondary/40"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-waves)"/>
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-2 items-center gap-16">

          {/* LEFT */}
          <div className="max-w-xl relative z-10">
            <h2 className="text-4xl md:text-[40px] font-bold leading-[1.1] tracking-tight text-white drop-shadow-sm">
              Start using Cloud Ledger today
            </h2>

            <p className="mt-4 text-white/80 text-[16px]">
              Create invoices, manage inventory, and track payments —
              all in one powerful platform.
            </p>

            <div className="mt-8 flex items-center bg-white rounded-[10px] p-1.5 shadow-sm max-w-md border border-white/20 focus-within:ring-2 focus-within:ring-brand-secondary focus-within:border-transparent transition-all">
              <input
                type="text"
                placeholder="+91 Enter mobile number"
                className="flex-1 px-5 py-3 text-brand-primary text-[16px] font-medium bg-transparent outline-none placeholder:text-brand-primary/40"
              />
              <button className="bg-brand-secondary hover:bg-brand-secondary/90 active:scale-[0.98] transition-all px-7 py-3.5 rounded-[8px] text-[14px] font-medium shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50">
                Start Free →
              </button>
            </div>

            <p className="text-[13px] text-white/70 mt-3">
              No credit card required
            </p>
          </div>

          {/* RIGHT IMAGE FIX */}
          <div className="relative flex justify-center md:justify-end">

            {/* IMAGE */}
            <Image
              src="/mobile.png"
              alt="mobile app"
              width={400}
              height={600}
              className="relative rounded-4xl z-10 object-contain drop-shadow-md scale-105"
              priority
            />

          </div>

        </div>

      </div>
    </section>
  );
}