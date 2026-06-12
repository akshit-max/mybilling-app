const fs = require('fs');
const files = [
  'd:/Billing-app/billing-app/src/app/dashboard/proforma-invoice/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/proforma-invoice/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/delivery-challan/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/delivery-challan/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/credit-note/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/credit-note/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/debit-note/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/debit-note/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-orders/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-orders/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/automated-bills/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/automated-bills/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/sales-return/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/sales-return/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-return/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-return/edit/[id]/page.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Fix validItems
  const validItemsRegex = /const validItems = items\.filter\(\(i\) => i\.name && Number\(i\.qty\) > 0 && Number\(i\.price\) > 0\)\.map\(\(i\) => \(\{\s*\.\.\.i,\s*qty: Number\(i\.qty\),\s*price: Number\(i\.price\)\s*\}\)\);/;
  
  if (validItemsRegex.test(content)) {
    content = content.replace(validItemsRegex, `const validItems = items.filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0).map((i) => {
    const sanitized = { ...i, qty: Number(i.qty), price: Number(i.price) };
    if (sanitized.productId === "CUSTOM") delete sanitized.productId;
    return sanitized;
  });`);
    changed = true;
  }

  // Also replace any multi-line variants just in case
  const validItemsRegexMulti = /const validItems = items\s*\n\s*\.filter\(\(i\) => i\.name && Number\(i\.qty\) > 0 && Number\(i\.price\) > 0\)\s*\n\s*\.map\(\(i\) => \(\{\s*\.\.\.i,\s*qty: Number\(i\.qty\),\s*price: Number\(i\.price\)\s*\}\)\);/;
  if (validItemsRegexMulti.test(content)) {
    content = content.replace(validItemsRegexMulti, `const validItems = items
    .filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0)
    .map((i) => {
      const sanitized = { ...i, qty: Number(i.qty), price: Number(i.price) };
      if (sanitized.productId === "CUSTOM") delete sanitized.productId;
      return sanitized;
    });`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed validItems for', file);
  }
}
