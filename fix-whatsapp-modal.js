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

  // 1. Add WhatsAppModal import if not already present
  if (!content.includes('WhatsAppModal')) {
    // Insert after the last import line
    const lastImportIdx = content.lastIndexOf('\nimport ');
    const endOfLastImport = content.indexOf('\n', lastImportIdx + 1);
    const modalImport = `\nimport WhatsAppModal from "@/components/ui/WhatsAppModal";`;
    content = content.slice(0, endOfLastImport) + modalImport + content.slice(endOfLastImport);
  }

  // 2. Add showWhatsAppModal state after any existing useState declarations
  // Find the first useState and add our state after all state declarations
  if (!content.includes('showWhatsAppModal')) {
    // Find a good place after existing useState hooks - look for a common pattern
    const stateBlockEnd = content.match(/const \[loading, setLoading\] = useState[^\n]*\n/);
    if (stateBlockEnd) {
      const insertAfter = content.indexOf(stateBlockEnd[0]) + stateBlockEnd[0].length;
      content = content.slice(0, insertAfter) + `  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);\n` + content.slice(insertAfter);
    } else {
      // fallback: after first useState
      const firstUseState = content.match(/const \[[^\]]+\] = useState[^\n]*\n/);
      if (firstUseState) {
        const insertAfter = content.indexOf(firstUseState[0]) + firstUseState[0].length;
        content = content.slice(0, insertAfter) + `  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);\n` + content.slice(insertAfter);
      }
    }
  }

  // 3. Replace handleWhatsAppShare to just open the modal
  const shareRegex = /const handleWhatsAppShare = \(\) => \{[\s\S]*?let phone: string \| undefined = ([a-zA-Z0-9?]+)\.customerPhone;[\s\S]*?window\.open\(`https:\/\/wa\.me\/91\${cleanPhone}\?text=\${encodeURIComponent\(message\)}`.*?\);\s*\};/m;
  
  if (shareRegex.test(content)) {
    content = content.replace(shareRegex, `const handleWhatsAppShare = () => {\n    setShowWhatsAppModal(true);\n  };`);
    console.log(`  ✓ Replaced handleWhatsAppShare in ${file}`);
  } else {
    // Try simpler replacement
    const simpleRegex = /const handleWhatsAppShare = \(\) => \{[\s\S]*?\};/m;
    const match = content.match(simpleRegex);
    if (match) {
      content = content.replace(match[0], `const handleWhatsAppShare = () => {\n    setShowWhatsAppModal(true);\n  };`);
      console.log(`  ✓ Replaced handleWhatsAppShare (simple) in ${file}`);
    } else {
      console.log(`  ⚠ Could not replace handleWhatsAppShare in ${file}`);
    }
  }

  // 4. Find the main variable name (invoice, quotation, etc.) and the message
  // We need to detect the data variable and build the message inside the modal call
  // Extract what var the file uses
  let dataVar = 'invoice';
  let docType = 'Invoice';
  let numberField = 'invoiceNumber';
  
  if (file.includes('proforma-invoice')) { dataVar = 'proformaInvoice'; docType = 'Proforma Invoice'; numberField = 'proformaInvoiceNumber'; }
  else if (file.includes('quotations')) { dataVar = 'invoice'; docType = 'Quotation'; numberField = 'invoiceNumber'; }
  else if (file.includes('purchase-return')) { dataVar = 'purchaseReturn'; docType = 'Purchase Return'; numberField = 'invoiceNumber'; }
  else if (file.includes('sales-return')) { dataVar = 'invoice'; docType = 'Sales Return'; numberField = 'invoiceNumber'; }
  else if (file.includes('purchase-orders')) { dataVar = 'purchaseOrder'; docType = 'Purchase Order'; numberField = 'invoiceNumber'; }
  else if (file.includes('purchases\\receipt')) { dataVar = 'invoice'; docType = 'Purchase Receipt'; numberField = 'invoiceNumber'; }
  else if (file.includes('delivery-challan')) { dataVar = 'deliveryChallan'; docType = 'Delivery Challan'; numberField = 'invoiceNumber'; }
  else if (file.includes('credit-note')) { dataVar = 'creditNote'; docType = 'Credit Note'; numberField = 'invoiceNumber'; }
  else if (file.includes('debit-note')) { dataVar = 'debitNote'; docType = 'Debit Note'; numberField = 'invoiceNumber'; }
  else if (file.includes('automated-bills')) { dataVar = 'invoice'; docType = 'Automated Bill'; numberField = 'invoiceNumber'; }

  // 5. Add WhatsAppModal JSX to the return, before the final closing </div>
  if (!content.includes('<WhatsAppModal')) {
    // Insert before the last </div> of the component's return
    const lastReturnClose = content.lastIndexOf('</div>\n  );\n}');
    if (lastReturnClose !== -1) {
      const modalJSX = `
      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          customerName={${dataVar}?.customerName || "Customer"}
          existingPhone={${dataVar}?.customerPhone}
          message={\`Dear \${${dataVar}?.customerName},\\n\\nYour ${docType} *\${${dataVar}?.${numberField} || "N/A"}* has been generated.\\n\\nTotal Amount: *₹\${${dataVar}?.total?.toFixed(2)}*\\n\\nThank you for choosing \${company?.name || "our company"}.\`}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
`;
      content = content.slice(0, lastReturnClose) + modalJSX + content.slice(lastReturnClose);
      console.log(`  ✓ Added WhatsAppModal JSX in ${file}`);
    } else {
      console.log(`  ⚠ Could not find return close in ${file}`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Done: ${file}`);
});

console.log('\nAll files processed!');
