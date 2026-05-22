const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src/app/dashboard/credit-note');
const targets = [
  {
    name: 'debit-note',
    label: 'Debit Note',
    camelCase: 'debitNote',
    collection: 'debitNotes',
    stockOp: '-', // deduct stock
    stockErrorLabel: 'validate_and_deduct',
  },
  {
    name: 'purchase-return',
    label: 'Purchase Return',
    camelCase: 'purchaseReturn',
    collection: 'purchaseReturns',
    stockOp: '-', // deduct stock
    stockErrorLabel: 'validate_and_deduct',
  },
  {
    name: 'purchase-orders',
    label: 'Purchase Order',
    camelCase: 'purchaseOrder',
    collection: 'purchaseOrders',
    stockOp: null, // no stock update
    stockErrorLabel: 'no_stock',
  }
];

function copyDirRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    const srcPath = path.join(source, file);
    const destPath = path.join(target, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function processDirectory(dir, targetDef) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath, targetDef);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // Global text replacements
      content = content.replace(/Credit Note/g, targetDef.label);
      content = content.replace(/creditNote/g, targetDef.camelCase);
      content = content.replace(/creditNotes/g, targetDef.collection);
      content = content.replace(/credit-note/g, targetDef.name);

      // UI text specific to purchases
      content = content.replace(/Bill To/g, "Bill From");
      content = content.replace(/Link to Invoice/g, "Link to Purchase Invoice");
      
      // The invoice link query needs to pull from purchases
      // const iq = query(collection(db, "invoices") -> const iq = query(collection(db, "purchases")
      content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "purchases")');
      
      // Stock logic replacement
      if (targetDef.stockOp === '-') {
        // Change `currentStock + item.qty` to `currentStock - item.qty`
        // We know in credit note we had skipped logic for edit, but let's just make sure we update the create page correctly
        content = content.replace(/currentStock \+ item.qty/g, `currentStock - item.qty`);
        // Add stock for Credit Note -> Validate and Deduct stock for Debit Note
        content = content.replace(/\/\/ Add stock for Credit Note/g, `// Validate and Deduct stock for ${targetDef.label}`);
        content = content.replace(/\/\/ Add stock skipped on edit/g, `// Deduct stock skipped on edit`);
        content = content.replace(/"Stock addition failed"/g, `"Stock deduction failed"`);
        
        // Also we need to ADD the validation block for deduction (which credit note didn't have, it only added back)
        // Wait, Credit Note didn't have validation checking `item.qty > prod.stock` because it adds stock!
        // So for Debit Note / Purchase Return, we need to inject the validation block before the deduction block.
        if (fullPath.includes('create\\\\page.tsx') || fullPath.includes('create/page.tsx')) {
            const deductionBlockStart = `// Validate and Deduct stock for ${targetDef.label}`;
            if (content.includes(deductionBlockStart)) {
                const validationInjection = `
    // Validate stock
    for (const item of validItems) {
      if (item.productId) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && item.qty > (prod.stock || 0)) {
          return toast.error(\`Insufficient stock for \${item.name}. Available: \${prod.stock || 0}\`);
        }
      }
    }
    ${deductionBlockStart}`;
                content = content.replace(deductionBlockStart, validationInjection);
            }
        }

      } else if (targetDef.stockOp === null) {
        // Purchase Orders don't change stock
        // Remove the whole block starting with `// Add stock for Credit Note` up to the `const user = auth.currentUser;`
        const regex = /\n\s*\/\/ Add stock for Credit Note[\s\S]*?(?=\n\s*const user = auth\.currentUser;)/;
        content = content.replace(regex, '\n    ');
        
        // Remove from edit page as well
        const editRegex = /\n\s*\/\/ Add stock skipped on edit for safety[\s\S]*?(?=\n\s*const user = auth\.currentUser;)/;
        content = content.replace(editRegex, '\n    ');
      }

      fs.writeFileSync(fullPath, content);
    }
  }
}

for (const target of targets) {
  const destDir = path.join(__dirname, 'src/app/dashboard', target.name);
  console.log(`Cloning to ${destDir}...`);
  copyDirRecursiveSync(baseDir, destDir);
  processDirectory(destDir, target);
}

console.log("Cloning complete.");
