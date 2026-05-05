




// "use client";

// import { useEffect, useState } from "react";
// import { db } from "@/lib/firebase";
// import { doc, getDoc, Timestamp } from "firebase/firestore";
// import { useParams } from "next/navigation";
// import { auth } from "@/lib/firebase";

// /* TYPES */
// type Item = {
//   productId?: string;
//   name: string;
//   qty: number;
//   price: number;
// };

// type Invoice = {
//   customerName: string;
//   customerGSTIN?: string; // 🔥 ADD THIS
//   items: Item[];
//   subtotal: number;
//   discountAmount: number;
//   cgst: number;
//   sgst: number;
//   total: number;
//   status: string;
//   gstEnabled: boolean;
//   invoiceNumber?: string;
//   createdAt?: Timestamp;
// };

// type Company = {
//   name: string;
//   address: string;
//   gstin?: string;
// };

// export default function ViewInvoice() {
//   const { id } = useParams() as { id: string };
//   const [company, setCompany] = useState<Company | null>(null);

//   const [invoice, setInvoice] = useState<Invoice | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchInvoice = async () => {
//       try {
//         const ref = doc(db, "invoices", id);
//         const snap = await getDoc(ref);

//         if (snap.exists()) {
//           setInvoice(snap.data() as Invoice);
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInvoice();
//   }, [id]);

//   useEffect(() => {
//   const fetchCompany = async () => {
//     try {
//       const user = auth.currentUser;

//       if (!user) return;

//       const ref = doc(db, "settings", user.uid);
//       const snap = await getDoc(ref);

//       if (snap.exists()) {
//         console.log("Company:", snap.data()); // optional debug
//         setCompany(snap.data() as Company);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   fetchCompany();
// }, []);
//   if (loading) return <p className="p-6">Loading...</p>;
//   if (!invoice) return <p className="p-6">Invoice not found</p>;

//   return (
//     <div className="min-h-screen bg-[#0B1120] text-white p-6">
//       {/* PRINT AREA */}
//       <div
//         id="print-area"
//         // className="max-w-3xl mx-auto bg-white/5 backdrop-blur p-6 rounded-xl"

//         className="max-w-3xl mx-auto bg-white text-black p-6 rounded-xl print:shadow-none"
//       >
//         {/* HEADER */}
//         <div className="mb-4">
//           <h2 className="text-lg font-bold">
//             {company?.name || "Company Name"}
//           </h2>

//           <p className="text-sm text-gray-500">
//             {company?.address || "Address"}
//           </p>

//           {company?.gstin && (
//             <p className="text-sm text-gray-500">GSTIN: {company.gstin}</p>
//           )}
//         </div>

//         <h1 className="text-xl font-semibold mt-4">Invoice</h1>

//         <div className="text-sm text-gray-400 mb-4">
//           <p>Invoice No: {invoice.invoiceNumber || "N/A"}</p>
//           <p>
//             Date:{" "}
//             {invoice.createdAt
//               ? invoice.createdAt.toDate().toLocaleDateString()
//               : "N/A"}
//           </p>
//         </div>

//         {/* CUSTOMER */}
//         <p className="mb-4">
//           Customer: <strong>{invoice.customerName}</strong>
//         </p>

//         <p className="text-sm text-gray-500 mb-4">
//           GSTIN: {invoice.customerGSTIN || "-"}
//         </p>

//         {/* ITEMS */}
//         <div className="border-t border-white/10 mt-4">
//           <div className="flex justify-between font-medium py-2">
//             <span>Item</span>
//             <span>Qty × Price</span>
//           </div>

//           {invoice.items.map((item, i) => (
//             <div
//               key={i}
//               className="flex justify-between py-2 border-b border-white/10"
//             >
//               <span>{item.name || "Unnamed Item"}</span>
//               <span>
//                 {item.qty} × ₹{item.price}
//               </span>
//             </div>
//           ))}
//         </div>

//         {/* SUMMARY */}
//         <div className="mt-6 text-right space-y-1 text-sm">
//           <p>Subtotal: ₹{invoice.subtotal}</p>
//           <p>Discount: ₹{invoice.discountAmount}</p>

//           {invoice.gstEnabled && (
//             <>
//               <p>CGST: ₹{invoice.cgst.toFixed(2)}</p>
//               <p>SGST: ₹{invoice.sgst.toFixed(2)}</p>
//             </>
//           )}

//           <p className="text-lg font-bold">
//             Total: ₹{invoice.total.toFixed(2)}
//           </p>

//           <p className="text-xs text-gray-400 mt-2">Status: {invoice.status}</p>
//         </div>

//         {/* PRINT BUTTON */}
//         <div className="print:hidden">
//           <div className="mt-6 flex gap-3 print:hidden">
//             {/* PRINT */}
//             <button
//               onClick={() => window.print()}
//               className="bg-purple-600 px-4 py-2 rounded text-white"
//             >
//               Print Invoice
//             </button>

//             {/* PDF DOWNLOAD */}
//             <button
//               onClick={() => window.print()}
//               className="bg-green-600 px-4 py-2 rounded text-white"
//             >
//               Download PDF
//             </button>
//           </div>
//         </div>
        
//       </div>
//     </div>
//   );
// }







"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
} from "lucide-react";
import Link from "next/link";

/* TYPES */
type Item = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
};

type Invoice = {
  customerName: string;
  customerGSTIN?: string;
  items: Item[];
  subtotal: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  total: number;
  status: string;
  gstEnabled: boolean;
  invoiceNumber?: string;
  createdAt?: Timestamp;
};

type Company = {
  name: string;
  address: string;
  gstin?: string;
};

export default function ViewInvoice() {
  const { id } = useParams() as { id: string };

  const [company, setCompany] = useState<Company | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  /* FETCH INVOICE */
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const ref = doc(db, "invoices", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setInvoice(snap.data() as Invoice);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  /* FETCH COMPANY */
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const ref = doc(db, "settings", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setCompany(snap.data() as Company);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCompany();
  }, []);

  if (loading)
    return <p className="p-6 text-gray-500">Loading...</p>;

  if (!invoice)
    return <p className="p-6 text-gray-500">Invoice not found</p>;

  return (
    <section className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <FileText className="text-purple-600" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Invoice
            </h1>
          </div>

          <div className="flex items-center gap-3">

            <Link
              href="/dashboard/invoices"
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Printer size={16} />
              Print
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              <Download size={16} />
              PDF
            </button>

          </div>
        </div>

        {/* INVOICE CARD */}
        <div
          id="print-area"
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >

          {/* COMPANY */}
          <div className="flex justify-between mb-8">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {company?.name || "Company Name"}
              </h2>

              <p className="text-sm text-gray-500">
                {company?.address || "Address"}
              </p>

              {company?.gstin && (
                <p className="text-sm text-gray-500">
                  GSTIN: {company.gstin}
                </p>
              )}
            </div>

            <div className="text-right text-sm text-gray-500">
              <p>
                Invoice No:{" "}
                <span className="text-gray-900 font-medium">
                  {invoice.invoiceNumber || "N/A"}
                </span>
              </p>

              <p>
                Date:{" "}
                <span className="text-gray-900 font-medium">
                  {invoice.createdAt
                    ? invoice.createdAt
                        .toDate()
                        .toLocaleDateString()
                    : "N/A"}
                </span>
              </p>
            </div>

          </div>

          {/* CUSTOMER */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">Bill To</p>

            <p className="font-medium text-gray-900">
              {invoice.customerName}
            </p>

            <p className="text-sm text-gray-500">
              GSTIN: {invoice.customerGSTIN || "-"}
            </p>
          </div>

          {/* TABLE */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">

            <div className="grid grid-cols-3 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
              <p>Item</p>
              <p>Qty × Price</p>
              <p className="text-right">Amount</p>
            </div>

            {invoice.items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-4 py-3 text-sm border-t"
              >
                <p className="text-gray-800">
                  {item.name || "Unnamed"}
                </p>

                <p className="text-gray-500">
                  {item.qty} × ₹{item.price}
                </p>

                <p className="text-right font-medium">
                  ₹{(item.qty * item.price).toFixed(2)}
                </p>
              </div>
            ))}

          </div>

          {/* SUMMARY */}
          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{invoice.subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Discount</span>
                <span>₹{invoice.discountAmount}</span>
              </div>

              {invoice.gstEnabled && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CGST</span>
                    <span>₹{invoice.cgst.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">SGST</span>
                    <span>₹{invoice.sgst.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="border-t pt-3 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>₹{invoice.total.toFixed(2)}</span>
              </div>

              <div className="text-right text-xs text-gray-400">
                Status: {invoice.status}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}