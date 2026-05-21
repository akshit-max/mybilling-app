const fs = require('fs');
const path = require('path');

const createPath = 'd:\\Billing-app\\billing-app\\src\\app\\dashboard\\quotations\\create\\page.tsx';
const editPath = 'd:\\Billing-app\\billing-app\\src\\app\\dashboard\\quotations\\edit\\[id]\\page.tsx';

function applyFixes(filePath, isEdit) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Fix Party Dropdown click issue by adding onMouseDown preventDefault
  content = content.replace(
    /\{showPartyDropdown && \(\s*<div className="absolute left-0 right-0 mt-1/g,
    `{showPartyDropdown && (\n                    <div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 right-0 mt-1`
  );
  // Alternative match if it's slightly different
  content = content.replace(
    /<div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto z-10">/g,
    `<div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto z-10">`
  );

  // 2. Fix Product Dropdown click issue
  content = content.replace(
    /\{activeProductDropdown === idx && \(\s*<div className="absolute left-0 right-0 mt-1/g,
    `{activeProductDropdown === idx && (\n                        <div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 right-0 mt-1`
  );
  content = content.replace(
    /<div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-32 overflow-y-auto z-10">/g,
    `<div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-32 overflow-y-auto z-10">`
  );

  // 3. Fix Stock Validation on Save
  if (!isEdit) {
    // In Create: find where it checks `if (invoiceType === "invoice")` for offline stock deduction
    // Wait, we need to check stock BEFORE doing any saves.
    // The easiest way is to add a check right at the beginning of handleSave:
    const saveCheck = `
      // Check stock validation for all items
      for (const item of validItems) {
        if (item.productId) {
          const prod = products.find(p => p.id === item.productId);
          if (prod && item.qty > (prod.stock || 0)) {
            return toast.error(\`Insufficient stock for \${item.name}. Available: \${prod.stock || 0}\`);
          }
        }
      }
`;
    // Insert after `if (!customerName) return toast.error("Please select a customer first");`
    content = content.replace(
      /if \(!validItems\.length\) return toast\.error\("Please add at least one valid item"\);/,
      `if (!validItems.length) return toast.error("Please add at least one valid item");\n${saveCheck}`
    );
  } else {
    // In Edit: Add the same check at the beginning of handleUpdate
    const updateCheck = `
      // Check stock validation for all items against total stock (ignoring diff for estimate for simplicity, just strict check against available + old if needed, but since estimates don't deduct, available stock is current stock)
      // Actually, if it's an estimate, it didn't deduct before. So we just check qty against current stock.
      for (const item of validItems) {
        if (item.productId) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            // If it was already an estimate, old stock was never deducted, so just check item.qty <= prod.stock
            if (invoiceType === "estimate" && item.qty > (prod.stock || 0)) {
               return toast.error(\`Insufficient stock for \${item.name}. Available: \${prod.stock || 0}\`);
            }
            // For invoice, the diff is checked later in the code. We'll leave the diff check for invoice.
          }
        }
      }
`;
    content = content.replace(
      /if \(!validItems\.length\) return toast\.error\("Please add at least one valid item"\);/,
      `if (!validItems.length) return toast.error("Please add at least one valid item");\n${updateCheck}`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

applyFixes(createPath, false);
applyFixes(editPath, true);
console.log('Fixes applied to both Create and Edit pages.');
