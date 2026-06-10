const fs = require('fs');
const path = require('path');

const files = [
  { p: 'src/app/dashboard/invoices/edit/[id]/page.tsx', check: true },
  { p: 'src/app/dashboard/proforma-invoice/edit/[id]/page.tsx', check: true },
  { p: 'src/app/dashboard/quotations/edit/[id]/page.tsx', check: true },
  { p: 'src/app/dashboard/delivery-challan/edit/[id]/page.tsx', check: false },
  { p: 'src/app/dashboard/credit-note/edit/[id]/page.tsx', check: false }
];

for (const {p, check} of files) {
  const fullPath = path.resolve(p);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if validateDiscount is imported
    if (!content.includes('import { validateDiscount }')) {
      content = content.replace('import { calculateInvoice,', 'import { validateDiscount } from "@/lib/validateDiscount";\nimport { calculateInvoice,');
    }
    
    // Find the save function (handleUpdate, handleSave, etc)
    const regex = /(const (handleUpdate|handleSave) = async \(\) => {)/;
    if (regex.test(content) && !content.includes('// DISCOUNT & NEGATIVE TOTAL VALIDATION GATE')) {
      const injection = `\n\n    // DISCOUNT & NEGATIVE TOTAL VALIDATION GATE\n    const validation = validateDiscount(validItems, products, discountType, Number(discountValue), finalTotal, ${check});\n    if (!validation.isValid) {\n      return toast.error(validation.error);\n    }\n`;
      content = content.replace(regex, `$1${injection}`);
      fs.writeFileSync(fullPath, content);
      console.log('Patched: ' + p);
    } else {
       console.log('Already patched or not found: ' + p);
    }
  } else {
    console.log('File not found: ' + p);
  }
}
