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
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the double ?? introduced by bad regex: varName??.customerPhone -> varName?.customerPhone
  content = content.replace(/([a-zA-Z0-9]+)\?\?\.customerPhone/g, '$1?.customerPhone');

  // Also clean up the type annotation properly - replace:
  // let phone: string | undefined = xxx?.customerPhone;
  // with just:
  // let phone: string | undefined = xxx?.customerPhone;
  // (already correct if double ?? is fixed)

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed double-?? in ${file}`);
});
