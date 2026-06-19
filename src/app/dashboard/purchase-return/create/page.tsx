"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2, ScanBarcode, Plus, Trash2, Landmark, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

import { sanitizeNumericInput , capItemDiscountUI, capGlobalDiscountUI } from "@/lib/sanitize";
import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";
import { syncInventory } from "@/lib/inventorySync";
import { v4 as uuidv4 } from "uuid";

import dynamic from "next/dynamic";
const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), { ssr: false });

type Item = {
  unit?: string;
  productId?: string;
  name: string;
  qty: number | "";
  price: number | "";
  gstRate?: number;
  hsn?: string;
  description?: string;
};

type Customer = {
  id: string;
  name: string;
  gstin?: string;
  phone?: string;
  address?: string;
  state?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  gst?: number;
  hsnCode?: string;
  stock?: number;
  unit?: string;
};

export default function CreateCreditNote() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string }[]>([]);
  
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, price: 0, gstRate: 18, description: "" }]);
  const [discountType, setDiscountType] = useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState<number | string>(0);
  const [gstEnabled, setGstEnabled] = useState(true);
  // Save-to-inventory state (additive — no effect on existing flows)
  const [savedToInventoryRows, setSavedToInventoryRows] = useState<Record<number, boolean>>({});
  const [savingToInventoryRow, setSavingToInventoryRow] = useState<Record<number, boolean>>({});
  
  const [purchaseReturnNumber, setCreditNoteNumber] = useState("");
  const [purchaseReturnDate, setCreditNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [linkedInvoiceNumber, setLinkedInvoiceNumber] = useState("");
  
  const [amountReceived, setAmountReceived] = useState<number | string>(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showBankModal, setShowBankModal] = useState(false);
  const [newBank, setNewBank] = useState({
    name: "",
    balance: "",
    asOfDate: new Date().toISOString().split("T")[0],
    accountNumber: "",
    reAccountNumber: "",
    ifsc: "",
    bankName: "",
    branchName: "",
    upiId: "",
    addDetails: false,
  });
  const [addingBank, setAddingBank] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [companyState, setCompanyState] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [additionalChargeName, setAdditionalChargeName] = useState("Transport Charges");
  const [additionalChargeValue, setAdditionalChargeValue] = useState<number | string>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [autoRoundOff, setAutoRoundOff] = useState(true);

  const [signatureType, setSignatureType] = useState<"upload" | "empty" | "">("");
  const [signatureImage, setSignatureImage] = useState("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const cq = query(collection(db, "customers"), where("userId", "==", user.uid));
        const csnap = await getDocs(cq);
        setCustomers(csnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));

        const pq = query(collection(db, "products"), where("userId", "==", user.uid));
        const psnap = await getDocs(pq);
        setProducts(psnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

        const iq = query(collection(db, "purchases"), where("userId", "==", user.uid));
        const isnap = await getDocs(iq);
        setInvoices(isnap.docs.map(d => ({ id: d.id, invoiceNumber: d.data().purchaseInvoiceNumber || "" })));

        const cnq = query(collection(db, "purchaseReturns"), where("userId", "==", user.uid));
        const cnsnap = await getDocs(cnq);
        setCreditNoteNumber((cnsnap.size + 1).toString());

        const settingsSnap = await getDoc(doc(db, "settings", user.uid));
        if (settingsSnap.exists()) {
          setCompanyState((settingsSnap.data().state || "").trim());
        }

        const bq = query(collection(db, "bankAccounts"), where("userId", "==", user.uid));
        const bsnap = await getDocs(bq);
        const bList = bsnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
        setBankAccounts(bList);
        if (bList.length > 0) {
          const activeBank = bList.find(b => b.status !== "inactive") || bList[0];
          setSelectedBankId(activeBank.id);
        }

      } catch (err) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) fetchData();
      else setLoading(false);
    });
    return () => unsub();
  }, []);

  // Sync selectedBankId when payment mode is changed to a bank option
  useEffect(() => {
    if (paymentMode !== "Cash" && !selectedBankId && bankAccounts.length > 0) {
      const activeBank = bankAccounts.find(b => b.status !== "inactive") || bankAccounts[0];
      setSelectedBankId(activeBank.id);
    }
  }, [paymentMode, bankAccounts, selectedBankId]);

  const handleSaveBank = async () => {
    if (!newBank.name.trim()) return toast.error("Account Name is required");
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      setAddingBank(true);
      const bankId = uuidv4();
      const bankData = {
        userId: user.uid,
        name: newBank.name.trim(),
        balance: Number(newBank.balance) || 0,
        asOfDate: newBank.asOfDate,
        accountNumber: newBank.addDetails ? newBank.accountNumber.trim() : "",
        ifsc: newBank.addDetails ? newBank.ifsc.trim().toUpperCase() : "",
        bankName: newBank.addDetails ? newBank.bankName.trim() : "",
        branchName: newBank.addDetails ? newBank.branchName.trim() : "",
        upiId: newBank.upiId.trim(),
        status: "active",
        createdAt: new Date(),
      };

      await setDoc(doc(db, "bankAccounts", bankId), bankData);
      setBankAccounts([...bankAccounts, { id: bankId, ...bankData }]);
      setSelectedBankId(bankId);
      setShowBankModal(false);
      setNewBank({
        name: "",
        balance: "",
        asOfDate: new Date().toISOString().split("T")[0],
        accountNumber: "",
        reAccountNumber: "",
        ifsc: "",
        bankName: "",
        branchName: "",
        upiId: "",
        addDetails: false,
      });
      toast.success("Bank Account added successfully! 🏦");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add bank account");
    } finally {
      setAddingBank(false);
    }
  };

  const validItems = items.filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0).map((i) => {
      const prod = products.find(p => p.id === i.productId);
      const sanitized = { ...i, qty: Number(i.qty), price: Number(i.price),
        unit: (i as any).unit || prod?.unit || "PCS",
      };
    if (sanitized.productId === "CUSTOM") delete sanitized.productId;
    return sanitized;
  });
  const selectedCustomer = customers.find((c) => c.name === customerName);
  
  const customerStateSanitized = (selectedCustomer?.state || "").trim().toUpperCase();
  const companyStateSanitized = companyState.trim().toUpperCase();
  const isInterstate = !!customerStateSanitized && !!companyStateSanitized && customerStateSanitized !== companyStateSanitized;

  const calc = calculateInvoice(validItems, discountType, Number(discountValue), gstEnabled, isInterstate);
  const rawTotal = calc.total + Number(additionalChargeValue || 0);
  const roundedTotal = Math.round(rawTotal);
  const roundOffAmount = roundedTotal - rawTotal;
  const finalTotal = autoRoundOff ? roundedTotal : rawTotal;

  const handleMarkFullyPaid = (checked: boolean) => {
    setAmountReceived(checked ? finalTotal.toFixed(2) : 0);
  };

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: field === "name" || field === "hsn" || field === "description" ? value : sanitizeNumericInput(String(value)) };
    updated[index] = capItemDiscountUI(updated[index]);
    setItems(updated);
  };

  const addItem = () => setItems([...items, { name: "", qty: 1, price: 0, gstRate: 18 }]);
  const removeItem = (index: number) => items.length > 1 ? setItems(items.filter((_, i) => i !== index)) : setItems([{ name: "", qty: 1, price: 0, gstRate: 18 }]);

  // Save a CUSTOM item row to inventory — additive only, never alters the transaction
  const handleSaveToInventory = async (idx: number) => {
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");
    const item = items[idx];
    const trimmedName = (item.name || "").trim();
    if (!trimmedName) return toast.error("Enter an item name first");
    setSavingToInventoryRow((prev) => ({ ...prev, [idx]: true }));
    try {
      let isOfflineMode = !navigator.onLine;
      if (!isOfflineMode) {
        try {
          const t = await fetch("/favicon.ico?cache=" + Date.now(), { method: "HEAD", cache: "no-store" });
          if (!t.ok) isOfflineMode = true;
        } catch { isOfflineMode = true; }
      }
      if (isOfflineMode) {
        const { saveCustomItemToInventoryOffline } = await import("@/lib/saveToInventory");
        const result = await saveCustomItemToInventoryOffline(
          { name: item.name, price: item.price, gstRate: item.gstRate, hsn: (item as any).hsn, description: item.description },
          user.uid, products, user.displayName || "Admin"
        );
        if (!result.success) return toast.error((result as any).error);
        toast.success(`'${trimmedName}' queued for inventory. 🔄`);
      } else {
        const { saveCustomItemToInventory } = await import("@/lib/saveToInventory");
        const result = await saveCustomItemToInventory(
          { name: item.name, price: item.price, gstRate: item.gstRate, hsn: (item as any).hsn, description: item.description },
          user.uid, products, user.displayName || "Admin"
        );
        if (!result.success) return toast.error((result as any).error);
        const newProduct = { id: (result as any).productId, name: trimmedName, price: Number(item.price) || 0, gst: Number(item.gstRate ?? 18), stock: 0, unit: "PCS", hsnCode: (item as any).hsn || "", barcode: "" };
        setProducts((prev) => [...prev, newProduct]);
        try {
          const { getCachedProducts, cacheProducts } = await import("@/lib/indexedDB");
          const cached = await getCachedProducts(user.uid);
          await cacheProducts([...cached, { ...newProduct, userId: user.uid }]);
        } catch { /* non-critical */ }
        toast.success(`'${trimmedName}' saved to inventory! ✅`);
      }
      setSavedToInventoryRows((prev) => ({ ...prev, [idx]: true }));
    } catch (err) {
      toast.error("Failed to save item to inventory");
    } finally {
      setSavingToInventoryRow((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleSave = async () => {
    if (!customerName) return toast.error("Please select a party first");
    if (!validItems.length) return toast.error("Please add at least one valid item");
    if (!purchaseReturnNumber.trim()) return toast.error("Purchase Return Number is required");
    if (calc.discountAmount > calc.subtotal) return toast.error("Discount cannot exceed subtotal");

    const user = auth.currentUser;
    if (!user) return toast.error("Access denied");

    try {
      setSaving(true);

      let isOfflineMode = !navigator.onLine;
      if (!isOfflineMode) {
        try {
          const test = await fetch("/favicon.ico?cache=" + new Date().getTime(), { method: "HEAD", cache: "no-store" });
          if (!test.ok) isOfflineMode = true;
        } catch {
          isOfflineMode = true;
        }
      }
      
      const itemsToSync = validItems.filter(i => i.productId).map(i => ({
        id: i.productId!,
        quantity: i.qty
      }));
      
      const data = {
        userId: user.uid,
        total: finalTotal,
        customerName,
        customerGSTIN: selectedCustomer?.gstin || "",
        purchaseReturnNumber,
        linkedInvoiceNumber,
        date: purchaseReturnDate,
        items: validItems,
        subtotal: calc.subtotal,
        discountType,
        discountValue: Number(discountValue),
        discountAmount: calc.discountAmount,
        gstEnabled,
        isInterstate,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        status: Number(amountReceived) >= finalTotal ? "adjusted" : "issued",
        amountReceived: Number(amountReceived),
        paymentMode,
        selectedBankId: paymentMode === "Cash" ? "" : selectedBankId,
        createdAt: new Date(),
        notes,
        additionalChargeName,
        additionalChargeValue: Number(additionalChargeValue),
        autoRoundOff,
        roundOffAmount: roundedTotal - rawTotal,
        signatureType,
        signatureImage
      };

      if (isOfflineMode) {
        const { saveOfflineInvoice } = await import("@/lib/offlineInvoices");
        const { getCachedProducts, cacheProducts } = await import("@/lib/indexedDB");
        
        const cachedProducts = await getCachedProducts(user.uid);
        for (const item of validItems) {
          if (item.productId) {
            const idx = cachedProducts.findIndex((p: any) => p.id === item.productId);
            if (idx > -1) {
              const stock = cachedProducts[idx].stock || 0;
              cachedProducts[idx].stock = stock - item.qty;
            }
          }
        }
        await cacheProducts(cachedProducts);

        await saveOfflineInvoice({ ...data, invoiceType: "purchase-return" } as any);
        toast.success("Purchase Return saved offline draft ✅");
        router.push("/dashboard/purchase-return");
        return;
      }

      if (itemsToSync.length > 0) {
        try {
          await syncInventory(user.uid, itemsToSync, "DECREASE");
        } catch (err: any) {
          return toast.error(err.message || "Failed to sync inventory stock.");
        }
      }

      await addDoc(collection(db, "purchaseReturns"), data);

      // Update Cash & Bank ledger for Purchase Return (money coming IN as refund)
      const amountReceivedNum = Number(amountReceived);
      if (amountReceivedNum > 0) {
        try {
          const isCash = paymentMode === "Cash";
          let newBalance = 0;
          if (isCash) {
            const sRef = doc(db, "settings", user.uid);
            const sSnap = await getDoc(sRef);
            const currentCash = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
            newBalance = currentCash + amountReceivedNum;
            await updateDoc(sRef, { cashInHand: newBalance });
          } else if (selectedBankId) {
            const bRef = doc(db, "bankAccounts", selectedBankId);
            const bSnap = await getDoc(bRef);
            const currentBank = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
            newBalance = currentBank + amountReceivedNum;
            await updateDoc(bRef, { balance: newBalance });
          }
          await addDoc(collection(db, "cashBankTransactions"), {
            userId: user.uid,
            accountId: isCash ? "cash" : (selectedBankId || "bank"),
            type: "Purchase Return",
            txnNo: purchaseReturnNumber,
            date: purchaseReturnDate,
            party: customerName,
            mode: isCash ? "Cash" : "Bank",
            paid: 0,
            received: amountReceivedNum,
            balanceAfter: newBalance,
            remarks: `Refund against Purchase Return #${purchaseReturnNumber}`,
            createdAt: new Date()
          });
        } catch (cashErr) {
          console.error("Cash/Bank ledger update failed:", cashErr);
        }
      }

      toast.success("Purchase Return created successfully!");
      router.push("/dashboard/purchase-return");
    } catch (err) {
      toast.error("Failed to save Purchase Return");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchase-return" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Create Purchase Return</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded bg-white hover:bg-gray-50 font-semibold">
            <Settings2 size={13} className="text-indigo-500" /> Settings
          </button>
          <button onClick={handleSave} disabled={saving} className="text-xs text-white bg-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-gray-100 bg-gray-50/20">
            {/* Bill From */}
            <div className="space-y-3">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bill From</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select party..."
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setShowPartyDropdown(true); }}
                  onFocus={() => setShowPartyDropdown(true)}
                  className="w-full max-w-md border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-700 bg-white"
                />
                {showPartyDropdown && (
                  <div className="absolute left-0 top-8 z-30 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-h-60 overflow-y-auto p-1">
                    {customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).map(c => (
                      <button key={c.id} onClick={() => { setCustomerName(c.name); setShowPartyDropdown(false); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded font-semibold">
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="bg-white border border-gray-100 rounded-lg p-3 text-xs text-gray-600 shadow-sm max-w-md">
                  <p className="font-bold text-gray-800">{selectedCustomer.name}</p>
                  {selectedCustomer.gstin && <p className="mt-1">GSTIN: {selectedCustomer.gstin}</p>}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Purchase Return No:</label>
                <input type="text" value={purchaseReturnNumber} onChange={(e) => setCreditNoteNumber(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Purchase Return Date:</label>
                <input type="date" value={purchaseReturnDate} onChange={(e) => setCreditNoteDate(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Link to Purchase Invoice:</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search invoices"
                    value={linkedInvoiceNumber}
                    onChange={(e) => { setLinkedInvoiceNumber(e.target.value); setShowInvoiceDropdown(true); }}
                    onFocus={() => setShowInvoiceDropdown(true)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-700 bg-white"
                  />
                  {showInvoiceDropdown && (
                    <div className="absolute left-0 right-0 top-8 z-30 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto p-1">
                      {invoices.filter(i => i.invoiceNumber.toLowerCase().includes(linkedInvoiceNumber.toLowerCase())).map(i => (
                        <button key={i.id} onClick={() => { setLinkedInvoiceNumber(i.invoiceNumber); setShowInvoiceDropdown(false); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded font-semibold">
                          {i.invoiceNumber}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100 hidden md:grid">
              <span className="col-span-1 text-center">NO.</span>
              <span className="col-span-4">ITEMS / SERVICES</span>
              <span className="col-span-2 text-center">HSN / SAC</span>
              <span className="col-span-1 text-center">QTY</span>
              <span className="col-span-2 text-right">PRICE/ITEM (₹)</span>
              <span className="col-span-1 text-center">TAX</span>
              <span className="col-span-1 text-right">AMOUNT (₹)</span>
            </div>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-1 text-center font-bold text-gray-400 font-mono text-xs">{idx + 1}</div>
                    <div className="col-span-4 relative flex flex-col gap-1.5">
                      {item.productId === "CUSTOM" ? (
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                            placeholder="Enter custom service/item name..."
                            className="w-full border border-indigo-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-indigo-50/20 font-medium text-gray-800"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              const updated = [...items];
                              updated[idx] = { ...updated[idx], productId: "", name: "", price: 0, gstRate: 18, hsn: "", description: "" };
                              setItems(updated);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Cancel custom item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {item.name.trim() && (
                          <div className="flex justify-start mt-1 animate-in fade-in duration-200">
                            {savedToInventoryRows[idx] ? (
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60 shadow-sm">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Added to Catalog
                              </div>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => handleSaveToInventory(idx)} 
                                disabled={savingToInventoryRow[idx]} 
                                className="group flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold hover:text-white hover:bg-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50"
                                title="Add this custom item to your permanent product catalog"
                              >
                                {savingToInventoryRow[idx] ? (
                                  <>
                                    <svg className="animate-spin text-indigo-500 group-hover:text-white" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <svg className="text-indigo-500 group-hover:text-white transition-colors" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                    Save to Product Catalog
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <select
                        value={item.productId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "CUSTOM") {
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              productId: "CUSTOM",
                              name: "",
                              price: 0,
                              qty: 1,
                              gstRate: 18,
                              hsn: "",
                              description: ""
                            };
                            setItems(updated);
                            return;
                          }
                          const found = products.find(p => p.id === val);
                          if (found) {
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              productId: found.id,
                              name: found.name,
                              price: found.price,
                              qty: 1,
                              gstRate: found.gst ?? 18,
                              hsn: found.hsnCode || "",
                              description: ""
                            };
                            setItems(updated);
                          }
                        }}
                        className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 bg-white font-medium text-gray-700"
                      >
                        <option value="">Select Item / Product...</option>
                        <option value="CUSTOM" className="font-bold text-indigo-600 bg-indigo-50">+ Add Custom Item (Manual Entry)</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock || 0})
                          </option>
                        ))}
                      </select>
                    )}
                      <input 
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Enter Description (optional)"
                        className="w-full text-[10px] text-gray-500 bg-transparent border-t border-dashed border-gray-200 focus:border-indigo-400 focus:ring-0 focus:outline-none py-1 px-1 mt-1 block" 
                      />
                    </div>
                    <div className="col-span-2">
                      <input type="text" placeholder="HSN" value={item.hsn || ""} onChange={(e) => updateItem(idx, "hsn", e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white text-center" />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-center text-gray-700 bg-white" />
                    </div>
                    <div className="col-span-2">
                      <input type="text" placeholder="Price" value={item.price} onChange={(e) => updateItem(idx, "price", e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right text-gray-700 bg-white" />
                    </div>
                    <div className="col-span-1">
                      <select value={item.gstRate ?? 18} onChange={(e) => updateItem(idx, "gstRate", Number(e.target.value))} className="w-full border border-gray-200 rounded px-1.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white">
                        <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option>
                      </select>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2 text-right">
                      <span className="font-bold font-mono text-xs text-gray-700">₹{((Number(item.qty || 0)) * (Number(item.price || 0))).toFixed(2)}</span>
                      <button onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-600 font-bold">
                <Plus size={14} className="stroke-[2.5]" /> Add Product Row
              </button>
              <div className="text-xs font-bold text-gray-500">SUB TOTAL: <span className="font-mono text-gray-700">₹{calc.subtotal.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Terms and Conditions / Remarks</span>
                <button onClick={() => setShowNotes(!showNotes)} className="text-[10px] text-indigo-600 font-bold uppercase hover:underline">{showNotes ? "- Remove Notes" : "+ Add Notes"}</button>
              </div>
              {showNotes && (
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarks..." rows={2} className="w-full border border-gray-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white" />
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold uppercase text-[9px]">+ Add Additional Charges</span>
                <input type="text" placeholder="Charge Name" value={additionalChargeName} onChange={(e) => setAdditionalChargeName(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-[10px] text-right font-semibold text-gray-600 focus:outline-none focus:border-indigo-500 max-w-[130px]" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{additionalChargeName}</span>
                <input type="text" value={additionalChargeValue} onChange={(e) => setAdditionalChargeValue(sanitizeNumericInput(e.target.value))} className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right max-w-[110px]" />
              </div>
            </div>

            {gstEnabled && (
              <div className="bg-gray-50 border border-gray-150 rounded p-2.5 text-[10px] font-mono text-gray-500 space-y-1">
                {isInterstate ? (
                  <div className="flex justify-between font-bold"><span>IGST</span><span>₹{calc.igst.toFixed(2)}</span></div>
                ) : (
                  <><div className="flex justify-between"><span>CGST</span><span>₹{calc.cgst.toFixed(2)}</span></div><div className="flex justify-between"><span>SGST</span><span>₹{calc.sgst.toFixed(2)}</span></div></>
                )}
              </div>
            )}

            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex justify-between items-center">
                <button onClick={() => setShowDiscountInput(!showDiscountInput)} className="text-[10px] text-indigo-600 font-bold uppercase hover:underline">{showDiscountInput ? "- Remove Discount" : "+ Add Discount"}</button>
                {showDiscountInput && (
                  <div className="flex items-center gap-1">
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="border border-gray-200 rounded px-1.5 py-1 text-[10px] font-semibold text-gray-600 focus:outline-none"><option value="flat">Flat (₹)</option><option value="percentage">%</option></select>
                    <input type="text" value={discountValue} onChange={(e) => setDiscountValue(capGlobalDiscountUI(sanitizeNumericInput(e.target.value), discountType))} className="border border-gray-200 rounded px-2 py-1 text-[10px] font-bold text-right w-16 focus:outline-none focus:border-indigo-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <input type="checkbox" checked={autoRoundOff} onChange={(e) => setAutoRoundOff(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /> Auto Round Off
              </label>
              <span className="text-[10px] font-mono text-gray-500 font-bold">{autoRoundOff ? (roundOffAmount > 0 ? "+" : "") + roundOffAmount.toFixed(2) : "0.00"}</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex justify-between items-center">
              <span className="font-bold text-indigo-900 text-sm">Total Amount</span>
              <span className="font-extrabold text-indigo-700 text-xl font-mono">₹{finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount Received / Adjusted</span>
                <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                  <input type="checkbox" checked={Number(amountReceived) >= finalTotal} onChange={(e) => handleMarkFullyPaid(e.target.checked)} /> Mark as fully paid
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                  <input type="text" value={amountReceived} onChange={(e) => setAmountReceived(sanitizeNumericInput(e.target.value))} className="w-full border border-gray-200 rounded pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-800" />
                </div>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>

              {paymentMode !== "Cash" && (
                <div className="space-y-1 pt-1 border-t border-dashed border-gray-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Bank Account Profile</label>
                    <button 
                      onClick={() => setShowBankModal(true)} 
                      type="button"
                      className="text-indigo-600 text-[10px] font-bold uppercase hover:underline"
                    >
                      + Add Bank
                    </button>
                  </div>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600"
                  >
                    <option value="">No Active Account Selected</option>
                    {bankAccounts.filter((b: any) => b.status !== "inactive").map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name} (A/C: {bank.accountNumber || "UPI Profile"})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg my-8 overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Landmark size={14} className="text-indigo-500" />
                Add Bank Account
              </span>
              <button 
                onClick={() => setShowBankModal(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-gray-600 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Personal Bank Account"
                  value={newBank.name}
                  onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Opening Balance</label>
                  <input 
                    type="number"
                    placeholder="₹ 0.00"
                    value={newBank.balance}
                    onChange={(e) => setNewBank({ ...newBank, balance: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">As Of Date</label>
                  <input 
                    type="date"
                    value={newBank.asOfDate}
                    onChange={(e) => setNewBank({ ...newBank, asOfDate: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-b border-gray-100 py-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-700">Add Account Details</p>
                  <p className="text-[10px] text-gray-400">Save bank account number and IFSC code for invoices</p>
                </div>
                <input 
                  type="checkbox"
                  checked={newBank.addDetails}
                  onChange={(e) => setNewBank({ ...newBank, addDetails: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4.5 h-4.5"
                />
              </div>

              {newBank.addDetails && (
                <div className="space-y-4 animate-in slide-in-from-top-1 duration-150">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Account Number *</label>
                      <input 
                        type="password"
                        placeholder="Enter account number"
                        value={newBank.accountNumber}
                        onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Re-Enter Account Number *</label>
                      <input 
                        type="text"
                        placeholder="Re-enter account number"
                        value={newBank.reAccountNumber}
                        onChange={(e) => setNewBank({ ...newBank, reAccountNumber: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Holder Name *</label>
                      <input 
                        type="text"
                        placeholder="Holder Name"
                        value={newBank.upiId}
                        onChange={(e) => setNewBank({ ...newBank, upiId: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">IFSC Code *</label>
                      <input 
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={newBank.ifsc}
                        onChange={(e) => setNewBank({ ...newBank, ifsc: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Name *</label>
                      <input 
                        type="text"
                        placeholder="e.g. State Bank of India"
                        value={newBank.bankName}
                        onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Branch Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Downtown Branch"
                        value={newBank.branchName}
                        onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-150 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBank}
                  disabled={addingBank}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold shadow-sm transition-all"
                >
                  {addingBank ? "Saving..." : "Save Bank"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
