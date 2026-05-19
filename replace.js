const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/quotations/edit/[id]/page.tsx', 'utf8');

c = c.replace(/EditSalesInvoice/g, 'EditQuotation');
c = c.replace(/UPDATE SALES INVOICE/g, 'UPDATE QUOTATION');
c = c.replace(/Invoice No\./g, 'Quotation No.');
c = c.replace(/Invoice Date/g, 'Quotation Date');
c = c.replace(/Payment Terms/g, 'Valid For');
c = c.replace(/Due Date/g, 'Validity Date');
c = c.replace(/setInvoiceType\("invoice"\)/g, 'setInvoiceType("estimate")');
c = c.replace(/invoiceType: "invoice"/g, 'invoiceType: "estimate"');

fs.writeFileSync('src/app/dashboard/quotations/edit/[id]/page.tsx', c);
console.log("Replaced successfully for edit page!");
