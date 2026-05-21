const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'src', 'app', 'dashboard', 'invoices', '[id]', 'page.tsx');
const destPath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'receipt', '[id]', 'page.tsx');

let content = fs.readFileSync(sourcePath, 'utf8');

// Replacements to switch from Sales to Purchases
content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "purchases")');
content = content.replace(/doc\(db, "invoices", id\)/g, 'doc(db, "purchases", id)');
content = content.replace(/\/dashboard\/invoices/g, '/dashboard/purchases');

// Re-label headers and terminology
content = content.replace(/Sales Invoice/g, 'Purchase Invoice');
content = content.replace(/TAX INVOICE/g, 'PURCHASE INVOICE');
content = content.replace(/Invoice No\./g, 'Purchase No.');
content = content.replace(/Invoice Date:/g, 'Purchase Date:');

// Let's add Original Invoice No if it doesn't exist
const originalInvRegex = /Original Invoice No/;
if (!originalInvRegex.test(content)) {
    // Add Original Invoice No. to the meta info layout
    const metaBlock = /<div className="grid grid-cols-2 border-y border-gray-300 bg-gray-50\/60 px-4 py-2 mb-4 text-\[10px\] font-bold text-gray-700">[\s\S]*?<\/div>/;
    
    // Instead of messing with the meta block, let's change BILL TO -> BILL FROM, and SHIP TO -> SHIP FROM
    content = content.replace(/>BILL TO<\/p>/g, '>BILL FROM</p>');
    
    // Add "Original Invoice No:" next to Bill From
    content = content.replace(
        /(<div className="mb-4 space-y-0\.5 text-\[10px\]">)/,
        `<div className="flex justify-between">\n                  $1`
    );
    
    content = content.replace(
        /({invoice\.customerGSTIN && <p className="text-gray-650 font-mono">GSTIN: {invoice\.customerGSTIN}<\/p>}\n                  <\/div>)/,
        `$1\n                  <div className="mb-4 space-y-0.5 text-[10px] text-right">
                     <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">SHIP FROM</p>
                     <p className="text-xs font-extrabold text-gray-900">{company?.name || "self"}</p>
                     <p className="text-gray-650 font-semibold mt-2">Original Invoice No: {invoice.originalInvoiceNumber || "-"}</p>
                  </div>\n                  </div>`
    );
}

// Payment history -> "Record Payment Out"
content = content.replace(/Record Payment/g, 'Record Payment Out');
content = content.replace(/Record Payment In/g, 'Record Payment Out');

fs.writeFileSync(destPath, content);
console.log("Transformed purchases A4 receipt page.");
