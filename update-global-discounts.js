const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/app/dashboard', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Check if it imports capItemDiscountUI
    if (content.includes('capItemDiscountUI')) {
      if (!content.includes('capGlobalDiscountUI')) {
        content = content.replace('capItemDiscountUI }', 'capItemDiscountUI, capGlobalDiscountUI }');
        changed = true;
      }

      // Find setDiscountValue(e.target.value === "" ? "" : sanitizeNumericInput(e.target.value));
      // or setDiscountValue(sanitizeNumericInput(e.target.value))
      if (content.includes('setDiscountValue')) {
        const regex1 = /setDiscountValue\(([^)]*?sanitizeNumericInput[^)]*?)\)/g;
        if (regex1.test(content)) {
          content = content.replace(regex1, (match, p1) => {
            if (!match.includes('capGlobalDiscountUI')) {
              changed = true;
              return `setDiscountValue(capGlobalDiscountUI(${p1}, discountType))`;
            }
            return match;
          });
        }
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Updated global', filePath);
    }
  }
});
