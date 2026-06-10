const fs = require('fs');

const content = `"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Users, Search, Calendar, Lock, BadgeCheck, Ban, Mail, 
  UserCog, ChevronLeft, Settings, LogOut, TrendingUp, PieChart, Activity, 
  CreditCard, Filter, ArrowUpRight, AlertTriangle, Clock, Zap, CheckCircle2,
  DollarSign, BarChart3, AlertCircle, RefreshCw, XCircle, SearchX, History, List,
  Download
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
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
  status: string; // derived or existing
  createdAt: Date | null;
  updatedAt: Date | null;
  renewalDate: Date | null;
  employeeCount: number;
  rolesBreakdown: Record<string, number>;
  employeesList: { name: string; role: string; email: string; date: Date | null }[];
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    init();
  }, []);

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric'}) : "Not Available";
  
  const getHealthBadge = (updatedAt: Date | null) => {
    if (!updatedAt) return { color: "bg-red-500", text: "Inactive 30+ Days" };
    const days = (new Date().getTime() - updatedAt.getTime()) / (1000 * 3600 * 24);
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
          if (typeof val.toDate === 'function') d = val.toDate();
          else if (val.seconds) d = new Date(val.seconds * 1000);
          else d = new Date(val);
          
          if (isNaN(d.getTime())) return null;
          if (d.getFullYear() <= 1970) return null;
          return d;
        };

        subusersSnap.forEach(doc => {
          const d = doc.data();
          if (!d.adminId) return;
          if (!employeesByCompany[d.adminId]) employeesByCompany[d.adminId] = [];
          employeesByCompany[d.adminId].push(d);
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

          const createdDate = parseDate(d.createdAt);
          const updatedDate = parseDate(d.updatedAt);

          let renewalDate = null;
          if (d.isPaid && updatedDate) {
            renewalDate = new Date(updatedDate);
            if (d.subscriptionCycle === 'Monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
            else renewalDate.setFullYear(renewalDate.getFullYear() + 1);
          }

          let status = d.status || (d.isPaid ? "Paid" : "Trial");

          companyList.push({
            uid,
            businessName: d.businessName || settings.businessName || "Unnamed Business",
            email: d.email || settings.email || "No Email",
            ownerName: settings.ownerName || d.businessName || "Unknown Owner",
            plan: d.plan || "Free/Trial",
            subscriptionCycle: d.subscriptionCycle || "N/A",
            isPaid: !!d.isPaid,
            status: status,
            createdAt: createdDate,
            updatedAt: updatedDate || createdDate, // Fallback to created if no update
            renewalDate,
            employeeCount: employees.length,
            rolesBreakdown,
            employeesList
          });
        });

        companyList.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        setCompanies(companyList);

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
        "Last Active": c.updatedAt ? c.updatedAt.toLocaleDateString('en-IN') : "N/A",
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
      toast.success(\`Exported \${filteredCompanies.length} records successfully\`);
    } catch(err) {
      toast.error("Export failed");
      console.error(err);
    }
  };

  // --- DERIVED METRICS ---
  const metrics = useMemo(() => {
    const now = new Date();
    const next7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    let activePaid = 0;
    let activeFree = 0;
    let totalEmps = 0;
    let expiringSoon = 0;

    companies.forEach(c => {
      totalEmps += c.employeeCount;

      if (c.isPaid) {
        activePaid++;
        if (c.renewalDate && c.renewalDate <= next7Days) {
          expiringSoon++;
        }
      } else {
        activeFree++;
      }
    });

    return {
      totalCompanies: companies.length,
      activePaid,
      activeFree,
      totalEmps,
      expiringSoon
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
      
      {/* HEADER REMOVED PER USER REQUEST */}

      <main className="w-full max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
        
        {!selectedCompany ? (
          <div className="animate-in fade-in duration-500 space-y-8">
            
            {/* --- DASHBOARD CARDS --- */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110">
                  <BadgeCheck size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500"/> Paid Companies
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">
                  {metrics.activePaid}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110">
                  <Clock size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500"/> Trial Companies
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">
                  {metrics.activeFree}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform group-hover:scale-110">
                  <Users size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-500"/> Total Employees
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">
                  {metrics.totalEmps}
                </div>
                <div className="text-xs font-bold text-slate-500">
                  Across Platform
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity transform group-hover:scale-110">
                  <AlertTriangle size={80} />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600"/> Expiring Soon
                  </span>
                </div>
                <div className="text-4xl font-black text-amber-900 mb-1">
                  {metrics.expiringSoon}
                </div>
                <div className="text-xs font-bold text-amber-700">
                  Renewing in next 7 days
                </div>
              </div>

            </section>

            {/* --- COMPANY DIRECTORY TABLE --- */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 bg-slate-50/30 flex flex-col xl:flex-row items-center justify-between gap-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-600"/> Directory
                </h3>
                
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  
                  {/* Search */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search company, owner, email..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                  
                  {/* Filters */}
                  <select 
                    className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none cursor-pointer"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Trial">Trial</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Blocked">Blocked</option>
                  </select>

                  <select 
                    className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none cursor-pointer"
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                  >
                    <option value="All">All Plans</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>

                  {/* Exports */}
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                    <button 
                      onClick={() => handleExport("csv")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                    >
                      <Download size={14}/> CSV
                    </button>
                    <button 
                      onClick={() => handleExport("excel")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-200"
                    >
                      <Download size={14}/> Excel
                    </button>
                  </div>
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
                      <th className="py-4 px-6">Activity Health</th>
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
                        const health = getHealthBadge(c.updatedAt);
                        return (
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
                              {c.status === "Blocked" || c.status === "Suspended" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                                    <Ban size={14} /> {c.status}
                                  </span>
                              ) : c.isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                  <BadgeCheck size={14} /> Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                                  <Clock size={14} /> Trial
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                <Users size={14} className="text-slate-400" /> {c.employeeCount}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className={\`w-2 h-2 rounded-full \${health.color}\`}></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{health.text}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium mt-1">Joined: {formatDate(c.createdAt)}</div>
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
          <div className="animate-in slide-in-from-right-8 duration-300 space-y-6 max-w-5xl mx-auto">
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
                             <p className="text-xs font-bold text-slate-700">{formatDate(selectedCompany.updatedAt)}</p>
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
console.log('Final superadmin UI updates applied!');
