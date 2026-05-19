"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Activity, HelpCircle, Search, ChevronDown, Lock, Eye, ArrowRight, UserCog, Briefcase, Truck, ShieldCheck, FileSpreadsheet, Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function ManageUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("selected") || "users";

  const handleTabChange = (newTab: string) => {
    router.push(`/dashboard/manage-users${newTab === "users" ? "" : "?selected=" + newTab}`);
  };

  const handleComingSoon = () => {
    toast("User management is coming soon!", { icon: "🚀" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Manage Users</h1>
        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 border border-gray-200 rounded-full hover:bg-gray-50">
          <HelpCircle size={16} />
        </button>
      </header>

      {/* WORKSPACE */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-6 flex flex-col space-y-6">
        
        {/* Top Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tab 1 */}
          <div 
            onClick={() => handleTabChange("users")}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${tab === "users" ? "border-indigo-500 bg-indigo-50/20" : "border-gray-200 bg-white hover:bg-gray-50"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className={tab === "users" ? "text-indigo-500" : "text-gray-400"} />
              <span className={`text-[11px] font-bold tracking-wider uppercase ${tab === "users" ? "text-indigo-500" : "text-gray-500"}`}>Number of Users</span>
            </div>
            <div className={`text-xl font-mono font-bold ${tab === "users" ? "text-indigo-600" : "text-gray-800"}`}>1</div>
          </div>

          {/* Tab 2 */}
          <div 
            onClick={() => handleTabChange("user_activity")}
            className={`border rounded-lg p-4 cursor-pointer transition-colors relative ${tab === "user_activity" ? "border-indigo-500 bg-indigo-50/20" : "border-gray-200 bg-white hover:bg-gray-50"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className={tab === "user_activity" ? "text-indigo-500" : "text-gray-400"} />
              <span className={`text-[11px] font-bold tracking-wider uppercase ${tab === "user_activity" ? "text-indigo-500" : "text-gray-500"}`}>Activities Performed</span>
            </div>
            <div className={`text-xl font-mono font-bold ${tab === "user_activity" ? "text-indigo-600" : "text-gray-800"}`}>1</div>
            {tab === "user_activity" && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded border border-gray-200">
                Last 30 Days
              </div>
            )}
          </div>

        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          
          {tab === "users" ? (
            
            /* USERS HIERARCHY VIEW */
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/30">
              
              {/* CSS Hierarchy Diagram */}
              <div className="flex items-center justify-center gap-12 mb-16 select-none">
                
                {/* Admin Node */}
                <div className="relative group">
                  <div className="w-20 h-20 bg-white border-2 border-indigo-200 rounded-lg shadow-sm flex flex-col items-center justify-center z-10 relative">
                    <UserCog size={32} className="text-indigo-500 mb-1" />
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Admin</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-1/2 right-[-180px] -translate-y-1/2 bg-gray-800 text-white text-[10px] font-semibold px-3 py-2 rounded z-20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Give access to users and monitor their actions
                  </div>
                  {/* Eye Badge */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center z-20">
                     <Eye size={12} className="text-emerald-600" />
                  </div>
                </div>

                {/* Connecting Lines */}
                <div className="relative w-16 h-48 flex items-center">
                  {/* Horizontal Line out of Admin */}
                  <div className="absolute left-0 top-1/2 w-8 border-b-2 border-dashed border-gray-300"></div>
                  {/* Vertical trunk */}
                  <div className="absolute left-8 top-4 bottom-4 border-l-2 border-dashed border-gray-300"></div>
                  {/* Branches */}
                  <div className="absolute left-8 top-4 w-8 border-b-2 border-dashed border-gray-300"></div>
                  <div className="absolute left-8 top-[33%] w-8 border-b-2 border-dashed border-gray-300"></div>
                  <div className="absolute left-8 top-[66%] w-8 border-b-2 border-dashed border-gray-300"></div>
                  <div className="absolute left-8 bottom-4 w-8 border-b-2 border-dashed border-gray-300"></div>
                </div>

                {/* Roles Nodes */}
                <div className="flex flex-col gap-4 z-10 relative">
                  
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-white border border-gray-200 rounded p-2 flex items-center gap-2 shadow-sm">
                      <Briefcase size={14} className="text-blue-500" />
                      <span className="text-[10px] font-bold text-gray-600">Partner</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-white border border-gray-200 rounded p-2 flex items-center gap-2 shadow-sm">
                      <Users size={14} className="text-amber-500" />
                      <span className="text-[10px] font-bold text-gray-600">Salesman</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-white border border-gray-200 rounded p-2 flex items-center gap-2 shadow-sm">
                      <ShieldCheck size={14} className="text-teal-500" />
                      <span className="text-[10px] font-bold text-gray-600">Stock Mgr</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-white border border-gray-200 rounded p-2 flex items-center gap-2 shadow-sm">
                      <Truck size={14} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-gray-600">Delivery Boy</span>
                    </div>
                  </div>

                </div>

                {/* CA Node */}
                <div className="flex flex-col z-10 relative ml-8">
                    <div className="w-24 bg-white border border-gray-200 rounded p-2 flex flex-col items-center gap-1 shadow-sm relative before:content-[''] before:absolute before:-left-12 before:top-1/2 before:w-12 before:border-b-2 before:border-dashed before:border-gray-300">
                      <FileSpreadsheet size={16} className="text-purple-500" />
                      <span className="text-[10px] font-bold text-gray-600">CA</span>
                    </div>
                </div>

              </div>

              {/* Title & CTA */}
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Give access to users and monitor their actions</h2>
                  <p className="text-xs text-gray-500 font-medium mt-1">Manage your business more efficiently with full control and vision</p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={handleComingSoon} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded text-sm transition-colors shadow-sm flex items-center gap-1.5">
                    <Plus size={14} /> Add New User
                  </button>
                  <button onClick={handleComingSoon} className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold px-6 py-2 rounded text-sm transition-colors shadow-sm flex items-center gap-1.5">
                    <Plus size={14} /> Add Your CA
                  </button>
                </div>
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
                    placeholder="All Transactions" 
                    className="pl-8 pr-4 py-1.5 border border-gray-200 rounded text-xs w-56 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                </div>
                <div className="flex items-center gap-2 border border-gray-200 bg-white rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                  <span className="text-xs font-semibold text-gray-600">Last 30 Days</span>
                  <ChevronDown size={14} className="text-gray-400 ml-2" />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3 flex items-center gap-1 cursor-pointer">Time of Activity <ChevronDown size={12}/></th>
                      <th className="px-6 py-3">Activity</th>
                      <th className="px-6 py-3">Transaction Details</th>
                      <th className="px-6 py-3">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        17-05-2026 | 08:45 PM
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">Created Sales Invoices</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">Cash Sale</div>
                        <div className="text-gray-400 text-[10px]">#1 <span className="float-right text-gray-800 font-mono ml-4">₹ 1,289</span></div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">Admin</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Promotional Banner */}
              <div className="m-4 bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                    <Lock size={16} className="absolute top-1 left-1 text-amber-500" />
                    <Activity size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Interested to see how your users create and edit transactions?</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">With User Activity Tracker, you can get full visibility into your user's activities</p>
                  </div>
                </div>
                <button onClick={handleComingSoon} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded text-sm transition-colors shadow-sm">
                  Track All Activities
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
