const fs = require('fs');
const path = require('path');

const src = 'd:/Billing-app/billing-app/src';
const cols = new Set();

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const i of items) {
    const p = path.join(dir, i.name);
    if (i.isDirectory()) {
      walk(p);
    } else if (i.name.endsWith('.ts') || i.name.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      const patterns = [
        /collection\(db,\s*["'](\w+)["']/g,
        /doc\(db,\s*["'](\w+)["']/g,
        /adminDb\.collection\(["'](\w+)["']/g,
        /collection\(["'](\w+)["']\)/g,
      ];
      for (const pat of patterns) {
        for (const m of c.matchAll(pat)) {
          cols.add(m[1]);
        }
      }
    }
  }
}

walk(src);
[...cols].sort().forEach(c => console.log(c));
