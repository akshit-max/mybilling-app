const fs = require('fs');
let content = fs.readFileSync('d:/Billing-app/billing-app/src/app/dashboard/superadmin/page.tsx', 'utf8');

// Remove PIN State
content = content.replace(/  \/\/ PIN Management State[\s\S]*?const \[pinChangeSuccess, setPinChangeSuccess\] = useState\(""\);/, '');

// Remove handlePinChange
content = content.replace(/  const handlePinChange = async \(e: React\.FormEvent\) => \{[\s\S]*?  \};/m, '');

// Remove PIN UI
const regex = new RegExp(`        \\{\\/\\* Security & PIN Management \\*\\/\\}[\\s\\S]*?(?=        \\{\\/\\* Top-Level Metrics Grid \\*\\/\\})`);
content = content.replace(regex, '');

fs.writeFileSync('d:/Billing-app/billing-app/src/app/dashboard/superadmin/page.tsx', content);
console.log("Removed PIN management from superadmin page");
