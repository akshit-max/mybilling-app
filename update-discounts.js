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

    if (content.includes('const updateItem') && !content.includes('capItemDiscountUI')) {
      if (content.includes('sanitizeNumericInput')) {
        content = content.replace(/import \{([^}]*)sanitizeNumericInput([^}]*)\} from "(@\/lib\/sanitize|@\/lib\/sanitize)";/g, 'import {$1sanitizeNumericInput$2, capItemDiscountUI } from "$3";');
        changed = true;
      } else {
        content = content.replace(/import \{.*\} from "lucide-react";/, match => match + '\nimport { capItemDiscountUI } from "@/lib/sanitize";');
        changed = true;
      }

      const updateItemMatch = content.match(/const updateItem = \([\s\S]*?setItems\(updated\);/);
      if (updateItemMatch && !updateItemMatch[0].includes('capItemDiscountUI')) {
        const newFunc = updateItemMatch[0].replace('setItems(updated);', 'updated[index] = capItemDiscountUI(updated[index]);\n    setItems(updated);');
        content = content.replace(updateItemMatch[0], newFunc);
        changed = true;
      }
      
      const updateItemExpMatch = content.match(/const updateItem = \(id: string[\s\S]*?updated = \{ \.\.\.item, \[field\]: value \};/);
      if (updateItemExpMatch && !updateItemExpMatch[0].includes('capItemDiscountUI')) {
        const newFunc = updateItemExpMatch[0].replace('updated = { ...item, [field]: value };', 'updated = { ...item, [field]: value };\n      Object.assign(updated, capItemDiscountUI(updated));');
        content = content.replace(updateItemExpMatch[0], newFunc);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
});
