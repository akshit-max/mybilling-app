"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Activity, 
  ChevronDown, 
  Plus, 
  Search, 
  Lock, 
  Briefcase, 
  ShieldCheck, 
  Truck, 
  FileSpreadsheet,
  UserCog,
  Eye,
  X,
  HelpCircle,
  Trash2
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs, limit, orderBy, addDoc, where, deleteDoc, doc } from "firebase/firestore";
import toast from "react-hot-toast";

type ActivityLog = {
  id: string;
  timeRaw: Date;
  time: string;
  activity: string;
  details: string;
  amount?: number;
  performedBy: string;
};

type SubUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

export default function ManageUsersContent() {
  const [tab, setTab] = useState<"users" | "user_activity">("users");

  const [allActivities, setAllActivities] = useState<ActivityLog[]>([]);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All Transactions");
  const [filterDays, setFilterDays] = useState(30);

  const [showAddUser, setShowAddUser] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", phone: "", role: "Salesman" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch Sub Users
        const usersQ = query(collection(db, "subusers"), where("adminId", "==", user.uid));
        const usersSnap = await getDocs(usersQ);
        setSubUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubUser)));

        const logs: ActivityLog[] = [];
        
        // Helper to safely parse Firestore Timestamps or strings
        const parseDate = (val: any): Date => {
          if (!val) return new Date();
          if (typeof val.toDate === 'function') return val.toDate();
          if (val.seconds) return new Date(val.seconds * 1000);
          return new Date(val);
        };

        const formatTime = (date: Date) => date.toLocaleString('en-IN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        });

        // 1. Fetch Invoices
        const invSnap = await getDocs(query(collection(db, "invoices"), where("userId", "==", user.uid)));
        invSnap.forEach(doc => {
          const d = doc.data();
          if (!d.createdAt) return;
          const dateObj = parseDate(d.createdAt);
          logs.push({
            id: `inv-${doc.id}`,
            timeRaw: dateObj,
            time: formatTime(dateObj),
            activity: d.invoiceType === 'quotation' ? "Created Quotation" : "Created Sales Invoice",
            details: `${d.customerName || 'Cash Sale'} #${d.invoiceNumber || ''}`,
            amount: d.total || 0,
            performedBy: d.createdBy || "Admin"
          });
        });

        // 2. Fetch Expenses
        const expSnap = await getDocs(query(collection(db, "expenses"), where("userId", "==", user.uid)));
        expSnap.forEach(doc => {
          const d = doc.data();
          if (!d.createdAt) return;
          const dateObj = parseDate(d.createdAt);
          logs.push({
            id: `exp-${doc.id}`,
            timeRaw: dateObj,
            time: formatTime(dateObj),
            activity: "Recorded Expense",
            details: d.category || "General Expense",
            amount: d.amount || d.totalAmount || 0,
            performedBy: d.createdBy || "Admin"
          });
        });

        // 3. Fetch Products
        const prodSnap = await getDocs(query(collection(db, "products"), where("userId", "==", user.uid)));
        prodSnap.forEach(doc => {
          const d = doc.data();
          if (!d.createdAt) return;
          const dateObj = parseDate(d.createdAt);
          logs.push({
            id: `prod-${doc.id}`,
            timeRaw: dateObj,
            time: formatTime(dateObj),
            activity: "Added New Item",
            details: d.name || "Unknown Item",
            amount: d.sellingPrice || 0,
            performedBy: d.createdBy || "Admin"
          });
        });

        // 4. Fetch Customers
        const custSnap = await getDocs(query(collection(db, "customers"), where("userId", "==", user.uid)));
        custSnap.forEach(doc => {
          const d = doc.data();
          if (!d.createdAt) return;
          const dateObj = parseDate(d.createdAt);
          logs.push({
            id: `cust-${doc.id}`,
            timeRaw: dateObj,
            time: formatTime(dateObj),
            activity: "Added New Party",
            details: d.name || "Unknown Party",
            amount: undefined, 
            performedBy: d.createdBy || "Admin"
          });
        });

        // Sort by time descending
        logs.sort((a, b) => b.timeRaw.getTime() - a.timeRaw.getTime());
        setAllActivities(logs);
        
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredActivities = allActivities.filter(act => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!act.activity.toLowerCase().includes(q) && 
          !act.details.toLowerCase().includes(q) && 
          !act.performedBy.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterType !== "All Transactions") {
      if (filterType === "Sales & Invoices" && !act.activity.includes("Invoice") && !act.activity.includes("Quotation")) return false;
      if (filterType === "Expenses" && !act.activity.includes("Expense")) return false;
      if (filterType === "Inventory" && !act.activity.includes("Item")) return false;
      if (filterType === "Parties" && !act.activity.includes("Party")) return false;
    }
    if (filterDays !== 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filterDays);
      if (act.timeRaw < cutoff) return false;
    }
    return true;
  });

  const handleAddUser = async () => {
    if (!newUser.name.trim()) return toast.error("User Name is required");
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      setAddingUser(true);
      const userData = {
        adminId: user.uid,
        name: newUser.name.trim(),
        phone: newUser.phone.trim(),
        role: newUser.role,
        createdAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, "subusers"), userData);
      
      setSubUsers([...subUsers, { id: docRef.id, ...userData }]);
      setShowAddUser(false);
      setNewUser({ name: "", phone: "", role: "Salesman" });
      toast.success("User added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    try {
      await deleteDoc(doc(db, "subusers", id));
      setSubUsers(subUsers.filter((u) => u.id !== id));
      toast.success("User removed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove user");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Salesman": return <Users size={14} className="text-amber-500" />;
      case "Stock Manager": return <ShieldCheck size={14} className="text-teal-500" />;
      case "Partner": return <Briefcase size={14} className="text-blue-500" />;
      case "Delivery Boy": return <Truck size={14} className="text-orange-500" />;
      case "CA": return <FileSpreadsheet size={16} className="text-purple-500" />;
      default: return <Users size={14} className="text-gray-500" />;
    }
  };

  // Dynamic CSS logic for the diagram
  const renderNodes = subUsers.length > 0 ? subUsers : [{ id: 'empty', name: 'No sub-users added', role: 'Empty' }];
  
  return (
    <div className="flex-1 flex flex-col bg-gray-50/30 overflow-y-auto font-sans h-full">
      
      {/* Top Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs bg-white">
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Manage Users</h2>
          <p className="text-[10px] text-gray-500 font-medium">Manage your team and track their activities</p>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <HelpCircle size={16} />
        </button>
      </div>

      <main className="w-full max-w-5xl mx-auto p-6 space-y-6">
        
        {/* Tabs / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div 
            onClick={() => setTab("users")}
            className={`flex-1 p-4 rounded-lg cursor-pointer border transition-colors relative shadow-sm ${
              tab === "users" ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-gray-200 hover:border-indigo-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className={tab === "users" ? "text-emerald-500" : "text-gray-400"} />
              <span className={`text-[11px] font-bold tracking-wider uppercase ${tab === "users" ? "text-emerald-600" : "text-gray-500"}`}>Number of Users</span>
            </div>
            <div className={`text-xl font-mono font-bold ${tab === "users" ? "text-indigo-900" : "text-gray-800"}`}>
              {loading ? '-' : (subUsers.length + 1)}
            </div>
          </div>

          <div 
            onClick={() => setTab("user_activity")}
            className={`flex-1 p-4 rounded-lg cursor-pointer border transition-colors relative shadow-sm ${
              tab === "user_activity" ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-gray-200 hover:border-indigo-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className={tab === "user_activity" ? "text-indigo-500" : "text-gray-400"} />
              <span className={`text-[11px] font-bold tracking-wider uppercase ${tab === "user_activity" ? "text-indigo-500" : "text-gray-500"}`}>Activities Performed</span>
            </div>
            <div className={`text-xl font-mono font-bold ${tab === "user_activity" ? "text-indigo-600" : "text-gray-800"}`}>
              {loading ? '-' : filteredActivities.length}
            </div>
            {tab === "user_activity" && filterDays !== 0 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded border border-gray-200 shadow-xs">
                Last {filterDays} Days
              </div>
            )}
          </div>

        </div>

        {/* Dynamic Content Area */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          
          {tab === "users" ? (
            
            /* USERS HIERARCHY VIEW */
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/30">
              
              {/* CSS Hierarchy Diagram */}
              <div className="flex items-center justify-center gap-12 mb-16 select-none relative">
                
                {/* Admin Node */}
                <div className="relative group">
                  <div className="w-20 h-20 bg-white border-2 border-emerald-400 rounded-lg shadow-sm flex flex-col items-center justify-center z-10 relative">
                    <UserCog size={32} className="text-emerald-500 mb-1" />
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Admin</span>
                  </div>
                  <div className="absolute top-1/2 right-[-180px] -translate-y-1/2 bg-gray-800 text-white text-[10px] font-semibold px-3 py-2 rounded z-20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Give access to users and monitor their actions
                  </div>
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center z-20">
                     <Eye size={12} className="text-emerald-600" />
                  </div>
                </div>

                {/* Connecting Lines (Dynamic based on nodes count) */}
                <div className="relative w-16 flex items-center" style={{ height: Math.max(50, renderNodes.length * 56) }}>
                  {/* Horizontal Line out of Admin */}
                  <div className="absolute left-0 top-1/2 w-8 border-b-2 border-dashed border-gray-300"></div>
                  
                  {renderNodes.length > 1 && (
                    <div className="absolute left-8 top-6 bottom-6 border-l-2 border-dashed border-gray-300"></div>
                  )}

                  {/* Branches */}
                  {renderNodes.map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute left-8 w-8 border-b-2 border-dashed border-gray-300"
                      style={{ 
                        top: renderNodes.length === 1 ? '50%' : `${(i / (renderNodes.length - 1)) * 100}%`,
                        marginTop: renderNodes.length === 1 ? '-1px' : (i === 0 ? '24px' : (i === renderNodes.length - 1 ? '-24px' : '0px'))
                      }}
                    ></div>
                  ))}
                </div>

                {/* Roles Nodes */}
                <div className="flex flex-col gap-4 z-10 relative" style={{ minHeight: Math.max(50, renderNodes.length * 56) }}>
                  {renderNodes.map((user, idx) => (
                    <div key={user.id || idx} className="flex items-center gap-3">
                      <div className="w-48 bg-white border border-gray-200 rounded p-2 flex items-center justify-between shadow-sm hover:border-indigo-300 transition-colors">
                        <div className="flex items-center gap-2">
                           {getRoleIcon(user.role)}
                           <span className="text-[11px] font-bold text-gray-800 truncate max-w-[90px]">{user.name}</span>
                        </div>
                        {user.role !== 'Empty' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded truncate max-w-[60px]">{user.role}</span>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove user"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Title & CTA */}
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Give access to users and monitor their actions</h2>
                  <p className="text-xs text-gray-500 font-medium mt-1">Manage your business more efficiently with full control and vision</p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setShowAddUser(true)} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded text-sm transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add New User
                  </button>
                  <button 
                    onClick={() => setShowAddUser(true)} 
                    className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold px-6 py-2 rounded text-sm transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Your CA
                  </button>
                </div>
              </div>

            </div>
          ) : (
            
            /* USER ACTIVITY VIEW */
            <div className="flex-1 flex flex-col">
              
              {/* Toolbar */}
              <div className="p-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input 
                    type="text" 
                    placeholder="Search activities..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-56 focus:outline-none focus:border-indigo-500 bg-white shadow-xs"
                  />
                </div>
                
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50 shadow-xs text-[10px] font-semibold text-gray-600 uppercase tracking-wider focus:outline-none"
                >
                  <option value="All Transactions">All Transactions</option>
                  <option value="Sales & Invoices">Sales & Invoices</option>
                  <option value="Expenses">Expenses</option>
                  <option value="Inventory">Inventory Items</option>
                  <option value="Parties">Parties</option>
                </select>

                <select 
                  value={filterDays}
                  onChange={(e) => setFilterDays(Number(e.target.value))}
                  className="border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50 shadow-xs text-[10px] font-semibold text-gray-600 uppercase tracking-wider focus:outline-none"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 3 Months</option>
                  <option value={0}>All Time</option>
                </select>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold tracking-wider text-[10px] uppercase">
                    <tr>
                      <th className="px-6 py-3 flex items-center gap-1 cursor-pointer">Time of Activity <ChevronDown size={12}/></th>
                      <th className="px-6 py-3">Activity</th>
                      <th className="px-6 py-3">Transaction Details</th>
                      <th className="px-6 py-3">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading activities...</td></tr>
                    ) : filteredActivities.length > 0 ? (
                      filteredActivities.map((act) => (
                        <tr key={act.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-500 font-medium">{act.time}</td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded border border-gray-200 text-[10px] font-bold">
                              {act.activity}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-800">{act.details}</div>
                            {act.amount !== undefined && (
                              <div className="text-gray-400 text-[10px] font-mono mt-0.5">
                                ₹ {act.amount.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-bold">{act.performedBy}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400">No recent activity</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Promotional Banner */}
              <div className="m-4 bg-indigo-50/50 border border-indigo-100 rounded-lg p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center relative border border-indigo-50">
                    <Lock size={16} className="absolute -top-2 -left-2 bg-amber-100 p-1 rounded-full text-amber-600 border border-amber-200" />
                    <Activity size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Interested to see how your users create and edit transactions?</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">With User Activity Tracker, you can get full visibility into your user's activities</p>
                  </div>
                </div>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Track All Activities
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ADD USER MODAL */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-indigo-500" />
                Add New User
              </span>
              <button 
                onClick={() => setShowAddUser(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors bg-white border border-gray-200 shadow-sm"
              >
                <X size={13} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-gray-600">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">User Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold shadow-xs bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                <div className="flex items-center border border-gray-200 rounded bg-white relative shadow-xs overflow-hidden">
                  <div className="px-3 py-2 border-r border-gray-200 text-gray-500 bg-gray-50 font-bold">+91</div>
                  <input 
                    type="tel"
                    placeholder="Enter 10 digit number"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3 py-2 text-xs focus:outline-none font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assign Role</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white font-semibold shadow-xs"
                >
                  <option value="Salesman">Salesman</option>
                  <option value="Stock Manager">Stock Manager</option>
                  <option value="Partner">Partner</option>
                  <option value="Delivery Boy">Delivery Boy</option>
                  <option value="CA">Chartered Accountant (CA)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed font-medium bg-blue-50/50 p-2 rounded border border-blue-100">
                  Roles define what features this user can access in your company. You can change this later.
                </p>
              </div>

              <div className="border-t border-gray-150 pt-5 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="text-xs text-gray-600 border border-gray-300 bg-white px-5 py-1.5 rounded hover:bg-gray-50 font-bold transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddUser}
                  disabled={addingUser}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-6 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-all"
                >
                  {addingUser ? "Adding..." : "Add User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
