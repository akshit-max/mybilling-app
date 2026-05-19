const fs = require('fs');
const c = fs.readFileSync('src/app/dashboard/quotations/edit/[id]/page.tsx', 'utf8');
const m = c.match(/text-gray-800 uppercase tracking-wider">[^<]+<\/h1>/g);
console.log("H1 titles found:", m);
