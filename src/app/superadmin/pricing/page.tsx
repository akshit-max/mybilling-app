"use client";

import React, { useState, useEffect } from "react";
import { DollarSign, CheckSquare, Crown } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import { DEFAULT_PRICING, PricingConfig } from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────
type RawPricing = {
  Diamond:    { Monthly: string; Yearly: string; enabled: boolean };
  Platinum:   { Monthly: string; Yearly: string; enabled: boolean };
  Enterprise: { Monthly: string; Yearly: string; enabled: boolean };
};

function toRaw(config: PricingConfig): RawPricing {
  return {
    Diamond:    { Monthly: String(config.Diamond.Monthly),    Yearly: String(config.Diamond.Yearly),    enabled: config.Diamond.enabled },
    Platinum:   { Monthly: String(config.Platinum.Monthly),   Yearly: String(config.Platinum.Yearly),   enabled: config.Platinum.enabled },
    Enterprise: { Monthly: String(config.Enterprise.Monthly), Yearly: String(config.Enterprise.Yearly), enabled: config.Enterprise.enabled },
  };
}

function fromRaw(raw: RawPricing): PricingConfig | null {
  const plans = ["Diamond", "Platinum", "Enterprise"] as const;
  const result: any = {};
  for (const plan of plans) {
    const monthly = Number(raw[plan].Monthly);
    const yearly  = Number(raw[plan].Yearly);
    if (!Number.isFinite(monthly) || monthly <= 0) {
      toast.error(`${plan} Monthly price must be a positive number.`);
      return null;
    }
    if (!Number.isFinite(yearly) || yearly <= 0) {
      toast.error(`${plan} Yearly price must be a positive number.`);
      return null;
    }
    result[plan] = { Monthly: monthly, Yearly: yearly, enabled: raw[plan].enabled };
  }
  return result as PricingConfig;
}

// ─── PlanCard defined OUTSIDE the parent — stable reference, no cursor jump ──
type PlanCardProps = {
  plan:       keyof RawPricing;
  label:      string;
  color:      string;
  elevated?:  boolean;
  showCrown?: boolean;
  raw:        RawPricing;
  onChange:   (plan: keyof RawPricing, field: "Monthly" | "Yearly", value: string) => void;
  onToggle:   (plan: keyof RawPricing, enabled: boolean) => void;
};

function PlanCard({ plan, label, color, elevated, showCrown, raw, onChange, onToggle }: PlanCardProps) {
  const yearlyNum = Number(raw[plan].Yearly);
  const yearlyEquiv = Number.isFinite(yearlyNum) && yearlyNum > 0
    ? `₹${Math.round(yearlyNum / 12)}/mo equiv`
    : null;

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 ${elevated ? "shadow-sm border-t-2 border-t-indigo-600 relative transform md:-translate-y-2" : ""}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-black ${color} flex items-center gap-1.5`}>
          {showCrown && <Crown size={14} />} {label}
        </h4>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={raw[plan].enabled}
            onChange={(e) => onToggle(plan, e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Enabled
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Monthly (₹)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={raw[plan].Monthly}
            onChange={(e) => onChange(plan, "Monthly", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 249"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Yearly (₹)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={raw[plan].Yearly}
            onChange={(e) => onChange(plan, "Yearly", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 2599"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {yearlyEquiv && (
        <p className="text-[10px] text-slate-400">{yearlyEquiv}</p>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SuperAdminPricingPage() {
  const [loading, setLoading]           = useState(true);
  const [raw, setRaw]                   = useState<RawPricing>(toRaw(DEFAULT_PRICING));
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "platformSettings", "subscriptionPricing"));
      if (snap.exists()) setRaw(toRaw(snap.data() as PricingConfig));
    } catch (err) {
      console.error("Error fetching pricing data:", err);
      toast.error("Failed to load pricing data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (plan: keyof RawPricing, field: "Monthly" | "Yearly", value: string) => {
    setRaw(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: value } }));
  };

  const handleToggle = (plan: keyof RawPricing, enabled: boolean) => {
    setRaw(prev => ({ ...prev, [plan]: { ...prev[plan], enabled } }));
  };

  const handleSavePricing = async () => {
    const parsed = fromRaw(raw);
    if (!parsed) return;
    setSavingPricing(true);
    try {
      await setDoc(doc(db, "platformSettings", "subscriptionPricing"), parsed, { merge: true });
      toast.success("Pricing updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update pricing");
    } finally {
      setSavingPricing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 font-sans h-screen p-8 text-center">
        <Loader size={48} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-y-auto font-sans h-full text-slate-800">
      <main className="w-full mx-auto p-6 md:p-8 space-y-8">

        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Pricing</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Manage Global Plans</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <DollarSign size={16} className="text-indigo-600" /> Platform Pricing Configuration
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Edit prices below and click Save. Changes take effect immediately for new checkouts.</p>
            </div>
            <button
              onClick={handleSavePricing}
              disabled={savingPricing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {savingPricing ? <Loader size={14} /> : <CheckSquare size={14} />}
              {savingPricing ? "Saving..." : "Save Pricing"}
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <PlanCard plan="Diamond"    label="Diamond"    color="text-[#F16D31]"   raw={raw} onChange={handleChange} onToggle={handleToggle} />
            <PlanCard plan="Platinum"   label="Platinum"   color="text-indigo-600"  raw={raw} onChange={handleChange} onToggle={handleToggle} elevated showCrown />
            <PlanCard plan="Enterprise" label="Enterprise" color="text-emerald-600" raw={raw} onChange={handleChange} onToggle={handleToggle} />
          </div>
        </div>

      </main>
    </div>
  );
}
