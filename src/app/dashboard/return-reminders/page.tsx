"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import { MoreVertical, Check, X, Trash2, Edit, Search, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

type ReturnReminder = {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  itemName: string;
  quantity: string;
  issueDate: string;
  dueDate: string;
  status: "Pending" | "Collected" | "Cancelled";
  referenceType: string;
  referenceId: string;
  notes: string;
};

export default function ReturnRemindersPage() {
  const [reminders, setReminders] = useState<ReturnReminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setDropdownOpenId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const fetchReminders = async (uid: string) => {
    try {
      setLoading(true);
      const q = query(collection(db, "returnReminders"), where("userId", "==", uid));
      const snap = await getDocs(q);
      setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReturnReminder)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load return reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) fetchReminders(user.uid);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    if (editingId) {
      try {
        await updateDoc(doc(db, "returnReminders", editingId), {
          customerName,
          itemName,
          quantity,
          dueDate,
        });
        setReminders(prev => prev.map(r => r.id === editingId ? { ...r, customerName, itemName, quantity, dueDate } : r));
        setEditingId(null);
        setCustomerName("");
        setItemName("");
        setQuantity("1");
        setDueDate("");
        toast.success("Reminder updated successfully");
      } catch (err) {
        console.error(err);
        toast.error("Failed to update reminder");
      }
    } else {
      try {
        const payload = {
          userId: user.uid,
          customerId: "",
          customerName,
          itemName,
          quantity,
          issueDate: new Date().toISOString().split("T")[0],
          dueDate,
          status: "Pending",
          referenceType: "Manual",
          referenceId: "",
          notes,
          createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, "returnReminders"), payload);
        setReminders([...reminders, { id: docRef.id, ...payload } as ReturnReminder]);
        
        setCustomerName("");
        setItemName("");
        setQuantity("1");
        setDueDate("");
        setNotes("");
        toast.success("Reminder created successfully");
      } catch (err) {
        console.error(err);
        toast.error("Failed to create reminder");
      }
    }
  };

  const handleEditClick = (r: ReturnReminder) => {
    setEditingId(r.id);
    setCustomerName(r.customerName);
    setItemName(r.itemName);
    setQuantity(r.quantity);
    setDueDate(r.dueDate);
  };

  const handleUpdateStatus = async (id: string, newStatus: "Collected" | "Cancelled") => {
    try {
      // STRICT ISOLATION: Updates ONLY returnReminders collection.
      await updateDoc(doc(db, "returnReminders", id), { status: newStatus });
      setReminders(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast.success(`Marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "returnReminders", id));
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success("Deleted reminder");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete reminder");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading reminders...</div>;

  const todayStr = new Date().toISOString().split("T")[0];
  const pendingCount = reminders.filter(r => r.status === "Pending").length;
  const overdueCount = reminders.filter(r => r.status === "Pending" && r.dueDate < todayStr).length;
  const collectedCount = reminders.filter(r => r.status === "Collected").length;

  const filteredReminders = reminders.filter(r => 
    r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pending</p>
            <p className="text-2xl font-bold text-brand-primary">{pendingCount}</p>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
            <Clock size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Overdue Items</p>
            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <AlertCircle size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">{collectedCount}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm">
        <h2 className="text-sm font-bold text-gray-600 mb-4 uppercase tracking-wider">{editingId ? "Edit Reminder" : "Create New Reminder"}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <input required type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="border p-2 rounded text-sm w-full lg:col-span-1" />
          <input required type="text" placeholder="Item Name" value={itemName} onChange={e => setItemName(e.target.value)} className="border p-2 rounded text-sm w-full lg:col-span-1" />
          <input required type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} className="border p-2 rounded text-sm w-full lg:col-span-1" />
          <input required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border p-2 rounded text-sm w-full lg:col-span-1" />
          <div className="lg:col-span-2 flex gap-2">
            <button type="submit" className="bg-brand-secondary text-white font-bold py-2 px-4 flex-1 rounded shadow hover:bg-brand-secondary/90 transition text-sm whitespace-nowrap">
              {editingId ? "Update" : "Add Reminder"}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={() => { setEditingId(null); setCustomerName(""); setItemName(""); setQuantity("1"); setDueDate(""); }} 
                className="bg-gray-100 text-gray-600 font-bold py-2 px-4 rounded shadow-sm hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-brand-primary/10 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Header & Search */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 shrink-0">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Reminder List</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customer or item..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-white border-b border-gray-100 uppercase text-[10px] font-bold text-gray-400 tracking-wider">
              <tr>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6">Qty</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReminders.map(r => {
              const today = new Date().toISOString().split("T")[0];
              const isOverdue = r.status === "Pending" && r.dueDate < today;
              
              return (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="p-4 font-semibold text-gray-800">{r.customerName}</td>
                <td className="p-4 text-gray-600">{r.itemName}</td>
                <td className="p-4 text-gray-600 font-mono">{r.quantity}</td>
                <td className="p-4 text-gray-600 font-mono">{r.dueDate}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'bg-red-100 text-red-700' : r.status === 'Pending' ? 'bg-orange-100 text-orange-700' : r.status === 'Collected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {isOverdue ? 'Overdue' : r.status}
                  </span>
                </td>
                <td className="p-4 text-right relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDropdownOpenId(dropdownOpenId === r.id ? null : r.id); }}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {dropdownOpenId === r.id && (
                    <div className="absolute right-6 top-10 w-36 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 z-50 py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                      {r.status === "Pending" && (
                        <>
                          <button onClick={() => { handleUpdateStatus(r.id, "Collected"); setDropdownOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-green-600 hover:bg-green-50 flex items-center gap-2 transition">
                            <Check size={14} /> Collect
                          </button>
                          <button onClick={() => { handleEditClick(r); setDropdownOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-brand-secondary hover:bg-brand-secondary/10 flex items-center gap-2 transition">
                            <Edit size={14} /> Edit
                          </button>
                          <button onClick={() => { handleUpdateStatus(r.id, "Cancelled"); setDropdownOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition">
                            <X size={14} /> Cancel
                          </button>
                        </>
                      )}
                      <button onClick={() => { handleDelete(r.id); setDropdownOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 transition">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
            {filteredReminders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Search size={32} className="mb-3 text-gray-300" />
                    <p className="text-sm font-bold uppercase tracking-wider">No reminders found</p>
                    <p className="text-xs mt-1">Try adjusting your search or create a new one.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
