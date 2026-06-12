const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/**/page.tsx');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/([^,\s])\s+unit: \(i as any\)\.unit/g, '$1,\n        unit: (i as any).unit');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed comma in:', file);
  }
}
console.log('Total fixed:', count);
