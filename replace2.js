const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/quotations/page.tsx', 'utf8');

c = c.replace(/SalesInvoicesPage/g, 'QuotationsPage');
c = c.replace(/Sales Invoices/g, 'Quotation / Estimate');

// Update Query
c = c.replace(
  /where\("userId", "==", userId\),/g,
  'where("userId", "==", userId),\n          where("invoiceType", "==", "estimate"),'
);

// Offline filter
c = c.replace(
  /offlineData = cached\.map/g,
  'offlineData = cached.filter(c => c.invoiceType === "estimate").map'
);

// Display mapping for 'pending' to 'open'
c = c.replace(
  /inv\.status/g,
  '(inv.status === "pending" ? "Open" : inv.status)'
);
// Fix getStatusStyle
c = c.replace(
  /if \(s === "pending" \|\| s === "credit"\)/g,
  'if (s === "pending" || s === "open") return "bg-yellow-50 text-yellow-600 border border-yellow-100";\n    if (s === "credit")'
);

// Dropdown routing
c = c.replace(
  /router\.push\(`\/dashboard\/invoices\/\$\{inv\.id\}`\)/g,
  'router.push(`/dashboard/quotations/${inv.id}`)'
);
c = c.replace(
  /router\.push\(`\/dashboard\/invoices\/edit\/\$\{inv\.id\}`\)/g,
  'router.push(`/dashboard/quotations/edit/${inv.id}`)'
);
// Remove the smart route branching from the copied invoice page
c = c.replace(
  /if \(inv\.invoiceType === "estimate"\) \{\s*router\.push\(`\/dashboard\/quotations\/edit\/\$\{inv\.id\}`\);\s*\} else \{\s*router\.push\(`\/dashboard\/quotations\/edit\/\$\{inv\.id\}`\);\s*\}/g,
  'router.push(`/dashboard/quotations/edit/${inv.id}`);'
);

// Create link
c = c.replace(
  /\/dashboard\/invoices\/create/g,
  '/dashboard/quotations/create'
);
c = c.replace(
  />\s*Create Quotation \/ Estimate\s*</g,
  '>Create Quotation<'
);

fs.writeFileSync('src/app/dashboard/quotations/page.tsx', c);
console.log("Quotations list page generated!");
