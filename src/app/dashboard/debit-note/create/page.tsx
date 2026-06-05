"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2, ScanBarcode, Plus, Trash2, Landmark, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

import { sanitizeNumericInput } from "@/lib/sanitize";
import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";
import { v4 as uuidv4 } from "uuid";

import dynamic from "next/dynamic";
const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), { ssr: false });

type Item = {
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
  
  const [debitNoteNumber, setCreditNoteNumber] = useState("");
  const [debitNoteDate, setCreditNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [linkedInvoiceNumber, setLinkedInvoiceNumber] = useState("");
  
  const [amountReceived, setAmountReceived] = useState<number | string>(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showBankModal, setShowBankModal] = useState(false);
  const [newBank, setNewBank] = useState({ name: "", balance: "", asOfDate: new Date().toISOString().split("T")[0], accountNumber: "", reAccountNumber: "", ifsc: "", bankName: "", branchName: "", upiId: "", addDetails: false });
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
  
    // Add stock for Debit Note
    for (const item of validItems) {
      if (item.productId) {
        try {
          const ref = doc(db, "products", item.productId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const currentStock = snap.data().stock || 0;
            await updateDoc(ref, { stock: currentStock - item.qty });
          }
        } catch (e) {
          console.error("Stock deduction failed", e);
        }
      }
    }

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

        const cnq = query(collection(db, "debitNotes"), where("userId", "==", user.uid));
        const cnsnap = await getDocs(cnq);
        setCreditNoteNumber((cnsnap.size + 1).toString());

        const bq = query(collection(db, "bankAccounts"), where("userId", "==", user.uid));
        const bsnap = await getDocs(bq);
        const bList = bsnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setBankAccounts(bList);
        if (bList.length > 0) {
          const active = bList.find((b: any) => b.status !== "inactive") || bList[0];
          setSelectedBankId(active.id);
        }

        const settingsSnap = await getDoc(doc(db, "settings", user.uid));
        if (settingsSnap.exists()) setCompanyState((settingsSnap.data().state || "").trim());

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

  useEffect(() => {
    if (paymentMode !== "Cash" && !selectedBankId && bankAccounts.length > 0) {
      const active = bankAccounts.find((b: any) => b.status !== "inactive") || bankAccounts[0];
      setSelectedBankId(active.id);
    }
  }, [paymentMode, bankAccounts, selectedBankId]);

  const handleSaveBank = async () => {
    if (!newBank.name.trim()) return toast.error("Account Name is required");
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");
    try {
      setAddingBank(true);
      const bankId = uuidv4();
      const bankData = { userId: user.uid, name: newBank.name.trim(), balance: Number(newBank.balance) || 0, asOfDate: newBank.asOfDate, accountNumber: newBank.addDetails ? newBank.accountNumber.trim() : "", ifsc: newBank.addDetails ? newBank.ifsc.trim().toUpperCase() : "", bankName: newBank.addDetails ? newBank.bankName.trim() : "", branchName: newBank.addDetails ? newBank.branchName.trim() : "", upiId: newBank.upiId.trim(), status: "active", createdAt: new Date() };
      await setDoc(doc(db, "bankAccounts", bankId), bankData);
      setBankAccounts([...bankAccounts, { id: bankId, ...bankData }]);
      setSelectedBankId(bankId);
      setShowBankModal(false);
      setNewBank({ name: "", balance: "", asOfDate: new Date().toISOString().split("T")[0], accountNumber: "", reAccountNumber: "", ifsc: "", bankName: "", branchName: "", upiId: "", addDetails: false });
      toast.success("Bank Account added! 🏦");
    } catch (err: any) {
      toast.error(err.message || "Failed to add bank account");
    } finally {
      setAddingBank(false);
    }
  };

  // Resolve custom party-wise prices when customer changes
  useEffect(() => {
    if (!customerName) return;
    setItems(prevItems =>
      prevItems.map(item => {
        if (!item.productId) return item;
        const prod = products.find(p => p.id === item.productId);
        if (!prod) return item;
        let resolvedPrice = prod.price;
        if (customerName && Array.isArray((prod as any).partyPrices)) {
          const customPriceObj = (prod as any).partyPrices.find(
            (pp: any) => pp.partyName.trim().toLowerCase() === customerName.trim().toLowerCase()
          );
          if (customPriceObj) {
            resolvedPrice = Number(customPriceObj.price) || prod.price;
          }
        }
        return {
          ...item,
          price: resolvedPrice
        };
      })
    );
  }, [customerName, products]);

  const validItems = items.filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0).map((i) => ({ ...i, qty: Number(i.qty), price: Number(i.price) }));
  const selectedCustomer = customers.find((c) => c.name === customerName);
  const isInterstate = !!selectedCustomer?.state && !!companyState && selectedCustomer.state.trim().toUpperCase() !== companyState.trim().toUpperCase();

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
    setItems(updated);
  };

  const addItem = () => setItems([...items, { name: "", qty: 1, price: 0, gstRate: 18 }]);
  const removeItem = (index: number) => items.length > 1 ? setItems(items.filter((_, i) => i !== index)) : setItems([{ name: "", qty: 1, price: 0, gstRate: 18 }]);

  const handleSave = async () => {
    if (!customerName) return toast.error("Please select a party first");
    if (!validItems.length) return toast.error("Please add at least one valid item");
    if (calc.discountAmount > calc.subtotal) return toast.error("Discount cannot exceed subtotal");

    const user = auth.currentUser;
    if (!user) return toast.error("Access denied");

    try {
      setSaving(true);
      const data = {
        userId: user.uid,
        total: finalTotal,
        customerName,
        customerGSTIN: selectedCustomer?.gstin || "",
        debitNoteNumber,
        linkedInvoiceNumber,
        date: debitNoteDate,
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

      await addDoc(collection(db, "debitNotes"), data);

      // Sync Cash & Bank ledger — Debit Note = customer pays = money IN
      const amountNum = Number(amountReceived);
      if (amountNum > 0) {
        try {
          const isCash = paymentMode === "Cash";
          let newBalance = 0;
          if (isCash) {
            const sRef = doc(db, "settings", user.uid);
            const sSnap = await getDoc(sRef);
            const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
            newBalance = current + amountNum;
            await updateDoc(sRef, { cashInHand: newBalance });
          } else if (selectedBankId) {
            const bRef = doc(db, "bankAccounts", selectedBankId);
            const bSnap = await getDoc(bRef);
            const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
            newBalance = current + amountNum;
            await updateDoc(bRef, { balance: newBalance });
          }
          await addDoc(collection(db, "cashBankTransactions"), {
            userId: user.uid,
            accountId: isCash ? "cash" : (selectedBankId || "bank"),
            type: "Debit Note",
            txnNo: debitNoteNumber,
            date: debitNoteDate,
            party: customerName,
            mode: isCash ? "Cash" : "Bank",
            paid: 0,
            received: amountNum,
            balanceAfter: newBalance,
            remarks: `Payment against Debit Note #${debitNoteNumber}`,
            createdAt: new Date()
          });
        } catch (cashErr) {
          console.error("Cash/Bank ledger update failed:", cashErr);
        }
      }

      toast.success("Debit Note created successfully!");
      router.push("/dashboard/debit-note");
    } catch (err) {
      toast.error("Failed to save Debit Note");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/debit-note" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Create Debit Note</h1>
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
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Debit Note No:</label>
                <input type="text" value={debitNoteNumber} onChange={(e) => setCreditNoteNumber(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Debit Note Date:</label>
                <input type="date" value={debitNoteDate} onChange={(e) => setCreditNoteDate(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white" />
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
                      <select
                        value={item.productId || ""}
                        onChange={(e) => {
                          const found = products.find(p => p.id === e.target.value);
                          if (found) {
                            let resolvedPrice = found.price;
                            if (customerName && Array.isArray((found as any).partyPrices)) {
                              const customPriceObj = (found as any).partyPrices.find(
                                (pp: any) => pp.partyName.trim().toLowerCase() === customerName.trim().toLowerCase()
                              );
                              if (customPriceObj) {
                                resolvedPrice = Number(customPriceObj.price) || found.price;
                              }
                            }
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              productId: found.id,
                              name: found.name,
                              price: resolvedPrice,
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
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock || 0})
                          </option>
                        ))}
                      </select>
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
                    <input type="text" value={discountValue} onChange={(e) => setDiscountValue(sanitizeNumericInput(e.target.value))} className="border border-gray-200 rounded px-2 py-1 text-[10px] font-bold text-right w-16 focus:outline-none focus:border-indigo-500" />
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
                <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500"><input type="checkbox" checked={Number(amountReceived) >= finalTotal} onChange={(e) => handleMarkFullyPaid(e.target.checked)} /> Mark as fully paid</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                  <input type="text" value={amountReceived} onChange={(e) => setAmountReceived(sanitizeNumericInput(e.target.value))} className="w-full border border-gray-200 rounded pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-800" />
                </div>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600">
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              {paymentMode !== "Cash" && (
                <div className="space-y-1 pt-1 border-t border-dashed border-gray-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Bank Account</label>
                    <button onClick={() => setShowBankModal(true)} type="button" className="text-indigo-600 text-[10px] font-bold uppercase hover:underline">+ Add Bank</button>
                  </div>
                  <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5"><Landmark size={14} className="text-indigo-500" /> Add Bank Account</span>
              <button onClick={() => setShowBankModal(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4 text-xs text-gray-600">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Name *</label>
                <input type="text" placeholder="e.g. Personal Bank Account" value={newBank.name} onChange={(e) => setNewBank({ ...newBank, name: e.target.value })} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Opening Balance</label>
                  <input type="number" placeholder="₹ 0.00" value={newBank.balance} onChange={(e) => setNewBank({ ...newBank, balance: e.target.value })} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">As Of Date</label>
                  <input type="date" value={newBank.asOfDate} onChange={(e) => setNewBank({ ...newBank, asOfDate: e.target.value })} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowBankModal(false)} className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-50 font-semibold">Cancel</button>
                <button type="button" onClick={handleSaveBank} disabled={addingBank} className="text-xs text-white bg-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold disabled:opacity-50">{addingBank ? "Saving..." : "Save Bank"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
