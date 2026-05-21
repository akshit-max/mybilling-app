const fs = require('fs');
const path = "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\sales-return\\create\\page.tsx";

let content = fs.readFileSync(path, "utf-8");

content = content.replace(/CreateSalesInvoice/g, "CreateSalesReturn");
content = content.replace(/Create Sales Invoice/g, "Create Sales Return");
content = content.replace(/Invoice No:/g, "Sales Return No:");
content = content.replace(/Invoice Date:/g, "Sales Return Date:");
content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "salesReturns")');
content = content.replace(/type="invoice"/g, 'type="sales-return"');
content = content.replace(/invoiceType === "estimate" \? "Estimate" : "Sales Invoice"/g, '"Sales Return"');
content = content.replace(/value=\{invoiceNumber\}/g, 'value={salesReturnNumber}');
content = content.replace(/setInvoiceNumber/g, 'setSalesReturnNumber');
content = content.replace(/const \[invoiceNumber/g, 'const [salesReturnNumber');
content = content.replace(/value=\{invoiceDate\}/g, 'value={salesReturnDate}');
content = content.replace(/setInvoiceDate/g, 'setSalesReturnDate');
content = content.replace(/const \[invoiceDate/g, 'const [salesReturnDate');
content = content.replace(/salesReturnNumber \? `\$\{salesReturnNumber\}`/g, 'salesReturnNumber ? `${salesReturnNumber}`');

fs.writeFileSync(path, content, "utf-8");
console.log("Done");
