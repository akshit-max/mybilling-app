const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/invoices/[id]/page.tsx', 'utf8');

// ---- FIX 1: Items table header - add HSN/SAC and DISC columns ----
content = content.replace(
  /<th className="py-2 px-3">ITEMS<\/th>\s*<th className="py-2 px-3 text-center">QTY\.<\/th>\s*<th className="py-2 px-3 text-right">RATE<\/th>\s*<th className="py-2 px-3 text-center">TAX<\/th>\s*<th className="py-2 px-3 text-right">AMOUNT<\/th>/g,
  `<th className="py-2 px-3">ITEMS</th>
                               <th className="py-2 px-3 text-center">HSN/SAC</th>
                               <th className="py-2 px-3 text-center">QTY.</th>
                               <th className="py-2 px-3 text-right">RATE</th>
                               <th className="py-2 px-3 text-center">DISC.</th>
                               <th className="py-2 px-3 text-center">TAX</th>
                               <th className="py-2 px-3 text-right">AMOUNT</th>`
);

// ---- FIX 2: Item row mapping - fix taxRate, add HSN col, disc col, fix amount ----
content = content.replace(
  /\{invoice\.items && invoice\.items\.map\(\(item, idx\) => \{\s*const taxRate = item\.tax \|\| \(invoice\.gstEnabled \? 18 : 0\);\s*return \(\s*<tr key=\{idx\} className="hover:bg-gray-50\/30">\s*<td className="py-2 px-3">\s*<p className="font-bold text-gray-900 uppercase">\{item\.name\}<\/p>\s*\{showDescription && <p className="text-\[9px\] text-gray-400 font-normal mt-0\.5">Custom Item Description<\/p>\}\s*<\/td>\s*<td className="py-2 px-3 text-center font-mono text-gray-900">\s*<span>\{item\.qty\} PCS<\/span>\s*\{freeItemQty && <span className="text-brand-tertiary font-bold block text-\[9px\]">\(\+0 Free\)<\/span>\}\s*<\/td>\s*<td className="py-2 px-3 text-right font-mono text-gray-900">₹\{item\.price\.toFixed\(2\)\}<\/td>\s*<td className="py-2 px-3 text-center font-mono text-gray-500">\{taxRate\}%<\/td>\s*<td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₹\{\(item\.qty \* item\.price\)\.toFixed\(2\)\}<\/td>\s*<\/tr>\s*\);\s*\}\)\}/g,
  `{invoice.items && invoice.items.map((item, idx) => {
                              const taxRate = item.gstRate !== undefined ? item.gstRate
                                            : item.tax !== undefined ? item.tax : 0;
                              const baseAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
                              const afterDiscount = baseAmount * (1 - ((item.discountPct || 0) / 100));
                              return (
                                <tr key={idx} className="hover:bg-gray-50/30">
                                   <td className="py-2 px-3">
                                      <p className="font-bold text-gray-900 uppercase">{item.name}</p>
                                      {item.description && <p className="text-[9px] text-gray-400 font-normal mt-0.5">{item.description}</p>}
                                   </td>
                                   <td className="py-2 px-3 text-center font-mono text-gray-400 text-[9px]">{item.hsn || "—"}</td>
                                   <td className="py-2 px-3 text-center font-mono text-gray-900">
                                     <span>{item.qty} PCS</span>
                                     {freeItemQty && <span className="text-brand-tertiary font-bold block text-[9px]">(+0 Free)</span>}
                                   </td>
                                   <td className="py-2 px-3 text-right font-mono text-gray-900">₹{item.price.toFixed(2)}</td>
                                   <td className="py-2 px-3 text-center font-mono text-gray-400 text-[9px]">{item.discountPct ? \`\${item.discountPct}%\` : "—"}</td>
                                   <td className="py-2 px-3 text-center font-mono text-gray-500">{invoice.gstEnabled && taxRate > 0 ? \`\${taxRate}%\` : "—"}</td>
                                   <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₹{afterDiscount.toFixed(2)}</td>
                                </tr>
                              );
                            })}`
);

// ---- FIX 3: Remove hardcoded IGST (18%) label ----
content = content.replace(/<span>IGST \(18%\)<\/span>/g, '<span>IGST</span>');

// ---- FIX 4: Remove CGST @ X% dynamic calculation (was wrong, use stored values) ----
content = content.replace(
  /<span>CGST @ \{.*?\}%<\/span>\s*<span>₹\{invoice\.cgst\.toFixed\(2\)\}<\/span>/g,
  '<span>CGST</span>\n                                 <span>₹{invoice.cgst.toFixed(2)}</span>'
);
content = content.replace(
  /<span>SGST @ \{.*?\}%<\/span>\s*<span>₹\{invoice\.sgst\.toFixed\(2\)\}<\/span>/g,
  '<span>SGST</span>\n                                 <span>₹{invoice.sgst.toFixed(2)}</span>'
);

// ---- FIX 5: Discount label with % info ----
content = content.replace(
  /<span>Discount<\/span>\s*\n\s*<span>-₹\{invoice\.discountAmount\.toFixed\(2\)\}<\/span>/g,
  `<span>Discount {(invoice as any).discountType === "percent" ? \`(\${(invoice as any).discountValue}%)\` : ""}</span>
                              <span>-₹{invoice.discountAmount.toFixed(2)}</span>`
);

fs.writeFileSync('src/app/dashboard/invoices/[id]/page.tsx', content);
console.log('Done! Applied all fixes to invoice view page.');
