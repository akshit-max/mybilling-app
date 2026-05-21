const fs = require('fs');
const path = require('path');

const destPath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'receipt', '[id]', 'page.tsx');
let content = fs.readFileSync(destPath, 'utf8');

content = content.replace(/invoice\.invoiceNumber/g, 'invoice.purchaseInvoiceNumber');
content = content.replace(/invoiceNumber:/g, 'purchaseInvoiceNumber:');

fs.writeFileSync(destPath, content);
console.log("Fixed purchaseInvoiceNumber.");
