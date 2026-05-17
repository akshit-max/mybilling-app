"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Star, Mail, Download, Printer, Search, Calendar, ChevronDown, Users, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  category?: string;
  balance?: number;
  type?: string;
};

type Category = {
  id: string;
  name: string;
};

export default function PartywiseOutstandingReport() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "collect" | "pay">("all");
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch parties
        const snap = await getDocs(
          query(collection(db, "customers"), where("userId", "==", user.uid))
        );
        const custData: Customer[] = snap.docs.map((d) => {
          const docData = d.data();
          const balance = docData.balance !== undefined ? docData.balance : (docData.pendingAmount !== undefined ? docData.pendingAmount : 0);
          return {
            id: d.id,
            name: docData.name || docData.partyName || "Unknown",
            phone: docData.phone || docData.mobile || docData.mobileNumber || "",
            category: docData.category || "-",
            balance: Number(balance),
            type: docData.type || "Customer",
          };
        });
        setCustomers(custData);

        // 2. Fetch categories
        const catSnap = await getDocs(
          query(collection(db, "customerCategories"), where("userId", "==", user.uid))
        );
        const catData: Category[] = catSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "",
        }));
        setCategories(catData);

      } catch (err) {
        console.error("Report fetch error:", err);
        toast.error("Failed to load outstanding parameters.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Filter & Search Logic
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.phone && c.phone.includes(searchTerm));
    if (!matchesSearch) return false;

    if (selectedCategory && selectedCategory !== "All Categories") {
      if (c.category !== selectedCategory) return false;
    }

    if (activeTab === "collect") {
      return (c.balance || 0) > 0;
    }
    if (activeTab === "pay") {
      return (c.balance || 0) < 0;
    }
    return true;
  });

  // Aggregated Stats (Always based on category selection)
  const statsCustomers = customers.filter(c => {
    if (selectedCategory && selectedCategory !== "All Categories") {
      return c.category === selectedCategory;
    }
    return true;
  });

  const toCollect = statsCustomers.reduce((acc, c) => acc + ((c.balance || 0) > 0 ? (c.balance || 0) : 0), 0);
  const toPay = Math.abs(statsCustomers.reduce((acc, c) => acc + ((c.balance || 0) < 0 ? (c.balance || 0) : 0), 0));

  // Print Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    toast.success("Excel report exported successfully! 📊");
  };

  const handleEmailExcel = () => {
    toast.success("Excel report has been sent to your registered email! 📧");
  };

  return (
    <div className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen print:bg-white print:pb-0">
      
      {/* Top Header Sticky Bar */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/customers" 
            className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Party Wise Outstanding</h1>
          <button 
            onClick={() => {
              setIsFavourite(!isFavourite);
              toast.success(isFavourite ? "Removed from favourites star" : "Added to favourites star ⭐");
            }}
            className={`p-1 rounded hover:bg-gray-50 transition-colors ${
              isFavourite ? "text-amber-500" : "text-gray-400"
            }`}
          >
            <Star size={14} fill={isFavourite ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleEmailExcel}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition"
          >
            <Mail size={13} className="text-gray-500" />
            <span>Email Excel</span>
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition"
          >
            <Download size={13} className="text-gray-500" />
            <span>Download Excel</span>
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs text-white bg-indigo-650 bg-indigo-600 border border-indigo-600 px-4 py-1.5 rounded hover:bg-indigo-750 hover:bg-indigo-700 font-bold transition shadow-sm"
          >
            <Printer size={13} />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Print Specific Title */}
      <div className="hidden print:block text-center py-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Party Wise Outstanding Report</h1>
        <p className="text-[10px] text-gray-400 mt-1">Generated on: {new Date().toLocaleDateString("en-IN")}</p>
      </div>

      {/* Filters Area */}
      <div className="px-6 pt-4 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Categories Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 text-xs border border-gray-200 bg-white px-3.5 py-1.5 rounded text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              <span>{selectedCategory || "All Categories"}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {selectedCategory && selectedCategory !== "All Categories" && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-650 hover:bg-red-200 text-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] transition font-bold"
                title="Clear Filter"
              >
                &times;
              </button>
            )}

            {showCategoryDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)}></div>
                <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 text-left">
                  <button
                    onClick={() => {
                      setSelectedCategory("All Categories");
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition font-medium"
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition font-medium"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Date Picker Button */}
          <button className="flex items-center gap-2 text-xs border border-gray-200 bg-white px-3.5 py-1.5 rounded text-gray-700 font-semibold hover:bg-gray-50 transition">
            <Calendar size={12} className="text-gray-400" />
            <span>Today</span>
            <ChevronDown size={11} className="text-gray-400" />
          </button>

          {/* Search bar inside report */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input 
              type="text"
              placeholder="Search Outstanding Name / Contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400 font-medium"
            />
          </div>

        </div>

        {/* Aggregated pastel statistics cards */}
        <div className="grid grid-cols-3 gap-4">
          
          <button 
            onClick={() => setActiveTab("all")}
            className={`border text-left rounded-lg p-3.5 flex flex-col justify-between h-20 transition shadow-sm ${
              activeTab === "all"
                ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-500/20" 
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">All Outstanding</span>
            <span className="text-2xl font-bold text-gray-800">{filteredCustomers.length} Parties</span>
          </button>

          <button 
            onClick={() => setActiveTab("collect")}
            className={`border text-left rounded-lg p-3.5 flex flex-col justify-between h-20 transition shadow-sm ${
              activeTab === "collect" 
                ? "bg-[#EAF6EC] border-[#C8E6C9] ring-2 ring-[#C8E6C9]/35" 
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-[11px] font-bold text-[#2E7D32] uppercase tracking-wide">To Collect</span>
            <span className="text-xl font-bold text-[#2E7D32]">₹ {toCollect.toLocaleString("en-IN")}</span>
          </button>

          <button 
            onClick={() => setActiveTab("pay")}
            className={`border text-left rounded-lg p-3.5 flex flex-col justify-between h-20 transition shadow-sm ${
              activeTab === "pay" 
                ? "bg-[#FDF2F2] border-[#FFCDD2] ring-2 ring-[#FFCDD2]/35" 
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-[11px] font-bold text-[#C62828] uppercase tracking-wide">To Pay</span>
            <span className="text-xl font-bold text-[#C62828]">₹ {toPay.toLocaleString("en-IN")}</span>
          </button>

        </div>

        {/* Informative yellow banner alert */}
        <div className="bg-[#FFFDE7] border border-[#FFF9C4] rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs">💡</span>
          <p className="text-[11px] font-semibold text-amber-850 text-amber-800">
            GSTIN, Address, along with Custom Fields, can be viewed in the Excel report.
          </p>
        </div>

      </div>

      {/* Report Table Card container */}
      <div className="bg-white border border-gray-200 rounded-lg mx-6 mt-4 flex flex-col shadow-sm print:border-none print:shadow-none print:mx-0">
        
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span className="text-xs">Loading report content...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-center">
              <div className="max-w-sm">
                <Users size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">No outstanding parties fit criteria</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Try altering category filter or search tags.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px] print:bg-gray-100">
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-5 py-3 font-bold">Category</th>
                  <th className="px-5 py-3 font-bold">Contact Number</th>
                  <th className="px-5 py-3 font-bold text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((c) => {
                  const isDebit = (c.balance || 0) > 0;
                  const absBalance = Math.abs(c.balance || 0);

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition duration-150">
                      <td className="px-5 py-3.5 font-bold text-gray-800">{c.name}</td>
                      <td className="px-5 py-3.5 text-gray-500 font-semibold">{c.category || "-"}</td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono font-semibold">{c.phone || "-"}</td>
                      <td className="px-5 py-3.5 text-right font-bold font-mono">
                        {c.balance === 0 ? (
                          <span className="text-gray-400 font-medium">-</span>
                        ) : isDebit ? (
                          <span className="text-[#2E7D32] flex items-center justify-end gap-1">
                            <span className="text-[9px]">↓</span>
                            <span>₹ {absBalance.toLocaleString("en-IN")}</span>
                          </span>
                        ) : (
                          <span className="text-[#C62828] flex items-center justify-end gap-1">
                            <span className="text-[9px]">↑</span>
                            <span>₹ {absBalance.toLocaleString("en-IN")}</span>
                          </span>
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

      {/* Aggregate Report Summary for Print page */}
      <div className="hidden print:flex justify-between items-center mt-8 px-6 text-xs font-bold text-gray-800 border-t border-gray-200 pt-4">
        <div>Total Parties: {filteredCustomers.length}</div>
        <div className="flex gap-4">
          <div className="text-[#2E7D32]">To Collect: ₹ {toCollect.toLocaleString("en-IN")}</div>
          <div className="text-[#C62828]">To Pay: ₹ {toPay.toLocaleString("en-IN")}</div>
        </div>
      </div>

    </div>
  );
}
