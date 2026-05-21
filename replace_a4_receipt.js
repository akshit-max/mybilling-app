const fs = require('fs');
const path = "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\sales-return\\[id]\\page.tsx";

let content = fs.readFileSync(path, "utf-8");

content = content.replace(/TAX INVOICE/g, "SALES RETURN / CR. NOTE");
content = content.replace(/Tax Invoice/g, "Sales Return / Cr. Note");
content = content.replace(/INVOICE NO/g, "SALES RETURN NO");
content = content.replace(/Invoice No/g, "Sales Return No");
content = content.replace(/Invoice Date/g, "Sales Return Date");
content = content.replace(/INVOICE DATE/g, "SALES RETURN DATE");
content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "salesReturns")');
content = content.replace(/doc\(db, "invoices"/g, 'doc(db, "salesReturns"');
content = content.replace(/\/dashboard\/invoices/g, '/dashboard/sales-return');
content = content.replace(/invoiceNumber/g, 'salesReturnNumber');

fs.writeFileSync(path, content, "utf-8");
console.log("Done A4 replacement");
