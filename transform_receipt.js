const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'receipt', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements
content = content.replace(/Sales Invoice/g, 'Purchase Invoice');
content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "purchases")');
content = content.replace(/Invoice No\./g, 'Purchase No.');
content = content.replace(/Invoice Date:/g, 'Purchase Date:');
content = content.replace(/Bill To/g, 'Bill From');
content = content.replace(/Record Payment In/g, 'Record Payment Out');
content = content.replace(/Record Payment/g, 'Record Payment Out');
content = content.replace(/TAX INVOICE/g, 'PURCHASE');
content = content.replace(/invoiceNumber/g, 'purchaseInvoiceNumber');
content = content.replace(/Original Invoice No\./g, 'Original Invoice No:');

// Let's add Original Invoice No if it doesn't exist
const originalInvRegex = /Original Invoice No/;
if (!originalInvRegex.test(content)) {
    // Inject it in the "Ship From" or "Bill From" area
    const shipToArea = /<div className="w-1\/2">[\s\S]*?<h3 className="text-\[10px\] font-bold text-gray-500 uppercase tracking-wider mb-1">SHIP TO<\/h3>/;
    content = content.replace(shipToArea, (match) => {
        return match.replace('SHIP TO', 'SHIP FROM');
    });

    // Add Original Invoice No. to the header flex container where Invoice No/Date live
    const headerInfoBlock = /<div className="flex items-center justify-between text-xs font-bold text-gray-700 bg-gray-100\/50 p-2 rounded">/;
    if (content.includes(headerInfoBlock.source.replace(/\\/g, ''))) {
        content = content.replace(
            headerInfoBlock.source.replace(/\\/g, ''),
            `<div className="flex items-center justify-between text-xs font-bold text-gray-700 bg-gray-100/50 p-2 rounded">
                <div className="flex items-center gap-6">`
        );
        content = content.replace(
            /<div><span className="text-gray-500 mr-2">Due Date:<\/span> {invoice\.dueDate \|\| "-"\}<\/div>\n              <\/div>/,
            `<div><span className="text-gray-500 mr-2">Due Date:</span> {invoice.dueDate || "-"}</div>
                </div>
                {invoice.originalInvoiceNumber && (
                  <div><span className="text-gray-500 mr-2">Original Invoice No:</span> {invoice.originalInvoiceNumber}</div>
                )}
              </div>`
        );
    }
}

fs.writeFileSync(filePath, content);
console.log("Transformed purchases receipt page.");
