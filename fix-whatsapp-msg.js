const fs = require('fs');
const path = require('path');

const files = [
  "purchase-return\\[id]\\page.tsx",
  "proforma-invoice\\[id]\\page.tsx",
  "sales-return\\[id]\\page.tsx",
  "quotations\\[id]\\page.tsx",
  "purchases\\receipt\\[id]\\page.tsx",
  "purchase-orders\\[id]\\page.tsx",
  "invoices\\[id]\\page.tsx",
  "delivery-challan\\[id]\\page.tsx",
  "credit-note\\[id]\\page.tsx",
  "debit-note\\[id]\\page.tsx",
  "automated-bills\\[id]\\page.tsx"
];

const basePath = "d:\\Billing-app\\billing-app\\src\\app\\dashboard";

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to remove the number part: *${...}*
  // e.g. Your Credit Note *${creditNote?.invoiceNumber || "N/A"}* has been generated.
  // We'll replace it with: Your Credit Note has been generated.
  content = content.replace(/ \*\$\{[^}]+\}\* has been generated/g, " has been generated");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed WhatsApp message in ${file}`);
});
