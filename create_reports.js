const fs = require('fs');
const path = require('path');

// 1. Create daybook-purchase
const daybookSrc = 'src/app/dashboard/reports/daybook/page.tsx';
const daybookDestDir = 'src/app/dashboard/reports/daybook-purchase';
if (!fs.existsSync(daybookDestDir)) fs.mkdirSync(daybookDestDir, { recursive: true });

let dbContent = fs.readFileSync(daybookSrc, 'utf8');
dbContent = dbContent.replace(/DaybookReport/g, 'DaybookPurchaseReport');
dbContent = dbContent.replace(/<h2>Daybook Report<\/h2>/g, '<h2>Purchase Daybook Report</h2>');
dbContent = dbContent.replace(/<h1 className="text-base font-bold text-gray-800">Daybook<\/h1>/g, '<h1 className="text-base font-bold text-gray-800">Purchase Daybook</h1>');
dbContent = dbContent.replace(/<h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Daybook Report<\/h1>/g, '<h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Purchase Daybook Report</h1>');
// Remove Sales Invoices fetching
dbContent = dbContent.replace(/\/\/ Fetch Invoices \(Cash In\)[\s\S]*?\/\/ Fetch Purchases/g, '// Fetch Purchases');
fs.writeFileSync(path.join(daybookDestDir, 'page.tsx'), dbContent);
console.log('Created daybook-purchase');

// 2. Create gstr-2 from gstr-1
const gstr1Src = 'src/app/dashboard/reports/gstr-1/page.tsx';
const gstr2DestDir = 'src/app/dashboard/reports/gstr-2';
if (!fs.existsSync(gstr2DestDir)) fs.mkdirSync(gstr2DestDir, { recursive: true });

let gstrContent = fs.readFileSync(gstr1Src, 'utf8');
gstrContent = gstrContent.replace(/GSTR1Report/g, 'GSTR2Report');
gstrContent = gstrContent.replace(/GSTR-1/g, 'GSTR-2');
gstrContent = gstrContent.replace(/invoices/g, 'purchases');
gstrContent = gstrContent.replace(/customerName/g, 'customerName'); // keep it or change to supplierName
gstrContent = gstrContent.replace(/partyName \|\| "Cash Sale"/g, 'partyName || "Cash Purchase"');
gstrContent = gstrContent.replace(/Sales Invoice No/g, 'Purchase Invoice No');
gstrContent = gstrContent.replace(/invoiceNumber/g, 'purchaseInvoiceNumber');
fs.writeFileSync(path.join(gstr2DestDir, 'page.tsx'), gstrContent);
console.log('Created gstr-2');

