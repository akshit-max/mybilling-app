const fs = require('fs');
const path = require('path');

const src = 'd:/Billing-app/billing-app/src';
const fields = new Set();
const adminFields = new Set();

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const i of items) {
    const p = path.join(dir, i.name);
    if (i.isDirectory()) walk(p);
    else if (i.name.endsWith('.ts') || i.name.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      
      // Look for where("fieldName", ...
      const matches = [...c.matchAll(/where\(\s*["']([^"']+)["']/g)];
      for (const m of matches) {
         fields.add(m[1]);
      }
      
      // Look for adminId: ...
      if (c.includes('adminId:')) adminFields.add(p);
      if (c.includes('ownerId:')) adminFields.add('ownerId found in ' + i.name);
      if (c.includes('tenantId:')) adminFields.add('tenantId found in ' + i.name);
    }
  }
}

walk(src);
console.log("Fields used in where():");
console.log([...fields].sort().join('\n'));
console.log("\nOther ownership indicators:");
console.log([...adminFields].sort().join('\n'));
