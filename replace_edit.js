const fs = require('fs');
const path = "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\sales-return\\edit\\[id]\\page.tsx";

let content = fs.readFileSync(path, "utf-8");

content = content.replace(/EditInvoice/g, "EditSalesReturn");
content = content.replace(/Edit Invoice/g, "Edit Sales Return");
content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "salesReturns")');
content = content.replace(/doc\(db, "invoices"/g, 'doc(db, "salesReturns"');
content = content.replace(/invoiceNumber/g, 'salesReturnNumber');
content = content.replace(/invoiceDate/g, 'salesReturnDate');
content = content.replace(/\/dashboard\/invoices/g, '/dashboard/sales-return');
content = content.replace(/Invoice No\./g, 'Sales Return No.');
content = content.replace(/Invoice Date/g, 'Sales Return Date');
content = content.replace(/Create Invoice/g, 'Create Sales Return');

fs.writeFileSync(path, content, "utf-8");
console.log("Done replace edit");
