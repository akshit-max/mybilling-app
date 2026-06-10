const fs = require('fs');

const content = `"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Users, Search, Calendar, Lock, BadgeCheck, Ban, Mail, 
  UserCog, ChevronLeft, Settings, LogOut, TrendingUp, PieChart, Activity, 
  CreditCard, Filter, ArrowUpRight, AlertTriangle, Clock, Zap, CheckCircle2,
  DollarSign, BarChart3, AlertCircle, RefreshCw, XCircle, SearchX, History, List
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// --- TYPES ---
type CompanyData = {
  uid: string;
  businessName: string;
  email: string;
  ownerName: string;
  plan: string;
  subscriptionCycle: string;
  isPaid: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  renewalDate: Date | null;
  employeeCount: number;
  rolesBreakdown: Record<string, number>;
  employeesList: { name: string; role: string; email: string; date: Date | null }[];
  estimatedMRR: number;
  estimatedARR: number;
  recentActivities: ActivityEvent[];
};

type ActivityEvent = {
  id: string;
  companyId: string;
  type: 'NEW_COMPANY' | 'NEW_EMPLOYEE' | 'SUBSCRIPTION_UPGRADE';
  title: string;
  subtitle: string;
  date: Date | null;
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    init();
  }, []);

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric'}) : "Not Available";
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString("en-IN", { hour: '2-digit', minute:'2-digit' }) : "";

  const init = async () => {
      setLoading(true);
      try {
        const [usersSnap, subusersSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"))),
          getDocs(query(collection(db, "subusers"))),
          getDocs(query(collection(db, "settings")))
        ]);

        const settingsMap: Record<string, any> = {};
        settingsSnap.forEach(doc => {
          settingsMap[doc.id] = doc.data();
        });

        const employeesByCompany: Record<string, any[]> = {};
        const eventLog: ActivityEvent[] = [];

        const parseDate = (val: any): Date | null => {
          if (!val) return null;
          let d: Date;
          if (typeof val.toDate === 'function') d = val.toDate();
          else if (val.seconds) d = new Date(val.seconds * 1000);
          else d = new Date(val);
          
          if (isNaN(d.getTime())) return null;
          if (d.getFullYear() <= 1970) return null; // Reject epoch zero defaults
          return d;
        };

        subusersSnap.forEach(doc => {
          const d = doc.data();
          if (!d.adminId) return;
          if (!employeesByCompany[d.adminId]) employeesByCompany[d.adminId] = [];
          employeesByCompany[d.adminId].push(d);

          const empDate = parseDate(d.createdAt);
          if (empDate) {
            eventLog.push({
              id: doc.id,
              companyId: d.adminId,
              type: 'NEW_EMPLOYEE',
              title: \`New Employee (\${d.role || 'Staff'})\`,
              subtitle: \`Added to \${settingsMap[d.adminId]?.businessName || 'a company'}\`,
              date: empDate
            });
          }
        });

        const companyList: CompanyData[] = [];

        usersSnap.forEach(doc => {
          const d = doc.data();
          const uid = doc.id;
          const employees = employeesByCompany[uid] || [];
          const settings = settingsMap[uid] || {};
          
          const rolesBreakdown: Record<string, number> = {};
          const employeesList: any[] = [];
          
          employees.forEach(emp => {
            const role = emp.role || "Unknown";
            rolesBreakdown[role] = (rolesBreakdown[role] || 0) + 1;
            employeesList.push({
              name: emp.name || "Unnamed",
              email: emp.email || "No Email",
              role: role,
              date: parseDate(emp.createdAt)
            });
          });

          let mrr = 0;
          let arr = 0;
          
          if (d.isPaid && d.plan) {
             const plan = d.plan;
             const cycle = d.subscriptionCycle || "Yearly";
             
             let rawPrice = 0;
             if (plan === "Diamond" && cycle === "Yearly") rawPrice = 2599;
             else if (plan === "Diamond" && cycle === "Monthly") rawPrice = 249;
             else if (plan === "Platinum" && cycle === "Yearly") rawPrice = 2999;
             else if (plan === "Platinum" && cycle === "Monthly") rawPrice = 299;
             else if (plan === "Enterprise" && cycle === "Yearly") rawPrice = 4999;
             else if (plan === "Enterprise" && cycle === "Monthly") rawPrice = 750;
             else if (plan === "Diamond") rawPrice = 249;
             
             if (cycle === "Yearly") {
                arr = rawPrice;
                mrr = parseFloat((rawPrice / 12).toFixed(2));
             } else {
                mrr = rawPrice;
                arr = rawPrice * 12;
             }
          }

          const createdDate = parseDate(d.createdAt);
          const updatedDate = parseDate(d.updatedAt);

          let renewalDate = null;
          if (d.isPaid && updatedDate) {
            renewalDate = new Date(updatedDate);
            if (d.subscriptionCycle === 'Monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
            else renewalDate.setFullYear(renewalDate.getFullYear() + 1);
          }

          if (createdDate) {
            eventLog.push({
              id: \`co_\${uid}\`,
              companyId: uid,
              type: 'NEW_COMPANY',
              title: 'New Registration',
              subtitle: d.businessName || 'Unnamed Business',
              date: createdDate
            });
          }
          
          if (d.isPaid && updatedDate && createdDate && (updatedDate.getTime() - createdDate.getTime()) > 86400000) {
            eventLog.push({
              id: \`upg_\${uid}\`,
              companyId: uid,
              type: 'SUBSCRIPTION_UPGRADE',
              title: \`Plan Upgrade: \${d.plan}\`,
              subtitle: d.businessName || 'Unnamed Business',
              date: updatedDate
            });
          }

          const companyActs = eventLog.filter(e => e.companyId === uid).sort((a,b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

          companyList.push({
            uid,
            businessName: d.businessName || settings.businessName || "Unnamed Business",
            email: d.email || settings.email || "No Email",
            ownerName: settings.ownerName || d.businessName || "Unknown Owner",
            plan: d.plan || "Free/Trial",
            subscriptionCycle: d.subscriptionCycle || "N/A",
            isPaid: !!d.isPaid,
            createdAt: createdDate,
            updatedAt: updatedDate || createdDate,
            renewalDate,
            employeeCount: employees.length,
            rolesBreakdown,
            employeesList,
            estimatedMRR: mrr,
            estimatedARR: arr,
            recentActivities: companyActs
          });
        });

        companyList.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        eventLog.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

        setCompanies(companyList);
        setActivities(eventLog.slice(0, 50));

      } catch (err) {
        console.error("Error fetching admin data:", err);
        toast.error("Failed to load platform data");
      } finally {
        setLoading(false);
      }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/admin");
  };

  // --- DERIVED METRICS (Memoized) ---
  const metrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const next7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    let totalMRR = 0;
    let totalARR = 0;
    
    let activePaid = 0;
    let activeFree = 0;
    let inactiveCount = 0;
    
    let newSignups30d = 0;
    let newPaid30d = 0;
    let expiringSoon = 0;
    let noEmployeesCount = 0;

    const planDistribution = { Diamond: 0, Platinum: 0, Enterprise: 0, 'Free/Trial': 0 };

    companies.forEach(c => {
      totalMRR += c.estimatedMRR;
      totalARR += c.estimatedARR;

      if (c.employeeCount === 0) noEmployeesCount++;

      if (c.createdAt && c.createdAt >= thirtyDaysAgo) {
        newSignups30d++;
        if (c.isPaid) newPaid30d++;
      }

      // Inactive logic (No updates in 30 days)
      if (!c.updatedAt || c.updatedAt < thirtyDaysAgo) {
        inactiveCount++;
      }

      if (c.isPaid) {
        activePaid++;
        if (c.renewalDate && c.renewalDate <= next7Days) {
          expiringSoon++;
        }
        if (c.plan === 'Diamond') planDistribution.Diamond++;
        else if (c.plan === 'Platinum') planDistribution.Platinum++;
        else if (c.plan === 'Enterprise') planDistribution.Enterprise++;
      } else {
        activeFree++;
        planDistribution['Free/Trial']++;
      }
    });

    const conversionRate = activePaid > 0 ? ((activePaid / companies.length) * 100).toFixed(1) : 0;

    return {
      totalCompanies: companies.length,
      activePaid,
      activeFree,
      inactiveCount,
      totalMRR,
      totalARR,
      newSignups30d,
      newPaid30d,
      expiringSoon,
      noEmployeesCount,
      conversionRate,
      planDistribution
    };
  }, [companies]);

  // --- FILTER ENGINE ---
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = c.businessName.toLowerCase().includes(q) || 
                            c.email.toLowerCase().includes(q) ||
                            c.ownerName.toLowerCase().includes(q);
      
      const matchesPlan = filterPlan === "All" || c.plan === filterPlan || (!c.isPaid && filterPlan === "Free/Trial");
      const matchesStatus = filterStatus === "All" || 
                            (filterStatus === "Paid" && c.isPaid) || 
                            (filterStatus === "Free/Trial" && !c.isPaid);
      
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [companies, searchQuery, filterPlan, filterStatus]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 font-sans h-screen p-8 text-center">
         <Loader size={48} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-y-auto font-sans h-full text-slate-800">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl text-white shadow-md">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Cloud Ledger</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Super Admin Command Center</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors border border-slate-200 shadow-sm"
        >
          <LogOut size={16}/> Logout
        </button>
      </header>

      <main className="w-full max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
        
        {!selectedCompany ? (
          <div className="animate-in fade-in duration-500 space-y-8">
            
            {/* --- REVENUE & HIGH LEVEL METRICS --- */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110">
                  <DollarSign size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-emerald-500"/> Total MRR
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">
                  ₹{metrics.totalMRR.toLocaleString('en-IN')}
                </div>
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-100">
                  <ArrowUpRight size={12}/> ARR: ₹{metrics.totalARR.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110">
                  <Building2 size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-500"/> Total Companies
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">
                  {metrics.totalCompanies}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <BadgeCheck size={12}/> {metrics.activePaid} Paid
                  </div>
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Clock size={12}/> {metrics.activeFree} Trial
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110">
                  <Activity size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                    <Zap size={14} className="text-[#F97316]"/> Growth (30d)
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">
                  +{metrics.newSignups30d}
                </div>
                <div className="text-xs font-bold text-slate-500">
                  New Signups • <span className="text-emerald-600">{metrics.newPaid30d} Paid</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110">
                  <PieChart size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-indigo-500"/> Conversion Rate
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">
                  {metrics.conversionRate}%
                </div>
                <div className="text-xs font-bold text-slate-500">
                  Trial to Paid Ratio
                </div>
              </div>

            </section>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
               
               {/* --- DASHBOARD ALERTS & INSIGHTS --- */}
               <section className="lg:col-span-3 space-y-6">
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {/* Alerts */}
                   <div className="bg-red-50/50 border border-red-100 p-5 rounded-2xl flex items-start gap-4">
                     <div className="bg-red-100 p-2.5 rounded-xl text-red-600 shrink-0">
                       <AlertCircle size={20} />
                     </div>
                     <div>
                       <h4 className="text-sm font-bold text-red-900 mb-1">Inactive Companies</h4>
                       <p className="text-xs text-red-700 font-medium">{metrics.inactiveCount} companies haven't logged in over 30 days. High churn risk.</p>
                     </div>
                   </div>

                   <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4">
                     <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 shrink-0">
                       <Clock size={20} />
                     </div>
                     <div>
                       <h4 className="text-sm font-bold text-amber-900 mb-1">Expiring Soon</h4>
                       <p className="text-xs text-amber-700 font-medium">{metrics.expiringSoon} paid subscriptions expire within the next 7 days.</p>
                     </div>
                   </div>

                   <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4">
                     <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shrink-0">
                       <Users size={20} />
                     </div>
                     <div>
                       <h4 className="text-sm font-bold text-blue-900 mb-1">Zero Employees</h4>
                       <p className="text-xs text-blue-700 font-medium">{metrics.noEmployeesCount} companies haven't added any staff yet.</p>
                     </div>
                   </div>
                 </div>

                 {/* --- COMPANY DIRECTORY TABLE --- */}
                 <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-200 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600"/> Company Directory
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            placeholder="Search name, owner, email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                          />
                        </div>
                        
                        <select 
                          className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none cursor-pointer"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="All">All Status</option>
                          <option value="Paid">Paid Only</option>
                          <option value="Free/Trial">Free/Trial</option>
                        </select>

                        <select 
                          className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none cursor-pointer hidden sm:block"
                          value={filterPlan}
                          onChange={(e) => setFilterPlan(e.target.value)}
                        >
                          <option value="All">All Plans</option>
                          <option value="Diamond">Diamond</option>
                          <option value="Platinum">Platinum</option>
                          <option value="Enterprise">Enterprise</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                            <th className="py-4 px-6">Company & Owner</th>
                            <th className="py-4 px-6">Plan details</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6">Employees</th>
                            <th className="py-4 px-6">Activity</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                          {filteredCompanies.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-16 text-center">
                                <div className="flex flex-col items-center gap-3">
                                  <SearchX size={32} className="text-slate-300"/>
                                  <p className="text-slate-500 font-medium">No companies found matching filters.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredCompanies.map((c) => (
                              <tr key={c.uid} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900 text-base">{c.businessName}</div>
                                  <div className="text-xs text-slate-500 font-medium mt-0.5">{c.ownerName} • {c.email}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">{c.plan}</span>
                                      {c.subscriptionCycle !== "N/A" && (
                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{c.subscriptionCycle}</span>
                                      )}
                                    </div>
                                    {c.isPaid && <div className="text-xs text-slate-400 font-medium flex items-center gap-1"><RefreshCw size={10}/> Renews {formatDate(c.renewalDate)}</div>}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  {c.isPaid ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                      <BadgeCheck size={14} /> Paid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                                      <Ban size={14} /> Trial
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-800 flex items-center gap-2">
                                    <Users size={14} className="text-slate-400" /> {c.employeeCount}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="text-xs text-slate-500 font-medium">Joined: {formatDate(c.createdAt)}</div>
                                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Clock size={10}/> Active: {formatDate(c.updatedAt)}</div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <button 
                                    onClick={() => setSelectedCompany(c)}
                                    className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg transition-colors shadow-sm"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>

               </section>

               {/* --- PLATFORM ACTIVITY FEED (RIGHT SIDEBAR) --- */}
               <aside className="lg:col-span-1 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden sticky top-24 h-[calc(100vh-120px)] flex flex-col">
                     <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                       <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                         <Activity size={16} className="text-blue-500"/> Platform Activity
                       </h3>
                     </div>
                     <div className="p-5 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                        {activities.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No recent activities.</p>
                        ) : (
                          activities.map((act, i) => (
                            <div key={\`\${act.id}_\${i}\`} className="flex gap-4 relative">
                              {/* Timeline line */}
                              {i !== activities.length - 1 && (
                                <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-slate-100"></div>
                              )}
                              
                              {/* Icon */}
                              <div className={\`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white relative z-10 \${
                                act.type === 'NEW_COMPANY' ? 'bg-indigo-100 text-indigo-600' :
                                act.type === 'SUBSCRIPTION_UPGRADE' ? 'bg-emerald-100 text-emerald-600' :
                                'bg-blue-100 text-blue-600'
                              }\`}>
                                {act.type === 'NEW_COMPANY' && <Building2 size={14}/>}
                                {act.type === 'SUBSCRIPTION_UPGRADE' && <BadgeCheck size={14}/>}
                                {act.type === 'NEW_EMPLOYEE' && <UserCog size={14}/>}
                              </div>

                              {/* Content */}
                              <div className="pt-1.5 pb-2">
                                <h4 className="text-xs font-bold text-slate-900 leading-tight">{act.title}</h4>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{act.subtitle}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                                  {formatDate(act.date)} • {formatTime(act.date)}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                     </div>
                  </div>
               </aside>

            </div>
          </div>
        ) : (
          /* --- DETAILED VIEW --- */
          <div className="animate-in slide-in-from-right-8 duration-300 space-y-6 max-w-5xl mx-auto">
             <button 
               onClick={() => setSelectedCompany(null)} 
               className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white hover:bg-slate-100 w-fit px-4 py-2 rounded-xl shadow-sm border border-slate-200"
             >
               <ChevronLeft size={16} /> Back to Dashboard
             </button>
             
             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               {/* Detail Header */}
               <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Building2 size={120} />
                 </div>
                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div>
                     <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">{selectedCompany.businessName}</h1>
                     <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5"><UserCog size={16} className="text-slate-500"/> {selectedCompany.ownerName}</span>
                        <span className="flex items-center gap-1.5 md:border-l border-slate-700 md:pl-4"><Mail size={16} className="text-slate-500"/> {selectedCompany.email}</span>
                        <span className="flex items-center gap-1.5 md:border-l border-slate-700 md:pl-4"><Clock size={16} className="text-slate-500"/> Registered: {formatDate(selectedCompany.createdAt)}</span>
                        <span className="flex items-center gap-1.5 md:border-l border-slate-700 md:pl-4 text-emerald-400"><Activity size={16} /> Last Active: {formatDate(selectedCompany.updatedAt)}</span>
                     </div>
                   </div>
                   <div>
                     {selectedCompany.isPaid ? (
                       <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-bold border border-emerald-500/30">
                         <BadgeCheck size={18} /> Paid Subscription
                       </span>
                     ) : (
                       <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700">
                         <Ban size={18} /> Trial / Free
                       </span>
                     )}
                   </div>
                 </div>
               </div>

               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Subscription Details & History */}
                  <div className="space-y-4">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <BadgeCheck size={14}/> Subscription Status
                     </h4>
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-2 gap-6 relative overflow-hidden">
                        <div>
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Current Plan</label>
                           <p className="text-2xl font-black text-indigo-600">{selectedCompany.plan}</p>
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Billing Cycle</label>
                           <p className="text-2xl font-black text-slate-800">{selectedCompany.subscriptionCycle}</p>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Est. MRR</label>
                           <p className="text-xl font-bold text-emerald-600">₹{selectedCompany.estimatedMRR.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Renewal Date</label>
                           <p className="text-sm font-bold text-slate-700 mt-1">{formatDate(selectedCompany.renewalDate)}</p>
                        </div>
                     </div>
                     
                     {/* Recent Activity Mini-Feed */}
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pt-4">
                       <History size={14}/> Recent Activity Log
                     </h4>
                     <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                       {selectedCompany.recentActivities.length === 0 ? (
                         <p className="text-xs text-slate-400">No recent activities available.</p>
                       ) : (
                         selectedCompany.recentActivities.map((act, i) => (
                            <div key={\`act_\${i}\`} className="flex items-start gap-3">
                              <div className="mt-0.5 text-indigo-500 bg-indigo-50 p-1.5 rounded-lg shrink-0">
                                {act.type === 'NEW_COMPANY' ? <Building2 size={12}/> : act.type === 'SUBSCRIPTION_UPGRADE' ? <BadgeCheck size={12}/> : <UserCog size={12}/>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">{act.title}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{formatDate(act.date)}</p>
                              </div>
                            </div>
                         ))
                       )}
                     </div>
                  </div>

                  {/* Employees Overview & List */}
                  <div className="space-y-4">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <List size={14}/> Team Directory ({selectedCompany.employeeCount})
                     </h4>
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                        
                        {selectedCompany.employeeCount > 0 ? (
                          <div className="flex-1 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 divide-y divide-slate-100">
                             {selectedCompany.employeesList.map((emp, i) => (
                               <div key={\`emp_\${i}\`} className="p-4 hover:bg-slate-50 transition-colors">
                                 <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                                      <p className="text-xs text-slate-500 font-medium">{emp.email}</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                      {emp.role}
                                    </span>
                                 </div>
                                 <p className="text-[9px] text-slate-400 mt-2">Added: {formatDate(emp.date)}</p>
                               </div>
                             ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center flex flex-col items-center justify-center h-full opacity-60">
                            <Users size={32} className="text-slate-300 mb-2"/>
                            <p className="text-sm text-slate-500 font-bold">No employees found.</p>
                            <p className="text-xs text-slate-400 mt-1">This company has not added any staff.</p>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
`;

fs.writeFileSync('src/app/superadmin/page.tsx', content, 'utf8');
console.log('Superadmin bugfixes applied!');
