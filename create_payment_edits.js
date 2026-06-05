const fs = require('fs');
const path = require('path');

// ================= PAYMENT IN EDIT =================
const paymentInEditCode = `"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Search, Receipt } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDoc, getDocs, query, where, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";

export default function EditPaymentIn() {
  const router = useRouter();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [partyName, setPartyName] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [paymentDiscount, setPaymentDiscount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  
  const [originalSettled, setOriginalSettled] = useState<any[]>([]);

  useEffect(() => {
    const init = onAuthStateChanged(auth, async (user) => {
      if (user && id) {
        try {
          const docRef = doc(db, "paymentIn", id as string);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setPartyName(data.partyName);
            setPaymentDate(data.paymentDate);
            setPaymentMode(data.paymentMode || "Cash");
            setPaymentNumber(data.paymentNumber);
            setAmountReceived(data.amountReceived);
            setPaymentDiscount(data.paymentDiscount || 0);
            setNotes(data.notes || "");
            setOriginalSettled(data.settledInvoices || []);
          } else {
            toast.error("Payment not found");
            router.push("/dashboard/payment-in");
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });
    return () => init();
  }, [id]);

  const handleSave = async () => {
    if (!paymentDate) return toast.error("Date is required");
    
    const user = auth.currentUser;
    if (!user) return toast.error("Authentication required");

    try {
      setSaving(true);
      const batch = writeBatch(db);
      
      const paymentRef = doc(db, "paymentIn", id as string);
      batch.update(paymentRef, {
        paymentDate,
        paymentMode,
        notes
      });
      
      await batch.commit();
      toast.success("Payment Details Updated!");
      router.push("/dashboard/payment-in");
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
          <p className="text-sm text-blue-800 font-medium">Note: To modify the Party or Amount Received, please delete this payment and create a new one to ensure invoice balances remain strictly synchronized.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Party Name</label>
            <input type="text" value={partyName} readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Amount Received</label>
            <input type="text" value={"₹ " + amountReceived} readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold bg-gray-50 text-gray-500 cursor-not-allowed" />
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
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Notes</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none"></textarea>
        </div>
      </div>
    </div>
  );
}
`;

// ================= PAYMENT OUT EDIT =================
const paymentOutEditCode = paymentInEditCode
  .replace(/PaymentIn/g, 'PaymentOut')
  .replace(/payment-in/g, 'payment-out')
  .replace(/paymentIn/g, 'paymentOut')
  .replace(/Amount Received/g, 'Amount Paid')
  .replace(/amountReceived/g, 'amountPaid');

// Write Payment In
const inDir = path.join(__dirname, 'src/app/dashboard/payment-in/edit/[id]');
if (!fs.existsSync(inDir)) fs.mkdirSync(inDir, { recursive: true });
fs.writeFileSync(path.join(inDir, 'page.tsx'), paymentInEditCode, 'utf8');

// Write Payment Out
const outDir = path.join(__dirname, 'src/app/dashboard/payment-out/edit/[id]');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'page.tsx'), paymentOutEditCode, 'utf8');

console.log("Edit pages generated!");
