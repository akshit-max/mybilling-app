// "use client";
// import Image from "next/image";
// import { CheckCircle } from "lucide-react";

// export default function Hero() {
//   return (
//     <section className="bg-white  border-gray-200">
//       <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-12 items-center">

//         {/* LEFT */}
//         <div className="max-w-xl">

//           {/* TAG */}
//           <p className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded-md inline-block mb-4">
//             #1 GST Billing Software in India
//           </p>

//           {/* HEADING */}
//           <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
//             Smart GST Billing Software for{" "}
//             <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
//               Modern Businesses
//             </span>
//           </h1>

//           {/* DESCRIPTION */}
//           <p className="mt-5 text-gray-600 text-base leading-relaxed">
//             Create invoices in seconds, manage inventory, track payments and
//             simplify GST compliance — all in one platform.
//           </p>

//           {/* FEATURES */}
//           <div className="mt-6 space-y-3">
//             {[
//               "Create GST bills in seconds",
//               "Manage inventory efficiently",
//               "Track and collect payments faster",
//             ].map((item, i) => (
//               <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
//                 <CheckCircle className="text-brand-tertiary w-5 h-5" />
//                 {item}
//               </div>
//             ))}
//           </div>

//           {/* CTA */}
//           <div className="mt-8 flex gap-4">
//             <button
//               className="
//                 bg-gradient-to-r 
//                 from-purple-600 
//                 to-indigo-600 
//                 hover:from-purple-700 
//                 hover:to-indigo-700
//                 text-white 
//                 px-6 py-3 
//                 rounded-lg 
//                 text-sm 
//                 font-medium 
//                 transition
//                 shadow-sm hover:shadow-md
//               "
//             >
//               Start Free →
//             </button>

//             <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-sm hover:bg-gray-50 transition">
//               Book Demo
//             </button>
//           </div>

//           {/* TRUST */}
//           <div className="mt-10 flex items-center gap-8 text-sm text-gray-600">
//             <div>
//               <p className="font-semibold text-gray-900">100%</p>
//               <p>Secure</p>
//             </div>
//             <div>
//               <p className="font-semibold text-gray-900">4.7★</p>
//               <p>Rating</p>
//             </div>
//             <div>
//               <p className="font-semibold text-gray-900">1Cr+</p>
//               <p>Businesses</p>
//             </div>
//           </div>

//         </div>

//         {/* RIGHT */}
//         <div className="relative flex justify-center md:justify-end">

          
//           <div
//             className="
//               absolute 
//               w-[520px] 
//               h-[400px] 
//               bg-gradient-to-br 
//               from-purple-100 
//               via-indigo-100 
//               to-purple-100 
//               rounded-3xl 
//               opacity-50
//             "
//           />

         
//           <Image
//             src="/heroo.png"
//             alt="Dashboard preview"
//             width={700}
//             height={600}
//             priority
//             className="relative z-10 max-w-[700px]"
//           />
//         </div>

//       </div>
//     </section>
//   );
// }






"use client";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative bg-brand-primary text-white py-12 md:py-16 lg:py-20 overflow-hidden select-none font-sans">
      
      {/* 1. TOPOGRAPHY LINES SVG BACKGROUND PATTERN */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none select-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="waves" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 0 100 Q 50 50, 100 100 T 200 100" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-secondary/40"/>
              <path d="M 0 150 Q 50 100, 100 150 T 200 150" fill="none" stroke="currentColor" strokeWidth="1" className="text-brand-tertiary/30"/>
              <path d="M 0 50 Q 50 0, 100 50 T 200 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-brand-tertiary/30"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waves)"/>
        </svg>
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-6 relative z-10 grid md:grid-cols-12 gap-12 items-center">

        {/* LEFT COLUMN - TEXT & BULLETS & TRUST BADGES */}
        <div className="md:col-span-7 flex flex-col text-left space-y-10">
          
          {/* HEADING */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white max-w-2xl drop-shadow-sm">
            Best GST Billing Software for Small Business in India
          </h1>

          {/* GREEN CHECK BULLET POINTS */}
          <div className="space-y-3.5">
            {[
              { text: "Create GST bill in ", bold: "8 seconds" },
              { text: "Increase stock rotation ", bold: "2.8x faster" },
              { text: "Collect ", bold: "97% payments on time" }
            ].map((bullet, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm sm:text-base font-bold text-white/90">
                {/* Custom Green Checkmark */}
                <div className="bg-emerald-500 text-white rounded-full p-1 flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span>
                  {bullet.text}<strong>{bullet.bold}</strong>
                </span>
              </div>
            ))}
          </div>

          {/* ACTION BUTTON CTAS */}
          <div className="flex flex-wrap gap-4 pt-8 md:pt-15">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-brand-secondary hover:bg-brand-secondary/90 active:scale-[0.98] text-white font-extrabold rounded-full shadow-lg hover:shadow-brand-secondary/40 transition-all text-sm flex items-center gap-2 select-none"
            >
              Start Free Billing →
            </Link>

            <Link
              href="/login"
              className="px-8 py-3.5 border-2 border-white/20 hover:border-white/50 text-white font-extrabold rounded-full hover:bg-white/5 transition-all text-sm select-none shadow-sm backdrop-blur-sm"
            >
              Book Free Demo
            </Link>
          </div>

          {/* TRUST BADGES ROW SECTION */}
          <div className="flex flex-col space-y-3 pt-6 border-t border-white/10 max-w-lg">
            <p className="text-xs sm:text-sm font-extrabold text-white/80 uppercase tracking-widest">
              Trusted by 1 Crore+ Businesses
            </p>
            
            <div className="grid grid-cols-4 gap-2 items-center">
              {[
                { title: "BEST TECH BRANDS", subtitle: "#1 IN INDIA 2023" },
                { title: "EXCELLENCE IN GST", subtitle: "BUSINESS CONNECT 2023" },
                { title: "4.7 ★", subtitle: "GOOGLE PLAY" },
                { title: "100% DATA PRIVACY", subtitle: "GCA TRUSTED" }
              ].map((badge, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-1.5 border border-white/15 rounded-lg bg-white/5 backdrop-blur-sm select-none">
                  {/* Decorative laurel leaf SVG path */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-400 opacity-90 mb-1">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  <span className="text-[8px] font-extrabold leading-tight text-white">{badge.title}</span>
                  <span className="text-[7px] font-semibold text-white/60 leading-none">{badge.subtitle}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - ORIGINAL REAL HERO.PNG IMAGE */}
        <div className="md:col-span-5 flex justify-center relative mt-12 md:-mt-8 lg:-mt-12">
          <div className="absolute inset-0 bg-brand-secondary/30 blur-3xl rounded-full scale-90 opacity-70"></div>
          <div className="relative w-full max-w-[480px] sm:max-w-[550px] overflow-hidden rounded-2xl shadow-xl shadow-brand-secondary/20 transition-all hover:scale-[1.02] hover:shadow-brand-secondary/40 duration-500 ring-1 ring-white/20">
            <Image
              src="/dark-dashboard.png"
              alt="myBillBook Premium Dashboard Preview"
              width={550}
              height={380}
              priority
              className="w-full h-auto object-cover select-none"
            />
          </div>
        </div>

      </div>
    </section>
  );
}