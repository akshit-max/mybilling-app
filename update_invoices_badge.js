const fs = require('fs');

const path = 'src/app/dashboard/invoices/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const search = `{inv.invoiceType === "estimate" ? (
                          <span className="text-orange-600 bg-orange-50 border border-orange-100 rounded-sm text-[9px] px-1 py-0.5 mr-1 font-bold">EST</span>
                        ) : null}`;

const replace = `{inv.invoiceType === "estimate" ? (
                          <span className="text-orange-600 bg-orange-50 border border-orange-100 rounded-sm text-[9px] px-1 py-0.5 mr-1 font-bold">EST</span>
                        ) : inv.invoiceType === "pos" ? (
                          <span className="text-blue-600 bg-blue-50 border border-blue-100 rounded-sm text-[9px] px-1 py-0.5 mr-1 font-bold">POS</span>
                        ) : null}`;

content = content.replace(search, replace);

fs.writeFileSync(path, content);
console.log("Updated invoices/page.tsx to show POS badges.");
