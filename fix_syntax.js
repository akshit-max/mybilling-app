const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/dashboard/credit-note/create/page.tsx',
  'src/app/dashboard/credit-note/edit/[id]/page.tsx',
  'src/app/dashboard/delivery-challan/create/page.tsx',
  'src/app/dashboard/delivery-challan/edit/[id]/page.tsx',
  'src/app/dashboard/proforma-invoice/create/page.tsx',
  'src/app/dashboard/proforma-invoice/edit/[id]/page.tsx'
];

for (const relPath of filesToFix) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Strip erroneous blocks inside useEffect
  // The block starts with `\n    // Validate stock` or `\n    // Validate and Deduct` or `\n    // Add stock`
  // and ends right before `\n    const user = auth.currentUser;`
  
  const blockStartRegex = /(\n\s*\/\/ Validate stock|\n\s*\/\/ Validate and Deduct|\n\s*\/\/ Add stock|\n\s*\/\* \/\/ Perform deduction|\n\s*\/\* \/\/ Add stock)/;
  
  // Actually, an easier way is to find the exact block and remove it.
  let isEdit = relPath.includes('edit');
  let blockToExtract = '';

  if (relPath.includes('proforma-invoice')) {
    const regex = /\n\s*\/\/ Validate stock for Proforma[\s\S]*?(?=\n\s*const user = auth\.currentUser;)/;
    const match = content.match(regex);
    if (match) {
        blockToExtract = match[0];
        content = content.replace(match[0], '');
    }
  } else if (relPath.includes('delivery-challan')) {
    if (isEdit) {
        const regex = /\n\s*\/\* \/\/ Perform deduction skipped on edit for safety[\s\S]*?(?=\n\s*const user = auth\.currentUser;)/;
        const match = content.match(regex);
        if (match) {
            blockToExtract = match[0];
            content = content.replace(match[0], '');
        }
    } else {
        const regex = /\n\s*\/\/ Validate and Deduct stock for Delivery Challan[\s\S]*?(?=\n\s*const user = auth\.currentUser;)/;
        const match = content.match(regex);
        if (match) {
            blockToExtract = match[0];
            content = content.replace(match[0], '');
        }
    }
  } else if (relPath.includes('credit-note')) {
    if (isEdit) {
        const regex = /\n\s*\/\* \/\/ Add stock skipped on edit for safety[\s\S]*?(?=\n\s*const user = auth\.currentUser;)/;
        const match = content.match(regex);
        if (match) {
            blockToExtract = match[0];
            content = content.replace(match[0], '');
        }
    } else {
        const regex = /\n\s*\/\/ Add stock for Credit Note[\s\S]*?(?=\n\s*const user = auth\.currentUser;)/;
        const match = content.match(regex);
        if (match) {
            blockToExtract = match[0];
            content = content.replace(match[0], '');
        }
    }
  }

  // Now insert blockToExtract into handleSave or handleUpdate correctly.
  // Look for `const handleSave = async () => {\n` or `const handleUpdate = async () => {\n`
  // and insert it right before `const user = auth.currentUser;` inside those functions.
  
  if (blockToExtract) {
      const handleSaveTarget = '    const user = auth.currentUser;';
      
      // We know `content` currently has `const user = auth.currentUser;` in useEffect (which we restored)
      // and in handleSave/handleUpdate.
      
      // A safe way to target the one in handleSave/handleUpdate is to find the index of handleSave/handleUpdate,
      // then find the next `const user = auth.currentUser;`
      
      const funcKeyword = isEdit ? 'const handleUpdate = async () => {' : 'const handleSave = async () => {';
      const funcIndex = content.indexOf(funcKeyword);
      
      if (funcIndex !== -1) {
          const authIndex = content.indexOf(handleSaveTarget, funcIndex);
          if (authIndex !== -1) {
              content = content.slice(0, authIndex) + blockToExtract + '\n' + content.slice(authIndex);
          }
      }
  }
  
  fs.writeFileSync(fullPath, content);
  console.log("Fixed: " + fullPath);
}

console.log("Done fixing.");
