
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, MoreVertical, Download, CreditCard, ChevronDown, ChevronUp, X, Calendar as CalendarIcon } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
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

type Transaction = {
  id: string;
  userId: string;
  staffId: string;
  date: string;
  paymentType: string;
  amount: number;
  paymentMode: string;
  remarks: string;
};

export default function StaffDetailView() {
  const router = useRouter();
  const { id: currentStaffId } = useParams() as { id: string };

  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  
  const [activeTab, setActiveTab] = useState<"Attendance" | "Payroll" | "Transactions" | "Details">("Attendance");
  
  // States
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [monthRecords, setMonthRecords] = useState<Record<string, AttendanceRecord>>({});
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

  // Modals State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    paymentType: "Salary",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMode: "Cash",
    remarks: ""
  });
  
  const [collectForm, setCollectForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMode: "Cash",
    remarks: ""
  });
  
  const [downloadMonth, setDownloadMonth] = useState(new Date().toISOString().split("T")[0].substring(0, 7));

  // Payroll Expandable Rows
  const [expandedEarnings, setExpandedEarnings] = useState(true);
  const [expandedPayments, setExpandedPayments] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchStaffList(user.uid);
        fetchAttendanceData(user.uid, currentMonth);
        fetchTransactions(user.uid);
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [currentStaffId, currentMonth, router]);

  const fetchStaffList = async (userId: string) => {
    try {
      const sq = query(collection(db, "staffProfiles"), where("userId", "==", userId));
      const sSnap = await getDocs(sq);
      let sList = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff));
      
      // Fetch ALL Attendance (for computing true balance)
      const aqAll = query(collection(db, "attendanceRecords"), where("userId", "==", userId));
      const aSnapAll = await getDocs(aqAll);
      
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

      setStaffList(sList);
      
      const found = sList.find(s => s.id === currentStaffId);
      if (found) setCurrentStaff(found);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load staff list");
    }
  };

  const fetchAttendanceData = async (userId: string, dateObj: Date) => {
    setLoading(true);
    try {
      const monthStr = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const monthPrefix = dateObj.getFullYear() + "-" + monthStr;
      
      const aq = query(
        collection(db, "attendanceRecords"), 
        where("userId", "==", userId), 
        where("staffId", "==", currentStaffId)
      );
      
      const aSnap = await getDocs(aq);
      const recs: Record<string, AttendanceRecord> = {};
      const allRecs: AttendanceRecord[] = [];
      
      aSnap.docs.forEach(d => {
        const data = d.data();
        const rec = { id: d.id, ...data } as AttendanceRecord;
        allRecs.push(rec);
        if (data.date && data.date.startsWith(monthPrefix)) {
          recs[data.date] = rec;
        }
      });
      setMonthRecords(recs);
      setAllAttendance(allRecs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (userId: string) => {
    try {
      const tq = query(
        collection(db, "staffTransactions"),
        where("userId", "==", userId),
        where("staffId", "==", currentStaffId)
      );
      const tSnap = await getDocs(tq);
      const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      // Sort by date desc locally
      tList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(tList);
    } catch (err) {
      console.error("Failed to load transactions", err);
    }
  };

  const markAttendance = async (dateStr: string, status: AttendanceRecord["status"]) => {
    const user = auth.currentUser;
    if (!user || !currentStaffId) return;
    try {
      const existingRecord = monthRecords[dateStr];
      const recordData = {
        userId: user.uid,
        staffId: currentStaffId,
        date: dateStr,
        status,
        updatedAt: new Date()
      };
      if (existingRecord?.id) {
        await updateDoc(doc(db, "attendanceRecords", existingRecord.id), recordData);
        setMonthRecords(prev => ({ ...prev, [dateStr]: { ...prev[dateStr], status } }));
      } else {
        const docRef = await addDoc(collection(db, "attendanceRecords"), recordData);
        setMonthRecords(prev => ({ ...prev, [dateStr]: { id: docRef.id, ...recordData } as AttendanceRecord }));
      }
      toast.success("Marked as " + status);
      setActiveDropdown(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance");
    }
  };

  const handleMakePayment = async () => {
    if (!paymentForm.amount || isNaN(Number(paymentForm.amount))) {
      return toast.error("Please enter a valid amount");
    }
    const user = auth.currentUser;
    if (!user || !currentStaff) return;

    try {
      const amount = Number(paymentForm.amount);
      const transData = {
        userId: user.uid,
        staffId: currentStaffId,
        date: paymentForm.date,
        paymentType: paymentForm.paymentType,
        amount: amount,
        paymentMode: paymentForm.paymentMode,
        remarks: paymentForm.remarks,
        createdAt: new Date().toISOString()
      };
      
      const tDocRef = await addDoc(collection(db, "staffTransactions"), transData);
      setTransactions([{ id: tDocRef.id, ...transData }, ...transactions]);

      await addDoc(collection(db, "expenses"), {
        userId: user.uid,
        date: paymentForm.date,
        amount: amount,
        category: "Employee Salaries & Advances",
        paymentMode: paymentForm.paymentMode,
        items: [{
          name: "Payment to " + currentStaff.name + " (" + paymentForm.paymentType + ")",
          amount: amount
        }],
        total: amount,
        status: "Paid",
        notes: paymentForm.remarks,
        createdAt: new Date().toISOString()
      });

      // Decrease balance when business pays staff
      const newBalance = currentStaff.balance - amount;
      await updateDoc(doc(db, "staffProfiles", currentStaffId), { balance: newBalance });
      setCurrentStaff({ ...currentStaff, balance: newBalance });
      
      toast.success("Payment recorded successfully");
      setShowPaymentModal(false);
      setPaymentForm({
        paymentType: "Salary",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        paymentMode: "Cash",
        remarks: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to record payment");
    }
  };

  const handleCollectPayment = async () => {
    if (!collectForm.amount || isNaN(Number(collectForm.amount))) {
      return toast.error("Please enter a valid amount");
    }
    const user = auth.currentUser;
    if (!user || !currentStaff) return;

    try {
      const amount = Number(collectForm.amount);
      const transData = {
        userId: user.uid,
        staffId: currentStaffId,
        date: collectForm.date,
        paymentType: "Collection",
        amount: amount,
        paymentMode: collectForm.paymentMode,
        remarks: collectForm.remarks,
        createdAt: new Date().toISOString()
      };
      
      const tDocRef = await addDoc(collection(db, "staffTransactions"), transData);
      setTransactions([{ id: tDocRef.id, ...transData }, ...transactions]);

      // Increase balance when staff pays back business
      const newBalance = currentStaff.balance + amount;
      await updateDoc(doc(db, "staffProfiles", currentStaffId), { balance: newBalance });
      setCurrentStaff({ ...currentStaff, balance: newBalance });
      
      toast.success("Payment collected successfully");
      setShowCollectModal(false);
      setCollectForm({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        paymentMode: "Cash",
        remarks: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to collect payment");
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days.reverse();
  };
  const daysList = getDaysInMonth();
  
  const monthString = currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shortMonthString = currentMonth.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  const summary = { P: 0, A: 0, HD: 0, PL: 0, WO: 0 };
  Object.values(monthRecords).forEach(r => {
    if (r.status === "P") summary.P++;
    else if (r.status === "A") summary.A++;
    else if (r.status === "HD") summary.HD++;
    else if (r.status === "PL") summary.PL++;
    else if (r.status === "WO") summary.WO++;
  });

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  // --- Payroll Calculations ---
  let dailyWage = 0;
  if (currentStaff) {
    if (currentStaff.salaryType === "Monthly") {
      dailyWage = currentStaff.salaryAmount / 30;
    } else if (currentStaff.salaryType === "Per Day") {
      dailyWage = currentStaff.salaryAmount;
    } else {
      dailyWage = currentStaff.salaryAmount * 8;
    }
  }

  const earningsP = summary.P * dailyWage;
  const earningsPL = summary.PL * dailyWage;
  const earningsWO = summary.WO * dailyWage;
  const totalEarnings = earningsP + earningsPL + earningsWO;

  const currentMonthPrefix = currentMonth.getFullYear() + "-" + (currentMonth.getMonth() + 1).toString().padStart(2, "0");
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonthPrefix));
  // Total Payments out (exclude collections for net earnings payment display)
  const totalPayments = currentMonthTransactions.filter(t => t.paymentType !== "Collection").reduce((acc, t) => acc + t.amount, 0);
  const totalCollections = currentMonthTransactions.filter(t => t.paymentType === "Collection").reduce((acc, t) => acc + t.amount, 0);

  // Start of current month string (e.g. "2026-06-01") — used for filtering
  const currentMonthStartStr = currentMonth.getFullYear() + "-" + (currentMonth.getMonth() + 1).toString().padStart(2, "0") + "-01";

  // Cumulative earnings from attendance before the current month
  const prevCumulativeEarnings = allAttendance
    .filter(r => r.date < currentMonthStartStr)
    .reduce((acc, r) => {
      if (r.status === "P" || r.status === "PL" || r.status === "WO") {
        return acc + dailyWage;
      }
      if (r.status === "HD") {
        return acc + (dailyWage / 2);
      }
      return acc;
    }, 0);

  // --- Payroll Calculations (correct approach) ---
  // previousMonthBalance = what was owed to the staff BEFORE the current month started
  // = sum of earnings from all months before this one, minus all payments before this month
  const prevMonthPayments = transactions
    .filter(t => t.date < currentMonthStartStr && t.paymentType !== "Collection")
    .reduce((acc, t) => acc + t.amount, 0);
  const prevMonthCollections = transactions
    .filter(t => t.date < currentMonthStartStr && t.paymentType === "Collection")
    .reduce((acc, t) => acc + t.amount, 0);
  // Previous month closing balance = prior earnings - prior payments + prior collections
  const previousMonthBalance = prevCumulativeEarnings - prevMonthPayments + prevMonthCollections;

  // Net payable for the current month view = this month's earnings - this month's payments + collections + carry-forward
  const netPayable = totalEarnings - totalPayments + totalCollections + previousMonthBalance;

  // DEBUG LOG FOR USER: Dump the exact records used for the previous month balance
  useEffect(() => {
    if (allAttendance.length > 0 || transactions.length > 0) {
      console.log("=== PREVIOUS MONTH BALANCE DEBUG ===");
      const prevAtt = allAttendance.filter(r => r.date < currentMonthStartStr);
      console.log("1. Previous Earnings records:");
      prevAtt.forEach(a => {
        if (a.status === "P" || a.status === "PL" || a.status === "WO") {
          console.log(`   - Date: ${a.date} | Status: ${a.status} | Amount: ₹${dailyWage}`);
        } else if (a.status === "HD") {
          console.log(`   - Date: ${a.date} | Status: ${a.status} | Amount: ₹${dailyWage / 2}`);
        }
      });

      const prevTx = transactions.filter(t => t.date < currentMonthStartStr);
      console.log("\n2. Previous Payment records:");
      prevTx.filter(t => t.paymentType !== "Collection").forEach(t => {
        console.log(`   - Date: ${t.date} | Type: ${t.paymentType} | Amount: ₹${t.amount}`);
      });

      console.log("\n3. Previous Collection records:");
      prevTx.filter(t => t.paymentType === "Collection").forEach(t => {
        console.log(`   - Date: ${t.date} | Type: ${t.paymentType} | Amount: ₹${t.amount}`);
      });

      console.log("\n4. Final calculation:");
      console.log(`   Previous Earnings = ₹${prevCumulativeEarnings}`);
      console.log(`   Previous Payments = ₹${prevMonthPayments}`);
      console.log(`   Previous Collections = ₹${prevMonthCollections}`);
      console.log(`   Previous Balance = ₹${previousMonthBalance}`);
      console.log("====================================");
    }
  }, [allAttendance, transactions, currentMonthStartStr, prevCumulativeEarnings, prevMonthPayments, prevMonthCollections, previousMonthBalance, dailyWage]);

  // totalDues shown in header = net pending amount the business owes the staff right now
  const totalDues = netPayable;

  if (!currentStaffId) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      
      {/* Left Sidebar (Staff List) */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col hidden lg:flex h-[calc(100vh-60px)] sticky top-[60px]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Staff</h2>
          <button 
            onClick={() => router.push("/dashboard/staff")}
            className="flex items-center gap-1 border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold transition"
          >
            <Plus size={14} /> Add Staff
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {staffList.map(s => {
            const isSelected = s.id === currentStaffId;
            return (
              <Link 
                key={s.id} 
                href={"/dashboard/staff/" + s.id}
                className={"flex items-center justify-between p-4 border-b border-gray-100 transition " + (isSelected ? "bg-indigo-50/60 border-l-4 border-l-indigo-600" : "hover:bg-gray-50 bg-white border-l-4 border-l-transparent")}
              >
                <div>
                  <p className="text-sm font-bold text-gray-800">{s.name}</p>
                  <p className={"text-xs font-bold mt-1 " + ((s.computedBalance || 0) >= 0 ? "text-brand-tertiary" : "text-red-500")}>
                    {(s.computedBalance || 0) >= 0 ? "↑" : "↓"} ₹{Math.abs(s.computedBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1200px] flex flex-col h-[calc(100vh-60px)] overflow-y-auto bg-gray-50/50 relative">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/staff" className="text-gray-400 hover:text-gray-700 transition lg:hidden">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{currentStaff?.name || "Loading..."}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
            <button 
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center gap-2 border border-gray-200 px-3 py-2 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <Download size={14} />
              <span>Download Salary Slip</span>
            </button>

            {/* Make Payment Dropdown */}
            <div className="relative">
              <div className="flex">
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white pl-4 pr-3 py-2 rounded-l text-xs font-bold transition shadow-sm border-r border-indigo-500"
                >
                  Make Payment
                </button>
                <button 
                  onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-2 rounded-r flex items-center justify-center transition shadow-sm"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {showPaymentDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPaymentDropdown(false)} />
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg py-1 z-20">
                    <button 
                      onClick={() => { setShowPaymentDropdown(false); setShowPaymentModal(true); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-700"
                    >
                      Make Payment
                    </button>
                    <button 
                      onClick={() => { setShowPaymentDropdown(false); setShowCollectModal(true); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-700"
                    >
                      Collect Payment
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 flex gap-6 sticky top-[73px] z-10">
          {(["Attendance", "Payroll", "Transactions", "Details"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={"py-3 text-xs font-bold transition border-b-2 " + (activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800")}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          
          {/* ===================== ATTENDANCE TAB ===================== */}
          {activeTab === "Attendance" && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">{monthString}</h3>
                <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <button onClick={prevMonth} className="p-1.5 hover:bg-gray-50 transition border-r border-gray-200">
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-gray-700 bg-gray-50/50 uppercase tracking-wider">
                    This Month: {shortMonthString}
                  </div>
                  <button onClick={nextMonth} className="p-1.5 hover:bg-gray-50 transition border-l border-gray-200">
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>

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

              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 w-72">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={2} className="py-12 text-center text-gray-400 text-sm">
                          Loading attendance records...
                        </td>
                      </tr>
                    ) : (
                      daysList.map(dateObj => {
                        const dateStr = dateObj.toISOString().split("T")[0];
                        const displayStr = dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
                        
                        const status = monthRecords[dateStr]?.status;
                        const isP = status === "P";
                        const isA = status === "A";
                        const isOther = ["HD", "PL", "WO"].includes(status || "");
                        
                        return (
                          <tr key={dateStr} className="hover:bg-gray-50/50 transition group">
                            <td className="px-6 py-3.5 text-xs font-bold text-gray-700">{displayStr}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => markAttendance(dateStr, "P")}
                                  className={"w-8 h-8 rounded flex items-center justify-center text-xs font-bold border transition " + (isP ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-brand-tertiary border-gray-200 hover:bg-green-50")}
                                >
                                  P
                                </button>
                                <button 
                                  onClick={() => markAttendance(dateStr, "A")}
                                  className={"w-8 h-8 rounded flex items-center justify-center text-xs font-bold border transition " + (isA ? "bg-red-100 text-red-700 border-red-200" : "bg-white text-red-400 border-gray-200 hover:bg-red-50")}
                                >
                                  A
                                </button>
                                
                                {isOther && (
                                  <div className={"px-2 h-8 rounded flex items-center justify-center text-[10px] uppercase font-bold tracking-wider border " + (status === "HD" ? "bg-yellow-100 text-yellow-700 border-yellow-200" : status === "PL" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-700 border-gray-200")}>
                                    {status}
                                  </div>
                                )}

                                <div className="relative">
                                  <button 
                                    onClick={() => setActiveDropdown(activeDropdown === dateStr ? null : dateStr)}
                                    className="w-8 h-8 rounded flex items-center justify-center text-gray-400 border border-gray-200 bg-white hover:bg-gray-50 transition"
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                  
                                  {activeDropdown === dateStr && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                      <div className="absolute left-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg py-1 z-20 text-[11px] font-bold text-gray-700">
                                        <button onClick={() => markAttendance(dateStr, "HD")} className="w-full text-left px-4 py-2 hover:bg-gray-50">Half day</button>
                                        <button onClick={() => markAttendance(dateStr, "PL")} className="w-full text-left px-4 py-2 hover:bg-gray-50">Paid leave</button>
                                        <button onClick={() => markAttendance(dateStr, "WO")} className="w-full text-left px-4 py-2 hover:bg-gray-50">Week off</button>
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================== PAYROLL TAB ===================== */}
          {activeTab === "Payroll" && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">{monthString}</h3>
                <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <button onClick={prevMonth} className="p-1.5 hover:bg-gray-50 transition border-r border-gray-200">
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div className="px-6 py-1.5 text-[11px] font-bold text-gray-700 bg-gray-50/50 uppercase tracking-wider">
                    {shortMonthString}
                  </div>
                  <button onClick={nextMonth} className="p-1.5 hover:bg-gray-50 transition border-l border-gray-200">
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/30">
                <div className="px-6 py-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Net Payable</p>
                  <p className={"text-lg font-black mt-0.5 " + (totalDues >= 0 ? "text-brand-tertiary" : "text-red-500")}>
                    {totalDues >= 0 ? "↑" : "↓"} ₹{Math.abs(totalDues).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Month (Due)</p>
                  <p className="text-lg font-black text-gray-800 mt-0.5">
                    ₹{previousMonthBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Loan</p>
                  <p className="text-lg font-black text-gray-800 mt-0.5">₹0.00</p>
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-600">
                  {monthString} - Current Month
                </p>
              </div>

              <div className="min-h-[300px]">
                {/* Earnings Accordion */}
                <div>
                  <button 
                    onClick={() => setExpandedEarnings(!expandedEarnings)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition border-b border-gray-100"
                  >
                    <span className="text-sm font-bold text-gray-900">Earnings</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-900">₹{totalEarnings.toFixed(2)}</span>
                      {expandedEarnings ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>
                  {expandedEarnings && (
                    <div className="bg-gray-50/30 border-b border-gray-100">
                      <div className="flex items-center justify-between px-10 py-3 border-b border-gray-50">
                        <span className="text-xs font-semibold text-gray-600">Present ({summary.P} Days)</span>
                        <span className="text-xs font-semibold text-gray-800">₹{earningsP.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between px-10 py-3 border-b border-gray-50">
                        <span className="text-xs font-semibold text-gray-600">Weekly off ({summary.WO} Days)</span>
                        <span className="text-xs font-semibold text-gray-800">₹{earningsWO.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between px-10 py-3">
                        <span className="text-xs font-semibold text-gray-600">Paid Leave ({summary.PL} Days)</span>
                        <span className="text-xs font-semibold text-gray-800">₹{earningsPL.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payments Accordion */}
                <div>
                  <button 
                    onClick={() => setExpandedPayments(!expandedPayments)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition border-b border-gray-100"
                  >
                    <span className="text-sm font-bold text-gray-900">Payments</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-900">₹{totalPayments.toFixed(2)}</span>
                      {expandedPayments ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>
                  {expandedPayments && (
                    <div className="bg-gray-50/30 border-b border-gray-100">
                      {currentMonthTransactions.filter(t => t.paymentType !== "Collection").length === 0 ? (
                        <div className="px-10 py-3 text-xs text-gray-400">No payments this month</div>
                      ) : (
                        currentMonthTransactions.filter(t => t.paymentType !== "Collection").map(t => (
                          <div key={t.id} className="flex items-center justify-between px-10 py-3 border-b border-gray-50">
                            <span className="text-xs font-semibold text-gray-600">{t.paymentType} ({new Date(t.date).toLocaleDateString("en-GB")})</span>
                            <span className="text-xs font-semibold text-gray-800">₹{t.amount.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Previous Month Balance */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-sm font-bold text-gray-700">Previous month balance</span>
                  <span className={"text-sm font-bold " + (previousMonthBalance >= 0 ? "text-gray-700" : "text-red-500")}>
                    ₹{previousMonthBalance.toFixed(2)}
                  </span>
                </div>

                {/* Net Payable Summary Row */}
                <div className="flex items-center justify-between px-6 py-4 bg-indigo-50/50 border-b border-indigo-100">
                  <span className="text-sm font-bold text-indigo-900">Net Payable (Earnings + Prev. Balance − Payments + Collections)</span>
                  <span className={"text-sm font-extrabold " + (netPayable >= 0 ? "text-indigo-700" : "text-red-600")}>
                    ₹{netPayable.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TRANSACTIONS TAB ===================== */}
          {activeTab === "Transactions" && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-1.5 bg-white text-xs font-bold text-gray-700">
                  <span>All Time</span>
                  <CalendarIcon size={14} className="text-gray-400" />
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-1.5 bg-white text-xs font-bold text-gray-700 min-w-[120px] justify-between">
                  <span>All Types</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
              </div>
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Date Of Payment</th>
                      <th className="px-6 py-3">Payment Type</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      transactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-3.5 text-xs font-bold text-gray-700">
                            {new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                          </td>
                          <td className="px-6 py-3.5 text-xs font-semibold text-gray-600">{t.paymentType}</td>
                          <td className="px-6 py-3.5">
                            <span className={"text-xs font-bold " + (t.paymentType === "Collection" ? "text-red-500" : "text-brand-tertiary")}>
                              {t.paymentType === "Collection" ? "↓" : "↑"} ₹{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-gray-500">{t.remarks || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Details" && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-xl font-bold text-brand-primary shadow-sm shrink-0">
                  {currentStaff?.name.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{currentStaff?.name || "Employee"}</h3>
                  <p className="text-sm text-gray-500 font-semibold">{currentStaff?.phone || "No Phone Number"}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 p-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-5 shadow-sm">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Employment Details</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Salary Type</p>
                        <p className="text-sm font-bold text-gray-900">{currentStaff?.salaryType || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Base Salary</p>
                        <p className="text-sm font-bold text-gray-900">₹{currentStaff?.salaryAmount?.toLocaleString("en-IN") || "0"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</p>
                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-wider">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-5 shadow-sm h-full flex flex-col justify-center items-center text-center">
                    <div className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center text-gray-400 mb-3 shadow-sm">
                      <CreditCard size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Bank Details</h4>
                    <p className="text-xs text-gray-500 mt-1">Bank details have not been added for this employee yet.</p>
                    <button className="mt-4 text-[11px] font-bold text-brand-secondary bg-white border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 transition shadow-sm">
                      Add Bank Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* --- MAKE PAYMENT MODAL --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Make Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full transition">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-red-500 block mb-1">Payment type *</label>
                  <select 
                    value={paymentForm.paymentType} 
                    onChange={e => setPaymentForm({...paymentForm, paymentType: e.target.value})}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white"
                  >
                    <option>Salary</option>
                    <option>Advance</option>
                    <option>Loan</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-red-500 block mb-1">Date *</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={paymentForm.date} 
                      onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-red-500 block mb-1">Amount *</label>
                <div className="flex">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input 
                      type="number" 
                      value={paymentForm.amount} 
                      onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                      className="w-full border border-gray-200 border-r-0 rounded-l pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                      placeholder="0"
                    />
                  </div>
                  <select 
                    value={paymentForm.paymentMode}
                    onChange={e => setPaymentForm({...paymentForm, paymentMode: e.target.value})}
                    className="border border-gray-200 rounded-r px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 w-24 border-l"
                  >
                    <option>Cash</option>
                    <option>Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={paymentForm.remarks} 
                  onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white"
                  placeholder="Enter remarks"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded px-4 py-3 mt-4">
                <p className="text-[10px] text-yellow-800 font-semibold leading-relaxed">
                  <span className="font-bold underline">Note:</span> An expense under the category Employee Salaries & Advances will automatically be created for this payment
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition">Cancel</button>
              <button onClick={handleMakePayment} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition shadow-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* --- COLLECT PAYMENT MODAL --- */}
      {showCollectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Collect Payment</h2>
              <button onClick={() => setShowCollectModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full transition">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Staff name</label>
                  <input 
                    type="text" 
                    readOnly
                    value={currentStaff?.name || ""} 
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-red-500 block mb-1">Date *</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={collectForm.date} 
                      onChange={e => setCollectForm({...collectForm, date: e.target.value})}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-red-500 block mb-1">Amount *</label>
                <div className="flex">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input 
                      type="number" 
                      value={collectForm.amount} 
                      onChange={e => setCollectForm({...collectForm, amount: e.target.value})}
                      className="w-full border border-gray-200 border-r-0 rounded-l pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                      placeholder="0"
                    />
                  </div>
                  <select 
                    value={collectForm.paymentMode}
                    onChange={e => setCollectForm({...collectForm, paymentMode: e.target.value})}
                    className="border border-gray-200 rounded-r px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 w-24 border-l"
                  >
                    <option>Cash</option>
                    <option>Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={collectForm.remarks} 
                  onChange={e => setCollectForm({...collectForm, remarks: e.target.value})}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white"
                  placeholder="Enter remarks"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded px-4 py-3 mt-4">
                <p className="text-[10px] text-yellow-800 font-semibold leading-relaxed">
                  <span className="font-bold underline">Note:</span> Loan given to the staff would be reduced on collecting payment from staff.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowCollectModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition">Cancel</button>
              <button onClick={handleCollectPayment} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition shadow-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DOWNLOAD SALARY SLIP MODAL --- */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-transparent z-50 flex items-start justify-end pr-[200px] pt-[80px]">
          <div className="fixed inset-0" onClick={() => setShowDownloadModal(false)} />
          <div className="bg-white border border-gray-200 rounded shadow-xl py-4 px-4 w-64 z-20">
            <input 
              type="month" 
              value={downloadMonth}
              onChange={e => setDownloadMonth(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowDownloadModal(false)} className="flex-1 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded transition">Cancel</button>
              <Link 
                href={"/dashboard/staff/" + currentStaffId + "/salary-slip?month=" + downloadMonth}
                target="_blank"
                onClick={() => setShowDownloadModal(false)}
                className="flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded text-center transition"
              >
                Download
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
