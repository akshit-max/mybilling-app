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
            margin: 10mm;
          }
        }
      `}</style>

      {/* Screen Controls */}
      <div className="screen-only-container bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-bold text-gray-800">Preview e-Way Bill</h1>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm"
        >
          <Printer size={16} />
          Print e-Way Bill
        </button>
      </div>

      {/* Print Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
        <div className="print-only-container bg-white w-[794px] min-h-[1123px] shadow-lg relative p-10 flex flex-col font-sans text-black border border-gray-300">
          
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-black border border-gray-400 px-2 py-0.5 rounded">TAX INVOICE</span>
            <span className="text-[9px] border border-gray-400 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">ORIGINAL FOR RECIPIENT</span>
          </div>

          <h1 className="text-2xl font-bold uppercase tracking-wide mb-1">{company?.businessName || company?.name || "Self"}</h1>
          <p className="text-xs text-gray-800 font-semibold mb-6">Mobile: {company?.phone || "N/A"}</p>

          <div className="border-b-4 border-black mb-4"></div>

          <div className="grid grid-cols-2 border-y border-gray-300 bg-gray-50/60 px-4 py-2 mb-8 text-xs font-bold text-gray-700">
             <p>Invoice No.: <span className="font-mono text-gray-950 font-extrabold">{invoice.invoiceNumber || "1"}</span></p>
             <p className="text-right">Invoice Date: <span className="font-mono text-gray-950 font-extrabold">{invoiceDate}</span></p>
          </div>

          <div className="flex justify-between items-start mb-8">
             <div className="space-y-1 text-xs">
               <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">BILL TO</p>
               <p className="text-sm font-extrabold text-gray-900">{invoice.customerName}</p>
               <p className="text-gray-600 font-semibold">{invoice.customerAddress || "N/A"}</p>
               {invoice.customerPhone && <p className="text-gray-600 font-semibold">Mobile: {invoice.customerPhone}</p>}
             </div>
             
             <div className="text-right flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 shadow-sm">
               <span className="text-lg font-bold text-gray-800">E-way Bill No.:</span>
               <span className="font-mono text-3xl font-black text-black tracking-wider">{invoice.ewayBillNo || "Not Generated"}</span>
             </div>
          </div>

          {/* Standard responsive columns products table */}
          <div className="border border-black mb-4">
             <table className="w-full text-xs text-center border-collapse">
                <thead>
                   <tr className="font-bold border-b border-black uppercase">
                      <th className="py-2 px-3 border-r border-black text-left">ITEMS</th>
                      <th className="py-2 px-3 border-r border-black">QTY.</th>
                      <th className="py-2 px-3 border-r border-black">RATE</th>
                      <th className="py-2 px-3 border-r border-black">TAX</th>
                      <th className="py-2 px-3 text-right">AMOUNT</th>
                   </tr>
                </thead>
                <tbody className="font-semibold divide-y divide-gray-300">
                   {invoice.items && invoice.items.map((item: any, idx: number) => {
                     const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
                     return (
                       <tr key={idx}>
                          <td className="py-2 px-3 border-r border-black text-left">
                             <p className="font-bold text-gray-900 uppercase">{item.name}</p>
                          </td>
                          <td className="py-2 px-3 border-r border-black font-mono text-gray-900">{item.qty} PCS</td>
                          <td className="py-2 px-3 border-r border-black font-mono text-gray-900">₹{Number(item.price).toFixed(2)}</td>
                          <td className="py-2 px-3 border-r border-black font-mono text-gray-900">{taxRate}%</td>
                          <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₹{(item.qty * item.price).toFixed(2)}</td>
                       </tr>
                     );
                   })}
                   <tr className="bg-gray-100 font-bold border-t-2 border-black text-[12px]">
                      <td className="py-2 px-3 border-r border-black text-left uppercase">SUBTOTAL</td>
                      <td className="py-2 px-3 border-r border-black font-mono">{invoice.items?.reduce((a:any,b:any)=>a+Number(b.qty),0)} PCS</td>
                      <td className="py-2 px-3 border-r border-black">-</td>
                      <td className="py-2 px-3 border-r border-black">-</td>
                      <td className="py-2 px-3 text-right font-mono text-xl">₹{invoice.subtotal.toFixed(2)}</td>
                   </tr>
                </tbody>
             </table>
          </div>

        </div>
      </div>
    </div>
  );
}
