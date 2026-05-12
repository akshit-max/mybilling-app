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

// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import { doc, getDoc, Timestamp } from "firebase/firestore";
// import { useParams } from "next/navigation";
// import {
//   ArrowLeft,
//   Printer,
//   Download,
//   FileText,
// } from "lucide-react";
// import Link from "next/link";

// /* TYPES */
// type Item = {
//   productId?: string;
//   name: string;
//   qty: number;
//   price: number;
// };

// type Invoice = {
//   customerName: string;
//   customerGSTIN?: string;
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

//   /* FETCH INVOICE */
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

//   /* FETCH COMPANY */
//   useEffect(() => {
//     const fetchCompany = async () => {
//       try {
//         const user = auth.currentUser;
//         if (!user) return;

//         const ref = doc(db, "settings", user.uid);
//         const snap = await getDoc(ref);

//         if (snap.exists()) {
//           setCompany(snap.data() as Company);
//         }
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchCompany();
//   }, []);

//   if (loading)
//     return <p className="p-6 text-gray-500">Loading...</p>;

//   if (!invoice)
//     return <p className="p-6 text-gray-500">Invoice not found</p>;

//   return (
//     <section className="bg-gray-50 min-h-screen py-10">
//       <div className="max-w-4xl mx-auto px-6 space-y-6">

//         {/* HEADER */}
//         <div className="flex items-center justify-between">

//           <div className="flex items-center gap-3">
//             <FileText className="text-purple-600" />
//             <h1 className="text-2xl font-semibold text-gray-900">
//               Invoice
//             </h1>
//           </div>

//           <div className="flex items-center gap-3">

//             <Link
//               href="/dashboard/invoices"
//               className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
//             >
//               <ArrowLeft size={16} />
//               Back
//             </Link>

//             <button
//               onClick={() => window.print()}
//               className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
//             >
//               <Printer size={16} />
//               Print
//             </button>

//             <button
//               onClick={() => window.print()}
//               className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
//             >
//               <Download size={16} />
//               PDF
//             </button>

//           </div>
//         </div>

//         {/* INVOICE CARD */}
//         <div
//           id="print-area"
//           className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
//         >

//           {/* COMPANY */}
//           <div className="flex justify-between mb-8">

//             <div>
//               <h2 className="text-lg font-semibold text-gray-900">
//                 {company?.name || "Company Name"}
//               </h2>

//               <p className="text-sm text-gray-500">
//                 {company?.address || "Address"}
//               </p>

//               {company?.gstin && (
//                 <p className="text-sm text-gray-500">
//                   GSTIN: {company.gstin}
//                 </p>
//               )}
//             </div>

//             <div className="text-right text-sm text-gray-500">
//               <p>
//                 Invoice No:{" "}
//                 <span className="text-gray-900 font-medium">
//                   {invoice.invoiceNumber || "N/A"}
//                 </span>
//               </p>

//               <p>
//                 Date:{" "}
//                 <span className="text-gray-900 font-medium">
//                   {invoice.createdAt
//                     ? invoice.createdAt
//                         .toDate()
//                         .toLocaleDateString()
//                     : "N/A"}
//                 </span>
//               </p>
//             </div>

//           </div>

//           {/* CUSTOMER */}
//           <div className="mb-6">
//             <p className="text-sm text-gray-500">Bill To</p>

//             <p className="font-medium text-gray-900">
//               {invoice.customerName}
//             </p>

//             <p className="text-sm text-gray-500">
//               GSTIN: {invoice.customerGSTIN || "-"}
//             </p>
//           </div>

//           {/* TABLE */}
//           <div className="border border-gray-200 rounded-lg overflow-hidden">

//             <div className="grid grid-cols-3 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
//               <p>Item</p>
//               <p>Qty × Price</p>
//               <p className="text-right">Amount</p>
//             </div>

//             {invoice.items.map((item, i) => (
//               <div
//                 key={i}
//                 className="grid grid-cols-3 px-4 py-3 text-sm border-t"
//               >
//                 <p className="text-gray-800">
//                   {item.name || "Unnamed"}
//                 </p>

//                 <p className="text-gray-500">
//                   {item.qty} × ₹{item.price}
//                 </p>

//                 <p className="text-right font-medium">
//                   ₹{(item.qty * item.price).toFixed(2)}
//                 </p>
//               </div>
//             ))}

//           </div>

//           {/* SUMMARY */}
//           <div className="mt-8 flex justify-end">
//             <div className="w-full max-w-xs space-y-2 text-sm">

//               <div className="flex justify-between">
//                 <span className="text-gray-500">Subtotal</span>
//                 <span>₹{invoice.subtotal}</span>
//               </div>

//               <div className="flex justify-between">
//                 <span className="text-gray-500">Discount</span>
//                 <span>₹{invoice.discountAmount}</span>
//               </div>

//               {invoice.gstEnabled && (
//                 <>
//                   <div className="flex justify-between">
//                     <span className="text-gray-500">CGST</span>
//                     <span>₹{invoice.cgst.toFixed(2)}</span>
//                   </div>

//                   <div className="flex justify-between">
//                     <span className="text-gray-500">SGST</span>
//                     <span>₹{invoice.sgst.toFixed(2)}</span>
//                   </div>
//                 </>
//               )}

//               <div className="border-t pt-3 flex justify-between text-base font-semibold">
//                 <span>Total</span>
//                 <span>₹{invoice.total.toFixed(2)}</span>
//               </div>

//               <div className="text-right text-xs text-gray-400">
//                 Status: {invoice.status}
//               </div>

//             </div>
//           </div>

//         </div>
//       </div>
//     </section>
//   );
// }

// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import { doc, getDoc, Timestamp } from "firebase/firestore";
// import { useParams } from "next/navigation";
// import {
//   ArrowLeft,
//   Printer,
//   Download,
//   FileText,
// } from "lucide-react";
// import Link from "next/link";

// /* TYPES */
// type Item = {
//   productId?: string;
//   name: string;
//   qty: number;
//   price: number;
// };

// type Invoice = {
//   customerName: string;
//   customerGSTIN?: string;
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

//   /* FETCH INVOICE */
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

//   /* FETCH COMPANY */
//   useEffect(() => {
//     const fetchCompany = async () => {
//       try {
//         const user = auth.currentUser;
//         if (!user) return;

//         const ref = doc(db, "settings", user.uid);
//         const snap = await getDoc(ref);

//         if (snap.exists()) {
//           setCompany(snap.data() as Company);
//         }
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchCompany();
//   }, []);

//   if (loading)
//     return <p className="p-6 text-gray-500">Loading...</p>;

//   if (!invoice)
//     return <p className="p-6 text-gray-500">Invoice not found</p>;

//   return (
//     <section className="bg-gray-50 min-h-screen print:min-h-0 py-10 print:py-0">
//       <div className="max-w-4xl mx-auto px-6 space-y-6 print:px-0">

//         {/* HEADER */}
//         <div className="flex items-center justify-between print:hidden">

//           <div className="flex items-center gap-3">
//             <FileText className="text-purple-600" />
//             <h1 className="text-2xl font-semibold text-gray-900">
//               Invoice
//             </h1>
//           </div>

//           <div className="flex items-center gap-3">

//             <Link
//               href="/dashboard/invoices"
//               className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition"
//             >
//               <ArrowLeft size={16} />
//               Back
//             </Link>

//             <button
//               onClick={() => window.print()}
//               className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
//             >
//               <Printer size={16} />
//               Print
//             </button>

//             <button
//               onClick={() => window.print()}
//               className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition"
//             >
//               <Download size={16} />
//               PDF
//             </button>

//           </div>
//         </div>

//         {/* INVOICE */}
//         <div
//           id="print-area"
//           className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm"
//         >

//           {/* TOP */}
//           <div className="flex justify-between items-start mb-12">

//             {/* COMPANY */}
//             <div className="space-y-1">
//               <h2 className="text-2xl font-bold tracking-tight text-gray-900">
//                 {company?.name || "Company Name"}
//               </h2>

//               <p className="text-sm text-gray-500 leading-6">
//                 {company?.address || "Address"}
//               </p>

//               {company?.gstin && (
//                 <p className="text-sm text-gray-500">
//                   GSTIN : {company.gstin}
//                 </p>
//               )}
//             </div>

//             {/* META */}
//             <div className="text-right text-sm leading-6">
//               <p className="text-gray-500">
//                 Invoice No:
//                 <span className="ml-1 font-semibold text-gray-900">
//                   {invoice.invoiceNumber || "N/A"}
//                 </span>
//               </p>

//               <p className="text-gray-500">
//                 Date:
//                 <span className="ml-1 font-semibold text-gray-900">
//                   {invoice.createdAt
//                     ? invoice.createdAt
//                         .toDate()
//                         .toLocaleDateString()
//                     : "N/A"}
//                 </span>
//               </p>
//             </div>
//           </div>

//           {/* BILL TO */}
//           <div className="mb-10">

//             <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
//               Bill To
//             </p>

//             <p className="text-lg font-semibold text-gray-900">
//               {invoice.customerName}
//             </p>

//             <p className="text-sm text-gray-500 mt-1">
//               GSTIN : {invoice.customerGSTIN || "-"}
//             </p>
//           </div>

//           {/* TABLE */}
//           <div className="border border-gray-200 rounded-xl overflow-hidden">

//             {/* HEAD */}
//             <div className="grid grid-cols-3 bg-gray-50 px-5 py-4 text-sm font-semibold text-gray-700">
//               <p>Item</p>
//               <p>Qty × Price</p>
//               <p className="text-right">Amount</p>
//             </div>

//             {/* ROWS */}
//             {invoice.items.map((item, i) => (
//               <div
//                 key={i}
//                 className="grid grid-cols-3 px-5 py-4 text-sm border-t border-gray-200"
//               >
//                 <p className="text-gray-900">
//                   {item.name || "Unnamed"}
//                 </p>

//                 <p className="text-gray-500">
//                   {item.qty} × ₹{item.price}
//                 </p>

//                 <p className="text-right font-semibold text-gray-900">
//                   ₹{(item.qty * item.price).toFixed(2)}
//                 </p>
//               </div>
//             ))}
//           </div>

//           {/* SUMMARY */}
//           <div className="mt-10 flex justify-end">

//             <div className="w-full max-w-sm space-y-3 text-sm">

//               <div className="flex justify-between">
//                 <span className="text-gray-500">Subtotal</span>
//                 <span className="font-medium">
//                   ₹{invoice.subtotal}
//                 </span>
//               </div>

//               <div className="flex justify-between">
//                 <span className="text-gray-500">Discount</span>
//                 <span className="font-medium">
//                   ₹{invoice.discountAmount}
//                 </span>
//               </div>

//               {invoice.gstEnabled && (
//                 <>
//                   <div className="flex justify-between">
//                     <span className="text-gray-500">CGST</span>
//                     <span className="font-medium">
//                       ₹{invoice.cgst.toFixed(2)}
//                     </span>
//                   </div>

//                   <div className="flex justify-between">
//                     <span className="text-gray-500">SGST</span>
//                     <span className="font-medium">
//                       ₹{invoice.sgst.toFixed(2)}
//                     </span>
//                   </div>
//                 </>
//               )}

//               {/* TOTAL */}
//               <div className="border-t pt-4 flex justify-between text-xl font-bold text-gray-900">
//                 <span>Total</span>
//                 <span>₹{invoice.total.toFixed(2)}</span>
//               </div>

//               {/* STATUS */}
//               <div className="flex justify-end pt-2">
//                 <span
//                   className={`px-2.5 py-1 rounded-md text-xs font-medium ${
//                     invoice.status === "paid"
//                       ? "bg-green-100 text-green-700"
//                       : invoice.status === "pending"
//                       ? "bg-yellow-100 text-yellow-700"
//                       : "bg-red-100 text-red-700"
//                   }`}
//                 >
//                   {invoice.status}
//                 </span>
//               </div>

//             </div>
//           </div>
//        <div className="mt-24 text-center text-xs text-gray-400">
//   This is a computer generated invoice.
// </div>

//         </div>
//       </div>
//     </section>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  MessageCircle,
  Receipt,
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
  igst?: number;
  isInterstate?: boolean;
  total: number;
  status: string;
  gstEnabled: boolean;
  invoiceNumber?: string;
  createdAt?: Timestamp;
  customerPhone?: string;
  dueDate?: string;
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
        // 1. Try Firestore First
        const ref = doc(db, "invoices", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setInvoice(snap.data() as Invoice);
        } else {
          throw new Error("Not in Firestore");
        }
      } catch (err) {
        // 2. Fallback to IndexedDB
        console.warn("Falling back to offline invoices", err);
        try {
          const { getOfflineInvoices } = await import("@/lib/offlineInvoices");
          const offlineInvoices = await getOfflineInvoices();
          const foundOffline = offlineInvoices.find(
            (inv: any) =>
              inv.id?.toString() === id || inv.invoiceNumber === id
          );

          if (foundOffline) {
            setInvoice(foundOffline as any);
          }
        } catch (offlineErr) {
          console.error("Offline fetch failed", offlineErr);
        }
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

  if (loading) return <p className="p-6 text-gray-500">Loading...</p>;

  if (!invoice) return <p className="p-6 text-gray-500">Invoice not found</p>;

  const handleWhatsAppShare = () => {
    if (!invoice?.customerPhone) {
      alert("Customer phone number missing");
      return;
    }
    const message = `
Dear ${invoice.customerName},

Your invoice *${invoice.invoiceNumber}* is now available.

Total Amount: *₹${invoice.total.toFixed(2)}*

Invoice Link:
${`${window.location.origin}/dashboard/invoices/${id}`}

Thank you.
  `;

    const phone = invoice.customerPhone.replace(/\D/g, "");

    window.open(
      `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };



  return (
    <section className="bg-gray-50 min-h-screen print:min-h-0 py-6 print:py-0">
      <div className="max-w-[980px] mx-auto px-6 print:px-0 space-y-6">
        {/* ACTIONS */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <FileText size={22} className="text-purple-600" />

            <h1 className="text-2xl font-semibold text-gray-900">Invoice</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/invoices"
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              <Printer size={16} />
              Print
            </button>

            <a
              href={`/dashboard/invoices/receipt/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            >
              <Download size={16} />
              PDF
            </a>

            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
            >
              <FaWhatsapp size={18} />
              WhatsApp
            </button>

            <Link
              href={`/dashboard/invoices/receipt/${id}`}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            >
              <Receipt size={16} />
              Receipt
            </Link>
          </div>
        </div>

        {/* INVOICE */}
        <div
          id="print-area"
          className="bg-white border border-gray-200 rounded-xl shadow-sm p-8"
        >
          {/* HEADER */}
          <div className="flex items-start justify-between mb-10">
            {/* COMPANY */}
            <div className="space-y-1">
              <h2 className="text-[32px] font-semibold tracking-tight text-gray-900">
                {company?.name || "mybill.com"}
              </h2>

              <p className="text-sm text-gray-500 leading-6">
                {company?.address || "Address"}
              </p>

              {company?.gstin && (
                <p className="text-sm text-gray-500">GSTIN : {company.gstin}</p>
              )}
            </div>

            {/* META */}
            <div className="text-right text-sm leading-7">
              <p className="text-gray-500">
                Invoice No:
                <span className="ml-1 font-semibold text-gray-900">
                  {invoice.invoiceNumber || "N/A"}
                </span>
              </p>

              <p className="text-gray-500">
                Date:
                <span className="ml-1 font-semibold text-gray-900">
                  {invoice.createdAt
                    ? typeof (invoice.createdAt as any).toDate === "function"
                      ? (invoice.createdAt as any).toDate().toLocaleDateString()
                      : new Date(invoice.createdAt as any).toLocaleDateString()
                    : "N/A"}
                </span>
              </p>
            </div>
          </div>

          {/* BILL TO */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-3">
              Bill To
            </p>

            <p className="text-xl font-semibold text-gray-900">
              {invoice.customerName}
            </p>

            <p className="text-sm text-gray-500 mt-2">
              GSTIN : {invoice.customerGSTIN || "-"}
            </p>
          </div>

          {/* TABLE */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* TABLE HEADER */}
            <div className="grid grid-cols-3 bg-gray-50 px-6 py-5 text-sm font-semibold text-gray-700">
              <p>Item</p>

              <p>Qty × Price</p>

              <p className="text-right">Amount</p>
            </div>

            {/* ITEMS */}
            {invoice.items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-6 py-5 border-t border-gray-200 text-sm"
              >
                <p className="text-gray-900">{item.name || "Unnamed"}</p>

                <p className="text-gray-500 tabular-nums">
                  {item.qty} × ₹{item.price}
                </p>

                <p className="text-right font-semibold text-gray-900 tabular-nums">
                  ₹{(item.qty * item.price).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* SUMMARY */}
          <div className="mt-8 flex justify-end">
            <div className="w-80 space-y-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Subtotal</span>

                <span className="font-medium text-gray-900 tabular-nums">
                  ₹{invoice.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Discount</span>

                <span className="font-medium text-gray-900 tabular-nums">
                  ₹{invoice.discountAmount.toFixed(2)}
                </span>
              </div>

              {invoice.gstEnabled && (
                invoice.isInterstate ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">IGST</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      ₹{(invoice.igst ?? 0).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">CGST</span>
                      <span className="font-medium text-gray-900 tabular-nums">
                        ₹{invoice.cgst.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">SGST</span>
                      <span className="font-medium text-gray-900 tabular-nums">
                        ₹{invoice.sgst.toFixed(2)}
                      </span>
                    </div>
                  </>
                )
              )}

              {/* TOTAL */}
              <div className="border-t border-gray-300 pt-5 flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">Total</span>

                <span className="text-2xl font-bold text-gray-900 tabular-nums">
                  ₹{invoice.total.toFixed(2)}
                </span>
              </div>

              {/* STATUS PILL */}
              <div className="flex justify-end pt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
                    ${
                      invoice.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : invoice.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                >
                  {invoice.status}
                </span>
              </div>

              {/* DUE DATE — only for credit invoices */}
              {invoice.status === "credit" && invoice.dueDate && (
                <div className="flex justify-between text-sm text-gray-500 pt-1">
                  <span>Due Date</span>
                  <span className="font-medium text-red-600">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-32 text-center text-xs text-gray-400">
            This is a computer generated invoice.
          </div>
        </div>
      </div>
    </section>
  );
}
