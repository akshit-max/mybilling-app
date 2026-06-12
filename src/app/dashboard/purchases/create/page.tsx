"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2, Share2, ScanBarcode, Plus, ChevronDown, Check, Trash2, Eye, FileText, Landmark, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

import { sanitizeNumericInput } from "@/lib/sanitize";
import { calculateInvoice, DiscountType, getItemBaseAmount } from "@/lib/calcInvoice";
import { syncInventory } from "@/lib/inventorySync";
import { v4 as uuidv4 } from "uuid";
import { INDIAN_STATES } from "@/lib/indianStates";

// We'll lazy import BarcodeScanner so it doesn't break SSR / static builds
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
  unit?: string;
};

export default function CreateSalesInvoice() {
  const router = useRouter();

  // Invoice state
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, price: 0, gstRate: 18, description: "" }]);
  const [discountType, setDiscountType] = useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState<number | string>(0);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [status, setStatus] = useState<"paid" | "pending" | "credit">("paid");
  const [dueDate, setDueDate] = useState("");
  const [invoiceType, setInvoiceType] = useState<"invoice" | "estimate">("invoice");
  const [purchaseInvoiceNumber, setInvoiceNumber] = useState("");
  const [originalInvoiceNumber, setOriginalInvNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [amountPaid, setAmountReceived] = useState<number | string>(0);
  const [paymentMode, setPaymentMode] = useState("Cash");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [companyState, setCompanyState] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  // Extended Custom States
  const [shippingAddress, setShippingAddress] = useState("");
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [additionalChargeName, setAdditionalChargeName] = useState("Transport Charges");
  const [additionalChargeValue, setAdditionalChargeValue] = useState<number | string>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [autoRoundOff, setAutoRoundOff] = useState(true);

  // Bank Account modal states
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showBankModal, setShowBankModal] = useState(false);
  const [newBank, setNewBank] = useState({
    name: "",
    balance: "",
    asOfDate: new Date().toISOString().split("T")[0],
    accountNumber: "",
    reAccountNumber: "",
    holderName: "",
    ifsc: "",
    bankName: "",
    branchName: "",
    upiId: "",
    addDetails: true
  });

  // Dynamic QR Code select states
  const [selectedQRBankId, setSelectedQRBankId] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);

  // Quick settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState({
    prefixEnabled: false,
    purchasePriceEnabled: true,
    itemImageEnabled: false,
    priceHistoryEnabled: false,
    invoiceTheme: "Stylish"
  });

  // Signature States
  const [signatureType, setSignatureType] = useState<"upload" | "empty" | "">("");
  const [signatureImage, setSignatureImage] = useState("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showEmptySigModal, setShowEmptySigModal] = useState(false);

  // New customer quick add fields
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    gstin: "",
    state: "",
    category: "",
  });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Fetch initial collections
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {

        // Check URL for fromQuote
        const params = new URLSearchParams(window.location.search);
        const fromQuoteId = params.get("fromQuote");
        if (fromQuoteId) {
          try {
            const snap = await getDoc(doc(db, "invoices", fromQuoteId));
            if (snap.exists()) {
              const qData = snap.data();
              if (qData.customerName) setCustomerName(qData.customerName);
              if (qData.items && qData.items.length) {
                // Ensure gstRate fallback is there
                const mappedItems = qData.items.map((i: any) => ({...i, gstRate: i.gstRate ?? 18}));
                setItems(mappedItems);
              }
              if (qData.shippingAddress) setShippingAddress(qData.shippingAddress);
              if (qData.notes) {
                 setNotes(qData.notes);
                 setShowNotes(true);
              }
              if (qData.discountType) setDiscountType(qData.discountType);
              if (qData.discountValue) {
                setDiscountValue(qData.discountValue);
                setShowDiscountInput(true);
              }
              if (qData.additionalChargeName) setAdditionalChargeName(qData.additionalChargeName);
              if (qData.additionalChargeValue) setAdditionalChargeValue(qData.additionalChargeValue);
              toast.success("Converted Quotation data loaded! Review and Save as Invoice.");
            }
          } catch (e) {
            console.error("Failed to load quote", e);
          }
        }

        // Fetch Customers
        try {
          if (!navigator.onLine) throw new Error("Offline");
          const cq = query(collection(db, "customers"), where("userId", "==", user.uid));
          const csnap = await getDocs(cq);
          const cList = csnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              ...data,
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
        } catch (err) {
          const { getCachedCustomers } = await import("@/lib/indexedDB");
          const cached = await getCachedCustomers(user.uid);
          setCustomers(cached as any || []);
        }

        // Fetch Categories
        try {
          const catSnap = await getDocs(
            query(collection(db, "customerCategories"), where("userId", "==", user.uid))
          );
          const catList = catSnap.docs.map(d => ({
            id: d.id,
            name: d.data().name || ""
          }));
          setCategories(catList);
        } catch (err) {
          console.error("Categories fetch error:", err);
        }

        // Fetch Products
        try {
          if (!navigator.onLine) throw new Error("Offline");
          const pq = query(collection(db, "products"), where("userId", "==", user.uid));
          const psnap = await getDocs(pq);
          const pList = psnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              ...data,
              id: docSnap.id,
              name: data.name || "Unknown Product",
              price: Number(data.price || 0),
              barcode: data.barcode || "",
              gst: Number(data.gst !== undefined ? data.gst : 18),
              hsnCode: data.hsnCode || "",
              costPrice: Number(data.costPrice || 0),
              stock: Number(data.stock || 0),
              unit: data.unit || "PCS",
            };
          });
          setProducts(pList);
          const { cacheProducts } = await import("@/lib/indexedDB");
          await cacheProducts(pList);
        } catch (err) {
          const { getCachedProducts } = await import("@/lib/indexedDB");
          const cached = await getCachedProducts(user.uid);
          setProducts(cached as any || []);
        }

        // Generate invoice sequential number
        try {
          const snap = await getDocs(query(collection(db, "purchases"), where("userId", "==", user.uid)));
          setInvoiceNumber((snap.size + 1).toString());
        } catch {
          setInvoiceNumber((Math.floor(1000 + Math.random() * 9000)).toString());
        }

        // Fetch Company setting state
        try {
          const settingsSnap = await getDoc(doc(db, "settings", user.uid));
          if (settingsSnap.exists()) {
            setCompanyState((settingsSnap.data().state || "").trim());
          }
        } catch {
          // Defaults to CGST + SGST
        }

        // Fetch Bank Accounts
        try {
          const bq = query(collection(db, "bankAccounts"), where("userId", "==", user.uid));
          const bsnap = await getDocs(bq);
          const bList = bsnap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
          setBankAccounts(bList);
          if (bList.length > 0) {
            setSelectedBankId(bList[0].id);
          }
        } catch (err) {
          console.error("Bank accounts fetch error:", err);
        }

      } catch (err) {
        console.error(err);
        toast.error("Failed to load invoice workspace configurations");
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
  }, []);

  // Sync Shipping Address automatically
  useEffect(() => {
    if (selectedCustomer) {
      setShippingAddress(selectedCustomer.address || "");
    } else {
      setShippingAddress("");
    }
  }, [customerName, customers]);

  // Sync selectedBankId when payment mode is changed to a bank option
  useEffect(() => {
    if (paymentMode !== "Cash" && !selectedBankId && bankAccounts.length > 0) {
      const activeBank = bankAccounts.find(b => b.status !== "inactive") || bankAccounts[0];
      setSelectedBankId(activeBank.id);
    }
  }, [paymentMode, bankAccounts, selectedBankId]);

  // Update payment terms or dates
  useEffect(() => {
    if (paymentTerms && invoiceDate) {
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + Number(paymentTerms || 0));
      setDueDate(date.toISOString().split("T")[0]);
    }
  }, [paymentTerms, invoiceDate]);

  // Save new Bank Account to Firestore
  const handleSaveBank = async () => {
    if (!newBank.name.trim()) return toast.error("Account Name is required");
    if (newBank.addDetails) {
      if (!newBank.accountNumber.trim()) return toast.error("Account Number is required");
      if (newBank.accountNumber !== newBank.reAccountNumber) return toast.error("Account Numbers do not match");
      if (!newBank.holderName.trim()) return toast.error("Account Holder Name is required");
      if (!newBank.ifsc.trim()) return toast.error("IFSC Code is required");
      if (!newBank.bankName.trim()) return toast.error("Bank Name is required");
      if (!newBank.branchName.trim()) return toast.error("Branch Name is required");
    }

    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      const bankData = {
        userId: user.uid,
        name: newBank.name.trim(),
        balance: Number(newBank.balance || 0),
        asOfDate: newBank.asOfDate,
        accountNumber: newBank.accountNumber.trim(),
        holderName: newBank.holderName.trim(),
        ifsc: newBank.ifsc.trim().toUpperCase(),
        bankName: newBank.bankName.trim(),
        branchName: newBank.branchName.trim(),
        upiId: newBank.upiId.trim(),
        addDetails: newBank.addDetails,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "bankAccounts"), bankData);
      const addedBank = { id: docRef.id, ...bankData };
      setBankAccounts(prev => [...prev, addedBank]);
      setSelectedBankId(docRef.id);
      setShowBankModal(false);
      setNewBank({
        name: "",
        balance: "",
        asOfDate: new Date().toISOString().split("T")[0],
        accountNumber: "",
        reAccountNumber: "",
        holderName: "",
        ifsc: "",
        bankName: "",
        branchName: "",
        upiId: "",
        addDetails: true
      });
      toast.success("Bank Account added successfully! 🏦");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add bank account");
    }
  };

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

  const rawTotal = calc.total + Number(additionalChargeValue || 0);
  const roundedTotal = Math.round(rawTotal);
  const roundOffAmount = roundedTotal - rawTotal;
  const finalTotal = autoRoundOff ? roundedTotal : rawTotal;

  // Sync Amount Paid on Fully Paid toggle
  const handleMarkFullyPaid = (checked: boolean) => {
    if (checked) {
      setAmountReceived(finalTotal.toFixed(2));
      setStatus("paid");
    } else {
      setAmountReceived(0);
      setStatus("pending");
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSignatureImage(event.target.result as string);
          setSignatureType("upload");
          setShowSignatureModal(false);
          setShowEmptySigModal(false);
          toast.success("Signature uploaded successfully! ✍️");
        }
      };
      reader.readAsDataURL(file);
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
        category: newCustomer.category,
        createdAt: new Date(),
      };

      // Set online
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
      setNewCustomer({ name: "", phone: "", address: "", gstin: "", state: "", category: "" });
      toast.success("Customer added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to quick add customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleSave = async (isNew = false) => {
    if (!customerName) return toast.error("Please select a customer first");
    if (!validItems.length) return toast.error("Please add at least one valid item");
    if (!purchaseInvoiceNumber.trim()) return toast.error("Purchase Invoice Number is required");

    if (calc.discountAmount > calc.subtotal) {
      return toast.error("Discount cannot exceed subtotal");
    }

    const user = auth.currentUser;
    if (!user) return toast.error("Access denied. Please authenticate.");

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

      

      const rawTotal = calc.total + Number(additionalChargeValue || 0);
      const roundedTotal = Math.round(rawTotal);
      const roundOffAmount = roundedTotal - rawTotal;
      const finalTotal = autoRoundOff ? roundedTotal : rawTotal;

      const invoiceData = {
        userId: user.uid,
        total: finalTotal,
        customerName,
        customerGSTIN: selectedCustomer?.gstin || "",
        customerPhone: selectedCustomer?.phone || "",
        purchaseInvoiceNumber,
        date: invoiceDate,
        dueDate: dueDate,
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
        status: Number(amountPaid) >= finalTotal ? "paid" : "pending",
        invoiceType,
        amountPaid: Number(amountPaid),
        paymentMode,
        createdAt: new Date(),
        createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "",
        // New extended fields
        shippingAddress,
        notes,
        additionalChargeName,
        additionalChargeValue: Number(additionalChargeValue),
        autoRoundOff,
        roundOffAmount,
        selectedBankId: paymentMode === "Cash" ? "" : selectedBankId,
        selectedQRBankId,
        settings: invoiceSettings,
        signatureType,
        signatureImage
      };

      if (isOfflineMode) {
        const { saveOfflineInvoice } = await import("@/lib/offlineInvoices");
        const { getCachedProducts, cacheProducts } = await import("@/lib/indexedDB");
        
        // Increase stocks from cache for purchases
        const cachedProducts = await getCachedProducts(user.uid);
        for (const item of validItems) {
          if (item.productId) {
            const idx = cachedProducts.findIndex((p: any) => p.id === item.productId);
            if (idx > -1) {
              const stock = cachedProducts[idx].stock || 0;
              cachedProducts[idx].stock = stock + item.qty;
            }
          }
        }
        await cacheProducts(cachedProducts);

        await saveOfflineInvoice(invoiceData as any);
        toast.success("Purchase saved offline draft ✅");
        if (isNew) {
          window.location.reload();
        } else {
          window.location.href = "/dashboard/purchases";
        }
        return;
      }

      

      // --- ONLINE SAVING ---
      if (invoiceType === "invoice" || !invoiceType) {
        const itemsToSync = validItems.filter(i => i.productId).map(i => ({
          id: i.productId!,
          quantity: i.qty
        }));
        if (itemsToSync.length > 0) {
          try {
            await syncInventory(user.uid, itemsToSync, "INCREASE");
          } catch (err: any) {
            return toast.error(err.message || "Failed to sync inventory stock.");
          }
        }
      }

      const purchaseDocRef = await addDoc(collection(db, "purchases"), invoiceData);

      // Update Cash & Bank ledger for purchase payment (money going OUT)
      const amountPaidNum = Number(amountPaid);
      if (amountPaidNum > 0) {
        try {
          const isCash = paymentMode === "Cash";
          let newBalance = 0;
          if (isCash) {
            const sRef = doc(db, "settings", user.uid);
            const sSnap = await getDoc(sRef);
            const currentCash = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
            newBalance = Math.max(0, currentCash - amountPaidNum);
            await updateDoc(sRef, { cashInHand: newBalance });
          } else if (selectedBankId) {
            const bRef = doc(db, "bankAccounts", selectedBankId);
            const bSnap = await getDoc(bRef);
            const currentBank = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
            newBalance = Math.max(0, currentBank - amountPaidNum);
            await updateDoc(bRef, { balance: newBalance });
          }
          await addDoc(collection(db, "cashBankTransactions"), {
            userId: user.uid,
            accountId: isCash ? "cash" : (selectedBankId || "bank"),
            type: "Purchase Invoice",
            txnNo: purchaseInvoiceNumber,
            date: invoiceDate,
            party: customerName,
            mode: isCash ? "Cash" : "Bank",
            paid: amountPaidNum,
            received: 0,
            balanceAfter: newBalance,
            remarks: `Paid against Purchase #${purchaseInvoiceNumber}`,
            createdAt: new Date()
          });
        } catch (cashErr) {
          console.error("Cash/Bank ledger update failed:", cashErr);
        }
      }

      toast.success("Purchase Invoice created successfully! ✅");
      if (isNew) {
        window.location.reload();
      } else {
        window.location.href = "/dashboard/purchases";
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to save Purchase Invoice");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-12 text-gray-400 gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold">Configuring invoice workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* ENTERPRISE ACTION HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchases" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Create Purchase Invoice</h1>
            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">New Transaction</span>
          </div>
        </div>

        <div className="flex items-center gap-2">

          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded bg-white hover:bg-gray-50 font-semibold transition-colors shadow-sm"
          >
            <Settings2 size={13} className="text-gray-500" />
            <span>Settings</span>
          </button>
          <button 
            onClick={() => handleSave(true)}
            disabled={saving}
            className="text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 px-4 py-1.5 rounded hover:bg-indigo-100 font-bold shadow-sm transition-all disabled:opacity-50"
          >
            Save & New
          </button>
          <button 
            onClick={() => handleSave(false)}
            disabled={saving}
            className="text-xs text-white bg-indigo-600 border border-indigo-600 px-6 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
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
            
            {/* Bill From Info */}
            <div className="lg:col-span-2 space-y-3">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bill From & Ship To Details</span>
              
              {!customerName ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                    className="w-full max-w-md h-20 border-2 border-dashed border-indigo-200 rounded-lg flex flex-col items-center justify-center text-indigo-600 hover:bg-indigo-50/50 transition-all gap-1 text-xs font-semibold"
                  >
                    <Plus size={16} />
                    <span>+ Add Party</span>
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
                  
                  {/* Bill From Column */}
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
                    {isEditingShipping ? (
                      <div className="space-y-1 mt-1">
                        <textarea
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          rows={2}
                          placeholder="Enter custom shipping address..."
                          className="w-full border border-gray-200 rounded p-1 text-[10px] focus:outline-none focus:border-indigo-500 bg-white"
                        />
                        <button
                          onClick={() => setIsEditingShipping(false)}
                          className="text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-bold uppercase transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        {shippingAddress ? (
                          <p className="text-[10px] text-gray-500 leading-normal font-medium">{shippingAddress}</p>
                        ) : (
                          <span className="text-[9px] text-gray-400 block mt-1">Same as billing address</span>
                        )}
                        <button 
                          onClick={() => setIsEditingShipping(true)}
                          className="text-[9px] text-indigo-600 hover:underline font-bold uppercase tracking-wider mt-1 block"
                        >
                          Change Shipping Address
                        </button>
                      </>
                    )}
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
                  value={purchaseInvoiceNumber}
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
                <div className="flex items-center gap-1 border-b border-gray-200 py-1">
                  <input
                    type="number"
                    min="0"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs font-semibold focus:outline-none font-mono text-gray-700"
                    placeholder="e.g. 30"
                  />
                  <span className="text-[10px] text-gray-400 font-bold uppercase">days</span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Due Date</label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border-b border-gray-200 py-1 text-xs text-gray-600 focus:outline-none focus:border-indigo-500 bg-transparent" 
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
                  <tr key={idx} className="hover:bg-gray-50/30 border-b border-gray-100">
                    <td className="px-4 py-4 text-center text-gray-400 font-mono align-top">{idx + 1}</td>
                    
                    {/* Item Name Lookup Autocomplete */}
                    <td className="px-4 py-4 max-w-[320px] whitespace-normal relative">
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          placeholder="Search or enter item name..."
                          value={item.name || ""}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-700 bg-white"
                        />

                        {/* Optional Autocomplete match */}
                        {item.name && !products.find(p => p.name === item.name) && (
                          <div className="absolute left-4 right-4 mt-8 bg-white border border-gray-200 rounded shadow-lg max-h-32 overflow-y-auto z-50">
                            {products
                              .filter(p => p.name.toLowerCase().includes(item.name.toLowerCase()))
                              .map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    updated[idx] = {
                                      productId: p.id,
                                      name: p.name,
                                      qty: 1,
                                      price: p.price,
                                      gstRate: p.gst !== undefined && p.gst !== null ? Number(p.gst) : 18,
                                      hsn: p.hsnCode || "",
                                      description: ""
                                    };
                                    setItems(updated);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-600 font-semibold"
                                >
                                  {p.name} (Stock: {p.stock} {p.unit})
                                </button>
                              ))
                            }
                          </div>
                        )}

                        <input 
                          type="text"
                          value={item.description || ""}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          placeholder="Enter Description (optional)"
                          className="w-full text-[10px] text-gray-500 bg-transparent border-t border-dashed border-gray-200 focus:border-indigo-400 focus:ring-0 focus:outline-none py-1 px-1 mt-1 block" 
                        />
                      </div>
                    </td>

                    {/* HSN Code - editable input */}
                    <td className="px-4 py-4 align-top">
                      <input
                        type="text"
                        value={item.hsn || ""}
                        onChange={(e) => updateItem(idx, "hsn", e.target.value)}
                        placeholder="HSN/SAC"
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono bg-white block mt-0.5"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-1 border border-gray-200 rounded overflow-hidden w-20 bg-white block mt-0.5">
                        <input 
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, "qty", e.target.value)}
                          className="w-full px-2 py-1 text-xs focus:outline-none font-mono text-right font-medium"
                        />
                      </div>
                    </td>

                    {/* Price/Item */}
                    <td className="px-4 py-4 align-top">
                      <input 
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(idx, "price", e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none font-mono text-right font-medium bg-white block mt-0.5"
                      />
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white mt-0.5 w-28">
                        <select
                          value={(item as any).discountType ?? "percent"}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], discountType: e.target.value } as any;
                            setItems(updated);
                          }}
                          className="px-1 py-1 text-[10px] font-bold text-gray-500 bg-transparent border-r border-gray-200 focus:outline-none cursor-pointer"
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
                            setItems(updated);
                          }}
                          placeholder="0"
                          className="w-full px-2 py-1 text-xs focus:outline-none font-mono text-right bg-transparent"
                        />
                      </div>
                    </td>

                    {/* Tax rate displaying absolute calculations - editable select */}
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1 mt-0.5">
                        <select
                          value={item.gstRate ?? 18}
                          onChange={(e) => updateItem(idx, "gstRate", Number(e.target.value))}
                          className="border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                        {gstEnabled && (
                          <span className="text-[10px] text-gray-400 block font-mono">
                            (₹ {(getItemBaseAmount(item) * ((item.gstRate ?? 18) / 100)).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 text-right font-bold font-mono text-gray-800 align-top">
                      <span className="block mt-1">₹ {getItemBaseAmount(item).toFixed(2)}</span>
                    </td>

                    {/* Delete action */}
                    <td className="px-4 py-4 text-center align-top">
                      <button 
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 block mt-0.5"
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
                  <td className="px-4 py-2.5">₹ {items.reduce((sum, item) => sum + (((Number(item.qty) || 0) * (Number(item.price) || 0)) - getItemBaseAmount(item)), 0).toFixed(2)}</td>
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
                              gstRate: found.gst ?? 18,
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
                <button 
                  onClick={() => setShowNotes(!showNotes)} 
                  className="text-indigo-600 text-xs font-semibold flex items-center gap-1.5 hover:underline"
                >
                  <Plus size={13} />
                  <span>{showNotes ? "Hide Notes & Remarks" : "Add Notes & Remarks"}</span>
                </button>

                {showNotes && (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter notes, terms, remarks, bank instructions, etc..."
                    rows={3}
                    className="w-full border border-gray-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                  />
                )}
                
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Terms & Conditions</p>
                  <div className="bg-gray-50 border border-gray-150 p-3 rounded text-[11px] text-gray-500 space-y-1">
                    <p>1. Goods once sold will not be taken back or exchanged.</p>
                    <p>2. All disputes are subject to local state jurisdictions only.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-150 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Bank Account Profile</label>
                    <button 
                      onClick={() => setShowBankModal(true)} 
                      className="text-indigo-600 text-[10px] font-bold uppercase hover:underline"
                    >
                      + Add Bank Account Settings
                    </button>
                  </div>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-655"
                  >
                    <option value="">No Active Account Selected</option>
                    {bankAccounts.filter((b: any) => b.status !== "inactive").map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name} (A/C: {bank.accountNumber || "UPI Profile"})</option>
                    ))}
                  </select>
                </div>
                {selectedBankId && (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setSelectedBankId("")} 
                      className="text-red-500 text-[10px] hover:underline uppercase font-bold"
                    >
                      Remove Bank
                    </button>
                  </div>
                )}

                {selectedBankId && (
                  (() => {
                    const bank = bankAccounts.find(b => b.id === selectedBankId);
                    if (!bank) return null;
                    return (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded p-3 text-xs text-gray-700 space-y-1">
                        <p className="font-bold text-indigo-700">{bank.name}</p>
                        {bank.accountNumber && <p className="font-mono text-[10px]">A/C No: {bank.accountNumber}</p>}
                        {bank.bankName && <p className="text-[10px] text-gray-500">{bank.bankName} - {bank.branchName}</p>}
                        {bank.ifsc && <p className="font-mono text-[10px]">IFSC: {bank.ifsc}</p>}
                      </div>
                    );
                  })()
                )}

                <div className="flex items-center justify-between pt-1">
                  <button 
                    onClick={() => setShowQRModal(true)} 
                    className="text-indigo-600 text-xs font-semibold flex items-center gap-1.5 hover:underline block"
                  >
                    <Landmark size={13} className="text-indigo-500" />
                    <span>{selectedQRBankId ? "Change Payment QR Code" : "+ Add Payment Dynamic QR Code"}</span>
                  </button>
                  {selectedQRBankId && (
                    <button 
                      onClick={() => setSelectedQRBankId("")} 
                      className="text-red-500 text-[10px] hover:underline uppercase font-bold"
                    >
                      Remove QR
                    </button>
                  )}
                </div>

                {selectedQRBankId && (
                  (() => {
                    const qrBank = bankAccounts.find(b => b.id === selectedQRBankId);
                    if (!qrBank) return null;
                    return (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded p-3 text-xs text-gray-700 flex items-center gap-3">
                        <div className="p-1.5 bg-white border border-emerald-200 rounded">
                          {/* Mock dynamic QR indicator */}
                          <div className="w-8 h-8 bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400 font-mono">QR</div>
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-emerald-700">Dynamic Scan-to-Pay Connected</p>
                          <p className="text-[10px] text-gray-500">UPI ID: {qrBank.upiId || `${qrBank.accountNumber}@upi`}</p>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

            </div>

            {/* Calculations & Saving Actions (Right) */}
            <div className="w-full lg:w-[460px] bg-gray-50/20 p-6 space-y-4">
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                    <Plus size={12} className="text-indigo-500" /> Add Additional Charges
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={additionalChargeName}
                      onChange={(e) => setAdditionalChargeName(e.target.value)}
                      placeholder="e.g. Transport Charge"
                      className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none w-32 bg-white"
                    />
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                      <input 
                        type="number"
                        value={additionalChargeValue}
                        onChange={(e) => setAdditionalChargeValue(sanitizeNumericInput(e.target.value))}
                        className="border border-gray-200 rounded py-0.5 pl-4 pr-1 text-xs focus:outline-none font-mono text-right w-20 bg-white"
                      />
                    </div>
                  </div>
                </div>
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
                <button 
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Plus size={12} /> {showDiscountInput ? "Hide Discount" : "Add Discount Value"}
                </button>
                
                {showDiscountInput && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="border border-gray-200 rounded px-1 py-0.5 text-[10px] focus:outline-none bg-white text-gray-500 font-bold"
                    >
                      <option value="flat">₹</option>
                      <option value="percent">%</option>
                    </select>
                    <input 
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(sanitizeNumericInput(e.target.value))}
                      className="border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none font-mono text-right w-16 bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600 border-t border-gray-100 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-600">
                  <input 
                    type="checkbox" 
                    checked={autoRoundOff} 
                    onChange={(e) => setAutoRoundOff(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span>Auto Round Off</span>
                </label>
                <span className="font-mono text-gray-500">
                  {roundOffAmount >= 0 ? "+" : ""}{roundOffAmount.toFixed(2)}
                </span>
              </div>

              {/* Huge Invoice Total Display */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-800 text-xs">Total Amount</span>
                <span className="text-lg font-bold font-mono text-indigo-600">
                  ₹ {finalTotal.toFixed(2)}
                </span>
              </div>

              {/* Fully Paid toggle + Received Cash */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Amount Paid</span>
                  <div className="flex items-center gap-2">
                    <div className="relative bg-white rounded">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                      <input 
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountReceived(sanitizeNumericInput(e.target.value))}
                        className="border border-gray-200 rounded py-1 pl-4 pr-1 text-xs focus:outline-none font-mono text-right w-24"
                      />
                    </div>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="border border-gray-200 rounded py-1 text-[10px] focus:outline-none bg-white text-gray-600 font-semibold cursor-pointer"
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
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAmountReceived(finalTotal.toFixed(2));
                          setStatus("paid");
                        } else {
                          setAmountReceived(0);
                          setStatus("pending");
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600" 
                    />
                    <span>Mark as fully paid</span>
                  </label>
                </div>
              </div>

              {/* Balance remaining */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="font-bold text-brand-tertiary text-xs">Balance Amount</span>
                <span className="font-bold font-mono text-brand-tertiary">
                  ₹ {Math.max(0, finalTotal - Number(amountPaid || 0)).toFixed(2)}
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
                  
                  {signatureType === "empty" ? (
                    <div className="relative group">
                      <div className="w-full h-14 border border-dashed border-red-400 bg-red-50/10 rounded flex flex-col items-center justify-center text-red-500 text-[9px] font-bold tracking-wider leading-tight">
                        <span>EMPTY SIGNATURE</span>
                        <span>BOX ENABLED</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setSignatureType("");
                          setSignatureImage("");
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-xs transition-colors"
                        title="Remove Signature"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : signatureType === "upload" && signatureImage ? (
                    <div className="relative group">
                      <div className="w-full h-14 border border-gray-200 bg-white rounded flex items-center justify-center p-1.5 overflow-hidden">
                        <img src={signatureImage} alt="Signature Upload" className="max-h-full max-w-full object-contain" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setSignatureType("");
                          setSignatureImage("");
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-xs transition-colors"
                        title="Remove Signature"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setShowSignatureModal(true)}
                      className="w-full h-12 border border-dashed border-indigo-200 bg-indigo-50/20 rounded flex items-center justify-center text-indigo-600 text-[10px] font-semibold hover:bg-indigo-50 transition-colors"
                    >
                      <Plus size={11} className="mr-0.5" />
                      <span>Add Signature</span>
                    </button>
                  )}
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
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={newCustomer.category}
                  onChange={(e) => setNewCustomer({...newCustomer, category: e.target.value})}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white cursor-pointer text-gray-700 font-medium"
                >
                  <option value="">None (-)</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
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
                  className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold transition-colors"
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

      {/* QUICK INVOICE SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 size={14} className="text-indigo-500" />
                Quick Invoice Settings
              </span>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-gray-600">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-700">Invoice Prefix & Sequence Number</p>
                  <p className="text-[10px] text-gray-400">Add customizable letters before digits (e.g. INV/2026/)</p>
                </div>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.prefixEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, prefixEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4.5 h-4.5"
                />
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-700">Show Purchase Price While Adding Items</p>
                  <p className="text-[10px] text-gray-400">Allows viewing cost details directly inside row select</p>
                </div>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.purchasePriceEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, purchasePriceEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4.5 h-4.5"
                />
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-700">Show Item Image On Invoice PDF</p>
                  <p className="text-[10px] text-gray-400">Include catalog photo preview in standard templates</p>
                </div>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.itemImageEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, itemImageEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4.5 h-4.5"
                />
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-700">Enable Price History Lookup</p>
                  <p className="text-[10px] text-gray-400">Show recent transaction rates for the selected customer</p>
                </div>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.priceHistoryEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, priceHistoryEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4.5 h-4.5"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Choose Invoice Theme</label>
                <select
                  value={invoiceSettings.invoiceTheme}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceTheme: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-medium text-gray-700 cursor-pointer"
                >
                  <option value="Stylish">Stylish Theme (Modern Accent)</option>
                  <option value="Simple">Simple Theme (Clean Gray)</option>
                  <option value="Modern">Modern Theme (High Tech)</option>
                </select>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-1.5 rounded font-bold shadow-sm transition-all"
                >
                  Save & Apply Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD BANK ACCOUNT MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg my-8 overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
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
                        placeholder="Holder name"
                        value={newBank.holderName}
                        onChange={(e) => setNewBank({ ...newBank, holderName: e.target.value })}
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
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono uppercase"
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
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Branch Name *</label>
                      <input 
                        type="text"
                        placeholder="Branch location"
                        value={newBank.branchName}
                        onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">UPI ID (For Dynamic QR Codes)</label>
                    <input 
                      type="text"
                      placeholder="e.g. shopowner@okhdfc"
                      value={newBank.upiId}
                      onChange={(e) => setNewBank({ ...newBank, upiId: e.target.value })}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
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
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold shadow-sm transition-all"
                >
                  Add Account
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SELECT PAYMENT QR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark size={14} className="text-indigo-500" />
                Select Payment QR Code
              </span>
              <button 
                onClick={() => setShowQRModal(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-gray-600">
              {bankAccounts.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                    <Landmark size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-700">No bank accounts found</p>
                    <p className="text-[10px] text-gray-400">Please add a bank account with UPI ID first to generate payment QR code</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowQRModal(false);
                      setShowBankModal(true);
                    }}
                    className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded font-bold shadow-xs transition-colors"
                  >
                    Add Bank Account
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Connected Bank UPI Accounts</p>
                  <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto border border-gray-200 rounded">
                    {bankAccounts.map(bank => (
                      <button
                        key={bank.id}
                        onClick={() => {
                          setSelectedQRBankId(bank.id);
                          setShowQRModal(false);
                          toast.success(`Dynamic QR Payment connected to ${bank.name}! 📱`);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors ${selectedQRBankId === bank.id ? "bg-indigo-50/40" : ""}`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-700">{bank.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{bank.upiId || "No UPI ID listed"}</p>
                        </div>
                        {selectedQRBankId === bank.id && (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[8px] font-bold">✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-150 pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN SIGNATURE UPLOAD INPUT */}
      <input 
        type="file"
        id="sig-upload-input"
        className="hidden"
        accept="image/*"
        onChange={handleSignatureUpload}
      />

      {/* SIGNATURE SELECTION MODAL */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                Signature
              </span>
              <button 
                onClick={() => setShowSignatureModal(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                
                {/* Option 1: Upload from Desktop */}
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById("sig-upload-input");
                    inputEl?.click();
                  }}
                  className="border border-indigo-100 hover:border-indigo-300 bg-indigo-50/5 hover:bg-indigo-50/20 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100/70 flex items-center justify-center text-indigo-600 transition-all">
                    <Plus size={22} className="stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-gray-800">Upload Signature from Desktop</p>
                  </div>
                </button>

                {/* Option 2: Empty Box placeholder */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSignatureModal(false);
                    setShowEmptySigModal(true);
                  }}
                  className="border border-indigo-100 hover:border-indigo-300 bg-indigo-50/5 hover:bg-indigo-50/20 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100/70 flex items-center justify-center text-indigo-600 transition-all">
                    <div className="w-5 h-5 border-2 border-indigo-600 rounded-sm"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-gray-800">Show Empty Signature Box on Invoice</p>
                  </div>
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY SIGNATURE PREVIEW & CONFIRM MODAL */}
      {showEmptySigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Empty Signature box
              </span>
              <button 
                onClick={() => setShowEmptySigModal(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              
              {/* High fidelity Mini-invoice Preview representation */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative overflow-hidden flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <div className="w-16 h-3 bg-gray-300 rounded-xs"></div>
                  <div className="w-10 h-3 bg-gray-200 rounded-xs"></div>
                </div>
                <div className="space-y-1.5 my-1">
                  <div className="w-full h-2 bg-gray-150 rounded-xs"></div>
                  <div className="w-[85%] h-2 bg-gray-150 rounded-xs"></div>
                </div>
                <div className="flex justify-end pt-3">
                  <div className="w-24 border border-dashed border-red-400 rounded p-2 text-[7px] text-red-500 font-bold text-center leading-normal bg-red-50/15">
                    Authorized Signatory
                    <div className="h-6 mt-1 border border-dashed border-red-200 rounded-xs flex items-center justify-center text-[5px] text-red-300">
                      Sign Here
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <p className="text-xs text-gray-650 leading-relaxed px-2">
                  Empty box for signature will be shown in invoices and PDFs. You can manually sign invoices.
                </p>
              </div>

              <div className="border-t border-gray-150 pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById("sig-upload-input");
                    inputEl?.click();
                  }}
                  className="text-xs text-gray-700 border border-gray-300 bg-white px-4 py-1.5 rounded-lg hover:bg-gray-100 font-bold transition-colors"
                >
                  Upload Signature
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignatureType("empty");
                    setSignatureImage("");
                    setShowEmptySigModal(false);
                    toast.success("Empty signature box enabled! ✍️");
                  }}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded-lg hover:bg-indigo-700 font-bold shadow-xs transition-all"
                >
                  Confirm
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
