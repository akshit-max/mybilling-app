const fs = require('fs');

const createPath = 'd:\\Billing-app\\billing-app\\src\\app\\dashboard\\quotations\\create\\page.tsx';
const editPath = 'd:\\Billing-app\\billing-app\\src\\app\\dashboard\\quotations\\edit\\[id]\\page.tsx';

function applyFixes(filePath, isEdit) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove overflow-hidden from main containers
  content = content.replace(
    /className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden"/g,
    'className="bg-white border border-gray-200 rounded-lg shadow-xs"'
  );
  content = content.replace(
    /className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"/g,
    'className="bg-white border border-gray-200 rounded-lg shadow-sm"'
  );

  // 2. Fix Stock Validation to account for typed-in products without productId
  if (!isEdit) {
    const oldCheck = `
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
    const newCheck = `
      // Check stock validation for all items
      for (const item of validItems) {
        const prod = item.productId 
          ? products.find(p => p.id === item.productId)
          : products.find(p => p.name.toLowerCase() === (item.name || "").toLowerCase());
          
        if (prod && item.qty > (prod.stock || 0)) {
          return toast.error(\`Insufficient stock for \${item.name}. Available: \${prod.stock || 0}\`);
        }
      }
`;
    content = content.replace(oldCheck, newCheck);
  } else {
    const oldCheck = `
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
    const newCheck = `
      // Check stock validation for all items against total stock
      for (const item of validItems) {
        const prod = item.productId 
          ? products.find(p => p.id === item.productId)
          : products.find(p => p.name.toLowerCase() === (item.name || "").toLowerCase());
          
        if (prod) {
          if (invoiceType === "estimate" && item.qty > (prod.stock || 0)) {
             return toast.error(\`Insufficient stock for \${item.name}. Available: \${prod.stock || 0}\`);
          }
        }
      }
`;
    content = content.replace(oldCheck, newCheck);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

applyFixes(createPath, false);
applyFixes(editPath, true);
console.log('Fixed UI clipping and stock validation.');
