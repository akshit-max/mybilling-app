"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Users, Search, Calendar, Lock, BadgeCheck, Ban, Mail, 
  UserCog, ChevronLeft, Settings, LogOut, TrendingUp, PieChart, Activity, 
  CreditCard, Filter, ArrowUpRight, AlertTriangle, Clock, Zap, CheckCircle2,
  DollarSign, BarChart3, AlertCircle, RefreshCw, XCircle, SearchX, History, List,
  Download, UserPlus, UserCheck, CheckSquare, Briefcase, Edit2, X, Crown
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

// --- TYPES ---
type CompanyData = {
  uid: string;
  businessName: string;
  email: string;
  ownerName: string;
  plan: string;
  subscriptionCycle: string;
  isPaid: boolean;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastActive: Date | null;
  renewalDate: Date | null;
  subscriptionStartDate: Date | null;
  trialStartDate: Date | null;
  employeeCount: number;
  rolesBreakdown: Record<string, number>;
  employeesList: { name: string; role: string; email: string; date: Date | null }[];
};

type EditForm = {
  isPaid: boolean;
  plan: string;
  subscriptionCycle: string;
  subscriptionStartDate: string;
  trialStartDate: string;
};

type ActivityEvent = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: Date;
  icon: any;
  color: string;
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  // Edit subscription modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric'}) : "Not Available";
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString("en-IN", { hour: '2-digit', minute:'2-digit' }) : "";
  
  const getHealthBadge = (lastActive: Date | null) => {
    if (!lastActive) return { color: "bg-red-500", text: "Inactive 30+ Days" };
    const days = (new Date().getTime() - lastActive.getTime()) / (1000 * 3600 * 24);
    if (days <= 1) return { color: "bg-emerald-500", text: "Active Today" };
    if (days <= 7) return { color: "bg-yellow-400", text: "Active This Week" };
    if (days <= 30) return { color: "bg-orange-500", text: "Active This Month" };
    return { color: "bg-red-500", text: "Inactive 30+ Days" };
  };

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

        const parseDate = (val: any): Date | null => {
          if (!val) return null;
          let d: Date;
          if (typeof val.toDate === 'function') d = val.toDate(); // Firebase Timestamp
          else if (val.seconds) d = new Date(val.seconds * 1000); // Raw object containing seconds
          else d = new Date(val); // Native Date or ISO String
          
          if (isNaN(d.getTime())) return null;
          if (d.getFullYear() <= 1970) return null; // Reject epoch defaults
          return d;
        };

        subusersSnap.forEach(doc => {
          const d = doc.data();
          if (!d.adminId) return;
          if (!employeesByCompany[d.adminId]) employeesByCompany[d.adminId] = [];
          employeesByCompany[d.adminId].push(d);
        });

        const companyList: CompanyData[] = [];
        const activities: ActivityEvent[] = [];

        usersSnap.forEach(doc => {
          const d = doc.data();
          const uid = doc.id;
          const settings = settingsMap[uid] || {};
          
          const bName = d.businessName || settings.businessName;
          
          // Completely filter out orphaned/incomplete registrations from all dashboard metrics
          if (!bName || bName.trim() === "") {
            return;
          }

          const employees = employeesByCompany[uid] || [];
          const rolesBreakdown: Record<string, number> = {};
          const employeesList: any[] = [];
          
          employees.forEach(emp => {
            const role = emp.role || "Unknown";
            rolesBreakdown[role] = (rolesBreakdown[role] || 0) + 1;
            const empDate = parseDate(emp.createdAt);
            employeesList.push({
              name: emp.name || "Unnamed",
              email: emp.email || "",
              role: role,
              date: empDate
            });

            if (empDate) {
               activities.push({
                 id: `emp_${emp.email}_${empDate.getTime()}`,
                 type: 'New Employee',
                 title: `New Employee (${role})`,
                 subtitle: `Added to ${bName}`,
                 date: empDate,
                 icon: UserCheck,
                 color: 'text-blue-500 bg-blue-50'
               });
            }
          });

          const createdDate = parseDate(d.createdAt);
          const updatedDate = parseDate(d.updatedAt);
          const lastActiveDate = parseDate(d.lastActive);
          const subStartDate = parseDate(d.subscriptionStartDate);

          let renewalDate = null;
          if (d.isPaid) {
            // Source of Truth Synchronization: Try subscriptionStartDate first, fallback to updatedAt
            const startForRenewal = subStartDate || updatedDate; 
            if (startForRenewal) {
              renewalDate = new Date(startForRenewal);
              if (d.subscriptionCycle === 'Monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
              else renewalDate.setFullYear(renewalDate.getFullYear() + 1);
            }
          }

          if (createdDate) {
             activities.push({
               id: `reg_${uid}_${createdDate.getTime()}`,
               type: 'New Registration',
               title: 'New Registration',
               subtitle: bName,
               date: createdDate,
               icon: UserPlus,
               color: 'text-indigo-500 bg-indigo-50'
             });
          }

          if (d.isPaid && subStartDate) {
             activities.push({
               id: `sub_${uid}_${subStartDate.getTime()}`,
               type: 'Subscription',
               title: 'Subscription Activated',
               subtitle: `${d.plan || "Premium"} Plan • ${bName}`,
               date: subStartDate,
               icon: BadgeCheck,
               color: 'text-emerald-500 bg-emerald-50'
             });
          }

          let status = d.status || (d.isPaid ? "Paid" : "Trial");

          companyList.push({
            uid,
            businessName: bName,
            email: d.email || settings.email || "",
            ownerName: settings.ownerName || d.businessName || settings.businessName || "Unknown Owner",
            plan: d.plan || "Free/Trial",
            subscriptionCycle: d.subscriptionCycle || "N/A",
            isPaid: !!d.isPaid,
            status: status,
            createdAt: createdDate,
            updatedAt: updatedDate,
            lastActive: lastActiveDate || updatedDate || createdDate,
            renewalDate,
            subscriptionStartDate: subStartDate,
            trialStartDate: parseDate(d.trialStartDate),
            employeeCount: employees.length,
            rolesBreakdown,
            employeesList
          });
        });

        companyList.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        setCompanies(companyList);
        
        activities.sort((a, b) => b.date.getTime() - a.date.getTime());
        setActivityFeed(activities.slice(0, 100)); // Keep top 100 recent events

      } catch (err) {
        console.error("Error fetching admin data:", err);
        toast.error("Failed to load platform data");
      } finally {
        setLoading(false);
      }
  };

  const handleSaveSubscription = async () => {
    if (!selectedCompany || !editForm) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        isPaid: editForm.isPaid,
        plan: editForm.isPaid ? editForm.plan : "Free",
        status: editForm.isPaid ? "Paid" : "Trial",
      };

      if (editForm.isPaid) {
        updates.subscriptionCycle = editForm.subscriptionCycle;
        if (editForm.subscriptionStartDate) {
          updates.subscriptionStartDate = editForm.subscriptionStartDate;
        }
      } else {
        if (editForm.trialStartDate) {
          updates.trialStartDate = editForm.trialStartDate;
        }
      }

      await updateDoc(doc(db, "users", selectedCompany.uid), updates);

      // Compute new renewalDate locally
      let newRenewal: Date | null = null;
      if (editForm.isPaid && editForm.subscriptionStartDate) {
        newRenewal = new Date(editForm.subscriptionStartDate);
        if (editForm.subscriptionCycle === "Yearly") newRenewal.setFullYear(newRenewal.getFullYear() + 1);
        else newRenewal.setMonth(newRenewal.getMonth() + 1);
      }

      const updated: CompanyData = {
        ...selectedCompany,
        isPaid: editForm.isPaid,
        plan: editForm.isPaid ? editForm.plan : "Free/Trial",
        subscriptionCycle: editForm.isPaid ? editForm.subscriptionCycle : "N/A",
        status: editForm.isPaid ? "Paid" : "Trial",
        subscriptionStartDate: editForm.subscriptionStartDate ? new Date(editForm.subscriptionStartDate) : null,
        trialStartDate: !editForm.isPaid && editForm.trialStartDate ? new Date(editForm.trialStartDate) : selectedCompany.trialStartDate,
        renewalDate: newRenewal,
      };

      setCompanies(prev => prev.map(c => c.uid === selectedCompany.uid ? updated : c));
      setSelectedCompany(updated);
      setShowEditModal(false);
      toast.success("Subscription updated successfully!");
    } catch (err: any) {
      console.error("Failed to update subscription:", err);
      toast.error(err.message || "Failed to update subscription.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (type: "csv" | "excel") => {
    try {
      const exportData = filteredCompanies.map(c => ({
        "Company Name": c.businessName,
        "Owner Name": c.ownerName,
        "Email": c.email,
        "Plan": c.plan,
        "Billing Cycle": c.subscriptionCycle,
        "Status": c.status,
        "Employees": c.employeeCount,
        "Joined Date": c.createdAt ? c.createdAt.toLocaleDateString('en-IN') : "N/A",
        "Last Active": c.lastActive ? c.lastActive.toLocaleDateString('en-IN') : "N/A",
        "Renewal Date": c.renewalDate ? c.renewalDate.toLocaleDateString('en-IN') : "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Directory");

      if (type === "csv") {
        XLSX.writeFile(workbook, "CloudLedger_Directory.csv");
      } else {
        XLSX.writeFile(workbook, "CloudLedger_Directory.xlsx");
      }
      toast.success(`Exported ${filteredCompanies.length} records successfully`);
    } catch(err) {
      toast.error("Export failed");
      console.error(err);
    }
  };

  // --- DERIVED METRICS ---
  const metrics = useMemo(() => {
    const now = new Date();
    const next7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    let activePaid = 0;
    let activeFree = 0;
    let totalEmps = 0;
    let expiringSoon = 0;
    let newSignups30d = 0;
    let newPaid30d = 0;
    let inactiveCompanies = 0;
    let zeroEmployees = 0;

    companies.forEach(c => {
      totalEmps += c.employeeCount;

      if (c.employeeCount === 0 && c.businessName !== "Incomplete Registration") {
        zeroEmployees++;
      }

      if (c.lastActive) {
         const daysInactive = (now.getTime() - c.lastActive.getTime()) / (1000 * 3600 * 24);
         if (daysInactive > 30) inactiveCompanies++;
      } else {
         inactiveCompanies++;
      }

      if (c.createdAt && c.createdAt >= last30Days) {
         newSignups30d++;
         if (c.isPaid) newPaid30d++;
      }

      if (c.isPaid) {
        activePaid++;
        if (c.renewalDate && c.renewalDate <= next7Days) {
          expiringSoon++;
        }
      } else {
        activeFree++;
      }
    });

    const conversionRate = companies.length > 0 ? ((activePaid / companies.length) * 100).toFixed(1) : "0.0";

    return {
      totalCompanies: companies.length,
      activePaid,
      activeFree,
      totalEmps,
      expiringSoon,
      newSignups30d,
      newPaid30d,
      conversionRate,
      inactiveCompanies,
      zeroEmployees
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
      
      let matchesStatus = true;
      if (filterStatus !== "All") {
         if (filterStatus === "Paid") matchesStatus = c.isPaid;
         else if (filterStatus === "Trial") matchesStatus = !c.isPaid;
         else matchesStatus = c.status === filterStatus;
      }
      
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
      <main className="w-full mx-auto p-6 md:p-8 space-y-8 flex flex-col xl:flex-row gap-8">
        
        {/* LEFT COLUMN: Main Dashboard */}
        <div className="flex-1 space-y-8 min-w-0">
          
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-slate-200 pb-6 mb-6">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cloud Ledger</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Super Admin Command Center</p>
            </div>
          </div>

          {!selectedCompany ? (
            <div className="animate-in fade-in duration-500 space-y-6">
              
              {/* --- KPI GRID --- */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Companies Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-4 right-4 opacity-[0.05]">
                    <Building2 size={64} />
                  </div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                    <Activity size={12} className="text-indigo-500"/> Total Companies
                  </div>
                  <div className="text-4xl font-black text-slate-900 mb-3">
                    {metrics.totalCompanies}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"><CheckCircle2 size={10}/> {metrics.activePaid} Paid</span>
                    <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded"><Clock size={10}/> {metrics.activeFree} Trial</span>
                  </div>
                </div>

                {/* Growth Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-4 right-4 opacity-[0.05]">
                    <TrendingUp size={64} />
                  </div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                    <TrendingUp size={12} className="text-orange-500"/> Growth (30D)
                  </div>
                  <div className="text-4xl font-black text-slate-900 mb-3">
                    +{metrics.newSignups30d}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    New Signups • <span className="text-emerald-600 font-black">{metrics.newPaid30d} Paid</span>
                  </div>
                </div>

                {/* Conversion Rate Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-4 right-4 opacity-[0.05]">
                    <PieChart size={64} />
                  </div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                    <PieChart size={12} className="text-blue-500"/> Conversion Rate
                  </div>
                  <div className="text-4xl font-black text-slate-900 mb-3">
                    {metrics.conversionRate}%
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    Trial to Paid Ratio
                  </div>
                </div>

                {/* Employees Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-4 right-4 opacity-[0.05]">
                    <Users size={64} />
                  </div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                    <Users size={12} className="text-purple-500"/> Total Employees
                  </div>
                  <div className="text-4xl font-black text-slate-900 mb-3">
                    {metrics.totalEmps}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    Across entire platform
                  </div>
                </div>

              </section>

              {/* --- SECONDARY INSIGHTS (BANNERS) --- */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                 
                 <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-start gap-4">
                   <div className="p-2 bg-white rounded-lg border border-red-100 shadow-sm text-red-500">
                     <AlertCircle size={18} />
                   </div>
                   <div>
                     <h4 className="text-xs font-black text-red-900 mb-1">Inactive Companies</h4>
                     <p className="text-[10px] text-red-700/80 font-semibold leading-relaxed">
                       {metrics.inactiveCompanies} companies haven't logged in over 30 days. High churn risk.
                     </p>
                   </div>
                 </div>

                 <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-start gap-4">
                   <div className="p-2 bg-white rounded-lg border border-amber-100 shadow-sm text-amber-500">
                     <Clock size={18} />
                   </div>
                   <div>
                     <h4 className="text-xs font-black text-amber-900 mb-1">Expiring Soon</h4>
                     <p className="text-[10px] text-amber-700/80 font-semibold leading-relaxed">
                       {metrics.expiringSoon} paid subscriptions expire within the next 7 days.
                     </p>
                   </div>
                 </div>

                 <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-4">
                   <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-sm text-blue-500">
                     <Users size={18} />
                   </div>
                   <div>
                     <h4 className="text-xs font-black text-blue-900 mb-1">Zero Employees</h4>
                     <p className="text-[10px] text-blue-700/80 font-semibold leading-relaxed">
                       {metrics.zeroEmployees} companies haven't added any staff yet.
                     </p>
                   </div>
                 </div>

              </section>

              {/* --- COMPANY DIRECTORY TABLE --- */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col mt-8">
                <div className="p-6 border-b border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-4">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Briefcase size={16} className="text-indigo-600"/> Company Directory
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search name, owner, email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>
                    
                    {/* Filters */}
                    <select 
                      className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="All">All Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Trial">Trial</option>
                      {/* <option value="Suspended">Suspended</option>
                      <option value="Blocked">Blocked</option> */}
                    </select>

                    <select 
                      className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
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
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400 font-black">
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
                        filteredCompanies.map((c) => {
                          const health = getHealthBadge(c.lastActive);
                          return (
                            <tr key={c.uid} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-900 text-[13px]">{c.businessName}</div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">{c.ownerName} • {c.email}</div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-[13px]">{c.plan}</span>
                                    {c.subscriptionCycle !== "N/A" && (
                                      <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{c.subscriptionCycle}</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                    <RefreshCw size={10}/> 
                                    {c.isPaid ? `Renews ${formatDate(c.renewalDate)}` : "Renews Not Available"}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                {c.status === "Blocked" || c.status === "Suspended" ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-100 uppercase tracking-wide">
                                      <Ban size={12} /> {c.status}
                                    </span>
                                ) : c.isPaid ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 uppercase tracking-wide">
                                    <BadgeCheck size={12} /> Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 uppercase tracking-wide">
                                    <Clock size={12} /> Trial
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                  <UserPlus size={14} className="text-slate-400" /> {c.employeeCount}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-[10px] text-slate-400 font-medium mb-1">Joined: {formatDate(c.createdAt)}</div>
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${health.color}`}></div>
                                  <span className="text-[10px] text-slate-500 font-medium">Active: {formatDate(c.lastActive)}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button 
                                  onClick={() => setSelectedCompany(c)}
                                  className="px-4 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* --- DETAILED VIEW --- */
            <div className="animate-in slide-in-from-right-8 duration-300 space-y-6 max-w-5xl">
               <button 
                 onClick={() => setSelectedCompany(null)} 
                 className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white hover:bg-slate-100 w-fit px-4 py-2 rounded-xl shadow-sm border border-slate-200"
               >
                 <ChevronLeft size={16} /> Back to Directory
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
                       </div>
                     </div>
                     <button
                        onClick={() => {
                          setEditForm({
                            isPaid: selectedCompany.isPaid,
                            plan: selectedCompany.plan === "Free/Trial" ? "Free" : selectedCompany.plan,
                            subscriptionCycle: selectedCompany.subscriptionCycle === "N/A" ? "Monthly" : selectedCompany.subscriptionCycle,
                            subscriptionStartDate: selectedCompany.subscriptionStartDate
                              ? selectedCompany.subscriptionStartDate.toISOString().split("T")[0]
                              : "",
                            trialStartDate: selectedCompany.trialStartDate
                              ? selectedCompany.trialStartDate.toISOString().split("T")[0]
                              : "",
                          });
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
                      >
                        <Edit2 size={15} /> Edit Subscription
                      </button>
                   </div>
                 </div>

                 <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Company Summary Section */}
                    <div className="space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                         <Activity size={14}/> Company Summary
                       </h4>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-2 gap-y-6 gap-x-4 relative overflow-hidden">
                          
                          <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Company Status</label>
                             {selectedCompany.status === "Blocked" || selectedCompany.status === "Suspended" ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                                  {selectedCompany.status}
                                </span>
                             ) : selectedCompany.isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                                  Paid
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300">
                                  Trial
                                </span>
                             )}
                          </div>
                          
                          <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Employee Count</label>
                             <p className="text-sm font-black text-slate-800 flex items-center gap-1.5"><Users size={14} className="text-slate-400"/> {selectedCompany.employeeCount}</p>
                          </div>

                          <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Current Plan</label>
                             <p className="text-sm font-black text-indigo-600">{selectedCompany.plan}</p>
                          </div>

                          <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Billing Cycle</label>
                             <p className="text-sm font-black text-slate-800">{selectedCompany.subscriptionCycle}</p>
                          </div>

                          <div className="col-span-2 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                             <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Joined Date</label>
                               <p className="text-xs font-bold text-slate-700">{formatDate(selectedCompany.createdAt)}</p>
                             </div>
                             <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Last Active</label>
                               <p className="text-xs font-bold text-slate-700">{formatDate(selectedCompany.lastActive)}</p>
                             </div>
                          </div>

                          {selectedCompany.isPaid && (
                             <div className="col-span-2 pt-4 border-t border-slate-200">
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Renewal Date</label>
                               <p className="text-xs font-bold text-emerald-600">{formatDate(selectedCompany.renewalDate)}</p>
                             </div>
                          )}
                       </div>
                    </div>

                    {/* Employees Overview & List */}
                    <div className="space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                         <List size={14}/> Team Directory
                       </h4>
                       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                          {selectedCompany.employeeCount > 0 ? (
                            <div className="flex-1 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 divide-y divide-slate-100">
                               {selectedCompany.employeesList.map((emp, i) => (
                                 <div key={`emp_${i}`} className="p-4 hover:bg-slate-50 transition-colors">
                                   <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                                        {emp.email && <p className="text-xs text-slate-500 font-medium">{emp.email}</p>}
                                      </div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                        {emp.role}
                                      </span>
                                   </div>
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
        </div>

        {/* RIGHT COLUMN: Platform Activity Sidebar */}
        <div className="w-full xl:w-80 shrink-0">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden h-full flex flex-col max-h-[900px] sticky top-8">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <Activity size={14} className="text-indigo-500"/> Platform Activity
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
              {activityFeed.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                   <History size={32} className="mx-auto text-slate-400 mb-2" />
                   <p className="text-xs font-bold text-slate-500">No activity recorded</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                  {activityFeed.map((event) => {
                    const Icon = event.icon;
                    return (
                      <div key={event.id} className="relative pl-6 group">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[13px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${event.color}`}>
                          <Icon size={10} strokeWidth={3} />
                        </div>
                        
                        <div className="bg-white group-hover:bg-slate-50 rounded-xl p-3 border border-slate-100 shadow-sm transition-colors">
                          <h4 className="text-[11px] font-black text-slate-800">{event.title}</h4>
                          <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{event.subtitle}</p>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-2 flex items-center gap-1">
                            {formatDate(event.date)} • {formatTime(event.date)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* ─── EDIT SUBSCRIPTION MODAL ─── */}
      {showEditModal && editForm && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">Edit Subscription</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-[280px]">{selectedCompany.businessName}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">

              {/* Status toggle */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Subscription Status</label>
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  <button
                    onClick={() => setEditForm(f => f ? { ...f, isPaid: false, plan: "Free" } : f)}
                    className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                      !editForm.isPaid ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Trial / Free
                  </button>
                  <button
                    onClick={() => setEditForm(f => f ? { ...f, isPaid: true } : f)}
                    className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                      editForm.isPaid ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Paid
                  </button>
                </div>
              </div>

              {/* Plan */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={e => setEditForm(f => f ? { ...f, plan: e.target.value } : f)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Free">Free / Trial</option>
                  <option value="Diamond">Diamond</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              {/* Paid-only fields */}
              {editForm.isPaid && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Billing Cycle</label>
                    <select
                      value={editForm.subscriptionCycle}
                      onChange={e => setEditForm(f => f ? { ...f, subscriptionCycle: e.target.value } : f)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Subscription Start Date</label>
                    <input
                      type="date"
                      value={editForm.subscriptionStartDate}
                      onChange={e => setEditForm(f => f ? { ...f, subscriptionStartDate: e.target.value } : f)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Renewal date is calculated automatically from this date.</p>
                  </div>
                </>
              )}

              {/* Trial-only field */}
              {!editForm.isPaid && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Trial Start Date</label>
                  <input
                    type="date"
                    value={editForm.trialStartDate}
                    onChange={e => setEditForm(f => f ? { ...f, trialStartDate: e.target.value } : f)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Adjusting this controls how many trial days remain (3 days from start).</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubscription}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
