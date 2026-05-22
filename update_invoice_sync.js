const fs = require('fs');

const pathCreate = 'src/app/dashboard/invoices/create/page.tsx';
let contentCreate = fs.readFileSync(pathCreate, 'utf8');

// 1. Update Payment Dropdown
const dropdownSearch = `<select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="border border-gray-200 rounded py-1 text-[10px] focus:outline-none bg-white text-gray-600 font-semibold cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                    </select>`;
const dropdownReplacement = `<select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="border border-gray-200 rounded py-1 px-1 text-[10px] focus:outline-none bg-white text-gray-600 font-semibold cursor-pointer max-w-[100px]"
                    >
                      <option value="Cash">Cash</option>
                      {bankAccounts.filter((b: any) => b.status !== "inactive").map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>`;
contentCreate = contentCreate.replace(dropdownSearch, dropdownReplacement);


// 2. Add Transaction Logic to Save
const saveSearch = `await addDoc(collection(db, "invoices"), invoiceData);
      toast.success("Sales Invoice created successfully! ✅");`;

const saveReplacement = `const invRef = await addDoc(collection(db, "invoices"), invoiceData);
      
      // Update Cash & Bank Balance
      const amountRec = Number(amountReceived);
      if (amountRec > 0 && invoiceType === "invoice") {
        const isCash = paymentMode === "Cash";
        let newBalance = 0;
        if (isCash) {
           const sRef = doc(db, "settings", user.uid);
           const sSnap = await getDoc(sRef);
           const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
           newBalance = current + amountRec;
           await updateDoc(sRef, { cashInHand: newBalance });
        } else {
           const bRef = doc(db, "bankAccounts", paymentMode);
           const bSnap = await getDoc(bRef);
           const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
           newBalance = current + amountRec;
           await updateDoc(bRef, { balance: newBalance });
        }
        
        await addDoc(collection(db, "cashBankTransactions"), {
          userId: user.uid,
          accountId: isCash ? "cash" : paymentMode,
          type: "Sales Invoice",
          txnNo: invoiceNumber,
          date: invoiceDate,
          party: customerName,
          mode: isCash ? "Cash" : "Bank",
          paid: 0,
          received: amountRec,
          balanceAfter: newBalance,
          remarks: \`Received against Invoice #\${invoiceNumber}\`,
          createdAt: new Date()
        });
      }

      toast.success("Sales Invoice created successfully! ✅");`;
contentCreate = contentCreate.replace(saveSearch, saveReplacement);

fs.writeFileSync(pathCreate, contentCreate);
console.log("Updated invoices/create/page.tsx");


// Do the same for Edit page
const pathEdit = 'src/app/dashboard/invoices/edit/[id]/page.tsx';
if (fs.existsSync(pathEdit)) {
  let contentEdit = fs.readFileSync(pathEdit, 'utf8');
  contentEdit = contentEdit.replace(dropdownSearch, dropdownReplacement);
  
  // Note: Edit page needs a bit more care to reverse old transaction, but the user approved "Keep it simple for now; sync automatically on creation only".
  // So we will just replace the dropdown UI in Edit so it displays the bank properly, but we won't mutate cashBankTransactions during edit as agreed.
  
  fs.writeFileSync(pathEdit, contentEdit);
  console.log("Updated invoices/edit/[id]/page.tsx");
}
