"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Settings2, Share2, ScanBarcode, Plus, ChevronDown, Check, Trash2, Eye, FileText, Landmark, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, updateDoc, doc, getDoc, addDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

import { sanitizeNumericInput, cleanUndefined , capItemDiscountUI, capGlobalDiscountUI } from "@/lib/sanitize";
import { validateDiscount } from "@/lib/validateDiscount";
import { calculateInvoice, DiscountType, getItemBaseAmount } from "@/lib/calcInvoice";
import { v4 as uuidv4 } from "uuid";
import { INDIAN_STATES } from "@/lib/indianStates";

// Lazy import BarcodeScanner so it doesn't break SSR / static builds
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
  discountType?: string;
  discountValue?: number;
  discountPct?: number;
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

export default function EditSalesInvoice() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || (searchParams?.get("id") as string);

  // Invoice state
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, price: 0, gstRate: 18, description: "" }]);
  const [originalItems, setOriginalItems] = useState<Item[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState<number | string>(0);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [status, setStatus] = useState<"paid" | "pending" | "cancelled" | "credit">("pending");
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

  // Fetch initial collections and load target invoice doc
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
          const offlineInvoices = await getOfflineInvoices(auth.currentUser?.uid);
          const found = offlineInvoices.find(
            (inv: any) => inv.id?.toString() === id || inv.invoiceNumber === id
          );
          if (found) {
            loadedInvoice = found;
          }
        }

        if (loadedInvoice) {
          setCustomerName(loadedInvoice.customerName || "");
          const fetchedItems = (loadedInvoice.items || []).map((i: any) => ({
            ...i,
            productId: i.productId ? i.productId : (i.name ? "CUSTOM" : "")
          }));
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
          
          // Prepopulate extended fields if present
          setShippingAddress(loadedInvoice.shippingAddress || "");
          setNotes(loadedInvoice.notes || "");
          setShowNotes(!!loadedInvoice.notes);
          setAdditionalChargeName(loadedInvoice.additionalChargeName || "Transport Charges");
          setAdditionalChargeValue(loadedInvoice.additionalChargeValue || 0);
          setAutoRoundOff(loadedInvoice.autoRoundOff ?? true);
          setSelectedBankId(loadedInvoice.selectedBankId || "");
          setSelectedQRBankId(loadedInvoice.selectedQRBankId || "");
          setSignatureType(loadedInvoice.signatureType || "");
          setSignatureImage(loadedInvoice.signatureImage || "");
          if (loadedInvoice.settings) {
            setInvoiceSettings(loadedInvoice.settings);
          }
          if (loadedInvoice.discountValue > 0) {
            setShowDiscountInput(true);
          }
        } else {
          toast.error("Invoice record not found");
          router.push("/dashboard/invoices");
          return;
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
        } catch {
          const { getCachedCustomers } = await import("@/lib/indexedDB");
          const cached = await getCachedCustomers();
          setCustomers(cached as any || []);
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
        } catch {
          const { getCachedProducts } = await import("@/lib/indexedDB");
          const cached = await getCachedProducts();
          setProducts(cached as any || []);
        }

        // Fetch Bank Accounts
        try {
          if (!navigator.onLine) throw new Error("Offline");
          const bq = query(collection(db, "bankAccounts"), where("userId", "==", user.uid));
          const bsnap = await getDocs(bq);
          const bList = bsnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          setBankAccounts(bList);
        } catch {
          // Silent catch for bank accounts load
        }

        // Fetch Categories (scoped to userId to prevent cross-user data leak)
        try {
          const catSnap = await getDocs(query(collection(db, "customerCategories"), where("userId", "==", user.uid)));
          const catList = catSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
          setCategories(catList);
        } catch {
          // Offline skip
        }

        // Fetch Settings (Company state)
        try {
          const settingsSnap = await getDoc(doc(db, "settings", user.uid));
          if (settingsSnap.exists()) {
            setCompanyState((settingsSnap.data().state || "").trim());
          }
        } catch {
          // Defaults to SGST/CGST
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

  // Sync selectedBankId when payment mode is changed to a bank option
  useEffect(() => {
    if (paymentMode !== "Cash" && !selectedBankId && bankAccounts.length > 0) {
      const activeBank = bankAccounts.find((b: any) => b.status !== "inactive");
      if (activeBank) {
        setSelectedBankId(activeBank.id);
      }
    }
  }, [paymentMode, bankAccounts, selectedBankId]);

  // Adjust due dates on date terms change or date modification
  useEffect(() => {
    if (paymentTerms && invoiceDate) {
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + Number(paymentTerms || 0));
      setDueDate(date.toISOString().split("T")[0]);
    }
  }, [paymentTerms, invoiceDate]);

  // Sync shipping address with customer billing address on selection
  useEffect(() => {
    if (customerName && customers.length > 0 && !shippingAddress) {
      const party = customers.find(c => c.name === customerName);
      if (party?.address) {
        setShippingAddress(party.address);
      }
    }
  }, [customerName, customers]);

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

  // Valid calculations
  const validItems = items
    .filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0)
    .map((i) => {
      const prod = products.find(p => p.id === i.productId);
      const sanitized = {
        ...i,
        qty: Number(i.qty),
        price: Number(i.price),
        gstRate: (i.gstRate !== undefined && i.gstRate !== null) ? Number(i.gstRate) : undefined,
        discountType: (i as any).discountType || "percent",
        discountValue: (i as any).discountValue !== undefined ? Number((i as any).discountValue) : undefined,
        discountPct: (i as any).discountType === "percent" && (i as any).discountValue !== undefined
          ? Number((i as any).discountValue)
          : (i as any).discountPct,
        hsn: (i as any).hsn || "",
        unit: (i as any).unit || prod?.unit || "PCS",
      };
      if (sanitized.productId === "CUSTOM") {
        delete sanitized.productId;
      }
      return sanitized;
    });

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

  // Sync Amount Received on Fully Paid toggle
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
    updated[index] = capItemDiscountUI(updated[index]);
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: "", qty: 1, price: 0, gstRate: 18, description: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{ name: "", qty: 1, price: 0, gstRate: 18, description: "" }]);
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

    try {
      setAddingCustomer(true);
      const user = auth.currentUser;
      if (!user) return toast.error("Please authenticate first");

      const customerId = uuidv4();
      const customerData = {
        userId: user.uid,
        name: newCustomer.name.trim(),
        phone: cleanPhone,
        address: newCustomer.address.trim(),
        gstin: newCustomer.gstin.trim().toUpperCase(),
        state: newCustomer.state,
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
      setNewCustomer({ name: "", phone: "", address: "", gstin: "", state: "", category: "" });
      toast.success("Customer added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleSaveBank = async () => {
    if (!newBank.name.trim()) return toast.error("Account Display Name is required");
    if (!newBank.balance.trim()) return toast.error("Opening Balance is required");

    try {
      const user = auth.currentUser;
      if (!user) return;

      const bankId = uuidv4();
      const bankData = {
        userId: user.uid,
        name: newBank.name.trim(),
        balance: Number(newBank.balance),
        asOfDate: newBank.asOfDate,
        accountNumber: newBank.addDetails ? newBank.accountNumber.trim() : "",
        holderName: newBank.addDetails ? newBank.holderName.trim() : "",
        ifsc: newBank.addDetails ? newBank.ifsc.trim().toUpperCase() : "",
        bankName: newBank.addDetails ? newBank.bankName.trim() : "",
        branchName: newBank.addDetails ? newBank.branchName.trim() : "",
        upiId: newBank.upiId.trim(),
        createdAt: new Date()
      };

      const { setDoc, doc } = await import("firebase/firestore");
      await setDoc(doc(db, "bankAccounts", bankId), bankData);

      const added = { id: bankId, ...bankData };
      const updated = [...bankAccounts, added];
      setBankAccounts(updated);
      setSelectedBankId(bankId);

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
      toast.success("Bank Account profile saved! 🏦");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save bank account settings");
    }
  };

  const handleUpdate = async () => {

    // DISCOUNT & NEGATIVE TOTAL VALIDATION GATE
    const validation = validateDiscount(validItems, products, discountType, Number(discountValue), finalTotal, true);
    if (!validation.isValid) {
      return toast.error(validation.error);
    }

    if (!customerName) return toast.error("Please select a customer first");
    if (!validItems.length) return toast.error("Please add at least one valid item");

    if (calc.discountAmount > calc.subtotal) {
      return toast.error("Discount cannot exceed subtotal");
    }

    const user = auth.currentUser;
    if (!user) return toast.error("Access denied. Please authenticate.");

    if (paymentMode !== "Cash" && !selectedBankId) {
      return toast.error("Please select a bank account for non-cash payment");
    }

    try {
      setSaving(true);

      // Maps for original vs new quantities to calculate the stocks delta difference
      const oldMap = new Map<string, number>();
      const newMap = new Map<string, number>();

      originalItems.forEach((item) => {
        if (item.productId && item.productId !== "CUSTOM") oldMap.set(item.productId, Number(item.qty || 0));
      });

      validItems.forEach((item) => {
        if (item.productId && item.productId !== "CUSTOM") newMap.set(item.productId, Number(item.qty || 0));
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
        total: finalTotal,
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
        // Preserve cancelled/credit status; only recompute paid/pending otherwise
        status: (() => {
          if (status === "cancelled") return "cancelled";
          if (Number(amountReceived) >= finalTotal) return "paid";
          if (status === "credit") return "credit";
          return "pending";
        })(),
        invoiceType,
        amountReceived: Number(amountReceived),
        paymentMode,
        dueDate: dueDate,
        // Extended fields
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
      
      const cleanedUpdateData = cleanUndefined(updateData);

      if (isOfflineMode || isOfflineInvoice) {
        // --- OFFLINE UPDATE WORKSPACE ---
        const { getOfflineInvoices, updateOfflineInvoice } = await import("@/lib/offlineInvoices");
        const { getCachedProducts, cacheProducts } = await import("@/lib/indexedDB");

        const offlineInvoices = await getOfflineInvoices(auth.currentUser?.uid);
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
          ...cleanedUpdateData,
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

      await updateDoc(doc(db, "invoices", id), cleanedUpdateData);
      
      // Sync Cash & Bank
      if (invoiceType === "invoice") {
        try {
          // Find existing transaction for this invoice
          const tq = query(collection(db, "cashBankTransactions"), where("userId", "==", user.uid), where("txnNo", "==", invoiceNumber), where("type", "==", "Sales Invoice"));
          const tSnap = await getDocs(tq);
          
          // Reverse old transaction
          if (!tSnap.empty) {
             const oldTxnDoc = tSnap.docs[0];
             const oldTxn = oldTxnDoc.data();
             
             // Reverse balance
             if (oldTxn.received > 0) {
               if (oldTxn.accountId === "cash") {
                  const sRef = doc(db, "settings", user.uid);
                  const sSnap = await getDoc(sRef);
                  const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
                  await updateDoc(sRef, { cashInHand: current - oldTxn.received });
               } else {
                  const bRef = doc(db, "bankAccounts", oldTxn.accountId);
                  const bSnap = await getDoc(bRef);
                  const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
                  await updateDoc(bRef, { balance: current - oldTxn.received });
               }
             }
             
             await deleteDoc(doc(db, "cashBankTransactions", oldTxnDoc.id));
          }
  
          // Apply new transaction
          const amountRec = Number(amountReceived);
          if (amountRec > 0) {
             const isCash = paymentMode === "Cash";
             let newBalance = 0;
             if (isCash) {
                const sRef = doc(db, "settings", user.uid);
                const sSnap = await getDoc(sRef);
                const current = sSnap.exists() ? Number(sSnap.data().cashInHand || 0) : 0;
                newBalance = current + amountRec;
                await updateDoc(sRef, { cashInHand: newBalance });
             } else if (selectedBankId) {
                 const bRef = doc(db, "bankAccounts", selectedBankId);
                 const bSnap = await getDoc(bRef);
                 const current = bSnap.exists() ? Number(bSnap.data().balance || 0) : 0;
                 newBalance = current + amountRec;
                 await updateDoc(bRef, { balance: newBalance });
              }
  
             await addDoc(collection(db, "cashBankTransactions"), {
               userId: user.uid,
               accountId: isCash ? "cash" : (selectedBankId || "bank"),
               type: "Sales Invoice",
               txnNo: invoiceNumber,
               date: invoiceDate,
               party: customerName,
               mode: isCash ? "Cash" : "Bank",
               paid: 0,
               received: amountRec,
               balanceAfter: newBalance,
               remarks: `Received against Invoice #${invoiceNumber}`,
               createdAt: new Date()
             });
          }
        } catch (syncErr) {
          console.error("Cash & Bank sync failed:", syncErr);
        }
      }

      toast.success("Invoice updated successfully! ✅");
      router.push("/dashboard/invoices");

    } catch (err) {
      console.error(err);
      toast.error("Failed to update invoice workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleScanSuccess = (err: any, result: any) => {
    if (result) {
      const barcodeText = result.text;
      setShowScanner(false);
      toast.success(`Barcode detected: ${barcodeText}`);

      const foundProduct = products.find((p) => p.barcode === barcodeText);
      if (foundProduct) {
        // Append or replace empty item
        const updated = [...items];
        const emptyIdx = updated.findIndex((i) => !i.name);
        const itemToSet = {
          productId: foundProduct.id,
          name: foundProduct.name,
          qty: 1 as const,
          price: foundProduct.price,
          gstRate: foundProduct.gst ?? 18,
          description: ""
        };

        if (emptyIdx > -1) {
          updated[emptyIdx] = itemToSet;
        } else {
          updated.push(itemToSet);
        }
        setItems(updated);
      } else {
        toast.error(`Product not found matching barcode: ${barcodeText}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-12 text-gray-400 gap-2 font-sans">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold">Configuring edit invoice workspace...</span>
      </div>
    );
  }

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
  const selectedQRBank = bankAccounts.find(b => b.id === selectedQRBankId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wider">UPDATE SALES INVOICE</h1>
            <p className="text-[10px] text-gray-400 font-semibold uppercase">EDIT TRANSACTION</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-all"
          >
            <Settings2 size={13} />
            <span>Settings</span>
          </button>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Invoice"}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Tally Theme Notice */}
        {invoiceSettings.invoiceTheme === "Tally" && (
          <div className="bg-yellow-50 border border-yellow-100 rounded p-3 text-[11px] text-yellow-700 font-semibold flex items-center justify-between">
            <span>⚡ Invoice Auto GST is Turned On. An A4 format with minimal Tally style layout will be generated upon saving/printing.</span>
            <button onClick={() => setShowSettingsModal(true)} className="text-indigo-600 underline font-bold">Change Settings</button>
          </div>
        )}

        {/* CUSTOMER & INVOICE DETAILS CARD */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          
          <div className="bg-gray-50/45 px-4 py-2 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Bill To & Ship To Details
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* BILL TO */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Billing Address</label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select customer or party..."
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowPartyDropdown(true);
                  }}
                  onFocus={() => setShowPartyDropdown(true)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-700 bg-white"
                />

                {showPartyDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto z-10">
                    <button
                      onClick={() => {
                        setShowAddCustomer(true);
                        setShowPartyDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-b border-gray-100 flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Add New Party</span>
                    </button>
                    {customers
                      .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()) || (c.gstin && c.gstin.toLowerCase().includes(customerName.toLowerCase())))
                      .map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCustomerName(c.name);
                            setShowPartyDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700 font-semibold"
                        >
                          {c.name}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="bg-gray-50 border border-gray-150 rounded p-2.5 text-[11px] text-gray-500 space-y-0.5">
                  <p className="font-bold text-gray-700">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && <p>Ph: {selectedCustomer.phone}</p>}
                  {selectedCustomer.gstin && <p className="font-mono text-[10px]">GSTIN: {selectedCustomer.gstin}</p>}
                  {selectedCustomer.address && <p className="leading-relaxed">{selectedCustomer.address}</p>}
                </div>
              )}
            </div>

            {/* SHIPPING ADDRESS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shipping Address</label>
                <button 
                  onClick={() => setIsEditingShipping(!isEditingShipping)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  Change Shipping
                </button>
              </div>

              {isEditingShipping ? (
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter details custom delivery destination..."
                  rows={3}
                  className="w-full border border-gray-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white"
                />
              ) : (
                <div className="bg-gray-50/50 border border-gray-150 border-dashed rounded p-3 text-[11px] text-gray-500 min-h-16 flex flex-col justify-center">
                  {shippingAddress ? (
                    <div>
                      <p className="font-bold text-gray-600">{customerName}</p>
                      <p className="leading-relaxed mt-0.5">{shippingAddress}</p>
                      <span className="text-[8px] bg-green-50 text-brand-tertiary border border-green-150 px-1 py-0.2 rounded font-bold uppercase mt-1 inline-block">Custom Shipping Address</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Same as billing address</span>
                  )}
                </div>
              )}
            </div>

            {/* DATE & INVOICE NUMBER */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice No.</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Terms</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Days"
                    className="w-full border border-gray-200 rounded-l px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white"
                  />
                  <span className="bg-gray-50 border border-l-0 border-gray-200 rounded-r px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Days</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-gray-700 bg-white"
                />
              </div>

            </div>

          </div>

        </div>

        {/* ITEMS & BARCODE SEARCH TABLE */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          
          <div className="bg-gray-50/45 px-4 py-2 border-b border-gray-150 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items / Services</span>
            <button 
              onClick={() => setShowScanner(!showScanner)}
              className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase hover:underline"
            >
              <ScanBarcode size={14} />
              <span>{showScanner ? "Close Barcode" : "Scan Barcode"}</span>
            </button>
          </div>

          {showScanner && (
            <div className="p-4 bg-gray-50/40 border-b border-gray-150 flex flex-col items-center justify-center">
              <div className="w-64 h-48 border border-indigo-200 rounded overflow-hidden relative shadow-inner">
                <BarcodeScanner onUpdate={handleScanSuccess} />
              </div>
              <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-wider">Position item barcode scan region</p>
            </div>
          )}

          <div className="p-4 space-y-3">
            
            {/* Table Header labels */}
            <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100 hidden md:grid">
              <span className="col-span-1 text-center">NO.</span>
              <span className="col-span-3">ITEMS / SERVICES</span>
              <span className="col-span-1 text-center">HSN</span>
              <span className="col-span-1 text-center">QTY</span>
              <span className="col-span-2 text-right">RATE</span>
              <span className="col-span-2 text-center">DISCOUNT</span>
              <span className="col-span-1 text-center">TAX</span>
              <span className="col-span-1 text-right">AMOUNT</span>
            </div>

            {/* Table Row loops */}
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    
                    {/* Index */}
                    <div className="col-span-1 text-center font-bold text-gray-400 font-mono text-xs">
                      {idx + 1}
                    </div>

                    {/* Product Name Select / Custom Item Input */}
                    <div className="col-span-11 md:col-span-3 relative">
                      {item.productId === "CUSTOM" ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
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
                          <input 
                            type="text"
                            value={item.description || ""}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            placeholder="Enter Description (optional)"
                            className="w-full text-[10px] text-gray-500 bg-transparent border-t border-dashed border-gray-200 focus:border-indigo-400 focus:ring-0 focus:outline-none py-1 px-1 mt-1 block" 
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={item.productId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "CUSTOM") {
                                const updated = [...items];
                                updated[idx] = {
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
                                  productId: found.id,
                                  name: found.name,
                                  price: resolvedPrice,
                                  qty: 1,
                                  gstRate: found.gst !== undefined && found.gst !== null ? Number(found.gst) : 18,
                                  hsn: found.hsnCode || "",
                                  description: ""
                                };
                                setItems(updated);
                              }
                            }}
                            className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 bg-white font-medium text-gray-700 cursor-pointer"
                          >
                            <option value="">Select Item / Product...</option>
                            <option value="CUSTOM" className="font-bold text-indigo-600 bg-indigo-50">+ Add Custom Item (Manual Entry)</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.stock} {p.unit})
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
                      )}
                    </div>

                    {/* HSN Code */}
                    <div className="col-span-4 md:col-span-1">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={item.hsn || ""}
                        onChange={(e) => updateItem(idx, "hsn", e.target.value)}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white max-w-[120px] mx-auto text-center"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 md:col-span-1">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-center text-gray-700 bg-white"
                      />
                    </div>

                    {/* Price per Item */}
                    <div className="col-span-3 md:col-span-2">
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => updateItem(idx, "price", e.target.value)}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right text-gray-700 bg-white"
                      />
                    </div>

                    {/* Per-item Discount (₹ or %) */}
                    <div className="col-span-3 md:col-span-2">
                      <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white mt-0.5 w-full">
                        <select
                          value={(item as any).discountType ?? "percent"}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], discountType: e.target.value } as any;
                            updated[idx] = capItemDiscountUI(updated[idx]);
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
                            updated[idx] = capItemDiscountUI(updated[idx]);
                            setItems(updated);
                          }}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-xs focus:outline-none font-mono text-right bg-transparent"
                        />
                      </div>
                    </div>

                    {/* GST Rate */}
                    <div className="col-span-2 md:col-span-1">
                      <select
                        value={item.gstRate ?? 18}
                        onChange={(e) => updateItem(idx, "gstRate", Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-1.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>

                    {/* Dynamic Amount and Delete */}
                    <div className="col-span-1 flex items-center justify-end gap-2 text-right">
                      <span className="font-bold font-mono text-xs text-gray-700">
                        ₹{getItemBaseAmount(item).toFixed(2)}
                      </span>
                      <button 
                        onClick={() => removeItem(idx)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </div>

                  {/* Dynamic Item Description below dropdown */}
                  <div className="pl-8 flex items-center gap-2 max-w-xl">
                    <input
                      type="text"
                      placeholder="Add item optional description..."
                      value={item.description || ""}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      className="w-full text-[10px] text-gray-500 font-medium focus:outline-none border-b border-dashed border-gray-200 pb-0.5 focus:border-indigo-300"
                    />
                  </div>

                </div>
              ))}
            </div>

            {/* Control triggers */}
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100 rounded text-xs text-indigo-600 font-bold transition-all"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Add Product Row</span>
              </button>

              <div className="text-xs font-bold text-gray-500 space-x-1">
                <span>SUB TOTAL:</span>
                <span className="font-mono text-gray-700">₹{calc.subtotal.toFixed(2)}</span>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM DOUBLE COLUMN SPECIFICATIONS CARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* LEFT SPECIFICATIONS: NOTES, BANK SETTINGS */}
          <div className="space-y-6">
            
            {/* Notes row */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Terms and Conditions / Remarks</span>
                <button 
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase hover:underline"
                >
                  {showNotes ? "- Remove Remarks" : "+ Add Notes & Remarks"}
                </button>
              </div>

              {showNotes ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarks shown on printed invoice..."
                  rows={2}
                  className="w-full border border-gray-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-gray-600 bg-white"
                />
              ) : (
                <div className="border border-dashed border-gray-150 rounded p-2 bg-gray-50/20 text-[10px] font-semibold text-gray-400 space-y-1">
                  <p>1. Goods once sold will not be taken back or exchanged.</p>
                  <p>2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only.</p>
                </div>
              )}
            </div>

            {/* Bank Accounts settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Landmark size={12} className="text-gray-400" />
                  Bank Account Profile
                </span>
                <button 
                  onClick={() => setShowBankModal(true)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase hover:underline"
                >
                  + Add Bank Account Settings
                </button>
              </div>

              <div className="relative">
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600"
                >
                  <option value="">No Active Account Selected</option>
                  {bankAccounts.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name} (A/C: {bank.accountNumber || "UPI Profile"})</option>
                  ))}
                </select>
              </div>

              {selectedBank && (
                <div className="bg-gray-50 border border-gray-150 rounded p-2.5 text-[11px] text-gray-500 space-y-1">
                  <p className="font-bold text-gray-700 flex justify-between">
                    <span>{selectedBank.name}</span>
                    <span className="text-[10px] text-indigo-600 font-mono">Opening Bal: ₹{selectedBank.balance}</span>
                  </p>
                  {selectedBank.accountNumber && (
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <p>A/C No.: <span className="font-bold font-mono text-gray-600">{selectedBank.accountNumber}</span></p>
                      <p>IFSC: <span className="font-bold font-mono text-gray-600">{selectedBank.ifsc}</span></p>
                      <p className="col-span-2">Holder: <span className="font-bold text-gray-600">{selectedBank.holderName}</span></p>
                    </div>
                  )}
                  {selectedBank.upiId && (
                    <p className="text-[10px] border-t border-gray-200/60 pt-1 mt-1">
                      UPI ID: <span className="font-bold font-mono text-indigo-500">{selectedBank.upiId}</span>
                    </p>
                  )}
                </div>
              )}

              {/* QR Code Dynamic setup trigger */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase hover:underline"
                >
                  + Add Payment Dynamic QR Code
                </button>

                {selectedQRBank && (
                  <span className="text-[9px] bg-green-50 text-brand-tertiary border border-green-150 px-2 py-0.5 rounded font-bold uppercase">
                    UPI QR connected: {selectedQRBank.name}
                  </span>
                )}
              </div>

            </div>

          </div>

          {/* RIGHT CALCULATOR COLUMN */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs space-y-4">
            
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
              <span>Subtotal Summary</span>
              <span>₹{calc.subtotal.toFixed(2)}</span>
            </div>

            {/* Additional charges */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold uppercase tracking-wider text-[9px]">+ Add Additional Charges</span>
                <input 
                  type="text"
                  placeholder="Charge Name (e.g. Transport)"
                  value={additionalChargeName}
                  onChange={(e) => setAdditionalChargeName(e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-[10px] text-right font-semibold text-gray-600 focus:outline-none focus:border-indigo-500 max-w-[130px] bg-white"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">{additionalChargeName}</span>
                <div className="relative max-w-[110px] flex items-center">
                  <span className="absolute left-2.5 text-xs text-gray-400 font-bold">₹</span>
                  <input
                    type="text"
                    value={additionalChargeValue}
                    onChange={(e) => setAdditionalChargeValue(sanitizeNumericInput(e.target.value))}
                    className="w-full border border-gray-200 rounded pl-5 pr-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right text-gray-700 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Tax Details */}
            {gstEnabled && (
              <div className="bg-gray-50 border border-gray-150 rounded p-2.5 text-[10px] font-mono text-gray-500 space-y-1">
                {isInterstate ? (
                  <div className="flex justify-between font-bold">
                    <span>IGST (Interstate Tax)</span>
                    <span>₹{calc.igst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>CGST (Central Tax)</span>
                      <span>₹{calc.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (State Tax)</span>
                      <span>₹{calc.sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Discount trigger */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase hover:underline"
                >
                  {showDiscountInput ? "- Remove Discount" : "+ Add Discount value"}
                </button>

                {showDiscountInput && (
                  <div className="flex items-center gap-1">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="border border-gray-200 rounded px-1.5 py-1 text-[10px] font-semibold text-gray-600 focus:outline-none bg-white"
                    >
                      <option value="flat">₹</option>
                      <option value="percent">%</option>
                    </select>
                    
                    <input
                      type="text"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(capGlobalDiscountUI(sanitizeNumericInput(e.target.value), discountType))}
                      className="w-16 border border-gray-200 rounded px-2 py-1 text-[10px] font-bold font-mono text-right text-gray-700 focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                )}
              </div>

              {calc.discountAmount > 0 && (
                <div className="flex justify-between items-center text-[10px] text-brand-tertiary font-bold uppercase tracking-wider pl-1">
                  <span>Discount Adjusted ({discountType === "flat" ? "Flat" : `${discountValue}%`})</span>
                  <span>- ₹{calc.discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Auto Round Off */}
            <div className="pt-2 flex justify-between items-center border-t border-gray-100">
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoRoundOff}
                  onChange={(e) => setAutoRoundOff(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Auto Round Off
              </label>
              <span className="font-mono text-gray-500 text-[11px] font-semibold">
                {roundOffAmount >= 0 ? "+" : ""}{roundOffAmount.toFixed(2)}
              </span>
            </div>

            {/* Grand Totals */}
            <div className="pt-3 border-t border-gray-200/80 space-y-3">
              <div className="flex justify-between items-center text-sm font-extrabold text-indigo-650">
                <span>TOTAL AMOUNT:</span>
                <span className="font-mono text-lg">₹{finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Amount received inputs */}
              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Amount Received (₹)</label>
                  <input
                    type="text"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(sanitizeNumericInput(e.target.value))}
                    className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right text-gray-700 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-650"
                  >
                    <option value="Cash">Cash Only</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="UPI">UPI Digital Payment</option>
                    <option value="Cheque">Cheque Deposit</option>
                  </select>
                </div>
              </div>

              {paymentMode !== "Cash" && (
                <div className="space-y-1 pt-2">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Select Bank Account</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600"
                  >
                    <option value="">Select Bank Account...</option>
                    {bankAccounts.filter((b: any) => b.status !== "inactive").map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mark fully paid row */}
              <div className="flex justify-between items-center pt-1.5">
                <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={Number(amountReceived).toFixed(2) === finalTotal.toFixed(2) && status === "paid"}
                    onChange={(e) => handleMarkFullyPaid(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  Mark as fully paid
                </label>

                <div className="text-[10px] font-bold flex gap-1">
                  <span className="text-gray-400 uppercase">Balance Amount:</span>
                  <span className={`font-mono ${finalTotal - Number(amountReceived) > 0 ? "text-red-500" : "text-brand-tertiary"}`}>
                    ₹{(finalTotal - Number(amountReceived)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Invoice status type selector */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Invoice Document Type</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as any)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-600"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Add New Customer</span>
              <button 
                onClick={() => setShowAddCustomer(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Party / Customer Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Enter display name"
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile / Phone Number</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="10-digit number"
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billing / Delivery Address</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Address details"
                  rows={2}
                  className="w-full border border-gray-200 rounded p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={newCustomer.gstin}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })}
                    placeholder="15-digit code (Optional)"
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">State / Union Territory *</label>
                  <select
                    value={newCustomer.state}
                    onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-650"
                  >
                    <option value="">Select State...</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddCustomer(false)}
                  className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  disabled={addingCustomer}
                  className="text-xs text-white bg-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-all"
                >
                  {addingCustomer ? "Adding..." : "Add Party"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ADD BANK MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-200 my-8">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1">
                <Landmark size={14} className="text-indigo-500" />
                Add Bank Account settings
              </span>
              <button 
                onClick={() => setShowBankModal(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Display Name *</label>
                  <input 
                    type="text"
                    placeholder="e.g. Shop Current A/C"
                    value={newBank.name}
                    onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Opening Balance *</label>
                  <input 
                    type="text"
                    placeholder="0.00"
                    value={newBank.balance}
                    onChange={(e) => setNewBank({ ...newBank, balance: String(sanitizeNumericInput(e.target.value)) })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newBank.addDetails}
                    onChange={(e) => setNewBank({ ...newBank, addDetails: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  Add Account details (Account Number, IFSC, etc.)
                </label>
              </div>

              {newBank.addDetails && (
                <div className="space-y-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Number *</label>
                      <input 
                        type="password"
                        placeholder="Enter account number"
                        value={newBank.accountNumber}
                        onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Re-enter Account Number *</label>
                      <input 
                        type="text"
                        placeholder="Re-enter for confirmation"
                        value={newBank.reAccountNumber}
                        onChange={(e) => setNewBank({ ...newBank, reAccountNumber: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">IFSC Code *</label>
                      <input 
                        type="text"
                        placeholder="11 digit IFSC"
                        value={newBank.ifsc}
                        onChange={(e) => setNewBank({ ...newBank, ifsc: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Holder Name *</label>
                      <input 
                        type="text"
                        placeholder="Display name on bank statement"
                        value={newBank.holderName}
                        onChange={(e) => setNewBank({ ...newBank, holderName: e.target.value })}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
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

      {/* QUICK INVOICE SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-200">
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
            
            <div className="p-6 space-y-4 text-xs text-gray-600 font-semibold">
              
              <label className="flex items-center justify-between cursor-pointer p-1 hover:bg-gray-50 rounded">
                <span>Enable Invoice Prefix & Sequence</span>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.prefixEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, prefixEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1 hover:bg-gray-50 rounded">
                <span>Display Purchase Price on Catalog</span>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.purchasePriceEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, purchasePriceEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1 hover:bg-gray-50 rounded">
                <span>Show Item Images in Rows</span>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.itemImageEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, itemImageEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1 hover:bg-gray-50 rounded">
                <span>Log Price History for Party</span>
                <input 
                  type="checkbox"
                  checked={invoiceSettings.priceHistoryEnabled}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, priceHistoryEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span>Invoice Theme Style</span>
                <select
                  value={invoiceSettings.invoiceTheme}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceTheme: e.target.value })}
                  className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-semibold text-gray-650"
                >
                  <option value="Stylish">Stylish Modern Theme</option>
                  <option value="Tally">Minimalist Tally Style</option>
                </select>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    toast.success("Quick Settings updated successfully! 🛠️");
                  }}
                  className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-1.5 rounded font-bold shadow-sm transition-colors"
                >
                  Save Settings
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