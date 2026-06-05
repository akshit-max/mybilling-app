import fs from 'fs';

let content = fs.readFileSync('src/app/dashboard/invoices/edit/[id]/page.tsx', 'utf8');

// 1. Fix global discount value `percentage` -> `percent`
content = content.replace(
  /<option value="percentage">Percentage \(%\)<\/option>/g,
  '<option value="percent">%</option>'
);
content = content.replace(
  /<option value="flat">Flat \(₹\)<\/option>/g,
  '<option value="flat">₹</option>'
);

// 2. Add DISCOUNT column to header grid
content = content.replace(
  /<span className="col-span-1 text-center">NO\.<\/span>\s*<span className="col-span-4">ITEMS \/ SERVICES<\/span>\s*<span className="col-span-2 text-center">HSN \/ SAC<\/span>\s*<span className="col-span-1 text-center">QTY<\/span>\s*<span className="col-span-2 text-right">PRICE\/ITEM \(₹\)<\/span>\s*<span className="col-span-1 text-center">TAX<\/span>\s*<span className="col-span-1 text-right">AMOUNT \(₹\)<\/span>/g,
  `<span className="col-span-1 text-center">NO.</span>
              <span className="col-span-3">ITEMS / SERVICES</span>
              <span className="col-span-1 text-center">HSN</span>
              <span className="col-span-1 text-center">QTY</span>
              <span className="col-span-2 text-right">RATE</span>
              <span className="col-span-2 text-center">DISCOUNT</span>
              <span className="col-span-1 text-center">TAX</span>
              <span className="col-span-1 text-right">AMOUNT</span>`
);

// 3. Fix grid widths in row mapping to match new header
content = content.replace(
  /<div className="col-span-11 md:col-span-4 relative">/g,
  '<div className="col-span-11 md:col-span-3 relative">'
);
content = content.replace(
  /<div className="col-span-4 md:col-span-2">\s*<input\s*type="text"\s*placeholder="HSN \(Optional\)"/g,
  '<div className="col-span-4 md:col-span-1">\n                      <input\n                        type="text"\n                        placeholder="HSN"'
);
content = content.replace(
  /<input\s*type="text"\s*placeholder="Qty"/g,
  '<input\n                        type="number"\n                        placeholder="Qty"'
);
content = content.replace(
  /<input\s*type="text"\s*placeholder="Price"/g,
  '<input\n                        type="number"\n                        placeholder="Price"'
);

// 4. Inject Discount Column into row BEFORE GST Rate
const discountBlock = `
                    {/* Per-item Discount (₹ or %) */}
                    <div className="col-span-3 md:col-span-2">
                      <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white mt-0.5 w-full">
                        <select
                          value={(item as any).discountType ?? "percent"}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], discountType: e.target.value } as any;
                            setItems(updated);
                          }}
                          className="px-1 py-1 text-[10px] font-bold text-gray-500 bg-transparent border-r border-gray-200 focus:outline-none cursor-pointer"
                        >
                          <option value="percent">%</option>
                          <option value="flat">₹</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          value={(item as any).discountValue ?? ""}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], discountValue: e.target.value === "" ? undefined : Number(e.target.value) } as any;
                            setItems(updated);
                          }}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-xs focus:outline-none font-mono text-right bg-transparent"
                        />
                      </div>
                    </div>

                    {/* GST Rate */}
`;
content = content.replace(/\{\/\* GST Rate \*\/\}/g, discountBlock.trim());

// 5. Fix AMOUNT column logic
content = content.replace(
  /₹\{\(\(Number\(item\.qty \|\| 0\)\) \* \(Number\(item\.price \|\| 0\)\)\)\.toFixed\(2\)\}/g,
  '₹{Math.max(0, ((Number(item.qty) || 0) * (Number(item.price) || 0)) - ((item as any).discountType === "flat" ? (Number((item as any).discountValue) || 0) : ((Number(item.qty) || 0) * (Number(item.price) || 0)) * (Number((item as any).discountValue ?? item.discountPct ?? 0) / 100))).toFixed(2)}'
);

fs.writeFileSync('src/app/dashboard/invoices/edit/[id]/page.tsx', content);
console.log('Edit page patched for sync');
