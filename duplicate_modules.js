const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src/app/dashboard');
const sourceModule = path.join(baseDir, 'credit-note');
const destModules = [
  {
    path: path.join(baseDir, 'delivery-challan'),
    replacements: [
      [/Credit Note/g, 'Delivery Challan'],
      [/creditNote/g, 'deliveryChallan'],
      [/creditNotes/g, 'deliveryChallans'],
      [/CreditNotes/g, 'DeliveryChallans'],
      [/credit-note/g, 'delivery-challan']
    ]
  },
  {
    path: path.join(baseDir, 'proforma-invoice'),
    replacements: [
      [/Credit Note/g, 'Proforma Invoice'],
      [/creditNote/g, 'proformaInvoice'],
      [/creditNotes/g, 'proformaInvoices'],
      [/CreditNotes/g, 'ProformaInvoices'],
      [/credit-note/g, 'proforma-invoice']
    ]
  }
];

function copyDir(src, dest, replacements) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, replacements);
    } else if (entry.isFile()) {
      let content = fs.readFileSync(srcPath, 'utf8');
      
      // Perform replacements
      for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement);
      }
      
      fs.writeFileSync(destPath, content);
      console.log(`Copied and processed: ${destPath}`);
    }
  }
}

for (const module of destModules) {
  console.log(`Processing module: ${module.path}`);
  copyDir(sourceModule, module.path, module.replacements);
}

console.log('Duplication complete.');
