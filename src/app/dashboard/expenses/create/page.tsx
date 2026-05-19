"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Plus } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { sanitizeNumericInput } from "@/lib/sanitize";

export default function CreateExpensePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  
  // Form State
  const [withGst, setWithGst] = useState(false);
  const [category, setCategory] = useState("");
  const [expenseNumber, setExpenseNumber] = useState("1");
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("Select");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState<string | number>("");

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      return toast.error("Please enter a valid expense amount");
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
      
      const expenseData = {
        userId: user.uid,
        withGst,
        category,
        expenseNumber,
        originalInvoiceNumber,
        date,
        paymentMode: paymentMode === "Select" ? "Cash" : paymentMode,
        notes,
        amount: Number(amount),
        partyName: "", // Optional, left blank for basic expense
        createdAt: new Date()
      };

      await addDoc(collection(db, "expenses"), expenseData);
      
      toast.success("Expense saved successfully!");
      router.push("/dashboard/expenses");

    } catch (err) {
      console.error(err);
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    toast("Itemized expenses coming soon!", { icon: "🛠️" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-12">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
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
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Left Panel */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-xs font-semibold text-gray-700">Expense With GST</span>
              <div 
                onClick={() => setWithGst(!withGst)}
                className={`w-10 h-5 rounded-full p-1 flex items-center cursor-pointer transition-colors ${withGst ? 'bg-indigo-500' : 'bg-gray-200'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform ${withGst ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Expense Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-700"
              >
                <option value="">Select Category</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Travel">Travel</option>
                <option value="Meals & Entertainment">Meals & Entertainment</option>
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Expense Number</label>
              <input 
                type="text" 
                value={expenseNumber}
                onChange={(e) => setExpenseNumber(e.target.value)}
                className="w-3/4 border-b border-gray-200 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 font-medium" 
              />
            </div>
          </div>

          {/* Right Panel */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 font-semibold mb-1">Original Invoice Number</label>
                <input 
                  type="text" 
                  value={originalInvoiceNumber}
                  onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                  className="w-full border-b border-gray-200 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 font-medium" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-semibold mb-1">Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-700" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Payment Mode</label>
              <select 
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full border-b border-gray-200 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-700"
              >
                <option value="Select">Select</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Note</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter Notes"
                rows={2}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-700" 
              />
            </div>
          </div>
          
        </div>

        {/* Add Item Button */}
        <button 
          onClick={handleAddItem}
          className="w-full border border-dashed border-indigo-200 bg-indigo-50/30 py-3 rounded text-indigo-600 text-xs font-semibold hover:bg-indigo-50 flex items-center justify-center gap-1.5 shadow-sm transition-all"
        >
          <Plus size={14} />
          <span>Add Item</span>
        </button>

        {/* Total Amount Footer */}
        <div className="flex items-center justify-between pt-6 px-2">
          <span className="text-sm font-semibold text-gray-800">Total Expense Amount</span>
          <div className="flex items-center bg-gray-100 rounded overflow-hidden shadow-inner border border-gray-200 w-48">
             <div className="bg-gray-200 px-3 py-2 text-gray-600 font-bold border-r border-gray-300">
               ₹
             </div>
             <input 
               type="number" 
               value={amount}
               onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
               className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none font-bold text-gray-800 text-right font-mono"
               placeholder="0.00"
             />
          </div>
        </div>

      </main>
    </div>
  );
}
