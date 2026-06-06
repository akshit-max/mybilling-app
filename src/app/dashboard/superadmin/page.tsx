"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Activity, 
  IndianRupee, 
  Search, 
  ShieldAlert, 
  Calendar,
  Lock,
  BadgeCheck,
  Ban,
  X,
  Mail,
  UserCog
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { useSession } from "@/context/SessionContext";
import { hashPin } from "@/lib/crypto";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";

type CompanyData = {
  uid: string;
  businessName: string;
  email: string; // Fetch from auth if possible, or leave as placeholder
  plan: string;
  subscriptionCycle: string;
  isPaid: boolean;
  createdAt: Date;
  employeeCount: number;
  rolesBreakdown: Record<string, number>;
  estimatedValue: number;
};

export default function SuperAdminDashboard() {
  const { activeProfile, adminPin } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Verify Access natively using SessionContext
      if (activeProfile.role !== "SUPER_ADMIN") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) return;



      // 3. Access Granted -> Fetch Data
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

        // Build Subusers Map
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
             else if (plan === "Diamond") estimatedValue = 249; // Default diamond monthly
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

    // Listen to auth state to ensure we wait for Firebase to initialize
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        init();
      } else {
        setAccessDenied(true);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 font-sans h-full p-8 text-center">
         <Loader size={48} />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 font-sans h-full p-8 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6 drop-shadow-md" />
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">Access Denied</h2>
        <p className="text-base text-gray-500 mt-3 max-w-md font-medium leading-relaxed">
          This is an isolated SaaS Owner dashboard. Your account does not have the required permissions to view platform-wide data.
        </p>
      </div>
    );
  }

  // Calculate Metrics
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalCompanies = companies.length;
  const activeSubscriptions = companies.filter(c => c.isPaid).length;
  const inactiveSubscriptions = totalCompanies - activeSubscriptions;
  const totalEmployees = companies.reduce((sum, c) => sum + c.employeeCount, 0);
  
  const estimatedMonthlyValue = companies
    .filter(c => c.isPaid && c.subscriptionCycle === "Monthly")
    .reduce((sum, c) => sum + c.estimatedValue, 0);
    
  const estimatedYearlyValue = companies
    .filter(c => c.isPaid && c.subscriptionCycle === "Yearly")
    .reduce((sum, c) => sum + c.estimatedValue, 0);

  const newCompaniesThisMonth = companies.filter(c => c.createdAt >= currentMonthStart).length;
  const avgEmployeesPerCompany = totalCompanies > 0 ? (totalEmployees / totalCompanies).toFixed(1) : "0";
  // Filter Table
  const filteredCompanies = companies.filter(c => 
    c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50/30 overflow-y-auto font-sans h-full">
      
      {/* Top Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs bg-white">
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Lock size={16} className="text-indigo-600" /> SaaS Owner Dashboard
          </h2>
          <p className="text-[10px] text-gray-500 font-medium">Platform-wide analytics and company oversight</p>
        </div>
      </div>

      <main className="w-full max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Top-Level Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <Building2 size={16} className="text-indigo-600" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-gray-500">Total Companies</span>
            </div>
            <div className="text-3xl font-black text-gray-800 tracking-tight">{totalCompanies}</div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <BadgeCheck size={16} className="text-emerald-600" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-gray-500">Paid Companies</span>
            </div>
            <div className="text-3xl font-black text-gray-800 tracking-tight">{activeSubscriptions}</div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <Ban size={16} className="text-red-600" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-gray-500">Unpaid Companies</span>
            </div>
            <div className="text-3xl font-black text-gray-800 tracking-tight">{inactiveSubscriptions}</div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Users size={16} className="text-blue-600" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-gray-500">Total Employees</span>
            </div>
            <div className="text-3xl font-black text-gray-800 tracking-tight">{totalEmployees}</div>
          </div>

        </div>

        {/* Company Data Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                <Building2 size={16} className="text-gray-700" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Company Directory</h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input 
                type="text" 
                placeholder="Search businesses..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-64 focus:outline-none focus:border-indigo-500 bg-white shadow-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] uppercase tracking-widest text-gray-500 font-bold">
                  <th className="py-4 px-6 font-semibold">Business Name</th>
                  <th className="py-4 px-6 font-semibold">Owner Email</th>
                  <th className="py-4 px-6 font-semibold">Plan</th>
                  <th className="py-4 px-6 font-semibold">Subscription Cycle</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold">Employee Count</th>
                  <th className="py-4 px-6 font-semibold">Created Date</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400 font-medium">
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((c) => (
                    <tr 
                      key={c.uid} 
                      onClick={() => setSelectedCompany(c)}
                      className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{c.businessName}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-600">{c.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-800">{c.plan}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-600">{c.subscriptionCycle}</div>
                      </td>
                      <td className="py-4 px-6">
                        {c.isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                            <BadgeCheck size={14} /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                            <Ban size={14} /> Unpaid
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          <Users size={14} className="text-gray-400" /> {c.employeeCount}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-500 font-medium">
                        {c.createdAt.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedCompany(null)}
          ></div>
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600" /> Company Details
              </h3>
              <button 
                onClick={() => setSelectedCompany(null)} 
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
              {/* Business Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Business Information</h4>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Business Name</label>
                    <p className="text-base font-bold text-gray-900">{selectedCompany.businessName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Mail size={12}/> Owner Email</label>
                    <p className="text-sm font-medium text-gray-700">{selectedCompany.email}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Registered On</label>
                    <p className="text-sm font-medium text-gray-700">{selectedCompany.createdAt.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Subscription</h4>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</label>
                    <p className="text-sm font-bold text-indigo-700">{selectedCompany.plan}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cycle</label>
                    <p className="text-sm font-bold text-gray-800">{selectedCompany.subscriptionCycle}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-50">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Status</label>
                    {selectedCompany.isPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                        <BadgeCheck size={14} /> Paid Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                        <Ban size={14} /> Unpaid / Trial
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Employee Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Employees</h4>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-2"><Users size={16} className="text-blue-500"/> Total Employees</span>
                    <span className="text-lg font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-md">{selectedCompany.employeeCount}</span>
                  </div>
                  
                  {selectedCompany.employeeCount > 0 ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><UserCog size={12}/> Role Breakdown</p>
                      {Object.entries(selectedCompany.rolesBreakdown).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-600">{role}</span>
                          <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium text-center py-2">No employees added.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
