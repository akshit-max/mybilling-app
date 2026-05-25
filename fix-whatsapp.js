const fs = require('fs');
const path = require('path');

const files = [
  "purchase-return\\[id]\\page.tsx",
  "proforma-invoice\\[id]\\page.tsx",
  "sales-return\\[id]\\page.tsx",
  "quotations\\[id]\\page.tsx",
  "purchases\\receipt\\[id]\\page.tsx",
  "purchase-orders\\[id]\\page.tsx",
  "invoices\\[id]\\page.tsx",
  "delivery-challan\\[id]\\page.tsx",
  "credit-note\\[id]\\page.tsx",
  "debit-note\\[id]\\page.tsx",
  "automated-bills\\[id]\\page.tsx"
];

const basePath = "d:\\Billing-app\\billing-app\\src\\app\\dashboard";

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the handleWhatsAppShare function
  // It usually looks like:
  // const handleWhatsAppShare = () => {
  //   if (!invoice?.customerPhone) {
  //     toast.error("Customer phone number is missing");
  //     return;
  //   }
  //   const message = ...
  //   const phone = invoice.customerPhone.replace(/\D/g, "");
  
  const regex = /const handleWhatsAppShare = \(\) => \{\s*if \(!([a-zA-Z0-9]+)\?\.customerPhone\) \{\s*toast\.error\("Customer phone number is missing"\);\s*return;\s*\}\s*const message = (`[\s\S]*?`);\s*const phone = \1\.customerPhone\.replace\(\/\\D\/g, ""\);\s*window\.open\(`https:\/\/wa\.me\/91\$\{phone\}\?text=\$\{encodeURIComponent\(message\)\}`, "_blank"\);\s*\};/m;

  if (regex.test(content)) {
    content = content.replace(regex, (match, varName, messageStr) => {
      return `const handleWhatsAppShare = () => {
    let phone = ${varName}?.customerPhone;
    if (!phone) {
      phone = prompt("Customer phone number is missing. Please enter the WhatsApp number:");
      if (!phone) {
        toast.error("Valid phone number required to share");
        return;
      }
    }
    const message = ${messageStr};
    const cleanPhone = phone.replace(/\\D/g, "");
    window.open(\`https://wa.me/91\${cleanPhone}?text=\${encodeURIComponent(message)}\`, "_blank");
  };`;
    });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    // Some might have different var names for phone replace, like `const phone = purchase.supplierPhone...` or something.
    // Let's do a more robust regex that just replaces the if block!
    const ifRegex = /if \(!([a-zA-Z0-9]+)\?\.customerPhone\) \{\s*toast\.error\("Customer phone number is missing"\);\s*return;\s*\}/m;
    if (ifRegex.test(content)) {
      content = content.replace(ifRegex, (match, varName) => {
        return `let phone = ${varName}?.customerPhone;
    if (!phone) {
      phone = prompt("Customer phone number is missing. Please enter the WhatsApp number:");
      if (!phone) {
        toast.error("Valid phone number required to share");
        return;
      }
    }`;
      });
      // also replace `.customerPhone.replace` with `phone.replace` inside the same function block
      const phoneReplaceRegex = new RegExp(`const phone = ${content.match(ifRegex)[1]}\\.customerPhone\\.replace\\(/\\\\D/g, ""\\);`, 'm');
      if (phoneReplaceRegex.test(content)) {
          content = content.replace(phoneReplaceRegex, `const cleanPhone = phone.replace(/\\D/g, "");`);
          content = content.replace(/wa\.me\/91\$\{phone\}/g, `wa.me/91\${cleanPhone}`);
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated via fallback regex: ${file}`);
    } else {
      console.log(`Regex not matched in ${file}`);
    }
  }
});
