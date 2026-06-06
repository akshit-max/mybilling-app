const fs = require('fs');
let content = fs.readFileSync('d:/Billing-app/billing-app/src/app/dashboard/superadmin/page.tsx', 'utf8');

const regex = /      \/\/ 2\. Fetch SuperAdmin Settings for Audit field[\s\S]*?      \} catch \(err\) \{\}/;
content = content.replace(regex, '');

fs.writeFileSync('d:/Billing-app/billing-app/src/app/dashboard/superadmin/page.tsx', content);
console.log("Fixed superadmin");
