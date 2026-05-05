import Image from "next/image";

export default function CTA() {
  return (
    <section className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 text-white py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-2 items-center gap-16">

          {/* LEFT */}
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight">
              Start using myBillBook today
            </h2>

            <p className="mt-4 text-white/80 text-sm">
              Create invoices, manage inventory, and track payments —
              all in one powerful platform.
            </p>

            <div className="mt-8 flex items-center bg-white/90 backdrop-blur rounded-full p-1 shadow-lg max-w-md">
              <input
                type="text"
                placeholder="+91 Enter mobile number"
                className="flex-1 px-5 py-3 text-black text-sm bg-transparent outline-none"
              />
              <button className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 rounded-full text-sm font-medium shadow-md">
                Start Free →
              </button>
            </div>

            <p className="text-xs text-white/70 mt-3">
              No credit card required
            </p>
          </div>

          {/* RIGHT IMAGE FIX */}
          <div className="relative flex justify-center md:justify-end">

            {/* Glow */}
            <div className="absolute w-[350px] h-[350px] bg-purple-500/30 blur-3xl rounded-full"></div>

            {/* IMAGE */}
            <Image
              src="/mobile.png"
              alt="mobile app"
              width={400}
              height={600}
              className="relative rounded-4xl z-10 object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.4)] scale-105"
              priority
            />

          </div>

        </div>

      </div>
    </section>
  );
}