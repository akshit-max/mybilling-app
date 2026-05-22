const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/dashboard/purchase-orders/create/page.tsx',
  'src/app/dashboard/purchase-orders/edit/[id]/page.tsx',
  'src/app/dashboard/purchase-return/create/page.tsx',
  'src/app/dashboard/purchase-return/edit/[id]/page.tsx',
  'src/app/dashboard/debit-note/create/page.tsx',
  'src/app/dashboard/debit-note/edit/[id]/page.tsx',
];

for (const relPath of filesToUpdate) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Change d.data().invoiceNumber to d.data().purchaseInvoiceNumber
  content = content.replace(/invoiceNumber: d\.data\(\)\.invoiceNumber/g, 'invoiceNumber: d.data().purchaseInvoiceNumber');

  fs.writeFileSync(fullPath, content);
  console.log("Fixed: " + fullPath);
}

console.log("Done fixing invoice property.");
