const fs = require('fs');
const files = [
  'src/app/dashboard/quotations/create/page.tsx',
  'src/app/dashboard/quotations/edit/[id]/page.tsx'
];

const companyHeaderHTML = `
          {/* BUSINESS HEADER & LOGO PROFILE */}
          <div className="p-6 flex items-start gap-6 border-b border-gray-100 bg-white">
            <button className="w-32 h-24 border-2 border-dashed border-indigo-200 rounded flex flex-col items-center justify-center text-indigo-500 hover:bg-indigo-50/50 transition-colors shrink-0">
              <span className="text-xs font-bold text-center leading-snug">Add Company<br/>Logo</span>
            </button>
            <div className="flex-1 space-y-1 mt-1">
              <h2 className="text-lg font-bold text-gray-800">My Business Profile</h2>
              <div className="text-[11px] text-gray-500 font-medium flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <p>Address: <span className="text-gray-700">Set your business address</span></p>
                <p>Phone Number: <span className="text-gray-700">Not set</span></p>
                <p>Email: <span className="text-gray-700">Not set</span></p>
                <p>GSTIN: <span className="text-gray-700">Not set</span></p>
                <p>PAN: <span className="text-gray-700">Not set</span></p>
              </div>
            </div>
            <button className="text-xs font-bold text-indigo-600 hover:underline">Hide Details</button>
          </div>
`;

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    // Inject the Company Header just inside the INVOICE ENTRY DESK SHEET
    const searchString = `{/* BILL TO & SHIP TO SPLIT PANELS */}`;
    content = content.replace(searchString, companyHeaderHTML + '\n          ' + searchString);
    
    // Also change "Invoice Prefix" since it's asked in screenshot 2 top right
    // Actually wait, let's inject Invoice Prefix UI inside the Meta Details Panel
    const prefixHTML = `
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Prefix</label>
                <input 
                  type="text"
                  value={"RM/QO/23-24/"}
                  readOnly
                  className="w-full border-b border-gray-200 py-1 text-xs text-gray-500 bg-gray-50 font-mono font-medium" 
                />
              </div>
    `;
    const quotationNoSearch = `<div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Quotation No.</label>`;
    // Inject it right before Quotation No.
    content = content.replace(quotationNoSearch, prefixHTML + '\n              ' + quotationNoSearch);
    
    // Fix the grid columns to accommodate 5 fields instead of 4 (or we just let grid handle it, wait grid-cols-2)
    content = content.replace(/grid grid-cols-2 gap-x-4/, 'grid grid-cols-2 lg:grid-cols-3 gap-x-4');
    
    fs.writeFileSync(f, content);
  }
});
console.log("Updated Create/Edit Quotation Headers");
