const fs = require('fs');
const file = 'src/app/dashboard/products/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variable
if (!content.includes('const [formEnableBatching,')) {
  content = content.replace(
    'const [formBatch, setFormBatch] = useState("");',
    'const [formBatch, setFormBatch] = useState("");\n  const [formEnableBatching, setFormEnableBatching] = useState(false);'
  );
}

// 2. Reset in Create Modal
if (!content.includes('setFormEnableBatching(false);')) {
  content = content.replace(
    'setFormBatch("");',
    'setFormBatch("");\n    setFormEnableBatching(false);'
  );
}

// 3. Load in Edit Modal
if (!content.includes('setFormEnableBatching(!!data.enableBatching);')) {
  content = content.replace(
    'setFormBatch(data.batch || "");',
    'setFormBatch(data.batch || "");\n        setFormEnableBatching(!!data.enableBatching);'
  );
}

// 4. Save in handleSaveModal
if (!content.includes('enableBatching: formEnableBatching,')) {
  content = content.replace(
    'batch: formBatch.trim() || null,',
    'batch: formBatch.trim() || null,\n        enableBatching: formEnableBatching,'
  );
}

// 5. Update UI
const uiToggle = `
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest block mb-0.5">Enable Batch Tracking</label>
                            <p className="text-[9px] text-gray-400 leading-tight">Track batches and expirations for this specific item.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormEnableBatching(!formEnableBatching)}
                            className={\`w-9 h-5 rounded-full relative cursor-pointer flex items-center px-0.5 transition-colors \${formEnableBatching ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"}\`}
                          >
                            <span className="w-4 h-4 bg-white rounded-full shadow-sm block"></span>
                          </button>
                        </div>
`;

if (content.includes('{enableItemBatching && (')) {
  content = content.replace(
    '{enableItemBatching && (',
    uiToggle + '\n                        {formEnableBatching && ('
  );
  content = content.replace(
    '<div className="mt-4 pt-4 border-t border-gray-100">',
    '<div className="mt-4">'
  );
} else if (content.includes('{formEnableBatching && (')) {
    console.log("Already replaced enableItemBatching with formEnableBatching");
}

fs.writeFileSync(file, content, 'utf8');
console.log('Toggle patch applied.');
