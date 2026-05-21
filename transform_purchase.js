const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'create', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements
content = content.replace(/Create Sales Invoice/g, 'Create Purchase Invoice');
content = content.replace(/Sales Invoice/g, 'Purchase Invoice');
content = content.replace(/Bill To/g, 'Bill From');
content = content.replace(/invoiceNumber/g, 'purchaseInvoiceNumber');
content = content.replace(/amountReceived/g, 'amountPaid');
content = content.replace(/Amount Received/g, 'Amount Paid');
content = content.replace(/collection\(db, "invoices"\)/g, 'collection(db, "purchases")');

// Original Inv No state addition
content = content.replace(/const \[paymentTerms, setPaymentTerms\] = useState<string>\("30"\);/g, 'const [paymentTerms, setPaymentTerms] = useState<string>("30");\n  const [originalInvNo, setOriginalInvNo] = useState("");');

// Add Original Inv No UI field
const dateSectionRegex = /<div className="text-right">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
// I will just use replace with string to inject the field properly in the UI later manually or semi-manually.

// Inventory Update Logic: Sales DECREASE stock, Purchases INCREASE stock.
// In sales: itemDoc.stock - item.quantity
// For purchases: itemDoc.stock + item.quantity
content = content.replace(/stock: \(itemDoc\.stock \|\| 0\) - item\.quantity/g, 'stock: (itemDoc.stock || 0) + item.quantity');

fs.writeFileSync(filePath, content);
console.log("Transformed purchases create page.");
