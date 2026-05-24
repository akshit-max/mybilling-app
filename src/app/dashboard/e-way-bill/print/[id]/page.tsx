"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Printer } from "lucide-react";
import toast from "react-hot-toast";

export default function EWayBillPrint() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const sRef = doc(db, "settings", user.uid);
        const sSnap = await getDoc(sRef);
        if (sSnap.exists()) {
          setCompany(sSnap.data());
        }

        const ref = doc(db, "invoices", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setInvoice(snap.data());
        } else {
          toast.error("Invoice not found");
        }
      } catch (err) {
        toast.error("Failed to load invoice details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
            <span className="text-[12px] font-extrabold uppercase text-black font-sans">TAX INVOICE</span>
            <span className="text-[9px] border border-gray-400 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ORIGINAL FOR RECIPIENT</span>
          </div>

          <h1 className="text-3xl font-black uppercase tracking-wide mb-1">{company?.businessName || company?.name || "Self"}</h1>
          <p className="text-sm text-gray-900 font-bold mb-6">Mobile: {company?.phone || "N/A"}</p>

          <div className="h-2 bg-black mb-1 w-full"></div>

          <div className="flex justify-between items-center bg-gray-200/60 px-4 py-2 mb-4 text-sm font-bold text-gray-900">
             <p>Invoice No.: <span className="font-mono ml-2">{invoice.invoiceNumber || "1"}</span></p>
             <p>Invoice Date: <span className="font-mono ml-2">{invoiceDate}</span></p>
          </div>

          <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-8">
             <div className="space-y-0.5 text-xs">
               <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-1">BILL TO</p>
               <p className="text-sm font-bold text-black">{invoice.customerName}</p>
               <p className="text-gray-900 font-medium leading-tight max-w-[200px]">{invoice.customerAddress || "N/A"}</p>
               {invoice.customerPhone && <p className="text-gray-900 font-medium pt-1">Mobile: {invoice.customerPhone}</p>}
             </div>
             
             <div className="text-right flex items-center pt-4">
               <span className="text-xl font-bold text-gray-900 mr-4 tracking-tight">E-way Bill No.:</span>
               <span className="font-mono text-2xl font-bold text-black tracking-widest">{invoice.ewayBillNo || "Not Generated"}</span>
             </div>
          </div>

          {/* Standard responsive columns products table */}
          <div className="mb-4">
             <table className="w-full text-xs text-center border-collapse">
                <thead>
                   <tr className="font-bold border-b-2 border-black uppercase text-[11px] text-gray-900">
                      <th className="py-2 px-1 text-left">ITEMS</th>
                      <th className="py-2 px-1">QTY.</th>
                      <th className="py-2 px-1">RATE</th>
                      <th className="py-2 px-1">TAX</th>
                      <th className="py-2 px-1 text-right">AMOUNT</th>
                   </tr>
                </thead>
                <tbody className="font-medium">
                   {invoice.items && invoice.items.map((item: any, idx: number) => {
                     const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
                     const baseAmt = item.qty * item.price;
                     const taxAmt = baseAmt * (taxRate/100);
                     const totalAmt = baseAmt + taxAmt;
                     
                     return (
                       <tr key={idx} className="border-b border-gray-200">
                          <td className="py-4 px-1 text-left">
                             <p className="font-bold text-gray-900 uppercase">{item.name}</p>
                          </td>
                          <td className="py-4 px-1 font-mono text-black font-bold">{item.qty} PCS</td>
                          <td className="py-4 px-1 font-mono text-black">{Number(item.price).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                          <td className="py-4 px-1 font-mono text-black">
                            {taxAmt.toLocaleString('en-IN', {minimumFractionDigits:2})} <br/>
                            <span className="text-[10px] text-gray-500">({taxRate}%)</span>
                          </td>
                          <td className="py-4 px-1 text-right font-bold font-mono text-black">{totalAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                       </tr>
                     );
                   })}
                   <tr className="font-bold border-t-2 border-black text-xs text-black">
                      <td className="py-3 px-1 text-left uppercase">SUBTOTAL</td>
                      <td className="py-3 px-1 font-mono">{invoice.items?.reduce((a:any,b:any)=>a+Number(b.qty),0)}</td>
                      <td className="py-3 px-1"></td>
                      <td className="py-3 px-1 font-mono">₹{invoice.items?.reduce((a:any,b:any)=>a+((b.qty*b.price)*(b.tax||18)/100),0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                      <td className="py-3 px-1 text-right font-mono text-lg tracking-tight">₹{invoice.subtotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                   </tr>
                </tbody>
             </table>
             <div className="border-b-2 border-black mt-2"></div>
          </div>

        </div>
      </div>
    </div>
  );
}
