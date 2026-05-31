"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, PlayCircle, Settings, X, Plus, Search, 
  PackageOpen, Maximize, Edit3, ChevronDown, Trash2, Printer
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, doc, updateDoc, getDoc, increment, getDocsFromCache } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

import { sanitizeNumericInput } from "@/lib/sanitize";
import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";
import { v4 as uuidv4 } from "uuid";

type PosItem = {
  id: string; // unique local item row id
  productId: string;
  name: string;
  barcode: string;
  itemCode: string;
  qty: number | "";
  price: number; // SP
  gstRate: number;
  stock: number;
};

type PosBill = {
  id: string;
  title: string;
  items: PosItem[];
  discountType: DiscountType;
  discountValue: number | "";
  additionalChargeName: string;
  additionalChargeValue: number | "";
  amountReceived: number | "";
  paymentMode: string;
  customerName: string;
  customerPhone: string;
  isFullyPaid: boolean;
};

export default function POSBillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // POS State
  const [bills, setBills] = useState<PosBill[]>([
    {
      id: uuidv4(),
      title: "Billing Screen 1",
      items: [],
      discountType: "percent",
      discountValue: "",
      additionalChargeName: "Delivery",
      additionalChargeValue: "",
      amountReceived: "",
      paymentMode: "Cash",
      customerName: "",
      customerPhone: "",
      isFullyPaid: false,
    }
  ]);
  const [activeBillId, setActiveBillId] = useState<string>(bills[0].id);

  // Modals
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings state
  const [hideCustomerInfo, setHideCustomerInfo] = useState(false);
  const [autoFullyPaid, setAutoFullyPaid] = useState(true);
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [printerType, setPrinterType] = useState("Thermal Printer 80mm");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Print Receipt State
  const [printData, setPrintData] = useState<any>(null);

  const activeBillIndex = bills.findIndex(b => b.id === activeBillId);
  const activeBill = bills[activeBillIndex] || bills[0];

  // Fetch Initial Data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          // Fetch Banks
          const bq = query(collection(db, "bankAccounts"), where("userId", "==", u.uid));
          const bsnap = await getDocs(bq);
          setBankAccounts(bsnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Fetch Products
          let pList: any[] = [];
          const pq = query(collection(db, "products"), where("userId", "==", u.uid));
          let psnap;
          if (!navigator.onLine) {
             psnap = await getDocsFromCache(pq);
          } else {
             psnap = await getDocs(pq);
          }
          pList = psnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setProducts(pList);

          // Fetch Customers
          let cList: any[] = [];
          const cq = query(collection(db, "customers"), where("userId", "==", u.uid));
          let csnap;
          if (!navigator.onLine) {
             csnap = await getDocsFromCache(cq);
          } else {
             csnap = await getDocs(cq);
          }
          cList = csnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCustomers(cList);

        } catch (err) {
          console.error("Data fetch error", err);
        } finally {
          setLoading(false);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

  // Update Bill Helper
  const updateActiveBill = (updates: Partial<PosBill>) => {
    const idx = bills.findIndex(b => b.id === activeBillId);
    if (idx === -1) return;
    const newBills = [...bills];
    newBills[idx] = { ...bills[idx], ...updates };
    setBills(newBills);
  };

  // Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const res = products.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) || 
      (p.itemCode && p.itemCode.toLowerCase().includes(q)) || 
      (p.barcode && p.barcode.toLowerCase().includes(q))
    ).slice(0, 10);
    setSearchResults(res);
    setShowResults(true);
  }, [searchQuery, products]);

  const handleAddItem = (prod: any) => {
    const newItems = [...activeBill.items];
    const existingIdx = newItems.findIndex(i => i.productId === prod.id);
    
    if (existingIdx > -1) {
      newItems[existingIdx].qty = (Number(newItems[existingIdx].qty) || 0) + 1;
    } else {
      newItems.push({
        id: uuidv4(),
        productId: prod.id,
        name: prod.name,
        barcode: prod.barcode || "",
        itemCode: prod.itemCode || "",
        qty: 1,
        price: Number(prod.price || 0),
        gstRate: Number(prod.gst || 0),
        stock: Number(prod.stock || 0)
      });
    }
    updateActiveBill({ items: newItems });
    setSearchQuery("");
    setShowResults(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const updateItemQty = (itemId: string, qtyStr: string | number) => {
    const sanitized = sanitizeNumericInput(qtyStr);
    const qty: number | "" = sanitized === "" ? "" : Number(sanitized);
    const newItems = activeBill.items.map(i => i.id === itemId ? { ...i, qty } : i);
    updateActiveBill({ items: newItems });
  };

  const deleteItem = (itemId: string) => {
    updateActiveBill({ items: activeBill.items.filter(i => i.id !== itemId) });
  };

  // Calculations
  const calcItems = activeBill.items.map(i => ({ name: i.name, qty: Number(i.qty) || 0, price: i.price, gstRate: i.gstRate }));
  const calc = calculateInvoice(calcItems, activeBill.discountType, Number(activeBill.discountValue) || 0, true, false);
  
  const rawTotal = calc.total + (Number(activeBill.additionalChargeValue) || 0);
  const roundedTotal = Math.round(rawTotal);
  const finalTotal = autoRoundOff ? roundedTotal : rawTotal;

  // Sync Received Amount
  useEffect(() => {
    if (autoFullyPaid && activeBill.amountReceived === "") {
       updateActiveBill({ amountReceived: finalTotal });
    }
  }, [finalTotal, autoFullyPaid, activeBill.amountReceived]);

  const handleCreateNewBill = () => {
    const newId = uuidv4();
    setBills([...bills, {
      id: newId,
      title: `Billing Screen ${bills.length + 1}`,
      items: [],
      discountType: "percent",
      discountValue: "",
      additionalChargeName: "Delivery",
      additionalChargeValue: "",
      amountReceived: "",
      paymentMode: "Cash",
      customerName: "",
      customerPhone: "",
      isFullyPaid: autoFullyPaid,
    }]);
    setActiveBillId(newId);
  };

  const closeBill = (id: string) => {
    if (bills.length === 1) return toast.error("Cannot close the last billing screen");
    const newBills = bills.filter(b => b.id !== id);
    setBills(newBills);
    if (activeBillId === id) setActiveBillId(newBills[0].id);
  };

  const handleSaveBill = async (shouldPrint: boolean) => {
    if (activeBill.items.length === 0) return toast.error("Please add items to the bill");
    if (!user) return toast.error("User not authenticated");
    
    if (calc.discountAmount > calc.subtotal) {
      return toast.error("Discount cannot exceed the subtotal.");
    }
    
    if (finalTotal < 0) {
      return toast.error("Total amount cannot be negative.");
    }
    for (const item of activeBill.items) {
      if (item.productId) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const stock = Number(prod.stock || 0);
          const itemQty = Number(item.qty) || 0;
          if (itemQty > stock) {
            return toast.error(`Insufficient stock for ${item.name}. Available: ${stock}`);
          }
        }
      }
    }

    setSaving(true);
    try {
      let isOfflineMode = !navigator.onLine;
      if (!isOfflineMode) {
        try {
          const test = await fetch("/favicon.ico?cache=" + new Date().getTime(), { method: "HEAD", cache: "no-store" });
          if (!test.ok) isOfflineMode = true;
        } catch {
          isOfflineMode = true;
        }
      }

      const invoiceNumber = "POS-" + Math.floor(100000 + Math.random() * 900000);
      const invoiceDate = new Date().toISOString().split('T')[0];
      const customer = activeBill.customerName.trim() ? activeBill.customerName : "Cash Sale";

      const amtReceivedNum = Number(activeBill.amountReceived) || 0;

      const invoiceData = {
        userId: user.uid,
        invoiceNumber,
        date: invoiceDate,
        customerName: customer,
        customerPhone: activeBill.customerPhone,
        total: finalTotal,
        subtotal: calc.subtotal,
        discountType: activeBill.discountType,
        discountValue: Number(activeBill.discountValue) || 0,
        discountAmount: calc.discountAmount,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: 0,
        gstEnabled: true,
        items: activeBill.items,
        invoiceType: "pos",
        status: amtReceivedNum >= finalTotal ? "paid" : "pending",
        amountReceived: amtReceivedNum,
        paymentMode: activeBill.paymentMode,
        additionalChargeName: activeBill.additionalChargeName,
        additionalChargeValue: Number(activeBill.additionalChargeValue) || 0,
        autoRoundOff,
        roundOffAmount: autoRoundOff ? (roundedTotal - rawTotal) : 0,
        createdAt: new Date()
      };

      if (isOfflineMode) {
        // --- OFFLINE WORKSPACE SAVING ---
        const { saveOfflineInvoice } = await import("@/lib/offlineInvoices");
        const { getCachedProducts, cacheProducts } = await import("@/lib/indexedDB");

        const cachedProducts = await getCachedProducts();
        for (const item of activeBill.items) {
          if (item.productId) {
             const idx = cachedProducts.findIndex(p => p.id === item.productId);
             if (idx > -1) {
                const stock = cachedProducts[idx].stock || 0;
                const qtyNum = Number(item.qty) || 0;
                cachedProducts[idx].stock = stock - qtyNum;
             }
          }
        }
        await cacheProducts(cachedProducts);

        await saveOfflineInvoice(invoiceData as any);
        toast.success("POS Bill saved offline draft ✅");

      } else {
        // --- ONLINE SAVING ---
        // Handle Stock deduction (offline safe using increment)
        for (const item of activeBill.items) {
            if (item.productId) {
              const ref = doc(db, "products", item.productId);
              const qtyNum = Number(item.qty) || 0;
              if (qtyNum > 0) {
                await updateDoc(ref, { stock: increment(-qtyNum) }).catch(() => {});
              }
            }
        }

        // Save Invoice
        await addDoc(collection(db, "invoices"), invoiceData);

        // Ledger sync (offline safe using increment)
        if (amtReceivedNum > 0) {
          const isCash = activeBill.paymentMode === "Cash";
          let newBalance = amtReceivedNum;
          if (isCash) {
             const sRef = doc(db, "settings", user.uid);
             await updateDoc(sRef, { cashInHand: increment(amtReceivedNum) }).catch(() => {});
             // For offline transactions, balanceAfter is approximate without a blocking fetch
          } else {
             const bRef = doc(db, "bankAccounts", activeBill.paymentMode);
             await updateDoc(bRef, { balance: increment(amtReceivedNum) }).catch(() => {});
             const b = bankAccounts.find(x => x.id === activeBill.paymentMode);
             newBalance = (b ? Number(b.balance || 0) : 0) + amtReceivedNum;
          }

          await addDoc(collection(db, "cashBankTransactions"), {
            userId: user.uid,
            accountId: isCash ? "cash" : activeBill.paymentMode,
            type: "Sales Invoice",
            txnNo: invoiceNumber,
            date: invoiceDate,
            party: customer,
            mode: isCash ? "Cash" : "Bank",
            paid: 0,
            received: amtReceivedNum,
            balanceAfter: newBalance,
            remarks: `Received against POS Bill #${invoiceNumber}`,
            createdAt: new Date()
          });
        }

        toast.success("Bill Saved Successfully");
      }

      if (shouldPrint) {
        setPrintData({
          ...invoiceData,
          paymentModeName: activeBill.paymentMode === "Cash" ? "Cash" : bankAccounts.find(b => b.id === activeBill.paymentMode)?.name || "Bank"
        });
        setTimeout(() => window.print(), 500);
      } else {
        // Reset Bill
        const newId = uuidv4();
        const newBills = [...bills];
        newBills[activeBillIndex] = {
          id: newId,
          title: activeBill.title,
          items: [],
          discountType: "percent",
          discountValue: 0,
          additionalChargeName: "Delivery",
          additionalChargeValue: 0,
          amountReceived: "",
          paymentMode: "Cash",
          customerName: "",
          customerPhone: "",
          isFullyPaid: autoFullyPaid,
        };
        setBills(newBills);
        setActiveBillId(newId);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  // Keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside input unless explicitly F keys
      const activeEl = document.activeElement?.tagName;
      const isInput = activeEl === 'INPUT' || activeEl === 'TEXTAREA' || activeEl === 'SELECT';

      if (e.key === "Escape") {
         if (showDiscountModal) setShowDiscountModal(false);
         else if (showChargeModal) setShowChargeModal(false);
         else if (showCustomerModal) setShowCustomerModal(false);
         else if (showSettingsModal) setShowSettingsModal(false);
         else if (showResults) setShowResults(false);
         else router.push("/dashboard");
      }
      else if (e.key === "F1") { e.preventDefault(); searchInputRef.current?.focus(); }
      else if (e.key === "F2") { e.preventDefault(); setShowDiscountModal(true); }
      else if (e.key === "F3") { e.preventDefault(); setShowChargeModal(true); }
      else if (e.key === "F4") { e.preventDefault(); document.getElementById('receivedAmt')?.focus(); }
      else if (e.key === "F5") { e.preventDefault(); setShowCustomerModal(true); }
      else if (e.key === "F6") { e.preventDefault(); handleSaveBill(true); }
      else if (e.key === "F7") { e.preventDefault(); handleSaveBill(false); }
      else if (e.ctrlKey && e.key === "n") { e.preventDefault(); handleCreateNewBill(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDiscountModal, showChargeModal, showCustomerModal, showSettingsModal, showResults, bills, activeBillId, finalTotal]);

  if (loading) return null;

  return (
    <>
      <div className="h-[calc(100vh-60px)] bg-white flex flex-col font-sans overflow-hidden print:hidden">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shadow-sm z-10 relative">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            <ChevronLeft size={14} /> Exit POS <span className="text-gray-400 font-normal ml-1">[ESC]</span>
          </button>
          <div className="text-sm font-bold text-gray-700 uppercase tracking-wider absolute left-1/2 -translate-x-1/2">POS Billing</div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 text-[11px] font-bold text-blue-600 border border-blue-200 bg-blue-50/50 px-3 py-1 rounded hover:bg-blue-100 transition-colors">
              <PlayCircle size={12} /> Watch how to use POS Billing
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="flex items-center gap-1 text-[11px] font-bold text-gray-600 border border-gray-200 px-3 py-1 rounded hover:bg-gray-50 transition-colors">
              Settings <span className="text-gray-400 font-normal ml-1">[CTRL + S]</span>
            </button>
          </div>
        </div>

        {/* TABS HEADER */}
        <div className="flex items-center px-4 pt-2 border-b border-gray-200 bg-gray-50/50 overflow-x-auto no-scrollbar">
          {bills.map((b, idx) => (
            <div 
              key={b.id} 
              onClick={() => setActiveBillId(b.id)}
              className={`flex items-center gap-2 border border-b-0 rounded-t-lg px-4 py-2 cursor-pointer transition-colors ${activeBillId === b.id ? 'bg-yellow-50 border-yellow-200 text-gray-800' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <span className="text-xs font-bold">{b.title} <span className="opacity-50 font-normal ml-1">[CTRL + {idx + 1}]</span></span>
              {bills.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); closeBill(b.id); }} className="text-gray-400 hover:text-red-500 ml-2"><X size={14} /></button>
              )}
            </div>
          ))}
          <button onClick={handleCreateNewBill} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 px-4 py-2 hover:bg-indigo-50 rounded-t-lg transition-colors ml-2 border border-transparent hover:border-indigo-100 border-b-0">
            <Plus size={12} /> Hold Bill & Create Another <span className="text-indigo-400 font-normal ml-1">[CTRL + N]</span>
          </button>
        </div>

        {/* MAIN POS WORKSPACE */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT COLUMN - ITEM ENTRY */}
          <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
            
            {/* Action Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-white">
              <button onClick={() => searchInputRef.current?.focus()} className="flex items-center gap-1 text-[10px] font-bold text-gray-700 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
                <Plus size={10} /> New Item <span className="text-gray-400 ml-1">[CTRL + I]</span>
              </button>
              <button className="flex items-center gap-1 text-[10px] font-bold text-gray-700 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
                Change Price <span className="text-gray-400 ml-1">[P]</span>
              </button>
              <button className="flex items-center gap-1 text-[10px] font-bold text-gray-700 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
                Change QTY <span className="text-gray-400 ml-1">[Q]</span>
              </button>
              <button onClick={() => updateActiveBill({ items: [] })} className="flex items-center gap-1 text-[10px] font-bold text-red-600 border border-red-200 bg-red-50/50 px-2 py-1 rounded hover:bg-red-100 ml-auto transition-colors">
                Delete All Items <span className="text-red-400 ml-1">[DEL]</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200 flex items-stretch bg-white relative">
              <div className="flex items-center gap-1 px-3 border border-r-0 border-yellow-300 rounded-l bg-yellow-50 text-[11px] font-bold text-gray-600">
                <Search size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 relative">
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Item Name/Item Code or Scan Barcode"
                  className="w-full border border-yellow-300 rounded-r py-2.5 pl-3 pr-10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-yellow-50/30"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-400 px-1.5 py-0.5 rounded">
                  [F1]
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mx-3 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 max-h-60 overflow-y-auto">
                  {searchResults.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleAddItem(p)}
                      className="px-4 py-2 hover:bg-indigo-50 border-b border-gray-100 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-800">{p.name}</p>
                        <p className="text-[10px] text-gray-500">Code: {p.itemCode || "-"} | Stock: <span className={p.stock > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{p.stock}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-indigo-600">₹{p.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table Header */}
            <div className="flex border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase bg-white">
              <div className="w-12 px-3 py-2 border-r border-gray-200 text-center">NO</div>
              <div className="flex-1 px-3 py-2 border-r border-gray-200">ITEMS</div>
              <div className="w-32 px-3 py-2 border-r border-gray-200">ITEM CODE</div>
              <div className="w-28 px-3 py-2 border-r border-gray-200 text-right">SP (₹)</div>
              <div className="w-28 px-3 py-2 border-r border-gray-200 text-center">QUANTITY</div>
              <div className="w-32 px-3 py-2 text-right border-r border-gray-200">AMOUNT (₹)</div>
              <div className="w-10 px-3 py-2 text-center"></div>
            </div>

            {/* Table Body */}
            {activeBill.items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/30">
                <PackageOpen size={48} className="text-gray-300 stroke-[1.5] mb-4" />
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Search size={16} /> Add items by searching item name or item code
                  </p>
                  <p className="text-xs">Or</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Maximize size={16} /> Simply scan barcode to add items
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {activeBill.items.map((item, idx) => (
                  <div key={item.id} className="flex border-b border-gray-100 text-xs text-gray-700 bg-white hover:bg-gray-50/50">
                    <div className="w-12 px-3 py-3 border-r border-gray-100 text-center font-medium">{idx + 1}</div>
                    <div className="flex-1 px-3 py-3 border-r border-gray-100 font-bold text-gray-800">{item.name}</div>
                    <div className="w-32 px-3 py-3 border-r border-gray-100 text-gray-500">{item.itemCode || "-"}</div>
                    <div className="w-28 px-3 py-3 border-r border-gray-100 text-right font-mono">₹{item.price}</div>
                    <div className="w-28 px-2 py-2 border-r border-gray-100 text-center flex items-center justify-center">
                      <input 
                        type="number" 
                        value={item.qty === "" ? "" : item.qty}
                        onChange={(e) => updateItemQty(item.id, e.target.value)}
                        className="w-16 text-center border border-gray-200 rounded py-1 focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div className="w-32 px-3 py-3 text-right border-r border-gray-100 font-bold text-gray-800 font-mono">₹{(item.price * (Number(item.qty) || 0)).toFixed(2)}</div>
                    <div className="w-10 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer" onClick={() => deleteItem(item.id)}>
                      <Trash2 size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Scroll hint at bottom */}
            <div className="text-center py-1 text-[10px] text-gray-400 bg-gray-50 border-t border-gray-200">
              Use UP and DOWN arrow keys to scroll through different items
            </div>
          </div>

          {/* RIGHT COLUMN - BILLING DETAILS */}
          <div className="w-[380px] flex flex-col bg-gray-50/30 shrink-0 border-l border-gray-200 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Top Action Inputs */}
              <div className="flex gap-2">
                 <button onClick={() => setShowDiscountModal(true)} className="flex-1 border border-gray-200 bg-white rounded flex justify-between items-center px-3 py-2 text-xs text-gray-500 hover:border-indigo-300 transition-colors">
                   <span className="font-semibold text-gray-600">Add Discount</span>
                   <span className="text-[10px] font-bold text-gray-300">[F2]</span>
                 </button>
                 <button onClick={() => setShowChargeModal(true)} className="flex-1 border border-gray-200 bg-white rounded flex justify-between items-center px-3 py-2 text-xs text-gray-500 hover:border-indigo-300 transition-colors">
                   <span className="font-semibold text-gray-600">Add Additional Charge</span>
                   <span className="text-[10px] font-bold text-gray-300">[F3]</span>
                 </button>
              </div>

              {/* Bill Details Card */}
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                 <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/80">
                   <span className="text-xs font-bold text-gray-500 tracking-wide">Bill details</span>
                 </div>
                 <div className="p-4 space-y-3">
                   <div className="flex justify-between text-sm font-semibold text-gray-500">
                     <span>Sub Total</span>
                     <span className="font-mono text-gray-700">₹ {calc.subtotal.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between text-sm font-semibold text-gray-500">
                     <span>Tax</span>
                     <span className="font-mono text-gray-700">₹ {(calc.cgst + calc.sgst + calc.igst).toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
                   </div>
                   {Number(activeBill.additionalChargeValue) > 0 && (
                     <div className="flex justify-between text-sm font-semibold text-gray-500">
                       <span>{activeBill.additionalChargeName || "Delivery"}</span>
                       <span className="font-mono text-gray-700">₹ {Number(activeBill.additionalChargeValue).toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
                     </div>
                   )}
                   {calc.discountAmount > 0 && (
                     <div className="flex justify-between text-sm font-semibold text-gray-500">
                       <span>Discount</span>
                       <span className="font-mono text-gray-700">- ₹ {calc.discountAmount.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
                     </div>
                   )}
                 </div>
                 <div className="bg-emerald-50/70 px-4 py-4 border-t border-emerald-100 flex justify-between items-center">
                   <span className="text-base font-black text-emerald-800">Total Amount</span>
                   <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">₹ {finalTotal.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
                 </div>
              </div>

              {/* Received Amount Block */}
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                 <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                   <span className="text-xs font-bold text-gray-500 tracking-wide">Received Amount</span>
                   <span className="text-[10px] font-bold text-gray-400">[F4]</span>
                 </div>
                 <div className="p-3">
                   <div className="flex border border-gray-200 rounded overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
                     <div className="flex-1 flex items-center px-3 border-r border-gray-200 bg-white">
                       <span className="text-gray-400 font-bold mr-2 text-lg">₹</span>
                       <input 
                         id="receivedAmt"
                         type="number" 
                         value={activeBill.amountReceived}
                         onChange={(e) => {
                           const val = sanitizeNumericInput(e.target.value);
                           updateActiveBill({ amountReceived: val === "" ? "" : Number(val) });
                         }}
                         placeholder="0" 
                         className="w-full bg-transparent text-lg font-bold text-gray-800 focus:outline-none" 
                       />
                     </div>
                     <div className="w-28 flex items-center bg-white cursor-pointer hover:bg-gray-50">
                        <select 
                          value={activeBill.paymentMode}
                          onChange={(e) => updateActiveBill({ paymentMode: e.target.value })}
                          className="w-full h-full text-xs font-bold text-gray-600 focus:outline-none cursor-pointer bg-transparent px-2"
                        >
                          <option value="Cash">Cash</option>
                          {bankAccounts.filter(b => b.status !== "inactive").map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                     </div>
                   </div>
                 </div>
              </div>

              {/* Customer Details Block */}
              {hideCustomerInfo ? null : (
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                   <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                     <span className="text-xs font-bold text-gray-500 tracking-wide">Customer Details</span>
                     <span className="text-[10px] font-bold text-gray-400">[F5]</span>
                   </div>
                   <div onClick={() => setShowCustomerModal(true)} className="px-4 py-3 flex justify-between items-center group cursor-pointer hover:bg-gray-50 transition-colors">
                     <span className="text-sm font-bold text-gray-800">{activeBill.customerName || "Cash Sale"}</span>
                     <Edit3 size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                   </div>
                </div>
              )}

            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200 bg-white flex gap-3 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] z-10">
              <button 
                onClick={() => handleSaveBill(true)}
                disabled={saving || activeBill.items.length === 0}
                className="flex-1 border-2 border-indigo-200 text-indigo-700 font-bold text-sm py-3.5 rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                Save & Print <span className="text-[10px] font-bold opacity-60 ml-1">[F6]</span>
              </button>
              <button 
                onClick={() => handleSaveBill(false)}
                disabled={saving || activeBill.items.length === 0}
                className="flex-[1.2] bg-indigo-600 text-white font-bold text-sm py-3.5 rounded hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                Save Bill <span className="text-[10px] font-bold opacity-70 ml-1 text-indigo-200">[F7]</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* --- MODALS --- */}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-lg shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Add Discount</h2>
              <button onClick={() => setShowDiscountModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Percentage</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                  <input 
                    type="number" 
                    value={activeBill.discountType === "percent" ? activeBill.discountValue : ""}
                    onChange={(e) => {
                      const val = sanitizeNumericInput(e.target.value);
                      updateActiveBill({ discountType: "percent", discountValue: val === "" ? "" : Number(val) });
                    }}
                    className="w-full border border-yellow-300 bg-yellow-50/30 rounded py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 font-bold" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    value={activeBill.discountType === "flat" ? activeBill.discountValue : ""}
                    onChange={(e) => {
                      const val = sanitizeNumericInput(e.target.value);
                      updateActiveBill({ discountType: "flat", discountValue: val === "" ? "" : Number(val) });
                    }}
                    className="w-full border border-gray-200 rounded py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-indigo-500 font-bold" 
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 space-y-2">
              <button onClick={() => setShowDiscountModal(false)} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded hover:bg-indigo-700 transition">Save [F7]</button>
              <button onClick={() => setShowDiscountModal(false)} className="w-full border border-gray-200 text-gray-600 font-bold py-2.5 rounded hover:bg-gray-50 transition">Cancel [ESC]</button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-lg shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Add Additional Charge</h2>
              <button onClick={() => setShowChargeModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={activeBill.additionalChargeName}
                  onChange={(e) => updateActiveBill({ additionalChargeName: e.target.value })}
                  placeholder="Delivery"
                  className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold text-gray-700" 
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    value={activeBill.additionalChargeValue}
                    onChange={(e) => {
                      const val = sanitizeNumericInput(e.target.value);
                      updateActiveBill({ additionalChargeValue: val === "" ? "" : Number(val) });
                    }}
                    className="w-full border border-yellow-300 bg-yellow-50/30 rounded py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 font-bold" 
                  />
                </div>
              </div>
              <button className="text-indigo-600 font-bold text-xs hover:underline">+ Add Additional Charge</button>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 space-y-2">
              <button onClick={() => setShowChargeModal(false)} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded hover:bg-indigo-700 transition">Save [F7]</button>
              <button onClick={() => setShowChargeModal(false)} className="w-full border border-gray-200 text-gray-600 font-bold py-2.5 rounded hover:bg-gray-50 transition">Cancel [ESC]</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-lg shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Customer Details</h2>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Mobile</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={14}/></span>
                  <input 
                    type="text" 
                    value={activeBill.customerPhone}
                    onChange={(e) => updateActiveBill({ customerPhone: e.target.value })}
                    placeholder="Search by Mobile"
                    className="w-full border border-gray-200 rounded py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-indigo-500 font-semibold" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Customer Name</label>
                <input 
                  type="text" 
                  value={activeBill.customerName}
                  onChange={(e) => updateActiveBill({ customerName: e.target.value })}
                  placeholder="Enter Customer Name"
                  className="w-full border border-yellow-300 bg-yellow-50/30 rounded py-2 px-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 font-bold" 
                />
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-500">Cash Sale will be default if you don't enter customer details</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 space-y-2">
              <button onClick={() => setShowCustomerModal(false)} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded hover:bg-indigo-700 transition">Save [F7]</button>
              <button onClick={() => setShowCustomerModal(false)} className="w-full border border-gray-200 text-gray-600 font-bold py-2.5 rounded hover:bg-gray-50 transition">Cancel [ESC]</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-lg shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Counter POS Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-800">Hide Customer Information field</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Bills will be saved to Cash Sale Party by default</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={hideCustomerInfo} onChange={() => setHideCustomerInfo(!hideCustomerInfo)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex justify-between items-start border-t border-gray-100 pt-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">Fully Paid Bills</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">All Bills will be marked as fully paid</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={autoFullyPaid} onChange={() => setAutoFullyPaid(!autoFullyPaid)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex justify-between items-start border-t border-gray-100 pt-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">Round Off</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Automatically add roundoff value to bill</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={autoRoundOff} onChange={() => setAutoRoundOff(!autoRoundOff)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Printer Type</p>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Select your printer type</p>
                  </div>
                  <select 
                    value={printerType}
                    onChange={(e) => setPrinterType(e.target.value)}
                    className="border border-gray-200 rounded px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="A4 Printer">A4 Printer</option>
                    <option value="Thermal Printer 80mm">Thermal 80mm</option>
                    <option value="Thermal Printer 58mm">Thermal 58mm</option>
                  </select>
                </div>
              </div>

            </div>
            <div className="px-6 py-4 border-t border-gray-100 space-y-2">
              <button onClick={() => setShowSettingsModal(false)} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded hover:bg-indigo-700 transition">Save [F7]</button>
              <button onClick={() => setShowSettingsModal(false)} className="w-full border border-gray-200 text-gray-600 font-bold py-2.5 rounded hover:bg-gray-50 transition">Cancel [ESC]</button>
            </div>
          </div>
        </div>
      )}


      {/* THERMAL PRINT RECEIPT TEMPLATE (Hidden in UI, only shows on print) */}
      {printData && (
        <div id="pos-receipt" className="hidden print:block font-mono text-black w-full" style={{ maxWidth: '80mm', margin: '0 auto', fontSize: '12px' }}>
          <div className="text-center mb-4 border-b border-dashed border-black pb-4">
            <h1 className="text-xl font-black uppercase mb-1">Company Name</h1>
            <p className="text-xs font-semibold">Store Address Line 1</p>
            <p className="text-xs font-semibold">City, State - PIN</p>
            <p className="text-xs font-semibold mt-1">Ph: +91 XXXXXXXXXX</p>
            <p className="text-xs font-semibold">GSTIN: XXXXXXXXXXXXXXX</p>
          </div>
          
          <div className="mb-4 text-xs">
            <div className="flex justify-between">
              <span>Date: {new Date(printData.createdAt).toLocaleDateString()}</span>
              <span>Time: {new Date(printData.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Bill No: {printData.invoiceNumber}</span>
              <span>Mode: {printData.paymentModeName}</span>
            </div>
            <div className="mt-1">
              <span>Customer: {printData.customerName}</span>
            </div>
          </div>

          <div className="border-t border-b border-dashed border-black py-2 mb-2">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1 w-[40%]">Item</th>
                  <th className="py-1 text-center w-[20%]">Qty</th>
                  <th className="py-1 text-right w-[20%]">Rate</th>
                  <th className="py-1 text-right w-[20%]">Amt</th>
                </tr>
              </thead>
              <tbody>
                {printData.items.map((it: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200/50">
                    <td className="py-1 truncate pr-1">{it.name}</td>
                    <td className="py-1 text-center">{it.qty}</td>
                    <td className="py-1 text-right">{it.price}</td>
                    <td className="py-1 text-right">{(it.qty * it.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-semibold">
              <span>Sub Total:</span>
              <span>₹{printData.subtotal.toFixed(2)}</span>
            </div>
            {printData.cgst > 0 && (
              <div className="flex justify-between">
                <span>CGST:</span>
                <span>₹{printData.cgst.toFixed(2)}</span>
              </div>
            )}
            {printData.sgst > 0 && (
              <div className="flex justify-between">
                <span>SGST:</span>
                <span>₹{printData.sgst.toFixed(2)}</span>
              </div>
            )}
            {printData.discountAmount > 0 && (
              <div className="flex justify-between text-black">
                <span>Discount:</span>
                <span>-₹{printData.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {printData.additionalChargeValue > 0 && (
              <div className="flex justify-between">
                <span>{printData.additionalChargeName || "Addl. Charge"}:</span>
                <span>₹{printData.additionalChargeValue.toFixed(2)}</span>
              </div>
            )}
            {printData.roundOffAmount !== 0 && (
              <div className="flex justify-between">
                <span>Round Off:</span>
                <span>₹{printData.roundOffAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-base font-black border-t border-dashed border-black pt-2 mt-2">
              <span>GRAND TOTAL:</span>
              <span>₹{printData.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 text-center border-t border-dashed border-black pt-4">
            <p className="text-sm font-bold">THANK YOU</p>
            <p className="text-xs">Please visit again</p>
          </div>
          
        </div>
      )}
    </>
  );
}
