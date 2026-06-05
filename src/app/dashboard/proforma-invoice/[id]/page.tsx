"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, Timestamp, deleteDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  MoreVertical,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  X,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import WhatsAppModal from "@/components/ui/WhatsAppModal";
import EmailModal from "@/components/ui/EmailModal";
import SMSModal from "@/components/ui/SMSModal";

type Item = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  tax?: number; 
};

type ProformaInvoice = {
  customerName: string;
  customerPhone?: string;
  customerGSTIN?: string;
  proformaInvoiceNumber: string;
  linkedInvoiceNumber?: string;
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
  createdAt?: Timestamp;
  date?: string;
  signatureType?: "upload" | "empty" | "";
  signatureImage?: string;
  amountReceived?: number;
};

type Company = {
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
};

function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";
  
  const g = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
  };

  const cleanNum = Math.floor(num);
  if (cleanNum < 100) return g(cleanNum);
  if (cleanNum < 1000) {
    const rem = cleanNum % 100;
    return a[Math.floor(cleanNum / 100)] + " Hundred" + (rem ? " and " : "") + (rem ? g(rem) : "");
  }
  if (cleanNum < 100000) {
    const thousands = Math.floor(cleanNum / 1000);
    const rem = cleanNum % 1000;
    return g(thousands) + " Thousand" + (rem ? " " + g(rem) : "");
  }
  return cleanNum.toString(); 
}

export default function ViewProformaInvoice() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [proformaInvoice, setProformaInvoice] = useState<ProformaInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  const [accentColor, setAccentColor] = useState("#4F46E5");
  const [showPhone, setShowPhone] = useState(true);
  
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  const [activeLabel, setActiveLabel] = useState<"ORIGINAL FOR RECIPIENT" | "DUPLICATE FOR TRANSPORTER" | "TRIPLICATE FOR SUPPLIER">("ORIGINAL FOR RECIPIENT");

  useEffect(() => {
    const fetchCreditNote = async () => {
      try {
        const ref = doc(db, "proformaInvoices", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProformaInvoice(snap.data() as ProformaInvoice);
        } else {
          throw new Error("Not in Firestore");
        }
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCreditNote();
  }, [id]);

  useEffect(() => {
    const fetchSettingsAndCompany = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const ref = doc(db, "settings", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setCompany({
            name: data.businessName || "self",
            address: data.address || "",
            phone: data.phone || "",
            gstin: data.gstin || ""
          });
          if (data.invoiceThemeColor) setAccentColor(data.invoiceThemeColor);
          const s = data.invoiceThemeSettings || {};
          if (s.showPhone !== undefined) setShowPhone(s.showPhone);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    fetchSettingsAndCompany();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-400 gap-2 font-sans">
        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold uppercase tracking-wider">Loading Proforma Invoice details...</span>
      </div>
    );
  }

  if (!proformaInvoice) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-gray-400 gap-3 font-sans">
        <AlertCircle size={28} className="text-gray-300" />
        <span className="text-sm font-semibold uppercase tracking-wider">Proforma Invoice details not found</span>
      </div>
    );
  }

  const formattedDate = proformaInvoice.date
    ? new Date(proformaInvoice.date).toLocaleDateString()
    : proformaInvoice.createdAt
    ? typeof (proformaInvoice.createdAt as any).toDate === "function"
      ? (proformaInvoice.createdAt as any).toDate().toLocaleDateString()
      : new Date(proformaInvoice.createdAt as any).toLocaleDateString()
    : new Date().toLocaleDateString();

  const totalQty = proformaInvoice.items
    ? proformaInvoice.items.reduce((acc, item) => acc + (Number(item.qty) || 0), 0)
    : 0;

  const totalTaxAmount = proformaInvoice.items
    ? proformaInvoice.items.reduce((acc, item) => {
        const taxRate = item.tax || (proformaInvoice.gstEnabled ? 18 : 0);
        const itemAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
        return acc + (itemAmount * (taxRate / 100));
      }, 0)
    : 0;

  const receivedAmount = typeof proformaInvoice.amountReceived === "number" ? proformaInvoice.amountReceived : 0;
  const balanceAmount = Math.max(0, proformaInvoice.total - receivedAmount);

  const handleWhatsAppShare = () => {
    setShowWhatsAppModal(true);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this proforma invoice?")) {
      try {
        await deleteDoc(doc(db, "proformaInvoices", id));
        toast.success("Proforma Invoice deleted successfully");
        router.push("/dashboard/proforma-invoice");
      } catch (err) {
        toast.error("Failed to delete proforma invoice");
      }
    }
  };

  const triggerPrint = (format: "a4" | "thermal", label: typeof activeLabel) => {
    setPrintFormat(format);
    setActiveLabel(label);
    setIsPrintOpen(false);
    setIsDownloadOpen(false);
    setTimeout(() => window.print(), 150);
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 font-sans bg-gray-50/60 min-h-screen">
      <style jsx global>{`
        @media screen {
          .print-only-container { display: none !important; }
        }
        @media print {
          body * { visibility: hidden !important; }
          .print-only-container, .print-only-container * { visibility: visible !important; }
          html, body, main, div, section {
            background: white !important; color: black !important; height: auto !important; min-height: 0 !important; overflow: visible !important; box-shadow: none !important; border: none !important;
          }
          .print-only-container {
            display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="screen-only-container flex flex-col flex-1">
        
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/proforma-invoice" className="text-gray-400 hover:text-gray-700 transition">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span>Proforma Invoice #{proformaInvoice.proformaInvoiceNumber}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                proformaInvoice.status === "adjusted" 
                  ? "bg-green-50 text-brand-tertiary border border-green-200/50" 
                  : "bg-blue-50 text-brand-primary border border-blue-200/50"
              }`}>
                {proformaInvoice.status}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className="text-gray-400 hover:text-gray-600 p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition"
              >
                <MoreVertical size={15} />
              </button>
              {isMoreOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-32 z-50 text-xs font-semibold">
                  <Link href={`/dashboard/proforma-invoice/edit/${id}`} className="block px-4 py-2 text-gray-700 hover:bg-gray-50">Edit Proforma Invoice</Link>
                  <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="flex items-center">
                <button 
                  onClick={() => triggerPrint("a4", "ORIGINAL FOR RECIPIENT")}
                  className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 border-r-0 px-3 py-1.5 rounded-l-md font-bold transition shadow-3xs"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
                <button 
                  onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                  className="p-1.5 border border-gray-200 rounded-r-md hover:bg-gray-50 transition cursor-pointer"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              {isDownloadOpen && (
                <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-44 z-50 text-xs font-semibold">
                  <button onClick={() => triggerPrint("a4", "DUPLICATE FOR TRANSPORTER")} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50">Download Duplicate</button>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="flex items-center">
                <button 
                  onClick={() => triggerPrint("a4", "ORIGINAL FOR RECIPIENT")}
                  className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 border-r-0 px-3 py-1.5 rounded-l-md font-bold transition shadow-3xs"
                >
                  <Printer size={13} />
                  <span>Print PDF</span>
                </button>
                <button 
                  onClick={() => setIsPrintOpen(!isPrintOpen)}
                  className="p-1.5 border border-gray-200 rounded-r-md hover:bg-gray-50 transition cursor-pointer"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              {isPrintOpen && (
                <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-40 z-50 text-xs font-semibold">
                  <button onClick={() => triggerPrint("a4", "DUPLICATE FOR TRANSPORTER")} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50">Print Duplicate</button>
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsShareOpen(!isShareOpen)}
                className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md font-bold transition shadow-3xs"
              >
                <Share2 size={13} />
                <span>Share</span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>
              {isShareOpen && (
                <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-36 z-50 text-xs font-semibold">
                  <button onClick={handleWhatsAppShare} className="w-full flex items-center gap-2 px-4 py-2 text-brand-tertiary hover:bg-green-50">
                    <FaWhatsapp size={14} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-gray-150/40">
          <div 
            style={{ borderColor: accentColor }}
            className={`bg-white w-[720px] min-h-[960px] shadow-lg border border-gray-300 relative p-10 flex flex-col justify-between font-sans text-gray-800`}
          >
             <div>
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                     <span style={{ color: accentColor }} className="text-[12px] font-extrabold uppercase tracking-widest">
                       PROFORMA INVOICE
                     </span>
                     <span className="text-[9px] border border-gray-400 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">
                       {activeLabel}
                     </span>
                   </div>
                </div>

                <div className="mb-4">
                   <h1 style={{ color: accentColor }} className="text-xl font-bold uppercase tracking-wide">
                     {company?.name || "self"}
                   </h1>
                   {showPhone && <p className="text-[10px] text-gray-600 mt-0.5 font-semibold">Mobile: {company?.phone || "98XXXXXXXX"}</p>}
                   {company?.address && <p className="text-[9px] text-gray-500 mt-0.5 leading-normal">{company.address}</p>}
                </div>

                <div style={{ borderColor: accentColor }} className="border-b-2 mb-4"></div>

                <div className="grid grid-cols-2 border-y border-gray-300 bg-gray-50/60 px-4 py-2 mb-4 text-[10px] font-bold text-gray-700">
                   <div>
                     <p>Proforma Invoice No.: <span className="font-mono text-gray-950 font-extrabold">{proformaInvoice.proformaInvoiceNumber}</span></p>
                     {proformaInvoice.linkedInvoiceNumber && <p>Linked Invoice No.: <span className="font-mono text-gray-950 font-extrabold">{proformaInvoice.linkedInvoiceNumber}</span></p>}
                   </div>
                   <div className="text-right">
                     <p>Date: <span className="font-mono text-gray-950 font-extrabold">{formattedDate}</span></p>
                   </div>
                </div>

                <div className="mb-4 space-y-0.5 text-[10px]">
                   <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">PARTY DETAILS</p>
                   <p className="text-xs font-extrabold text-gray-900">{proformaInvoice.customerName}</p>
                   {showPhone && proformaInvoice.customerPhone && <p className="text-gray-650 font-semibold">Mobile: {proformaInvoice.customerPhone}</p>}
                   {proformaInvoice.customerGSTIN && <p className="text-gray-650 font-mono">GSTIN: {proformaInvoice.customerGSTIN}</p>}
                </div>

                <div className="border border-gray-300 rounded overflow-hidden mb-4">
                   <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                         <tr style={{ backgroundColor: `${accentColor}12`, color: accentColor }} className="font-extrabold border-b border-gray-300 uppercase tracking-wider text-[9px]">
                            <th className="py-2 px-3">ITEMS</th>
                            <th className="py-2 px-3 text-center">QTY.</th>
                            <th className="py-2 px-3 text-right">RATE</th>
                            <th className="py-2 px-3 text-center">TAX</th>
                            <th className="py-2 px-3 text-right">AMOUNT</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-250 text-gray-700 font-semibold">
                         {proformaInvoice.items && proformaInvoice.items.map((item, idx) => {
                           const taxRate = item.tax || (proformaInvoice.gstEnabled ? 18 : 0);
                           return (
                             <tr key={idx} className="hover:bg-gray-50/30">
                                <td className="py-2 px-3"><p className="font-bold text-gray-900 uppercase">{item.name}</p></td>
                                <td className="py-2 px-3 text-center font-mono text-gray-900">{item.qty} PCS</td>
                                <td className="py-2 px-3 text-right font-mono text-gray-900">₹{item.price.toFixed(2)}</td>
                                <td className="py-2 px-3 text-center font-mono text-gray-500">{taxRate}%</td>
                                <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₹{(item.qty * item.price).toFixed(2)}</td>
                             </tr>
                           );
                         })}
                         <tr className="bg-gray-50/50 font-bold border-y-2 border-gray-300 text-gray-900 text-[10px]">
                            <td className="py-2 px-3 text-left uppercase">SUBTOTAL</td>
                            <td className="py-2 px-3 text-center font-mono">{totalQty} PCS</td>
                            <td className="py-2 px-3 text-right">-</td>
                            <td className="py-2 px-3 text-center font-mono">₹{totalTaxAmount.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{proformaInvoice.subtotal.toFixed(2)}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                <div className="flex justify-between items-start text-[10px] pt-2">
                   <div className="w-[50%] space-y-3">
                      <div>
                         <p className="font-extrabold text-gray-500 uppercase tracking-wider">TERMS AND CONDITIONS</p>
                         <p className="text-gray-500 leading-normal mt-1 font-medium">1. Goods once sold will not be taken back or exchanged.<br/>2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only.</p>
                      </div>
                   </div>

                   <div className="w-64 space-y-1 font-mono text-right text-gray-500 font-bold border-t border-dashed border-gray-350 pt-2">
                      <div className="flex justify-between text-gray-600">
                         <span>Taxable Amount</span>
                         <span className="text-gray-900">₹{proformaInvoice.subtotal.toFixed(2)}</span>
                      </div>

                      {proformaInvoice.gstEnabled && (
                        proformaInvoice.isInterstate ? (
                          <div className="flex justify-between text-gray-500">
                            <span>IGST</span>
                            <span>₹{(proformaInvoice.igst || 0).toFixed(2)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-gray-500">
                              <span>CGST</span>
                              <span>₹{proformaInvoice.cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>SGST</span>
                              <span>₹{proformaInvoice.sgst.toFixed(2)}</span>
                            </div>
                          </>
                        )
                      )}

                      {proformaInvoice.discountAmount > 0 && (
                        <div className="flex justify-between text-brand-tertiary">
                           <span>Discount</span>
                           <span>-₹{proformaInvoice.discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs font-black text-gray-900 border-y border-gray-350 py-1 mt-1 bg-gray-50 px-1">
                         <span>Total Amount</span>
                         <span className="font-extrabold text-black">₹{proformaInvoice.total.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-gray-500">
                         <span>Received/Adjusted Amount</span>
                         <span>₹{receivedAmount.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between font-bold text-red-500">
                         <span>Balance</span>
                         <span>₹{balanceAmount.toFixed(2)}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="mt-8 pt-2 flex flex-col justify-between">
                <div className="flex justify-between items-end text-[9px] text-gray-400">
                  <div>
                    <span className="font-bold text-gray-500 uppercase tracking-wider">Total Amount (in words):</span>
                    <p className="italic font-bold text-gray-800 mt-0.5">{numberToWords(proformaInvoice.total)} Rupees Only</p>
                  </div>
                  {(proformaInvoice.signatureType === "empty" || proformaInvoice.signatureType === "upload") && (
                    <div className="text-right space-y-1 w-44">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider font-extrabold">Authorized Signatory</p>
                      {proformaInvoice.signatureType === "empty" ? (
                        <div className="h-12 border border-dashed border-red-400 rounded flex flex-col items-center justify-center text-[8px] text-red-500 font-bold bg-red-50/10">
                          <span>Authorized Signature</span>
                        </div>
                      ) : (
                        <div className="h-12 border border-gray-200 rounded flex items-center justify-center p-1 bg-white overflow-hidden">
                          <img src={proformaInvoice.signatureImage} alt="Signature" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="print-only-container">
        <div style={{ borderColor: accentColor }} className={`w-full bg-white p-10 flex flex-col justify-between font-sans text-black min-h-[1050px] relative border border-gray-300`}>
             <div>
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                     <span style={{ color: accentColor }} className="text-[12px] font-extrabold uppercase tracking-widest">
                       PROFORMA INVOICE
                     </span>
                     <span className="text-[9px] border border-gray-400 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">
                       {activeLabel}
                     </span>
                   </div>
                </div>

                <div className="mb-4">
                   <h1 style={{ color: accentColor }} className="text-xl font-bold uppercase tracking-wide">
                     {company?.name || "self"}
                   </h1>
                   {showPhone && <p className="text-[10px] text-gray-600 mt-0.5 font-semibold">Mobile: {company?.phone || "98XXXXXXXX"}</p>}
                   {company?.address && <p className="text-[9px] text-gray-500 mt-0.5 leading-normal">{company.address}</p>}
                </div>

                <div style={{ borderColor: accentColor }} className="border-b-2 mb-4"></div>

                <div className="grid grid-cols-2 border-y border-gray-300 bg-gray-50/60 px-4 py-2 mb-4 text-[10px] font-bold text-gray-700">
                   <div>
                     <p>Proforma Invoice No.: <span className="font-mono text-gray-950 font-extrabold">{proformaInvoice.proformaInvoiceNumber}</span></p>
                     {proformaInvoice.linkedInvoiceNumber && <p>Linked Invoice No.: <span className="font-mono text-gray-950 font-extrabold">{proformaInvoice.linkedInvoiceNumber}</span></p>}
                   </div>
                   <div className="text-right">
                     <p>Date: <span className="font-mono text-gray-950 font-extrabold">{formattedDate}</span></p>
                   </div>
                </div>

                <div className="mb-4 space-y-0.5 text-[10px]">
                   <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">PARTY DETAILS</p>
                   <p className="text-xs font-extrabold text-gray-900">{proformaInvoice.customerName}</p>
                   {showPhone && proformaInvoice.customerPhone && <p className="text-gray-650 font-semibold">Mobile: {proformaInvoice.customerPhone}</p>}
                   {proformaInvoice.customerGSTIN && <p className="text-gray-650 font-mono">GSTIN: {proformaInvoice.customerGSTIN}</p>}
                </div>

                <div className="border border-gray-300 rounded overflow-hidden mb-4">
                   <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                         <tr style={{ backgroundColor: `${accentColor}12`, color: accentColor }} className="font-extrabold border-b border-gray-300 uppercase tracking-wider text-[9px]">
                            <th className="py-2 px-3">ITEMS</th>
                            <th className="py-2 px-3 text-center">QTY.</th>
                            <th className="py-2 px-3 text-right">RATE</th>
                            <th className="py-2 px-3 text-center">TAX</th>
                            <th className="py-2 px-3 text-right">AMOUNT</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-250 text-gray-700 font-semibold">
                         {proformaInvoice.items && proformaInvoice.items.map((item, idx) => {
                           const taxRate = item.tax || (proformaInvoice.gstEnabled ? 18 : 0);
                           return (
                             <tr key={idx} className="hover:bg-gray-50/30">
                                <td className="py-2 px-3"><p className="font-bold text-gray-900 uppercase">{item.name}</p></td>
                                <td className="py-2 px-3 text-center font-mono text-gray-900">{item.qty} PCS</td>
                                <td className="py-2 px-3 text-right font-mono text-gray-900">₹{item.price.toFixed(2)}</td>
                                <td className="py-2 px-3 text-center font-mono text-gray-500">{taxRate}%</td>
                                <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₹{(item.qty * item.price).toFixed(2)}</td>
                             </tr>
                           );
                         })}
                         <tr className="bg-gray-50/50 font-bold border-y-2 border-gray-300 text-gray-900 text-[10px]">
                            <td className="py-2 px-3 text-left uppercase">SUBTOTAL</td>
                            <td className="py-2 px-3 text-center font-mono">{totalQty} PCS</td>
                            <td className="py-2 px-3 text-right">-</td>
                            <td className="py-2 px-3 text-center font-mono">₹{totalTaxAmount.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{proformaInvoice.subtotal.toFixed(2)}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                <div className="flex justify-between items-start text-[10px] pt-2">
                   <div className="w-[50%] space-y-3">
                      <div>
                         <p className="font-extrabold text-gray-500 uppercase tracking-wider">TERMS AND CONDITIONS</p>
                         <p className="text-gray-500 leading-normal mt-1 font-medium">1. Goods once sold will not be taken back or exchanged.<br/>2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only.</p>
                      </div>
                   </div>

                   <div className="w-64 space-y-1 font-mono text-right text-gray-500 font-bold border-t border-dashed border-gray-350 pt-2">
                      <div className="flex justify-between text-gray-600">
                         <span>Taxable Amount</span>
                         <span className="text-gray-900">₹{proformaInvoice.subtotal.toFixed(2)}</span>
                      </div>

                      {proformaInvoice.gstEnabled && (
                        proformaInvoice.isInterstate ? (
                          <div className="flex justify-between text-gray-500">
                            <span>IGST</span>
                            <span>₹{(proformaInvoice.igst || 0).toFixed(2)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-gray-500">
                              <span>CGST</span>
                              <span>₹{proformaInvoice.cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>SGST</span>
                              <span>₹{proformaInvoice.sgst.toFixed(2)}</span>
                            </div>
                          </>
                        )
                      )}

                      {proformaInvoice.discountAmount > 0 && (
                        <div className="flex justify-between text-brand-tertiary">
                           <span>Discount</span>
                           <span>-₹{proformaInvoice.discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs font-black text-gray-900 border-y border-gray-350 py-1 mt-1 bg-gray-50 px-1">
                         <span>Total Amount</span>
                         <span className="font-extrabold text-black">₹{proformaInvoice.total.toFixed(2)}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="mt-8 pt-2 flex flex-col justify-between">
                <div className="flex justify-between items-end text-[9px] text-gray-400">
                  <div>
                    <span className="font-bold text-gray-500 uppercase tracking-wider">Total Amount (in words):</span>
                    <p className="italic font-bold text-gray-800 mt-0.5">{numberToWords(proformaInvoice.total)} Rupees Only</p>
                  </div>
                  {(proformaInvoice.signatureType === "empty" || proformaInvoice.signatureType === "upload") && (
                    <div className="text-right space-y-1 w-44">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider font-extrabold">Authorized Signatory</p>
                      {proformaInvoice.signatureType === "empty" ? (
                        <div className="h-12 border border-dashed border-red-400 rounded flex flex-col items-center justify-center text-[8px] text-red-500 font-bold bg-red-50/10">
                          <span>Authorized Signature</span>
                        </div>
                      ) : (
                        <div className="h-12 border border-gray-200 rounded flex items-center justify-center p-1 bg-white overflow-hidden">
                          <img src={proformaInvoice.signatureImage} alt="Signature" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
             </div>
        </div>
      </div>
    
      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          customerName={proformaInvoice?.customerName || "Customer"}
          existingPhone={proformaInvoice?.customerPhone}
          message={`Dear ${proformaInvoice?.customerName},\n\nYour Proforma Invoice has been generated.\n\nTotal Amount: *₹${proformaInvoice?.total?.toFixed(2)}*\n\nThank you for choosing ${company?.name || "our company"}.`}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {showEmailModal && (
        <EmailModal
          onClose={() => setShowEmailModal(false)}
          customerName={proformaInvoice?.customerName || "Customer"}
          documentType={"Proforma Invoice"}
          documentNumber={proformaInvoice?.proformaInvoiceNumber || "1"}
          totalAmount={proformaInvoice?.total || 0}
          companyName={company?.name || "us"}
          defaultEmail=""
        />
      )}
    </div>
  );
}
