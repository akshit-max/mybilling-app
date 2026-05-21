const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'edit', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements
content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "purchases")');
content = content.replace(/doc\(db, "invoices", id\)/g, 'doc(db, "purchases", id)');
content = content.replace(/router\.push\("\/dashboard\/invoices"\)/g, 'router.push("/dashboard/purchases")');
content = content.replace(/href="\/dashboard\/invoices"/g, 'href="/dashboard/purchases"');
content = content.replace(/UPDATE SALES INVOICE/g, 'UPDATE PURCHASE INVOICE');

content = content.replace(/Sales Invoice/g, 'Purchase Invoice');
content = content.replace(/Invoice No\./g, 'Purchase No.');
content = content.replace(/Invoice Date/g, 'Purchase Date');
content = content.replace(/Bill To/g, 'Bill From');

// Add Original Invoice Number state and UI
const stateAdd = `const [originalInvoiceNumber, setOriginalInvNo] = useState("");\n  const [purchaseInvoiceNumber, setInvoiceNumber] = useState("");`;
content = content.replace(/const \[invoiceNumber, setInvoiceNumber\] = useState\(""\);/, stateAdd);
content = content.replace(/setInvoiceNumber\(loadedInvoice\.invoiceNumber \|\| ""\);/, `setInvoiceNumber(loadedInvoice.purchaseInvoiceNumber || "");\n          setOriginalInvNo(loadedInvoice.originalInvoiceNumber || "");`);

// In the UI, add original invoice number field right after purchase invoice number
const originalInvHtml = `
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Original Invoice No.</label>
                <input
                  type="text"
                  value={originalInvoiceNumber}
                  onChange={(e) => setOriginalInvNo(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white"
                />
              </div>`;
content = content.replace(/(<label className="block text-\[10px\] font-bold text-gray-400 uppercase tracking-wider">Purchase No\.<\/label>[\s\S]*?<\/div>)/, `$1${originalInvHtml}`);

// Update payload
content = content.replace(/invoiceNumber,/g, 'purchaseInvoiceNumber,\n        originalInvoiceNumber,');

// Replace "invoiceNumber" variables with "purchaseInvoiceNumber" inside offline fetch logic
content = content.replace(/inv\.invoiceNumber === id/g, 'inv.purchaseInvoiceNumber === id');

// Stock logic update: Instead of deducting stock on purchase, we add it. Wait, when EDITING a purchase invoice:
// diff = newQty - oldQty
// If we bought 5 more, diff = 5. So we INCREASE stock by 5.
// stock = stock + diff.
// The original code has:
//   if (diff > 0 && diff > stock) { return toast.error("Insufficient local stock for item delta"); }
//   cachedProducts[pIdx].stock = stock - diff;
// I need to change `stock - diff` to `stock + diff` and remove the insufficient stock check (since we are receiving stock).
content = content.replace(/if \(diff > 0 && diff > stock\) {[\s\S]*?}/, '');
content = content.replace(/cachedProducts\[pIdx\]\.stock = stock - diff;/, 'cachedProducts[pIdx].stock = stock + diff;');
content = content.replace(/if \(diff > 0 && diff > stock\) {[\s\S]*?}/, '');
content = content.replace(/stock: stock - diff,/, 'stock: stock + diff,');

fs.writeFileSync(filePath, content);
console.log("Transformed Edit Purchases Page!");
