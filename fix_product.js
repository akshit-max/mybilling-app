const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/**/page.tsx');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (content.includes('type Product = {') || content.includes('type Product =')) {
    content = content.replace(/type Product = \{([\s\S]*?)\};/, (match, p1) => {
      if (!p1.includes('unit?:')) {
         return `type Product = {${p1}  unit?: string;\n};`;
      }
      return match;
    });
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed Product type in:', file);
  }
}
console.log('Total fixed:', count);
