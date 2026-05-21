const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'edit', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of amountReceived with amountPaid
content = content.replace(/amountReceived/g, 'amountPaid');
content = content.replace(/setAmountReceived/g, 'setAmountPaid');

fs.writeFileSync(filePath, content);
console.log("Fixed amountPaid in edit page.");
