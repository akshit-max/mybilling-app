const fs = require('fs');
const files = [
  './src/app/dashboard/reports/item-sales-summary/page.tsx',
  './src/app/dashboard/reports/low-stock-summary/page.tsx',
  './src/app/dashboard/reports/rate-list/page.tsx',
  './src/app/dashboard/reports/stock-summary/page.tsx',
  './src/app/dashboard/settings/item/page.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\`/g, '`').replace(/\\\$\{/g, '${');
  fs.writeFileSync(file, content);
}
console.log('Fixed escaped chars');
