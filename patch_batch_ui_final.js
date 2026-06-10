const fs = require('fs');
const file = 'src/app/dashboard/products/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchor = '{/* Live QR / Barcode Preview */}';

if (content.includes(anchor) && !content.includes('Item Batch Number')) {
  const replacement = `{enableItemBatching && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Item Batch Number
                            </label>
                            <input 
                              type="text" 
                              value={formBatch}
                              onChange={(e) => setFormBatch(e.target.value)}
                              placeholder="e.g. BATCH-001"
                              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono bg-white"
                            />
                            <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                              Assign a batch number for tracking in Godown.
                            </p>
                          </div>
                        )}

                        {/* Live QR / Barcode Preview */}`;
  content = content.replace(anchor, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Final patch applied.');
} else {
  console.log('Already applied or anchor not found.');
}
