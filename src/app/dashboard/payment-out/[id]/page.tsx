"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Printer, Download, Share2, Edit, Trash2, ChevronDown } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, deleteDoc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

type SettledInvoice = {
  invoiceId: string;
  invoiceNumber: string;
  amountSettled: number;
};

type PaymentOut = {
  id: string;
  paymentNumber: string;
  partyName: string;
  paymentDate: string;
  paymentMode: string;
  selectedBankId?: string;
  amountPaid: number;
  paymentDiscount: number;
  notes: string;
  settledInvoices: SettledInvoice[];
  totalSettled: number;
};

export default function PaymentOutReceipt() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [payment, setPayment] = useState<PaymentOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const ref = doc(db, "paymentOut", id);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          setPayment({ id: snap.id, ...snap.data() } as PaymentOut);
        } else {
          toast.error("Payment record not found");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load payment record");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayment();
  }, [id]);

  const handleDelete = async () => {
    if (!payment) return;
    if (confirm("Are you sure you want to delete this payment record? This will revert the settled amounts on associated purchases and adjust Cash/Bank balances.")) {
      try {
        const user = auth.currentUser;
        if (!user) return toast.error("Authentication required");

        // 1. Revert Purchase balances
        const settledInvoices = payment.settledInvoices || [];
        for (const item of settledInvoices) {
          const invRef = doc(db, "purchases", item.invoiceId);
          const invSnap = await getDoc(invRef);
          if (invSnap.exists()) {
            const invData = invSnap.data();
            const originalAmountPaid = Number(invData.amountPaid || 0);
            const newAmountPaid = Math.max(0, originalAmountPaid - item.amountSettled);
            const isFullyPaid = newAmountPaid >= Number(invData.total || 0);
            
            await updateDoc(invRef, {
              amountPaid: newAmountPaid,
              status: isFullyPaid ? "paid" : "pending"
            });
          }
        }

        // 2. Revert Cash/Bank balance (add back since it was paid out)
        const rcv = Number(payment.amountPaid || 0);
        if (rcv > 0) {
          const isCash = payment.paymentMode === "Cash";
          const accountId = payment.selectedBankId || (isCash ? "cash" : "bank");
          
          if (accountId === "cash") {
            const sRef = doc(db, "settings", user.uid);
            const sSnap = await getDoc(sRef);
            const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
            await updateDoc(sRef, { cashInHand: current + rcv });
          } else {
            const bRef = doc(db, "bankAccounts", accountId);
            const bSnap = await getDoc(bRef);
            if (bSnap.exists()) {
              const current = Number(bSnap.data().balance || 0);
              await updateDoc(bRef, { balance: current + rcv });
            }
          }
        }

        // 3. Delete cashBankTransactions entry
        const tq = query(
          collection(db, "cashBankTransactions"),
          where("userId", "==", user.uid),
          where("txnNo", "==", payment.paymentNumber),
          where("type", "==", "Payment Out")
        );
        const tSnap = await getDocs(tq);
        if (!tSnap.empty) {
          await deleteDoc(doc(db, "cashBankTransactions", tSnap.docs[0].id));
        }

        // 4. Delete the payment record itself
        await deleteDoc(doc(db, "paymentOut", id));
        toast.success("Payment deleted successfully!");
        router.push("/dashboard/payment-out");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete payment record");
      }
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!payment) return <div className="p-8 text-red-500">Payment record could not be found.</div>;

  return (
    <div className="flex flex-col flex-1 min-w-0 font-sans min-h-screen pb-20 bg-gray-50/60">
      {/* Bulletproof Print Stylesheet overrides */}
      <style jsx global>{`
        @media screen {
          .print-only-container { display: none !important; }
        }
        @media print {
          body * { visibility: hidden !important; }
          .print-only-container, .print-only-container * { visibility: visible !important; }
          html, body, main, div, section {
            background: white !important;
            color: black !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-only-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      {/* Screen View Container */}
      <div className="max-w-7xl mx-auto w-full print:hidden pt-6 px-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Payment Out #{payment.paymentNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/payment-out/edit/${payment.id}`} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm">
            <Edit size={16} />
            Edit
          </Link>
          <button className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition shadow-sm" onClick={handleDelete}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden print:shadow-none print:border-none">
        
        {/* ACTIONS */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 print:hidden bg-white">
           <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-50 transition">
             <Download size={14} /> Download PDF
           </button>
           <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-50 transition">
             <Printer size={14} /> Print PDF
           </button>

        </div>

        {/* PAYMENT DETAILS */}
        <div className="p-6">
           <div className="inline-block bg-gray-100/50 px-3 py-1 rounded-t-lg border-b-2 border-indigo-600 mb-6">
             <h3 className="font-extrabold tracking-wider text-gray-700 text-[11px] uppercase">Payment Details</h3>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Party Name</p>
                 <p className="font-bold text-gray-900 text-lg">{payment.partyName}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Date</p>
                 <p className="font-bold text-gray-700">{payment.paymentDate}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Amount</p>
                 <p className="font-bold text-indigo-700 text-xl">₹{payment.amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Type</p>
                 <p className="font-bold text-gray-700">{payment.paymentMode}</p>
              </div>
           </div>
           
           {payment.notes && (
             <div className="mb-8">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
               <p className="text-sm font-medium text-gray-600">{payment.notes}</p>
             </div>
           )}

           {/* SETTLED INVOICES */}
           <h3 className="font-bold text-gray-800 mb-4 text-sm mt-8">Purchases settled with this payment</h3>
           <div className="overflow-x-auto border border-gray-200 rounded-lg">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-100 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                   <th className="p-3 font-bold">Invoice Number</th>
                   <th className="p-3 font-bold text-right">Invoice Amount Settled</th>
                 </tr>
               </thead>
               <tbody>
                 {!payment.settledInvoices || payment.settledInvoices.length === 0 ? (
                   <tr>
                     <td colSpan={2} className="p-6 text-center text-gray-500 font-medium text-sm">
                       No invoices have been settled with this payment
                     </td>
                   </tr>
                 ) : (
                   payment.settledInvoices.map((inv, idx) => (
                     <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                       <td className="p-3 text-sm font-bold text-gray-800">{inv.invoiceNumber}</td>
                       <td className="p-3 text-sm font-bold text-brand-tertiary text-right">₹{inv.amountSettled.toLocaleString()}</td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* PRINT VIEW ONLY CONTAINER */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="print-only-container font-sans bg-white text-black p-8">
        <h1 className="text-2xl font-bold uppercase mb-6 text-center border-b pb-4">Payment Out Receipt</h1>
        <div className="flex justify-between items-start mb-8 text-sm">
          <div>
            <p className="font-bold text-gray-500 uppercase">Paid To</p>
            <p className="font-bold text-lg">{payment.partyName}</p>
          </div>
          <div className="text-right">
            <p><strong>Receipt No:</strong> {payment.paymentNumber}</p>
            <p><strong>Date:</strong> {payment.paymentDate}</p>
            <p><strong>Mode:</strong> {payment.paymentMode}</p>
          </div>
        </div>
        
        <div className="mb-8 border border-gray-300 rounded p-4 flex justify-between items-center bg-gray-50">
          <span className="font-bold text-gray-700">Amount Paid</span>
          <span className="font-extrabold text-2xl text-black">₹{payment.amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>

        {payment.notes && (
          <div className="mb-8">
            <p className="font-bold text-gray-500 uppercase text-xs mb-1">Notes</p>
            <p className="text-sm">{payment.notes}</p>
          </div>
        )}

        <h3 className="font-bold text-black border-b border-gray-300 pb-2 mb-4 mt-8">Invoices Settled</h3>
        <table className="w-full text-left border-collapse text-sm border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="p-3 font-bold">Invoice Number</th>
              <th className="p-3 font-bold text-right">Amount Settled</th>
            </tr>
          </thead>
          <tbody>
            {!payment.settledInvoices || payment.settledInvoices.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-center italic text-gray-500">
                  No invoices settled
                </td>
              </tr>
            ) : (
              payment.settledInvoices.map((inv, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-3">{inv.invoiceNumber}</td>
                  <td className="p-3 text-right">₹{inv.amountSettled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
