"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Plus, Trash2, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, getDoc, runTransaction } from "firebase/firestore";
import toast from "react-hot-toast";
import { sanitizeNumericInput , capItemDiscountUI, capGlobalDiscountUI } from "@/lib/sanitize";
import { useSession } from "@/context/SessionContext";

type ExpenseItem = {
  id: string;
  name: string;
  hsn: string;
  quantity: number;
  rate: number;
  discountRate: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
};

type Party = {
  id: string;
  name: string;
};

export default function CreateExpensePage() {
  const router = useRouter();
  const { activeProfile } = useSession();

  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  
  // Form State
  const [withGst, setWithGst] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [category, setCategory] = useState("");
  const [expenseNumber, setExpenseNumber] = useState("1");
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("Select");
  const [notes, setNotes] = useState("");
  const [manualAmount, setManualAmount] = useState<string | number>("");
  
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  
  const [items, setItems] = useState<ExpenseItem[]>([]);

  // Add Party State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  // Calculate totals
  const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.rate - item.discountAmount), 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const calculatedTotal = items.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    const fetchParties = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(collection(db, "customers"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        setParties(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || "Unknown" })));

        // Fetch Bank Accounts
        const bq = query(collection(db, "bankAccounts"), where("userId", "==", user.uid));
        const bsnap = await getDocs(bq);
        const bList = bsnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBankAccounts(bList);
        if (bList.length > 0) setSelectedBankId(bList[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchParties();
    });
    return () => unsubscribe();
  }, []);

  // Recalculate taxes when GST is toggled
  useEffect(() => {
    setItems(currentItems => currentItems.map(item => {
      const basePrice = item.quantity * item.rate;
      const discountAmount = basePrice * (item.discountRate / 100);
      const priceAfterDiscount = basePrice - discountAmount;
      const taxAmount = withGst ? priceAfterDiscount * (item.taxRate / 100) : 0;
      const amount = priceAfterDiscount + taxAmount;
      return { ...item, discountAmount, taxAmount, amount };
    }));
  }, [withGst]);

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return toast.error("Party Name is required");
    const user = auth.currentUser;
    if (!user) return;
    try {
      setAddingCustomer(true);
      const customerData = {
        userId: user.uid,
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "customers"), customerData);
      const added = { id: docRef.id, name: customerData.name };
      setParties([...parties, added]);
      setPartyId(added.id);
      setShowAddCustomer(false);
      setNewCustomer({ name: "", phone: "" });
      toast.success("Party added successfully!");
    } catch (err) {
      toast.error("Failed to add party");
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleSave = async () => {
    const finalAmount = items.length > 0 ? calculatedTotal : Number(manualAmount);
    
    if (!finalAmount || finalAmount <= 0) {
      return toast.error("Please enter a valid expense amount or add items");
    }
    if (!category) {
      return toast.error("Please select an expense category");
    }

    const user = auth.currentUser;
    if (!user) {
      return toast.error("You must be logged in to save expenses");
    }

    try {
      setSaving(true);
      const selectedParty = parties.find(p => p.id === partyId);
      
      const finalPaymentMode = paymentMode === "Select" ? "Cash" : paymentMode;
      const expenseData = {
        userId: user.uid,
        withGst,
        partyId,
        partyName: selectedParty ? selectedParty.name : "",
        category,
        expenseNumber,
        originalInvoiceNumber,
        date,
        paymentMode: finalPaymentMode,
        notes,
        amount: finalAmount,
        subTotal,
        totalTax: withGst ? totalTax : 0,
        items: items,
        createdAt: new Date(),
        createdBy: activeProfile.name,
        selectedBankId: finalPaymentMode !== "Cash" ? selectedBankId : ""
      };

      await runTransaction(db, async (transaction) => {
        let currentBalance = 0;
        let ledgerRef: any = null;
        const isCash = finalPaymentMode === "Cash";

        // 1. Check & Deduct Balance
        if (finalAmount > 0 && finalPaymentMode !== "Select") {
          if (isCash) {
            ledgerRef = doc(db, "settings", user.uid);
            const sSnap = await transaction.get(ledgerRef);
            currentBalance = sSnap.exists() ? Number((sSnap.data() as any).cashInHand || 0) : 0;
          } else if (selectedBankId) {
            ledgerRef = doc(db, "bankAccounts", selectedBankId);
            const bSnap = await transaction.get(ledgerRef);
            currentBalance = bSnap.exists() ? Number((bSnap.data() as any).balance || 0) : 0;
          } else {
             throw new Error("Payment mode is Bank but no bank account selected");
          }

          if (currentBalance < finalAmount) {
             throw new Error(`Insufficient funds in ${isCash ? 'Cash' : 'Bank'} account. Available: ${currentBalance.toFixed(2)}`);
          }

          const newBalance = currentBalance - finalAmount;
          
          if (isCash) {
            transaction.set(ledgerRef, { cashInHand: newBalance }, { merge: true });
          } else {
            transaction.set(ledgerRef, { balance: newBalance }, { merge: true });
          }

          // 2. Add CashBankTransaction Entry
          const txnRef = doc(collection(db, "cashBankTransactions"));
          transaction.set(txnRef, {
            userId: user.uid,
            accountId: isCash ? "cash" : (selectedBankId || "bank"),
            type: "Expense",
            txnNo: expenseNumber,
            date: date,
            party: selectedParty ? selectedParty.name : "Unknown",
            mode: isCash ? "Cash" : "Bank",
            paid: finalAmount,
            received: 0,
            balanceAfter: newBalance,
            remarks: `Expense: ${category}`,
            createdAt: new Date()
          });
        }

        // 3. Add Expense Record
        const expenseRef = doc(collection(db, "expenses"));
        transaction.set(expenseRef, expenseData);
      });
      
      toast.success("Expense saved successfully!");
      router.push("/dashboard/expenses");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      name: "", 
      hsn: "", 
      quantity: 1, 
      rate: 0, 
      discountRate: 0, 
      discountAmount: 0, 
      taxRate: 0, 
      taxAmount: 0, 
      amount: 0 
    }]);
  };

  const updateItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      Object.assign(updated, capItemDiscountUI(updated));
      
      // Auto-calculate
      const basePrice = updated.quantity * updated.rate;
      
      if (field === 'discountRate') {
        updated.discountAmount = basePrice * (updated.discountRate / 100);
      } else if (field === 'discountAmount') {
        updated.discountRate = basePrice > 0 ? (updated.discountAmount / basePrice) * 100 : 0;
      } else {
        // If qty or rate changes, update discount amount based on rate
        updated.discountAmount = basePrice * (updated.discountRate / 100);
      }
      
      const priceAfterDiscount = basePrice - updated.discountAmount;
      updated.taxAmount = withGst ? (priceAfterDiscount * (updated.taxRate / 100)) : 0;
      updated.amount = priceAfterDiscount + updated.taxAmount;
      
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col font-sans pb-12">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/expenses" className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold text-gray-800">Create Expense</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded bg-white shadow-sm transition-colors">
            <Settings size={14} />
          </button>
          <Link href="/dashboard/expenses" className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-4 py-1.5 rounded hover:bg-gray-50 shadow-sm transition-colors">
            Cancel
          </Link>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-bold text-white bg-indigo-600 border border-indigo-600 px-6 py-1.5 rounded hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* FORM WORKSPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Left Panel */}
          <div className="bg-white border border-gray-200 rounded p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-xs font-semibold text-gray-700">Expense With GST</span>
              <div 
                onClick={() => setWithGst(!withGst)}
                className={`w-10 h-5 rounded-full p-1 flex items-center cursor-pointer transition-colors ${withGst ? 'bg-indigo-500' : 'bg-gray-200'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform ${withGst ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Select Party</label>
              <div className="flex items-center border border-gray-200 rounded bg-white relative">
                 <select 
                   value={partyId}
                   onChange={(e) => {
                     if(e.target.value === "ADD_NEW") {
                       setShowAddCustomer(true);
                     } else {
                       setPartyId(e.target.value);
                     }
                   }}
                   className="w-full px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 appearance-none bg-transparent z-10"
                 >
                   <option value="">Select Party</option>
                   <option value="ADD_NEW" className="font-bold text-indigo-600">+ Quick Add New Party</option>
                   {parties.map(p => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </select>
                 {partyId && (
                   <button onClick={() => setPartyId("")} className="absolute right-8 z-20 text-gray-400 hover:text-gray-600">
                     <X size={14} />
                   </button>
                 )}
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Expense Category</label>
              <div className="flex items-center border border-gray-200 rounded bg-white relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 appearance-none bg-transparent z-10"
                >
                  <option value="">Select Category</option>
                  <option value="Printing and Stationery">Printing and Stationery</option>
                  <option value="Employee Salaries & Advances">Employee Salaries & Advances</option>
                  <option value="Family Expenses">Family Expenses</option>
                  <option value="Telephone & Internet Expense">Telephone & Internet Expense</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Travel">Travel</option>
                  <option value="Meals & Entertainment">Meals & Entertainment</option>
                  <option value="Rent">Rent</option>
                </select>
                {category && (
                  <button onClick={() => setCategory("")} className="absolute right-8 z-20 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Expense Number</label>
              <input 
                type="text" 
                value={expenseNumber}
                onChange={(e) => setExpenseNumber(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 font-medium bg-gray-50/50" 
              />
            </div>
          </div>

          {/* Right Panel */}
          <div className="bg-white border border-gray-200 rounded p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 font-semibold mb-1">Original Invoice Number</label>
                <input 
                  type="text" 
                  value={originalInvoiceNumber}
                  onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 font-medium" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-semibold mb-1">Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-700" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Payment Mode</label>
              <select 
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-700"
              >
                <option value="Select">Select</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {paymentMode !== "Cash" && paymentMode !== "Select" && (
              <div>
                <label className="block text-[10px] text-gray-500 font-semibold mb-1">Select Bank Account</label>
                <select 
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-700 cursor-pointer"
                >
                  <option value="">Select Bank...</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Note</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter Notes"
                rows={3}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 bg-gray-50/50" 
              />
            </div>
          </div>
          
        </div>

        {/* Itemized Section */}
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className="bg-gray-100 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">NO</th>
                  <th className="px-4 py-3 w-1/3">ITEMS</th>
                  <th className="px-4 py-3 w-24">HSN</th>
                  <th className="px-4 py-3 w-20 text-center">QTY</th>
                  <th className="px-4 py-3 w-28 text-right">PRICE/ITEM</th>
                  <th className="px-4 py-3 w-28 text-center">DISCOUNT</th>
                  {withGst && <th className="px-4 py-3 w-28 text-center">TAX</th>}
                  <th className="px-4 py-3 w-28 text-right">AMOUNT</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                   <tr>
                     <td colSpan={withGst ? 9 : 8} className="text-center py-8 text-gray-400">No items added. Click below to add.</td>
                   </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-center text-gray-500 font-semibold">{index + 1}</td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          placeholder="Item Name"
                          className="w-full bg-transparent focus:outline-none font-semibold text-gray-800"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.hsn}
                          onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                          className="w-full bg-transparent focus:outline-none text-gray-700"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 text-center text-gray-800"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-3 text-right bg-gray-50 border-l border-r border-gray-100">
                        <input 
                          type="number" 
                          value={item.rate || ''}
                          onChange={(e) => updateItem(item.id, 'rate', Number(e.target.value))}
                          className="w-full bg-transparent focus:outline-none text-right font-medium text-gray-800"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                          <div className="bg-gray-100 text-gray-500 px-2 py-1 border-r border-gray-200 font-semibold">%</div>
                          <input 
                            type="number" 
                            value={item.discountRate || ''}
                            onChange={(e) => updateItem(item.id, 'discountRate', Number(e.target.value))}
                            className="w-full bg-transparent px-2 py-1 focus:outline-none text-right text-gray-800"
                          />
                        </div>
                      </td>
                      {withGst && (
                        <td className="px-4 py-3">
                           <div className="flex flex-col items-end gap-1">
                             <span className="font-semibold text-gray-800">{item.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                             <select
                               value={item.taxRate}
                               onChange={(e) => updateItem(item.id, 'taxRate', Number(e.target.value))}
                               className="text-[10px] bg-gray-100 border border-gray-200 rounded px-1 text-gray-600 focus:outline-none"
                             >
                               <option value="0">0%</option>
                               <option value="5">5%</option>
                               <option value="12">12%</option>
                               <option value="18">18%</option>
                               <option value="28">28%</option>
                             </select>
                           </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right bg-gray-50 border-l border-gray-100">
                         <span className="font-bold text-gray-800">
                           ₹ {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                         </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 border-t border-gray-200 bg-white">
            <button 
              onClick={handleAddItem}
              className="w-full border border-dashed border-indigo-200 py-2 rounded text-indigo-600 text-xs font-semibold hover:bg-indigo-50 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          </div>
          
          {/* Total Row */}
          <div className="flex items-center justify-end bg-white border-t border-gray-200 p-4 gap-8">
             <div className="flex items-center gap-4 text-xs">
               <span className="text-gray-500 font-bold uppercase tracking-wider">Total</span>
               <span className="font-mono text-gray-800 font-bold">₹ {subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
             </div>
             
             {withGst && (
               <div className="flex items-center gap-4 text-xs">
                 <span className="text-gray-500 font-bold uppercase tracking-wider">Total Tax</span>
                 <span className="font-mono text-gray-800 font-bold">₹ {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
               </div>
             )}
             
             <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-gray-800">Total Amount</span>
                {items.length > 0 ? (
                  <span className="text-lg font-mono font-bold text-indigo-700">₹ {calculatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                ) : (
                  <input 
                    type="number" 
                    value={manualAmount}
                    onChange={(e) => setManualAmount(sanitizeNumericInput(e.target.value))}
                    className="w-32 border border-gray-300 rounded px-3 py-1.5 text-right font-mono font-bold focus:outline-none focus:border-indigo-500"
                    placeholder="0.00"
                  />
                )}
             </div>
          </div>
        </div>

      </main>

      {/* QUICK ADD PARTY MODAL */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Add New Party</span>
              <button onClick={() => setShowAddCustomer(false)} className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors">
                <X size={15} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Party Name *</label>
                <input 
                  type="text" 
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Enter Name"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="Enter Phone"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomer}
                  disabled={addingCustomer}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold shadow-sm"
                >
                  {addingCustomer ? "Saving..." : "Save Party"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
