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

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    // Just replace everything from .filter to .map if it looks broken
    content = content.replace(/\.filter\([\s\S]*?\.map/g, (match) => {
      if (match.includes('=> .name')) {
         const isParty = match.includes('partyName');
         const q = isParty ? 'partyName' : 'customerName';
         return `.filter(c => c.name.toLowerCase().includes(${q}.toLowerCase()) || (c.gstin && c.gstin.toLowerCase().includes(${q}.toLowerCase())))\n                      .map`;
      }
      return match;
    });

    // Now properly implement the intended change for files that weren't broken
    // i.e., change .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()))
    content = content.replace(/\.filter\((c|customer|p|party) \=\> \1\.name\.toLowerCase\(\)\.includes\((customerName|partyName)\.toLowerCase\(\)\)\)/g, (match, p1, p2) => {
       return `.filter(${p1} => ${p1}.name.toLowerCase().includes(${p2}.toLowerCase()) || (${p1}.gstin && ${p1}.gstin.toLowerCase().includes(${p2}.toLowerCase())))`;
    });
    
    // Also handle simple .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())) but with .map after
    content = content.replace(/\.filter\((c|customer|p|party)\s*=>\s*\1\.name\.toLowerCase\(\)\.includes\((customerName|partyName)\.toLowerCase\(\)\)\)/g, (match, p1, p2) => {
       return `.filter(${p1} => ${p1}.name.toLowerCase().includes(${p2}.toLowerCase()) || (${p1}.gstin && ${p1}.toLowerCase().includes(${p2}.toLowerCase())))`;
    });

    fs.writeFileSync(f, content);
  }
});
