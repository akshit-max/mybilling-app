const fs = require('fs');

const INDIAN_STATES = `
const INDIAN_STATES = [
  "", "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];
`;

const dropDownHTMLSettings = `
                    <select 
                      value={stateName}
                      onChange={(e) => handleChange(setStateName, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-700 font-semibold"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s === "" ? "Select State" : s}</option>
                      ))}
                    </select>
`;

const dropDownHTMLCustomers = `
              {/* State */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  STATE
                </label>
                <select 
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-700 font-semibold"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s === "" ? "Select State" : s}</option>
                  ))}
                </select>
              </div>
`;

// 1. Update settings/page.tsx
try {
  let settingsContent = fs.readFileSync('src/app/dashboard/settings/page.tsx', 'utf8');
  if (!settingsContent.includes('INDIAN_STATES')) {
      settingsContent = settingsContent.replace('export default function SettingsPage() {', INDIAN_STATES + '\nexport default function SettingsPage() {');
      settingsContent = settingsContent.replace(
          /<input[\s\S]*?placeholder="Enter State"[\s\S]*?value=\{stateName\}[\s\S]*?onChange=\{\(e\) => handleChange\(setStateName, e\.target\.value\)\}[\s\S]*?\/>/,
          dropDownHTMLSettings.trim()
      );
      fs.writeFileSync('src/app/dashboard/settings/page.tsx', settingsContent);
      console.log('Updated settings/page.tsx');
  }
} catch (e) {
  console.log(e);
}

// 2. Update customers/create/page.tsx
try {
  let createContent = fs.readFileSync('src/app/dashboard/customers/create/page.tsx', 'utf8');
  if (!createContent.includes('INDIAN_STATES')) {
      createContent = createContent.replace('export default function CreatePartyPage() {', INDIAN_STATES + '\nexport default function CreatePartyPage() {');
      
      // add state hook
      createContent = createContent.replace(
          /const \[sameAsBilling, setSameAsBilling\] = useState\(true\);/,
          'const [sameAsBilling, setSameAsBilling] = useState(true);\n  const [state, setState] = useState("");'
      );

      // add state to db save
      createContent = createContent.replace(
          /address: billingAddress\.trim\(\),/,
          'address: billingAddress.trim(),\n        state: state.trim(),'
      );

      // add state to reset
      createContent = createContent.replace(
          /setSameAsBilling\(true\);/,
          'setSameAsBilling(true);\n        setState("");'
      );

      // inject UI
      createContent = createContent.replace(
          /<div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">/,
          '<div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">\n' + dropDownHTMLCustomers
      );
      fs.writeFileSync('src/app/dashboard/customers/create/page.tsx', createContent);
      console.log('Updated customers/create/page.tsx');
  }
} catch (e) { console.log(e); }

// 3. Update customers/edit/[id]/page.tsx
try {
  let editContent = fs.readFileSync('src/app/dashboard/customers/edit/[id]/page.tsx', 'utf8');
  if (!editContent.includes('INDIAN_STATES')) {
      editContent = editContent.replace('export default function EditPartyPage() {', INDIAN_STATES + '\nexport default function EditPartyPage() {');
      
      // add state hook
      editContent = editContent.replace(
          /const \[sameAsBilling, setSameAsBilling\] = useState\(true\);/,
          'const [sameAsBilling, setSameAsBilling] = useState(true);\n  const [state, setState] = useState("");'
      );

      // fetch state from db
      editContent = editContent.replace(
          /setSameAsBilling\(data\.sameAsBilling !== undefined \? data\.sameAsBilling : true\);/,
          'setSameAsBilling(data.sameAsBilling !== undefined ? data.sameAsBilling : true);\n          setState(data.state || "");'
      );

      // save state to db
      editContent = editContent.replace(
          /address: billingAddress\.trim\(\),/,
          'address: billingAddress.trim(),\n        state: state.trim(),'
      );

      // inject UI
      editContent = editContent.replace(
          /<div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">/,
          '<div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">\n' + dropDownHTMLCustomers
      );
      fs.writeFileSync('src/app/dashboard/customers/edit/[id]/page.tsx', editContent);
      console.log('Updated customers/edit/[id]/page.tsx');
  }
} catch(e) { console.log(e); }
