const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  // Replace all literal \` with `
  content = content.replace(/\\`/g, "`");
  // Replace all literal \$ with $
  content = content.replace(/\\\$/g, "$");
  fs.writeFileSync(filePath, content, "utf-8");
}

fixFile("d:\\Billing-app\\billing-app\\src\\app\\dashboard\\staff\\page.tsx");
fixFile("d:\\Billing-app\\billing-app\\src\\app\\dashboard\\staff\\[id]\\page.tsx");
console.log("Fixed backticks and dollars");
