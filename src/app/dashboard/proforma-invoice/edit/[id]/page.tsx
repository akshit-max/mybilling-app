"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { X,  ArrowLeft, Settings2, Plus, Trash2  } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

import { sanitizeNumericInput , capItemDiscountUI, capGlobalDiscountUI } from "@/lib/sanitize";
import { validateDiscount } from "@/lib/validateDiscount";
import { calculateInvoice, DiscountType, getItemBaseAmount } from "@/lib/calcInvoice";

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

export default function EditCreditNote() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string }[]>([]);
  
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, price: 0, gstRate: 18, description: "" }]);
  const [discountType, setDiscountType] = useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState<number | string>(0);
  const [gstEnabled, setGstEnabled] = useState(true);
  
  const [proformaInvoiceNumber, setCreditNoteNumber] = useState("");
  const [proformaInvoiceDate, setCreditNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [linkedInvoiceNumber, setLinkedInvoiceNumber] = useState("");
  
  const [amountReceived, setAmountReceived] = useState<number | string>(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {

    const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "proformaInvoices", id));
        if (snap.exists()) {
          const loaded = snap.data();
          setCustomerName(loaded.customerName || "");
          if (loaded.items && loaded.items.length) setItems(loaded.items);
          setDiscountType(loaded.discountType || "flat");
          setDiscountValue(loaded.discountValue || 0);
          setGstEnabled(loaded.gstEnabled ?? true);
          setCreditNoteNumber(loaded.proformaInvoiceNumber || "");
          setCreditNoteDate(loaded.date || new Date().toISOString().split("T")[0]);
          setLinkedInvoiceNumber(loaded.linkedInvoiceNumber || "");
          setAmountReceived(loaded.amountReceived || 0);
          setNotes(loaded.notes || "");
          setShowNotes(!!loaded.notes);
          setAdditionalChargeName(loaded.additionalChargeName || "Transport Charges");
          setAdditionalChargeValue(loaded.additionalChargeValue || 0);
          setAutoRoundOff(loaded.autoRoundOff ?? true);
          setSignatureType(loaded.signatureType || "");
          setSignatureImage(loaded.signatureImage || "");
          if (loaded.discountValue > 0) setShowDiscountInput(true);
        } else {
          toast.error("Credit note not found");
          router.push("/dashboard/proforma-invoice");
          return;
        }

        const cq = query(collection(db, "customers"), where("userId", "==", user.uid));
        const csnap = await getDocs(cq);
        setCustomers(csnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));

        const pq = query(collection(db, "products"), where("userId", "==", user.uid));
        const psnap = await getDocs(pq);
        setProducts(psnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

        const iq = query(collection(db, "invoices"), where("userId", "==", user.uid));
        const isnap = await getDocs(iq);
        setInvoices(isnap.docs.map(d => ({ id: d.id, invoiceNumber: d.data().invoiceNumber || "" })));

        const settingsSnap = await getDoc(doc(db, "settings", user.uid));
        if (settingsSnap.exists()) {
          setCompanyState((settingsSnap.data().state || "").trim());
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
  }, [id]);

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

  const handleUpdate = async () => {

    // DISCOUNT & NEGATIVE TOTAL VALIDATION GATE
    const validation = validateDiscount(validItems, products, discountType, Number(discountValue), finalTotal, true);
    if (!validation.isValid) {
      return toast.error(validation.error);
    }

    if (!customerName) return toast.error("Please select a party first");
    if (!validItems.length) return toast.error("Please add at least one valid item");
    if (calc.discountAmount > calc.subtotal) return toast.error("Discount cannot exceed subtotal");


  
    // Validate stock for Proforma
    for (const item of validItems) {
      if (item.productId) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && item.qty > (prod.stock || 0)) {
          return toast.error(`Insufficient stock for ${item.name}. Available: ${prod.stock || 0}`);
        }
      }
    }
    const user = auth.currentUser;
    if (!user) return toast.error("Access denied");

    try {
      setSaving(true);
      const data = {
        total: finalTotal,
        customerName,
        customerGSTIN: selectedCustomer?.gstin || "",
        proformaInvoiceNumber,
        linkedInvoiceNumber,
        date: proformaInvoiceDate,
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
        notes,
        additionalChargeName,
        additionalChargeValue: Number(additionalChargeValue),
        autoRoundOff,
        roundOffAmount: roundedTotal - rawTotal,
        signatureType,
        signatureImage
      };

      await updateDoc(doc(db, "proformaInvoices", id), data);
      toast.success("Proforma Invoice updated successfully!");
      router.push("/dashboard/proforma-invoice");
    } catch (err) {
      toast.error("Failed to update Proforma Invoice");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/proforma-invoice" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Update Proforma Invoice</h1>
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Edit Transaction</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded bg-white hover:bg-gray-50 font-semibold">
            <Settings2 size={13} className="text-indigo-500" /> Settings
          </button>
          <button onClick={handleUpdate} disabled={saving} className="text-xs text-white bg-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm disabled:opacity-50">
            {saving ? "Updating..." : "Update"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-gray-100 bg-gray-50/20">
            <div className="space-y-3">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bill To</span>
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
                    {customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()) || (c.gstin && c.gstin.toLowerCase().includes(customerName.toLowerCase()))).map(c => (
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Proforma Invoice No:</label>
                <input type="text" value={proformaInvoiceNumber} onChange={(e) => setCreditNoteNumber(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Proforma Invoice Date:</label>
                <input type="date" value={proformaInvoiceDate} onChange={(e) => setCreditNoteDate(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white" />
              </div>
              <div className="hidden space-y-1.5 col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reference Invoice No. (Optional):</label>
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

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100 hidden md:grid">
              <span className="col-span-1 text-center">NO.</span>
              <span className="col-span-3">ITEMS / SERVICES</span>
              <span className="col-span-1 text-center">HSN / SAC</span>
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
                    <div className="col-span-1">
                      <input type="text" placeholder="HSN" value={item.hsn || ""} onChange={(e) => updateItem(idx, "hsn", e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white text-center" />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-center text-gray-700 bg-white" />
                    </div>
                    <div className="col-span-2">
                      <input type="text" placeholder="Price" value={item.price} onChange={(e) => updateItem(idx, "price", e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right text-gray-700 bg-white" />
                    </div>
                    <div className="col-span-2 flex items-center border border-gray-200 rounded overflow-hidden bg-white mt-0.5 w-full">
                      <select
                        value={(item as any).discountType ?? "percent"}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx] = { ...updated[idx], discountType: e.target.value } as any;
                            updated[idx] = capItemDiscountUI(updated[idx]);
                            setItems(updated);
                        }}
                        className="px-1 py-1.5 text-[10px] font-bold text-gray-500 bg-transparent border-r border-gray-200 focus:outline-none cursor-pointer"
                      >
                        <option value="percent">%</option>
                        <option value="flat">₹</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={(item as any).discountValue ?? ""}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx] = { ...updated[idx], discountValue: e.target.value === "" ? undefined : Number(e.target.value) } as any;
                            updated[idx] = capItemDiscountUI(updated[idx]);
                            setItems(updated);
                        }}
                        placeholder="0"
                        className="w-full px-2 py-1.5 text-xs focus:outline-none font-mono text-right bg-transparent"
                      />
                    </div>
                    <div className="col-span-1">
                      <select value={item.gstRate ?? 18} onChange={(e) => updateItem(idx, "gstRate", Number(e.target.value))} className="w-full border border-gray-200 rounded px-1.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white">
                        <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option>
                      </select>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2 text-right">
                      <span className="font-bold font-mono text-xs text-gray-700">₹{getItemBaseAmount(item).toFixed(2)}</span>
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

            <div className="hidden space-y-2 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount Received / Adjusted</span>
                <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500"><input type="checkbox" checked={Number(amountReceived) >= finalTotal} onChange={(e) => handleMarkFullyPaid(e.target.checked)} /> Mark as fully paid</label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                <input type="text" value={amountReceived} onChange={(e) => setAmountReceived(sanitizeNumericInput(e.target.value))} className="w-full border border-gray-200 rounded px-8 py-2 text-sm focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-800" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
