"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Save, Search, Receipt } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, getDoc, query, where, doc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";

type Invoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  total: number;
  amountReceived: number;
  status: string;
  allocatedAmount: number; // Temporary UI state
  oldSettledAmount: number; // Keep track of what was settled by THIS specific payment previously
};

export default function EditPaymentIn() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Form State
  const [partyName, setPartyName] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentNumber, setPaymentNumber] = useState("");
  
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [paymentDiscount, setPaymentDiscount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  
  // Invoices State
  const [unsettledInvoices, setUnsettledInvoices] = useState<Invoice[]>([]);
  
  // We need to know if the user manually changed the amount so we don't auto-allocate on initial load
  const isInitialLoad = useRef(true);

  // Initial Fetch
  useEffect(() => {
    const init = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Fetch Customers
          const cq = query(collection(db, "customers"), where("userId", "==", user.uid));
          const csnap = await getDocs(cq);
          setCustomers(csnap.docs.map((d) => ({ id: d.id, name: d.data().name })));

          // 2. Fetch the Payment Record
          const paymentRef = doc(db, "paymentIn", id);
          const paymentSnap = await getDoc(paymentRef);
          if (!paymentSnap.exists()) {
            toast.error("Payment record not found");
            router.push("/dashboard/payment-in");
            return;
          }
          
          const paymentData = paymentSnap.data();
          setPartyName(paymentData.partyName);
          setPaymentDate(paymentData.paymentDate);
          setPaymentMode(paymentData.paymentMode);
          setPaymentNumber(paymentData.paymentNumber);
          setAmountReceived(paymentData.amountReceived);
          setPaymentDiscount(paymentData.paymentDiscount || 0);
          setNotes(paymentData.notes || "");
          
          // Map old settled invoices
          const oldSettledMap: Record<string, number> = {};
          if (paymentData.settledInvoices) {
            paymentData.settledInvoices.forEach((si: any) => {
              oldSettledMap[si.invoiceId] = si.amountSettled;
            });
          }

          // 3. Fetch Invoices for this Party
          const q = query(
            collection(db, "invoices"),
            where("userId", "==", user.uid),
            where("customerName", "==", paymentData.partyName)
          );
          const snap = await getDocs(q);
          const list: Invoice[] = snap.docs
            .map((d) => {
              const data = d.data();
              const oldSettled = oldSettledMap[d.id] || 0;
              // REVERSE the old payment locally for display!
              // The "true" amount received before this payment was made
              const baseAmountReceived = Number(data.amountReceived || 0) - oldSettled;
              
              return {
                id: d.id,
                invoiceNumber: data.invoiceNumber || "",
                date: data.date || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split("T")[0] : ""),
                dueDate: data.dueDate || "",
                total: Number(data.total || 0),
                amountReceived: baseAmountReceived, 
                status: data.status || "pending",
                allocatedAmount: oldSettled, // Pre-fill with what was allocated previously!
                oldSettledAmount: oldSettled
              };
            })
            // Only show invoices that are pending/unpaid OR were part of this payment
            .filter(inv => (inv.total - inv.amountReceived) > 0 || inv.oldSettledAmount > 0);
            
          setUnsettledInvoices(list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          
        } catch (e) {
          console.error("Failed to initialize edit page", e);
          toast.error("Failed to load data");
        }
      }
      setLoading(false);
      
      // Delay setting initialLoad to false so the useEffect for amountReceived doesn't immediately fire and wipe manual allocations
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    });
    return () => init();
  }, [id, router]);

  // Auto-allocate amount down the invoices (ONLY if user manually changes the amountReceived after load)
  useEffect(() => {
    if (isInitialLoad.current) return;
    
    const totalToAllocate = Number(amountReceived || 0) + Number(paymentDiscount || 0);
    if (unsettledInvoices.length > 0) {
      let remaining = totalToAllocate;
      const updated = unsettledInvoices.map(inv => {
        const maxAllowed = inv.total - inv.amountReceived;
        if (remaining >= maxAllowed) {
          remaining -= maxAllowed;
          return { ...inv, allocatedAmount: maxAllowed };
        } else if (remaining > 0) {
          const alloc = remaining;
          remaining = 0;
          return { ...inv, allocatedAmount: alloc };
        } else {
          return { ...inv, allocatedAmount: 0 };
        }
      });
      
      const changed = updated.some((inv, i) => inv.allocatedAmount !== unsettledInvoices[i].allocatedAmount);
      if (changed) setUnsettledInvoices(updated);
    }
  }, [amountReceived, paymentDiscount]);

  const updateAllocation = (index: number, val: string) => {
    const num = val === "" ? 0 : Number(val);
    const updated = [...unsettledInvoices];
    
    const maxAllowed = updated[index].total - updated[index].amountReceived;
    if (num > maxAllowed) {
       toast.error("Allocated amount cannot exceed pending invoice amount");
       updated[index].allocatedAmount = maxAllowed;
    } else {
       updated[index].allocatedAmount = num;
    }
    setUnsettledInvoices(updated);
  };

  const handleSave = async () => {
    if (!partyName) return toast.error("Party Name is required");
    const rcv = Number(amountReceived || 0);
    const disc = Number(paymentDiscount || 0);
    const totalAvailable = rcv + disc;
    
    if (totalAvailable <= 0) return toast.error("Please enter a valid Amount Received");
    
    let totalAllocated = 0;
    const itemsToSettle = [];
    
    for (const inv of unsettledInvoices) {
      if (inv.allocatedAmount && inv.allocatedAmount > 0) {
        totalAllocated += inv.allocatedAmount;
        itemsToSettle.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amountSettled: inv.allocatedAmount
        });
      }
    }
    
    if (totalAllocated > totalAvailable) {
      return toast.error(`Total allocated (₹${totalAllocated}) exceeds available payment (₹${totalAvailable})`);
    }

    try {
      setSaving(true);
      const batch = writeBatch(db);
      
      // 1. Update Payment In Document
      const paymentRef = doc(db, "paymentIn", id);
      batch.update(paymentRef, {
        partyName, // Though generally you shouldn't change party on an existing payment, we allow it
        paymentDate,
        paymentMode,
        amountReceived: rcv,
        paymentDiscount: disc,
        totalSettled: totalAllocated,
        notes,
        settledInvoices: itemsToSettle,
      });
      
      // 2. Update Invoices (Reversing old, applying new)
      for (const inv of unsettledInvoices) {
        // Did the allocation change for this invoice compared to the OLD payment?
        // Wait, even if it didn't change, we should ensure the DB has the correct value.
        // Actually, since base amountReceived = actual - oldSettled
        // The new actual amountReceived = base amountReceived + new allocatedAmount
        const newTotalAmountReceived = inv.amountReceived + inv.allocatedAmount;
        const isFullyPaid = newTotalAmountReceived >= inv.total;
        
        const invRef = doc(db, "invoices", inv.id);
        batch.update(invRef, {
          amountReceived: newTotalAmountReceived,
          status: isFullyPaid ? "paid" : "credit"
        });
      }
      
      await batch.commit();
      toast.success("Payment updated successfully!");
      router.push(`/dashboard/payment-in/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  const currentBalanceStr = "Current Balance: ₹" + unsettledInvoices.reduce((acc, inv) => acc + (inv.total - inv.amountReceived), 0).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto w-full pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Payment In #{paymentNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* LEFT CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Party Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search party by name or number..."
                value={partyName}
                readOnly // Editing party name is dangerous and requires more complex reversals
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-50 focus:outline-none"
              />
            </div>
            
            <p className="text-[11px] font-semibold text-indigo-600 mt-1.5">{currentBalanceStr}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount Received</label>
              <input
                type="number"
                placeholder="0"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value ? Number(e.target.value) : "")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Discount</label>
              <input
                type="number"
                placeholder="0"
                value={paymentDiscount}
                onChange={(e) => setPaymentDiscount(e.target.value ? Number(e.target.value) : "")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Date</label>
               <input
                 type="date"
                 value={paymentDate}
                 onChange={(e) => setPaymentDate(e.target.value)}
                 className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-indigo-500"
               />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Mode</label>
               <select
                 value={paymentMode}
                 onChange={(e) => setPaymentMode(e.target.value)}
                 className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-indigo-500"
               >
                 <option>Cash</option>
                 <option>Bank</option>
                 <option>Cheque</option>
                 <option>UPI</option>
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Number</label>
               <input
                 type="text"
                 value={paymentNumber}
                 onChange={(e) => setPaymentNumber(e.target.value)}
                 className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-indigo-500 bg-gray-50"
                 readOnly
               />
             </div>
          </div>
          <div>
             <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
             <textarea
               rows={2}
               placeholder="Enter Notes"
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500"
             />
          </div>
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
         <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
           <h3 className="font-bold text-gray-800">Settle invoices with this payment</h3>
         </div>
         
         {!partyName ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <Receipt size={64} className="text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">No party selected!</h3>
              <p className="text-sm text-gray-500 mb-4">Select Party Name to view transactions</p>
            </div>
         ) : unsettledInvoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">
              No unpaid invoices found for {partyName}.
            </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
                   <th className="p-4 font-bold">Date</th>
                   <th className="p-4 font-bold">Due Date</th>
                   <th className="p-4 font-bold">Invoice Number</th>
                   <th className="p-4 font-bold">Invoice Amount</th>
                   <th className="p-4 font-bold">Amount Settled</th>
                 </tr>
               </thead>
               <tbody>
                 {unsettledInvoices.map((inv, idx) => (
                   <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                     <td className="p-4 text-xs font-medium text-gray-600">{inv.date}</td>
                     <td className="p-4 text-xs font-medium text-gray-600">{inv.dueDate || "-"}</td>
                     <td className="p-4 text-sm font-bold text-gray-800">{inv.invoiceNumber}</td>
                     <td className="p-4 text-sm font-bold text-gray-800">
                        ₹{inv.total.toLocaleString()} 
                        <span className="text-red-500 font-semibold text-xs ml-1">(₹{(inv.total - inv.amountReceived).toLocaleString()} pending)</span>
                     </td>
                     <td className="p-4">
                        <input
                          type="number"
                          placeholder="₹ 0"
                          value={inv.allocatedAmount || ""}
                          onChange={(e) => updateAllocation(idx, e.target.value)}
                          className="w-32 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                        />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
      </div>
    </div>
  );
}
