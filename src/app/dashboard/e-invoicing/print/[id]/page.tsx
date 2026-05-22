"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Printer } from "lucide-react";
import toast from "react-hot-toast";

export default function EInvoicePrint() {
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

  if (loading) return <div className="p-12 text-center text-gray-500">Loading e-Invoice Document...</div>;
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
          <h1 className="text-base font-bold text-gray-800">Preview e-Invoice</h1>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm"
        >
          <Printer size={16} />
          Print e-Invoice
        </button>
      </div>

      {/* Print Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
        <div className="print-only-container bg-white w-[794px] min-h-[1123px] shadow-lg relative p-10 flex flex-col font-sans text-black border border-gray-300">
          
          {/* HEADER */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
            <div>
              <p className="font-bold text-lg">{company?.gstin || "N/A"}</p>
              <p className="font-black text-2xl mt-1">{company?.businessName || company?.name || "Self"}</p>
            </div>
            <div className="w-28 h-28 border border-gray-400 flex items-center justify-center">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <rect width="100" height="100" fill="#fff" />
                <path d="M10,10 h25 v25 h-25 z M15,15 h15 v15 h-15 z M65,10 h25 v25 h-25 z M70,15 h15 v15 h-15 z M10,65 h25 v25 h-25 z M15,70 h15 v15 h-15 z M45,10 h10 v10 h-10 z M45,25 h10 v10 h-10 z M45,40 h10 v10 h-10 z M25,45 h10 v10 h-10 z M10,45 h10 v10 h-10 z M65,45 h25 v10 h-25 z M65,60 h10 v10 h-10 z M80,60 h10 v10 h-10 z M45,60 h10 v25 h-10 z M65,75 h25 v10 h-25 z M80,85 h10 v10 h-10 z" fill="#000" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-4 tracking-tight">e-Invoice Details</h2>

          <div className="border border-black flex items-center gap-4 px-3 py-2 text-[11px] mb-2 font-mono">
            <span className="font-bold">IRN:</span>
            <span className="break-all">{invoice.irn || "Not Generated"}</span>
            <span className="font-bold ml-auto pl-4">No:</span>
            <span>{invoice.ackNo || "N/A"}</span>
            <span className="font-bold ml-4">Ack. Date:</span>
            <span>{invoice.ackDate ? new Date(invoice.ackDate).toLocaleString() : "N/A"}</span>
          </div>

          {/* 2. Transaction Details */}
          <div className="border border-black mb-2 text-[11px]">
            <div className="bg-gray-100 font-bold px-2 py-1 border-b border-black">2. Transaction Details</div>
            <div className="grid grid-cols-2 p-2 gap-y-2">
              <div className="flex"><span className="w-32">Supply Type Code:</span><span className="font-bold">B2B</span></div>
              <div className="flex"><span className="w-32">Document No:</span><span className="font-bold">{invoice.invoiceNumber || "N/A"}</span></div>
              <div className="flex"><span className="w-32">Place of Supply:</span><span className="font-bold">{invoice.customerState || "N/A"}</span></div>
              <div className="flex"><span className="w-32">Document Date:</span><span className="font-bold">{invoiceDate}</span></div>
              <div className="flex"><span className="w-32">Document Type:</span><span className="font-bold">Tax Invoice</span></div>
            </div>
          </div>

          {/* 3. Party Details */}
          <div className="border border-black mb-2 text-[11px]">
            <div className="bg-gray-100 font-bold px-2 py-1 border-b border-black">3. Party Details</div>
            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-2 space-y-1">
                <p>Seller</p>
                <p>GSTIN : <span className="font-bold">{company?.gstin || "N/A"}</span></p>
                <p className="font-bold">{company?.businessName || company?.name}</p>
                <p>{company?.address}</p>
              </div>
              <div className="p-2 space-y-1">
                <p>Purchaser</p>
                <p>GSTIN : <span className="font-bold">{invoice.customerGSTIN || "N/A"}</span></p>
                <p className="font-bold">{invoice.customerName}</p>
                <p>{invoice.customerAddress || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* 4. Goods Details */}
          <div className="border border-black text-[11px] flex-1">
            <div className="bg-gray-100 font-bold px-2 py-1 border-b border-black">4. Goods Details</div>
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-[10px]">
                  <th className="p-1 border-r border-black w-8">Sno</th>
                  <th className="p-1 border-r border-black text-left">Product Description</th>
                  <th className="p-1 border-r border-black">HSN Code</th>
                  <th className="p-1 border-r border-black">Qty</th>
                  <th className="p-1 border-r border-black">Unit</th>
                  <th className="p-1 border-r border-black">Unit Price</th>
                  <th className="p-1 border-r border-black">Discount (₹)</th>
                  <th className="p-1 border-r border-black">Taxable Amt (₹)</th>
                  <th className="p-1 border-r border-black">Tax Rate</th>
                  <th className="p-1">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.map((item: any, idx: number) => {
                  const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
                  const baseAmt = item.qty * item.price;
                  const totalAmt = baseAmt + (baseAmt * (taxRate/100));
                  return (
                    <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                      <td className="p-1 border-r border-black">{idx + 1}</td>
                      <td className="p-1 border-r border-black text-left font-bold">{item.name}</td>
                      <td className="p-1 border-r border-black">{"-"}</td>
                      <td className="p-1 border-r border-black">{item.qty}</td>
                      <td className="p-1 border-r border-black">PCS</td>
                      <td className="p-1 border-r border-black">{item.price.toFixed(2)}</td>
                      <td className="p-1 border-r border-black">0.00</td>
                      <td className="p-1 border-r border-black">{baseAmt.toFixed(2)}</td>
                      <td className="p-1 border-r border-black">{taxRate}%</td>
                      <td className="p-1">{totalAmt.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
