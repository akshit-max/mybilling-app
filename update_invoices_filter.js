const fs = require('fs');

const path = 'src/app/dashboard/invoices/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const searchDropdown = `<option value="estimate">Estimate</option>`;
const replaceDropdown = `<option value="estimate">Estimate</option>
              <option value="pos">POS Bill</option>`;

// We don't have to change the `typeMatch` logic because `typeFilter === "pos"` will match `inv.invoiceType === "pos"`.

content = content.replace(searchDropdown, replaceDropdown);

fs.writeFileSync(path, content);
console.log("Added POS to type filter dropdown in invoices.");
