"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, ChevronLeft, ChevronRight, Settings, 
  MoreVertical, Clock, Check, X, Search, ChevronDown
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Staff = {
  id: string;
  name: string;
  phone: string;
  salaryType: string;
  salaryAmount: number;
  balance: number;
  computedBalance?: number;
};

type AttendanceRecord = {
  id?: string;
  staffId: string;
  date: string;
  status: "P" | "A" | "HD" | "PL" | "WO" | "";
  overtimeAmount?: number;
  overtimeHours?: number;
};

type Settings = {
  reminderEnabled: boolean;
  reminderTime: string;
  markPresentByDefault: boolean;
  workingHours: number;
  workingMinutes: number;
  weeklyOffs: string[];
};

export default function StaffAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modals
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOvertime, setShowOvertime] = useState<{staffId: string, name: string} | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Forms
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", salaryType: "Monthly", salaryAmount: "" });
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    reminderEnabled: true,
    reminderTime: "10:00",
    markPresentByDefault: true,
    workingHours: 8,
    workingMinutes: 0,
    weeklyOffs: ["Sun", "Sat"]
  });
  const [overtimeForm, setOvertimeForm] = useState({ type: "Hourly rate", hours: 0, minutes: 0, rate: 0, fixedAmount: 0 });

  const formattedDate = currentDate.toISOString().split("T")[0];
  const displayDate = currentDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user.uid, formattedDate);
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [formattedDate, router]);

  const fetchData = async (userId: string, dateStr: string) => {
    setLoading(true);
    try {
      // Fetch Staff
      const sq = query(collection(db, "staffProfiles"), where("userId", "==", userId));
      const sSnap = await getDocs(sq);
      let sList = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff));

      // Fetch ALL Attendance (for computing true balance)
      const aqAll = query(collection(db, "attendanceRecords"), where("userId", "==", userId));
      const aSnapAll = await getDocs(aqAll);
      
      const recs: Record<string, AttendanceRecord> = {};
      aSnapAll.docs.forEach(d => {
        const data = d.data();
        if (data.date === dateStr) {
          recs[data.staffId] = { id: d.id, ...data } as AttendanceRecord;
        }
      });
      setRecords(recs);

      // Fetch ALL Transactions
      const tqAll = query(collection(db, "staffTransactions"), where("userId", "==", userId));
      const tSnapAll = await getDocs(tqAll);

      // Compute True Balance
      sList = sList.map(s => {
        let dailyWage = 0;
        if (s.salaryType === "Monthly") dailyWage = s.salaryAmount / 30;
        else if (s.salaryType === "Per Day") dailyWage = s.salaryAmount;
        else dailyWage = s.salaryAmount * 8;
        
        let totalEarnings = 0;
        aSnapAll.docs.forEach(d => {
          const data = d.data();
          if (data.staffId === s.id) {
            if (data.status === "P" || data.status === "PL" || data.status === "WO") totalEarnings += dailyWage;
            else if (data.status === "HD") totalEarnings += (dailyWage / 2);
          }
        });

        let totalPayments = 0;
        let totalCollections = 0;
        tSnapAll.docs.forEach(d => {
          const data = d.data();
          if (data.staffId === s.id) {
            if (data.paymentType === "Collection") totalCollections += data.amount;
            else totalPayments += data.amount;
          }
        });

        const computedBalance = totalEarnings - totalPayments + totalCollections;
        return { ...s, computedBalance };
      });
      
      setStaff(sList);

      // Fetch Settings
      const setRef = query(collection(db, "attendanceSettings"), where("userId", "==", userId));
      const setSnap = await getDocs(setRef);
      if (!setSnap.empty) {
        setSettings(setSnap.docs[0].data() as Settings);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load staff data");
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (staffId: string, status: AttendanceRecord["status"]) => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const existingRecord = records[staffId];
      const recordData = {
        userId: user.uid,
        staffId,
        date: formattedDate,
        status,
        updatedAt: new Date()
      };

      if (existingRecord?.id) {
        await updateDoc(doc(db, "attendanceRecords", existingRecord.id), recordData);
        setRecords(prev => ({ ...prev, [staffId]: { ...prev[staffId], status } }));
      } else {
        const docRef = await addDoc(collection(db, "attendanceRecords"), recordData);
        setRecords(prev => ({ ...prev, [staffId]: { id: docRef.id, ...recordData } as AttendanceRecord }));
      }
      
      // Update local computedBalance dynamically
      let deltaEarn = 0;
      const s = staff.find(st => st.id === staffId);
      if (s) {
        let dailyWage = 0;
        if (s.salaryType === "Monthly") dailyWage = s.salaryAmount / 30;
        else if (s.salaryType === "Per Day") dailyWage = s.salaryAmount;
        else dailyWage = s.salaryAmount * 8;
        
        const oldStatus = existingRecord?.status;
        let oldEarn = 0;
        if (oldStatus === "P" || oldStatus === "PL" || oldStatus === "WO") oldEarn = dailyWage;
        else if (oldStatus === "HD") oldEarn = dailyWage / 2;
        
        let newEarn = 0;
        if (status === "P" || status === "PL" || status === "WO") newEarn = dailyWage;
        else if (status === "HD") newEarn = dailyWage / 2;
        
        deltaEarn = newEarn - oldEarn;
      }
      setStaff(prev => prev.map(st => st.id === staffId ? { ...st, computedBalance: (st.computedBalance || 0) + deltaEarn } : st));
      
      toast.success(`Marked as ${status}`);
      setActiveDropdown(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance");
    }
  };

  const handleEditClick = (staffObj: Staff) => {
    setNewStaff({
      name: staffObj.name,
      phone: staffObj.phone,
      salaryType: staffObj.salaryType,
      salaryAmount: String(staffObj.salaryAmount)
    });
    setEditStaffId(staffObj.id);
    setShowAddStaff(true);
  };

  const handleAddStaff = async () => {
    if (!newStaff.name) return toast.error("Name is required");
    const user = auth.currentUser;
    if (!user) return;

    try {
      if (editStaffId) {
        const updateData = {
          name: newStaff.name,
          phone: newStaff.phone,
          salaryType: newStaff.salaryType,
          salaryAmount: Number(newStaff.salaryAmount || 0),
        };
        await updateDoc(doc(db, "staffProfiles", editStaffId), updateData);
        setStaff(prev => prev.map(s => s.id === editStaffId ? { ...s, ...updateData } : s));
        toast.success("Staff updated successfully");
      } else {
        const data = {
          userId: user.uid,
          name: newStaff.name,
          phone: newStaff.phone,
          salaryType: newStaff.salaryType,
          salaryAmount: Number(newStaff.salaryAmount || 0),
          balance: 0,
          createdAt: new Date()
        };
        const docRef = await addDoc(collection(db, "staffProfiles"), data);
        setStaff(prev => [...prev, { id: docRef.id, ...data }]);
        toast.success("Staff added successfully");
      }
      
      setShowAddStaff(false);
      setNewStaff({ name: "", phone: "", salaryType: "Monthly", salaryAmount: "" });
      setEditStaffId(null);
    } catch (err) {
      console.error(err);
      toast.error(editStaffId ? "Failed to update staff" : "Failed to add staff");
    }
  };

  const handleSaveSettings = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "attendanceSettings", user.uid), { ...settings, userId: user.uid });
      setShowSettings(false);
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    }
  };

  const handleSaveOvertime = async () => {
    if (!showOvertime) return;
    const user = auth.currentUser;
    if (!user) return;

    let amount = 0;
    if (overtimeForm.type === "Hourly rate") {
      amount = (overtimeForm.hours + (overtimeForm.minutes / 60)) * overtimeForm.rate;
    } else {
      amount = overtimeForm.fixedAmount;
    }

    try {
      const existingRecord = records[showOvertime.staffId];
      const recordData = {
        userId: user.uid,
        staffId: showOvertime.staffId,
        date: formattedDate,
        overtimeAmount: amount,
        overtimeHours: overtimeForm.hours + (overtimeForm.minutes / 60),
        status: existingRecord?.status || "P",
        updatedAt: new Date()
      };

      if (existingRecord?.id) {
        await updateDoc(doc(db, "attendanceRecords", existingRecord.id), recordData);
        setRecords(prev => ({ ...prev, [showOvertime.staffId]: { ...prev[showOvertime.staffId], ...recordData } as AttendanceRecord }));
      } else {
        const docRef = await addDoc(collection(db, "attendanceRecords"), recordData);
        setRecords(prev => ({ ...prev, [showOvertime.staffId]: { id: docRef.id, ...recordData } as AttendanceRecord }));
      }
      setShowOvertime(null);
      setOvertimeForm({ type: "Hourly rate", hours: 0, minutes: 0, rate: 0, fixedAmount: 0 });
      toast.success("Overtime added!");
    } catch (err) {
      toast.error("Failed to add overtime");
    }
  };

  // Calculations for summary
  const summary = { P: 0, A: 0, HD: 0, PL: 0, WO: 0 };
  Object.values(records).forEach(r => {
    if (r.status === "P") summary.P++;
    else if (r.status === "A") summary.A++;
    else if (r.status === "HD") summary.HD++;
    else if (r.status === "PL") summary.PL++;
    else if (r.status === "WO") summary.WO++;
  });
  
  const totalPending = staff.reduce((acc, s) => acc + (s.computedBalance || 0), 0);

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Staff Attendance & Payroll</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 border border-gray-200 px-3 py-2 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <Settings size={14} />
            <span>Attendance Settings</span>
          </button>
          <button 
            onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs font-bold transition shadow-sm"
          >
            <Plus size={14} />
            <span>Add Staff</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          
          {/* Date Picker Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">{displayDate}</h2>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <button onClick={prevDay} className="p-1.5 hover:bg-gray-50 transition border-r border-gray-200">
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 flex items-center gap-2 bg-gray-50/50">
                <Calendar size={13} className="text-gray-500" />
                <span>Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <button onClick={nextDay} className="p-1.5 hover:bg-gray-50 transition border-l border-gray-200">
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="grid grid-cols-5 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/30">
            {[
              { label: "Present (P)", val: summary.P },
              { label: "Absent (A)", val: summary.A },
              { label: "Half day (HD)", val: summary.HD },
              { label: "Paid Leave (PL)", val: summary.PL },
              { label: "Weekly off (WO)", val: summary.WO },
            ].map((stat, i) => (
              <div key={i} className="px-6 py-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-black text-gray-800 mt-0.5">{stat.val}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Staff Name</th>
                  <th className="px-6 py-3">Mobile Number</th>
                  <th className="px-6 py-3">Last Month Due</th>
                  <th className="px-6 py-3">Balance</th>
                  <th className="px-6 py-3 w-64">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                      <div className="flex items-center justify-center gap-2">
                         <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                         Loading staff...
                      </div>
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                      No staff found. Click "Add Staff" to begin.
                    </td>
                  </tr>
                ) : (
                  staff.map(s => {
                    const status = records[s.id]?.status;
                    const isP = status === "P";
                    const isA = status === "A";
                    const isOther = ["HD", "PL", "WO"].includes(status || "");
                    
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-sm text-gray-800">
                            {s.name}
                          </span>
                          <div className="mt-1">
                            <Link href={`/dashboard/staff/${s.id}`} className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded hover:bg-indigo-100 transition inline-block">
                              View Details
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-600">{s.phone || "-"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-500">-</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                             <span className={(s.computedBalance || 0) >= 0 ? "text-brand-tertiary" : "text-red-500"}>
                               {(s.computedBalance || 0) >= 0 ? "↑" : "↓"}
                             </span>
                             ₹{Math.abs(s.computedBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => markAttendance(s.id, "P")}
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold border transition ${
                                isP ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-brand-tertiary border-gray-200 hover:bg-green-50'
                              }`}
                            >
                              P
                            </button>
                            <button 
                              onClick={() => markAttendance(s.id, "A")}
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold border transition ${
                                isA ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-red-400 border-gray-200 hover:bg-red-50'
                              }`}
                            >
                              A
                            </button>
                            
                            {/* Other Status Badge if selected */}
                            {isOther && (
                              <div className={`px-2 h-8 rounded flex items-center justify-center text-xs font-bold border ${
                                status === 'HD' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                status === 'PL' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {status}
                              </div>
                            )}

                            {/* Dropdown */}
                            <div className="relative">
                              <button 
                                onClick={() => setActiveDropdown(activeDropdown === s.id ? null : s.id)}
                                className="w-8 h-8 rounded flex items-center justify-center text-gray-400 border border-gray-200 bg-white hover:bg-gray-50 transition"
                              >
                                <MoreVertical size={14} />
                              </button>
                              
                              {activeDropdown === s.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                  <div className="absolute right-0 top-10 w-36 bg-white border border-gray-200 rounded shadow-lg py-1 z-20 text-[11px] font-bold text-gray-700">
                                    <button onClick={() => markAttendance(s.id, "HD")} className="w-full text-left px-4 py-2 hover:bg-gray-50">Half day</button>
                                    <button onClick={() => markAttendance(s.id, "PL")} className="w-full text-left px-4 py-2 hover:bg-gray-50">Paid leave</button>
                                    <button onClick={() => markAttendance(s.id, "WO")} className="w-full text-left px-4 py-2 hover:bg-gray-50">Week off</button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button onClick={() => { setShowOvertime({staffId: s.id, name: s.name}); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Add overtime</button>
                                    <button onClick={() => { handleEditClick(s); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-indigo-600">Edit Staff</button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
                {/* Footer Total */}
                {!loading && staff.length > 0 && (
                  <tr className="bg-gray-50/50">
                    <td colSpan={3} className="px-6 py-4 text-xs font-bold text-gray-700">Pending amount</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                         <span className="text-red-500">↑</span>
                         ₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                       </div>
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- MODALS --- */}
      
      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editStaffId ? "Edit Staff" : "Add Staff"}</h2>
              <button onClick={() => { setShowAddStaff(false); setEditStaffId(null); setNewStaff({ name: "", phone: "", salaryType: "Monthly", salaryAmount: "" }); }} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Staff Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newStaff.name} 
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})} 
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                  placeholder="E.g. Rohit"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Mobile Number</label>
                <input 
                  type="tel" 
                  value={newStaff.phone} 
                  onChange={e => setNewStaff({...newStaff, phone: e.target.value})} 
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                  placeholder="10-digit number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Salary Type</label>
                  <select 
                    value={newStaff.salaryType} 
                    onChange={e => setNewStaff({...newStaff, salaryType: e.target.value})} 
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 transition"
                  >
                    <option>Monthly</option>
                    <option>Per Day</option>
                    <option>Hourly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Salary Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input 
                      type="number" 
                      value={newStaff.salaryAmount} 
                      onChange={e => setNewStaff({...newStaff, salaryAmount: e.target.value})} 
                      className="w-full border border-gray-200 rounded pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => { setShowAddStaff(false); setEditStaffId(null); setNewStaff({ name: "", phone: "", salaryType: "Monthly", salaryAmount: "" }); }} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition">Cancel</button>
              <button onClick={handleAddStaff} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition shadow-sm">{editStaffId ? "Update Staff" : "Save Staff"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Attendance Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Daily Reminder */}
              <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Enable Daily Attendance Reminder</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Reminder time {settings.reminderTime}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.reminderEnabled} onChange={e => setSettings({...settings, reminderEnabled: e.target.checked})} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {settings.reminderEnabled && (
                  <input type="time" value={settings.reminderTime} onChange={e => setSettings({...settings, reminderTime: e.target.value})} className="border border-gray-200 rounded px-3 py-1.5 text-sm w-32" />
                )}
              </div>

              {/* Mark Present Default */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-sm font-bold text-gray-800">Mark Present By Default</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.markPresentByDefault} onChange={e => setSettings({...settings, markPresentByDefault: e.target.checked})} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Working Hours */}
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Set Up Working Hours In A Shift</h3>
                <div className="flex gap-4 items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500">Number of hours</span>
                    <div className="flex items-center gap-2">
                      <select value={settings.workingHours} onChange={e => setSettings({...settings, workingHours: Number(e.target.value)})} className="border border-gray-200 rounded px-2 py-1.5 text-sm w-20">
                        {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                      </select>
                      <span className="text-xs text-gray-500">Hrs</span>
                      <select value={settings.workingMinutes} onChange={e => setSettings({...settings, workingMinutes: Number(e.target.value)})} className="border border-gray-200 rounded px-2 py-1.5 text-sm w-20">
                        {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                      </select>
                      <span className="text-xs text-gray-500">Min</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Total working hours in a day = {settings.workingHours.toString().padStart(2, '0')}:{settings.workingMinutes.toString().padStart(2, '0')}hrs</p>
              </div>

              {/* Weekly Off */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Set Up Weekly Off</h3>
                <div className="flex gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <button 
                      key={day}
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev,
                          weeklyOffs: prev.weeklyOffs.includes(day) 
                            ? prev.weeklyOffs.filter(d => d !== day)
                            : [...prev.weeklyOffs, day]
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition ${
                        settings.weeklyOffs.includes(day) ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">By default all {settings.weeklyOffs.join(", ")} will be marked weekly off</p>
              </div>

            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition">Cancel</button>
              <button onClick={handleSaveSettings} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition shadow-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Overtime Modal */}
      {showOvertime && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Overtime</h2>
              <button onClick={() => setShowOvertime(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              
              <div className="flex items-center gap-10">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Staff name</p>
                  <p className="text-sm font-bold text-gray-800">{showOvertime.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Date</p>
                  <p className="text-sm font-bold text-gray-800">{displayDate}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Overtime Type</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input type="radio" checked={overtimeForm.type === "Hourly rate"} onChange={() => setOvertimeForm({...overtimeForm, type: "Hourly rate"})} className="accent-indigo-600" /> Hourly rate
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input type="radio" checked={overtimeForm.type === "Fixed amount"} onChange={() => setOvertimeForm({...overtimeForm, type: "Fixed amount"})} className="accent-indigo-600" /> Fixed amount
                  </label>
                </div>
              </div>

              {overtimeForm.type === "Hourly rate" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-red-500 uppercase mb-1 block">Number of hours *</label>
                    <div className="flex items-center gap-2">
                      <select value={overtimeForm.hours} onChange={e => setOvertimeForm({...overtimeForm, hours: Number(e.target.value)})} className="border border-gray-200 rounded px-2 py-1.5 text-sm w-16 focus:border-indigo-500">
                        {Array.from({length: 13}, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                      </select>
                      <span className="text-xs text-gray-500">Hrs</span>
                      <span className="text-gray-300">:</span>
                      <select value={overtimeForm.minutes} onChange={e => setOvertimeForm({...overtimeForm, minutes: Number(e.target.value)})} className="border border-gray-200 rounded px-2 py-1.5 text-sm w-16 focus:border-indigo-500">
                         {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                      </select>
                      <span className="text-xs text-gray-500">Min</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-red-500 uppercase mb-1 block">Overtime rate *</label>
                    <div className="flex bg-gray-50 border border-gray-200 rounded p-1">
                      <div className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-700">
                        1x Salary <ChevronDown size={12} className="text-gray-400" />
                      </div>
                      <div className="flex-1 px-2 py-1 flex items-center justify-end text-xs font-bold text-gray-700 relative">
                        <span className="text-gray-400 mr-1">₹</span>
                        <input type="number" value={overtimeForm.rate} onChange={e => setOvertimeForm({...overtimeForm, rate: Number(e.target.value)})} className="w-12 bg-transparent text-right outline-none" />
                        <span className="text-gray-400 ml-1">/Hr</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                   <label className="text-[10px] font-bold text-red-500 uppercase mb-1 block">Fixed Amount *</label>
                   <div className="relative w-48">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                      <input 
                        type="number" 
                        value={overtimeForm.fixedAmount} 
                        onChange={e => setOvertimeForm({...overtimeForm, fixedAmount: Number(e.target.value)})} 
                        className="w-full border border-gray-200 rounded pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                        placeholder="0.00"
                      />
                   </div>
                </div>
              )}

              <div className="bg-indigo-50/50 border border-indigo-100 rounded px-4 py-3">
                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Total amount</p>
                 <p className="text-sm font-black text-indigo-900">
                   {overtimeForm.type === "Hourly rate" 
                    ? `${overtimeForm.hours.toString().padStart(2, '0')}:${overtimeForm.minutes.toString().padStart(2, '0')} X ₹${overtimeForm.rate} = ₹${((overtimeForm.hours + (overtimeForm.minutes / 60)) * overtimeForm.rate).toFixed(2)}` 
                    : `₹${overtimeForm.fixedAmount.toFixed(2)}`}
                 </p>
              </div>

            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowOvertime(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition">Cancel</button>
              <button onClick={handleSaveOvertime} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition shadow-sm">Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
