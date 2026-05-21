const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'create', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update handleSave signature
content = content.replace(/const handleSave = async \(\) => {/, 'const handleSave = async (isNew = false) => {');

// 2. Fix the inventory logic
const oldInventoryLogic = `// Deduct live stock
        for (const item of validItems) {
          if (item.productId) {
            const ref = doc(db, "products", item.productId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const stock = snap.data().stock || 0;
              if (item.qty > stock) {
                return toast.error(\`Insufficient stock for \${item.name}. (Available: \${stock})\`);
              }
              await updateDoc(ref, {
                stock: stock - item.qty,
              });
            }
          }
        }`;

const newInventoryLogic = `// Increase live stock (Purchase)
        for (const item of validItems) {
          if (item.productId) {
            const ref = doc(db, "products", item.productId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const stock = snap.data().stock || 0;
              await updateDoc(ref, {
                stock: stock + item.qty,
              });
            }
          }
        }`;

content = content.replace(oldInventoryLogic, newInventoryLogic);

// 3. Remove offline check logic. The easiest way is to just let it save online for now.
// Let's just find and replace the offline check.
content = content.replace(/if \(isOfflineMode\) \{[\s\S]*?return;\n      \}/, '');
content = content.replace(/let isOfflineMode = !navigator\.onLine;[\s\S]*?isOfflineMode = true;\n        \}\n      \}/, '');

// 4. Update router redirect and handle isNew
content = content.replace(/router\.push\("\/dashboard\/invoices"\);/g, `if (isNew) {\n        window.location.reload();\n      } else {\n        router.push("/dashboard/purchases");\n      }`);

fs.writeFileSync(filePath, content);
console.log("handleSave and inventory logic fixed.");
