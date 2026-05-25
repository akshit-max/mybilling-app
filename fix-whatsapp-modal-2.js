const fs = require('fs');
const path = require('path');

const fileConfigs = [
  { file: "purchase-return\\[id]\\page.tsx",     dataVar: "purchaseReturn",   docType: "Purchase Return",   numberField: "invoiceNumber" },
  { file: "proforma-invoice\\[id]\\page.tsx",    dataVar: "proformaInvoice",  docType: "Proforma Invoice",  numberField: "proformaInvoiceNumber" },
  { file: "sales-return\\[id]\\page.tsx",        dataVar: "invoice",          docType: "Sales Return",      numberField: "invoiceNumber" },
  { file: "quotations\\[id]\\page.tsx",          dataVar: "invoice",          docType: "Quotation",         numberField: "invoiceNumber" },
  { file: "purchases\\receipt\\[id]\\page.tsx",  dataVar: "invoice",          docType: "Purchase Receipt",  numberField: "invoiceNumber" },
  { file: "purchase-orders\\[id]\\page.tsx",     dataVar: "purchaseOrder",    docType: "Purchase Order",    numberField: "invoiceNumber" },
  { file: "invoices\\[id]\\page.tsx",            dataVar: "invoice",          docType: "Invoice",           numberField: "invoiceNumber" },
  { file: "delivery-challan\\[id]\\page.tsx",    dataVar: "deliveryChallan",  docType: "Delivery Challan",  numberField: "invoiceNumber" },
  { file: "credit-note\\[id]\\page.tsx",         dataVar: "creditNote",       docType: "Credit Note",       numberField: "invoiceNumber" },
  { file: "debit-note\\[id]\\page.tsx",          dataVar: "debitNote",        docType: "Debit Note",        numberField: "invoiceNumber" },
  { file: "automated-bills\\[id]\\page.tsx",     dataVar: "invoice",          docType: "Automated Bill",    numberField: "invoiceNumber" },
];

const basePath = "d:\\Billing-app\\billing-app\\src\\app\\dashboard";

fileConfigs.forEach(({ file, dataVar, docType, numberField }) => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already done
  if (content.includes('<WhatsAppModal')) {
    console.log(`Already has modal: ${file}`);
    return;
  }

  // Find the last </div> before ); } pattern (CRLF aware)
  // Strategy: find the last occurrence of "  );\r\n}" or "  );\n}" and insert before the </div> before it
  // Better: find closing of main return div: the last </div> right before  );\r\n}
  
  const patterns = [
    /(<\/div>\r?\n  \);\r?\n\}[\s]*$)/m,
    /(<\/div>\r?\n\);\r?\n\}[\s]*$)/m,
  ];
  
  let injected = false;
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      const modalJSX = `\r\n      {/* WhatsApp Modal */}\r\n      {showWhatsAppModal && (\r\n        <WhatsAppModal\r\n          customerName={${dataVar}?.customerName || "Customer"}\r\n          existingPhone={${dataVar}?.customerPhone}\r\n          message={\`Dear \${${dataVar}?.customerName},\\n\\nYour ${docType} *\${${dataVar}?.${numberField} || "N/A"}* has been generated.\\n\\nTotal Amount: *₹\${${dataVar}?.total?.toFixed(2)}*\\n\\nThank you for choosing \${company?.name || "our company"}.\`}\r\n          onClose={() => setShowWhatsAppModal(false)}\r\n        />\r\n      )}\r\n    `;
      
      content = content.replace(pattern, (match) => {
        return modalJSX + match;
      });
      injected = true;
      console.log(`  ✓ Injected WhatsAppModal JSX in ${file}`);
      break;
    }
  }
  
  if (!injected) {
    // Last resort: find the very last </div> in the file
    const lastDivIdx = content.lastIndexOf('</div>');
    if (lastDivIdx !== -1) {
      const modalJSX = `\r\n      {/* WhatsApp Modal */}\r\n      {showWhatsAppModal && (\r\n        <WhatsAppModal\r\n          customerName={${dataVar}?.customerName || "Customer"}\r\n          existingPhone={${dataVar}?.customerPhone}\r\n          message={\`Dear \${${dataVar}?.customerName},\\n\\nYour ${docType} *\${${dataVar}?.${numberField} || "N/A"}* has been generated.\\n\\nTotal Amount: *₹\${${dataVar}?.total?.toFixed(2)}*\\n\\nThank you for choosing \${company?.name || "our company"}.\`}\r\n          onClose={() => setShowWhatsAppModal(false)}\r\n        />\r\n      )}\r\n    `;
      content = content.slice(0, lastDivIdx) + modalJSX + content.slice(lastDivIdx);
      console.log(`  ✓ Injected WhatsAppModal JSX (last-resort) in ${file}`);
      injected = true;
    }
  }

  if (injected) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Saved: ${file}`);
  } else {
    console.log(`  ✗ FAILED to inject in ${file}`);
  }
});

console.log('\nDone!');
