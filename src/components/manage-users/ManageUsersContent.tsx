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
  Trash2,
  ShieldAlert,
  KeyRound,
  MoreVertical,
  Edit3
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs, limit, orderBy, addDoc, where, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { hashPin } from "@/lib/crypto";
import { useSession } from "@/context/SessionContext";
import Loader from "@/components/Loader";

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
  passcode?: string;
};

export default function ManageUsersContent() {
  const [tab, setTab] = useState<"users" | "user_activity">("users");

  const [allActivities, setAllActivities] = useState<ActivityLog[]>([]);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Import Session context to get adminPin
  const { adminPin, activeProfile, loading: sessionLoading } = useSession();
  
  // Admin PIN setup state
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [newAdminPin, setNewAdminPin] = useState("");
  const [settingAdminPin, setSettingAdminPin] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All Transactions");
  const [filterDays, setFilterDays] = useState(30);

  const [showAddUser, setShowAddUser] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", phone: "", role: "Salesman", passcode: "" });
  
  const [editingUser, setEditingUser] = useState<SubUser | null>(null);
  const [updatingUser, setUpdatingUser] = useState(false);
  
  // Reset PIN State
  const [showResetPin, setShowResetPin] = useState<{id: string, name: string} | null>(null);
  const [resetPinValue, setResetPinValue] = useState("");
  const [resettingPin, setResettingPin] = useState(false);

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

        // 5. Fetch System Logs
        try {
          const sysSnap = await getDocs(query(collection(db, "systemLogs"), where("userId", "==", user.uid)));
          sysSnap.forEach(doc => {
            const d = doc.data();
            if (!d.createdAt) return;
            const dateObj = parseDate(d.createdAt);
            logs.push({
              id: `sys-${doc.id}`,
              timeRaw: dateObj,
              time: formatTime(dateObj),
              activity: d.activity || "System Event",
              details: d.details || "",
              amount: undefined,
              performedBy: d.performedBy || "System"
            });
          });
        } catch (e) {
          console.warn("Could not fetch system logs", e);
        }

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
    if (newUser.passcode.length !== 4 || !/^\d+$/.test(newUser.passcode)) return toast.error("PIN must be exactly 4 digits");
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      setAddingUser(true);
      const hashedPin = await hashPin(newUser.passcode);
      const userData = {
        adminId: user.uid,
        name: newUser.name.trim(),
        phone: newUser.phone.trim(),
        role: newUser.role,
        passcode: hashedPin,
        createdAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, "subusers"), userData);
      
      setSubUsers([...subUsers, { id: docRef.id, ...userData }]);
      setShowAddUser(false);
      setNewUser({ name: "", phone: "", role: "Salesman", passcode: "" });
      toast.success("User added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editingUser.name.trim()) return toast.error("User Name is required");
    try {
      setUpdatingUser(true);
      const userRef = doc(db, "subusers", editingUser.id);
      await updateDoc(userRef, {
        name: editingUser.name.trim(),
        phone: editingUser.phone.trim(),
        role: editingUser.role,
      });
      setSubUsers(subUsers.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      toast.success("User updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user");
    } finally {
      setUpdatingUser(false);
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

  const handleSetAdminPin = async () => {
    if (newAdminPin.length !== 4 || !/^\d+$/.test(newAdminPin)) return toast.error("PIN must be exactly 4 digits");
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    setSettingAdminPin(true);
    try {
      const hashedPin = await hashPin(newAdminPin);
      await setDoc(doc(db, "settings", user.uid), { adminPin: hashedPin }, { merge: true });
      setShowAdminPinModal(false);
      setNewAdminPin("");
      toast.success("Master PIN updated successfully! 🔒 Please refresh or switch sessions to apply.");
      // We can rely on session context reload or user doing it manually
    } catch (err) {
      toast.error("Failed to update Master PIN");
    } finally {
      setSettingAdminPin(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Salesman": return <Users size={14} className="text-amber-500" />;
      case "Stock Manager": return <ShieldCheck size={14} className="text-teal-500" />;
      case "Partner": return <Briefcase size={14} className="text-blue-500" />;
      case "Delivery Boy": return <Truck size={14} className="text-brand-secondary" />;
      case "CA": return <FileSpreadsheet size={16} className="text-purple-500" />;
      default: return <Users size={14} className="text-gray-500" />;
    }
  };

  // Dynamic CSS logic for the diagram
  const renderNodes = subUsers.length > 0 ? subUsers : [{ id: 'empty', name: 'No sub-users added', role: 'Empty' }];
  
  if (sessionLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 font-sans h-full p-8 text-center">
         <Loader size={48} />
      </div>
    );
  }

  if (!activeProfile.isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 font-sans h-full p-8 text-center">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md">
          This dashboard contains sensitive Master Admin security controls. 
          Your current role ({activeProfile.role}) does not have permission to view or manage passwords.
        </p>
      </div>
    );
  }

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
        
        {/* Master Security Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs w-full flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex items-center gap-4 ml-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${adminPin ? 'bg-indigo-100 text-indigo-600' : 'bg-red-100 text-red-600'}`}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Master Admin Security</h3>
              <p className="text-[10px] text-gray-500 font-medium">
                {adminPin ? "Your Admin profile is protected by a Master PIN." : "Warning: No Master PIN configured. Admin profile is unprotected."}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowAdminPinModal(true)}
            className={`text-xs px-5 py-2 rounded font-bold shadow-xs transition-all ${adminPin ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-indigo-600 border border-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30"}`}
          >
            {adminPin ? "Change Master PIN" : "Setup Master PIN"}
          </button>
        </div>

        {/* Tabs / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div 
            onClick={() => setTab("users")}
            className={`flex-1 p-4 rounded-lg cursor-pointer border transition-colors relative shadow-sm ${
              tab === "users" ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-gray-200 hover:border-indigo-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className={tab === "users" ? "text-brand-tertiary" : "text-gray-400"} />
              <span className={`text-[11px] font-bold tracking-wider uppercase ${tab === "users" ? "text-brand-tertiary" : "text-gray-500"}`}>Number of Users</span>
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
            
            /* PREMIUM PASSWORD DASHBOARD TABLE */
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Employee Credentials</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAddUser(true)} className="text-[10px] font-bold text-white bg-indigo-600 px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus size={12} /> Add Employee
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                      <th className="py-3 px-6">Employee Name</th>
                      <th className="py-3 px-6">System Role</th>
                      <th className="py-3 px-6">Phone Number</th>
                      <th className="py-3 px-6">Passcode / PIN</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-gray-700 divide-y divide-gray-50">
                    {subUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <UserCog size={32} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium">No employees configured yet.</p>
                        </td>
                      </tr>
                    ) : (
                      subUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="py-3 px-6 font-bold text-gray-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            {user.name}
                          </td>
                          <td className="py-3 px-6">
                            <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              {getRoleIcon(user.role)} {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-gray-500 font-mono text-[11px]">{user.phone}</td>
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none tracking-[0.2em] font-black text-gray-400 mt-1">••••</span>
                              {user.passcode ? (
                                <span className="bg-emerald-50 text-brand-tertiary border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                                  <Lock size={8} /> Secured
                                </span>
                              ) : (
                                <span className="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                                  <ShieldAlert size={8} /> No PIN
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-6 text-right">
                            <div className="flex items-center justify-end gap-2 transition-opacity">
                              <button 
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                                title="Edit Employee"
                              >
                                <Edit3 size={14} />
                              </button>
                              <div className="w-px h-4 bg-gray-200 mx-1"></div>
                              <button 
                                onClick={() => setShowResetPin({id: user.id, name: user.name})}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded transition-colors flex items-center gap-1"
                                title="Change PIN"
                              >
                                <KeyRound size={12} /> <span className="text-[10px] font-bold uppercase tracking-wider">Change PIN</span>
                              </button>
                              <div className="w-px h-4 bg-gray-200 mx-1"></div>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete Employee"
                              >
                                <Trash2 size={14} />
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
                      <tr>
                        <td colSpan={4} className="text-center py-12">
                          <Loader size={24} />
                        </td>
                      </tr>
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
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">4-Digit PIN *</label>
                <input 
                  type="password"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={newUser.passcode}
                  onChange={(e) => setNewUser({ ...newUser, passcode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center shadow-xs bg-gray-50 focus:bg-white transition-colors"
                />
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed font-medium bg-blue-50/50 p-2 rounded border border-blue-100">
                  This PIN will be required when switching to this user session.
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

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 size={14} className="text-blue-500" />
                Edit Employee
              </span>
              <button 
                onClick={() => setEditingUser(null)}
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
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
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
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3 py-2 text-xs focus:outline-none font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assign Role</label>
                <div className="relative">
                  <select 
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs appearance-none focus:outline-none focus:border-indigo-500 font-semibold shadow-xs bg-gray-50 focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="Salesman">Salesman</option>
                    <option value="Stock Manager">Stock Manager</option>
                    <option value="Partner">Partner</option>
                    <option value="Delivery Boy">Delivery Boy</option>
                    <option value="CA">CA</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="border-t border-gray-150 pt-5 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-xs text-gray-600 border border-gray-300 bg-white px-5 py-1.5 rounded hover:bg-gray-50 font-bold transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateUser}
                  disabled={updatingUser}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-6 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-all"
                >
                  {updatingUser ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET PIN MODAL */}
      {showResetPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={14} className="text-indigo-500" />
                Reset PIN for {showResetPin.name}
              </span>
              <button 
                onClick={() => setShowResetPin(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors bg-white border border-gray-200 shadow-sm"
              >
                <X size={13} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-gray-600">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">New 4-Digit PIN</label>
                <input 
                  type="password"
                  maxLength={4}
                  placeholder="Enter new 4-digit PIN"
                  value={resetPinValue}
                  onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center shadow-xs bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div className="border-t border-gray-150 pt-5 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPin(null)}
                  className="text-xs text-gray-600 border border-gray-300 bg-white px-5 py-1.5 rounded hover:bg-gray-50 font-bold transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (resetPinValue.length !== 4) return toast.error("PIN must be exactly 4 digits");
                    setResettingPin(true);
                    try {
                      const hashedPin = await hashPin(resetPinValue);
                      await updateDoc(doc(db, "subusers", showResetPin.id), { passcode: hashedPin });
                      
                      // Also update local state
                      setSubUsers(subUsers.map(u => u.id === showResetPin.id ? { ...u, passcode: hashedPin } : u));
                      
                      // Log it
                      const user = auth.currentUser;
                      if (user) {
                         await addDoc(collection(db, "systemLogs"), {
                           userId: user.uid,
                           activity: "PIN Reset",
                           details: `Admin reset PIN for ${showResetPin.name}`,
                           performedBy: "Admin",
                           createdAt: new Date()
                         });
                      }

                      toast.success("PIN reset successfully");
                      setShowResetPin(null);
                      setResetPinValue("");
                    } catch (e) {
                      toast.error("Failed to reset PIN");
                    } finally {
                      setResettingPin(false);
                    }
                  }}
                  disabled={resettingPin}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-6 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-all"
                >
                  {resettingPin ? "Saving..." : "Save PIN"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Setup Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-500" />
                {adminPin ? "Change Master PIN" : "Setup Master PIN"}
              </span>
              <button 
                onClick={() => setShowAdminPinModal(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors bg-white border border-gray-200 shadow-sm"
              >
                <X size={13} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-gray-600">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">New 4-Digit Master PIN</label>
                <input 
                  type="password"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center shadow-xs bg-gray-50 focus:bg-white transition-colors"
                />
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed font-medium bg-indigo-50/50 p-2 rounded border border-indigo-100">
                  This PIN protects the Admin profile from unauthorized switching by other employees.
                </p>
              </div>

              <div className="border-t border-gray-150 pt-5 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className="text-xs text-gray-600 border border-gray-300 bg-white px-5 py-1.5 rounded hover:bg-gray-50 font-bold transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetAdminPin}
                  disabled={settingAdminPin}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-6 py-1.5 rounded hover:bg-indigo-700 font-bold shadow-sm transition-all"
                >
                  {settingAdminPin ? "Saving..." : "Save PIN"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
