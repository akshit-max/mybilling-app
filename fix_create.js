const fs = require('fs');

const filePath = 'd:\\Billing-app\\billing-app\\src\\app\\dashboard\\quotations\\create\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// REVERT MISTAKE on line 1646
content = content.replace(
`                  <input 
                    type="text"
                    placeholder="Search customer or party..."
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowPartyDropdown(true);
                    }}
                    onFocus={() => setShowPartyDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-700 bg-white"
                  />`,
`                  <input 
                    type="number"
                    placeholder="₹ 0.00"
                    value={newBank.balance}
                    onChange={(e) => setNewBank({ ...newBank, balance: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />`
);

// APPLY PARTY BLUR
content = content.replace(
`                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowPartyDropdown(true);
                  }}
                  onFocus={() => setShowPartyDropdown(true)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-700 bg-white"`,
`                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowPartyDropdown(true);
                  }}
                  onFocus={() => setShowPartyDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-700 bg-white"`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed quotations/create/page.tsx');
