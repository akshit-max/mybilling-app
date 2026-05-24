"use client";

import React, { useState, useEffect } from "react";
import { 
  PackageSearch, Plus, ChevronDown, Edit, Trash2, 
  ArrowRightLeft, Check, X, ReceiptText, MapPin 
} from "lucide-react";
import toast from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, addDoc, 
  updateDoc, doc, getDoc, serverTimestamp, deleteDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Godown = {
  id: string;
  name: string;
  address: string;
  isMain: boolean;
  userId: string;
};

type Product = {
  id: string;
  name: string;
  itemCode?: string;
  batch?: string;
  price: number;
  purchasePrice?: number;
  stock: number;
  stockByGodown?: Record<string, number>;
};

export default function GodownPage() {
  const [loading, setLoading] = useState(true);
  const [hasEnabled, setHasEnabled] = useState(false);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodownId, setSelectedGodownId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isGodownDropdownOpen, setIsGodownDropdownOpen] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editGodownId, setEditGodownId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferToId, setTransferToId] = useState("");
  const [transferQuantities, setTransferQuantities] = useState<Record<string, number>>({});
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check Settings
          const settingsSnap = await getDoc(doc(db, "settings", user.uid));
          const hasGodown = settingsSnap.exists() && settingsSnap.data().hasGodownEnabled;
          setHasEnabled(!!hasGodown);

          if (hasGodown) {
            await fetchGodowns(user.uid);
            await fetchProducts(user.uid);
          }
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

  const fetchGodowns = async (userId: string) => {
    const q = query(collection(db, "godowns"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Godown));
    // Sort so Main Godown is first
    data.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
    setGodowns(data);
    if (data.length > 0 && !selectedGodownId) {
      setSelectedGodownId(data[0].id);
    }
  };

  const fetchProducts = async (userId: string) => {
    const q = query(collection(db, "products"), where("userId", "==", userId));
    const snap = await getDocs(q);
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
  };

  const handleEnableGodown = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      // 1. Fetch user profile to get business name
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const businessName = userSnap.exists() ? userSnap.data().businessName : "My Business";
      const address = userSnap.exists() ? userSnap.data().businessAddress : "";

      // 2. Create Main Godown
      const newGodown = {
        name: `${businessName} (Main Store)`,
        address: address || "Main Location",
        isMain: true,
        userId: user.uid,
        createdAt: serverTimestamp()
      };
      const gDoc = await addDoc(collection(db, "godowns"), newGodown);
      
      // 3. Update Settings
      await updateDoc(doc(db, "settings", user.uid), {
        hasGodownEnabled: true
      });

      setHasEnabled(true);
      await fetchGodowns(user.uid);
      await fetchProducts(user.uid);
      toast.success("Godown Management Enabled!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable Godown");
    }
  };

  const handleSaveGodown = async () => {
    const user = auth.currentUser;
    if (!user || !formName.trim()) return;

    try {
      if (editGodownId) {
        await updateDoc(doc(db, "godowns", editGodownId), {
          name: formName.trim(),
          address: formAddress.trim()
        });
        toast.success("Godown updated");
      } else {
        await addDoc(collection(db, "godowns"), {
          name: formName.trim(),
          address: formAddress.trim(),
          isMain: false,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        toast.success("Godown created");
      }
      setShowCreateModal(false);
      fetchGodowns(user.uid);
    } catch (err) {
      console.error(err);
      toast.error("Error saving Godown");
    }
  };

  const handleDeleteGodown = async () => {
    const user = auth.currentUser;
    if (!user || !selectedGodownId) return;

    const g = godowns.find(x => x.id === selectedGodownId);
    if (g?.isMain) return toast.error("Cannot delete the Main Godown");

    try {
      // Check if it has stock
      const hasStock = products.some(p => (p.stockByGodown?.[selectedGodownId] || 0) > 0);
      if (hasStock) {
        setShowDeleteModal(false);
        return toast.error("Cannot delete a Godown that has stock. Transfer it first.");
      }

      await deleteDoc(doc(db, "godowns", selectedGodownId));
      setShowDeleteModal(false);
      toast.success("Godown deleted");
      
      const newGodowns = godowns.filter(x => x.id !== selectedGodownId);
      setGodowns(newGodowns);
      if (newGodowns.length > 0) setSelectedGodownId(newGodowns[0].id);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete Godown");
    }
  };

  const openCreateModal = (g?: Godown) => {
    if (g) {
      setEditGodownId(g.id);
      setFormName(g.name);
      setFormAddress(g.address);
    } else {
      setEditGodownId(null);
      setFormName("");
      setFormAddress("");
    }
    setShowCreateModal(true);
  };

  const getStockQty = (product: Product, gId: string) => {
    const godown = godowns.find(g => g.id === gId);
    if (!product.stockByGodown) {
      return godown?.isMain ? product.stock : 0;
    }
    return product.stockByGodown[gId] || 0;
  };

  const toggleProductSelection = (pId: string) => {
    if (selectedProducts.includes(pId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== pId));
    } else {
      setSelectedProducts([...selectedProducts, pId]);
    }
  };

  const handleOpenTransferModal = () => {
    if (selectedProducts.length === 0) return;
    
    // Initialize transfer quantities with max available stock
    const initialQtys: Record<string, number> = {};
    selectedProducts.forEach(pId => {
      const p = products.find(x => x.id === pId);
      if (p) {
        initialQtys[pId] = getStockQty(p, selectedGodownId);
      }
    });
    setTransferQuantities(initialQtys);
    setTransferToId("");
    setShowTransferModal(true);
  };

  const handleTransferStock = async () => {
    const user = auth.currentUser;
    if (!user || !transferToId) return toast.error("Select destination Godown");
    if (transferToId === selectedGodownId) return toast.error("Cannot transfer to the same Godown");

    try {
      const mainGodown = godowns.find(g => g.isMain);
      if (!mainGodown) throw new Error("Main Godown not found");

      // Process each product transfer
      const updates = selectedProducts.map(async (pId) => {
        const p = products.find(x => x.id === pId);
        if (!p) return;
        
        const transferQty = transferQuantities[pId] || 0;
        if (transferQty <= 0) return;

        // Ensure backwards compatibility with stockByGodown
        const currentStockByGodown = p.stockByGodown || { [mainGodown.id]: p.stock };
        const fromStock = currentStockByGodown[selectedGodownId] || 0;

        if (transferQty > fromStock) throw new Error(`Transfer quantity exceeds available stock for ${p.name}`);

        const newStockByGodown = { ...currentStockByGodown };
        newStockByGodown[selectedGodownId] = fromStock - transferQty;
        newStockByGodown[transferToId] = (newStockByGodown[transferToId] || 0) + transferQty;

        await updateDoc(doc(db, "products", p.id), {
          stockByGodown: newStockByGodown
        });
      });

      await Promise.all(updates);

      setShowTransferModal(false);
      setSelectedProducts([]);
      await fetchProducts(user.uid);
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to transfer stock");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const selectedGodown = godowns.find(g => g.id === selectedGodownId);
  const activeProducts = products.filter(p => getStockQty(p, selectedGodownId) > 0);

  if (!hasEnabled) {
    return (
      <div className="flex flex-col bg-white min-h-[85vh] border border-gray-200 rounded-lg shadow-sm font-sans">
        <div className="h-16 border-b border-gray-200 flex items-center px-6 shrink-0 shadow-xs">
          <h2 className="text-sm font-bold text-gray-800">Godown Management</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
          <div className="relative w-72 h-40 mb-8 flex items-end justify-center">
            <div className="w-56 h-32 bg-[#e2e8f0] rounded-t-lg border-2 border-gray-300 relative overflow-hidden flex flex-col justify-end items-center pb-2">
              <div className="absolute top-2 w-full text-center text-gray-400 font-bold tracking-widest text-lg opacity-50">GODOWN</div>
              <div className="w-24 h-20 bg-gray-400/20 border-t-2 border-l-2 border-r-2 border-gray-300 flex flex-col justify-evenly px-2">
                <div className="h-0.5 bg-gray-300 w-full"></div>
                <div className="h-0.5 bg-gray-300 w-full"></div>
                <div className="h-0.5 bg-gray-300 w-full"></div>
                <div className="h-0.5 bg-gray-300 w-full"></div>
              </div>
            </div>
            <div className="absolute left-4 bottom-0 flex flex-col items-center">
              <div className="w-10 h-10 bg-amber-400/80 border-2 border-amber-500 rounded-sm relative overflow-hidden">
                 <div className="absolute -inset-2 border border-amber-300/50 rotate-45"></div>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                <div className="w-10 h-10 bg-amber-500/80 border-2 border-amber-600 rounded-sm"></div>
                <div className="w-10 h-10 bg-amber-400/80 border-2 border-amber-500 rounded-sm"></div>
              </div>
            </div>
            <div className="absolute right-8 bottom-0 flex items-end gap-1">
              <div className="w-8 h-12 bg-blue-600/80 rounded flex flex-col items-center justify-end pb-1 border border-blue-700">
                 <div className="w-3 h-3 bg-yellow-400 rounded-full mb-1"></div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="w-12 h-8 bg-amber-300/80 border-2 border-amber-400 rounded-sm"></div>
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">Start managing multiple Godowns!</h3>
          <p className="text-xs font-medium text-gray-500 max-w-lg mb-8 leading-relaxed">
            You can easily monitor and track your inventory across various Godowns and Store locations
          </p>
          <button 
            onClick={handleEnableGodown}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700 shadow-md transition-colors"
          >
            Enable Godown
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white min-h-[85vh] border border-gray-200 rounded-lg shadow-sm font-sans relative">
      
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-xs bg-white z-20">
        <h2 className="text-sm font-bold text-gray-800">Godown Management</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenTransferModal}
            disabled={selectedProducts.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 text-gray-600 font-bold text-xs rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ArrowRightLeft size={14} />
            Transfer Stock
          </button>
          <button 
            onClick={() => openCreateModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded text-xs shadow-sm transition-colors"
          >
            Create Godown
          </button>
        </div>
      </div>

      <div className="p-6 bg-gray-50 flex-1">
        
        {/* Godown Selector and Warning banner */}
        <div className="mb-4 space-y-3">
          <div className="relative inline-block w-64">
            <button 
              onClick={() => setIsGodownDropdownOpen(!isGodownDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-700 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <ReceiptText size={16} className="text-gray-400" />
                <span className="font-medium truncate">{selectedGodown?.name || "Select Godown"}</span>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            
            {isGodownDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30 py-1">
                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                  Active Godowns
                </div>
                {godowns.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGodownId(g.id);
                      setSelectedProducts([]);
                      setIsGodownDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedGodownId === g.id ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-gray-700"}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-full bg-amber-50 text-amber-800 text-xs font-medium py-2 rounded text-center border border-amber-100">
            Serialized items are not shown here
          </div>
        </div>

        {/* Selected Godown Info */}
        <div className="bg-white border border-gray-200 rounded-t-lg p-5 flex items-start justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-base font-bold text-gray-800">{selectedGodown?.name}</h3>
              {selectedGodown?.isMain && (
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Main Godown
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={12} />
              {selectedGodown?.address || "No Address Provided"}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => openCreateModal(selectedGodown)} className="p-1.5 border border-gray-200 text-gray-500 rounded hover:bg-gray-50 hover:text-indigo-600 transition-colors">
              <Edit size={14} />
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)} 
              className={`p-1.5 border border-gray-200 text-gray-500 rounded hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors ${selectedGodown?.isMain ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={selectedGodown?.isMain}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white border-x border-b border-gray-200 rounded-b-lg shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedProducts(activeProducts.map(p => p.id));
                      else setSelectedProducts([]);
                    }}
                    checked={activeProducts.length > 0 && selectedProducts.length === activeProducts.length}
                  />
                </th>
                <th className="px-4 py-3">Item name</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Item Batch</th>
                <th className="px-4 py-3">Stock QTY</th>
                <th className="px-4 py-3">Stock Value</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">Purchase Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeProducts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-20 bg-white">
                      <div className="mb-4 text-slate-300">
                         <ReceiptText size={48} className="stroke-[1.5]" />
                      </div>
                      <p className="text-xs text-gray-400 font-medium text-center max-w-md leading-relaxed">
                        Godown is Empty. You can easily monitor and track your inventory across various Godown and Store locations
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                activeProducts.map(p => {
                  const qty = getStockQty(p, selectedGodownId);
                  return (
                    <tr key={p.id} className={`hover:bg-indigo-50/30 transition-colors ${selectedProducts.includes(p.id) ? "bg-indigo-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={selectedProducts.includes(p.id)}
                          onChange={() => toggleProductSelection(p.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.itemCode || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{p.batch || "-"}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{qty} PCS</td>
                      <td className="px-4 py-3 font-medium text-gray-800">₹{(qty * p.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">₹{p.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">₹{p.purchasePrice?.toFixed(2) || "0.0"}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CREATE / EDIT GODOWN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editGodownId ? "Edit Godown" : "Create Godown"}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Godown Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. Jayanagar Godown"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Godown Address</label>
                <textarea 
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="Full address of the location"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleSaveGodown} disabled={!formName.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">Save Godown</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE GODOWN MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border-t-4 border-red-500">
            <div className="p-4 flex justify-between items-center border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Delete Godown?</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">This godown will be deleted permanently. Are you sure you want to proceed?</p>
            </div>
            <div className="p-4 bg-gray-50 flex items-center justify-center gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-8 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-bold hover:bg-gray-50 shadow-sm">Leave</button>
              <button onClick={handleDeleteGodown} className="px-8 py-2 bg-white border border-red-300 text-red-600 rounded text-sm font-bold hover:bg-red-50 shadow-sm">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER STOCK MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Transfer Godown</h2>
              <button onClick={() => setShowTransferModal(false)} className="p-1 border border-gray-200 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Transfer From <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={selectedGodown?.name || ""}
                  disabled
                  className="w-full p-2 border border-gray-200 bg-gray-50 rounded text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Transfer To <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select 
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm text-gray-700 focus:border-indigo-500 focus:outline-none appearance-none"
                  >
                    <option value="" disabled>Select Godown</option>
                    {godowns.filter(g => g.id !== selectedGodownId).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Items to Transfer */}
              <div className="mt-6">
                <h4 className="text-[11px] font-bold text-gray-500 mb-2 uppercase border-b border-gray-100 pb-1">Items to Transfer ({selectedProducts.length})</h4>
                <div className="space-y-3">
                  {selectedProducts.map(pId => {
                    const p = products.find(x => x.id === pId);
                    if (!p) return null;
                    const maxQty = getStockQty(p, selectedGodownId);
                    return (
                      <div key={pId} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="text-xs font-bold text-gray-700 truncate flex-1">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">Max: {maxQty}</span>
                          <input 
                            type="number"
                            min="1"
                            max={maxQty}
                            value={transferQuantities[pId] || ""}
                            onChange={(e) => setTransferQuantities({...transferQuantities, [pId]: parseInt(e.target.value) || 0})}
                            className="w-16 p-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button 
                onClick={handleTransferStock}
                disabled={!transferToId || selectedProducts.some(p => (transferQuantities[p] || 0) <= 0)}
                className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Transfer Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-8 flex flex-col items-center justify-center animate-in zoom-in-95 border-t-4 border-emerald-500">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <Check size={32} strokeWidth={3} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Stock Transfered Successfully</h2>
          </div>
        </div>
      )}

    </div>
  );
}
