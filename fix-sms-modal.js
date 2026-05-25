const fs = require('fs');
const path = require('path');

const files = [
  { file: "purchase-return\\[id]\\page.tsx",     dataVar: "purchaseReturn",   docType: "Purchase Return" },
  { file: "proforma-invoice\\[id]\\page.tsx",    dataVar: "proformaInvoice",  docType: "Proforma Invoice" },
  { file: "sales-return\\[id]\\page.tsx",        dataVar: "invoice",          docType: "Sales Return" },
  { file: "quotations\\[id]\\page.tsx",          dataVar: "invoice",          docType: "Quotation" },
  { file: "purchases\\receipt\\[id]\\page.tsx",  dataVar: "invoice",          docType: "Purchase Receipt" },
  { file: "purchase-orders\\[id]\\page.tsx",     dataVar: "purchaseOrder",    docType: "Purchase Order" },
  { file: "invoices\\[id]\\page.tsx",            dataVar: "invoice",          docType: "Invoice" },
  { file: "delivery-challan\\[id]\\page.tsx",    dataVar: "deliveryChallan",  docType: "Delivery Challan" },
  { file: "credit-note\\[id]\\page.tsx",         dataVar: "creditNote",       docType: "Credit Note" },
  { file: "debit-note\\[id]\\page.tsx",          dataVar: "debitNote",        docType: "Debit Note" },
  { file: "automated-bills\\[id]\\page.tsx",     dataVar: "invoice",          docType: "Automated Bill" }
];

const basePath = "d:\\Billing-app\\billing-app\\src\\app\\dashboard";

files.forEach(({ file, dataVar, docType }) => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Import SMSModal
  if (!content.includes("import SMSModal")) {
    content = content.replace(
      /import WhatsAppModal from ".*?";/,
      `import WhatsAppModal from "@/components/ui/WhatsAppModal";\nimport SMSModal from "@/components/ui/SMSModal";`
    );
  }

  // 2. Add state
  if (!content.includes("const [showSMSModal, setShowSMSModal]")) {
    content = content.replace(
      /const \[showWhatsAppModal, setShowWhatsAppModal\] = useState\(false\);/,
      `const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);\n  const [showSMSModal, setShowSMSModal] = useState(false);`
    );
  }

  // 3. Replace the fake toast button with setShowSMSModal(true)
  content = content.replace(
    /onClick=\{\(\) => \{ toast\.success\("SMS generation started\.\.\. 💬"\); setIsShareOpen\(false\); \}\}/g,
    `onClick={() => { setShowSMSModal(true); setIsShareOpen(false); }}`
  );

  // 4. Inject the modal at the end before </div>
  if (!content.includes("<SMSModal")) {
    const modalCode = `
      {showSMSModal && (
        <SMSModal
          customerName={${dataVar}.customerName || ${dataVar}.partyName || ${dataVar}.supplierName || ""}
          existingPhone={${dataVar}.customerPhone || ${dataVar}.phone || ${dataVar}.mobileNumber || ""}
          message={\`Your ${docType} has been generated.\`}
          onClose={() => setShowSMSModal(false)}
        />
      )}
    </div>
  );
}`;
    
    // Replace the very last "</div>\n  );\n}"
    const lastDivIndex = content.lastIndexOf("</div>\n  );\n}");
    if (lastDivIndex !== -1) {
      content = content.slice(0, lastDivIndex) + modalCode;
    } else {
      // Try alternative ending
      const altIndex = content.lastIndexOf("</div>\n    </div>\n  );\n}");
      if (altIndex !== -1) {
        content = content.slice(0, altIndex) + `      {showSMSModal && (
        <SMSModal
          customerName={${dataVar}.customerName || ${dataVar}.partyName || ${dataVar}.supplierName || ""}
          existingPhone={${dataVar}.customerPhone || ${dataVar}.phone || ${dataVar}.mobileNumber || ""}
          message={\`Your ${docType} has been generated.\`}
          onClose={() => setShowSMSModal(false)}
        />
      )}\n` + content.slice(altIndex);
      }
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated SMSModal in ${file}`);
});
