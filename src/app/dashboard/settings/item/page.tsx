"use client";

import { useChat } from "@/context/ChatContext";
import React, { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

import SettingsSidebar from "../SettingsSidebar";

export default function ItemSettingsPage() {
  const { openChat } = useChat();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Item Settings Fields
  const [stockValueCalculation, setStockValueCalculation] = useState("Purchase Price");
  const [enableItemBatching, setEnableItemBatching] = useState(false);
  const [enableSerialNumber, setEnableSerialNumber] = useState(false);
  const [enableMRP, setEnableMRP] = useState(false);
  const [enableWholesalePrice, setEnableWholesalePrice] = useState(false);
  const [enablePartyWisePrice, setEnablePartyWisePrice] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.itemSettings) {
              setStockValueCalculation(data.itemSettings.stockValueCalculation || "Purchase Price");
              setEnableItemBatching(!!data.itemSettings.enableItemBatching);
              setEnableSerialNumber(!!data.itemSettings.enableSerialNumber);
              setEnableMRP(!!data.itemSettings.enableMRP);
              setEnableWholesalePrice(!!data.itemSettings.enableWholesalePrice);
              setEnablePartyWisePrice(!!data.itemSettings.enablePartyWisePrice);
            }
          }
        } catch (err) {
          console.error("Error loading item settings:", err);
          toast.error("Failed to load item settings");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (setter: any, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    try {
      setSaving(true);
      await setDoc(doc(db, "settings", user.uid), {
        itemSettings: {
          stockValueCalculation,
          enableItemBatching,
          enableSerialNumber,
          enableMRP,
          enableWholesalePrice,
          enablePartyWisePrice,
        },
        updatedAt: new Date()
      }, { merge: true });

      setHasChanges(false);
      toast.success("Item settings saved successfully! ✅");
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
        <span className="text-xs font-semibold">Configuring item settings...</span>
      </div>
    );
  }

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      
      {/* Shared Sidebar */}
      <SettingsSidebar />

      {/* Settings Content Area */}
      <div className="flex-1 flex flex-col bg-gray-50/50">
        
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Item Settings</h2>
            <p className="text-[10px] text-gray-500 font-medium">Configure advanced item tracking and pricing rules</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openChat} className="flex items-center gap-1.5 text-xs text-brand-primary hover:bg-blue-50 px-3 py-1.5 rounded-md font-semibold transition-colors">
              <MessageSquare size={13} /> 
              <span>Chat Support</span>
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

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Item Rules Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs max-w-4xl">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-5">General Rules</h3>
            
            <div className="space-y-6">
              
              {/* Stock Value Calc Radio */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-2">Stock Value Calculation</label>
                <div className="flex items-center gap-6 mt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-600">
                    <input 
                      type="radio" 
                      name="stockCalc" 
                      value="Sales Price"
                      checked={stockValueCalculation === "Sales Price"}
                      onChange={() => handleChange(setStockValueCalculation, "Sales Price")}
                      className="accent-indigo-600 w-4 h-4" 
                    /> Sales Price
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-600">
                    <input 
                      type="radio" 
                      name="stockCalc" 
                      value="Purchase Price"
                      checked={stockValueCalculation === "Purchase Price"}
                      onChange={() => handleChange(setStockValueCalculation, "Purchase Price")}
                      className="accent-indigo-600 w-4 h-4" 
                    /> Purchase Price
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Advanced Tracking & Pricing Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs max-w-4xl">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-5">Advanced Tracking & Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Batching & Expiry */}
              <div 
                className={`border rounded px-4 py-3 flex justify-between items-center transition-colors ${enableItemBatching ? "border-indigo-100 bg-indigo-50/20" : "border-gray-200 bg-gray-50/20"}`}
              >
                <span className={`text-xs font-bold flex items-center gap-1.5 ${enableItemBatching ? "text-indigo-700" : "text-gray-600"}`}>
                  Enable Item Batching & Expiry
                </span>
                <div 
                  onClick={() => handleChange(setEnableItemBatching, !enableItemBatching)}
                  className={`w-8 h-4.5 rounded-full relative cursor-pointer flex items-center px-0.5 transition-colors ${enableItemBatching ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"}`}
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              
              {/* Serial Number */}
              <div 
                className={`border rounded px-4 py-3 flex justify-between items-center transition-colors ${enableSerialNumber ? "border-indigo-100 bg-indigo-50/20" : "border-gray-200 bg-gray-50/20"}`}
              >
                <span className={`text-xs font-bold ${enableSerialNumber ? "text-indigo-700" : "text-gray-600"}`}>Enable Serial Number / IMEI</span>
                <div 
                  onClick={() => handleChange(setEnableSerialNumber, !enableSerialNumber)}
                  className={`w-8 h-4.5 rounded-full relative cursor-pointer flex items-center px-0.5 transition-colors ${enableSerialNumber ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"}`}
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>

              {/* MRP */}
              <div 
                className={`border rounded px-4 py-3 flex justify-between items-center transition-colors ${enableMRP ? "border-indigo-100 bg-indigo-50/20" : "border-gray-200 bg-gray-50/20"}`}
              >
                <span className={`text-xs font-bold ${enableMRP ? "text-indigo-700" : "text-gray-600"}`}>Enable MRP</span>
                <div 
                  onClick={() => handleChange(setEnableMRP, !enableMRP)}
                  className={`w-8 h-4.5 rounded-full relative cursor-pointer flex items-center px-0.5 transition-colors ${enableMRP ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"}`}
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>

              {/* Wholesale Price */}
              <div 
                className={`border rounded px-4 py-3 flex justify-between items-center transition-colors ${enableWholesalePrice ? "border-indigo-100 bg-indigo-50/20" : "border-gray-200 bg-gray-50/20"}`}
              >
                <span className={`text-xs font-bold ${enableWholesalePrice ? "text-indigo-700" : "text-gray-600"}`}>Enable Wholesale Price</span>
                <div 
                  onClick={() => handleChange(setEnableWholesalePrice, !enableWholesalePrice)}
                  className={`w-8 h-4.5 rounded-full relative cursor-pointer flex items-center px-0.5 transition-colors ${enableWholesalePrice ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"}`}
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>

              {/* Party Wise Item Price */}
              <div 
                className={`border rounded px-4 py-3 flex justify-between items-center transition-colors ${enablePartyWisePrice ? "border-indigo-100 bg-indigo-50/20" : "border-gray-200 bg-gray-50/20"}`}
              >
                <span className={`text-xs font-bold flex items-center gap-1.5 ${enablePartyWisePrice ? "text-indigo-700" : "text-gray-600"}`}>
                  Enable Party Wise Item Price
                  <span className={`${enablePartyWisePrice ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"} text-[8px] px-1 rounded uppercase font-bold`}>Premium</span>
                </span>
                <div 
                  onClick={() => handleChange(setEnablePartyWisePrice, !enablePartyWisePrice)}
                  className={`w-8 h-4.5 rounded-full relative cursor-pointer flex items-center px-0.5 transition-colors ${enablePartyWisePrice ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"}`}
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
