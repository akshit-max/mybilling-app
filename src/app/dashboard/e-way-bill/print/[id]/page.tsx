"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";

export default function EWayBillPrint() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [qrBankDetails, setQrBankDetails] = useState<any>(null);

  useEffect(() => {
    const fetchData = async (user: any) => {
      try {
        const sRef = doc(db, "settings", user.uid);
        const sSnap = await getDoc(sRef);
        if (sSnap.exists()) {
          setCompany(sSnap.data());
        }

        const ref = doc(db, "invoices", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const invData = snap.data();
          setInvoice(invData);
          if (invData.selectedBankId) {
            getDoc(doc(db, "bankAccounts", invData.selectedBankId))
              .then(bSnap => bSnap.exists() && setBankDetails(bSnap.data()))
              .catch(err => console.error("Error loading bank:", err));
          }
          if (invData.selectedQRBankId) {
            getDoc(doc(db, "bankAccounts", invData.selectedQRBankId))
              .then(qSnap => qSnap.exists() && setQrBankDetails(qSnap.data()))
              .catch(err => console.error("Error loading QR bank:", err));
          }
        } else {
          toast.error("Invoice not found");
        }
      } catch (err) {
        toast.error("Failed to load invoice details");
      } finally {
        setLoading(false);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading e-Way Bill Document...</div>;
  if (!invoice) return <div className="p-12 text-center text-red-500">Invoice not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = invoice.createdAt?.toDate ? invoice.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="flex flex-col flex-1 min-w-0 font-sans bg-gray-100 min-h-screen">
      
      {/* Bulletproof Print Stylesheet overrides */}
      <style jsx global>{`
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
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Action Toolbar */}
      <div className="screen-only-container bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 flex items-center gap-1.5 mr-2">
            <ArrowLeft size={16} />
            <span className="text-sm font-bold">Back</span>
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 transition shadow-sm"
          >
            <Printer size={15} />
            <span>Print e-Way Bill</span>
          </button>
        </div>
      </div>

      {/* Print Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-gray-50">
        <div className="print-only-container bg-white w-[720px] min-h-[960px] shadow-lg relative p-10 flex flex-col font-sans text-gray-900 border border-gray-300">
          
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[12px] font-extrabold uppercase text-indigo-700 font-sans tracking-widest">E-WAY BILL</span>
            <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">ORIGINAL FOR RECIPIENT</span>
          </div>

          <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide mb-1 text-gray-900">{company?.businessName || company?.name || "Self"}</h1>
              <p className="text-xs text-gray-600 font-medium">GSTIN: {company?.gstin || "N/A"}</p>
              <p className="text-xs text-gray-600 font-medium">Mobile: {company?.phone || "N/A"}</p>
            </div>
            
            <div className="w-24 h-24 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              <QRCodeSVG 
                value={`E-Way Bill: ${invoice.ewayBillNo || "N/A"}\nAmount: ${invoice.total || 0}\nGSTIN: ${company?.gstin || "N/A"}`} 
                size={78} 
                level={"M"} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 rounded-lg border border-indigo-100 p-4 mb-6">
            <div>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Invoice Details</p>
               <p className="text-sm font-bold text-gray-900">No.: <span className="font-mono">{invoice.invoiceNumber || "1"}</span></p>
               <p className="text-sm font-bold text-gray-900">Date: <span className="font-mono">{invoiceDate}</span></p>
            </div>
            <div className="text-right">
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">E-Way Bill No.</p>
               <p className="text-lg font-bold text-indigo-700 font-mono tracking-wider">{invoice.ewayBillNo || "Not Generated"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 border-b border-gray-200 pb-8">
             <div className="space-y-1">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">BILL TO</p>
               <p className="text-sm font-bold text-gray-900">{invoice.customerName}</p>
               <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-[200px]">{invoice.customerAddress || "N/A"}</p>
               {invoice.customerPhone && <p className="text-xs text-gray-600 font-medium pt-1">Mobile: {invoice.customerPhone}</p>}
               {invoice.customerGSTIN && <p className="text-xs text-gray-600 font-medium">GSTIN: {invoice.customerGSTIN}</p>}
             </div>
          </div>

          {/* Standard responsive columns products table */}
          <div className="mb-4">
             <table className="w-full text-xs text-center border-collapse">
                 <thead>
                   <tr className="font-bold border-b-2 border-gray-200 uppercase text-[10px] text-gray-500 tracking-wider">
                      <th className="py-3 px-2 text-left">ITEMS</th>
                      <th className="py-3 px-2 text-center">QTY.</th>
                      <th className="py-3 px-2 text-right">RATE</th>
                      <th className="py-3 px-2 text-right">TAX</th>
                      <th className="py-3 px-2 text-right">AMOUNT</th>
                   </tr>
                 </thead>
                 <tbody className="font-medium">
                   {invoice.items && invoice.items.map((item: any, idx: number) => {
                     const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
                     const baseAmt = item.qty * item.price;
                     const taxAmt = baseAmt * (taxRate/100);
                     const totalAmt = baseAmt + taxAmt;
                     
                     return (
                       <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-4 px-2 text-left">
                             <p className="font-bold text-gray-900 uppercase">{item.name}</p>
                          </td>
                          <td className="py-4 px-2 text-center font-mono text-gray-800 font-bold">{item.qty} {item.unit || "PCS"}</td>
                          <td className="py-4 px-2 text-right font-mono text-gray-800">{Number(item.price).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                          <td className="py-4 px-2 text-right font-mono text-gray-800">
                            {taxAmt.toLocaleString('en-IN', {minimumFractionDigits:2})} <br/>
                            <span className="text-[9px] text-gray-400">({taxRate}%)</span>
                          </td>
                          <td className="py-4 px-2 text-right font-bold font-mono text-gray-900">{totalAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                       </tr>
                     );
                   })}
                 </tbody>
              </table>
              <div className="flex justify-end mt-4 pt-4 border-t-2 border-gray-800">
                <div className="w-1/2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-bold text-gray-600 uppercase">Subtotal</span>
                    <span className="font-mono text-sm font-bold text-gray-800">₹{invoice.subtotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 mt-2 bg-indigo-50 px-3 rounded-lg border border-indigo-100">
                    <span className="text-sm font-black text-indigo-900 uppercase">Total</span>
                    <span className="font-mono text-lg font-black text-indigo-700">₹{invoice.total.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                  </div>
                </div>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
}
