"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronDown, Plus, Users, Pencil, Trash2, Share2, MoreVertical, ShieldCheck, Download, Trash, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRef } from "react";
import * as XLSX from "xlsx";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
  type?: string;
  category?: string;
  balance?: number;
  openingBalance?: number;
  openingBalanceType?: "collect" | "pay";
  creditPeriod?: number;
  creditLimit?: number;
  contactPersonName?: string;
  contactPersonDob?: string;
  panNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  isSharedLedger?: boolean;
};

type Category = {
  id: string;
  name: string;
};

export default function PartiesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "collect" | "pay">("all");
  const [showBanner, setShowBanner] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Customer | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories Dropdowns & Modals States
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // Reports Dropdown State
  const [showReportsDropdown, setShowReportsDropdown] = useState(false);
  const [showPartySettingsModal, setShowPartySettingsModal] = useState(false);
  const [showBulkActionDropdown, setShowBulkActionDropdown] = useState(false);
  const [partySettingsTab, setPartySettingsTab] = useState<"greetings" | "custom">("greetings");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch customers from Firebase
        const snap = await getDocs(
          query(collection(db, "customers"), where("userId", "==", user.uid))
        );

        // Fetch all invoices to calculate real-time balance
        const invSnap = await getDocs(
          query(collection(db, "invoices"), where("userId", "==", user.uid))
        );
        const invData = invSnap.docs.map(docSnap => docSnap.data());

        // Fetch all purchases to subtract from balance (To Pay)
        let purchData: any[] = [];
        try {
          const purchSnap = await getDocs(
            query(collection(db, "purchases"), where("userId", "==", user.uid))
          );
          purchData = purchSnap.docs.map(docSnap => docSnap.data());
        } catch(e) { console.warn("Purchases fetch error:", e); }

        const custData: Customer[] = snap.docs.map((d) => {
          const docData = d.data();
          const openingBalance = Number(docData.openingBalance || 0);
          const openingBalanceType = docData.openingBalanceType || "collect";
          let initialBalance = openingBalanceType === "collect" ? openingBalance : -openingBalance;

          const custNameLower = (docData.name || docData.partyName || "").toLowerCase().trim();

          // Find all active sales invoices for this customer
          const custInvoices = invData.filter(inv => 
            inv.customerName?.toLowerCase().trim() === custNameLower &&
            inv.invoiceType !== "estimate" &&
            inv.status !== "cancelled"
          );

          // Find all active purchases for this customer
          const custPurchases = purchData.filter(purch =>
            (purch.supplierName?.toLowerCase().trim() === custNameLower || purch.partyName?.toLowerCase().trim() === custNameLower) &&
            purch.status !== "cancelled"
          );

          // Sum unpaid sales
          const unpaidSalesSum = custInvoices.reduce((sum, inv) => {
            const total = Number(inv.total || 0);
            const received = Number(inv.amountReceived) || Number(inv.amountPaid) || (inv.status === "paid" ? total : 0);
            return sum + Math.max(0, total - received);
          }, 0);

          // Sum unpaid purchases
          const unpaidPurchasesSum = custPurchases.reduce((sum, purch) => {
            const total = Number(purch.total || 0);
            const paid = Number(purch.amountPaid) || Number(purch.amountReceived) || (purch.status === "paid" ? total : 0);
            return sum + Math.max(0, total - paid);
          }, 0);

          const finalBalance = initialBalance + unpaidSalesSum - unpaidPurchasesSum;

          return {
            id: d.id,
            name: docData.name || docData.partyName || "Unknown",
            phone: docData.phone || docData.mobile || docData.mobileNumber || "",
            email: docData.email || "",
            gstin: docData.gstin || docData.gst || "",
            address: docData.address || docData.billingAddress || "",
            state: docData.state || "",
            type: docData.type || "Customer",
            category: docData.category || "-",
            balance: finalBalance,
            openingBalance: openingBalance,
            openingBalanceType: openingBalanceType,
            isSharedLedger: Math.random() > 0.7 // Mocking shared ledger for 30% of customers
          };
        });
        setCustomers(custData);

        // 2. Fetch categories from customerCategories collection
        const catSnap = await getDocs(
          query(collection(db, "customerCategories"), where("userId", "==", user.uid))
        );
        const catData: Category[] = catSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "",
        }));
        setCategories(catData);

      } catch (err) {
        console.error("Customers/Categories fetch error:", err);
        toast.error("Failed to load dashboard parameters.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this party?")) return;
    try {
      await deleteDoc(doc(db, "customers", id));
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast.success("Party deleted successfully");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // Category Actions
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "customerCategories"), {
        name: newCategoryName.trim(),
        userId: user.uid
      });
      setCategories(prev => [...prev, { id: docRef.id, name: newCategoryName.trim() }]);
      setNewCategoryName("");
      setShowCreateModal(false);
      toast.success("Category created successfully! 🎉");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    if (!editCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }
    try {
      await updateDoc(doc(db, "customerCategories", editingCategory.id), {
        name: editCategoryName.trim()
      });
      
      // Update loaded states
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: editCategoryName.trim() } : c));
      setCustomers(prev => prev.map(cust => cust.category === editingCategory.name ? { ...cust, category: editCategoryName.trim() } : cust));
      
      setShowEditModal(false);
      toast.success("Category updated successfully! ✍️");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    if (!confirm(`Are you sure you want to delete category "${editingCategory.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "customerCategories", editingCategory.id));
      
      // Remove from loaded states
      setCategories(prev => prev.filter(c => c.id !== editingCategory.id));
      setCustomers(prev => prev.map(cust => cust.category === editingCategory.name ? { ...cust, category: "-" } : cust));
      
      setShowEditModal(false);
      toast.success("Category deleted successfully 🗑️");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category");
    }
  };

  // Helper selectors
  const getCategoryCount = (categoryName: string) => {
    return customers.filter(c => c.category === categoryName).length;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    toast.loading("Processing parties... 📊", { id: "excel-upload" });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        let addedCount = 0;
        for (const row of json) {
          if (!row.Name && !row["Party Name"]) continue;

          const customerData = {
            userId: user.uid,
            name: String(row.Name || row["Party Name"] || "").trim(),
            phone: String(row.Phone || row["Mobile Number"] || row.Contact || "").trim(),
            email: String(row.Email || "").trim(),
            address: String(row.Address || row["Billing Address"] || "").trim(),
            gstin: String(row.GSTIN || row.GST || "").trim(),
            state: String(row.State || "").trim(),
            category: String(row.Category || "-").trim(),
            type: String(row["Party Type"] || "Customer").trim(),
            openingBalance: Number(row["Initial Balance"] || row["Opening Balance"] || row.Balance || 0),
            openingBalanceType: String(row["Opening Balance Type (collect/pay)"] || "collect").trim().toLowerCase() as "collect" | "pay",
            createdAt: new Date(),
          };

          const docRef = await addDoc(collection(db, "customers"), customerData);
          setCustomers((prev) => [...prev, { id: docRef.id, ...customerData }]);
          addedCount++;
        }

        toast.success(`Successfully imported ${addedCount} parties!`, { id: "excel-upload" });
      } catch (error) {
        console.error(error);
        toast.error("Failed to parse Excel file", { id: "excel-upload" });
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filter categories in list
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

    const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: keyof Customer) => {
    if (sortField !== field) {
      return <span className="text-gray-300 ml-1 select-none font-normal text-[9px]">⇅</span>;
    }
    return sortDirection === "asc" 
      ? <span className="text-indigo-650 ml-1 select-none font-bold text-[9px]">▲</span>
      : <span className="text-indigo-650 ml-1 select-none font-bold text-[9px]">▼</span>;
  };

  // Filter & Search Logic
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.phone && c.phone.includes(searchTerm));
    
    if (!matchesSearch) return false;

    if (selectedCategoryFilter) {
      if (c.category !== selectedCategoryFilter) return false;
    }

    if (activeTab === "collect") {
      return (c.balance || 0) > 0;
    }
    if (activeTab === "pay") {
      return (c.balance || 0) < 0;
    }
    return true;
  });

  // Sort Logic
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortField) return 0;
    
    let valA = a[sortField];
    let valB = b[sortField];
    
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    
    if (valA === undefined || valA === null) return sortDirection === "asc" ? 1 : -1;
    if (valB === undefined || valB === null) return sortDirection === "asc" ? -1 : 1;
    
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Calculate Stats
  const totalCustomers = customers.length;
  const toCollect = customers.reduce((acc, c) => acc + ((c.balance || 0) > 0 ? (c.balance || 0) : 0), 0);
  const toPay = Math.abs(customers.reduce((acc, c) => acc + ((c.balance || 0) < 0 ? (c.balance || 0) : 0), 0));

  return (
    <div className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800">Parties</h1>
        <div className="flex items-center gap-2">
          
          {/* Dynamic Reports Dropdown Container */}
          <div className="relative">
            <button 
              onClick={() => setShowReportsDropdown(!showReportsDropdown)}
              className="flex items-center gap-2 text-indigo-600 border border-indigo-200 bg-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-indigo-50 transition-all select-none"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>Reports</span>
              <ChevronDown size={12} />
            </button>

            {showReportsDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowReportsDropdown(false)}></div>
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded shadow-lg z-30 py-1 text-left">
                   <Link 
                     href="/dashboard/reports/party-outstanding" 
                     onClick={() => setShowReportsDropdown(false)}
                     className="block px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition font-medium"
                   >
                     Partywise Outstanding
                   </Link>
                   <Link 
                     href="/dashboard/reports/item-report-by-party" 
                     onClick={() => setShowReportsDropdown(false)}
                     className="w-full text-left block px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition font-medium cursor-pointer"
                   >
                     Item Report By Party
                   </Link>
                   <Link 
                     href="/dashboard/reports/ageing-report" 
                     onClick={() => setShowReportsDropdown(false)}
                     className="w-full text-left block px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition font-medium cursor-pointer"
                   >
                     Receivable Ageing Report
                   </Link>
                </div>
              </>
            )}
          </div>

          <button onClick={() => setShowPartySettingsModal(true)} className="p-1.5 text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-600 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button className="p-1.5 text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-600 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>
        </div>
      </div>

      {/* Modern Stats Cards Navigation */}
      <div className="grid grid-cols-3 gap-4 px-6 pt-4">
        
        {/* All Parties Stat Tab */}
        <button 
          onClick={() => {
            setActiveTab("all");
            setSelectedCategoryFilter(null);
          }}
          className={`border text-left rounded-lg p-3.5 flex flex-col justify-between h-20 transition-all duration-200 shadow-sm ${
            activeTab === "all" && !selectedCategoryFilter
              ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-500/20" 
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>All Parties</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{loading ? "..." : totalCustomers}</div>
        </button>

        {/* To Collect Stat Tab */}
        <button 
          onClick={() => setActiveTab("collect")}
          className={`border text-left rounded-lg p-3.5 flex flex-col justify-between h-20 transition-all duration-200 shadow-sm ${
            activeTab === "collect" 
              ? "bg-[#EAF6EC] border-[#C8E6C9] ring-2 ring-[#C8E6C9]/35" 
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2E7D32]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-tertiary"></span>
            <span>To Collect</span>
          </div>
          <div className="text-xl font-bold text-gray-800">₹ {loading ? "..." : toCollect.toLocaleString("en-IN")}</div>
        </button>

        {/* To Pay Stat Tab */}
        <button 
          onClick={() => setActiveTab("pay")}
          className={`border text-left rounded-lg p-3.5 flex flex-col justify-between h-20 transition-all duration-200 shadow-sm ${
            activeTab === "pay" 
              ? "bg-[#FDF2F2] border-[#FFCDD2] ring-2 ring-[#FFCDD2]/35" 
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C62828]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            <span>To Pay</span>
          </div>
          <div className="text-xl font-bold text-gray-800">₹ {loading ? "..." : toPay.toLocaleString("en-IN")}</div>
        </button>

      </div>

      {/* Sub tabs style */}
      <div className="flex gap-2 px-6 pt-4">
        <button
          onClick={() => {
            setActiveTab("all");
            setSelectedCategoryFilter(null);
          }}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
            activeTab === "all" && !selectedCategoryFilter
              ? "bg-indigo-650 bg-indigo-600 text-white border-indigo-600" 
              : "bg-white text-gray-650 text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          All Parties
        </button>
      </div>

      {/* Enterprise Styled Card */}
      <div className="bg-white border border-gray-200 rounded-lg mx-6 mt-3 flex flex-col min-h-[420px] shadow-sm overflow-visible">

        {/* Toolbar */}
        <div className="p-3 border-b border-gray-100 flex flex-wrap gap-3 justify-between items-center bg-gray-50/30 overflow-visible">
          <div className="flex items-center gap-3 overflow-visible">
            
            {/* Parties Text Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search Parties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs w-48 focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400 font-medium"
              />
            </div>

            {/* Premium Categories Filter and Actions Dropdown Button */}
            <div className="relative">
              <button 
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded bg-white transition select-none ${
                  selectedCategoryFilter 
                    ? "border-indigo-300 text-indigo-700 bg-indigo-50/30 font-bold" 
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold"
                }`}
              >
                <span>{selectedCategoryFilter ? `Category: ${selectedCategoryFilter}` : "Search Categories"}</span>
                <ChevronDown size={11} className={selectedCategoryFilter ? "text-indigo-600" : "text-gray-400"} />
              </button>
              
              {selectedCategoryFilter && (
                <button 
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-650 hover:bg-red-200 text-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] transition font-bold shadow-3xs"
                  title="Clear Category Filter"
                >
                  &times;
                </button>
              )}

              {showCategoryDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)}></div>
                  <div className="absolute left-0 mt-1.5 w-60 bg-white border border-gray-200 rounded shadow-lg z-20 p-2.5 text-left select-none animate-in fade-in slide-in-from-top-1 duration-100">
                     <div className="relative mb-2 shrink-0">
                       <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                       <input 
                         type="text"
                         placeholder="Search Categories..."
                         value={categorySearchQuery}
                         onChange={(e) => setCategorySearchQuery(e.target.value)}
                         className="w-full pl-7 pr-2 py-1 border border-gray-200 rounded text-[11px] focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400 font-medium"
                       />
                     </div>

                     <div className="max-h-40 overflow-y-auto space-y-0.5 mb-2.5 divide-y divide-gray-50 pr-1">
                        {filteredCategories.length === 0 ? (
                          <p className="text-[10px] text-gray-400 p-2 text-center">No categories found</p>
                        ) : (
                          filteredCategories.map((cat) => {
                            const count = getCategoryCount(cat.name);
                            return (
                              <div key={cat.id} className="flex items-center justify-between hover:bg-gray-50 rounded px-2 py-1.5 group/cat">
                                <button 
                                  onClick={() => {
                                    setSelectedCategoryFilter(cat.name);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className="text-left text-xs text-gray-700 font-semibold truncate flex-1 hover:text-indigo-600 transition"
                                >
                                  {cat.name} <span className="text-[10px] text-gray-400 font-normal">({count})</span>
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategory(cat);
                                    setEditCategoryName(cat.name);
                                    setShowEditModal(true);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className="p-1 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 rounded transition"
                                >
                                  <Pencil size={11} />
                                </button>
                              </div>
                            );
                          })
                        )}
                     </div>

                     <button 
                       onClick={() => {
                         setShowCreateModal(true);
                         setShowCategoryDropdown(false);
                       }}
                       className="w-full border border-dashed border-indigo-200 text-indigo-600 rounded py-1.5 text-center text-xs font-bold hover:bg-indigo-50 transition block select-none cursor-pointer"
                     >
                       + Create Category
                     </button>
                  </div>
                </>
              )}
            </div>

          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowBulkActionDropdown(!showBulkActionDropdown)} className="flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1.5 rounded hover:bg-gray-50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                <span>Bulk Action</span>
                <ChevronDown size={11} />
              </button>
              
              {showBulkActionDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowBulkActionDropdown(false)}></div>
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded shadow-lg z-30 py-1">
                    <button onClick={() => { setShowBulkActionDropdown(false); fileInputRef.current?.click(); }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition">
                      Upload Excel
                    </button>
                    <button onClick={() => {
                      setShowBulkActionDropdown(false);
                      if (filteredCustomers.length === 0) return toast.error("No parties to export");
                      const data = filteredCustomers.map(c => ({
                        "Party Name": c.name,
                        "Category": c.category || "-",
                        "Mobile Number": c.phone || "-",
                        "Party Type": c.type || "Customer",
                        "Balance": c.balance?.toString() || "0"
                      }));
                      const worksheet = XLSX.utils.json_to_sheet(data);
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, "Parties");
                      XLSX.writeFile(workbook, "Parties_List.xlsx");
                      toast.success("Excel exported successfully!");
                    }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition">
                      Export Excel
                    </button>
                    <button onClick={() => {
                      setShowBulkActionDropdown(false);
                      const data = [{
                        "Party Name": "Example Party",
                        "Mobile Number": "9876543210",
                        "Email": "example@example.com",
                        "GSTIN": "",
                        "Opening Balance": 1000,
                        "Opening Balance Type (collect/pay)": "collect",
                        "Party Type": "Customer",
                        "Credit Period": 30,
                        "Credit Limit": 50000,
                        "Billing Address": "Delhi"
                      }];
                      const worksheet = XLSX.utils.json_to_sheet(data);
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
                      XLSX.writeFile(workbook, "Party_Import_Template.xlsx");
                      toast.success("Template downloaded!");
                    }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition">
                      Download Template
                    </button>
                  </div>
                </>
              )}
            </div>
            <Link 
              href="/dashboard/customers/create" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus size={13} /> 
              <span>Create Party</span>
            </Link>
          </div>
        </div>

        {/* Dense Table */}
        <div className="flex-1 overflow-x-auto relative">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span className="text-xs">Loading parties data...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-sm">
                <Users size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">No matching parties found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Try widening your search terms or filters.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2.5 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center">
                      <span>Party Name</span>
                      {renderSortIndicator('name')}
                    </div>
                  </th>
                  <th className="px-4 py-2.5 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort('category')}>
                    <div className="flex items-center">
                      <span>Category</span>
                      {renderSortIndicator('category')}
                    </div>
                  </th>
                  <th className="px-4 py-2.5 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort('phone')}>
                    <div className="flex items-center">
                      <span>Mobile Number</span>
                      {renderSortIndicator('phone')}
                    </div>
                  </th>
                  <th className="px-4 py-2.5 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort('type')}>
                    <div className="flex items-center">
                      <span>Party Type</span>
                      {renderSortIndicator('type')}
                    </div>
                  </th>
                  <th className="px-4 py-2.5 font-bold text-right cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort('balance')}>
                    <div className="flex items-center justify-end">
                      <span>Balance</span>
                      {renderSortIndicator('balance')}
                    </div>
                  </th>
                  <th className="px-4 py-2.5 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCustomers.map((c) => {
                  const isDebit = (c.balance || 0) > 0;
                  const absBalance = Math.abs(c.balance || 0);

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3 font-semibold text-brand-primary">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800">{c.name}</span>
                          {c.isSharedLedger && (
                            <div className="relative group/tooltip flex items-center justify-center">
                              <span className="w-4 h-4 bg-orange-100 text-brand-secondary rounded-full flex items-center justify-center cursor-help">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
                              </span>
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-max bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
                                Party also on myBillBook, SharedLedger exists
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-semibold">{c.category || "-"}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono font-semibold">{c.phone || "-"}</td>
                      <td className="px-4 py-3 font-semibold">
                        <span className="text-gray-700">{c.type || "Customer"}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono">
                        {c.balance === 0 ? (
                          <span className="text-gray-400">₹ 0</span>
                        ) : isDebit ? (
                          <span className="text-[#2E7D32] flex items-center justify-end gap-1 text-xs">
                            <span className="text-[9px] font-bold">↓</span>
                            <span>₹ {absBalance.toLocaleString("en-IN")}</span>
                          </span>
                        ) : (
                          <span className="text-[#C62828] flex items-center justify-end gap-1 text-xs">
                            <span className="text-[9px] font-bold">↑</span>
                            <span>₹ {absBalance.toLocaleString("en-IN")}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right relative overflow-visible">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === c.id ? null : c.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical size={13} />
                          </button>
                        </div>
                        
                        {/* Interactive Dropdown Menu */}
                        {openDropdownId === c.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                            <div className="absolute right-4 top-8 w-28 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 text-left">
                              <Link 
                                href={`/dashboard/customers/${c.id}`}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5 text-[11px] text-gray-700 font-semibold"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                <span>View Details</span>
                              </Link>
                              <Link 
                                href={`/dashboard/customers/edit/${c.id}`}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5 text-[11px] text-gray-700 font-semibold"
                              >
                                <Pencil size={11} className="text-indigo-500" />
                                <span>Edit</span>
                              </Link>
                              <button 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleDelete(c.id);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5 text-[11px] text-red-650 font-semibold text-red-600"
                              >
                                <Trash2 size={11} className="text-red-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom Upload Excel Promotional Banner */}
      <div className="mx-6 mt-4 bg-indigo-50/30 border border-indigo-100 rounded-lg p-4 flex items-center gap-5">
        <div className="w-14 h-11 bg-white border border-indigo-100 rounded flex items-center justify-center text-xl shrink-0 shadow-sm">
          📊
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-xs">Add Multiple Parties at once</p>
          <p className="text-[10px] text-gray-400">Bulk upload all your parties to myBillBook using excel template.</p>
        </div>
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold text-gray-600 px-3 py-1.5 rounded shadow-sm transition-all flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          <span>Upload Excel</span>
        </button>
      </div>

      {/* Create Category Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCreateModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-705 text-gray-700 uppercase tracking-wide">Create New Category</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">CATEGORY NAME</label>
              <input 
                type="text" 
                placeholder="Ex: VIP Parties" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="border border-gray-200 text-gray-600 hover:bg-gray-100 px-4 py-1.5 rounded text-xs font-bold transition select-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCategory}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition select-none"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal Overlay */}
      {showEditModal && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowEditModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Edit {editingCategory.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">CATEGORY NAME</label>
              <input 
                type="text" 
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button 
                onClick={handleDeleteCategory}
                className="text-red-600 hover:text-red-750 text-xs font-bold transition select-none cursor-pointer"
              >
                Delete Category
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="border border-gray-200 text-gray-600 hover:bg-gray-100 px-4 py-1.5 rounded text-xs font-bold transition select-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateCategory}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition select-none"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Party Settings Modal */}
      {showPartySettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowPartySettingsModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-3xl overflow-hidden z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150 h-[500px]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
              <h3 className="text-sm font-bold text-gray-800">Party Settings</h3>
              <button onClick={() => setShowPartySettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 flex flex-col gap-2">
                <button 
                  onClick={() => setPartySettingsTab("greetings")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold transition ${
                    partySettingsTab === "greetings" 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Send Smart Greetings</span>
                </button>
                <button 
                  onClick={() => setPartySettingsTab("custom")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold transition ${
                    partySettingsTab === "custom" 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  <span>Custom Fields</span>
                </button>
              </div>
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {partySettingsTab === "greetings" ? (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-gray-800">Select Templates to Share Automated Smart Greetings with Parties on WhatsApp</h4>
                    
                    {/* Invoice Milestones */}
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="text-xs font-bold text-gray-800">Invoice Milestones</h5>
                          <p className="text-[10px] text-gray-500 mt-1">Make every 10th, 25th, 50th or 100th invoice feel special.</p>
                        </div>
                        {/* Dummy Toggle */}
                        <div className="w-8 h-4 bg-indigo-600 rounded-full relative cursor-pointer">
                          <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <select className="w-full border border-gray-200 rounded px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-indigo-500 bg-gray-50">
                        <option>Hey, [[MilestoneMessage]] with [[YourBusinessName]] - thank you, [[PartyName]]!</option>
                      </select>
                      <p className="text-[10px] text-gray-400 mt-2">Example: Hey, Half-century! 50 invoices with Aashika Traders - thank you, Shubhi Trading! 🎉 &lt;View Invoice&gt;</p>
                    </div>

                    {/* Birthday Wishes */}
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="text-xs font-bold text-gray-800">Birthday Wishes</h5>
                          <p className="text-[10px] text-gray-500 mt-1">Send a warm greeting on your party&apos;s birthday automatically.</p>
                        </div>
                        <div className="w-8 h-4 bg-indigo-600 rounded-full relative cursor-pointer">
                          <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <select className="w-full border border-gray-200 rounded px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-indigo-500 bg-gray-50">
                        <option>Happy Birthday, [[PartyName]]! 🎂 Wishing you success & smiles.</option>
                      </select>
                      <p className="text-[10px] text-gray-400 mt-2">Example: Happy Birthday, Shubhi Traders! 🎂 Wishing you success & smiles.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="relative mb-6">
                      {/* Abstract background shape */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 bg-blue-50 rounded-full blur-xl"></div>
                      
                      {/* Floating Badges Visualization */}
                      <div className="relative flex flex-col items-center gap-2">
                        {/* Top Badge */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm relative z-10 translate-x-4">
                          <span className="text-[10px] font-bold text-gray-700">License Number</span>
                          <div className="w-5 h-5 bg-brand-tertiary rounded-full flex items-center justify-center absolute -right-2 -top-1 shadow-sm text-white">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          </div>
                        </div>
                        {/* Bottom Badges */}
                        <div className="flex items-center gap-4 relative z-0">
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm -translate-y-1 -translate-x-2">
                            <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center absolute -left-2 -top-1 shadow-sm text-white">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <span className="text-[10px] font-bold text-gray-700 pl-2">Birthday</span>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm translate-y-2">
                            <span className="text-[10px] font-bold text-gray-700 pr-2">Website Link</span>
                            <div className="w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center absolute -right-2 -top-1 shadow-sm text-white">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-4 font-semibold">You don&apos;t have any custom fields created yet</p>
                    
                    <button onClick={() => toast.success("Create custom field UI opening...")} className="text-sky-500 bg-sky-50 border border-sky-100 hover:bg-sky-100 px-4 py-1.5 rounded text-xs font-bold transition-colors">
                      + Create custom field
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setShowPartySettingsModal(false)} className="px-4 py-1.5 rounded text-xs font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={() => { setShowPartySettingsModal(false); toast.success("Settings saved successfully!"); }} className="bg-indigo-600 text-white px-5 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 transition">Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}