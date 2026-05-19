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
  Image as ImageIcon,
  MessageSquare,
  Check,
  Smartphone,
  CheckCircle,
  X
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

import SettingsSidebar from "../SettingsSidebar";

type TabType = "thermal" | "barcode";
type ThermalWidthType = "2" | "3";
type BarcodeThemeType = "label" | "a4";

export default function PrintSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>("thermal");
  const [thermalWidth, setThermalWidth] = useState<ThermalWidthType>("2");
  const [barcodeTheme, setBarcodeTheme] = useState<BarcodeThemeType>("label");
  const [logoUploaded, setLogoUploaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.thermalWidth) setThermalWidth(data.thermalWidth);
            if (data.barcodeTheme) setBarcodeTheme(data.barcodeTheme);
            if (data.logoUploaded !== undefined) setLogoUploaded(data.logoUploaded);
          }
        } catch (err) {
          console.error("Error loading print settings:", err);
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
        thermalWidth,
        barcodeTheme,
        logoUploaded,
        updatedAt: new Date()
      }, { merge: true });

      setHasChanges(false);
      toast.success("Print configurations saved successfully! ✅");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400 gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs font-semibold">Configuring print settings...</span>
      </div>
    );
  }

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      
      {/* Reusable Settings Sidebar */}
      <SettingsSidebar />

      {/* Settings Content Area */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Print Settings</h2>
            <p className="text-[10px] text-gray-500 font-medium font-sans">Choose printer paper sizes and manage barcode tag generations</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md font-semibold">
              <MessageSquare size={13} /> Chat Support
            </button>
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

        {/* Top Tabs (Screenshot style) */}
        <div className="flex px-6 border-b border-gray-100 shrink-0 bg-gray-50/50">
           <button 
             onClick={() => setActiveTab("thermal")}
             className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "thermal" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-700"
             }`}
           >
             Thermal Printer
           </button>
           <button 
             onClick={() => setActiveTab("barcode")}
             className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "barcode" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-700"
             }`}
           >
             Barcode Printer
           </button>
        </div>

        {/* Main Split Layout */}
        <div className="flex-1 flex overflow-hidden bg-gray-50/20">
          
          {/* Left Panel: Options */}
          <div className="w-[340px] border-r border-gray-200 bg-white p-6 overflow-y-auto shrink-0 flex flex-col gap-6">
             
             {activeTab === "thermal" ? (
                <>
                   <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select your Invoice Theme</p>
                      <div className="space-y-2.5">
                         
                         {/* 2 Inch Theme Select */}
                         <button 
                           onClick={() => triggerChange(setThermalWidth, "2")}
                           className={`w-full border rounded-md py-3 px-4 text-xs font-bold text-left transition-all flex items-center justify-between shadow-2xs ${
                             thermalWidth === "2" ? "border-indigo-500 bg-indigo-50/10 text-indigo-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
                           }`}
                         >
                            <span>2 inch Theme size</span>
                            {thermalWidth === "2" && (
                              <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white font-bold" />
                              </span>
                            )}
                         </button>

                         {/* 3 Inch Theme Select */}
                         <button 
                           onClick={() => triggerChange(setThermalWidth, "3")}
                           className={`w-full border rounded-md py-3 px-4 text-xs font-bold text-left transition-all flex items-center justify-between shadow-2xs ${
                             thermalWidth === "3" ? "border-indigo-500 bg-indigo-50/10 text-indigo-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
                           }`}
                         >
                            <span>3 inch Theme size</span>
                            {thermalWidth === "3" && (
                              <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white font-bold" />
                              </span>
                            )}
                         </button>

                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business Logo</p>
                      
                      {logoUploaded ? (
                        <div className="border border-green-200 rounded-lg p-5 flex flex-col items-center justify-center bg-green-50/30 text-center relative h-36">
                          <CheckCircle className="text-green-500 mb-2" size={24} />
                          <p className="text-xs font-bold text-green-800">Monochrome logo ready</p>
                          <button 
                            onClick={() => triggerChange(setLogoUploaded, false)}
                            className="text-[9px] text-red-500 font-bold hover:underline mt-2 uppercase tracking-wider"
                          >
                            Remove Logo
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer h-36"
                             onClick={() => triggerChange(setLogoUploaded, true)}>
                           <div className="w-10 h-10 bg-gray-150 rounded flex items-center justify-center text-gray-400 mb-2">
                              <ImageIcon size={18} />
                           </div>
                           <span className="text-xs font-bold text-indigo-600 hover:underline">
                              Upload Monochrome Logo
                           </span>
                        </div>
                      )}
                      
                      <p className="text-[9px] text-gray-400 leading-normal">
                         You can only upload your logo in monochrome. *.bmp extension and 1:1 ratio (max width) x (max height) dimensions. To learn how to resize and resave your logo in monochrome <a href="#" className="text-indigo-600 hover:underline font-semibold">click here</a>.
                      </p>
                   </div>
                </>
             ) : (
                <>
                   <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Select Barcode Format</p>
                      <div className="space-y-2.5">
                         
                         {/* Label Print */}
                         <button 
                           onClick={() => triggerChange(setBarcodeTheme, "label")}
                           className={`w-full border rounded-md py-3 px-4 text-xs font-bold text-left transition-all flex items-center justify-between shadow-2xs ${
                             barcodeTheme === "label" ? "border-indigo-500 bg-indigo-50/10 text-indigo-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
                           }`}
                         >
                            <span>Label Print (Standard roll)</span>
                            {barcodeTheme === "label" && (
                              <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white font-bold" />
                              </span>
                            )}
                         </button>

                         {/* A4 Print */}
                         <button 
                           onClick={() => triggerChange(setBarcodeTheme, "a4")}
                           className={`w-full border rounded-md py-3 px-4 text-xs font-bold text-left transition-all flex items-center justify-between shadow-2xs ${
                             barcodeTheme === "a4" ? "border-indigo-500 bg-indigo-50/10 text-indigo-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
                           }`}
                         >
                            <span>A4 Print Sheet</span>
                            {barcodeTheme === "a4" && (
                              <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white font-bold" />
                              </span>
                            )}
                         </button>

                      </div>
                   </div>
                </>
             )}

          </div>

          {/* Right Panel: Preview Area */}
          <div className="flex-1 p-6 flex flex-col overflow-y-auto">
             
             {activeTab === "thermal" ? (
                <div className="flex flex-col items-center w-full">
                   
                   {/* Yellow warning alert box */}
                   <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[10px] px-4 py-2.5 rounded-lg mb-6 flex items-start gap-2 max-w-2xl w-full leading-normal">
                      <p>This is a preview of the Thermal print of your Invoice. Some columns might not appear if they don't have the required information. <a href="#" className="text-indigo-600 font-bold hover:underline">Click here to learn more</a></p>
                   </div>

                   {/* Receipt slip container sizing dynamically */}
                   <div 
                     style={{ width: thermalWidth === "2" ? "240px" : "320px" }}
                     className="bg-white border border-gray-200 shadow-lg p-4 font-mono text-[9px] text-gray-700 space-y-3 transition-all duration-300 rounded mb-10"
                   >
                     
                     <div className="text-center space-y-0.5">
                       <p className="font-bold text-xs uppercase tracking-wider text-black">TAX INVOICE</p>
                       <p className="font-bold text-[10px]">self</p>
                       <p className="text-gray-500">Phone No: 98XXXXXXXX</p>
                     </div>

                     <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5">
                       <p className="flex justify-between"><span>Invoice Number:</span><span className="font-bold">RT/24/272</span></p>
                       <p className="flex justify-between"><span>Invoice Date:</span><span>17/01/2026</span></p>
                       <p className="flex justify-between"><span>Bill To:</span><span className="font-bold">Cash Sale</span></p>
                     </div>

                     {/* Dense items table inside receipt preview */}
                     <div className="border-t border-dashed border-gray-300 pt-2">
                       <div className="grid grid-cols-5 text-[8px] font-bold text-black border-b border-dashed border-gray-200 pb-1 mb-1">
                         <span className="col-span-2">ITEM</span>
                         <span className="text-right">QTY</span>
                         <span className="text-right">MRP</span>
                         <span className="text-right">AMT</span>
                       </div>
                       
                       <div className="space-y-1.5">
                         <div className="grid grid-cols-5 leading-normal">
                           <span className="col-span-2 font-bold text-black">1. Cleanic 100% bleach</span>
                           <span className="text-right">1.0 PCS</span>
                           <span className="text-right">199.05</span>
                           <span className="text-right font-bold">169.64</span>
                         </div>
                         <div className="grid grid-cols-5 text-[7px] text-gray-400 pl-2">
                           <span className="col-span-2">Item Code: bleach</span>
                           <span className="text-right">Disc 5%</span>
                           <span className="text-right col-span-2">Tax 18.00%</span>
                         </div>

                         <div className="grid grid-cols-5 leading-normal">
                           <span className="col-span-2 font-bold text-black">2. AP Honey 500g</span>
                           <span className="text-right">2.0 PCS</span>
                           <span className="text-right">250.00</span>
                           <span className="text-right font-bold">423.72</span>
                         </div>
                         <div className="grid grid-cols-5 text-[7px] text-gray-400 pl-2">
                           <span className="col-span-2">Item Code: APH02</span>
                           <span className="text-right">-</span>
                           <span className="text-right col-span-2">Tax 18.00%</span>
                         </div>

                         <div className="grid grid-cols-5 leading-normal">
                           <span className="col-span-2 font-bold text-black">3. Colgate Toothbrush</span>
                           <span className="text-right">1.0 PCS</span>
                           <span className="text-right">730.55</span>
                           <span className="text-right font-bold">610.16</span>
                         </div>
                         <div className="grid grid-cols-5 text-[7px] text-gray-400 pl-2">
                           <span className="col-span-2">Item Code: RTT88</span>
                           <span className="text-right">Disc 5%</span>
                           <span className="text-right col-span-2">Tax 18.00%</span>
                         </div>
                       </div>
                     </div>

                     {/* Subtotals & Taxes breakdown inside receipt */}
                     <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-gray-500 font-semibold">
                       <p className="flex justify-between"><span>Sub Total:</span><span className="text-black font-bold">₹ 1,419.60</span></p>
                       <p className="flex justify-between"><span>Taxable Amount:</span><span>₹ 1,203.05</span></p>
                       <p className="flex justify-between"><span>SGST 9%:</span><span>₹ 108.27</span></p>
                       <p className="flex justify-between"><span>CGST 9%:</span><span>₹ 108.27</span></p>
                       <p className="flex justify-between text-xs text-black font-bold border-t border-dashed border-gray-200 pt-1 mt-1">
                         <span>Total Amount:</span>
                         <span className="text-indigo-600 font-bold">₹ 1,636.15</span>
                       </p>
                       <p className="flex justify-between"><span>Paid Amount:</span><span>₹ 1,220.60</span></p>
                       <p className="flex justify-between text-red-500 font-bold"><span>Balance Amount:</span><span>₹ 415.55</span></p>
                     </div>

                     {/* Notes footer */}
                     <div className="border-t border-dashed border-gray-300 pt-2 text-[8px] text-gray-400 space-y-1">
                       <div>
                         <p className="font-bold text-gray-500">Notes:</p>
                         <p>We offer doorstep delivery for large orders. Enquire at cash counter or call us for details.</p>
                       </div>
                       <div>
                         <p className="font-bold text-gray-500">Terms and Conditions:</p>
                         <p>1. Goods once sold will not be taken back or exchanged.</p>
                         <p>2. All disputes are subject to PUNE jurisdiction only.</p>
                       </div>
                     </div>

                     <div className="text-center pt-2 border-t border-dashed border-gray-200 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                       Thank you for your purchase
                     </div>

                   </div>

                </div>
             ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-xl shadow-xs max-w-2xl mx-auto w-full min-h-[420px]">
                   
                   {/* Clean layout illustration showing barcode print roll */}
                   <div className="w-56 h-40 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center relative shadow-xs p-4 mb-6">
                     <div className="w-20 h-16 bg-[#141725] rounded-t-lg shadow-md flex items-center justify-center text-white text-[8px] uppercase tracking-wider font-bold">
                       Label Printer
                     </div>
                     <div className="w-24 h-12 bg-white border border-gray-300 rounded-b shadow-xs relative flex flex-col items-center justify-center">
                       {/* Label paper rolling out */}
                       <div className="w-16 h-8 border border-dashed border-gray-200 rounded p-1 flex flex-col items-center justify-center space-y-1">
                         <div className="w-12 h-1 bg-gray-600 rounded"></div>
                         <div className="w-8 h-1 bg-gray-400 rounded"></div>
                       </div>
                     </div>
                     <span className="absolute bottom-2 text-[8px] text-indigo-500 font-bold uppercase tracking-wider">Active Standard roll</span>
                   </div>

                   <div className="space-y-4 max-w-md text-center text-xs">
                     <p className="font-bold text-gray-800 text-sm">How Does it Work?</p>
                     
                     <p className="text-gray-500 leading-relaxed">
                       Barcode printing through Label printer works with a roll with barcode dimensions of 
                       <span className="font-bold text-gray-800"> 50 x 25 mm (2&quot; x 1&quot;)</span>, having 2 barcodes per row. 
                       Visit matching product link to see a paper of matching dimensions on Amazon.in.
                     </p>

                     <div className="pt-2">
                       <button className="w-full bg-gray-100 hover:bg-gray-150 text-gray-600 py-2.5 rounded-lg text-xs font-bold transition-all">
                         Don&apos;t know which printer you have? Contact Support
                       </button>
                     </div>
                   </div>

                </div>
             )}

          </div>

        </div>

      </div>

    </div>
  );
}
