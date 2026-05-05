export default function Advanced() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto text-center">

        <h2 className="text-3xl font-semibold">
          Advanced GST & Accounting Features
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mt-10 text-left">

          <div className="p-6 bg-white rounded-xl border">
            <h3 className="font-semibold">GSTR Filing</h3>
            <p className="text-sm text-gray-600 mt-2">
              Export GSTR-1 data in JSON and file returns easily.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border">
            <h3 className="font-semibold">E-Invoicing</h3>
            <p className="text-sm text-gray-600 mt-2">
              Generate e-invoices and auto-sync with GST.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border">
            <h3 className="font-semibold">E-Way Billing</h3>
            <p className="text-sm text-gray-600 mt-2">
              Create e-way bills with validation checks.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border">
            <h3 className="font-semibold">Tally Export</h3>
            <p className="text-sm text-gray-600 mt-2">
              Export data to Tally automatically.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}