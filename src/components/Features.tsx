const features = [
  "Fully customisable GST & non-GST invoices",
  "Multiple invoice themes (Thermal, A4, A5)",
  "Multi-user, multi-device, multi-business",
  "Billing + marketing tools (sales assistant)",
  "Available in multiple languages",
  "Customer support via Call, WhatsApp & Email",
  "Secure cloud storage with encryption",
  "Regular updates & no hidden charges",
];

export default function Features() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto text-center">

        <h2 className="text-3xl font-semibold">
          Built for growing businesses
        </h2>

        <p className="text-gray-500 mt-2">
          Powerful tools designed for efficiency, accuracy and growth
        </p>

        <div className="grid md:grid-cols-4 gap-6 mt-12">
          {features.map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border hover:shadow-lg transition"
            >
              <div className="text-indigo-600 text-xl mb-2">●</div>
              <p className="text-sm text-gray-700">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}