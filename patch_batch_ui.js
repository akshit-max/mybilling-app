const fs = require('fs');
const file = 'src/app/dashboard/products/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const uiTarget = `<div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Item Code (Barcode)</label>
                        <button type="button" onClick={handleBarcodeGenerate} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1">
                           <Sparkles size={10}/> Auto Generate
                        </button>
                      </div>`;

if (content.includes(uiTarget) && !content.includes('value={formBatch}')) {
  const replacement = uiTarget.replace('<div className="space-y-4">', 
  `<div className="space-y-4">
                      {enableItemBatching && (
                        <div className="mb-4">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Item Batch Number</label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-gray-50"
                            placeholder="e.g. BATCH-001"
                            value={formBatch}
                            onChange={(e) => setFormBatch(e.target.value)}
                          />
                        </div>
                      )}`);
                      
  content = content.replace(uiTarget, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched UI in products/page.tsx');
} else {
  console.log('UI target not found or already patched.');
}
