const fs = require('fs');
const file = 'src/app/dashboard/products/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variable
if (!content.includes('const [formBatch,')) {
  content = content.replace(
    'const [formItemCode, setFormItemCode] = useState("");',
    'const [formItemCode, setFormItemCode] = useState("");\n  const [formBatch, setFormBatch] = useState("");\n  const [enableItemBatching, setEnableItemBatching] = useState(false);'
  );
}

// 2. Fetch settings
if (!content.includes('setEnableItemBatching(true)')) {
  content = content.replace(
    'const fetchCategoriesList = async (userUid: string) => {',
    `const fetchSettings = async (userUid: string) => {
    try {
      const snap = await getDoc(doc(db, "settings", userUid));
      if (snap.exists() && snap.data().enableItemBatching) {
        setEnableItemBatching(true);
      }
    } catch(err) { console.error(err); }
  };

  const fetchCategoriesList = async (userUid: string) => {`
  );

  content = content.replace(
    'fetchCategoriesList(u.uid);',
    'fetchCategoriesList(u.uid);\n        fetchSettings(u.uid);'
  );
}

// 3. Reset in Create Modal
if (!content.includes('setFormBatch("");')) {
  content = content.replace(
    'setFormItemCode("");',
    'setFormItemCode("");\n    setFormBatch("");'
  );
}

// 4. Load in Edit Modal
if (!content.includes('setFormBatch(data.batch || "");')) {
  content = content.replace(
    'setFormItemCode(data.itemCode || data.barcode || "");',
    'setFormItemCode(data.itemCode || data.barcode || "");\n        setFormBatch(data.batch || "");'
  );
}

// 5. Save in handleSaveModal
if (!content.includes('batch: formBatch.trim()')) {
  content = content.replace(
    'barcode: formItemCode.trim() || null,',
    'barcode: formItemCode.trim() || null,\n        batch: formBatch.trim() || null,'
  );
}

// 6. UI Element
if (!content.includes('value={formBatch}')) {
  const uiTarget = `                        {formItemCode.trim() && (
                          <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Code</p>
                            <p className="text-[10px] font-mono font-bold text-gray-700 mt-1 tracking-widest uppercase">{formItemCode.trim()}</p>
                            </div>
                            <button onClick={() => setFormItemCode("")} className="text-gray-400 hover:text-red-500 p-1"><X size={14}/></button>
                          </div>
                        )}
                      </div>
                    </div>`;
  
  const uiReplacement = uiTarget + `
                    
                    {enableItemBatching && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Item Batch Number</label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-gray-50"
                            placeholder="e.g. BATCH-001"
                            value={formBatch}
                            onChange={(e) => setFormBatch(e.target.value)}
                          />
                        </div>
                      </div>
                    )}`;

  // Let's use a simpler replace strategy for the UI to avoid formatting mismatches
  content = content.replace(
    '                        {formItemCode.trim() && (',
    `                        {formItemCode.trim() && (`
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Patched products/page.tsx');
