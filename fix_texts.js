const fs = require('fs');
const path = require('path');

const targets = [
  {
    name: 'debit-note',
    label: 'Debit Note',
    labelPlural: 'Debit Notes',
  },
  {
    name: 'purchase-return',
    label: 'Purchase Return',
    labelPlural: 'Purchase Returns',
  },
  {
    name: 'purchase-orders',
    label: 'Purchase Order',
    labelPlural: 'Purchase Orders',
  }
];

function processDirectory(dir, targetDef) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath, targetDef);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // Replace "credit notes" / "Credit notes"
      content = content.replace(/credit notes/gi, targetDef.labelPlural.toLowerCase());
      content = content.replace(/Credit notes/g, targetDef.labelPlural);
      content = content.replace(/Credit Notes/g, targetDef.labelPlural);
      
      // Replace "credit note" / "Credit note"
      content = content.replace(/credit note/gi, targetDef.label.toLowerCase());
      content = content.replace(/Credit note/g, targetDef.label);
      content = content.replace(/Credit Note/g, targetDef.label);

      // We should also replace the state variable names if they got missed, but they are not critical if they just say "setCreditNotes", it's just code structure. Let's fix the display text mostly.

      fs.writeFileSync(fullPath, content);
    }
  }
}

for (const target of targets) {
  const destDir = path.join(__dirname, 'src/app/dashboard', target.name);
  console.log(`Fixing texts in ${destDir}...`);
  processDirectory(destDir, target);
}

console.log("Text fixing complete.");
