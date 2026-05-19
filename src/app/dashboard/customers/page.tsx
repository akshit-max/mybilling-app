"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronDown, Plus, Users, Pencil, Trash2, Share2, MoreVertical, ShieldCheck, Download, Trash, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

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

        const custData: Customer[] = snap.docs.map((d) => {
          const docData = d.data();
          const openingBalance = Number(docData.openingBalance || 0);
          const openingBalanceType = docData.openingBalanceType || "collect";
          let initialBalance = openingBalanceType === "collect" ? openingBalance : -openingBalance;

          // Find all active sales invoices for this customer
          const custInvoices = invData.filter(inv => 
            inv.customerName?.toLowerCase().trim() === (docData.name || docData.partyName || "").toLowerCase().trim() &&
            inv.invoiceType !== "estimate" &&
            inv.status !== "cancelled"
          );

          // Sum unpaid amount
          const unpaidSum = custInvoices.reduce((sum, inv) => {
            const total = Number(inv.total || 0);
            const received = typeof inv.amountReceived === "number"
              ? inv.amountReceived
              : (inv.status === "paid" ? total : 0);
            return sum + Math.max(0, total - received);
          }, 0);

          const finalBalance = initialBalance + unpaidSum;

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
          
          <button className="flex items-center gap-2 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-indigo-50 transition-all select-none">
            <Share2 size={13} />
            <span>SharedLedger Portal</span>
          </button>

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
                   <button 
                     onClick={() => {
                       setShowReportsDropdown(false);
                       toast("Item Report By Party is coming soon! 📦");
                     }}
                     className="w-full text-left block px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition font-medium cursor-pointer"
                   >
                     Item Report By Party
                   </button>
                   <button 
                     onClick={() => {
                       setShowReportsDropdown(false);
                       toast("Receivable Ageing Report is coming soon! ⏳");
                     }}
                     className="w-full text-left block px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition font-medium cursor-pointer"
                   >
                     Receivable Ageing Report
                   </button>
                </div>
              </>
            )}
          </div>

          <button className="p-1.5 text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-600 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button className="p-1.5 text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-600 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>
        </div>
      </div>

      {/* SharedLedger dismissable Promo Banner */}
      {showBanner && (
        <div className="mx-6 mt-4 bg-slate-900 text-slate-100 px-6 py-2.5 rounded-lg flex items-center justify-between border border-slate-800 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xl">📒</span>
            <div>
              <p className="text-xs font-semibold">Are you Tired of asking Party&apos;s Ledger?</p>
              <p className="text-[10px] text-slate-400">Access sharedledgers and turn invoices into purchases instantly.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-slate-100 transition-all shadow-sm">
              View SharedLedgers
            </button>
            <button onClick={() => setShowBanner(false)} className="text-slate-400 hover:text-white text-lg leading-none p-1 font-light">&times;</button>
          </div>
        </div>
      )}

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
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
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
        <button
          className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5"
        >
          <span>SharedLedger</span>
          <span className="bg-indigo-100 text-indigo-600 text-[8px] px-1 py-0.5 rounded font-bold uppercase scale-90">New</span>
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
            <button className="flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1.5 rounded hover:bg-gray-50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              <span>Bulk Action</span>
              <ChevronDown size={11} />
            </button>
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
                      <td className="px-4 py-3 font-semibold text-blue-600 hover:underline">
                        <Link href={`/dashboard/customers/${c.id}`}>{c.name}</Link>
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
                      <td className="px-2 py-3 text-center relative overflow-visible">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === c.id ? null : c.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical size={13} />
                        </button>
                        
                        {/* Interactive Dropdown Menu */}
                        {openDropdownId === c.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                            <div className="absolute right-4 top-8 w-28 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 text-left">
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
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5 text-[11px] text-red-650 font-semibold"
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
        <button className="bg-white border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold text-gray-600 px-3 py-1.5 rounded shadow-sm transition-all flex items-center gap-1 shrink-0">
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

    </div>
  );
}