"use client";

import React, { useState, useEffect } from "react";
import { Plus, ArrowRightLeft, Download, Building2, Calendar, FileText, ChevronDown, Landmark, Trash2, Pencil, Search, Share2, Printer, Wallet } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, deleteDoc, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

type BankAccount = {
  id: string;
  name: string;
  balance: number;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  branchName?: string;
  status?: "active" | "inactive";
  holderName?: string;
};

type Transaction = {
  id: string;
  type: "add" | "reduce" | "transfer" | "opening";
  txnNo: string;
  date: string;
  party: string;
  mode: string;
  paid: number;
  received: number;
  balanceAfter: number;
  accountId: string; // The primary account this transaction row belongs to
  relatedAccountId?: string; // For transfers
  remarks?: string;
  createdAt: any;
};

export default function CashAndBankPage() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("30");
  
  const [cashInHand, setCashInHand] = useState<number>(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [selectedAccount, setSelectedAccount] = useState<string>("cash"); // "cash", "unlinked", or bankId

  // Modals State
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showUpdateBank, setShowUpdateBank] = useState(false);
  const [showShareBank, setShowShareBank] = useState(false);
  const [updateBankData, setUpdateBankData] = useState<BankAccount | null>(null);

  // Add Bank Form
  const [newBank, setNewBank] = useState({
    name: "",
    balance: "",
    asOfDate: new Date().toISOString().split("T")[0],
    addDetails: false,
    accountNumber: "",
    reAccountNumber: "",
    ifsc: "",
    bankName: "",
    branchName: "",
  });

  // Adjust Balance Form
  const [adjustData, setAdjustData] = useState({
    accountId: "cash",
    action: "add" as "add" | "reduce",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    remarks: "",
  });

  // Transfer Form
  const [showEdit, setShowEdit] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printTxn, setPrintTxn] = useState<Transaction | null>(null);
  const [editData, setEditData] = useState({ id: "", date: "", remarks: "" });
  
  const [transferData, setTransferData] = useState({
    fromAccountId: "cash",
    toAccountId: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    remarks: "",
  });

  const fetchData = async (uid: string) => {
    try {
      setLoading(true);
      // Fetch Cash
      const settingsSnap = await getDoc(doc(db, "settings", uid));
      if (settingsSnap.exists() && settingsSnap.data().cashInHand !== undefined) {
        setCashInHand(Number(settingsSnap.data().cashInHand));
      } else {
        setCashInHand(0);
      }

      // Fetch Banks
      const bq = query(collection(db, "bankAccounts"), where("userId", "==", uid));
      const bsnap = await getDocs(bq);
      const banks = bsnap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount));
      setBankAccounts(banks);

      // Fetch Transactions
      const tq = query(collection(db, "cashBankTransactions"), where("userId", "==", uid));
      const tsnap = await getDocs(tq);
      const txns = tsnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      
      txns.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return db - da; // Descending
      });
      setTransactions(txns);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) fetchData(user.uid);
      else setLoading(false);
    });
    return () => unsub();
  }, []);

  const totalBalance = cashInHand + bankAccounts.reduce((sum, b) => sum + Number(b.balance || 0), 0);

  // Add Bank Handler
  const handleAddBank = async () => {
    if (!newBank.name.trim()) return toast.error("Account Name is required");
    if (newBank.addDetails) {
      if (newBank.accountNumber !== newBank.reAccountNumber) return toast.error("Account Numbers do not match");
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const openingBal = Number(newBank.balance || 0);
      const bankData = {
        userId: user.uid,
        name: newBank.name,
        balance: openingBal,
        asOfDate: newBank.asOfDate,
        addDetails: newBank.addDetails,
        accountNumber: newBank.accountNumber,
        ifsc: newBank.ifsc,
        bankName: newBank.bankName,
        branchName: newBank.branchName,
        createdAt: new Date()
      };
      const bRef = await addDoc(collection(db, "bankAccounts"), bankData);
      
      // Log opening balance transaction if > 0
      if (openingBal > 0) {
        await addDoc(collection(db, "cashBankTransactions"), {
          userId: user.uid,
          accountId: bRef.id,
          type: "opening",
          txnNo: "OB-" + Math.floor(Math.random()*10000),
          date: newBank.asOfDate,
          party: "-",
          mode: "Bank",
          paid: 0,
          received: openingBal,
          balanceAfter: openingBal,
          remarks: "Opening Balance",
          createdAt: new Date()
        });
      }

      toast.success("Bank Account Added!");
      setShowAddBank(false);
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to add bank");
    }
  };

  const getAccountBalance = (accId: string) => {
    if (accId === "cash") return cashInHand;
    const b = bankAccounts.find(x => x.id === accId);
    return b ? b.balance : 0;
  };

  const updateAccountBalance = async (accId: string, diff: number, uid: string) => {
    if (accId === "cash") {
      const sRef = doc(db, "settings", uid);
      const sSnap = await getDoc(sRef);
      const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
      await updateDoc(sRef, { cashInHand: current + diff });
      return current + diff;
    } else {
      const bRef = doc(db, "bankAccounts", accId);
      const bSnap = await getDoc(bRef);
      const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
      await updateDoc(bRef, { balance: current + diff });
      return current + diff;
    }
  };

  // Adjust Balance Handler
  const handleAdjustBalance = async () => {
    const amt = Number(adjustData.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const isAdd = adjustData.action === "add";
      const diff = isAdd ? amt : -amt;
      
      const newBal = await updateAccountBalance(adjustData.accountId, diff, user.uid);
      
      await addDoc(collection(db, "cashBankTransactions"), {
        userId: user.uid,
        accountId: adjustData.accountId,
        type: adjustData.action,
        txnNo: "ADJ-" + Math.floor(Math.random()*10000),
        date: adjustData.date,
        party: "-",
        mode: adjustData.accountId === "cash" ? "Cash" : "Bank",
        paid: isAdd ? 0 : amt,
        received: isAdd ? amt : 0,
        balanceAfter: newBal,
        remarks: adjustData.remarks,
        createdAt: new Date()
      });

      toast.success("Balance Adjusted Successfully");
      setShowAdjust(false);
      setAdjustData({ ...adjustData, amount: "", remarks: "" });
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to adjust balance");
    }
  };

  // Transfer Money Handler
  const handleUpdateBank = async () => {
    if (!updateBankData || !updateBankData.name.trim()) return toast.error("Account Name is required");
    const user = auth.currentUser;
    if (!user) return;
    try {
      const bRef = doc(db, "bankAccounts", updateBankData.id);
      await updateDoc(bRef, {
        name: updateBankData.name,
        accountNumber: updateBankData.accountNumber || "",
        ifsc: updateBankData.ifsc || "",
        bankName: updateBankData.bankName || "",
        branchName: updateBankData.branchName || "",
        holderName: updateBankData.holderName || "",
        status: updateBankData.status || "active",
      });
      toast.success("Bank Details Updated");
      setShowUpdateBank(false);
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to update bank details");
    }
  };

  const handleDeactivateBank = async () => {
    if (!updateBankData) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "bankAccounts", updateBankData.id), { status: "inactive" });
      toast.success("Account Deactivated");
      setShowUpdateBank(false);
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to deactivate account");
    }
  };

  const handleReactivateBank = async (bankId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "bankAccounts", bankId), { status: "active" });
      toast.success("Account Reactivated");
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to reactivate account");
    }
  };

  const handleTransfer = async () => {
    if (transferData.fromAccountId === transferData.toAccountId) return toast.error("Cannot transfer to same account");
    if (!transferData.toAccountId) return toast.error("Select a destination account");
    const amt = Number(transferData.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      const newFromBal = await updateAccountBalance(transferData.fromAccountId, -amt, user.uid);
      const newToBal = await updateAccountBalance(transferData.toAccountId, amt, user.uid);

      // Log for Source (Reduce)
      await addDoc(collection(db, "cashBankTransactions"), {
        userId: user.uid,
        accountId: transferData.fromAccountId,
        relatedAccountId: transferData.toAccountId,
        type: "transfer",
        txnNo: "TRF-" + Math.floor(Math.random()*10000),
        date: transferData.date,
        party: "Transfer Out",
        mode: transferData.fromAccountId === "cash" ? "Cash" : "Bank",
        paid: amt,
        received: 0,
        balanceAfter: newFromBal,
        remarks: transferData.remarks,
        createdAt: new Date()
      });

      // Log for Destination (Add)
      await addDoc(collection(db, "cashBankTransactions"), {
        userId: user.uid,
        accountId: transferData.toAccountId,
        relatedAccountId: transferData.fromAccountId,
        type: "transfer",
        txnNo: "TRF-" + Math.floor(Math.random()*10000),
        date: transferData.date,
        party: "Transfer In",
        mode: transferData.toAccountId === "cash" ? "Cash" : "Bank",
        paid: 0,
        received: amt,
        balanceAfter: newToBal,
        remarks: transferData.remarks,
        createdAt: new Date()
      });

      toast.success("Money Transferred Successfully");
      setShowTransfer(false);
      setTransferData({ ...transferData, amount: "", remarks: "", toAccountId: "" });
      fetchData(user.uid);
    } catch (err) {
      toast.error("Transfer failed");
    }
  };

  const handleDeleteTransaction = async (txn: Transaction) => {
    if (!confirm("Are you sure you want to delete this transaction? This will revert the account balances.")) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      if (txn.type === "add") {
        await updateAccountBalance(txn.accountId, -txn.received, user.uid);
      } else if (txn.type === "reduce") {
        await updateAccountBalance(txn.accountId, txn.paid, user.uid);
      } else if (txn.type === "transfer") {
        if (txn.paid > 0) { // Source (Reduce) record
           await updateAccountBalance(txn.accountId, txn.paid, user.uid);
           if (txn.relatedAccountId) await updateAccountBalance(txn.relatedAccountId, -txn.paid, user.uid);
        } else { // Destination (Add) record
           await updateAccountBalance(txn.accountId, -txn.received, user.uid);
           if (txn.relatedAccountId) await updateAccountBalance(txn.relatedAccountId, txn.received, user.uid);
        }
      }
      await deleteDoc(doc(db, "cashBankTransactions", txn.id));
      toast.success("Transaction deleted & balance reverted");
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to delete transaction");
    }
  };

  const handleEditSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "cashBankTransactions", editData.id), {
        date: editData.date,
        remarks: editData.remarks
      });
      toast.success("Transaction updated");
      setShowEdit(false);
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to update transaction");
    }
  };

  const handleDownloadStatement = () => {
    const accTxns = transactions.filter(t => t.accountId === selectedAccount);
    if (accTxns.length === 0) return toast.error("No transactions to export");
    
    const accountName = selectedAccount === "cash" ? "Cash" : (selectedAccount === "unlinked" ? "Unlinked Transactions" : bankAccounts.find(b => b.id === selectedAccount)?.name || "Unknown");
    
    const headers = ["Date", "Type", "Transaction No", "Party", "Mode", "Paid (Debit)", "Received (Credit)", "Balance"];
    // Compute running balance ascending for export
    const sortedAsc = [...accTxns].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      const ca = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const cb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return ca - cb;
    });
    let runningBal = 0;
    const txnsWithBal = sortedAsc.map(t => {
      runningBal += (Number(t.received) || 0) - (Number(t.paid) || 0);
      return { ...t, computedBalance: runningBal };
    });
    const rows = txnsWithBal.map(t => {
      const dateStr = new Date(t.date).toLocaleDateString("en-IN");
      const typeStr = t.type === "add" ? "Add Money" : t.type === "reduce" ? "Reduce Money" : t.type === "transfer" ? "Transfer" : t.type;
      return [
        dateStr, typeStr, t.txnNo, t.party, t.mode, t.paid.toString(), t.received.toString(), t.computedBalance.toFixed(2)
      ];
    });

    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #f3f4f6; color: #111827; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          td { border: 1px solid #e5e7eb; padding: 6px; color: #374151; }
          .debit { color: #dc2626; }
          .credit { color: #16a34a; }
        </style>
      </head>
      <body>
        <h2>${accountName} — Bank Statement</h2>
        <p>Generated on: ${new Date().toLocaleDateString("en-IN")}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, i) => `<td class="${i === 5 && cell !== "0" ? "debit" : i === 6 && cell !== "0" ? "credit" : ""}">${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${accountName}_Statement.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Statement downloaded successfully! 📊");
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Filtering transactions for the selected pane
  const rawFilteredTxns = transactions.filter(t => t.accountId === selectedAccount);
  const selectedAccountName = selectedAccount === "cash" ? "Cash" : (selectedAccount === "unlinked" ? "Unlinked Transactions" : bankAccounts.find(b => b.id === selectedAccount)?.name || "Unknown");

  // Compute running balance dynamically, working BACKWARDS from the current
  // actual balance. This gives correct absolute balances at every row,
  // regardless of opening balances or transactions outside the date filter.
  const filteredTxnsWithBalance = (() => {
    // Sort descending by date, then by createdAt (newest first)
    const descending = [...rawFilteredTxns].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return db - da;
      const ca = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const cb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return cb - ca;
    });
    // Start from the real current account balance
    const currentBalance = selectedAccount === "cash"
      ? cashInHand
      : (bankAccounts.find(b => b.id === selectedAccount)?.balance || 0);
    let running = currentBalance;
    // Newest transaction's balanceAfter = currentBalance, then step backwards
    const withBal = descending.map(txn => {
      const balAfter = running;
      running = running - (Number(txn.received) || 0) + (Number(txn.paid) || 0);
      return { ...txn, computedBalance: balAfter };
    });
    return withBal; // already descending for display
  })();

  // Apply date filter on the display list
  const filteredTxns = (() => {
    if (dateFilter === "all") return filteredTxnsWithBalance;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(dateFilter));
    return filteredTxnsWithBalance.filter(t => new Date(t.date) >= cutoff);
  })();

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col font-sans">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-only-container, .print-only-container * { visibility: visible !important; }
          html, body, main, div, section {
            background: white !important; color: black !important; height: auto !important; min-height: 0 !important; overflow: visible !important; box-shadow: none !important; border: none !important;
          }
          .print-only-container {
            display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
          }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Cash and Bank</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowAdjust(true)} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 font-semibold shadow-sm transition-colors">
            <Plus size={13} className="text-gray-500" />
            <span>Add/Reduce Money</span>
          </button>
          <button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 font-semibold shadow-sm transition-colors">
            <ArrowRightLeft size={13} className="text-gray-500" />
            <span>Transfer Money</span>
          </button>
          <button onClick={() => setShowAddBank(true)} className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 border border-indigo-600 px-4 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-colors">
            <Plus size={14} />
            <span>Add New Account</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT SPLIT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT PANEL - BALANCES */}
        <div className="w-full lg:w-[340px] space-y-6 shrink-0">
          {/* Total & Cash */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Total Balance:</span>
              <span className="text-sm font-bold text-gray-900">₹ {totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cash</span>
            </div>
            
            <div 
              onClick={() => setSelectedAccount("cash")}
              className={`px-4 py-3 flex items-center justify-between hover:bg-indigo-50 transition-colors cursor-pointer border-l-4 ${selectedAccount === "cash" ? "border-indigo-600 bg-indigo-50/50" : "border-transparent"}`}
            >
              <span className="text-sm font-semibold text-gray-700">Cash in hand</span>
              <span className="text-sm font-bold text-gray-900">₹ {cashInHand.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bank Accounts</span>
              <button onClick={() => setShowAddBank(true)} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                <Plus size={10} /> Add New Bank
              </button>
            </div>
            
            <div 
              onClick={() => setSelectedAccount("unlinked")}
              className={`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer border-b border-gray-50 border-l-4 ${selectedAccount === "unlinked" ? "border-indigo-600 bg-indigo-50/50" : "border-transparent hover:bg-gray-50"}`}
            >
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-indigo-400" />
                <span className="text-sm font-semibold text-gray-700">Unlinked Transactions</span>
              </div>
              <span className="text-sm font-bold text-gray-900">₹ 0</span>
            </div>

            {bankAccounts.map(b => (
              <div 
                key={b.id}
                onClick={() => setSelectedAccount(b.id)}
                className={`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer border-b border-gray-50 border-l-4 ${selectedAccount === b.id ? "border-indigo-600 bg-indigo-50/50" : "border-transparent hover:bg-gray-50"} ${b.status === "inactive" ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Landmark size={16} className="text-indigo-400" />
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">{b.name} {b.status === "inactive" && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Deactivated</span>}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">₹ {Number(b.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL - TRANSACTIONS */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="border-b border-gray-200 px-2 flex justify-between items-center">
            <button className="px-6 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600">
              Transactions
            </button>
            <div className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Account Name: <span className="text-gray-700">{selectedAccountName}</span>
            </div>
          </div>

          {/* Account Details Header for selected Bank */}
          {selectedAccount !== "cash" && selectedAccount !== "unlinked" && (() => {
            const b = bankAccounts.find(x => x.id === selectedAccount);
            if (!b) return null;
            return (
              <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-white">
                <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs">
                  <div className="flex gap-2"><span className="text-gray-500 w-32">Account Holder's Name:</span><span className="font-semibold text-gray-800">{b.holderName || "-"}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500 w-32">Account Name:</span><span className="font-semibold text-gray-800 flex items-center gap-2">{b.name} {b.status === "inactive" && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Deactivated</span>}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500 w-32">Account Number:</span><span className="font-bold text-gray-800">{b.accountNumber || "-"}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500 w-32">IFSC Code:</span><span className="font-semibold text-gray-800 uppercase">{b.ifsc || "-"}</span></div>
                  <div className="flex gap-2 col-span-2"><span className="text-gray-500 w-32">Bank & Branch:</span><span className="font-semibold text-gray-800">{b.bankName || "-"} {b.branchName ? `, ${b.branchName}` : ""}</span></div>
                </div>
                <div className="flex flex-col gap-2">
                  {b.status === "inactive" ? (
                    <button onClick={() => handleReactivateBank(b.id)} className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded hover:bg-indigo-100 transition shadow-sm">
                      <Search size={14} /> Reactivate Account
                    </button>
                  ) : (
                    <button onClick={() => { setUpdateBankData(b); setShowUpdateBank(true); }} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition shadow-sm">
                      <Pencil size={12} /> Update Bank Details
                    </button>
                  )}
                  <button onClick={() => { setUpdateBankData(b); setShowShareBank(true); }} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition shadow-sm print:hidden">
                    <Share2 size={12} /> Share Bank Details
                  </button>
                  <button onClick={handleDownloadStatement} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition shadow-sm print:hidden">
                    <Download size={12} /> Download Excel
                  </button>
                  <button onClick={handlePrintPDF} className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 border border-indigo-600 px-3 py-1.5 rounded transition shadow-sm print:hidden">
                    <Printer size={12} /> Print PDF
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Search/Filter Toolbar */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="relative">
              <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                <Calendar size={14} className="text-gray-400" />
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="text-xs font-semibold text-gray-700 focus:outline-none bg-transparent appearance-none pr-4">
                  <option value="30">Last 30 Days</option>
                  <option value="365">Last 365 Days</option>
                  <option value="all">All Time</option>
                </select>
                <ChevronDown size={14} className="text-gray-400 absolute right-2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Empty State vs Table */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12 min-h-[400px] text-gray-400 font-semibold">Loading...</div>
          ) : filteredTxns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px] bg-gradient-to-b from-white to-gray-50/50">
              <div className="relative mb-6">
                {/* Decorative background rings */}
                <div className="absolute inset-0 bg-indigo-50 rounded-full animate-ping opacity-20 scale-150"></div>
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-50 to-purple-50 rounded-full border border-indigo-100 flex items-center justify-center relative shadow-sm">
                  <Wallet size={36} className="text-indigo-400" />
                  {/* Floating mini icon */}
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full border border-gray-100 shadow-md flex items-center justify-center">
                    <FileText size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-gray-800 mb-2 tracking-tight">No Transactions Yet</h3>
              <p className="text-sm text-gray-500 font-medium text-center max-w-sm mb-6">
                You don't have any transactions in this account for the selected period. Add money or transfer funds to get started.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAdjust(true)} className="px-5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors">
                  + Add Money
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto print-only-container">
              
              {/* Print Header */}
              <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4 pt-4 px-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">{selectedAccountName} - Bank Statement</h2>
                <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString('en-IN')}</p>
                <div className="grid grid-cols-3 mt-4 text-sm font-semibold">
                  <div>Account No: {bankAccounts.find(x => x.id === selectedAccount)?.accountNumber || "-"}</div>
                  <div>IFSC: {bankAccounts.find(x => x.id === selectedAccount)?.ifsc || "-"}</div>
                  <div className="text-right">Balance: ₹ {Number(bankAccounts.find(x => x.id === selectedAccount)?.balance || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Invoice No</th>
                    <th className="p-4">Party</th>
                    <th className="p-4">Mode</th>
                    <th className="p-4 text-right text-red-500">Paid</th>
                    <th className="p-4 text-right text-brand-tertiary">Received</th>
                    <th className="p-4 text-right">Balance</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {filteredTxns.map((txn, idx) => (
                    <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4 text-gray-600 font-medium whitespace-nowrap">{new Date(txn.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="p-4 text-gray-800 font-semibold capitalize">
                        {txn.type === "add" ? "Add Money" : txn.type === "reduce" ? "Reduce Money" : txn.type === "transfer" ? "Transfer" : txn.type}
                      </td>
                      <td className="p-4 text-gray-600">{txn.txnNo}</td>
                      <td className="p-4 font-semibold text-gray-700">{txn.party}</td>
                      <td className="p-4 text-gray-500">{txn.mode}</td>
                      <td className="p-4 text-right font-mono font-bold text-gray-700">{txn.paid > 0 ? `₹${txn.paid}` : "-"}</td>
                      <td className="p-4 text-right font-mono font-bold text-gray-700">{txn.received > 0 ? `₹${txn.received}` : "-"}</td>
                      <td className="p-4 text-right font-mono font-bold text-gray-800">₹{Number((txn as any).computedBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setEditData({ id: txn.id, date: txn.date, remarks: txn.remarks || "" }); setShowEdit(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" title="Edit Remarks/Date"><Pencil size={14} /></button>
                          <button onClick={() => { setPrintTxn(txn); setShowPrint(true); }} className="p-1.5 text-gray-400 hover:text-brand-tertiary hover:bg-green-50 rounded transition" title="Print Receipt"><Download size={14} /></button>
                          <button onClick={() => handleDeleteTransaction(txn)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}

      {/* Update Bank Modal */}
      {showUpdateBank && updateBankData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUpdateBank(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Update Bank Account</h2>
              <button onClick={() => setShowUpdateBank(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Account Name</label>
                <input type="text" value={updateBankData.name} onChange={e => setUpdateBankData({...updateBankData, name: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Bank Account Number</label>
                <input type="text" value={updateBankData.accountNumber || ""} onChange={e => setUpdateBankData({...updateBankData, accountNumber: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">IFSC Code</label>
                <input type="text" value={updateBankData.ifsc || ""} onChange={e => setUpdateBankData({...updateBankData, ifsc: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold uppercase" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Bank & Branch Name</label>
                <input type="text" value={updateBankData.bankName || ""} onChange={e => setUpdateBankData({...updateBankData, bankName: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Account Holder's Name</label>
                <input type="text" value={updateBankData.holderName || ""} onChange={e => setUpdateBankData({...updateBankData, holderName: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
            </div>
            <div className="flex justify-between items-center p-5 bg-gray-50 border-t border-gray-100">
              <button onClick={handleDeactivateBank} className="text-xs font-bold text-red-500 flex items-center gap-1.5 hover:text-red-700 transition"><Trash2 size={14} /> Deactivate Account</button>
              <button onClick={handleUpdateBank} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition">Edit Bank Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Bank Details Modal */}
      {showShareBank && updateBankData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareBank(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Share Account Details</h2>
              <button onClick={() => setShowShareBank(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Holder Name</p>
                  <p className="text-sm font-semibold text-gray-800">{updateBankData.holderName || updateBankData.name}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(updateBankData.holderName || updateBankData.name); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Number</p>
                  <p className="text-sm font-semibold text-gray-800">{updateBankData.accountNumber || "-"}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(updateBankData.accountNumber || ""); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">IFSC Code</p>
                  <p className="text-sm font-semibold text-gray-800 uppercase">{updateBankData.ifsc || "-"}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(updateBankData.ifsc || ""); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bank & Branch</p>
                  <p className="text-sm font-semibold text-gray-800">{updateBankData.bankName || "-"} {updateBankData.branchName}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(`${updateBankData.bankName} ${updateBankData.branchName}`); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
            </div>
            <div className="flex gap-3 p-5 justify-end bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowShareBank(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 border rounded-lg transition">Cancel</button>
              <button onClick={() => {
                const text = `Account Details:\nHolder: ${updateBankData.holderName || updateBankData.name}\nA/C No: ${updateBankData.accountNumber}\nIFSC: ${updateBankData.ifsc}\nBank: ${updateBankData.bankName}`;
                if (navigator.share) { navigator.share({ title: 'Bank Details', text }); } else { navigator.clipboard.writeText(text); toast.success("Copied all details to clipboard!"); }
              }} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition">Share Details</button>
            </div>
          </div>
        </div>
      )}

      {showAddBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddBank(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Add Bank Account</h2>
              <button onClick={() => setShowAddBank(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Account Name <span className="text-red-500">*</span></label>
                <input type="text" value={newBank.name} onChange={e => setNewBank({...newBank, name: e.target.value})} placeholder="ex: Personal Account" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Opening Balance</label>
                  <input type="number" value={newBank.balance} onChange={e => setNewBank({...newBank, balance: e.target.value})} placeholder="ex: 10,000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">As of Date</label>
                  <input type="date" value={newBank.asOfDate} onChange={e => setNewBank({...newBank, asOfDate: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm font-bold text-gray-700">Add Bank Details</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={newBank.addDetails} onChange={e => setNewBank({...newBank, addDetails: e.target.checked})} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {newBank.addDetails && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Bank Account Number <span className="text-red-500">*</span></label>
                    <input type="text" value={newBank.accountNumber} onChange={e => setNewBank({...newBank, accountNumber: e.target.value})} placeholder="ex: 123456789157950" className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Re-Enter Account No <span className="text-red-500">*</span></label>
                    <input type="text" value={newBank.reAccountNumber} onChange={e => setNewBank({...newBank, reAccountNumber: e.target.value})} placeholder="ex: 123456789157950" className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">IFSC Code <span className="text-red-500">*</span></label>
                    <input type="text" value={newBank.ifsc} onChange={e => setNewBank({...newBank, ifsc: e.target.value})} placeholder="ex: HDFC0000075" className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Bank & Branch Name <span className="text-red-500">*</span></label>
                    <input type="text" value={newBank.bankName} onChange={e => setNewBank({...newBank, bankName: e.target.value})} placeholder="ex: HDFC, Old Madras" className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 bg-gray-50 border-t border-gray-100 justify-end">
              <button onClick={() => setShowAddBank(false)} className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAddBank} className="px-8 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition">Submit</button>
            </div>
          </div>
        </div>
      )}

      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdjust(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[450px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Adjust Balance</h2>
              <button onClick={() => setShowAdjust(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Adjust money in</label>
                <div className="relative">
                  <select value={adjustData.accountId} onChange={e => setAdjustData({...adjustData, accountId: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold appearance-none bg-white">
                    <option value="cash">Cash</option>
                    {bankAccounts.filter(b => b.status !== "inactive").map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Add or Reduce</label>
                <div className="flex gap-3">
                  <button onClick={() => setAdjustData({...adjustData, action: "add"})} className={`flex-1 py-2 text-xs font-bold rounded-full border transition ${adjustData.action === "add" ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>+ Add Money</button>
                  <button onClick={() => setAdjustData({...adjustData, action: "reduce"})} className={`flex-1 py-2 text-xs font-bold rounded-full border transition ${adjustData.action === "reduce" ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>- Reduce Money</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Balance</label>
                  <p className="text-sm font-bold text-gray-800">₹ {getAccountBalance(adjustData.accountId).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                  <input type="date" value={adjustData.date} onChange={e => setAdjustData({...adjustData, date: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-600 uppercase mb-1.5">Enter Amount</label>
                <div className="relative border-b-2 border-indigo-200 focus-within:border-indigo-600 pb-1 flex items-center transition-colors">
                  <span className="text-lg font-bold text-gray-400 mr-1">{adjustData.action === "add" ? "+" : "-"} ₹</span>
                  <input type="number" value={adjustData.amount} onChange={e => setAdjustData({...adjustData, amount: e.target.value})} className="w-full bg-transparent text-xl font-bold text-gray-800 focus:outline-none font-mono" placeholder="0" />
                </div>
              </div>
              
              <div className="pt-2">
                <input type="text" value={adjustData.remarks} onChange={e => setAdjustData({...adjustData, remarks: e.target.value})} placeholder="+ Add Remarks" className="w-full text-xs text-indigo-600 font-bold placeholder-indigo-300 focus:outline-none border-b border-dashed border-indigo-200 pb-1" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 justify-end">
              <button onClick={() => setShowAdjust(false)} className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAdjustBalance} className="px-8 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTransfer(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[450px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Transfer Balance</h2>
              <button onClick={() => setShowTransfer(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Transfer money from</label>
                <div className="relative">
                  <select value={transferData.fromAccountId} onChange={e => setTransferData({...transferData, fromAccountId: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold appearance-none bg-white">
                    <option value="cash">Cash</option>
                    {bankAccounts.filter(b => b.status !== "inactive").map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Transfer money to</label>
                <div className="relative">
                  <select value={transferData.toAccountId} onChange={e => setTransferData({...transferData, toAccountId: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold appearance-none bg-white">
                    <option value="">Select account</option>
                    <option value="cash">Cash</option>
                    {bankAccounts.filter(b => b.status !== "inactive").map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Balance</label>
                  <p className="text-sm font-bold text-gray-800">₹ {getAccountBalance(transferData.fromAccountId).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                  <input type="date" value={transferData.date} onChange={e => setTransferData({...transferData, date: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-600 uppercase mb-1.5">Enter Amount</label>
                <div className="relative border-b-2 border-indigo-200 focus-within:border-indigo-600 pb-1 flex items-center transition-colors">
                  <span className="text-lg font-bold text-gray-400 mr-1">₹</span>
                  <input type="number" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} className="w-full bg-transparent text-xl font-bold text-gray-800 focus:outline-none font-mono" placeholder="0" />
                </div>
              </div>
              
              <div className="pt-2">
                <input type="text" value={transferData.remarks} onChange={e => setTransferData({...transferData, remarks: e.target.value})} placeholder="+ Add Remarks" className="w-full text-xs text-indigo-600 font-bold placeholder-indigo-300 focus:outline-none border-b border-dashed border-indigo-200 pb-1" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 justify-end">
              <button onClick={() => setShowTransfer(false)} className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleTransfer} className="px-8 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition">Save</button>
            </div>
          </div>
        </div>
      )}


      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEdit(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Edit Transaction</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remarks</label>
                <textarea value={editData.remarks} onChange={e => setEditData({...editData, remarks: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" rows={3}></textarea>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded border transition">Cancel</button>
              <button onClick={handleEditSave} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {showPrint && printTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:static print:inset-auto print:bg-transparent print:flex-col print:justify-start">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm print:hidden" onClick={() => setShowPrint(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 print:shadow-none print:max-w-none print:w-[800px] print:mx-auto print:rounded-none" id="print-area">
            
            {/* Professional Receipt Header */}
            <div className="p-8 border-b border-gray-200 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">PAYMENT RECEIPT</h1>
                  <p className="text-sm text-gray-500 font-semibold mt-1">Transaction Ref: <span className="text-gray-800">{printTxn.txnNo}</span></p>
                </div>
                <div className="text-right">
                  <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center ml-auto mb-2 text-indigo-600 print:border print:border-gray-200 print:bg-white">
                    <Landmark size={24} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                  <p className="text-sm font-bold text-gray-800">{new Date(printTxn.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-8 bg-white print:bg-white space-y-6">
              
              <div className="grid grid-cols-2 gap-8 border-b border-gray-100 pb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Received From / Party</p>
                  <p className="text-base font-bold text-gray-800">{printTxn.party || "Walk-in / Cash"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Mode & Account</p>
                  <p className="text-base font-bold text-gray-800 capitalize">{printTxn.mode} <span className="text-sm font-semibold text-gray-500">({printTxn.accountId === "cash" ? "Cash" : bankAccounts.find(b => b.id === printTxn.accountId)?.name || "Bank"})</span></p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 print:border-gray-200 print:bg-white">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Transaction Type</p>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-gray-800 capitalize">{printTxn.type}</p>
                  <p className="text-2xl font-black text-indigo-600">₹ {Math.max(printTxn.paid, printTxn.received).toLocaleString("en-IN")}</p>
                </div>
              </div>

              {printTxn.remarks && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remarks / Notes</p>
                  <p className="text-sm font-semibold text-gray-700 leading-relaxed italic border-l-2 border-gray-200 pl-3">{printTxn.remarks}</p>
                </div>
              )}
            </div>

            {/* Signature Area for Print */}
            <div className="hidden print:flex justify-between items-end p-8 mt-12">
              <div className="text-center">
                <div className="w-48 border-t border-gray-400 mb-2"></div>
                <p className="text-xs font-bold text-gray-500 uppercase">Customer Signature</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-t border-gray-400 mb-2"></div>
                <p className="text-xs font-bold text-gray-500 uppercase">Authorized Signatory</p>
              </div>
            </div>

            {/* Action Buttons (Hidden in Print) */}
            <div className="p-5 flex gap-3 justify-end bg-gray-50 border-t border-gray-100 print:hidden">
              <button onClick={() => setShowPrint(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg border transition">Close</button>
              <button onClick={() => window.print()} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-2"><Download size={14} /> Print Document</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
