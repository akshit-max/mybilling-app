"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  RefreshCw, 
  ChevronDown, 
  ArrowRight,
  TrendingUp,
  Clock,
  AlertCircle
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type Invoice = {
  id: string;
  customerName: string;
  total: number;
  status: string;
  invoiceNumber?: string;
  createdAt?: Timestamp | Date | any;
  invoiceType?: string;
  amountReceived?: number;
};

export default function Dashboard() {
  const [recentTransactions, setRecentTransactions] = useState<Invoice[]>([]);
  const [allInvoicesCache, setAllInvoicesCache] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ toCollect: 0, toPay: 0, totalSales: 0 });
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [graphMode, setGraphMode] = useState<"daily" | "weekly">("daily");
  const [showGraphDropdown, setShowGraphDropdown] = useState(false);

  // Chart aggregation states
  const [chartPoints, setChartPoints] = useState<{ x: number; y: number; label: string; value: number }[]>([]);
  const [last7DaysSales, setLast7DaysSales] = useState<number>(0);
  const [last7DaysInvoicesCount, setLast7DaysInvoicesCount] = useState<number>(0);
  const [lastWeeksSales, setLastWeeksSales] = useState<number>(0);
  const [lastWeeksInvoicesCount, setLastWeeksInvoicesCount] = useState<number>(0);

  const fetchDashboardData = async (userUid: string) => {
    try {
      setLoading(true);
      
      // 1. Fetch all invoices to compute metrics
      const iq = query(collection(db, "invoices"), where("userId", "==", userUid));
      const isnap = await getDocs(iq);

      let toCollect = 0;
      let toPay = 0;
      let totalSales = 0;

      // Sales Invoices Logic
      const allInvoices = isnap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, ...d } as Invoice;
      });

      allInvoices.forEach(inv => {
        totalSales += inv.total || 0;
        const received = typeof inv.amountReceived === "number"
          ? inv.amountReceived
          : (inv.status === "paid" ? inv.total : 0);
        toCollect += Math.max(0, (inv.total || 0) - received);
      });

      // Purchases Logic for 'To Pay'
      try {
        const pq = query(collection(db, "purchases"), where("userId", "==", userUid));
        const psnap = await getDocs(pq);
        psnap.docs.forEach(doc => {
          const p = doc.data();
          if (p.status !== "cancelled") {
            const total = p.total || 0;
            const paid = typeof p.amountPaid === "number" ? p.amountPaid : (p.status === "paid" ? total : 0);
            toPay += Math.max(0, total - paid);
          }
        });
      } catch(e) { console.warn("Purchases fetch error:", e); }

      setStats({ toCollect, toPay, totalSales });

      // 2. Fetch last 5 transactions
      const recentQ = query(
        collection(db, "invoices"),
        where("userId", "==", userUid),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recentSnap = await getDocs(recentQ);
      
      const recentData = recentSnap.docs.map(doc => ({
         id: doc.id,
         customerName: doc.data().customerName || doc.data().partyName || "Cash Sale",
         total: doc.data().total || 0,
         status: doc.data().status || "paid",
         invoiceNumber: doc.data().invoiceNumber || "1",
         createdAt: doc.data().createdAt,
         invoiceType: doc.data().invoiceType || "invoice"
      })) as Invoice[];

      setRecentTransactions(recentData);

      // 3. Compute dynamic 7-day trend coordinates for SVG curve
      const today = new Date();
      const dailySales = Array(7).fill(0);
      const dailyCounts = Array(7).fill(0);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const chartLabels: string[] = [];

      // Generate dates for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        chartLabels.push(dayNames[d.getDay()]);
      }

      let sevenDaySum = 0;
      let sevenDayCount = 0;

      allInvoices.forEach(inv => {
        if (!inv.createdAt) return;
        const invDate = typeof inv.createdAt.toDate === "function" 
          ? inv.createdAt.toDate() 
          : new Date(inv.createdAt);
        
        const diffTime = Math.abs(today.getTime() - invDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
          sevenDaySum += inv.total || 0;
          sevenDayCount += 1;

          // Find which of the 7 slots this invoice lands on
          const slotIndex = 6 - (diffDays - 1);
          if (slotIndex >= 0 && slotIndex < 7) {
            dailySales[slotIndex] += inv.total || 0;
            dailyCounts[slotIndex] += 1;
          }
        }
      });

      setLast7DaysSales(sevenDaySum);
      setLast7DaysInvoicesCount(sevenDayCount);

      // Construct DAILY points on a 600x180 SVG viewBox coordinate system
      const maxVal = Math.max(...dailySales, 100); 
      const points = chartLabels.map((label, idx) => {
        const x = 40 + idx * 85; // Spread horizontal spacing
        const y = 150 - (dailySales[idx] / maxVal) * 120;
        return { x, y, label, value: dailySales[idx] };
      });

      setChartPoints(points);

      // WEEKLY aggregation — last 4 weeks (for toggle)
      const weekLabels = ["Wk 4", "Wk 3", "Wk 2", "Wk 1"];
      const weeklySales = Array(4).fill(0);
      let weeklySum = 0;
      let weeklyCount = 0;

      allInvoices.forEach(inv => {
        if (!inv.createdAt) return;
        const invDate = typeof inv.createdAt.toDate === "function"
          ? inv.createdAt.toDate()
          : new Date(inv.createdAt);
        const diffDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 28) {
          const weekSlot = 3 - Math.floor(diffDays / 7);
          if (weekSlot >= 0 && weekSlot < 4) {
            weeklySales[weekSlot] += inv.total || 0;
            weeklySum += inv.total || 0;
            weeklyCount += 1;
          }
        }
      });

      setLastWeeksSales(weeklySum);
      setLastWeeksInvoicesCount(weeklyCount);

      // Store all invoices for live re-compute when mode toggles
      setAllInvoicesCache(allInvoices);
      
      // Store weekly points in a ref-like state so toggle can switch immediately
      // We store them but chart points start with daily
      const weeklyMaxVal = Math.max(...weeklySales, 100);
      const weeklyPoints = weekLabels.map((label, idx) => {
        const x = 80 + idx * 145;
        const y = 150 - (weeklySales[idx] / weeklyMaxVal) * 120;
        return { x, y, label, value: weeklySales[idx] };
      });

      // Always keep both ready in component-level refs via a combined state
      // Start with daily
      setChartPoints(points);
      // We'll use graphMode state and recompute in useEffect when mode changes
      (window as any).__weeklyChartPoints = weeklyPoints;
      (window as any).__dailyChartPoints = points;

      // Update Timestamp
      const now = new Date();
      const formatTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formatDay = now.getDate();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formatMonth = months[now.getMonth()];
      const formatYear = now.getFullYear();
      setLastUpdated(`${formatDay} ${formatMonth} ${formatYear} | ${formatTime}`);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchDashboardData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Switch chart points when graph mode changes
  useEffect(() => {
    if (graphMode === "weekly") {
      const pts = (window as any).__weeklyChartPoints;
      if (pts) setChartPoints(pts);
    } else {
      const pts = (window as any).__dailyChartPoints;
      if (pts) setChartPoints(pts);
    }
  }, [graphMode]);

  const handleRefresh = () => {
    const user = auth.currentUser;
    if (user) {
      fetchDashboardData(user.uid);
      toast.success("Metrics updated successfully! ↻");
    }
  };

  // Helper date range calculators for title
  const get7DaysRangeString = () => {
    const today = new Date();
    const startDate = new Date();
    if (graphMode === "weekly") {
      startDate.setDate(today.getDate() - 27);
    } else {
      startDate.setDate(today.getDate() - 6);
    }
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startStr = `${startDate.getDate()} ${months[startDate.getMonth()]} ${startDate.getFullYear()}`;
    const endStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    return `${startStr} to ${endStr}`;
  };

  // Dynamic calculated Total Cash + Bank Balance
  const totalReceived = Math.max(0, stats.totalSales - stats.toCollect);

  // SVG Smooth Bezier Path Constructor
  const getCurvePath = () => {
    if (chartPoints.length === 0) return "";
    let path = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      const cpX1 = chartPoints[i - 1].x + 42;
      const cpY1 = chartPoints[i - 1].y;
      const cpX2 = chartPoints[i].x - 42;
      const cpY2 = chartPoints[i].y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${chartPoints[i].x} ${chartPoints[i].y}`;
    }
    return path;
  };

  const getAreaPath = (linePath: string) => {
    if (!linePath || chartPoints.length === 0) return "";
    return `${linePath} L ${chartPoints[chartPoints.length - 1].x} 150 L ${chartPoints[0].x} 150 Z`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans px-2">
      
      {/* 1. BUSINESS OVERVIEW METRICS */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[13px] font-bold text-gray-800 uppercase tracking-wider">Business Overview</h2>
          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-md shadow-3xs select-none">
            <span>Last Update: {lastUpdated || "Loading..."}</span>
            <button onClick={handleRefresh} className="text-indigo-600 hover:text-indigo-800 transition cursor-pointer">
              <RefreshCw size={11} className="font-bold" />
            </button>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: To Collect */}
          <Link href="/dashboard/customers" className="bg-[#EAF6EC] hover:bg-[#DDF0E2] border border-[#C8E6C9] hover:border-[#A5D6A7] rounded-xl p-5 relative flex flex-col justify-between h-28 transition-all duration-200 group shadow-3xs cursor-pointer">
             <div className="absolute top-4 right-4 text-[#2E7D32]/60 opacity-0 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight size={13} />
             </div>
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#C8E6C9] flex items-center justify-center text-[#2E7D32]">
                  <ArrowDownLeft size={14} className="stroke-[3]" />
                </div>
                <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-wide">To Collect</span>
             </div>
             <h3 className="text-2xl font-bold text-[#2E7D32] tracking-tight mt-3">
               ₹ {stats.toCollect.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
             </h3>
          </Link>

          {/* Card 2: To Pay */}
          <Link href="/dashboard/customers" className="bg-[#FDF2F2] hover:bg-[#FBE3E3] border border-[#FFCDD2] hover:border-[#F8BBD0] rounded-xl p-5 relative flex flex-col justify-between h-28 transition-all duration-200 group shadow-3xs cursor-pointer">
             <div className="absolute top-4 right-4 text-[#C62828]/60 opacity-0 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight size={13} />
             </div>
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#FFCDD2] flex items-center justify-center text-[#C62828]">
                  <ArrowUpRight size={14} className="stroke-[3]" />
                </div>
                <span className="text-xs font-bold text-[#C62828] uppercase tracking-wide">To Pay</span>
             </div>
             <h3 className="text-2xl font-bold text-[#C62828] tracking-tight mt-3">
               ₹ {stats.toPay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
             </h3>
          </Link>

          {/* Card 3: Total Cash + Bank Balance */}
          <Link href="/dashboard/cash-bank" className="bg-[#E8F0FE] hover:bg-[#D2E3FC] border border-[#D2E3FC] hover:border-[#B4D1FA] rounded-xl p-5 relative flex flex-col justify-between h-28 transition-all duration-200 group shadow-3xs cursor-pointer">
             <div className="absolute top-4 right-4 text-[#1A73E8]/60 opacity-0 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight size={13} />
             </div>
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#D2E3FC] flex items-center justify-center text-[#1A73E8]">
                  <Wallet size={13} className="stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-[#1A73E8] uppercase tracking-wide">Total Cash + Bank Balance</span>
             </div>
             <h3 className="text-2xl font-bold text-[#1A73E8] tracking-tight mt-3">
               ₹ {totalReceived.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
             </h3>
          </Link>

        </div>
      </div>

      {/* 2. SPLIT ROW: LATEST TRANSACTIONS & TODAY'S CHECKLIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latest Transactions Table */}
        <div className="lg:col-span-2 flex flex-col bg-white border border-gray-200 rounded-xl shadow-3xs overflow-hidden h-[360px]">
           <div className="px-5 py-4 border-b border-gray-150 bg-gray-50/50 flex justify-between items-center shrink-0">
             <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Latest Transactions</h2>
             <Link href="/dashboard/invoices/create" className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold">
               + Create Invoice
             </Link>
           </div>
           
           <div className="flex-1 overflow-y-auto">
             {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 gap-1.5">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  <span>Loading recent transactions...</span>
                </div>
             ) : recentTransactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 gap-2">
                  <AlertCircle size={24} className="text-gray-300" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Transactions Made Yet</p>
                  <p className="text-[10px] text-gray-400 leading-normal max-w-xs">Create your first sales invoice to immediately generate details on the dashboard dashboard.</p>
                </div>
             ) : (
                <table className="w-full text-left border-collapse text-xs">
                   <thead>
                      <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 bg-gray-50/20 uppercase tracking-wider">
                         <th className="py-2.5 px-5">Date</th>
                         <th className="py-2.5 px-5">Type</th>
                         <th className="py-2.5 px-5">Txn No</th>
                         <th className="py-2.5 px-5">Party Name</th>
                         <th className="py-2.5 px-5 text-right">Amount</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                      {recentTransactions.map((tx) => {
                        const dateFormatted = tx.createdAt
                          ? typeof tx.createdAt.toDate === "function"
                            ? tx.createdAt.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                            : new Date(tx.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                          : "-";
                        
                        const txnType = (tx.invoiceType || "invoice") === "estimate" ? "Estimate" : "Sales Invoices";
                        return (
                          <Link key={tx.id} href={`/dashboard/invoices/${tx.id}`} className="table-row hover:bg-indigo-50/30 cursor-pointer transition-colors">
                             <td className="py-3.5 px-5 font-semibold text-gray-800">{dateFormatted}</td>
                             <td className="py-3.5 px-5 text-gray-500 font-bold">{txnType}</td>
                             <td className="py-3.5 px-5 font-mono text-gray-500">{tx.invoiceNumber}</td>
                             <td className="py-3.5 px-5 text-gray-900 font-bold uppercase truncate max-w-[120px]">{tx.customerName}</td>
                             <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono">₹{tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </Link>
                        );
                      })}
                   </tbody>
                </table>
             )}
           </div>

           {/* Centered see all link */}
           <Link 
             href="/dashboard/invoices" 
             className="text-[10px] text-indigo-600 hover:text-indigo-855 font-bold text-center py-3.5 bg-white hover:bg-gray-50/40 border-t border-gray-150 block uppercase tracking-wider shrink-0 transition"
           >
              See All Transactions
           </Link>
        </div>

        {/* Today's Checklist */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-3xs flex flex-col h-[360px] overflow-hidden">
           <div className="px-5 py-4 border-b border-gray-150 bg-gray-50/50 shrink-0">
             <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Today's Checklist</h2>
           </div>
           
           <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-400 mb-4 opacity-75">
               <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 22h16" strokeLinecap="round" />
                  <path d="M12 2L6 19h12L12 2z" fill="#FFEDD5" />
                  <path d="M8 13h8" strokeLinecap="round" />
                  <path d="M9.5 8h5" strokeLinecap="round" />
               </svg>
             </div>
             <h3 className="text-sm font-bold text-gray-800 mb-1 uppercase tracking-wide">Coming Soon...</h3>
             <p className="text-[10px] text-gray-400 leading-normal max-w-xs font-semibold">Smarter daily checklist for overdue invoices, low stock alerts, and customer follow-ups</p>
           </div>
        </div>

      </div>

      {/* 3. SALES REPORT CHART SECTION */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-3xs overflow-hidden">
         
         <div className="px-5 py-4 border-b border-gray-150 bg-gray-50/50 flex justify-between items-center">
           <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
             Sales Report - {get7DaysRangeString()}
           </h2>
         </div>

         <div className="p-6 flex flex-col lg:flex-row items-center justify-between min-h-[260px] gap-6">
            
            {/* Dynamic Curve Graph Rendering using pure responsive SVG */}
            <div className="flex-1 w-full flex gap-3 h-[180px]">
               
               {/* Dynamic Y-Axis Labels Panel matching FloBiz style */}
               <div className="w-12 h-full flex flex-col justify-between text-right text-[9px] font-bold text-gray-400 font-mono pr-2 select-none py-1.5">
                  <span>{chartPoints.length > 0 ? `₹${Math.round(Math.max(...chartPoints.map(p => p.value), 100)).toLocaleString()}` : "₹0"}</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                  <span>₹0</span>
               </div>

               <div className="flex-1 relative h-full">
                  {chartPoints.length > 0 ? (
                    <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
                       <defs>
                         <linearGradient id="green-gradient" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                           <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
                         </linearGradient>
                       </defs>

                       <line x1="10" y1="20" x2="590" y2="20" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                       <line x1="10" y1="41.6" x2="590" y2="41.6" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                       <line x1="10" y1="63.3" x2="590" y2="63.3" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                       <line x1="10" y1="85" x2="590" y2="85" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                       <line x1="10" y1="106.6" x2="590" y2="106.6" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                       <line x1="10" y1="128.3" x2="590" y2="128.3" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                       <line x1="10" y1="150" x2="590" y2="150" stroke="#e5e7eb" strokeWidth="1.5" />

                       <path 
                         d={getAreaPath(getCurvePath())} 
                         fill="url(#green-gradient)" 
                       />

                       <path 
                         d={getCurvePath()} 
                         fill="none" 
                         stroke="#10B981" 
                         strokeWidth="2.5" 
                         strokeLinecap="round"
                       />

                       {chartPoints.map((pt, idx) => (
                         <g key={idx} className="group cursor-pointer">
                            {pt.value > 0 && (
                              <>
                                <circle cx={pt.x} cy={pt.y} r="6" fill="#10B981" className="animate-pulse" />
                                <circle cx={pt.x} cy={pt.y} r="3" fill="#ffffff" />
                                <text 
                                  x={pt.x} 
                                  y={pt.y - 12} 
                                  textAnchor="middle" 
                                  className="text-[9px] font-bold fill-emerald-600 font-mono"
                                >
                                  ₹{Math.round(pt.value)}
                                </text>
                              </>
                            )}
                            <text 
                              x={pt.x} 
                              y="168" 
                              textAnchor="middle" 
                              className="text-[9px] font-bold fill-gray-400 uppercase font-sans"
                            >
                              {pt.label}
                            </text>
                         </g>
                       ))}
                    </svg>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold uppercase tracking-wider">Generating Sales Trend...</div>
                  )}
               </div>
            </div>

            {/* Right-hand side stats details drawer */}
            <div className="w-full lg:w-56 shrink-0 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-150 pt-4 lg:pt-0 lg:pl-6 h-full font-sans gap-4 select-none">
               
               <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
                  <div className="relative inline-block text-left">
                     <button 
                       onClick={() => setShowGraphDropdown(!showGraphDropdown)}
                       className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-100 transition"
                     >
                       <span className="capitalize">{graphMode === "daily" ? "Daily" : "Weekly"}</span>
                       <ChevronDown size={11} className="text-gray-400" />
                     </button>

                     {showGraphDropdown && (
                       <>
                         <div className="fixed inset-0 z-10" onClick={() => setShowGraphDropdown(false)}></div>
                         <div className="absolute right-0 mt-1 w-24 bg-white border border-gray-200 rounded-lg shadow-md z-20 overflow-hidden text-[11px]">
                           <button 
                             onClick={() => { setGraphMode("daily"); setShowGraphDropdown(false); }}
                             className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-semibold ${graphMode === "daily" ? "text-indigo-600 bg-indigo-50" : "text-gray-700"}`}
                           >
                             Daily
                           </button>
                           <button 
                             onClick={() => { setGraphMode("weekly"); setShowGraphDropdown(false); }}
                             className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-semibold ${graphMode === "weekly" ? "text-indigo-600 bg-indigo-50" : "text-gray-700"}`}
                           >
                             Weekly
                           </button>
                         </div>
                       </>
                     )}
                  </div>
               </div>

               <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                     {graphMode === "daily" ? "Last 7 days sales" : "Last 4 weeks sales"}
                  </p>
                  <p className="text-xl font-bold text-gray-900 font-mono tracking-tight">
                    ₹ {(graphMode === "daily" ? last7DaysSales : lastWeeksSales).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
               </div>

               <div className="space-y-1.5 mt-auto">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Invoices Made</p>
                  <p className="text-xl font-bold text-gray-900 font-mono tracking-tight">
                    {graphMode === "daily" ? last7DaysInvoicesCount : lastWeeksInvoicesCount}
                  </p>
               </div>

            </div>

         </div>

      </div>

    </div>
  );
}
