const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/quotations/[id]/page.tsx', 'utf8');

// General replacements
c = c.replace(/ViewInvoice/g, 'ViewQuotation');
c = c.replace(/Sales Invoice/g, 'Quotation');
c = c.replace(/TAX INVOICE/g, 'QUOTATION');
c = c.replace(/Invoice #/g, 'Quotation/Estimate #');
c = c.replace(/Invoice No\./g, 'Quotation No.');
c = c.replace(/Invoice Date:/g, 'Quotation Date:');
c = c.replace(/Invoice Date/g, 'Quotation Date');

// Add "Convert to Invoice" button next to the Share button
const convertBtn = `
          <button 
            onClick={() => router.push(\`/dashboard/invoices/create?fromQuote=\${id}\`)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Convert to Invoice
          </button>
`;
c = c.replace(
  /<button className="flex items-center gap-1\.5 px-3 py-1\.5 border border-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 bg-white transition-colors">[\s\S]*?<Share2 size={13} \/>[\s\S]*?<span>Share<\/span>[\s\S]*?<\/button>/,
  `$&
          ${convertBtn}`
);

fs.writeFileSync('src/app/dashboard/quotations/[id]/page.tsx', c);
console.log("Updated Quotation View page");
