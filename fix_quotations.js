const fs = require('fs');

const fixes = [
  {
    file: 'src/app/dashboard/quotations/create/page.tsx',
    patches: [
      // 1. Fix invoiceType default: "invoice" -> "estimate"
      [
        `const [invoiceType, setInvoiceType] = useState<"invoice" | "estimate">("invoice");`,
        `const [invoiceType, setInvoiceType] = useState<"invoice" | "estimate">("estimate");`
      ],
      // 2. Fix back arrow href
      [
        `href="/dashboard/invoices" className="text-gray-400 hover:text-gray-700 transition-colors"`,
        `href="/dashboard/quotations" className="text-gray-400 hover:text-gray-700 transition-colors"`
      ],
      // 3. Fix header title
      [
        `<h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Create Sales Invoice</h1>`,
        `<h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Create Quotation / Estimate</h1>`
      ],
      // 4. Fix save button label
      [
        `{saving ? "Saving..." : "Save Invoice"}`,
        `{saving ? "Saving..." : "Save Quotation"}`
      ],
      // 5. Fix offline redirect
      [
        `toast.success("Invoice saved offline draft ✅");\n        router.push("/dashboard/invoices");`,
        `toast.success("Quotation saved offline draft ✅");\n        router.push("/dashboard/quotations");`
      ],
      // 6. Fix online redirect + toast
      [
        `toast.success("Sales Invoice created successfully! ✅");\n      router.push("/dashboard/invoices");`,
        `toast.success("Quotation created successfully! ✅");\n      router.push("/dashboard/quotations");`
      ],
      // 7. Fix error toast message
      [
        `toast.error("Failed to save Sales Invoice");`,
        `toast.error("Failed to save Quotation");`
      ],
      // 8. No stock deduction for estimates: wrap stock deduction block with invoiceType check
      // The stock deduction online is already guarded by `if (invoiceType === "invoice")`  so that's fine.
    ]
  },
  {
    file: 'src/app/dashboard/quotations/edit/[id]/page.tsx',
    patches: [
      // 1. Fix invoiceType default: "invoice" -> "estimate"
      [
        `const [invoiceType, setInvoiceType] = useState<"invoice" | "estimate">("invoice");`,
        `const [invoiceType, setInvoiceType] = useState<"invoice" | "estimate">("estimate");`
      ],
      // 2. Fix back arrow href  
      [
        `href="/dashboard/invoices" className="text-gray-400 hover:text-gray-700 transition-colors"`,
        `href="/dashboard/quotations" className="text-gray-400 hover:text-gray-700 transition-colors"`
      ],
      // 3. Fix header title (Edit page says UPDATE SALES INVOICE -> UPDATE QUOTATION)
      [
        `<h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">UPDATE SALES INVOICE</h1>`,
        `<h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">UPDATE QUOTATION</h1>`
      ],
      [
        `<h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">UPDATE Quotation</h1>`,
        `<h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">UPDATE QUOTATION</h1>`
      ],
      // 4. Fix update button label
      [
        `{saving ? "Updating..." : "Update Invoice"}`,
        `{saving ? "Updating..." : "Update Quotation"}`
      ],
      // 5. Fix offline redirect
      [
        `toast.success("Invoice saved locally ✅");\n        router.push("/dashboard/invoices");`,
        `toast.success("Quotation saved locally ✅");\n        router.push("/dashboard/quotations");`
      ],
      // 6. Fix online redirect + toast
      [
        `toast.success("Invoice updated successfully! ✅");\n      router.push("/dashboard/invoices");`,
        `toast.success("Quotation updated successfully! ✅");\n      router.push("/dashboard/quotations");`
      ],
      // 7. Fix error toast
      [
        `toast.error("Failed to update invoice workspace");`,
        `toast.error("Failed to update quotation");`
      ],
      // 8. Fix "Not found" redirect
      [
        `toast.error("Invoice record not found");\n          router.push("/dashboard/invoices");`,
        `toast.error("Quotation record not found");\n          router.push("/dashboard/quotations");`
      ],
    ]
  }
];

let errorCount = 0;

for (const { file, patches } of fixes) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of patches) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      console.log(`✅ Fixed in ${file}: "${from.substring(0, 60).replace(/\n/g, '\\n')}..."`);
    } else {
      // Try a substring match for diagnostic
      const key = from.substring(0, 40);
      if (content.includes(key)) {
        console.warn(`⚠️  Partial match in ${file}: "${key}..." - Exact match failed, might be already fixed.`);
      } else {
        console.error(`❌ No match in ${file}: "${key}..."`);
        errorCount++;
      }
    }
  }
  fs.writeFileSync(file, content);
}

console.log(`\nDone. Errors: ${errorCount}`);
