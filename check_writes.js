const fs = require('fs');
const path = require('path');

const src = 'd:/Billing-app/billing-app/src';
const colWrites = new Map();

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const i of items) {
    const p = path.join(dir, i.name);
    if (i.isDirectory()) walk(p);
    else if (i.name.endsWith('.ts') || i.name.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      
      // Look for addDoc(collection(db, 'collectionName'), { ... })
      // and setDoc(doc(db, 'collectionName', ...), { ... })
      const patterns = [
        /addDoc\(\s*collection\(\s*db\s*,\s*["'](\w+)["']/,
        /setDoc\(\s*doc\(\s*db\s*,\s*["'](\w+)["']/
      ];
      
      for (const m of c.matchAll(/addDoc\(\s*collection\(\s*db\s*,\s*["'](\w+)["']/g)) {
         colWrites.set(m[1], (colWrites.get(m[1]) || 0) + 1);
      }
      for (const m of c.matchAll(/setDoc\(\s*doc\(\s*db\s*,\s*["'](\w+)["']/g)) {
         colWrites.set(m[1], (colWrites.get(m[1]) || 0) + 1);
      }
    }
  }
}

walk(src);
console.log("Collections written to:");
console.log([...colWrites.keys()].sort().join('\n'));
