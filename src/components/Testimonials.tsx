"use client";

export default function Testimonials() {
  return (
    <section className="bg-gray-50 py-16 text-center">
      <div className="max-w-7xl mx-auto px-6">

        {/* HEADING */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          Trusted Across Industries
        </h2>

        <p className="text-gray-600 mt-3">
          See how businesses transformed operations
        </p>

        {/* CARDS */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">

          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden transition hover:shadow-md"
            >
              {/* VIDEO / PREVIEW */}
              <div className="h-44 bg-gray-100 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-gray-700 shadow-sm">
                  ▶
                </div>
              </div>

              {/* CONTENT */}
              <div className="p-5 text-left">
                <p className="font-medium text-gray-900">
                  Business Owner
                </p>

                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  &quot;myBillBook helped streamline billing and increase revenue.&quot;
                </p>
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}