const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/quotations/page.tsx', 'utf8');

// 1. Remove the metric summary cards. They start with {/* METRIC SUMMARY CARDS GROUP */} and end before {/* TABLE SECTION */}
c = c.replace(/\{\/\* METRIC SUMMARY CARDS GROUP \*\/\}[\s\S]*?(?=\{\/\* TABLE SECTION \*\/)/, '');

// 2. Change table headers
c = c.replace(/Invoice Number/g, 'Quotation Number');

// 3. Instead of showing "Pending", we want to show "Open" for estimate statuses.
// Let's modify the row status rendering.
c = c.replace(
  /\{inv\.status === "paid" \? "Paid" : inv\.status === "credit" \? "Credit" : inv\.status === "cancelled" \? "Cancelled" : "Pending"\}/g,
  '{inv.status === "pending" || inv.status === "open" ? "Open" : inv.status === "cancelled" ? "Cancelled" : inv.status}'
);

// 4. Overdue days logic. Screenshot 1 says "Overdue by 26 days" in red if it's past due.
// Currently invoices/page.tsx has `Due in ${Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days`
// We should replace that entirely.
const overdueReplacement = `
                            {inv.dueDate ? (() => {
                              const diffDays = Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                              if (diffDays < 0) {
                                return <span className="text-red-500 font-medium">Overdue by {Math.abs(diffDays)} days</span>;
                              }
                              return \`Due in \${diffDays} days\`;
                            })() : "-"}
`;
c = c.replace(/\{inv\.dueDate \? \[`Due in \$\{Math\.ceil\(\(new Date\(inv\.dueDate\)\.getTime\(\) - new Date\(\)\.getTime\(\)\) \/ \(1000 \* 3600 \* 24\)\)\} days`\] : "-"\}/g, overdueReplacement);

fs.writeFileSync('src/app/dashboard/quotations/page.tsx', c);
console.log("Cleaned up Quotations UI");
