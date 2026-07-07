"use client";

import React, { useState } from "react";
import { Check, X, ShieldCheck, Crown, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import SettingsSidebar from "../SettingsSidebar";

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Yearly">("Yearly");
  const [activePlan, setActivePlan] = useState<any>(null);
  const [isPaid, setIsPaid] = useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsPaid(!!data.isPaid);
            if (data.isPaid && data.plan) {
              setActivePlan({ plan: data.plan, cycle: data.subscriptionCycle || "Monthly" });
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleBuy = (plan: string) => {
    router.push(`/dashboard/settings/pricing/checkout?plan=${plan}&cycle=${billingCycle}`);
  };

  const DiamondFeatures = [
    { name: "Desktop App for Fast and Convenient Use", inc: false },
    { name: "Custom Invoice Themes", inc: true },
    { name: "E-way bills", inc: false },
    { name: "Generate e-invoices", inc: false },
    { name: "POS Billing", inc: false },
    { name: "Staff Attendance & Payroll", inc: false },
    { name: "Create Unlimited Godowns", inc: false },
    { name: "Generate and print barcodes (A4 only)", inc: true },
    { name: "Tally Export to Tally", inc: false },
    { name: "User Activity Tracker", inc: false },
    { name: "Automated Billing", inc: false },
    { name: "Create your Online Store", inc: true },
    { name: "WhatsApp & SMS Marketing", inc: false },
    { name: "Loyalty and Rewards", inc: false },
    { name: "Bulk Download & Bulk Print Invoices", inc: false },
    { name: "Add your CA", inc: true },
  ];

  const PlatinumFeatures = [
    { name: "Desktop App for Fast and Convenient Use", inc: true },
    { name: "Custom Invoice Themes", inc: true },
    { name: "E-way bills (50/year)", inc: true },
    { name: "Generate e-invoices", inc: false },
    { name: "POS Billing", inc: false },
    { name: "Staff Attendance & Payroll", inc: true },
    { name: "Create Unlimited Godowns", inc: true },
    { name: "Generate and print barcodes (A4 only)", inc: true },
    { name: "Tally Export to Tally", inc: false },
    { name: "User Activity Tracker", inc: false },
    { name: "Automated Billing", inc: false },
    { name: "Create your Online Store", inc: true },
    { name: "WhatsApp & SMS Marketing (500 SMS/Year)", inc: true },
    { name: "Loyalty and Rewards", inc: false },
    { name: "Bulk Download & Bulk Print Invoices", inc: false },
    { name: "Add your CA", inc: true },
  ];

  const EnterpriseFeatures = [
    { name: "Desktop App for Fast and Convenient Use", inc: true },
    { name: "Custom Invoice Themes", inc: true },
    { name: "E-way bills (Unlimited)", inc: true },
    { name: "Generate e-invoices", inc: true },
    { name: "POS Billing (Desktop App, Web app)", inc: true },
    { name: "Staff Attendance & Payroll", inc: true },
    { name: "Create Unlimited Godowns", inc: true },
    { name: "Generate and print barcodes (A4 only)", inc: true },
    { name: "Tally Export to Tally (On request)", inc: true },
    { name: "User Activity Tracker", inc: true },
    { name: "Automated Billing", inc: true },
    { name: "Create your Online Store", inc: true },
    { name: "WhatsApp & SMS Marketing (1000 SMS/Year)", inc: true },
    { name: "Loyalty and Rewards", inc: true },
    { name: "Bulk Download & Bulk Print Invoices", inc: true },
    { name: "Add your CA", inc: true },
  ];

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      <SettingsSidebar />
      <div className="flex-1 bg-gray-50 flex flex-col font-sans h-[calc(100vh-60px)] overflow-hidden">
        
        {/* HEADER BANNER */}
        <div className="bg-brand-neutral border-b border-orange-100 px-6 py-4 flex flex-col items-center justify-center shrink-0 z-10 text-center relative shadow-sm">
          {isPaid && activePlan ? (
            <>
              <h2 className="text-sm font-bold text-gray-800">
                You are currently on the <span className="text-brand-tertiary">{activePlan.plan}</span> Plan
              </h2>
              <p className="text-xs text-gray-600 mt-1">Your {activePlan.cycle.toLowerCase()} subscription is active.</p>
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-gray-800">
                You don't have any active plan
              </h2>
              <p className="text-xs text-gray-600 mt-1">Choose the best plan to continue using Cloud Ledger without any interruption</p>
            </>
          )}
          <div className="flex items-center gap-1 text-[10px] font-bold text-brand-tertiary mt-2 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            <ShieldCheck size={12} /> 7 days moneyback guarantee
          </div>
        </div>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 max-w-[1400px] w-full mx-auto">
          
          {/* Billing Toggle */}
          <div className="flex justify-center mb-8">
            <div className="relative inline-flex bg-white border border-indigo-200 rounded-lg p-1 shadow-sm">
               <div className="absolute -top-3 right-2 bg-brand-tertiary text-white text-[8px] font-bold px-1.5 py-0.5 rounded z-10">upto 50% off</div>
               <button 
                 onClick={() => setBillingCycle("Monthly")}
                 className={`px-8 py-2 text-xs font-bold rounded-md transition-colors ${billingCycle === "Monthly" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
               >
                 Monthly
               </button>
               <button 
                 onClick={() => setBillingCycle("Yearly")}
                 className={`px-8 py-2 text-xs font-bold rounded-md transition-colors ${billingCycle === "Yearly" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
               >
                 Yearly
               </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Diamond Plan */}
            <div className="bg-white border border-gray-200 border-t-4 border-t-[#F16D31] rounded-lg shadow-sm flex flex-col relative">
              {isPaid && activePlan?.plan === "Diamond" && activePlan?.cycle === billingCycle && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm z-10 animate-pulse-subtle">
                  <CheckCircle size={10} /> Active Plan
                </div>
              )}
              <div className="p-6 border-b border-gray-100 flex flex-col space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Diamond Plan</h3>
                  <p className="text-xs text-indigo-600 font-semibold mt-1">Essential plan for small business owners</p>
                </div>
                <div>
                  {billingCycle === "Yearly" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-gray-400 line-through">₹300</span>
                        <span className="text-2xl font-bold text-gray-900">₹217</span>
                        <span className="text-[10px] text-gray-500 font-medium">/month</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-[10px] text-gray-400 line-through">₹3,599/year</p>
                        <p className="text-[10px] text-gray-500 font-medium">Billed Annually ₹2,599/year</p>
                        <span className="text-[9px] font-bold text-brand-tertiary bg-emerald-50 px-1 rounded border border-emerald-100">28% Off</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">₹249</span>
                        <span className="text-[10px] text-gray-500 font-medium">/month</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Billed Monthly</p>
                    </>
                  )}
                </div>
                {isPaid && activePlan?.plan === "Diamond" && activePlan?.cycle === billingCycle ? (
                  <button disabled className="w-full py-2 border border-emerald-500 bg-emerald-50 text-emerald-700 font-bold text-xs rounded cursor-not-allowed shadow-inner flex justify-center items-center gap-2">
                    <CheckCircle size={14} /> Active Plan
                  </button>
                ) : (
                  <button onClick={() => handleBuy("Diamond")} className="w-full py-2 border border-[#F16D31] text-[#F16D31] font-bold text-xs rounded hover:bg-brand-neutral transition-colors">
                    Buy Diamond Plan
                  </button>
                )}
                <div className="space-y-2 text-[11px] font-medium text-gray-600 pt-2">
                   <p>Manage <span className="font-bold text-gray-800">1 Business</span></p>
                   <p>Access for <span className="font-bold text-gray-800">1 User + 1 CA</span></p>
                   <p>Auto-sync data across unlimited devices</p>
                   <p>Access on <span className="font-bold text-gray-800">Android, iOS & Web</span></p>
                </div>
              </div>
              <div className="p-6 flex-1 bg-[#FFF9F5]/30">
                <p className="text-[10px] font-bold text-[#F16D31] mb-4">Features Exclusive to Diamond Plan</p>
                <ul className="space-y-3">
                  {DiamondFeatures.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[11px] ${f.inc ? 'text-gray-800 font-medium bg-[#FFF4E5]/50 -mx-2 px-2 py-1 rounded' : 'text-gray-400'}`}>
                      {f.inc ? <Check size={14} className="text-brand-tertiary shrink-0 mt-0.5" /> : <X size={14} className="text-red-500 shrink-0 mt-0.5" />}
                      <span>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Platinum Plan (Popular) */}
            <div className="bg-white border border-indigo-200 border-t-4 border-t-indigo-600 rounded-lg shadow-md flex flex-col relative transform lg:-translate-y-4">
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                {isPaid && activePlan?.plan === "Platinum" && activePlan?.cycle === billingCycle && (
                  <div className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm animate-pulse-subtle">
                    <CheckCircle size={10} /> Active Plan
                  </div>
                )}
                <div className="bg-[#F16D31] text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                  <Crown size={10} /> Most Popular
                </div>
              </div>
              <div className="p-6 border-b border-gray-100 flex flex-col space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Platinum Plan</h3>
                  <p className="text-xs text-indigo-600 font-semibold mt-1">More users, more flexibility, and a Desktop app</p>
                </div>
                <div>
                  {billingCycle === "Yearly" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-gray-400 line-through">₹500</span>
                        <span className="text-2xl font-bold text-gray-900">₹250</span>
                        <span className="text-[10px] text-gray-500 font-medium">/month</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-[10px] text-gray-400 line-through">₹5,999/year</p>
                        <p className="text-[10px] text-gray-500 font-medium">Billed Annually ₹2,999/year</p>
                        <span className="text-[9px] font-bold text-brand-tertiary bg-emerald-50 px-1 rounded border border-emerald-100">50% Off</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">₹299</span>
                        <span className="text-[10px] text-gray-500 font-medium">/month</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Billed Monthly</p>
                    </>
                  )}
                </div>
                {isPaid && activePlan?.plan === "Platinum" && activePlan?.cycle === billingCycle ? (
                  <button disabled className="w-full py-2 border border-emerald-500 bg-emerald-50 text-emerald-700 font-bold text-xs rounded cursor-not-allowed shadow-inner flex justify-center items-center gap-2">
                    <CheckCircle size={14} /> Active Plan
                  </button>
                ) : (
                  <button onClick={() => handleBuy("Platinum")} className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded shadow-sm hover:bg-indigo-700 transition-colors">
                    Buy Platinum Plan
                  </button>
                )}
                <div className="space-y-2 text-[11px] font-medium text-gray-600 pt-2">
                   <p>Manage <span className="font-bold text-gray-800">2 Businesses</span></p>
                   <p>Access for <span className="font-bold text-gray-800">3 Users + 1 CA</span></p>
                   <p>Auto-sync data across unlimited devices</p>
                   <p>Access on <span className="font-bold text-gray-800">Android, iOS, Web & Desktop</span></p>
                </div>
              </div>
              <div className="p-6 flex-1 bg-indigo-50/20">
                <p className="text-[10px] font-bold text-indigo-600 mb-4">Features Exclusive to Platinum Plan</p>
                <ul className="space-y-3">
                  {PlatinumFeatures.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[11px] ${f.inc ? 'text-gray-800 font-medium bg-indigo-50/50 -mx-2 px-2 py-1 rounded' : 'text-gray-400'}`}>
                      {f.inc ? <Check size={14} className="text-indigo-600 shrink-0 mt-0.5" /> : <X size={14} className="text-red-500 shrink-0 mt-0.5" />}
                      <span>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white border border-gray-200 border-t-4 border-t-emerald-500 rounded-lg shadow-sm flex flex-col relative">
              {isPaid && activePlan?.plan === "Enterprise" && activePlan?.cycle === billingCycle && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm z-10 animate-pulse-subtle">
                  <CheckCircle size={10} /> Active Plan
                </div>
              )}
              <div className="p-6 border-b border-gray-100 flex flex-col space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Enterprise Plan</h3>
                  <p className="text-xs text-indigo-600 font-semibold mt-1">Fully customizable for bigger businesses</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-gray-500">Starting @ </span>
                    <span className="text-sm font-bold text-gray-400 line-through">₹750</span>
                    <span className="text-2xl font-bold text-gray-900">₹417</span>
                    <span className="text-[10px] text-gray-500 font-medium">/month</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-[10px] text-gray-400 line-through">₹8,999/year</p>
                    <p className="text-[10px] text-gray-500 font-medium">Billed Annually ₹4,999/year</p>
                    <span className="text-[9px] font-bold text-brand-tertiary bg-emerald-50 px-1 rounded border border-emerald-100">44% Off</span>
                  </div>
                </div>
                {isPaid && activePlan?.plan === "Enterprise" && activePlan?.cycle === billingCycle ? (
                  <button disabled className="w-full py-2 border border-emerald-500 bg-emerald-50 text-emerald-700 font-bold text-xs rounded cursor-not-allowed shadow-inner flex justify-center items-center gap-2">
                    <CheckCircle size={14} /> Active Plan
                  </button>
                ) : (
                  <button onClick={() => handleBuy("Enterprise")} className="w-full py-2 border border-emerald-500 text-brand-tertiary font-bold text-xs rounded hover:bg-emerald-50 transition-colors">
                    Talk To Sales
                  </button>
                )}
                <div className="space-y-2 text-[11px] font-medium text-gray-600 pt-2">
                   <p>Manage <span className="font-bold text-gray-800">2 Businesses</span> (Upgrade to add more)</p>
                   <p>Access for <span className="font-bold text-gray-800">3 Users</span> (Upgrade to add more) <span className="font-bold text-gray-800">+ 1 CA</span></p>
                   <p>Auto-sync data across unlimited devices</p>
                   <p>Access on <span className="font-bold text-gray-800">Android, iOS, Web & Desktop</span></p>
                </div>
              </div>
              <div className="p-6 flex-1 bg-emerald-50/10">
                <p className="text-[10px] font-bold text-brand-tertiary mb-4">Features Exclusive to Enterprise Plan</p>
                <ul className="space-y-3">
                  {EnterpriseFeatures.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[11px] ${f.inc ? 'text-gray-800 font-medium bg-emerald-50/30 -mx-2 px-2 py-1 rounded' : 'text-gray-400'}`}>
                      {f.inc ? <Check size={14} className="text-brand-tertiary shrink-0 mt-0.5" /> : <X size={14} className="text-red-500 shrink-0 mt-0.5" />}
                      <span>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
