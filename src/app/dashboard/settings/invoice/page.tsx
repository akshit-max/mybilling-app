"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  FileText, 
  Printer, 
  Users, 
  Bell, 
  Share2, 
  Tag, 
  Gift, 
  HelpCircle, 
  LogOut,
  ChevronDown,
  Check
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

import SettingsSidebar from "../SettingsSidebar";

type ThemeType = "luxury" | "stylish" | "tally";

export default function InvoiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Styling configurations
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>("luxury");
  const [accentColor, setAccentColor] = useState("#D4AF37");

  // Checklist preferences states
  const [showPartyBalance, setShowPartyBalance] = useState(false);
  const [freeItemQty, setFreeItemQty] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [alternateUnit, setAlternateUnit] = useState(false);
  const [showPhone, setShowPhone] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [printHistory, setPrintHistory] = useState(false);
  const [autoApplyLuxury, setAutoApplyLuxury] = useState(true);

  // Accordions states
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.invoiceTheme) setSelectedTheme(data.invoiceTheme);
            if (data.invoiceThemeColor) setAccentColor(data.invoiceThemeColor);
            
            const s = data.invoiceThemeSettings || {};
            if (s.showPartyBalance !== undefined) setShowPartyBalance(s.showPartyBalance);
            if (s.freeItemQty !== undefined) setFreeItemQty(s.freeItemQty);
            if (s.showDescription !== undefined) setShowDescription(s.showDescription);
            if (s.alternateUnit !== undefined) setAlternateUnit(s.alternateUnit);
            if (s.showPhone !== undefined) setShowPhone(s.showPhone);
            if (s.showTime !== undefined) setShowTime(s.showTime);
            if (s.printHistory !== undefined) setPrintHistory(s.printHistory);
            if (s.autoApplyLuxury !== undefined) setAutoApplyLuxury(s.autoApplyLuxury);
          }
        } catch (err) {
          console.error("Error loading invoice settings:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const triggerChange = (setter: any, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      setSaving(true);
      await setDoc(doc(db, "settings", user.uid), {
        invoiceTheme: selectedTheme,
        invoiceThemeColor: accentColor,
        invoiceThemeSettings: {
          showPartyBalance,
          freeItemQty,
          showDescription,
          alternateUnit,
          showPhone,
          showTime,
          printHistory,
          autoApplyLuxury
        },
        updatedAt: new Date()
      }, { merge: true });

      setHasChanges(false);
      toast.success("Invoice settings successfully saved! ✅");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const colorPresets = [
    "#2E7D32", // Green
    "#0277BD", // Light Blue
    "#01579B", // Dark Blue
    "#6A1B9A", // Purple
    "#C62828", // Red
    "#EF6C00", // Orange
    "#D4AF37", // Gold
    "#D84315", // Deep Orange
    "#000000", // Black
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400 gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold">Configuring invoice settings...</span>
      </div>
    );
  }

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      
      {/* Reusable Settings Sidebar */}
      <SettingsSidebar />

      {/* Settings Content Area */}
      <div className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden">
        
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-xs z-10">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Invoice Settings</h2>
            <p className="text-[10px] text-gray-500 font-medium font-sans">Configure your A4 invoicing layout and brand colors</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`text-xs px-5 py-1.5 rounded font-bold transition-all shadow-xs ${
                hasChanges 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              }`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Side: Live Preview Panel */}
          <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start bg-gray-100/40">
            
            {/* A4 Invoice Preview Container (Scaled for viewing) */}
            <div 
              style={{ borderColor: accentColor }}
              className={`bg-white w-[595px] min-h-[842px] shadow-lg relative p-8 flex flex-col text-gray-800 font-sans transform scale-90 origin-top border-t-[12px]`}
            >
              
               {/* Decorative corner frames ONLY for luxury theme */}
               {selectedTheme === "luxury" && (
                 <>
                   <div style={{ borderColor: accentColor }} className="absolute top-0 left-0 w-6 h-6 border-b border-r"></div>
                   <div style={{ borderColor: accentColor }} className="absolute top-0 right-0 w-6 h-6 border-b border-l"></div>
                   <div style={{ borderColor: accentColor }} className="absolute bottom-0 left-0 w-6 h-6 border-t border-r"></div>
                   <div style={{ borderColor: accentColor }} className="absolute bottom-0 right-0 w-6 h-6 border-t border-l"></div>
                 </>
               )}

               {/* A4 Preview Header */}
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h1 style={{ color: accentColor }} className="text-2xl font-bold uppercase tracking-wider">self</h1>
                     {showPhone && <p className="text-[10px] text-gray-500 mt-1">Mobile: 7505371139</p>}
                     {showTime && <p className="text-[9px] text-gray-400">Generated: {new Date().toLocaleTimeString()}</p>}
                  </div>
                  <div className="text-right">
                     <h2 style={{ color: accentColor }} className="text-lg font-bold tracking-widest uppercase">TAX INVOICE</h2>
                     <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">ORIGINAL FOR RECIPIENT</span>
                  </div>
               </div>

               {/* Meta Details Panel */}
               <div className="grid grid-cols-3 gap-4 border-y border-gray-100 py-3 mb-6 text-[10px] font-semibold text-gray-600">
                  <div>
                     <p className="text-gray-400 uppercase text-[8px] tracking-wider mb-0.5">Invoice No.</p>
                     <p className="font-mono text-gray-800">AABBCCD/202</p>
                  </div>
                  <div>
                     <p className="text-gray-400 uppercase text-[8px] tracking-wider mb-0.5">Invoice Date</p>
                     <p className="text-gray-800">17/01/2026</p>
                  </div>
                  <div>
                     <p className="text-gray-400 uppercase text-[8px] tracking-wider mb-0.5">Due Date</p>
                     <p className="text-gray-800">16/02/2026</p>
                  </div>
               </div>

               {/* Bill To & Ship To Panels */}
               <div className="mb-6 grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                     <p className="text-gray-400 uppercase text-[8px] tracking-wider font-bold mb-1">BILL TO</p>
                     <p className="font-bold text-gray-800">Sample Party</p>
                     <p className="text-gray-500 leading-normal">No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001</p>
                     {showPhone && <p className="text-gray-400 font-mono mt-1">Mobile: 7400417400</p>}
                     <p className="text-gray-400 font-mono">GSTIN: 07ABOCH2702H2ZZ</p>
                  </div>
                  <div className="text-right">
                     <p className="text-gray-400 uppercase text-[8px] tracking-wider font-bold mb-1">SHIPPING ADDRESS</p>
                     <p className="text-gray-500 leading-normal">1234123,124324214, Bengaluru</p>
                  </div>
               </div>

               {/* Interactive Items Table */}
               <div className="flex-1">
                  <table className="w-full text-[9px] border-collapse">
                     <thead>
                        <tr 
                          style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
                          className="border-y border-gray-150 uppercase tracking-wider text-[8px] font-bold"
                        >
                           <th className="py-2 px-1.5 text-left w-10">NO</th>
                           <th className="py-2 px-1.5 text-left">ITEMS</th>
                           <th className="py-2 px-1.5 text-left">HSN</th>
                           <th className="py-2 px-1.5 text-right">QTY</th>
                           <th className="py-2 px-1.5 text-right">RATE</th>
                           <th className="py-2 px-1.5 text-right">DISC</th>
                           <th className="py-2 px-1.5 text-right">TAX</th>
                           <th className="py-2 px-1.5 text-right">AMOUNT</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 text-gray-600 font-medium">
                        <tr>
                           <td className="py-2.5 px-1.5 font-mono">1</td>
                           <td className="py-2.5 px-1.5">
                             <p className="font-bold text-gray-800">SAMSUNG A30</p>
                             {showDescription && <p className="text-[8px] text-gray-400">samsung phone</p>}
                           </td>
                           <td className="py-2.5 px-1.5 font-mono">1234</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">1 PCS {freeItemQty && <span className="text-green-500 text-[8px] font-bold block">(+0 Free)</span>}</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">10,000</td>
                           <td className="py-2.5 px-1.5 text-right font-mono text-gray-400">1,000<br/>(10%)</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">1,620<br/>(18%)</td>
                           <td className="py-2.5 px-1.5 text-right font-bold font-mono text-gray-800">10,620</td>
                        </tr>
                        <tr>
                           <td className="py-2.5 px-1.5 font-mono">2</td>
                           <td className="py-2.5 px-1.5">
                             <p className="font-bold text-gray-800">PARLE-G 200G</p>
                             {showDescription && <p className="text-[8px] text-gray-400">parle biscuit</p>}
                           </td>
                           <td className="py-2.5 px-1.5 font-mono">40511200</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">1 BOX {freeItemQty && <span className="text-green-500 text-[8px] font-bold block">(+1 Free)</span>}</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">342.86</td>
                           <td className="py-2.5 px-1.5 text-right font-mono text-gray-400">51.43<br/>(15%)</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">14.57<br/>(5%)</td>
                           <td className="py-2.5 px-1.5 text-right font-bold font-mono text-gray-800">306</td>
                        </tr>
                        <tr>
                           <td className="py-2.5 px-1.5 font-mono">3</td>
                           <td className="py-2.5 px-1.5">
                             <p className="font-bold text-gray-800">PUMA BLUE ROUND NECK T-SHIRT</p>
                             {showDescription && <p className="text-[8px] text-gray-400">sports t-shirt</p>}
                           </td>
                           <td className="py-2.5 px-1.5 font-mono">2032</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">2 PCS</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">900</td>
                           <td className="py-2.5 px-1.5 text-right font-mono text-gray-400">0<br/>(0%)</td>
                           <td className="py-2.5 px-1.5 text-right font-mono">90<br/>(5%)</td>
                           <td className="py-2.5 px-1.5 text-right font-bold font-mono text-gray-800">1,890</td>
                        </tr>
                     </tbody>
                  </table>
               </div>

               {/* Totals & Terms Split Box */}
               <div className="flex justify-between items-start mt-6 text-[9px] border-t border-gray-150 pt-4">
                  <div className="w-1/2 space-y-2">
                     <div>
                        <p className="font-bold text-gray-700">NOTES</p>
                        <p className="text-gray-500">Sample Note</p>
                     </div>
                     <div>
                        <p className="font-bold text-gray-700">TERMS AND CONDITIONS</p>
                        <p className="text-gray-400 leading-normal">
                          1. Goods once sold will not be taken back or exchanged.<br/>
                          2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only.
                        </p>
                     </div>
                  </div>

                  <div className="w-64 space-y-1.5 border-t border-dashed border-gray-200 pt-2 font-mono">
                     <div className="flex justify-between text-gray-500">
                        <span>Taxable Amount</span>
                        <span>₹ 11,091.43</span>
                     </div>
                     <div className="flex justify-between text-gray-400 text-[8px]">
                        <span>CGST @ 2.5%</span>
                        <span>₹ 52.29</span>
                     </div>
                     <div className="flex justify-between text-gray-400 text-[8px]">
                        <span>SGST @ 2.5%</span>
                        <span>₹ 52.29</span>
                     </div>
                     <div className="flex justify-between text-gray-400 text-[8px]">
                        <span>CGST @ 9%</span>
                        <span>₹ 810</span>
                     </div>
                     <div className="flex justify-between text-gray-400 text-[8px]">
                        <span>SGST @ 9%</span>
                        <span>₹ 810</span>
                     </div>
                     
                     {showPartyBalance && (
                       <div className="flex justify-between text-red-500 font-bold border-t border-gray-100 pt-1">
                         <span>Previous Balance</span>
                         <span>₹ 4,500.00</span>
                       </div>
                     )}

                     <div 
                       style={{ borderColor: accentColor }}
                       className="flex justify-between font-bold text-[11px] border-y py-2 text-indigo-700 mt-2"
                     >
                        <span>Total Amount</span>
                        <span>₹ 12,816.00</span>
                     </div>

                     <div className="flex justify-between text-gray-400">
                        <span>Received Amount</span>
                        <span>₹ 0.00</span>
                     </div>
                  </div>
               </div>

               {/* In Words Bottom Summary */}
               <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[9px] text-gray-500">
                  <div>
                    <span className="font-bold text-gray-700">Total Amount (in words):</span>
                    <p className="italic text-gray-400 font-sans mt-0.5">Twelve Thousand Eight Hundred Sixteen Rupees and Fifty Paise</p>
                  </div>
                  <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded font-bold uppercase shrink-0">FloBiz</span>
               </div>

            </div>

          </div>

          {/* Right Side: Options Checklist Panels */}
          <div className="w-[420px] bg-white border-l border-gray-200 overflow-y-auto flex flex-col shadow-xs shrink-0 font-sans p-6 space-y-6">
             
             {/* Themes Section */}
             <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                  <span>Themes</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none shrink-0">
                   
                   {/* Luxury Theme */}
                   <div 
                     onClick={() => triggerChange(setSelectedTheme, "luxury")}
                     className="w-24 shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
                   >
                      <div className={`w-full h-24 bg-gray-50 rounded border-2 transition-all flex items-center justify-center relative overflow-hidden ${
                        selectedTheme === "luxury" ? "border-indigo-600 ring-1 ring-indigo-500" : "border-gray-200 opacity-60 hover:opacity-100"
                      }`}>
                         {selectedTheme === "luxury" && (
                           <div className="absolute top-0 left-0 bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-br-full z-10">
                             <Check size={10} className="text-white font-bold" />
                           </div>
                         )}
                         <div className="w-14 h-16 border-[3px] border-[#D4AF37] bg-white rounded shadow-2xs"></div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedTheme === "luxury" ? "text-indigo-600" : "text-gray-500"}`}>Luxury</span>
                   </div>

                   {/* Stylish Theme */}
                   <div 
                     onClick={() => triggerChange(setSelectedTheme, "stylish")}
                     className="w-24 shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
                   >
                      <div className={`w-full h-24 bg-gray-50 rounded border-2 transition-all flex items-center justify-center relative overflow-hidden ${
                        selectedTheme === "stylish" ? "border-indigo-600 ring-1 ring-indigo-500" : "border-gray-200 opacity-60 hover:opacity-100"
                      }`}>
                         {selectedTheme === "stylish" && (
                           <div className="absolute top-0 left-0 bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-br-full z-10">
                             <Check size={10} className="text-white font-bold" />
                           </div>
                         )}
                         <div className="w-14 h-16 border-t-[8px] border-indigo-600 bg-white rounded shadow-2xs"></div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedTheme === "stylish" ? "text-indigo-600" : "text-gray-500"}`}>Stylish</span>
                   </div>

                   {/* Advanced GST Tally Theme */}
                   <div 
                     onClick={() => triggerChange(setSelectedTheme, "tally")}
                     className="w-24 shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
                   >
                      <div className={`w-full h-24 bg-gray-50 rounded border-2 transition-all flex items-center justify-center relative overflow-hidden ${
                        selectedTheme === "tally" ? "border-indigo-600 ring-1 ring-indigo-500" : "border-gray-200 opacity-60 hover:opacity-100"
                      }`}>
                         {selectedTheme === "tally" && (
                           <div className="absolute top-0 left-0 bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-br-full z-10">
                             <Check size={10} className="text-white font-bold" />
                           </div>
                         )}
                         <div className="w-14 h-16 border border-gray-300 bg-white rounded shadow-2xs flex flex-col justify-between p-1">
                           <div className="h-2 bg-gray-200 w-full"></div>
                           <div className="h-4 bg-gray-100 w-full"></div>
                         </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedTheme === "tally" ? "text-indigo-600" : "text-gray-500"}`}>Tally</span>
                   </div>

                </div>
             </div>

             {/* Theme Styling Pills */}
             <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Theme Styling 
                  <span className="bg-blue-100 text-blue-600 text-[8px] px-1 rounded uppercase font-bold ml-1">New</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Uttar Pradesh", "Maharashtra", "Electronics", "Gujarat"].map((pill) => (
                    <button 
                      key={pill} 
                      onClick={() => triggerChange(setAccentColor, pill === "Electronics" ? "#0277BD" : "#D4AF37")}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-[10px] rounded-full transition-colors"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
             </div>

             {/* Select accent color */}
             <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Theme Color</p>
                <div className="grid grid-cols-9 gap-2 bg-gray-50 border border-gray-150 p-2 rounded-lg">
                   {colorPresets.map((color) => {
                     const isSelected = accentColor === color;
                     return (
                       <button
                         key={color}
                         onClick={() => triggerChange(setAccentColor, color)}
                         style={{ backgroundColor: color }}
                         className={`w-6 h-6 rounded flex items-center justify-center text-white cursor-pointer transition-transform duration-100 hover:scale-110 ${
                           isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                         }`}
                       >
                         {isSelected && <Check size={12} className="text-white font-bold" />}
                       </button>
                     );
                   })}
                </div>
             </div>

             {/* Theme Settings checkboxes */}
             <div className="space-y-4 pt-4 border-t border-gray-150">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Theme Configuration settings</span>
                  <span className="bg-blue-100 text-blue-600 text-[8px] px-1 rounded uppercase font-bold">New</span>
                </div>

                <div className="space-y-3 text-xs text-gray-600 font-semibold">
                   
                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showPartyBalance}
                        onChange={(e) => triggerChange(setShowPartyBalance, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Show party balance in invoice</span>
                   </label>

                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={freeItemQty}
                        onChange={(e) => triggerChange(setFreeItemQty, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Enable free item quantity</span>
                   </label>

                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showDescription}
                        onChange={(e) => triggerChange(setShowDescription, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Show item description in invoice</span>
                   </label>

                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={alternateUnit}
                        onChange={(e) => triggerChange(setAlternateUnit, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Show Alternate Unit in Invoice</span>
                   </label>

                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showPhone}
                        onChange={(e) => triggerChange(setShowPhone, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Show phone number on invoice</span>
                   </label>

                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showTime}
                        onChange={(e) => triggerChange(setShowTime, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Show time on invoices</span>
                   </label>

                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={printHistory}
                        onChange={(e) => triggerChange(setPrintHistory, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Print History</span>
                   </label>

                   <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoApplyLuxury}
                        onChange={(e) => triggerChange(setAutoApplyLuxury, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <span>Auto-apply luxury theme for sharing</span>
                   </label>

                </div>
             </div>

             {/* Accordions bottom section */}
             <div className="pt-4 border-t border-gray-150 divide-y divide-gray-100 text-xs">
                {["Invoice Details", "Party Details", "Item Table Columns", "Miscellaneous Details"].map((title) => {
                  const isOpen = activeAccordion === title;
                  return (
                    <div key={title} className="py-1">
                      <button 
                        onClick={() => setActiveAccordion(isOpen ? null : title)}
                        className="w-full flex items-center justify-between py-2 text-left text-gray-700 font-bold hover:bg-gray-50 px-2 rounded transition-all"
                      >
                        <span className="flex items-center gap-1">
                          {title}
                          {title === "Miscellaneous Details" && <span className="bg-blue-100 text-blue-600 text-[8px] px-1 rounded uppercase font-bold">New</span>}
                        </span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      
                      {isOpen && (
                        <div className="p-3 bg-gray-50/50 rounded border border-gray-100 space-y-2 mt-1 text-[11px] text-gray-500 leading-normal">
                          <p>Customize the columns, fields, and descriptions for {title.toLowerCase()} directly in this section.</p>
                          <label className="flex items-center gap-2 mt-1 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <span>Enable standard layout headers</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>

          </div>

        </div>

      </div>

    </div>
  );
}
