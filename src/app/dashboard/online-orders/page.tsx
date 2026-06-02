"use client";

import React, { useState, useEffect } from "react";
import { Mail, Search, ChevronDown, ReceiptText, Store, X, Globe, Link as LinkIcon, Users, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Trash2, Edit, CheckCircle, Clock, Truck, Package, XCircle } from "lucide-react";

const getStatusColor = (s: string) => {
  switch (s) {
    case "Pending": return "text-orange-700 bg-orange-100";
    case "Confirmed": return "text-blue-700 bg-blue-100";
    case "Shipped": return "text-purple-700 bg-purple-100";
    case "Delivered": return "text-green-700 bg-green-100";
    case "Cancelled": return "text-red-700 bg-red-100";
    default: return "text-orange-700 bg-orange-100";
  }
};

export default function OnlineOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("365");
  const [hasOnlineStore, setHasOnlineStore] = useState(false);
  const [storeSlug, setStoreSlug] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setHasOnlineStore(!!data.hasOnlineStore);
            setStoreSlug(data.storeSlug || user.uid.substring(0, 8).toLowerCase());
          }
          
          const q = query(
            collection(db, "quotations"), 
            where("userId", "==", user.uid)
          );
          const qSnap = await getDocs(q);
          const qData = qSnap.docs
             .map(d => ({ id: d.id, ...d.data() }))
             .filter((d: any) => d.isOnlineOrder === true);
             
          qData.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
          setQuotations(qData);
          
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleCreateStore = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error("Please log in");
    
    try {
      const storeUrl = user.uid.substring(0, 8).toLowerCase();
      await updateDoc(doc(db, "settings", user.uid), {
        hasOnlineStore: true,
        storeSlug: storeUrl
      });
      setHasOnlineStore(true);
      setStoreSlug(storeUrl);
      setShowModal(false);
      toast.success("Online Store Created Successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create store");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      await deleteDoc(doc(db, "quotations", id));
      setQuotations(prev => prev.filter(q => q.id !== id));
      toast.success("Order deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete order");
    }
  };

  const filteredQuotations = quotations.filter(q => {
    if (search && !q.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) && !q.customerName?.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (dateFilter !== "all" && q.createdAt?.seconds) {
       const date = new Date(q.createdAt.seconds * 1000);
       const now = new Date();
       if (dateFilter === "365") {
          if (now.getTime() - date.getTime() > 365 * 24 * 60 * 60 * 1000) return false;
       } else if (dateFilter === "today") {
          if (date.toDateString() !== now.toDateString()) return false;
       }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Online Orders</h1>
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Manage your digital storefront orders</p>
        </div>
        <button className="text-gray-500 hover:text-indigo-600 transition-colors p-2 border border-gray-200 rounded-lg hover:bg-indigo-50 shadow-sm">
          <Mail size={16} />
        </button>
      </header>

      {/* WORKSPACE */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col space-y-6">
        
        {/* Promotional Banner */}
        {!hasOnlineStore ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden">
            <div className="z-10 relative space-y-4">
              <h2 className="text-[15px] font-bold text-gray-800">
                Increase your sales, get <span className="text-brand-secondary">Online Orders</span> with a single click
              </h2>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-brand-secondary hover:bg-orange-600 text-white font-bold px-6 py-2 rounded text-sm transition-colors shadow-sm shadow-orange-200"
              >
                Create Online Store
              </button>
            </div>
            
            {/* Decorative Graphic */}
            <div className="absolute right-0 bottom-0 opacity-10 md:opacity-100 md:relative w-48 h-24 flex items-end justify-end pointer-events-none">
              <div className="w-40 h-20 bg-blue-50 border-2 border-slate-700 rounded-t-xl relative flex flex-col overflow-hidden">
                 {/* Store awning */}
                 <div className="flex w-full h-4">
                   <div className="flex-1 bg-red-400"></div>
                   <div className="flex-1 bg-white"></div>
                   <div className="flex-1 bg-red-400"></div>
                   <div className="flex-1 bg-white"></div>
                   <div className="flex-1 bg-red-400"></div>
                 </div>
                 {/* Store body */}
                 <div className="flex-1 flex items-center justify-center bg-white relative">
                    <div className="w-20 h-10 border-2 border-slate-700 rounded flex items-center justify-center bg-gray-50">
                       <Store size={20} className="text-slate-400" />
                    </div>
                    <div className="absolute bottom-0 right-2 w-8 h-8 bg-blue-100 border-2 border-slate-700 border-b-0 rounded-t flex items-center justify-center">
                       <div className="w-4 h-4 bg-slate-700 rounded-sm"></div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg p-6 shadow-md text-white flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            <div className="z-10 relative space-y-2">
              <h2 className="text-lg font-bold">Your Online Store is Live! 🎉</h2>
              <p className="text-sm text-indigo-100">Share this link with your customers so they can order directly.</p>
            </div>
            <div className="z-10 mt-4 sm:mt-0 flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/20">
              <span className="text-sm font-medium px-2">/store/{storeSlug}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/store/${storeSlug}`);
                  toast.success("Store link copied!");
                }}
                className="bg-white text-indigo-600 text-xs font-bold px-4 py-2.5 rounded shadow hover:bg-indigo-50 transition-colors"
              >
                Copy Link
              </button>
              <a 
                href={`/store/${storeSlug}`}
                target="_blank"
                className="bg-indigo-800 text-white text-xs font-bold px-4 py-2.5 rounded shadow hover:bg-indigo-900 transition-colors"
              >
                Open Store
              </a>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-56 focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 hover:bg-gray-50 relative">
            <select
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
               className="text-xs font-semibold text-gray-700 bg-transparent appearance-none pr-4 focus:outline-none cursor-pointer"
            >
               <option value="365">Last 365 Days</option>
               <option value="today">Today</option>
               <option value="all">All Time</option>
            </select>
            <ChevronDown size={14} className="text-gray-400 pointer-events-none absolute right-2" />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 flex items-center gap-1 transition-colors">Date <ChevronDown size={12}/></th>
                  <th className="px-6 py-4">Quotation Number</th>
                  <th className="px-6 py-4">Party Name</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Mode of Payment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-24 bg-white">
                        <div className="mb-4 text-slate-300">
                           <ReceiptText size={64} className="stroke-[1.5]" />
                        </div>
                        <p className="text-xs text-gray-400 font-medium text-center">No Transactions Matching the current filter</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{q.createdAt?.seconds ? new Date(q.createdAt.seconds * 1000).toLocaleDateString() : "-"}</td>
                      <td className="px-6 py-4 font-bold text-indigo-600">{q.invoiceNumber}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{q.customerName}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{q.totalAmount?.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`${getStatusColor(q.status || 'Pending')} px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider`}>
                          {q.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-medium flex items-center gap-1.5"><Globe size={14} className="text-gray-400"/> Online</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                             onClick={() => router.push(`/dashboard/online-orders/edit/${q.id}`)}
                             className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-all p-1.5 rounded"
                             title="Manage Order"
                          >
                             <Edit size={16} strokeWidth={2.5} />
                          </button>
                          <button 
                             onClick={() => handleDelete(q.id)}
                             className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-all p-1.5 rounded"
                             title="Delete Order"
                          >
                             <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* HOW ONLINE STORE WORKS MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-gray-100 relative">
              <h2 className="text-xl font-bold text-gray-800">How Online Store Works?</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-4">
                <h3 className="font-bold text-[13px] text-gray-700 uppercase tracking-wider">CREATE YOUR ONLINE STORE</h3>
                <div className="h-32 flex items-center justify-center">
                  <Globe size={80} className="text-indigo-200" strokeWidth={1} />
                </div>
                <p className="text-sm text-gray-600">Items in your inventory are shown in Online Store</p>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center space-y-4 relative">
                <h3 className="font-bold text-[13px] text-gray-700 uppercase tracking-wider">SHARE STORE LINK</h3>
                <div className="h-32 flex items-center justify-center relative">
                  <Users size={70} className="text-blue-300" strokeWidth={1} />
                  <LinkIcon size={30} className="absolute text-brand-primary -right-4 -bottom-2 bg-white rounded-full p-1 border-2 border-white" />
                </div>
                <p className="text-sm text-gray-600">Share your Online Store link to your customers where they can place an order</p>
                {/* Connecting dashed lines */}
                <div className="hidden md:block absolute top-20 -left-12 w-24 border-t-2 border-dashed border-gray-300"></div>
                <div className="hidden md:block absolute top-20 -right-12 w-24 border-t-2 border-dashed border-gray-300"></div>
              </div>
              
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center space-y-4">
                <h3 className="font-bold text-[13px] text-gray-700 uppercase tracking-wider">GET ONLINE ORDERS</h3>
                <div className="h-32 flex items-center justify-center">
                  <FileText size={80} className="text-orange-300" strokeWidth={1} />
                </div>
                <p className="text-sm text-gray-600">Order is automatically generated as a Quotation in myBillBook</p>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 flex flex-col items-center border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-4">By Creating online store, you agree to abide by the <strong>myBillBook Acceptable Usage Policy</strong></p>
              <button 
                onClick={handleCreateStore}
                className="bg-[#E67E4D] hover:bg-[#d66a39] text-white font-bold px-12 py-2.5 rounded-md transition-colors shadow-sm"
              >
                CREATE STORE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
