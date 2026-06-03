# Developer Guide: Ledger Synchronization & Atomic Read-Then-Write

This document outlines the standard architecture and implementation pattern for any module that interacts with the `cashBankTransactions` ledger in the Billing System (e.g., Invoices, Purchases, Returns, Payments).

## Overview

To maintain accurate double-entry accounting principles and ensure that Cash and Bank balances are always correctly synced with the actual transactions, **ALL** modules that create or edit financial records must automatically log the corresponding ledger effect in the `cashBankTransactions` collection.

When creating a *new* document, simply append the `cashBankTransactions` log and update the account balance.

However, when **editing** an existing document, you must follow the strict **Read-Then-Write Reversal** pattern to prevent duplicate entries or balance desynchronization.

## The Read-Then-Write Reversal Pattern

Every edit flow that impacts the ledger MUST execute the following 3-step atomic sequence:

### 1. Query Existing Transaction
Locate the existing ledger log associated with the transaction you are editing.
```typescript
const tq = query(
  collection(db, "cashBankTransactions"), 
  where("userId", "==", user.uid), 
  where("txnNo", "==", documentNumber), 
  where("type", "==", "Transaction Type")
);
const tSnap = await getDocs(tq);
```

### 2. Reverse & Delete (Read)
If a transaction exists, read its effect (`paid` or `received`) and mathematically reverse it from the current account balance (Cash or Bank). Then, delete the old transaction document.

```typescript
if (!tSnap.empty) {
  const oldTxnDoc = tSnap.docs[0];
  const oldTxn = oldTxnDoc.data();
  
  // Example for an Outward flow (money was paid out)
  if (oldTxn.paid > 0) {
    const bRef = doc(db, "bankAccounts", oldTxn.accountId); // or "settings" for cash
    const bSnap = await getDoc(bRef);
    const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
    
    // Reverse the payout by adding it back
    await updateDoc(bRef, { balance: current + oldTxn.paid });
  }
  
  // Delete old log
  await deleteDoc(doc(db, "cashBankTransactions", oldTxnDoc.id));
}
```

### 3. Apply New State (Write)
Calculate the *new* ledger effect based on the updated document state, apply it to the account balance, and create a fresh `cashBankTransactions` log.

```typescript
const amountPaidNum = Number(newAmount);
if (amountPaidNum > 0) {
  const bRef = doc(db, "bankAccounts", paymentMode);
  const bSnap = await getDoc(bRef);
  const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
  
  // Apply new payout by subtracting it
  const newBalance = Math.max(0, current - amountPaidNum);
  await updateDoc(bRef, { balance: newBalance });

  // Create new log
  await addDoc(collection(db, "cashBankTransactions"), {
    userId: user.uid,
    accountId: paymentMode,
    type: "Transaction Type",
    txnNo: documentNumber,
    date: documentDate,
    party: partyName,
    mode: "Bank",
    paid: amountPaidNum,
    received: 0,
    balanceAfter: newBalance,
    remarks: "Updated transaction",
    createdAt: new Date()
  });
}
```

## Security & Multi-Tenancy
- **Always** scope queries with `where("userId", "==", user.uid)`.
- Use `Math.max(0, ...)` to prevent negative cash balances where applicable, but be cautious with credit scenarios.
- Do NOT skip the reversal step. Attempting to calculate the "delta" manually is prone to race conditions and edge-case errors. The `Revert -> Delete -> Re-apply` sequence is the required standard for data integrity.

## Auditing UI
All synced transactions are automatically available in the **Cash & Bank** dashboard (`/dashboard/cash-bank`). Users can view their ledger, filter by account, and download statements to reconcile against physical bank statements.
