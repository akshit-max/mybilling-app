const fs = require('fs');
const path = require('path');

const src = 'd:/Billing-app/billing-app/src';
const docs = new Set();

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const i of items) {
    const p = path.join(dir, i.name);
    if (i.isDirectory()) walk(p);
    else if (i.name.endsWith('.ts') || i.name.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      
      for (const m of c.matchAll(/doc\(\s*db\s*,\s*["'](\w+)["']\s*,\s*([^)]+)\)/g)) {
         docs.add(m[1] + ' -> ' + m[2].trim());
      }
    }
  }
}

walk(src);
console.log("Collections using doc():");
console.log([...docs].sort().join('\n'));
