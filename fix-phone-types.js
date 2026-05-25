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

  // Fix: let phone = xxx?.customerPhone;  ->  let phone: string | undefined = xxx?.customerPhone;
  content = content.replace(
    /let phone = ([a-zA-Z0-9?]+)\.customerPhone;/g,
    'let phone: string | undefined = $1?.customerPhone;'
  );

  // Fix: phone = prompt(...)  ->  phone = prompt(...) ?? undefined;
  content = content.replace(
    /phone = prompt\("Customer phone number is missing\. Please enter the WhatsApp number:"\);/g,
    'phone = prompt("Customer phone number is missing. Please enter the WhatsApp number:") ?? undefined;'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed TypeScript types in ${file}`);
});
