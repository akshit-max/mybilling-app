const fs = require('fs');

const files = [
  'src/app/dashboard/purchase-return/[id]/page.tsx',
  'src/app/dashboard/debit-note/[id]/page.tsx',
  'src/app/dashboard/credit-note/[id]/page.tsx',
  'src/app/dashboard/delivery-challan/[id]/page.tsx',
  'src/app/dashboard/proforma-invoice/[id]/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const rightActions = `
          {/* Right Actions Side (Eway / e-Invoice) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push(\`/dashboard/e-way-bill/generate/\${id}\`)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-md px-3.5 py-1.5 transition shadow-sm"
            >
              <FileSpreadsheet size={13} />
              <span>Generate E-way Bill</span>
            </button>
            
            <button 
              onClick={() => router.push(\`/dashboard/e-invoicing/generate/\${id}\`)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-md px-3.5 py-1.5 transition shadow-sm"
            >
              <CheckSquare size={13} />
              <span>Generate e-Invoice</span>
            </button>
          </div>`;

  if (content.includes(rightActions)) {
    content = content.replace(rightActions, '');
    changed = true;
  } else {
    // try a more generic replace if formatting changed
    const regex = /\{\/\* Right Actions Side \(Eway \/ e-Invoice\) \*\/\}\s*<div className="flex items-center gap-2">[\s\S]*?<span>Generate e-Invoice<\/span>\s*<\/button>\s*<\/div>/;
    if (regex.test(content)) {
       content = content.replace(regex, '');
       changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Removed E-Way/E-Invoice from ' + file);
  }
});
