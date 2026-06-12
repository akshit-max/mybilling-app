const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/**/page.tsx');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace type Item
  if (content.includes('type Item = {') && !content.includes('unit?: string;')) {
    content = content.replace(/type Item = \{([\s\S]*?)\};/, (match, p1) => {
      return `type Item = {${p1}  unit?: string;\n};`;
    });
  }

  // Update validItems map
  if (content.includes('const validItems = items')) {
    const mapRegex = /\.map\(\(i\) => \{\s*const sanitized = \{([\s\S]*?)\};/g;
    content = content.replace(mapRegex, (match, p1) => {
      if (p1.includes('unit:')) return match;
      return `.map((i) => {
      const prod = products.find(p => p.id === i.productId);
      const sanitized = {${p1}  unit: (i as any).unit || prod?.unit || "PCS",
      };`;
    });
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed:', file);
  }
}

console.log('Total fixed:', count);
