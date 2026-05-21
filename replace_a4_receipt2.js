const fs = require('fs');
const path = "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\sales-return\\[id]\\page.tsx";

let content = fs.readFileSync(path, "utf-8");

content = content.replace(/Sales Invoice/g, "Sales Return");
content = content.replace(/invoiceTypeTitle/g, "salesReturnTypeTitle");
content = content.replace(/Invoice Amount/g, "Total Amount");

// Remove Profit Details button
content = content.replace(/<button[^>]*>\s*<TrendingUp[^>]*\/>\s*<span[^>]*>Profit Details<\/span>\s*<\/button>/g, "");

fs.writeFileSync(path, content, "utf-8");
console.log("Done replace 2");
