const fs = require('fs');
const path = require('path');

const targetFiles = [
  "src/app/dashboard/invoices/create/page.tsx",
  "src/app/dashboard/invoices/edit/[id]/page.tsx",
  "src/app/dashboard/pos-billing/page.tsx",
  "src/app/dashboard/quotations/create/page.tsx",
  "src/app/dashboard/quotations/edit/[id]/page.tsx",
  "src/app/dashboard/proforma-invoice/create/page.tsx",
  "src/app/dashboard/proforma-invoice/edit/[id]/page.tsx",
  "src/app/dashboard/automated-bills/create/page.tsx",
  "src/app/dashboard/automated-bills/edit/[id]/page.tsx",
  "src/app/dashboard/credit-note/create/page.tsx",
  "src/app/dashboard/credit-note/edit/[id]/page.tsx",
  "src/app/dashboard/sales-return/create/page.tsx",
  "src/app/dashboard/sales-return/edit/[id]/page.tsx",
  "src/app/dashboard/delivery-challan/create/page.tsx",
  "src/app/dashboard/delivery-challan/edit/[id]/page.tsx",
];

const basePath = "d:/Billing-app/billing-app";

for (const target of targetFiles) {
  const fullPath = path.join(basePath, target);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');

  // Add import if missing
  if (!content.includes('import { validateDiscount }')) {
    content = content.replace(
      /import \{ calculateInvoice/,
      `import { validateDiscount } from "@/lib/validateDiscount";\nimport { calculateInvoice`
    );
  }

  fs.writeFileSync(fullPath, content, 'utf8');
}
console.log("Imports patched successfully!");
