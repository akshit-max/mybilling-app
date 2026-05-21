
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Staff = {
  id: string;
  name: string;
  phone: string;
  salaryType: string;
  salaryAmount: number;
  balance: number;
};

type AttendanceRecord = {
  status: "P" | "A" | "HD" | "PL" | "WO" | "";
};

type Transaction = {
  paymentType: string;
  amount: number;
};

export default function SalarySlipPrintView() {
  const { id: staffId } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month"); // YYYY-MM
  
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [businessName, setBusinessName] = useState("Kirana 24x7");
  const [businessPhone, setBusinessPhone] = useState("9792215477");
  
  const [summary, setSummary] = useState({ P: 0, HD: 0, PL: 0, WO: 0 });
  const [payments, setPayments] = useState(0);
  const [previousBalance, setPreviousBalance] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && monthParam) {
        setBusinessName(user.displayName || "My Business");
        await fetchData(user.uid, monthParam);
      }
    });
    return () => unsub();
  }, [staffId, monthParam]);

  const fetchData = async (userId: string, monthPrefix: string) => {
    try {
      // 1. Fetch Staff Profile
      const sRef = doc(db, "staffProfiles", staffId);
      const sSnap = await getDoc(sRef);
      let currentStaff = null;
      if (sSnap.exists()) {
        currentStaff = { id: sSnap.id, ...sSnap.data() } as Staff;
        setStaff(currentStaff);
      }
      
      if (!currentStaff) return;

      // 2. Fetch Attendance for the month
      const aq = query(
        collection(db, "attendanceRecords"),
        where("userId", "==", userId),
        where("staffId", "==", staffId)
      );
      const aSnap = await getDocs(aq);
      
      const counts = { P: 0, HD: 0, PL: 0, WO: 0 };
      aSnap.docs.forEach(d => {
        const data = d.data();
        if (data.date && data.date.startsWith(monthPrefix)) {
          if (data.status === "P") counts.P++;
          if (data.status === "HD") counts.HD++;
          if (data.status === "PL") counts.PL++;
          if (data.status === "WO") counts.WO++;
        }
      });
      setSummary(counts);

      // 3. Fetch Transactions for the month
      const tq = query(
        collection(db, "staffTransactions"),
        where("userId", "==", userId),
        where("staffId", "==", staffId)
      );
      const tSnap = await getDocs(tq);
      
      let totalPaid = 0;
      tSnap.docs.forEach(d => {
        const data = d.data();
        if (data.date && data.date.startsWith(monthPrefix) && data.paymentType !== "Collection") {
          totalPaid += data.amount;
        }
      });
      setPayments(totalPaid);

      // We approximate previous balance as current balance minus net payable of current month.
      // A more robust system would calculate full ledger historically. For now:
      setPreviousBalance(currentStaff.balance); // Taking current balance as snapshot 

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && staff && monthParam) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, staff, monthParam]);

  if (loading) {
    return <div className="p-10 font-sans text-center text-gray-500">Generating Salary Slip...</div>;
  }

  if (!staff || !monthParam) return <div className="p-10 font-sans">Data not found.</div>;

  // Calculations
  const [year, month] = monthParam.split("-");
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = dateObj.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  
  // Last day of month
  const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
  const cycleString = "01 " + dateObj.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) + " - " + 
                      endOfMonth.getDate() + " " + dateObj.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  let dailyWage = 0;
  if (staff.salaryType === "Monthly") dailyWage = staff.salaryAmount / 30;
  else if (staff.salaryType === "Per Day") dailyWage = staff.salaryAmount;
  else dailyWage = staff.salaryAmount * 8; // Assuming 8hr day

  const earnP = summary.P * dailyWage;
  const earnHD = summary.HD * (dailyWage / 2);
  const earnWO = summary.WO * dailyWage;
  const earnPL = summary.PL * dailyWage;
  const grossEarnings = earnP + earnHD + earnWO + earnPL;

  // Approximate Net Payable = Earnings - Payments + Previous Balance
  // Given screenshot: Net Payable = Earnings + Previous Balance - Payments
  const netPayable = grossEarnings + previousBalance - payments;

  return (
    <div id="print-area" className="bg-white min-h-screen text-gray-900 font-sans p-8 print:p-0 max-w-[800px] mx-auto relative">
      
      {/* Print Button (Hidden during print) */}
      <button 
        onClick={() => window.print()} 
        className="absolute top-8 right-8 print:hidden flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-700 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print
      </button>

      {/* Title */}
      <div className="mb-8 border-b border-gray-200 pb-2 pt-2">
        <h1 className="text-sm font-bold tracking-widest text-gray-600 uppercase">SALARY SLIP</h1>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200 overflow-hidden">
          <img src="/icons/icon-192x192.png" alt="Logo" className="w-10 h-10 object-contain" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{businessName}</h2>
          <p className="text-xs text-gray-600 font-semibold mt-1">Mobile: {businessPhone}</p>
        </div>
      </div>

      {/* Staff Info */}
      <div className="grid grid-cols-2 gap-y-4 text-xs font-bold text-gray-700 mb-10">
        <div className="flex">
          <span className="w-32">Staff Name</span>
          <span className="font-normal">: {staff.name}</span>
        </div>
        <div className="flex">
          <span className="w-32">Mobile number</span>
          <span className="font-normal">: {staff.phone}</span>
        </div>
        <div className="flex">
          <span className="w-32">{staff.salaryType} Salary</span>
          <span className="font-normal">: ₹{staff.salaryAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex">
          <span className="w-32">Salary cycle</span>
          <span className="font-normal">: {cycleString}</span>
        </div>
      </div>

      {/* Tables Container */}
      <div className="border border-gray-300 rounded overflow-hidden mb-6">
        
        {/* Earnings */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 flex justify-between">
          <span className="text-[10px] font-bold text-blue-900 tracking-wider uppercase">Earning</span>
          <span className="text-[10px] font-bold text-blue-900 tracking-wider uppercase">Amount</span>
        </div>
        <div className="divide-y divide-gray-100 px-4">
          {summary.HD > 0 && (
            <div className="flex justify-between py-3 text-xs font-semibold text-gray-600">
              <span>Half Day ({summary.HD} days)</span>
              <span>₹{earnHD.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between py-3 text-xs font-semibold text-gray-600">
            <span>Present ({summary.P} days)</span>
            <span>₹{earnP.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between py-3 text-xs font-semibold text-gray-600">
            <span>Weekly Off ({summary.WO} days)</span>
            <span>₹{earnWO.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {summary.PL > 0 && (
            <div className="flex justify-between py-3 text-xs font-semibold text-gray-600">
              <span>Paid Leave ({summary.PL} days)</span>
              <span>₹{earnPL.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-300 flex justify-between">
          <span className="text-xs font-bold text-gray-900">Gross Earnings</span>
          <span className="text-xs font-bold text-gray-900">₹{grossEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {/* Payments */}
        <div className="bg-blue-50/50 px-4 py-2 border-y border-gray-300 flex justify-between mt-4">
          <span className="text-[10px] font-bold text-blue-900 tracking-wider uppercase">Payments</span>
          <span className="text-[10px] font-bold text-blue-900 tracking-wider uppercase">Amount</span>
        </div>
        <div className="px-4 py-3 flex justify-between text-xs font-semibold text-gray-600">
          <span>Paid</span>
          <span>₹{payments.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-300 flex justify-between">
          <span className="text-xs font-bold text-gray-900">Gross Payments</span>
          <span className="text-xs font-bold text-gray-900">₹{payments.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <p className="text-[9px] text-gray-400 text-right italic mb-8">*Amount not included in the final balance of the Salary Cycle</p>

      {/* Footer Totals */}
      <div className="border border-gray-300 rounded divide-y divide-gray-200">
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs font-semibold text-gray-600">Previous Month Closing Balance</span>
          <span className="text-xs font-semibold text-gray-800">₹{previousBalance.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between px-4 py-3 bg-gray-50">
          <span className="text-xs font-bold text-gray-900">Net Payable (Earnings + Previous Balance - Payments)</span>
          <span className="text-xs font-bold text-gray-900">₹{netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 10mm; }
        }
      `}} />
    </div>
  );
}
