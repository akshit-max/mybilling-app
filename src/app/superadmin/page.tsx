"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  Users, 
  Search, 
  Calendar,
  Lock,
  BadgeCheck,
  Ban,
  Mail,
  UserCog,
  ChevronLeft,
  Settings,
  LogOut,
  TrendingUp,
  PieChart,
  Activity,
  CreditCard,
  Filter,
  ArrowUpRight,
  AlertTriangle,
  Clock
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CompanyData = {
  uid: string;
  businessName: string;
  email: string;
  plan: string;
  subscriptionCycle: string;
  isPaid: boolean;
  createdAt: Date;
  employeeCount: number;
  rolesBreakdown: Record<string, number>;
  estimatedValue: number;
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

  const init = async () => {
      setLoading(true);
      try {
        const [usersSnap, subusersSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"))),
          getDocs(query(collection(db, "subusers"))),
          getDocs(query(collection(db, "settings")))
        ]);

        const emailMap: Record<string, string> = {};
        settingsSnap.forEach(doc => {
          if (doc.data().email) {
            emailMap[doc.id] = doc.data().email;
          }
        });

        // Build Subusers Map strictly based on adminId === users.DocumentID
        const employeesByCompany: Record<string, any[]> = {};
        subusersSnap.forEach(doc => {
          const d = doc.data();
          if (!d.adminId) return;
          if (!employeesByCompany[d.adminId]) employeesByCompany[d.adminId] = [];
          employeesByCompany[d.adminId].push(d);
        });

        const parseDate = (val: any): Date => {
          if (!val) return new Date();
          if (typeof val.toDate === 'function') return val.toDate();
          if (val.seconds) return new Date(val.seconds * 1000);
          return new Date(val);
        };

        const companyList: CompanyData[] = [];

        usersSnap.forEach(doc => {
          const d = doc.data();
          const uid = doc.id;
          const employees = employeesByCompany[uid] || [];
          
          const rolesBreakdown: Record<string, number> = {};
          employees.forEach(emp => {
            const role = emp.role || "Unknown";
            rolesBreakdown[role] = (rolesBreakdown[role] || 0) + 1;
          });

          // Estimate Value
          let estimatedValue = 0;
          if (d.isPaid && d.plan) {
             const plan = d.plan;
             const cycle = d.subscriptionCycle;
             if (plan === "Diamond" && cycle === "Yearly") estimatedValue = 2599;
             else if (plan === "Platinum" && cycle === "Monthly") estimatedValue = 299;
             else if (plan === "Platinum" && cycle === "Yearly") estimatedValue = 2999;
             else if (plan === "Enterprise" && cycle === "Monthly") estimatedValue = 750;
             else if (plan === "Enterprise" && cycle === "Yearly") estimatedValue = 4999;
             else if (plan === "Diamond") estimatedValue = 249;
          }

          companyList.push({
            uid,
            businessName: d.businessName || "Unnamed Business",
            email: emailMap[uid] || "No Email",
            plan: d.plan || "Free/Trial",
            subscriptionCycle: d.subscriptionCycle || "N/A",
            isPaid: !!d.isPaid,
            createdAt: parseDate(d.createdAt),
            employeeCount: employees.length,
            rolesBreakdown,
            estimatedValue
          });
        });

        // Sort by newest first
        companyList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

  // --- DERIVED METRICS ---
  const metrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Day of week (0 is Sunday, 1 is Monday... shift so 1 is Monday, 0 is Sunday, etc)
    // To get start of week (assuming Monday):
    const day = now.getDay() || 7; 
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - day + 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalCompanies = companies.length;
    let activeSubscriptions = 0;
    let totalEmployees = 0;
    let newCompaniesThisMonth = 0;
    let newCompaniesThisWeek = 0;
    let newCompaniesToday = 0;
    let newPaidCompaniesThisMonth = 0;

    let planDistribution = { Diamond: 0, Platinum: 0, Gold: 0, Enterprise: 0, 'Trial/Free': 0 };
    let cycleSplit = { Monthly: 0, Yearly: 0 };
    let totalActiveValue = 0;

    let noEmployeesCount = 0;
    
    companies.forEach(c => {
      totalEmployees += c.employeeCount;
      if (c.employeeCount === 0) noEmployeesCount++;

      if (c.isPaid) activeSubscriptions++;

      // Time-based
      if (c.createdAt >= startOfMonth) {
        newCompaniesThisMonth++;
        if (c.isPaid) newPaidCompaniesThisMonth++;
      }
      if (c.createdAt >= startOfWeek) newCompaniesThisWeek++;
      if (c.createdAt >= today) newCompaniesToday++;

      // Plans
      if (c.isPaid) {
        if (c.plan === 'Diamond') planDistribution.Diamond++;
        else if (c.plan === 'Platinum') planDistribution.Platinum++;
        else if (c.plan === 'Gold') planDistribution.Gold++;
        else if (c.plan === 'Enterprise') planDistribution.Enterprise++;

        if (c.subscriptionCycle === 'Monthly') cycleSplit.Monthly++;
        else if (c.subscriptionCycle === 'Yearly') cycleSplit.Yearly++;

        totalActiveValue += c.estimatedValue;
      } else {
        planDistribution['Trial/Free']++;
      }
    });

    const inactiveSubscriptions = totalCompanies - activeSubscriptions;
    const avgEmployees = totalCompanies ? (totalEmployees / totalCompanies).toFixed(1) : "0";

    return {
      totalCompanies,
      activeSubscriptions,
      inactiveSubscriptions,
      totalEmployees,
      newCompaniesThisMonth,
      newCompaniesThisWeek,
      newCompaniesToday,
      newPaidCompaniesThisMonth,
      avgEmployees,
      planDistribution,
      cycleSplit,
      totalActiveValue,
      noEmployeesCount
    };
  }, [companies]);

  // Filter Table
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === "All" || c.plan === filterPlan || (!c.isPaid && filterPlan === "Free/Trial");
    const matchesStatus = filterStatus === "All" || (filterStatus === "Paid" ? c.isPaid : !c.isPaid);
    return matchesSearch && matchesPlan && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 font-sans h-screen p-8 text-center">
         <Loader size={48} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto font-sans h-full">
      <main className="w-full max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
        
        {!selectedCompany ? (
          <div className="animate-in fade-in duration-500 space-y-8">
            
            {/* 1. PLATFORM OVERVIEW */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={14} /> Platform Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#F97316]/40 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                    <Building2 size={64} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 block mb-2">Total Companies</span>
                  <div className="text-3xl font-black text-slate-900">{metrics.totalCompanies}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 text-emerald-600">
                    <BadgeCheck size={64} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 block mb-2">Active Subscriptions</span>
                  <div className="text-3xl font-black text-emerald-600">{metrics.activeSubscriptions}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-300 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 text-red-600">
                    <Ban size={64} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-red-500 block mb-2">Inactive / Unpaid</span>
                  <div className="text-3xl font-black text-slate-900">{metrics.inactiveSubscriptions}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 text-blue-600">
                    <Users size={64} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 block mb-2">Total Employees</span>
                  <div className="text-3xl font-black text-slate-900">{metrics.totalEmployees}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#F97316]/40 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 text-[#F97316]">
                    <TrendingUp size={64} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#F97316] block mb-2">New (This Month)</span>
                  <div className="text-3xl font-black text-[#F97316]">+{metrics.newCompaniesThisMonth}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 text-slate-600">
                    <UserCog size={64} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 block mb-2">Avg Employees/Co.</span>
                  <div className="text-3xl font-black text-slate-900">{metrics.avgEmployees}</div>
                </div>

              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* 2. SUBSCRIPTION ANALYTICS */}
              <section className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <PieChart size={14} /> Subscription Analytics
                </h3>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                     <div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estimated Active MRR/ARR</div>
                       <div className="text-3xl font-black text-emerald-600 flex items-center gap-2">
                          ₹{metrics.totalActiveValue.toLocaleString('en-IN')}
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cycle Split</div>
                       <div className="flex items-center gap-3">
                         <span className="text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">Monthly: {metrics.cycleSplit.Monthly}</span>
                         <span className="text-sm font-bold text-[#F97316] bg-[#FFF7ED] px-3 py-1 rounded-lg border border-[#F97316]/20 shadow-sm">Yearly: {metrics.cycleSplit.Yearly}</span>
                       </div>
                     </div>
                   </div>
                   <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                       <div className="text-2xl font-black text-slate-800">{metrics.planDistribution.Diamond}</div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Diamond</div>
                     </div>
                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                       <div className="text-2xl font-black text-slate-800">{metrics.planDistribution.Platinum}</div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Platinum</div>
                     </div>
                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                       <div className="text-2xl font-black text-slate-800">{metrics.planDistribution.Enterprise + metrics.planDistribution.Gold}</div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Other Paid</div>
                     </div>
                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center opacity-70">
                       <div className="text-2xl font-black text-slate-800">{metrics.planDistribution['Trial/Free']}</div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Trial / Free</div>
                     </div>
                   </div>
                </div>
              </section>

              {/* 3. GROWTH & HEALTH */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ArrowUpRight size={14} /> Growth & Health
                </h3>
                <div className="grid grid-cols-1 gap-4">
                   <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-[#FFF7ED] rounded-lg text-[#F97316]"><Calendar size={18}/></div>
                       <span className="text-xs font-bold text-slate-700">Added This Week</span>
                     </div>
                     <span className="text-lg font-black text-[#F97316]">+{metrics.newCompaniesThisWeek}</span>
                   </div>
                   <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CreditCard size={18}/></div>
                       <span className="text-xs font-bold text-slate-700">New Paid (This Month)</span>
                     </div>
                     <span className="text-lg font-black text-emerald-600">+{metrics.newPaidCompaniesThisMonth}</span>
                   </div>
                   <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between bg-red-50/30">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle size={18}/></div>
                       <span className="text-xs font-bold text-red-800">No Employees Added</span>
                     </div>
                     <span className="text-lg font-black text-red-600">{metrics.noEmployeesCount}</span>
                   </div>
                </div>
              </section>

            </div>

            {/* 4. COMPANY DIRECTORY */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building2 size={14} /> Company Directory
                </h3>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search name or email..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all shadow-sm font-medium"
                    />
                  </div>
                  
                  <select 
                    className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm focus:outline-none cursor-pointer"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Paid">Paid Only</option>
                    <option value="Unpaid">Unpaid/Trial</option>
                  </select>

                  <select 
                    className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm focus:outline-none cursor-pointer hidden md:block"
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                  >
                    <option value="All">All Plans</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="Free/Trial">Free/Trial</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        <th className="py-4 px-6">Business Name</th>
                        <th className="py-4 px-6">Owner Email</th>
                        <th className="py-4 px-6">Plan & Cycle</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6">Employees</th>
                        <th className="py-4 px-6">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                      {filteredCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                            No companies match your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredCompanies.map((c) => (
                          <tr 
                            key={c.uid} 
                            onClick={() => setSelectedCompany(c)}
                            className="hover:bg-[#FFF7ED]/30 transition-colors group cursor-pointer"
                          >
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900 group-hover:text-[#F97316] transition-colors">{c.businessName}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-medium text-slate-600">{c.email}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{c.plan}</span>
                                {c.subscriptionCycle !== "N/A" && (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{c.subscriptionCycle}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {c.isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                  <BadgeCheck size={14} /> Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                                  <Ban size={14} /> Unpaid
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                <Users size={14} className="text-slate-400" /> {c.employeeCount}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-500 font-medium text-xs">
                              {c.createdAt.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-8 duration-300 space-y-4">
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
                     <h1 className="text-4xl font-black tracking-tight mb-3">{selectedCompany.businessName}</h1>
                     <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5"><Mail size={16} className="text-slate-500"/> {selectedCompany.email}</span>
                        <span className="flex items-center gap-1.5 md:border-l border-slate-700 md:pl-4"><Clock size={16} className="text-slate-500"/> Registered: {selectedCompany.createdAt.toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                     </div>
                   </div>
                   <div>
                     {selectedCompany.isPaid ? (
                       <div className="inline-flex flex-col items-end">
                         <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-bold border border-emerald-500/30">
                           <BadgeCheck size={18} /> Active Subscription
                         </span>
                       </div>
                     ) : (
                       <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700">
                         <Ban size={18} /> Inactive / Trial
                       </span>
                     )}
                   </div>
                 </div>
               </div>

               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Subscription Details */}
                  <div className="space-y-4">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <BadgeCheck size={14}/> Subscription Status
                     </h4>
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-2 gap-6 relative overflow-hidden">
                        <div>
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Current Plan</label>
                           <p className="text-2xl font-black text-[#F97316]">{selectedCompany.plan}</p>
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Billing Cycle</label>
                           <p className="text-2xl font-black text-slate-800">{selectedCompany.subscriptionCycle}</p>
                        </div>
                        <div className="col-span-2 pt-4 border-t border-slate-200">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Estimated Plan Value</label>
                           <p className="text-xl font-bold text-emerald-600">₹{selectedCompany.estimatedValue.toLocaleString('en-IN')}</p>
                        </div>
                     </div>
                  </div>

                  {/* Employees Overview */}
                  <div className="space-y-4">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <Users size={14}/> Team & Access
                     </h4>
                     <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                           <div>
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Active Accounts</span>
                             <span className="text-4xl font-black text-blue-600 leading-none">{selectedCompany.employeeCount}</span>
                           </div>
                           <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                             <Users size={24} />
                           </div>
                        </div>
                        
                        {selectedCompany.employeeCount > 0 && (
                          <div className="space-y-3 border-t border-slate-100 pt-5">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserCog size={12}/> Access Roles</p>
                             <div className="flex flex-wrap gap-2">
                               {Object.entries(selectedCompany.rolesBreakdown).map(([role, count]) => (
                                 <div key={role} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                   <span className="text-xs font-bold text-slate-600">{role}</span>
                                   <span className="text-[10px] font-black text-white bg-slate-800 px-1.5 py-0.5 rounded">{count}</span>
                                 </div>
                               ))}
                             </div>
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
