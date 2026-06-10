const fs = require('fs');
const file = 'src/app/dashboard/products/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchor = '                        <p className="text-[9px] text-gray-400 mt-1 leading-tight">\n                          You can type a custom code or auto-generate. Use the × button to clear and retype.\n                        </p>';
const target = anchor + '\n\n                        {/* Live QR / Barcode Preview */}';

if (content.includes(anchor)) {
  const replacement = anchor + `\n\n                        {enableItemBatching && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Item Batch Number
                            </label>
                            <input 
                              type="text" 
                              value={formBatch}
                              onChange={(e) => setFormBatch(e.target.value)}
                              placeholder="e.g. BATCH-001"
                              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                              Assign a batch number for tracking in Godown.
                            </p>
                          </div>
                        )}\n\n                        {/* Live QR / Barcode Preview */}`;
  
  // replace exact string
  const newContent = content.replace(target, replacement);
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('UI Patched successfully');
  } else {
    console.log('Content matched but replace did nothing (maybe already patched?)');
  }
} else {
  console.log('Anchor not found!');
}
