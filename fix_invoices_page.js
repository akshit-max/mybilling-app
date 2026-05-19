const fs = require('fs');

const file = 'src/app/dashboard/invoices/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Exclude estimates from filtered invoices
c = c.replace(
  /const filteredInvoices = invoices\.filter\(\(inv\) => \{/,
  'const filteredInvoices = invoices.filter((inv) => {\n    if (inv.invoiceType === "estimate") return false;'
);

// 2. Remove the Type Filter state and logic
// We can just leave the state `typeFilter` since it's harmless, but let's remove the dropdown UI
const dropdownSearch = `{/* Type Filter */}`;
const endDropdownSearch = `</select>`;
const dropdownRegex = /\{\/\* Type Filter \*\/\}[\s\S]*?<\/select>/;
c = c.replace(dropdownRegex, '');

// 3. Remove the "Estimates" metric card
const estimatesCardRegex = /<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col justify-center h-22 shadow-xs">\s*<span className="text-\[10px\] text-gray-500 font-bold uppercase tracking-wider mb-1">Estimates<\/span>[\s\S]*?<\/div>/;
c = c.replace(estimatesCardRegex, '');

// 4. Update the Grid columns from grid-cols-4 to grid-cols-3 since we removed the 4th card
c = c.replace(/grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4/, 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3');


fs.writeFileSync(file, c);
console.log("Invoices page cleaned up successfully.");
