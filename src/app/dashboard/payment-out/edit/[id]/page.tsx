"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Search, Receipt } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDoc, getDocs, query, where, doc, writeBatch, serverTimestamp, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";

export default function EditPaymentOut() {
  const router = useRouter();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Banking State
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  
  const [partyName, setPartyName] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [amountPaid, setAmountReceived] = useState<number | "">("");
  const [paymentDiscount, setPaymentDiscount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  
  const [originalSettled, setOriginalSettled] = useState<any[]>([]);

  useEffect(() => {
    const init = onAuthStateChanged(auth, async (user) => {
      if (user && id) {
        // Fetch Bank Accounts
        try {
          const bq = query(collection(db, "bankAccounts"), where("userId", "==", user.uid));
          const bsnap = await getDocs(bq);
          setBankAccounts(bsnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("Failed to fetch bank accounts", e);
        }

        try {
          const docRef = doc(db, "paymentOut", id as string);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setPartyName(data.partyName);
            setPaymentDate(data.paymentDate);
            setPaymentMode(data.paymentMode || "Cash");
            setPaymentNumber(data.paymentNumber);
            setAmountReceived(data.amountPaid);
            setPaymentDiscount(data.paymentDiscount || 0);
            setNotes(data.notes || "");
            setOriginalSettled(data.settledInvoices || []);
            setSelectedBankId(data.selectedBankId || "");
          } else {
            toast.error("Payment not found");
            router.push("/dashboard/payment-out");
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });
    return () => init();
  }, [id]);

  // Sync selectedBankId when payment mode is changed to a bank option
  useEffect(() => {
    if (paymentMode !== "Cash" && !selectedBankId && bankAccounts.length > 0) {
      setSelectedBankId(bankAccounts[0].id);
    }
  }, [paymentMode, bankAccounts, selectedBankId]);

  const handleSave = async () => {
    if (!paymentDate) return toast.error("Date is required");
    if (paymentMode !== "Cash" && !selectedBankId) {
      return toast.error("Please select a bank account");
    }
    
    const user = auth.currentUser;
    if (!user) return toast.error("Authentication required");

    try {
      const rcv = Number(amountPaid || 0);

      // --- PRE-SAVE BALANCE VALIDATION ---
      const isCash = paymentMode === "Cash";
      let requiredBalance = rcv;

      // Determine net impact by fetching the old transaction
      const tq = query(
        collection(db, "cashBankTransactions"),
        where("userId", "==", user.uid),
        where("txnNo", "==", paymentNumber),
        where("type", "==", "Payment Out")
      );
      const tSnap = await getDocs(tq);
      
      if (!tSnap.empty) {
        const oldTxn = tSnap.docs[0].data();
        const oldAccountId = oldTxn.accountId; // "cash" or bank id
        const newAccountId = isCash ? "cash" : selectedBankId;
        
        if (oldAccountId === newAccountId) {
          requiredBalance = rcv - (oldTxn.paid || 0);
        }
      }

      if (requiredBalance > 0) {
        if (isCash) {
          const sRef = doc(db, "settings", user.uid);
          const sSnap = await getDoc(sRef);
          const currentCash = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
          if (requiredBalance > currentCash) {
            return toast.error(`Insufficient balance in Cash. Available: ₹${currentCash}`);
          }
        } else if (selectedBankId) {
          const bRef = doc(db, "bankAccounts", selectedBankId);
          const bSnap = await getDoc(bRef);
          const currentBank = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
          if (requiredBalance > currentBank) {
            const bankName = bSnap.exists() ? (bSnap.data().name || "Bank") : "Bank";
            return toast.error(`Insufficient balance in ${bankName}. Available: ₹${currentBank}`);
          }
        }
      }
      // --- END VALIDATION ---

      setSaving(true);

      // 1. Find and Revert old transaction (add back since it was paid out)
      if (!tSnap.empty) {
        const oldTxnDoc = tSnap.docs[0];
        const oldTxn = oldTxnDoc.data();
        
        // Reverse original balance impact (add back)
        if (oldTxn.paid > 0) {
          if (oldTxn.accountId === "cash") {
            const sRef = doc(db, "settings", user.uid);
            const sSnap = await getDoc(sRef);
            const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
            await updateDoc(sRef, { cashInHand: current + oldTxn.paid });
          } else {
            const bRef = doc(db, "bankAccounts", oldTxn.accountId);
            const bSnap = await getDoc(bRef);
            if (bSnap.exists()) {
              const current = Number(bSnap.data().balance || 0);
              await updateDoc(bRef, { balance: current + oldTxn.paid });
            }
          }
        }
        await deleteDoc(doc(db, "cashBankTransactions", oldTxnDoc.id));
      }

      // 2. Apply new transaction balance (deduct)
      let newBalance = 0;
      if (isCash) {
        const sRef = doc(db, "settings", user.uid);
        const sSnap = await getDoc(sRef);
        const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
        newBalance = current - rcv;
        await updateDoc(sRef, { cashInHand: newBalance });
      } else if (selectedBankId) {
        const bRef = doc(db, "bankAccounts", selectedBankId);
        const bSnap = await getDoc(bRef);
        const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
        newBalance = current - rcv;
        await updateDoc(bRef, { balance: newBalance });
      }

      // 3. Add updated transaction entry
      await addDoc(collection(db, "cashBankTransactions"), {
        userId: user.uid,
        accountId: isCash ? "cash" : (selectedBankId || "bank"),
        type: "Payment Out",
        txnNo: paymentNumber,
        date: paymentDate,
        party: partyName,
        mode: paymentMode,
        paid: rcv,
        received: 0,
        balanceAfter: newBalance,
        remarks: notes || `Paid Payment Out #${paymentNumber}`,
        createdAt: new Date()
      });

      const batch = writeBatch(db);
      
      const paymentRef = doc(db, "paymentOut", id as string);
      batch.update(paymentRef, {
        paymentDate,
        paymentMode,
        selectedBankId: isCash ? "" : selectedBankId,
        notes
      });
      
      await batch.commit();
      toast.success("Payment Details Updated!");
      router.push("/dashboard/payment-out");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto w-full pb-20 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Payment #{paymentNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6 space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
          <p className="text-sm text-blue-800 font-medium">Note: To modify the Party or Amount Paid, please delete this payment and create a new one to ensure invoice balances remain strictly synchronized.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Party Name</label>
            <input type="text" value={partyName} readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Amount Paid</label>
            <input type="text" value={"₹ " + amountPaid} readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Payment Date</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none">
              <option>Cash</option>
              <option>Bank</option>
              <option>Cheque</option>
              <option>UPI</option>
            </select>
          </div>
        </div>
        {paymentMode !== "Cash" && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Select Bank Account</label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="">Select Bank Account...</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (Balance: ₹{Number(b.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Notes</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none"></textarea>
        </div>
      </div>
    </div>
  );
}
