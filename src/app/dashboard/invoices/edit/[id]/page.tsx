"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Settings2, Share2, ScanBarcode, Plus, ChevronDown, Check, Trash2, Eye, FileText, Landmark, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

import { sanitizeNumericInput } from "@/lib/sanitize";
import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";
import { v4 as uuidv4 } from "uuid";
import { INDIAN_STATES } from "@/lib/indianStates";

// Lazy import BarcodeScanner
import dynamic from "next/dynamic";
const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), { ssr: false });

type Item = {
  productId?: string;
  name: string;
  qty: number | "";
  price: number | "";
  gstRate?: number;
  hsn?: string;
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

type Status = "paid" | "pending" | "credit" | "cancelled";

export default function EditSalesInvoice() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  // Invoice states
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [originalItems, setOriginalItems] = useState<Item[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState<number | string>(0);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [status, setStatus] = useState<Status>("pending");
  const [dueDate, setDueDate] = useState("");
  const [invoiceType, setInvoiceType] = useState<"invoice" | "estimate">("invoice");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [amountReceived, setAmountReceived] = useState<number | string>(0);
  const [paymentMode, setPaymentMode] = useState("Cash");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [companyState, setCompanyState] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  // Quick add customer states
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    gstin: "",
    state: "",
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

  /* FETCH DATA & PRE-FILL INSTANCE */
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. INVOICE LOAD (Online or Offline draft)
        let loadedInvoice: any = null;
        try {
          const snap = await getDoc(doc(db, "invoices", id));
          if (snap.exists()) {
            loadedInvoice = snap.data();
          } else {
            throw new Error("Missing invoice online");
          }
        } catch {
          const { getOfflineInvoices } = await import("@/lib/offlineInvoices");
          const offlineInvoices = await getOfflineInvoices();
          const found = offlineInvoices.find(
            (inv: any) => inv.id?.toString() === id || inv.invoiceNumber === id
          );
          if (found) {
            loadedInvoice = found;
          }
        }

        if (loadedInvoice) {
          setCustomerName(loadedInvoice.customerName || "");
          const fetchedItems = loadedInvoice.items || [];
          setItems(fetchedItems);
          setOriginalItems(fetchedItems);
          setDiscountType(loadedInvoice.discountType || "flat");
          setDiscountValue(loadedInvoice.discountValue || 0);
          setGstEnabled(loadedInvoice.gstEnabled ?? true);
          setStatus(loadedInvoice.status || "pending");
          setDueDate(loadedInvoice.dueDate || "");
          setInvoiceType(loadedInvoice.invoiceType || "invoice");
          setInvoiceNumber(loadedInvoice.invoiceNumber || "");
          setInvoiceDate(loadedInvoice.date || new Date().toISOString().split("T")[0]);
          setAmountReceived(loadedInvoice.amountReceived || 0);
          setPaymentMode(loadedInvoice.paymentMode || "Cash");
        } else {
          toast.error("Invoice record not found");
          router.push("/dashboard/invoices");
          return;
        }

        // 2. CUSTOMERS LOAD
        try {
          if (!navigator.onLine) throw new Error("Offline");
          const cq = query(collection(db, "customers"), where("userId", "==", user.uid));
          const csnap = await getDocs(cq);
          const cList = csnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name || "Unknown",
              gstin: data.gstin || "",
              phone: data.phone || "",
              address: data.address || "",
              state: data.state || "",
            };
          });
          setCustomers(cList);
          const { cacheCustomers } = await import("@/lib/indexedDB");
          await cacheCustomers(cList);
        } catch {
          const { getCachedCustomers } = await import("@/lib/indexedDB");
          const cached = await getCachedCustomers();
          setCustomers(cached as any || []);
        }

        // 3. PRODUCTS LOAD
        try {
          if (!navigator.onLine) throw new Error("Offline");
          const pq = query(collection(db, "products"), where("userId", "==", user.uid));
          const psnap = await getDocs(pq);
          const pList = psnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name || "Unknown Product",
              price: Number(data.price || 0),
              barcode: data.barcode || "",
              gst: Number(data.gst !== undefined ? data.gst : 18),
              hsnCode: data.hsnCode || "",
              stock: Number(data.stock || 0),
              unit: data.unit || "PCS",
            };
          });
          setProducts(pList);
          const { cacheProducts } = await import("@/lib/indexedDB");
          await cacheProducts(pList);
        } catch {
          const { getCachedProducts } = await import("@/lib/indexedDB");
          const cached = await getCachedProducts();
          setProducts(cached as any || []);
        }

        // 4. SETTINGS / COMPANY STATE LOAD
        try {
          const settingsSnap = await getDoc(doc(db, "settings", user.uid));
          if (settingsSnap.exists()) {
            setCompanyState((settingsSnap.data().state || "").trim());
          }
        } catch {
          // Defaults to CGST + SGST
        }

      } catch (err) {
        console.error(err);
        toast.error("Failed to load invoice edit configurations");
      } finally {
        setLoading(false);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [id]);

  // Adjust due dates on date terms change
  useEffect(() => {
    if (paymentTerms && invoiceDate) {
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + Number(paymentTerms || 0));
      setDueDate(date.toISOString().split("T")[0]);
    }
  }, [paymentTerms, invoiceDate]);

  // Valid calculations
  const validItems = items
    .filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0)
    .map((i) => ({
      ...i,
      qty: Number(i.qty),
      price: Number(i.price),
    }));

  const selectedCustomer = customers.find((c) => c.name === customerName);
  const customerStateSanitized = (selectedCustomer?.state || "").trim().toUpperCase();
  const companyStateSanitized = companyState.trim().toUpperCase();

  const isInterstate =
    !!customerStateSanitized &&
    !!companyStateSanitized &&
    customerStateSanitized !== companyStateSanitized;

  const calc = calculateInvoice(
    validItems,
    discountType,
    Number(discountValue),
    gstEnabled,
    isInterstate
  );

  const handleMarkFullyPaid = (checked: boolean) => {
    if (checked) {
      setAmountReceived(calc.total.toFixed(2));
      setStatus("paid");
    } else {
      setAmountReceived(0);
      setStatus("pending");
    }
  };

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    const updated = [...items];
    let parsedValue: string | number = value;
    if (field === "qty" || field === "price") {
      parsedValue = sanitizeNumericInput(value);
    }
    updated[index] = {
      ...updated[index],
      [field]: field === "name" ? value : parsedValue,
    };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: "", qty: 1, price: 0, gstRate: 18 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{ name: "", qty: 1, price: 0, gstRate: 18 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return toast.error("Name is required");

    const cleanPhone = newCustomer.phone.replace(/\D/g, "");
    if (cleanPhone && cleanPhone.length !== 10) {
      return toast.error("Phone number must be exactly 10 digits");
    }

    if (newCustomer.gstin.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
      if (!gstRegex.test(newCustomer.gstin.trim().toUpperCase())) {
        return toast.error("Invalid GSTIN format");
      }
    }

    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      setAddingCustomer(true);
      const customerId = uuidv4();
      const customerData = {
        userId: user.uid,
        name: newCustomer.name.trim(),
        phone: cleanPhone,
        address: newCustomer.address.trim(),
        gstin: newCustomer.gstin.trim().toUpperCase(),
        state: newCustomer.state.trim(),
        createdAt: new Date(),
      };

      import("firebase/firestore").then(({ setDoc, doc }) => {
        setDoc(doc(db, "customers", customerId), customerData).catch(console.error);
      });

      const added = { id: customerId, ...customerData };
      const updated = [...customers, added];
      setCustomers(updated);

      const { cacheCustomers } = await import("@/lib/indexedDB");
      await cacheCustomers(updated);

      setCustomerName(added.name);
      setShowAddCustomer(false);
      setNewCustomer({ name: "", phone: "", address: "", gstin: "", state: "" });
      toast.success("Customer added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleUpdate = async () => {
    if (!customerName) return toast.error("Please select a customer first");
    if (!validItems.length) return toast.error("Please add at least one valid item");

    if (calc.discountAmount > calc.subtotal) {
      return toast.error("Discount cannot exceed subtotal");
    }

    try {
      setSaving(true);

      // Maps for original vs new quantities to calculate the stocks delta difference
      const oldMap = new Map<string, number>();
      const newMap = new Map<string, number>();

      originalItems.forEach((item) => {
        if (item.productId) oldMap.set(item.productId, Number(item.qty || 0));
      });

      validItems.forEach((item) => {
        if (item.productId) newMap.set(item.productId, Number(item.qty || 0));
      });

      const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

      // Connectivity / Offline detection
      let isOfflineMode = !navigator.onLine;
      if (!isOfflineMode) {
        try {
          const test = await fetch("/favicon.ico?cache=" + new Date().getTime(), { method: "HEAD", cache: "no-store" });
          if (!test.ok) isOfflineMode = true;
        } catch {
          isOfflineMode = true;
        }
      }

      let isOfflineInvoice = false;
      if (!isOfflineMode) {
        try {
          const snap = await getDoc(doc(db, "invoices", id));
          if (!snap.exists()) isOfflineInvoice = true;
        } catch {
          isOfflineInvoice = true;
        }
      } else {
        isOfflineInvoice = true;
      }

      const updateData = {
        customerName,
        customerGSTIN: selectedCustomer?.gstin || "",
        customerPhone: selectedCustomer?.phone || "",
        invoiceNumber,
        date: invoiceDate,
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
        total: calc.total,
        status,
        invoiceType,
        amountReceived: Number(amountReceived),
        paymentMode,
        dueDate: status === "credit" ? dueDate : "",
      };

      if (isOfflineMode || isOfflineInvoice) {
        // --- OFFLINE UPDATE WORKSPACE ---
        const { getOfflineInvoices, updateOfflineInvoice } = await import("@/lib/offlineInvoices");
        const { getCachedProducts, cacheProducts } = await import("@/lib/indexedDB");

        const offlineInvoices = await getOfflineInvoices();
        const existing = offlineInvoices.find(
          (inv: any) => inv.id?.toString() === id || inv.invoiceNumber === id
        );

        if (!existing) {
          toast.error("Offline invoice record not found");
          return;
        }

        if (invoiceType === "invoice") {
          const cachedProducts = await getCachedProducts();
          for (const pid of allIds) {
            const oldQty = oldMap.get(pid) || 0;
            const newQty = newMap.get(pid) || 0;
            const diff = newQty - oldQty;

            if (diff === 0) continue;

            const pIdx = cachedProducts.findIndex(p => p.id === pid);
            if (pIdx > -1) {
              const stock = cachedProducts[pIdx].stock || 0;
              if (diff > 0 && diff > stock) {
                return toast.error(`Insufficient local stock for item delta`);
              }
              cachedProducts[pIdx].stock = stock - diff;
            }
          }
          await cacheProducts(cachedProducts);
        }

        const updatedInvoice = {
          ...existing,
          ...updateData,
        };

        await updateOfflineInvoice(updatedInvoice as any);
        toast.success("Invoice saved locally ✅");
        router.push("/dashboard/invoices");
        return;
      }

      // --- ONLINE UPDATE WORKSPACE ---
      if (invoiceType === "invoice") {
        for (const pid of allIds) {
          const oldQty = oldMap.get(pid) || 0;
          const newQty = newMap.get(pid) || 0;
          const diff = newQty - oldQty;

          if (diff === 0) continue;

          const ref = doc(db, "products", pid);
          const snap = await getDoc(ref);

          if (!snap.exists()) continue;

          const stock = snap.data().stock || 0;

          if (diff > 0 && diff > stock) {
            return toast.error("Requested delta exceeds available product stock levels");
          }

          await updateDoc(ref, {
            stock: stock - diff,
          });
        }
      }

      await updateDoc(doc(db, "invoices", id), updateData);
      toast.success("Invoice updated successfully! ✅");
      router.push("/dashboard/invoices");

    } catch (err) {
      console.error(err);
      toast.error("Failed to update invoice workspace");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-12 text-gray-400 gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold">Configuring edit invoice workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* ENTERPRISE ACTION HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Update Sales Invoice</h1>
            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Edit Transaction</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded bg-white hover:bg-gray-50 font-semibold transition-colors">
            <Settings2 size={13} className="text-indigo-500" />
            <span>Settings</span>
          </button>
          <button 
            onClick={handleUpdate}
            disabled={saving}
            className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Invoice"}
          </button>
        </div>
      </header>

      {/* WORKSPACE CONTENT AREA */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 space-y-6">
        
        {/* SMS Broadcast Alert */}
        <div className="bg-amber-50 border border-amber-100 rounded p-3 flex items-start justify-between">
          <div className="flex gap-3">
            <Share2 className="text-amber-500 shrink-0 mt-0.5" size={16} />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-gray-700">Invoice Auto-SMS to Party is turned on</p>
              <p className="text-[10px] text-gray-500 leading-normal">An SMS with the invoice details and payment link is instantly broadcasted to the customer after saving.</p>
            </div>
          </div>
          <button className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 text-[10px] px-3 py-1 rounded font-semibold transition-all">
            Change Settings
          </button>
        </div>

        {/* INVOICE ENTRY DESK SHEET */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          
          {/* BILL TO & SHIP TO SPLIT PANELS */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-gray-100 bg-gray-50/20">
            
            {/* Bill To Info */}
            <div className="lg:col-span-2 space-y-3">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bill To & Ship To Details</span>
              
              {!customerName ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                    className="w-full max-w-md h-20 border-2 border-dashed border-indigo-200 rounded-lg flex flex-col items-center justify-center text-indigo-600 hover:bg-indigo-50/50 transition-all gap-1 text-xs font-semibold"
                  >
                    <Plus size={16} />
                    <span>+ Add Customer Party</span>
                  </button>

                  {showPartyDropdown && (
                    <div className="absolute left-0 top-22 z-30 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-h-60 overflow-y-auto p-1">
                      <button 
                        onClick={() => {
                          setShowAddCustomer(true);
                          setShowPartyDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded mb-1"
                      >
                        + Quick Add New Customer
                      </button>
                      <div className="divide-y divide-gray-50 border-t border-gray-100">
                        {customers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setCustomerName(c.name);
                              setShowPartyDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded"
                          >
                            <p className="font-semibold">{c.name}</p>
                            {c.phone && <p className="text-[10px] text-gray-400">{c.phone}</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-200 rounded-lg p-4 shadow-xs relative">
                  
                  {/* Bill To Column */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Billing Address</span>
                    <p className="text-xs font-bold text-gray-800">{customerName}</p>
                    {selectedCustomer?.phone && <p className="text-[10px] text-gray-500 font-mono">Ph: {selectedCustomer.phone}</p>}
                    {selectedCustomer?.gstin && <p className="text-[10px] text-gray-500 font-mono">GSTIN: {selectedCustomer.gstin}</p>}
                    {selectedCustomer?.address && <p className="text-[10px] text-gray-400 leading-normal">{selectedCustomer.address}</p>}
                    <button 
                      onClick={() => setCustomerName("")}
                      className="text-[9px] text-indigo-600 hover:underline font-bold uppercase tracking-wider mt-1 block"
                    >
                      Change Party
                    </button>
                  </div>

                  {/* Ship To Column */}
                  <div className="space-y-1 border-l border-gray-100 pl-4">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Shipping Address</span>
                    <p className="text-xs font-bold text-gray-700">{customerName}</p>
                    {selectedCustomer?.phone && <p className="text-[10px] text-gray-400 font-mono">Ph: {selectedCustomer.phone}</p>}
                    <span className="text-[9px] text-gray-400 block mt-1">Same as billing address</span>
                    <button className="text-[9px] text-gray-400 hover:underline font-bold uppercase tracking-wider mt-1 block">
                      Change Shipping Address
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Meta Details Panel */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-x-4 gap-y-3 shadow-xs">
              
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice No.</label>
                <input 
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full border-b border-gray-200 py-1 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 font-mono font-bold" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Date</label>
                <input 
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full border-b border-gray-200 py-1 text-xs focus:outline-none focus:border-indigo-500 text-gray-600" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full border-b border-gray-200 py-1 text-xs focus:outline-none focus:border-indigo-500 bg-white cursor-pointer text-gray-600 font-semibold"
                >
                  <option value="30">30 days</option>
                  <option value="15">15 days</option>
                  <option value="0">Due on Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Due Date</label>
                <input 
                  type="date"
                  value={dueDate}
                  disabled
                  className="w-full border-b border-gray-200 py-1 text-xs text-gray-400 bg-transparent" 
                />
              </div>

            </div>

          </div>

          {/* DENSE ITEM TRANSACTIONS SHEET */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-2.5 w-10 text-center">NO</th>
                  <th className="px-4 py-2.5 min-w-[280px]">ITEMS / SERVICES</th>
                  <th className="px-4 py-2.5 w-24">HSN / SAC</th>
                  <th className="px-4 py-2.5 w-24">QTY</th>
                  <th className="px-4 py-2.5 w-28">PRICE/ITEM (₹)</th>
                  <th className="px-4 py-2.5 w-24">DISCOUNT</th>
                  <th className="px-4 py-2.5 w-32">TAX (GST)</th>
                  <th className="px-4 py-2.5 w-32 text-right">AMOUNT (₹)</th>
                  <th className="px-4 py-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/30">
                    <td className="px-4 py-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                    
                    {/* Item Name Lookup Dropdown */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <select
                          value={item.productId || ""}
                          onChange={(e) => {
                            const found = products.find(p => p.id === e.target.value);
                            if (found) {
                              const updated = [...items];
                              updated[idx] = {
                                productId: found.id,
                                name: found.name,
                                price: found.price,
                                qty: 1,
                                gstRate: found.gst || 18,
                                hsn: found.hsnCode || "",
                              };
                              setItems(updated);
                            }
                          }}
                          className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                        >
                          <option value="">Select Item / Product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.stock} {p.unit})
                            </option>
                          ))}
                        </select>
                        <input 
                          type="text"
                          placeholder="Enter Description (optional)"
                          className="w-full text-[10px] text-gray-500 bg-transparent border-none focus:ring-0 focus:outline-none p-0" 
                        />
                      </div>
                    </td>

                    {/* HSN Code */}
                    <td className="px-4 py-3">
                      <span className="text-gray-500 font-mono">{item.hsn || "-"}</span>
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 border border-gray-200 rounded overflow-hidden w-20">
                        <input 
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, "qty", e.target.value)}
                          className="w-full px-2 py-1 text-xs focus:outline-none font-mono text-right"
                        />
                      </div>
                    </td>

                    {/* Price/Item */}
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(idx, "price", e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none font-mono text-right"
                      />
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-3">
                      <span className="text-gray-400">-</span>
                    </td>

                    {/* Tax rate displaying absolute calculations */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-gray-700 font-mono">{item.gstRate || 18}%</span>
                        {gstEnabled && (
                          <span className="text-[10px] text-gray-400 block font-mono">
                            (₹ {(((Number(item.qty) || 0) * (Number(item.price) || 0)) * ((item.gstRate || 18) / 100)).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-bold font-mono text-gray-800">
                      ₹ {((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                    </td>

                    {/* Delete action */}
                    <td className="px-4 py-3 text-center">
                      <button 
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Insertion row */}
                <tr>
                  <td colSpan={8} className="p-3">
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={addItem}
                        className="flex-1 border border-dashed border-indigo-200 bg-indigo-50/20 py-2 rounded text-indigo-600 text-xs font-semibold hover:bg-indigo-50 flex items-center justify-center gap-1 shadow-xs transition-all"
                      >
                        <Plus size={13} />
                        <span>Add Product Row</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="w-44 border border-gray-200 py-2 rounded text-gray-700 text-xs font-semibold hover:bg-gray-50 flex items-center justify-center gap-1 shadow-xs transition-all"
                      >
                        <ScanBarcode size={13} className="text-indigo-500" />
                        <span>Scan Item Barcode</span>
                      </button>
                    </div>
                  </td>
                  <td></td>
                </tr>

                {/* Subtotals Row */}
                <tr className="bg-gray-50/30 border-t border-gray-100 font-semibold text-gray-700">
                  <td colSpan={5} className="px-4 py-2.5 text-right text-[10px] text-gray-400 uppercase tracking-wider">Subtotal</td>
                  <td className="px-4 py-2.5">₹ 0.00</td>
                  <td className="px-4 py-2.5 font-mono">₹ {calc.totalGst.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">₹ {calc.subtotal.toFixed(2)}</td>
                  <td></td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* WEBCAM BARCODE SCANNER MODAL */}
          {showScanner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 w-full max-w-lg shadow-2xl">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Webcam Barcode Scanner</span>
                  <button 
                    onClick={() => setShowScanner(false)}
                    className="p-1 rounded text-gray-400 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="p-6 flex flex-col items-center justify-center bg-black min-h-[300px]">
                  <BarcodeScanner
                    width={480}
                    height={280}
                    onUpdate={(err, result) => {
                      if (result) {
                        const code = result.getText();
                        const found = products.find(p => p.barcode === code);
                        if (found) {
                          toast.success(`${found.name} scanned successfully!`);
                          setItems(prev => [
                            ...prev,
                            {
                              productId: found.id,
                              name: found.name,
                              qty: 1,
                              price: found.price,
                              gstRate: found.gst || 18,
                              hsn: found.hsnCode || "",
                            }
                          ]);
                          setShowScanner(false);
                        } else {
                          toast.error(`Barcode ${code} not matches in inventory catalog`);
                          setShowScanner(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* LOWER SPECIFICATION GRID */}
          <div className="flex flex-col lg:flex-row border-t border-gray-200">
            
            {/* Notes & Accounts (Left) */}
            <div className="flex-1 border-r border-gray-200 p-6 space-y-6">
              
              <div className="space-y-3">
                <button className="text-indigo-600 text-xs font-semibold flex items-center gap-1.5 hover:underline">
                  <Plus size={13} />
                  <span>Add Notes & Remarks</span>
                </button>
                
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Terms & Conditions</p>
                  <div className="bg-gray-50 border border-gray-150 p-3 rounded text-[11px] text-gray-500 space-y-1">
                    <p>1. Goods once sold will not be taken back or exchanged.</p>
                    <p>2. All disputes are subject to local state jurisdictions only.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-150 space-y-2.5">
                <button className="text-indigo-600 text-xs font-semibold flex items-center gap-1.5 hover:underline font-bold">
                  <Plus size={13} />
                  <span>Add Bank Account Settings</span>
                </button>
                <button className="text-indigo-600 text-xs font-semibold flex items-center gap-1.5 hover:underline block font-bold">
                  <Plus size={13} />
                  <span>Add Payment Dynamic QR Code</span>
                </button>
              </div>

            </div>

            {/* Calculations & Saving Actions (Right) */}
            <div className="w-full lg:w-[460px] bg-gray-50/20 p-6 space-y-4">
              
              <div className="flex justify-between items-center text-xs text-gray-600">
                <button className="text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
                  <Plus size={12} /> Add Additional Charges
                </button>
                <span className="font-mono">₹ 0.00</span>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600 border-t border-gray-100 pt-2">
                <span>Taxable Amount</span>
                <span className="font-bold font-mono text-gray-700">₹ {calc.subtotal.toFixed(2)}</span>
              </div>

              {/* Dynamic CGST/SGST/IGST breakdown */}
              {gstEnabled && (
                <div className="space-y-1 border-t border-gray-100 pt-2 text-[11px] text-gray-500 font-mono">
                  {isInterstate ? (
                    <div className="flex justify-between">
                      <span>IGST tax breakdown</span>
                      <span className="font-bold">₹ {calc.igst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>CGST tax breakdown</span>
                        <span className="font-bold">₹ {calc.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST tax breakdown</span>
                        <span className="font-bold">₹ {calc.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-gray-600 border-t border-gray-100 pt-2">
                <button className="text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
                  <Plus size={12} /> Add Discount Value
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="border border-gray-200 rounded px-1 text-[10px] focus:outline-none bg-white text-gray-500"
                  >
                    <option value="flat">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <input 
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(sanitizeNumericInput(e.target.value))}
                    className="border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none font-mono text-right w-16"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600 border-t border-gray-100 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-600">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600" />
                  <span>Auto Round Off</span>
                </label>
                <span className="font-mono text-gray-500">0.00</span>
              </div>

              {/* Huge Invoice Total Display */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-800 text-xs">Total Amount</span>
                <span className="text-lg font-bold font-mono text-indigo-600">
                  ₹ {calc.total.toFixed(2)}
                </span>
              </div>

              {/* Fully Paid toggle + Received Cash */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Amount Received</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                      <input 
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(sanitizeNumericInput(e.target.value))}
                        className="border border-gray-200 rounded py-1 pl-4 pr-1 text-xs focus:outline-none font-mono text-right w-24"
                      />
                    </div>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="border border-gray-200 rounded py-1 text-[10px] focus:outline-none bg-white text-gray-600 font-semibold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider cursor-pointer">
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleMarkFullyPaid(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600" 
                    />
                    <span>Mark as fully paid</span>
                  </label>
                </div>
              </div>

              {/* Balance remaining */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="font-bold text-green-600 text-xs">Balance Amount</span>
                <span className="font-bold font-mono text-green-600">
                  ₹ {Math.max(0, calc.total - Number(amountReceived || 0)).toFixed(2)}
                </span>
              </div>

              {/* Billing transaction Type selection */}
              <div className="border-t border-gray-150 pt-3">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Invoice Type</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as any)}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600"
                >
                  <option value="invoice">Tax Invoice (Deducts Stock)</option>
                  <option value="estimate">Estimate / Quotation (Skips Stock)</option>
                </select>
              </div>

              {/* Signature container */}
              <div className="pt-4 flex justify-end">
                <div className="w-40 text-right space-y-1">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">Authorized Signatory for <span className="font-bold text-gray-700">self</span></p>
                  <button className="w-full h-12 border border-dashed border-indigo-200 bg-indigo-50/20 rounded flex items-center justify-center text-indigo-600 text-[10px] font-semibold hover:bg-indigo-50 transition-colors">
                    <Plus size={11} className="mr-0.5" />
                    <span>Add Signature</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Quick Add New Customer</span>
              <button 
                onClick={() => setShowAddCustomer(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-gray-600">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Name *</label>
                <input 
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  placeholder="e.g. John Doe"
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <input 
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="e.g. 9876543210"
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">GSTIN</label>
                  <input 
                    type="text"
                    value={newCustomer.gstin}
                    onChange={(e) => setNewCustomer({...newCustomer, gstin: e.target.value})}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">State (For GST Tax Calculations)</label>
                <select
                  value={newCustomer.state}
                  onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="">Select State...</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Address</label>
                <textarea 
                  rows={2}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  placeholder="e.g. 123 Street, City"
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomer}
                  disabled={addingCustomer}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold shadow-sm transition-all"
                >
                  {addingCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}