const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'create', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Original Inv No state
if (!content.includes('originalInvNo')) {
    content = content.replace(
        /const \[paymentTerms, setPaymentTerms\] = useState<string>\("30"\);/,
        'const [paymentTerms, setPaymentTerms] = useState<string>("30");\n  const [originalInvNo, setOriginalInvNo] = useState("");'
    );
}

// 2. Add Original Inv No field to invoice data
if (!content.includes('originalInvoiceNumber: originalInvNo')) {
    content = content.replace(
        /purchaseInvoiceNumber,/,
        'purchaseInvoiceNumber,\n        originalInvoiceNumber: originalInvNo,'
    );
}

// 3. Add Original Inv No UI. 
// Let's find the section with Purchase Inv Date
const dateUIStr = `<div className="space-y-1">\n                      <label className="text-[10px] font-bold text-gray-500 uppercase">Purchase Inv Date:</label>\n                      <input \n                        type="date"\n                        value={invoiceDate}\n                        onChange={(e) => setInvoiceDate(e.target.value)}\n                        className="w-full border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white"\n                      />\n                    </div>`;

if (content.includes(dateUIStr) && !content.includes('Original Inv No.')) {
    const originalInvUI = `\n                    <div className="space-y-1">\n                      <label className="text-[10px] font-bold text-gray-500 uppercase">Original Inv No.</label>\n                      <input \n                        type="text"\n                        value={originalInvNo}\n                        onChange={(e) => setOriginalInvNo(e.target.value)}\n                        className="w-full border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white"\n                      />\n                    </div>`;
    content = content.replace(dateUIStr, dateUIStr + originalInvUI);
    // Also need to change grid-cols-2 to grid-cols-3 for the top row
    content = content.replace(/<div className="grid grid-cols-2 gap-4 mb-4">/g, '<div className="grid grid-cols-3 gap-4 mb-4">');
}

// 4. Update 'Upload using Phone' button in header
const settingsBtnStr = `<button \n            onClick={() => setShowSettingsModal(true)}\n            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded bg-white hover:bg-gray-50 font-semibold transition-colors"\n          >\n            <Settings2 size={13} className="text-indigo-500" />\n            <span>Settings</span>\n          </button>`;

if (content.includes(settingsBtnStr) && !content.includes('Upload using Phone')) {
    const uploadBtnStr = `<button \n            className="flex items-center gap-1 text-xs text-orange-600 border border-orange-200 px-3 py-1.5 rounded bg-white hover:bg-orange-50 font-bold transition-colors shadow-sm"\n          >\n            <ScanBarcode size={13} />\n            <span>Upload using Phone</span>\n          </button>\n          ` + settingsBtnStr;
    content = content.replace(settingsBtnStr, uploadBtnStr);
}

// 5. Change Add Customer Party to Add Party
content = content.replace(/\+ Add Customer Party/g, '+ Add Party');
content = content.replace(/Change Party/g, 'Change Party'); // ensure it says Change Party

fs.writeFileSync(filePath, content);
console.log("UI elements fixed.");
