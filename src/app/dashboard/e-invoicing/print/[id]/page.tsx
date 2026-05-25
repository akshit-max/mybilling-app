"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";

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
            <span>Print e-Invoice</span>
          </button>
        </div>
      </div>

      {/* Print Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-gray-50">
        <div className="print-only-container bg-white w-[720px] min-h-[960px] shadow-lg relative p-10 flex flex-col font-sans text-gray-900 border border-gray-300">
          
          {/* HEADER */}
          <div className="flex justify-between items-start mb-6">
            <div className="text-sm font-bold leading-tight">
              <p>{company?.gstin || "27AAJCP7909F1Z4"}</p>
              <p>{company?.businessName || company?.name || "myBillBook"}</p>
            </div>
            <div className="w-28 h-28">
              <QRCodeSVG 
                value={`IRN: ${invoice.irn || "N/A"}\nAmount: ${invoice.total || 0}\nGSTIN: ${company?.gstin || "N/A"}`} 
                size={112} 
                level={"M"} 
              />
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-4 tracking-tight">e-Invoice Details</h2>

          {/* Wrapper for the tables to give them continuous borders */}
          <div className="border-t border-l border-r border-black text-[10px] leading-tight">
            
            {/* IRN / Ack Details */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 border-r border-black p-1 flex">
                <span className="font-bold w-8 shrink-0">IRN:</span>
                <span className="break-all">{invoice.irn || "Not Generated"}</span>
              </div>
              <div className="col-span-3 border-r border-black p-1 flex items-center">
                <span className="font-bold mr-2">Ack. No:</span>
                <span>{invoice.ackNo || "N/A"}</span>
              </div>
              <div className="col-span-3 p-1 flex items-center">
                <span className="font-bold mr-2">Ack. Date:</span>
                <span>{invoice.ackDate ? new Date(invoice.ackDate).toLocaleString() : "N/A"}</span>
              </div>
            </div>

            {/* 2. Transaction Details */}
            <div className="font-bold p-1 border-b border-black">2.Transaction Details</div>
            <div className="border-b border-black">
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black flex"><span className="w-32">Supply Type Code:</span><span>B2B</span></div>
                <div className="p-1 flex"><span className="w-32">Document No:</span><span>{invoice.invoiceNumber || "N/A"}</span></div>
              </div>
              <div className="grid grid-cols-1 border-b border-black">
                <div className="p-1 flex"><span className="w-32">Place of Supply:</span><span>{invoice.customerState || "N/A"}</span></div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-1 border-r border-black flex"><span className="w-32">Document Type:</span><span>Tax Invoice</span></div>
                <div className="p-1 flex"><span className="w-32">Document Date:</span><span>{invoiceDate}</span></div>
              </div>
            </div>

            {/* 3. Party Details */}
            <div className="font-bold p-1 border-b border-black">3.Party Details</div>
            <div className="grid grid-cols-2 border-b border-black divide-x divide-black">
              <div className="p-1">
                <p>Seller</p>
                <p>GSTIN : {company?.gstin || "N/A"}</p>
                <p>{company?.businessName || company?.name}</p>
                <p className="max-w-[200px] break-words">{company?.address}</p>
              </div>
              <div className="p-1">
                <p>Purchaser</p>
                <p>GSTIN : {invoice.customerGSTIN || "N/A"}</p>
                <p>{invoice.customerName}</p>
                <p className="max-w-[200px] break-words">{invoice.customerAddress || "N/A"}</p>
              </div>
            </div>

            {/* 4. Goods Details */}
            <div className="font-bold p-1 border-b border-black">4.Goods Details</div>
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="border-b border-black font-bold">
                  <th className="p-1 border-r border-black w-8">Sno</th>
                  <th className="p-1 border-r border-black text-left">Product Description</th>
                  <th className="p-1 border-r border-black">HSN Code</th>
                  <th className="p-1 border-r border-black">Qty</th>
                  <th className="p-1 border-r border-black">Unit</th>
                  <th className="p-1 border-r border-black">Unit<br/>Price</th>
                  <th className="p-1 border-r border-black">Discount<br/>(₹)</th>
                  <th className="p-1 border-r border-black">Taxable Amt<br/>(₹)</th>
                  <th className="p-1 border-r border-black">Tax Rate<br/>(IGST/CGST/<br/>SGST)</th>
                  <th className="p-1 border-r border-black">Other<br/>Total</th>
                  <th className="p-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.map((item: any, idx: number) => {
                  const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
                  const baseAmt = item.qty * item.price;
                  const totalAmt = baseAmt + (baseAmt * (taxRate/100));
                  return (
                    <tr key={idx} className="border-b border-gray-200 last:border-b-black">
                      <td className="p-1 border-r border-black">{idx + 1}</td>
                      <td className="p-1 border-r border-black text-left font-bold">{item.name}</td>
                      <td className="p-1 border-r border-black">{"-"}</td>
                      <td className="p-1 border-r border-black">{item.qty}</td>
                      <td className="p-1 border-r border-black">PCS</td>
                      <td className="p-1 border-r border-black">{item.price.toFixed(2)}</td>
                      <td className="p-1 border-r border-black">-</td>
                      <td className="p-1 border-r border-black">{baseAmt.toFixed(2)}</td>
                      <td className="p-1 border-r border-black">{taxRate}%</td>
                      <td className="p-1 border-r border-black">-</td>
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
