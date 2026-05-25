const fs = require('fs');

const files = [
  'src/app/dashboard/purchase-return/[id]/page.tsx',
  'src/app/dashboard/debit-note/[id]/page.tsx',
  'src/app/dashboard/credit-note/[id]/page.tsx',
  'src/app/dashboard/delivery-challan/[id]/page.tsx',
  'src/app/dashboard/proforma-invoice/[id]/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Imports
  if (!content.includes('SMSModal')) {
    content = content.replace('import WhatsAppModal from "@/components/ui/WhatsAppModal";', 'import WhatsAppModal from "@/components/ui/WhatsAppModal";\nimport SMSModal from "@/components/ui/SMSModal";');
    changed = true;
  }
  if (!content.includes('FileText')) {
    content = content.replace('MoreVertical,', 'MoreVertical,\n  FileText,\n  FileSpreadsheet,\n  CheckSquare,');
    changed = true;
  }
  
  // 2. States
  if (!content.includes('showSMSModal')) {
    content = content.replace('const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);', 'const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);\n  const [showSMSModal, setShowSMSModal] = useState(false);');
    changed = true;
  }

  // 3. Dropdown Add SMS option
  if (!content.includes('<span>SMS</span>') && content.includes('<span>WhatsApp</span>')) {
    const smsBtn = `
                  <button onClick={() => { setShowSMSModal(true); setIsShareOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50">
                    <FileText size={14} />
                    <span>SMS</span>
                  </button>
                </div>`;
    content = content.replace('</span>\n                  </button>\n                </div>', '</span>\n                  </button>' + smsBtn);
    changed = true;
  }

  // 4. Add SMS Modal at bottom
  if (!content.includes('<SMSModal')) {
    const smsModal = `
      {showSMSModal && (
        <SMSModal
          isOpen={showSMSModal}
          onClose={() => setShowSMSModal(false)}
          customerName={"Customer"}
          customerPhone={""}
          invoiceNumber={"1"}
          totalAmount={0}
          invoiceId={id}
        />
      )}
    </div>`;
    content = content.replace('</div>\n  );\n}', smsModal + '\n  );\n}');
    changed = true;
  }

  // 5. Add Right Actions Side (E-Way Bill & E-Invoice)
  if (!content.includes('Generate E-way Bill')) {
    const rightActions = `
          </div>
          
          {/* Right Actions Side (Eway / e-Invoice) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push(\`/dashboard/e-way-bill/generate/\${id}\`)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-md px-3.5 py-1.5 transition shadow-sm"
            >
              <FileSpreadsheet size={13} />
              <span>Generate E-way Bill</span>
            </button>
            
            <button 
              onClick={() => router.push(\`/dashboard/e-invoicing/generate/\${id}\`)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-md px-3.5 py-1.5 transition shadow-sm"
            >
              <CheckSquare size={13} />
              <span>Generate e-Invoice</span>
            </button>
          </div>
        </div>`;
    
    // Attempt to inject it after the left side actions. The left side is in a flex container that closes right before the split body wrapper.
    const searchString = `            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto`;
    if (content.includes(searchString)) {
        content = content.replace(searchString, rightActions + '\n\n        <div className="flex-1 overflow-y-auto');
        changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed receipts in ' + file);
  }
});
