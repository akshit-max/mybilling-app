const fs = require('fs');

const files = [
  'src/app/dashboard/invoices/create/page.tsx',
  'src/app/dashboard/invoices/edit/[id]/page.tsx',
  'src/app/dashboard/quotations/create/page.tsx',
  'src/app/dashboard/quotations/edit/[id]/page.tsx',
  'src/app/dashboard/proforma-invoice/create/page.tsx',
  'src/app/dashboard/proforma-invoice/edit/[id]/page.tsx',
  'src/app/dashboard/delivery-challan/create/page.tsx',
  'src/app/dashboard/delivery-challan/edit/[id]/page.tsx',
  'src/app/dashboard/credit-note/create/page.tsx',
  'src/app/dashboard/credit-note/edit/[id]/page.tsx',
  'src/app/dashboard/sales-return/create/page.tsx',
  'src/app/dashboard/sales-return/edit/[id]/page.tsx',
  'src/app/dashboard/automated-bills/create/page.tsx',
  'src/app/dashboard/automated-bills/edit/[id]/page.tsx',
  'src/app/dashboard/payment-in/create/page.tsx',
  'src/app/dashboard/pos-billing/page.tsx'
];

let updatedCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Handle edit pages (they already have .filter(c => c.name.toLowerCase().includes...))
  // They use customerName or partyName for searching
  content = content.replace(/\.filter\(\s*(c|customer|p|party)\s*=>\s*\1\.name\.toLowerCase\(\)\.includes\(\s*(customerName|partyName)\.toLowerCase\(\)\s*\)\s*\)/g, (match, p1, p2) => {
    return `.filter(${p1} => ${p1}.name.toLowerCase().includes(${p2}.toLowerCase()) || (${p1}.gstin && ${p1}.gstin.toLowerCase().includes(${p2}.toLowerCase())))`;
  });

  // 2. Handle create pages (they don't have .filter, just customers.map or parties.map)
  // First, inject partySearchQuery state if not present and if it's a create page pattern
  if (!content.includes('partySearchQuery') && content.includes('{customers.map(') && !content.includes('customers.filter(')) {
    // Inject state
    content = content.replace(/(const \[showPartyDropdown, setShowPartyDropdown\] = useState\(false\);)/, `$1\n  const [partySearchQuery, setPartySearchQuery] = useState("");`);
    
    // Inject search input in the dropdown
    content = content.replace(/(\+ Quick Add New Customer\s*<\/button>)/, `$1\n                      <div className="p-2 border-b border-gray-100">\n                        <input type="text" placeholder="Search by Name or GSTIN..." value={partySearchQuery} onChange={(e) => setPartySearchQuery(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold" onClick={(e) => e.stopPropagation()} />\n                      </div>`);

    // Add filter before map
    content = content.replace(/\{customers\.map\(\s*(c|customer|p|party)\s*=>/g, (match, p1) => {
      return `{customers.filter(${p1} => ${p1}.name.toLowerCase().includes(partySearchQuery.toLowerCase()) || (${p1}.gstin && ${p1}.gstin.toLowerCase().includes(partySearchQuery.toLowerCase()))).map(${p1} =>`;
    });
  }

  // Same for party/parties
  if (!content.includes('partySearchQuery') && content.includes('{parties.map(') && !content.includes('parties.filter(')) {
    content = content.replace(/(const \[showPartyDropdown, setShowPartyDropdown\] = useState\(false\);)/, `$1\n  const [partySearchQuery, setPartySearchQuery] = useState("");`);
    content = content.replace(/(\+ Quick Add New Customer\s*<\/button>)/, `$1\n                      <div className="p-2 border-b border-gray-100">\n                        <input type="text" placeholder="Search by Name or GSTIN..." value={partySearchQuery} onChange={(e) => setPartySearchQuery(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold" onClick={(e) => e.stopPropagation()} />\n                      </div>`);
    content = content.replace(/\{parties\.map\(\s*(c|customer|p|party)\s*=>/g, (match, p1) => {
      return `{parties.filter(${p1} => ${p1}.name.toLowerCase().includes(partySearchQuery.toLowerCase()) || (${p1}.gstin && ${p1}.gstin.toLowerCase().includes(partySearchQuery.toLowerCase()))).map(${p1} =>`;
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    updatedCount++;
    console.log(`Updated: ${file}`);
  }
}

console.log(`Total files updated: ${updatedCount}`);
