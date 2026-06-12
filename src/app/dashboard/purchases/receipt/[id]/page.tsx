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
  FileText,
  Share2,
  Maximize2,
  MoreVertical,
  Clock,
  MapPin,
  TrendingUp,
  X,
  ChevronDown,
  Check,
  CheckSquare,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { syncInventory } from "@/lib/inventorySync";
import WhatsAppModal from "@/components/ui/WhatsAppModal";
import EmailModal from "@/components/ui/EmailModal";
import SMSModal from "@/components/ui/SMSModal";
import { getItemBaseAmount } from "@/lib/calcInvoice";

/* TYPES */
type Item = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  tax?: number; 
};

type Invoice = {
  customerName: string;
  customerPhone?: string;
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
  purchaseInvoiceNumber?: string;
  originalInvoiceNumber?: string;
  createdAt?: Timestamp;
  dueDate?: string;
  invoiceType?: string;
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

// Number to English words helper
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

export default function ViewInvoice() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  // Sync settings states
  const [invoiceTheme, setInvoiceTheme] = useState<"luxury" | "stylish" | "tally">("luxury");
  const [accentColor, setAccentColor] = useState("#D4AF37");
  const [showPartyBalance, setShowPartyBalance] = useState(false);
  const [freeItemQty, setFreeItemQty] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [alternateUnit, setAlternateUnit] = useState(false);
  const [showPhone, setShowPhone] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [thermalWidth, setThermalWidth] = useState("2");
  const [logoUploaded, setLogoUploaded] = useState(false);

  // Layout UI states
  const [showAlert, setShowAlert] = useState(true);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfitOpen, setIsProfitOpen] = useState(false);

  // Print execution states
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  const [activeLabel, setActiveLabel] = useState<"ORIGINAL FOR RECIPIENT" | "DUPLICATE FOR TRANSPORTER" | "TRIPLICATE FOR SUPPLIER">("ORIGINAL FOR RECIPIENT");

  /* FETCH INVOICE */
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        // 1. Try Firestore First
        const ref = doc(db, "purchases", id);
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
          const offlineInvoices = await getOfflineInvoices(auth.currentUser?.uid);
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

  /* FETCH SETTINGS IN SYNC */
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

          // Sync invoice preview & printing preferences
          if (data.invoiceTheme) setInvoiceTheme(data.invoiceTheme);
          if (data.invoiceThemeColor) setAccentColor(data.invoiceThemeColor);
          if (data.thermalWidth) setThermalWidth(data.thermalWidth);
          if (data.logoUploaded !== undefined) setLogoUploaded(data.logoUploaded);

          const s = data.invoiceThemeSettings || {};
          if (s.showPartyBalance !== undefined) setShowPartyBalance(s.showPartyBalance);
          if (s.freeItemQty !== undefined) setFreeItemQty(s.freeItemQty);
          if (s.showDescription !== undefined) setShowDescription(s.showDescription);
          if (s.alternateUnit !== undefined) setAlternateUnit(s.alternateUnit);
          if (s.showPhone !== undefined) setShowPhone(s.showPhone);
          if (s.showTime !== undefined) setShowTime(s.showTime);

          // Auto-hide address alert if address exists
          if (data.address) {
            setShowAlert(false);
          }
        }
      } catch (err) {
        console.error("Error loading settings sync:", err);
      }
    };

    fetchSettingsAndCompany();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-400 gap-2 font-sans">
        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold uppercase tracking-wider">Loading Invoice details...</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-gray-400 gap-3 font-sans">
        <AlertCircle size={28} className="text-gray-300" />
        <span className="text-sm font-semibold uppercase tracking-wider">Invoice details not found</span>
      </div>
    );
  }

  const invoiceTypeTitle = (invoice.invoiceType || "invoice") === "estimate" ? "Estimate" : "Purchase Invoice";
  const formattedDate = invoice.createdAt
    ? typeof (invoice.createdAt as any).toDate === "function"
      ? (invoice.createdAt as any).toDate().toLocaleDateString()
      : new Date(invoice.createdAt as any).toLocaleDateString()
    : new Date().toLocaleDateString();

  const totalQty = invoice.items
    ? invoice.items.reduce((acc, item) => acc + (Number(item.qty) || 0), 0)
    : 0;

  const totalTaxAmount = invoice.items
    ? invoice.items.reduce((acc, item) => {
        const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
        const itemAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
        const itemTax = itemAmount * (taxRate / 100);
        return acc + itemTax;
      }, 0)
    : 0;

  const receivedAmount = typeof invoice.amountReceived === "number" 
    ? invoice.amountReceived 
    : (invoice.status === "paid" ? invoice.total : 0);
  const balanceAmount = Math.max(0, invoice.total - receivedAmount);

  const handleWhatsAppShare = () => {
    setShowWhatsAppModal(true);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      try {
        const user = auth.currentUser;
        if ((invoice as any).isOffline) {
          const { deleteOfflineInvoice } = await import("@/lib/offlineInvoices");
          await deleteOfflineInvoice(id);
        } else {
          if (invoice.items && invoice.items.length > 0 && user) {
            const itemsToSync = invoice.items.map((i: any) => ({
              id: i.productId,
              quantity: i.qty
            })).filter((i: any) => i.id);
            if (itemsToSync.length > 0) {
              await syncInventory(user.uid, itemsToSync, "DECREASE");
            }
          }
          await deleteDoc(doc(db, "purchases", id));
        }
        toast.success("Invoice deleted successfully");
        router.push("/dashboard/purchases");
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete invoice");
      }
    }
  };

  // Direct print triggers that switch states then call print
  const triggerPrint = (format: "a4" | "thermal", label: typeof activeLabel) => {
    setPrintFormat(format);
    setActiveLabel(label);
    setIsPrintOpen(false);
    setIsDownloadOpen(false);
    
    // Tiny timeout to let state update in DOM print wrapper before rendering print
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 font-sans bg-gray-50/60 min-h-screen">
      
      {/* Bulletproof Print Stylesheet overrides */}
      <style jsx global>{`
        @media screen {
          .print-only-container {
            display: none !important;
          }
        }
        @media print {
          /* Bulletproof layout hide for EVERYTHING outside print container */
          body * {
            visibility: hidden !important;
          }
          
          /* Show ONLY print target slip */
          .print-only-container, .print-only-container * {
            visibility: visible !important;
          }
          
          /* Frame page resetters */
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
          
          /* Custom paper sizes for thermal slips */
          ${printFormat === "thermal" ? `
            @page {
              size: ${thermalWidth === "2" ? "58mm" : "80mm"} auto;
              margin: 0;
            }
            .print-only-container {
              width: ${thermalWidth === "2" ? "52mm" : "74mm"} !important;
              padding: 2mm !important;
            }
          ` : `
            @page {
              size: A4;
              margin: 12mm;
            }
          `}
        }
      `}</style>

      {/* ──────────────────────────────────────────────────────── */}
      {/* SCREEN VIEW ONLY CONTAINER */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="screen-only-container flex flex-col flex-1">
        
        {/* 1. Page Header (Screenshot title bar) */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/purchases" className="text-gray-400 hover:text-gray-700 transition">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span>{invoiceTypeTitle} #{invoice.purchaseInvoiceNumber || "1"}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                invoice.status === "paid" 
                  ? "bg-green-50 text-brand-tertiary border border-green-200/50" 
                  : "bg-amber-50 text-amber-600 border border-amber-200/50"
              }`}>
                {invoice.status}
              </span>
            </h1>
          </div>

          {/* Profit, Edit, Delete, Fullscreen block */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsProfitOpen(!isProfitOpen)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100/80 px-3.5 py-1.5 rounded-md font-bold transition shadow-2xs"
            >
              <TrendingUp size={13} />
              <span>Profit Details</span>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className="text-gray-400 hover:text-gray-600 p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition"
              >
                <MoreVertical size={15} />
              </button>
              {isMoreOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-32 z-50 text-xs font-semibold">
                  <Link href={`/dashboard/purchases/edit/${id}`} className="block px-4 py-2 text-gray-700 hover:bg-gray-50">Edit Invoice</Link>
                  <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Delete Invoice</button>
                </div>
              )}
            </div>
            
            <button className="text-gray-400 hover:text-gray-600 p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition">
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* 2. Dismissable Address Alert Banner (Screenshot 1 top alert) */}
        {showAlert && (
          <div className="bg-amber-50/50 border-b border-amber-100/60 px-6 py-2.5 flex items-center justify-between shrink-0 transition-all">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Add Business Address</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Add your business address to showcase your business identity on all the invoices</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard/settings" 
                className="text-[10px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded transition shadow-2xs"
              >
                Add Business Address
              </Link>
              <button onClick={() => setShowAlert(false)} className="text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* 3. Action Toolbar (Screenshot 1 horizontal actions bar) */}
        <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
          
          {/* Left Actions Side */}
          <div className="flex items-center gap-2">
            
            {/* Download PDF Dropdown */}
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
                  <button onClick={() => triggerPrint("a4", "TRIPLICATE FOR SUPPLIER")} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50">Download Triplicate</button>
                </div>
              )}
            </div>

            {/* Print PDF Dropdown */}
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
                  <button onClick={() => triggerPrint("thermal", "ORIGINAL FOR RECIPIENT")} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50">Print Thermal</button>
                  <button onClick={() => triggerPrint("a4", "DUPLICATE FOR TRANSPORTER")} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50">Print Duplicate</button>
                  <button onClick={() => triggerPrint("a4", "TRIPLICATE FOR SUPPLIER")} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50">Print Triplicate</button>
                </div>
              )}
            </div>

            {/* Clock History */}
            <button className="text-gray-400 hover:text-gray-600 p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition">
              <Clock size={13} />
            </button>

            {/* Share Dropdown */}
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
                <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-40 z-50 text-xs font-semibold">
                  <button onClick={handleWhatsAppShare} className="w-full flex items-center gap-2 px-4 py-2 text-brand-tertiary hover:bg-green-50">
                    <FaWhatsapp size={14} />
                    <span>WhatsApp</span>
                  </button>
                  <button onClick={() => { setShowSMSModal(true); setIsShareOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-brand-primary hover:bg-blue-50">
                    <FileText size={14} />
                    <span>SMS</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Actions Side (Eway / e-Invoice) */}
          {/* <div className="flex items-center gap-2">
            <button 
              onClick={() => toast.success("Generating E-way Bill workflow... 🚚")}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded px-3 py-1.5 transition shadow-3xs"
            >
              <FileSpreadsheet size={13} />
              <span>Generate E-way Bill</span>
            </button>
            
            <button 
              onClick={() => toast.success("e-Invoice successfully generated! ✅")}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded px-3 py-1.5 transition shadow-3xs"
            >
              <CheckSquare size={13} />
              <span>Generate e-Invoice</span>
            </button>
          </div> */}

        </div>

        {/* 4. Split Body Workspace (Invoice center + Payment History Right) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Center Canvas: A4 Styled tax invoice slip */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-gray-150/40">
            
            <div 
              style={{ borderColor: invoiceTheme === "tally" ? "#cccccc" : accentColor }}
              className={`bg-white w-[720px] min-h-[960px] shadow-lg relative p-10 flex flex-col justify-between font-sans text-gray-800 transition-all ${
                invoiceTheme === "luxury" ? "border-t-[12px]" : "border border-gray-300"
              }`}
            >
               {/* Decorative corner frames ONLY for luxury theme */}
               {invoiceTheme === "luxury" && (
                 <>
                   <div style={{ borderColor: accentColor }} className="absolute top-0 left-0 w-6 h-6 border-b border-r"></div>
                   <div style={{ borderColor: accentColor }} className="absolute top-0 right-0 w-6 h-6 border-b border-l"></div>
                   <div style={{ borderColor: accentColor }} className="absolute bottom-0 left-0 w-6 h-6 border-t border-r"></div>
                   <div style={{ borderColor: accentColor }} className="absolute bottom-0 right-0 w-6 h-6 border-t border-l"></div>
                 </>
               )}

               <div>
                  {/* Document Header block */}
                  <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-2">
                        <span 
                          style={{ color: invoiceTheme === "tally" ? "#000000" : accentColor }} 
                          className="text-[12px] font-extrabold uppercase tracking-widest"
                        >
                          {(invoice.invoiceType || "invoice") === "estimate" ? "ESTIMATE" : "PURCHASE INVOICE"}
                        </span>
                        <span className="text-[9px] border border-gray-400 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">
                          {activeLabel}
                        </span>
                     </div>
                     {/* Cloud Ledger Logo */}
                     <div className="flex items-center font-sans tracking-tight select-none">
                       <span className="text-sm font-black text-gray-800">Cloud</span>
<span className="text-sm font-black text-brand-secondary">Ledger</span>
                     </div>
                  </div>

                  <div className="mb-4">
                     <h1 
                       style={{ color: invoiceTheme === "tally" ? "#111827" : accentColor }} 
                       className="text-xl font-bold uppercase tracking-wide"
                     >
                       {company?.name || "self"}
                     </h1>
                     {showPhone && <p className="text-[10px] text-gray-600 mt-0.5 font-semibold">Mobile: {company?.phone || "98XXXXXXXX"}</p>}
                     {company?.address && <p className="text-[9px] text-gray-500 mt-0.5 leading-normal">{company.address}</p>}
                  </div>

                  <div 
                    style={{ borderColor: invoiceTheme === "tally" ? "#000000" : accentColor }} 
                    className="border-b-2 mb-4"
                  ></div>

                  {/* Meta info layout gray stripe */}
                  <div className="grid grid-cols-2 border-y border-gray-300 bg-gray-50/60 px-4 py-2 mb-4 text-[10px] font-bold text-gray-700">
                     <p>Purchase No.: <span className="font-mono text-gray-950 font-extrabold">{invoice.purchaseInvoiceNumber || "1"}</span></p>
                     <p className="text-right">Purchase Date: <span className="font-mono text-gray-950 font-extrabold">{formattedDate}</span></p>
                  </div>

                  {/* Customer details bill to block */}
                  <div className="flex justify-between">
                  <div className="mb-4 space-y-0.5 text-[10px]">
                     <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">BILL FROM (Supplier)</p>
                     <p className="text-xs font-extrabold text-gray-900">{invoice.customerName}</p>
                     {showPhone && invoice.customerPhone && <p className="text-gray-650 font-semibold">Mobile: {invoice.customerPhone}</p>}
                     {invoice.customerGSTIN && <p className="text-gray-650 font-mono">GSTIN: {invoice.customerGSTIN}</p>}
                  </div>
                  <div className="mb-4 space-y-0.5 text-[10px] text-right">
                     <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">BILL TO (Our Company)</p>
                     <p className="text-xs font-extrabold text-gray-900">{company?.name || "self"}</p>
                     <p className="text-gray-650 font-semibold mt-2">Original Invoice No: {invoice.originalInvoiceNumber || "-"}</p>
                  </div>
                  </div>

                  {/* Standard responsive columns products table */}
                  <div className="border border-gray-300 rounded overflow-hidden mb-4">
                     <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                           <tr 
                             style={{ 
                               backgroundColor: invoiceTheme === "tally" ? "#f3f4f6" : `${accentColor}12`, 
                               color: invoiceTheme === "tally" ? "#000000" : accentColor 
                             }} 
                             className="font-extrabold border-b border-gray-300 uppercase tracking-wider text-[9px]"
                           >
                              <th className="py-2 px-3">ITEMS</th>
                              <th className="py-2 px-3 text-center">QTY.</th>
                              <th className="py-2 px-3 text-right">RATE</th>
                              <th className="py-2 px-3 text-center">TAX</th>
                              <th className="py-2 px-3 text-right">AMOUNT</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-250 text-gray-700 font-semibold">
                           {invoice.items && invoice.items.map((item, idx) => {
                             const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
                             return (
                               <tr key={idx} className="hover:bg-gray-50/30">
                                  <td className="py-2 px-3">
                                     <p className="font-bold text-gray-900 uppercase">{item.name}</p>
                                     {showDescription && <p className="text-[9px] text-gray-400 font-normal mt-0.5">Custom Item Description</p>}
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono text-gray-900">
                                    <span>{item.qty} PCS</span>
                                    {freeItemQty && <span className="text-brand-tertiary font-bold block text-[9px]">(+0 Free)</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-gray-900">₹{item.price.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-center font-mono text-gray-500">{taxRate}%</td>
                                  <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₹{getItemBaseAmount(item).toFixed(2)}</td>
                               </tr>
                             );
                           })}

                           {/* SUBTOTAL ROW AT THE BOTTOM OF TABLE */}
                           <tr className="bg-gray-50/50 font-bold border-y-2 border-gray-300 text-gray-900 text-[10px]">
                              <td className="py-2 px-3 text-left uppercase">SUBTOTAL</td>
                              <td className="py-2 px-3 text-center font-mono">{totalQty} PCS</td>
                              <td className="py-2 px-3 text-right">-</td>
                              <td className="py-2 px-3 text-center font-mono">₹{totalTaxAmount.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-mono">₹{invoice.subtotal.toFixed(2)}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>

                  {/* Bottom grid: Notes vs Totals breakdown */}
                  <div className="flex justify-between items-start text-[10px] pt-2">
                     
                     {/* Left Column: Terms */}
                     <div className="w-[50%] space-y-3">
                        <div>
                           <p className="font-extrabold text-gray-500 uppercase tracking-wider">TERMS AND CONDITIONS</p>
                           <p className="text-gray-500 leading-normal mt-1 font-medium">
                              1. Goods once sold will not be taken back or exchanged.<br/>
                              2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only.
                           </p>
                        </div>
                     </div>

                     {/* Right Column: Calculations totals */}
                     <div className="w-64 space-y-1 font-mono text-right text-gray-500 font-bold border-t border-dashed border-gray-350 pt-2">
                        <div className="flex justify-between text-gray-600">
                           <span>Taxable Amount</span>
                           <span className="text-gray-900">₹{invoice.subtotal.toFixed(2)}</span>
                        </div>

                        {invoice.gstEnabled && (
                          invoice.isInterstate ? (
                            <div className="flex justify-between text-gray-500">
                              <span>IGST (18%)</span>
                              <span>₹{(invoice.igst || 0).toFixed(2)}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between text-gray-500">
                                <span>CGST @ {(totalTaxAmount > 0 ? (totalTaxAmount / 2 / invoice.subtotal * 100).toFixed(2) : "9")}%</span>
                                <span>₹{invoice.cgst.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-gray-500">
                                <span>SGST @ {(totalTaxAmount > 0 ? (totalTaxAmount / 2 / invoice.subtotal * 100).toFixed(2) : "9")}%</span>
                                <span>₹{invoice.sgst.toFixed(2)}</span>
                              </div>
                            </>
                          )
                        )}

                        {invoice.discountAmount > 0 && (
                          <div className="flex justify-between text-brand-tertiary">
                             <span>Discount</span>
                             <span>-₹{invoice.discountAmount.toFixed(2)}</span>
                          </div>
                        )}

                        {showPartyBalance && (
                          <div className="flex justify-between text-red-500 font-bold border-t border-gray-100 pt-1">
                            <span>Previous Balance</span>
                            <span>₹4,500.00</span>
                          </div>
                        )}

                        <div className="flex justify-between text-xs font-black text-gray-900 border-y border-gray-350 py-1 mt-1 bg-gray-50 px-1">
                           <span>Total Amount</span>
                           <span className="font-extrabold text-black">₹{invoice.total.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-gray-500">
                           <span>Received Amount</span>
                           <span>₹{receivedAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between font-bold text-red-500">
                           <span>Balance</span>
                           <span>₹{balanceAmount.toFixed(2)}</span>
                        </div>
                     </div>

                  </div>
               </div>

               {/* A4 Footer segment */}
               <div className="mt-8 pt-2 flex flex-col justify-between">
                  <div className="flex justify-between items-end text-[9px] text-gray-400">
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider">Total Amount (in words):</span>
                      <p className="italic font-bold text-gray-800 mt-0.5">{numberToWords(invoice.total)} Rupees Only</p>
                      {showTime && (
                        <p className="text-[7px] text-gray-450 mt-1 font-bold uppercase">
                          Printed: {new Date().toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    {/* Signature Box in Screen A4 */}
                    {(invoice.signatureType === "empty" || invoice.signatureType === "upload") && (
                      <div className="text-right space-y-1 w-44">
                        <p className="text-[8px] text-gray-500 uppercase tracking-wider font-extrabold">Authorized Signatory for <span className="font-bold text-gray-800">{company?.name || "self"}</span></p>
                        {invoice.signatureType === "empty" ? (
                          <div className="h-12 border border-dashed border-red-400 rounded flex flex-col items-center justify-center text-[8px] text-red-500 font-bold bg-red-50/10">
                            <span>Authorized Signature</span>
                            <span className="text-[6px] text-red-400 font-normal mt-0.5">Sign Here</span>
                          </div>
                        ) : (
                          <div className="h-12 border border-gray-200 rounded flex items-center justify-center p-1 bg-white overflow-hidden">
                            <img src={invoice.signatureImage} alt="Authorized Signature" className="max-h-full max-w-full object-contain" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cloud Ledger Brand tagline */}
                  <div className="border-t border-gray-200 pt-2.5 mt-6 flex flex-col items-center text-[8px] text-gray-400 gap-0.5 font-bold uppercase tracking-wider">
                     <p className="flex items-center gap-1 select-none">
                       <span>Invoice created using</span>
                       <span className="font-black text-gray-600">Cloud</span>
<span className="font-black text-brand-secondary">Ledger</span>
                     </p>
                     <p className="text-[7px] text-gray-300 lowercase font-semibold">Download now at playstore / appstore</p>
                  </div>
               </div>

            </div>

          </div>

          {/* 5. Right Sidebar: Payment History (Screenshot 4 side panel) */}
          <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col justify-between shrink-0 shadow-sm font-sans">
             
             {/* History details */}
             <div>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                   <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Payment History</h2>
                   <button className="text-gray-400 hover:text-gray-600">
                      <X size={15} />
                   </button>
                </div>

                <div className="p-5 space-y-4">
                   
                   <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                      <span>Invoice Amount</span>
                      <span className="font-bold text-gray-800 font-mono">₹{invoice.total.toFixed(2)}</span>
                   </div>

                   <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                      <span>Initial Amount Received</span>
                       <span className="font-bold text-gray-800 font-mono">
                         ₹{receivedAmount.toFixed(2)}
                       </span>
                   </div>

                   <div className="border border-dashed border-gray-150 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-gray-50/20 mt-4">
                     <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-2">
                       <Check size={14} className="font-bold" />
                     </div>
                     <p className="text-[10px] font-bold text-gray-800">Perfect Record</p>
                     <p className="text-[9px] text-gray-400 mt-0.5 leading-normal">No late dues or payment conflicts listed for this voucher</p>
                   </div>

                </div>
             </div>

             {/* Total footer summary details */}
             <div className="p-4 border-t border-gray-150 bg-gray-50/30 space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                   <span>Total Amount Received</span>
                   <span className="font-bold text-gray-700 font-mono">
                     ₹{receivedAmount.toFixed(2)}
                   </span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-gray-800 border-t border-gray-100 pt-2">
                   <span>Balance Amount</span>
                   <span className={`font-mono ${balanceAmount === 0 ? "text-brand-tertiary" : "text-red-500"}`}>
                     ₹{balanceAmount.toFixed(2)}
                   </span>
                </div>
             </div>

        </div>
      </div>
    </div>

      {/* ======================================================== */}
      {/* PRINT-ONLY MASTER CONTAINER (Toggled by window.print()) */}
      {/* ======================================================== */}
      <div className="print-only-container">
        {printFormat === "a4" ? (
          
          /* A4 Print Document */
          <div 
            style={{ borderColor: invoiceTheme === "tally" ? "#cccccc" : accentColor }}
            className={`w-full bg-white p-10 flex flex-col justify-between font-sans text-black min-h-[1050px] relative ${
              invoiceTheme === "luxury" ? "border-t-[12px]" : "border border-gray-300"
            }`}
          >
             {/* Decorative corner frames ONLY for luxury theme */}
             {invoiceTheme === "luxury" && (
               <>
                 <div style={{ borderColor: accentColor }} className="absolute top-0 left-0 w-6 h-6 border-b border-r"></div>
                 <div style={{ borderColor: accentColor }} className="absolute top-0 right-0 w-6 h-6 border-b border-l"></div>
                 <div style={{ borderColor: accentColor }} className="absolute bottom-0 left-0 w-6 h-6 border-t border-r"></div>
                 <div style={{ borderColor: accentColor }} className="absolute bottom-0 right-0 w-6 h-6 border-t border-l"></div>
               </>
             )}
             <div>
                {/* Document Header block */}
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                     <span 
                       style={{ color: invoiceTheme === "tally" ? "#000000" : accentColor }} 
                       className="text-[12px] font-extrabold uppercase tracking-widest"
                     >
                       {(invoice.invoiceType || "invoice") === "estimate" ? "ESTIMATE" : "PURCHASE INVOICE"}
                     </span>
                     <span className="text-[9px] border border-gray-400 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">
                       {activeLabel}
                     </span>
                   </div>
                   {/* Cloud Ledger Logo */}
                   <div className="flex items-center font-sans tracking-tight select-none">
                     <span className="text-sm font-black text-gray-800">Cloud</span>
<span className="text-sm font-black text-brand-secondary">Ledger</span>
                   </div>
                </div>

                <div className="mb-4">
                   <h1 
                     style={{ color: invoiceTheme === "tally" ? "#111827" : accentColor }} 
                     className="text-xl font-bold uppercase tracking-wide"
                   >
                     {company?.name || "self"}
                   </h1>
                   {showPhone && <p className="text-[10px] text-gray-600 mt-0.5 font-semibold">Mobile: {company?.phone || "98XXXXXXXX"}</p>}
                   {company?.address && <p className="text-[9px] text-gray-500 mt-0.5 leading-normal">{company.address}</p>}
                </div>

                <div 
                   style={{ borderColor: invoiceTheme === "tally" ? "#000000" : accentColor }} 
                   className="border-b-2 mb-4"
                 ></div>

                {/* Meta info layout gray stripe */}
                <div className="grid grid-cols-2 border-y border-gray-300 bg-gray-50/60 px-4 py-2 mb-4 text-[10px] font-bold text-gray-700">
                   <p>Purchase No.: <span className="font-mono text-gray-950 font-extrabold">{invoice.purchaseInvoiceNumber || "1"}</span></p>
                   <p className="text-right">Purchase Date: <span className="font-mono text-gray-950 font-extrabold">{formattedDate}</span></p>
                </div>

                {/* Customer details bill to block */}
                <div className="mb-4 space-y-0.5 text-[10px]">
                   <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">BILL FROM</p>
                   <p className="text-xs font-extrabold text-gray-900">{invoice.customerName}</p>
                   {showPhone && invoice.customerPhone && <p className="text-gray-650 font-semibold">Mobile: {invoice.customerPhone}</p>}
                   {invoice.customerGSTIN && <p className="text-gray-650 font-mono">GSTIN: {invoice.customerGSTIN}</p>}
                </div>

                {/* Standard responsive columns products table */}
                <div className="border border-gray-300 rounded overflow-hidden mb-4">
                   <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                         <tr 
                            style={{ 
                              backgroundColor: invoiceTheme === "tally" ? "#f3f4f6" : `${accentColor}12`, 
                              color: invoiceTheme === "tally" ? "#000000" : accentColor 
                            }} 
                            className="font-extrabold border-b border-gray-300 uppercase tracking-wider text-[9px]"
                          >
                            <th className="py-2 px-3">ITEMS</th>
                            <th className="py-2 px-3 text-center">QTY.</th>
                            <th className="py-2 px-3 text-right">RATE</th>
                            <th className="py-2 px-3 text-center">TAX</th>
                            <th className="py-2 px-3 text-right">AMOUNT</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-250 text-gray-700 font-semibold">
                         {invoice.items && invoice.items.map((item, idx) => {
                           const taxRate = item.tax || (invoice.gstEnabled ? 18 : 0);
                           return (
                             <tr key={idx} className="hover:bg-gray-50/30">
                                <td className="py-2 px-3">
                                   <p className="font-bold text-gray-900 uppercase">{item.name}</p>
                                   {showDescription && <p className="text-[9px] text-gray-400 font-normal mt-0.5">Custom Item Description</p>}
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-gray-900">
                                  <span>{item.qty} PCS</span>
                                  {freeItemQty && <span className="text-brand-tertiary font-bold block text-[9px]">(+0 Free)</span>}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-gray-900">₹{item.price.toFixed(2)}</td>
                                <td className="py-2 px-3 text-center font-mono text-gray-500">{taxRate}%</td>
                                <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">₹{getItemBaseAmount(item).toFixed(2)}</td>
                             </tr>
                           );
                         })}

                         {/* SUBTOTAL ROW AT THE BOTTOM OF TABLE */}
                         <tr className="bg-gray-50/50 font-bold border-y-2 border-gray-300 text-gray-900 text-[10px]">
                            <td className="py-2 px-3 text-left uppercase">SUBTOTAL</td>
                            <td className="py-2 px-3 text-center font-mono">{totalQty} PCS</td>
                            <td className="py-2 px-3 text-right">-</td>
                            <td className="py-2 px-3 text-center font-mono">₹{totalTaxAmount.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{invoice.subtotal.toFixed(2)}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                {/* Bottom grid: Notes vs Totals breakdown */}
                <div className="flex justify-between items-start text-[10px] pt-2">
                   
                   {/* Left Column: Terms */}
                   <div className="w-[50%] space-y-3">
                      <div>
                         <p className="font-extrabold text-gray-500 uppercase tracking-wider">TERMS AND CONDITIONS</p>
                         <p className="text-gray-500 leading-normal mt-1 font-medium">
                            1. Goods once sold will not be taken back or exchanged.<br/>
                            2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only.
                         </p>
                      </div>
                   </div>

                   {/* Right Column: Calculations totals */}
                   <div className="w-64 space-y-1 font-mono text-right text-gray-500 font-bold border-t border-dashed border-gray-350 pt-2">
                      <div className="flex justify-between text-gray-600">
                         <span>Taxable Amount</span>
                         <span className="text-gray-900">₹{invoice.subtotal.toFixed(2)}</span>
                      </div>

                      {invoice.gstEnabled && (
                        invoice.isInterstate ? (
                          <div className="flex justify-between text-gray-500">
                            <span>IGST (18%)</span>
                            <span>₹{(invoice.igst || 0).toFixed(2)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-gray-500">
                              <span>CGST @ {(totalTaxAmount > 0 ? (totalTaxAmount / 2 / invoice.subtotal * 100).toFixed(2) : "9")}%</span>
                              <span>₹{invoice.cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>SGST @ {(totalTaxAmount > 0 ? (totalTaxAmount / 2 / invoice.subtotal * 100).toFixed(2) : "9")}%</span>
                              <span>₹{invoice.sgst.toFixed(2)}</span>
                            </div>
                          </>
                        )
                      )}

                      {invoice.discountAmount > 0 && (
                        <div className="flex justify-between text-brand-tertiary">
                           <span>Discount</span>
                           <span>-₹{invoice.discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {showPartyBalance && (
                        <div className="flex justify-between text-red-500 font-bold border-t border-gray-100 pt-1">
                          <span>Previous Balance</span>
                          <span>₹4,500.00</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs font-black text-gray-900 border-y border-gray-350 py-1 mt-1 bg-gray-50 px-1">
                         <span>Total Amount</span>
                         <span className="font-extrabold text-black">₹{invoice.total.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-gray-500">
                         <span>Received Amount</span>
                         <span>₹{receivedAmount.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between font-bold text-red-500">
                         <span>Balance</span>
                         <span>₹{balanceAmount.toFixed(2)}</span>
                      </div>
                   </div>

                </div>
             </div>

             {/* A4 Footer segment */}
             <div className="mt-8 pt-2 flex flex-col justify-between">
                <div className="flex justify-between items-end text-[9px] text-gray-400">
                  <div>
                    <span className="font-bold text-gray-500 uppercase tracking-wider">Total Amount (in words):</span>
                    <p className="italic font-bold text-gray-800 mt-0.5">{numberToWords(invoice.total)} Rupees Only</p>
                    {showTime && (
                      <p className="text-[7px] text-gray-455 mt-1 font-bold uppercase">
                        Printed: {new Date().toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {/* Signature Box in Printable A4 PDF */}
                  {(invoice.signatureType === "empty" || invoice.signatureType === "upload") && (
                    <div className="text-right space-y-1 w-44">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider font-extrabold">Authorized Signatory for <span className="font-bold text-gray-800">{company?.name || "self"}</span></p>
                      {invoice.signatureType === "empty" ? (
                        <div className="h-12 border border-dashed border-red-400 rounded flex flex-col items-center justify-center text-[8px] text-red-500 font-bold bg-red-50/10">
                          <span>Authorized Signature</span>
                          <span className="text-[6px] text-red-400 font-normal mt-0.5">Sign Here</span>
                        </div>
                      ) : (
                        <div className="h-12 border border-gray-200 rounded flex items-center justify-center p-1 bg-white overflow-hidden">
                          <img src={invoice.signatureImage} alt="Authorized Signature" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cloud Ledger Brand tagline */}
                <div className="border-t border-gray-200 pt-2.5 mt-6 flex flex-col items-center text-[8px] text-gray-400 gap-0.5 font-bold uppercase tracking-wider">
                   <p className="flex items-center gap-1 select-none">
                     <span>Invoice created using</span>
                     <span className="font-black text-gray-600">Cloud</span>
<span className="font-black text-brand-secondary">Ledger</span>
                   </p>
                   <p className="text-[7px] text-gray-300 lowercase font-semibold">Download now at playstore / appstore</p>
                </div>
             </div>
          </div>
        ) : (
          
          /* Thermal Print Receipt slip */
          <div 
            style={{ width: thermalWidth === "2" ? "210px" : "290px" }}
            className="bg-white p-2 font-mono text-[9px] text-black space-y-3 leading-normal"
          >
             <div className="text-center space-y-0.5">
               <p className="font-bold text-xs uppercase tracking-wider">PURCHASE INVOICE</p>
               <p className="font-bold text-[10px]">{company?.name || "self"}</p>
               {showPhone && <p className="text-gray-500">Phone No: {company?.phone || "98XXXXXXXX"}</p>}
             </div>

             <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5">
               <p className="flex justify-between"><span>Invoice Number:</span><span className="font-bold">#{invoice.purchaseInvoiceNumber || "1"}</span></p>
               <p className="flex justify-between"><span>Purchase Date:</span><span>{formattedDate}</span></p>
               <p className="flex justify-between"><span>Bill From:</span><span className="font-bold truncate max-w-[100px] text-right">{invoice.customerName}</span></p>
               <p className="flex justify-between"><span>Bill To:</span><span className="font-bold truncate max-w-[100px] text-right">{company?.name || "self"}</span></p>
             </div>

             <div className="border-t border-dashed border-gray-300 pt-2">
               <div className="grid grid-cols-5 text-[8px] font-bold text-black border-b border-dashed border-gray-200 pb-1 mb-1">
                 <span className="col-span-2">ITEM</span>
                 <span className="text-right">QTY</span>
                 <span className="text-right">RATE</span>
                 <span className="text-right">AMT</span>
               </div>
               
               <div className="space-y-1.5">
                 {invoice.items && invoice.items.map((item, idx) => (
                   <div key={idx} className="space-y-0.5">
                     <div className="grid grid-cols-5">
                       <span className="col-span-2 font-bold text-black uppercase truncate">{item.name}</span>
                       <span className="text-right">{item.qty} PCS</span>
                       <span className="text-right">{item.price.toFixed(2)}</span>
                       <span className="text-right font-bold">{(item.qty * item.price).toFixed(2)}</span>
                     </div>
                     {showDescription && (
                       <div className="text-[7px] text-gray-400 pl-2">
                         <span>Custom Item Description</span>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>

             <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-gray-500 font-semibold">
               <p className="flex justify-between"><span>Sub Total:</span><span className="text-black font-bold">₹{invoice.subtotal.toFixed(2)}</span></p>
               <p className="flex justify-between"><span>Taxable Amount:</span><span>₹{invoice.subtotal.toFixed(2)}</span></p>
               
               {invoice.gstEnabled && (
                 invoice.isInterstate ? (
                   <p className="flex justify-between"><span>IGST:</span><span>₹{(invoice.igst || 0).toFixed(2)}</span></p>
                 ) : (
                   <>
                     <p className="flex justify-between"><span>SGST:</span><span>₹{invoice.sgst.toFixed(2)}</span></p>
                     <p className="flex justify-between"><span>CGST:</span><span>₹{invoice.cgst.toFixed(2)}</span></p>
                   </>
                 )
               )}

               <p className="flex justify-between text-[10px] text-black font-bold border-t border-dashed border-gray-200 pt-1 mt-1">
                 <span>Total Amount:</span>
                 <span className="text-black font-extrabold">₹{invoice.total.toFixed(2)}</span>
               </p>
               
               <p className="flex justify-between"><span>Paid Amount:</span><span>₹{receivedAmount.toFixed(2)}</span></p>
               <p className="flex justify-between text-red-500 font-bold"><span>Balance Amount:</span><span>₹{balanceAmount.toFixed(2)}</span></p>
             </div>

             <div className="border-t border-dashed border-gray-300 pt-2 text-[8px] text-gray-400 space-y-1 leading-relaxed">
               <div>
                 <p className="font-bold text-gray-500">Terms and Conditions:</p>
                 <p>1. Goods once sold will not be taken back or exchanged.</p>
                 <p>2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only.</p>
               </div>
             </div>

             <div className="text-center pt-2 border-t border-dashed border-gray-200 text-[10px] font-bold text-black uppercase tracking-widest mt-1">
               Thank you for your purchase
             </div>
          </div>

        )}
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* profit details modal floating */}
      {/* ──────────────────────────────────────────────────────── */}
      {isProfitOpen && (
        <div className="fixed inset-0 bg-[#0B1120]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between font-bold text-xs uppercase tracking-wider">
               <span>Invoice Profit Margins</span>
               <button onClick={() => setIsProfitOpen(false)} className="text-white/80 hover:text-white">
                  <X size={15} />
               </button>
            </div>
            <div className="p-6 space-y-4">
               <div className="flex justify-between text-xs text-gray-600 font-semibold">
                  <span>Gross Sales Price:</span>
                  <span className="font-mono">₹{invoice.total.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-xs text-gray-600 font-semibold">
                  <span>Estimated Item Cost (Avg):</span>
                  <span className="font-mono">₹{(invoice.subtotal * 0.75).toFixed(2)}</span>
               </div>
               <div className="border-t border-gray-100 pt-3 flex justify-between text-xs font-bold text-brand-tertiary">
                  <span>Calculated Net Profit:</span>
                  <span className="font-mono">₹{(invoice.total - (invoice.subtotal * 0.75)).toFixed(2)}</span>
               </div>
               <div className="bg-green-50 text-[10px] text-green-800 p-3 rounded-lg leading-normal font-medium">
                  This transaction maintains an excellent estimated gross margin of <span className="font-bold">25.00%</span>.
               </div>
            </div>
          </div>
        </div>
      )}

    
      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          customerName={invoice?.customerName || "Customer"}
          existingPhone={invoice?.customerPhone}
          message={`Dear ${invoice?.customerName},\n\nYour Purchase Receipt has been generated.\n\nTotal Amount: *₹${invoice?.total?.toFixed(2)}*\n\nThank you for choosing ${company?.name || "our company"}.`}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {showEmailModal && (
        <EmailModal
          onClose={() => setShowEmailModal(false)}
          customerName={invoice?.customerName || "Customer"}
          documentType={invoiceTypeTitle}
          documentNumber={invoice.purchaseInvoiceNumber || "1"}
          totalAmount={invoice?.total || 0}
          companyName={company?.name || "us"}
          defaultEmail=""
        />
      )}
    </div>
  );
}
