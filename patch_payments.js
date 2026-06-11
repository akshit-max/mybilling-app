const fs = require('fs');

const files = [
  'src/app/dashboard/payment-in/edit/[id]/page.tsx',
  'src/app/dashboard/payment-out/create/page.tsx',
  'src/app/dashboard/payment-out/edit/[id]/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Handle edit pages (.filter(c => c.name.toLowerCase().includes...))
  content = content.replace(/\.filter\(\s*(c|customer|p|party)\s*=>\s*\1\.name\.toLowerCase\(\)\.includes\(\s*(customerName|partyName)\.toLowerCase\(\)\s*\)\s*\)/g, (match, p1, p2) => {
    return `.filter(${p1} => ${p1}.name.toLowerCase().includes(${p2}.toLowerCase()) || (${p1}.gstin && ${p1}.gstin.toLowerCase().includes(${p2}.toLowerCase())))`;
  });

  // Handle create pages without filter
  if (!content.includes('partySearchQuery') && content.includes('{customers.map(') && !content.includes('customers.filter(')) {
    content = content.replace(/(const \[showPartyDropdown, setShowPartyDropdown\] = useState\(false\);)/, `$1\n  const [partySearchQuery, setPartySearchQuery] = useState("");`);
    content = content.replace(/(\+ Quick Add New Customer\s*<\/button>)/, `$1\n                      <div className="p-2 border-b border-gray-100">\n                        <input type="text" placeholder="Search by Name or GSTIN..." value={partySearchQuery} onChange={(e) => setPartySearchQuery(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold" onClick={(e) => e.stopPropagation()} />\n                      </div>`);
    content = content.replace(/\{customers\.map\(\s*(c|customer|p|party)\s*=>/g, (match, p1) => {
      return `{customers.filter(${p1} => ${p1}.name.toLowerCase().includes(partySearchQuery.toLowerCase()) || (${p1}.gstin && ${p1}.gstin.toLowerCase().includes(partySearchQuery.toLowerCase()))).map(${p1} =>`;
    });
  }

  if (!content.includes('partySearchQuery') && content.includes('{parties.map(') && !content.includes('parties.filter(')) {
    content = content.replace(/(const \[showPartyDropdown, setShowPartyDropdown\] = useState\(false\);)/, `$1\n  const [partySearchQuery, setPartySearchQuery] = useState("");`);
    content = content.replace(/(\+ Quick Add New Customer\s*<\/button>)/, `$1\n                      <div className="p-2 border-b border-gray-100">\n                        <input type="text" placeholder="Search by Name or GSTIN..." value={partySearchQuery} onChange={(e) => setPartySearchQuery(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold" onClick={(e) => e.stopPropagation()} />\n                      </div>`);
    content = content.replace(/\{parties\.map\(\s*(c|customer|p|party)\s*=>/g, (match, p1) => {
      return `{parties.filter(${p1} => ${p1}.name.toLowerCase().includes(partySearchQuery.toLowerCase()) || (${p1}.gstin && ${p1}.gstin.toLowerCase().includes(partySearchQuery.toLowerCase()))).map(${p1} =>`;
    });
  }

  fs.writeFileSync(file, content);
  console.log('Updated', file);
}
