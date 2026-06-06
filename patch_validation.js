const fs = require('fs');
const path = require('path');

const targetFiles = [
  { path: "src/app/dashboard/invoices/create/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/invoices/edit/[id]/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/pos-billing/page.tsx", checkCostPrice: true, saveFn: "handleSaveBill" },
  { path: "src/app/dashboard/quotations/create/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/quotations/edit/[id]/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/proforma-invoice/create/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/proforma-invoice/edit/[id]/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/automated-bills/create/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/automated-bills/edit/[id]/page.tsx", checkCostPrice: true },
  { path: "src/app/dashboard/credit-note/create/page.tsx", checkCostPrice: false },
  { path: "src/app/dashboard/credit-note/edit/[id]/page.tsx", checkCostPrice: false },
  { path: "src/app/dashboard/sales-return/create/page.tsx", checkCostPrice: false },
  { path: "src/app/dashboard/sales-return/edit/[id]/page.tsx", checkCostPrice: false },
  { path: "src/app/dashboard/delivery-challan/create/page.tsx", checkCostPrice: false },
  { path: "src/app/dashboard/delivery-challan/edit/[id]/page.tsx", checkCostPrice: false },
];

const basePath = "d:/Billing-app/billing-app";

for (const target of targetFiles) {
  const fullPath = path.join(basePath, target.path);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping (not found): ${target.path}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // 1. Add import
  if (!content.includes('import { validateDiscount }')) {
    content = content.replace(
      /import \{ sanitizeNumericInput \} from "@\/lib\/sanitize";/,
      `import { sanitizeNumericInput } from "@/lib/sanitize";\nimport { validateDiscount } from "@/lib/validateDiscount";`
    );
  }

  // 2. Add validation block
  const isPos = target.path.includes("pos-billing");
  
  // Define items to validate based on module
  const itemsVar = isPos ? "activeBill.items" : "validItems";
  // Define discount type/val based on module
  const discountTypeVar = isPos ? "activeBill.discountType" : "discountType";
  const discountValVar = isPos ? "Number(activeBill.discountValue) || 0" : "Number(discountValue)";
  // Define where products come from
  const productsVar = "products"; 
  
  const validationCode = `
    // DISCOUNT & NEGATIVE TOTAL VALIDATION GATE
    const validation = validateDiscount(${itemsVar}, ${productsVar}, ${discountTypeVar}, ${discountValVar}, finalTotal, ${target.checkCostPrice});
    if (!validation.isValid) {
      return toast.error(validation.error);
    }
`;

  if (isPos) {
    if (content.includes('const handleSaveBill = async (shouldPrint: boolean) => {') && !content.includes('validateDiscount(')) {
       content = content.replace(
          /const handleSaveBill = async \(shouldPrint: boolean\) => \{/,
          `const handleSaveBill = async (shouldPrint: boolean) => {\n${validationCode}`
       );
    }
  } else {
    if (content.includes('const handleSave = async () => {') && !content.includes('validateDiscount(')) {
       content = content.replace(
          /const handleSave = async \(\) => \{/,
          `const handleSave = async () => {\n${validationCode}`
       );
    }
  }

  // 3. Remove old pos-billing negative total check if exists to prevent duplication
  if (isPos && content.includes('if (finalTotal < 0) {')) {
     content = content.replace(
       /if \(finalTotal < 0\) \{\s*return toast\.error\("Total amount cannot be negative\."\);\s*\}/g,
       ""
     );
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Patched: ${target.path}`);
}
