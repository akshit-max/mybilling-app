const fs = require('fs');

const path = 'src/app/dashboard/invoices/edit/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add missing firestore imports
content = content.replace(
  `import { collection, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore";`,
  `import { collection, getDocs, query, where, updateDoc, doc, getDoc, addDoc, deleteDoc } from "firebase/firestore";`
);

// 2. Fix "banks" to "bankAccounts" in fetchData
content = content.replace(
  `const bq = query(collection(db, "banks"), where("userId", "==", user.uid));`,
  `const bq = query(collection(db, "bankAccounts"), where("userId", "==", user.uid));`
);

// 3. Fix "banks" to "bankAccounts" in handleSaveBank
content = content.replace(
  `await setDoc(doc(db, "banks", bankId), bankData);`,
  `await setDoc(doc(db, "bankAccounts", bankId), bankData);`
);

// 4. Update the sync logic in handleUpdate
const updateSearch = `      await updateDoc(doc(db, "invoices", id), updateData);
      toast.success("Invoice updated successfully! ✅");`;

const updateReplacement = `      await updateDoc(doc(db, "invoices", id), updateData);
      
      // Sync Cash & Bank
      if (invoiceType === "invoice") {
        try {
          // Find existing transaction for this invoice
          const tq = query(collection(db, "cashBankTransactions"), where("userId", "==", user.uid), where("txnNo", "==", invoiceNumber), where("type", "==", "Sales Invoice"));
          const tSnap = await getDocs(tq);
          
          // Reverse old transaction
          if (!tSnap.empty) {
             const oldTxnDoc = tSnap.docs[0];
             const oldTxn = oldTxnDoc.data();
             
             // Reverse balance
             if (oldTxn.received > 0) {
               if (oldTxn.accountId === "cash") {
                  const sRef = doc(db, "settings", user.uid);
                  const sSnap = await getDoc(sRef);
                  const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
                  await updateDoc(sRef, { cashInHand: current - oldTxn.received });
               } else {
                  const bRef = doc(db, "bankAccounts", oldTxn.accountId);
                  const bSnap = await getDoc(bRef);
                  const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
                  await updateDoc(bRef, { balance: current - oldTxn.received });
               }
             }
             
             await deleteDoc(doc(db, "cashBankTransactions", oldTxnDoc.id));
          }
  
          // Apply new transaction
          const amountRec = Number(amountReceived);
          if (amountRec > 0) {
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
        } catch (syncErr) {
          console.error("Cash & Bank sync failed:", syncErr);
        }
      }

      toast.success("Invoice updated successfully! ✅");`;

content = content.replace(updateSearch, updateReplacement);

fs.writeFileSync(path, content);
console.log("Updated invoices/edit/[id]/page.tsx");
