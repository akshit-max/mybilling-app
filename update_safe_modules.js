const fs = require('fs');
const files = [
  'd:/Billing-app/billing-app/src/app/dashboard/proforma-invoice/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/proforma-invoice/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/delivery-challan/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/delivery-challan/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/credit-note/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/credit-note/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/debit-note/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/debit-note/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-orders/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-orders/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/automated-bills/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/automated-bills/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/sales-return/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/sales-return/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-return/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-return/edit/[id]/page.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. validItems
  const validItemsRegex = /const validItems = items\s*\.filter\(\(i\) => i\.name && Number\(i\.qty\) > 0 && Number\(i\.price\) > 0\)\s*\.map\(\(i\) => \(\{\s*\.\.\.i,[\s\S]*?hsn: \(i as any\)\.hsn \|\| "",\s*\}\)\);/;
  if (validItemsRegex.test(content)) {
    content = content.replace(validItemsRegex, `const validItems = items
    .filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0)
    .map((i) => {
      const sanitized = {
        ...i,
        qty: Number(i.qty),
        price: Number(i.price),
        gstRate: (i.gstRate !== undefined && i.gstRate !== null) ? Number(i.gstRate) : undefined,
        discountType: (i as any).discountType || "percent",
        discountValue: (i as any).discountValue !== undefined ? Number((i as any).discountValue) : undefined,
        discountPct: (i as any).discountType === "percent" && (i as any).discountValue !== undefined
          ? Number((i as any).discountValue)
          : (i as any).discountPct,
        hsn: (i as any).hsn || "",
      };
      if (sanitized.productId === "CUSTOM") {
        delete sanitized.productId;
      }
      return sanitized;
    });`);
    changed = true;
  } else {
    console.log('validItems skip:', file);
  }

  // 2. Hydration
  const hydrationRegex = /const fetchedItems = loadedInvoice\.items \|\| \[\];\s*setItems\(fetchedItems\);\s*setOriginalItems\(fetchedItems\);/;
  if (hydrationRegex.test(content)) {
    content = content.replace(hydrationRegex, `const fetchedItems = (loadedInvoice.items || []).map((i: any) => ({
            ...i,
            productId: i.productId ? i.productId : (i.name ? "CUSTOM" : "")
          }));
          setItems(fetchedItems);
          setOriginalItems(fetchedItems);`);
    changed = true;
  }

  // 3. Stock loops
  content = content.replace(/if \(item\.productId\) oldMap\.set\(item\.productId, Number\(item\.qty \|\| 0\)\);/g, 'if (item.productId && item.productId !== "CUSTOM") oldMap.set(item.productId, Number(item.qty || 0));');
  content = content.replace(/if \(item\.productId\) newMap\.set\(item\.productId, Number\(item\.qty \|\| 0\)\);/g, 'if (item.productId && item.productId !== "CUSTOM") newMap.set(item.productId, Number(item.qty || 0));');

  // 4. UI Toggle
  const selectRegex = /<select[\s\S]*?onChange=\{\(e\) => \{[\s\S]*?const found = products\.find\(p => p\.id === e\.target\.value\);[\s\S]*?\}\}\s*className="([^"]+)"\s*>[\s\S]*?<option value="">Select Item \/ Product\.\.\.<\/option>[\s\S]*?<\/select>/;

  if (selectRegex.test(content)) {
    content = content.replace(selectRegex, (match, className) => {
      let modifiedSelect = match.replace('const found = products.find(p => p.id === e.target.value);', `const val = e.target.value;
                          if (val === "CUSTOM") {
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              productId: "CUSTOM",
                              name: "",
                              price: 0,
                              qty: 1,
                              gstRate: 18,
                              hsn: "",
                              description: ""
                            };
                            setItems(updated);
                            return;
                          }
                          const found = products.find(p => p.id === val);`);
      
      modifiedSelect = modifiedSelect.replace('<option value="">Select Item / Product...</option>', `<option value="">Select Item / Product...</option>
                        <option value="CUSTOM" className="font-bold text-indigo-600 bg-indigo-50">+ Add Custom Item (Manual Entry)</option>`);

      return `{item.productId === "CUSTOM" ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                          placeholder="Enter custom service/item name..."
                          className="w-full border border-indigo-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-indigo-50/20 font-medium text-gray-800"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], productId: "", name: "", price: 0, gstRate: 18, hsn: "", description: "" };
                            setItems(updated);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Cancel custom item"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      ${modifiedSelect}
                    )}`;
    });
    changed = true;
  } else {
    console.log('select skip:', file);
  }

  // Inject lucide X import if needed
  if (content.includes('<X size={14} />') && !content.includes(' X ') && !content.includes(', X') && !content.includes('X,')) {
    content = content.replace(/import \{([\s\S]*?)\} from "lucide-react";/, 'import { X, $1 } from "lucide-react";');
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
}
