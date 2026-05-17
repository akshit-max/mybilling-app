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
  Upload,
  MessageSquare,
  Search,
  Check,
  ChevronDown
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

import SettingsSidebar from "./SettingsSidebar";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Business state fields
  const [businessName, setBusinessName] = useState("self");
  const [phone, setPhone] = useState("7505371139");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [gstRegistered, setGstRegistered] = useState("no");
  const [pan, setPan] = useState("");
  const [businessType, setBusinessType] = useState("Select");
  const [industryType, setIndustryType] = useState("");
  const [registrationType, setRegistrationType] = useState("Private Limited Company");
  const [website, setWebsite] = useState("www.website.com");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setBusinessName(data.businessName || "self");
            setPhone(data.phone || "7505371139");
            setEmail(data.email || "");
            setAddress(data.address || "");
            setStateName(data.state || "");
            setPincode(data.pincode || "");
            setCity(data.city || "");
            setGstRegistered(data.gstRegistered || "no");
            setPan(data.pan || "");
            setBusinessType(data.businessType || "Select");
            setIndustryType(data.industryType || "");
            setRegistrationType(data.registrationType || "Private Limited Company");
            setWebsite(data.website || "www.website.com");
          }
        } catch (err) {
          console.error("Error loading business settings:", err);
          toast.error("Failed to load business profile");
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
        businessName,
        phone,
        email,
        address,
        state: stateName,
        pincode,
        city,
        gstRegistered,
        pan,
        businessType,
        industryType,
        registrationType,
        website,
        updatedAt: new Date()
      }, { merge: true });

      setHasChanges(false);
      toast.success("Business settings saved successfully! ✅");
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
        <span className="text-xs font-semibold">Configuring business settings...</span>
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
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Business Settings</h2>
            <p className="text-[10px] text-gray-500 font-medium">Edit company profile details and registration accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md font-semibold">
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
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
              
              {/* Left Column */}
              <div className="space-y-4">
                
                <div className="flex gap-4">
                  <div className="w-20 h-20 border border-dashed border-indigo-300 rounded-lg bg-indigo-50/20 flex flex-col items-center justify-center text-indigo-500 cursor-pointer hover:bg-indigo-50/50 transition-all shrink-0">
                    <Upload size={18} className="mb-1" />
                    <span className="text-[9px] font-bold text-center uppercase tracking-wider">Logo</span>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Business Name *</label>
                    <input 
                      type="text" 
                      value={businessName} 
                      onChange={(e) => handleChange(setBusinessName, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-700 font-bold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company Phone Number</label>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={(e) => handleChange(setPhone, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600 font-semibold" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company E-Mail</label>
                    <input 
                      type="email" 
                      placeholder="Enter company e-mail" 
                      value={email}
                      onChange={(e) => handleChange(setEmail, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Address</label>
                  <textarea 
                    rows={2} 
                    placeholder="Enter Billing Address" 
                    value={address}
                    onChange={(e) => handleChange(setAddress, e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600 resize-none" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">State</label>
                    <input 
                      type="text" 
                      placeholder="Enter State" 
                      value={stateName}
                      onChange={(e) => handleChange(setStateName, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pincode</label>
                    <input 
                      type="text" 
                      placeholder="Enter Pincode" 
                      value={pincode}
                      onChange={(e) => handleChange(setPincode, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">City</label>
                  <input 
                    type="text" 
                    placeholder="Enter City" 
                    value={city}
                    onChange={(e) => handleChange(setCity, e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600" 
                  />
                </div>

              </div>

              {/* Right Column */}
              <div className="space-y-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Are you GST Registered?</label>
                  <div className="flex items-center gap-6 mt-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-600">
                      <input 
                        type="radio" 
                        name="gst" 
                        value="yes"
                        checked={gstRegistered === "yes"}
                        onChange={() => handleChange(setGstRegistered, "yes")}
                        className="accent-indigo-600 w-4 h-4" 
                      /> Yes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-600">
                      <input 
                        type="radio" 
                        name="gst" 
                        value="no"
                        checked={gstRegistered === "no"}
                        onChange={() => handleChange(setGstRegistered, "no")}
                        className="accent-indigo-600 w-4 h-4" 
                      /> No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">PAN Number</label>
                  <input 
                    type="text" 
                    placeholder="Enter your PAN Number" 
                    value={pan}
                    onChange={(e) => handleChange(setPan, e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600 font-mono" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Business Type</label>
                    <select 
                      value={businessType}
                      onChange={(e) => handleChange(setBusinessType, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-600 font-semibold"
                    >
                      <option value="Select">Select</option>
                      <option value="Retail">Retail Shop</option>
                      <option value="Wholesale">Wholesale Merchant</option>
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Service">Service Provider</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Industry Type</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Electronics" 
                      value={industryType}
                      onChange={(e) => handleChange(setIndustryType, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Business Registration Type</label>
                  <select 
                    value={registrationType}
                    onChange={(e) => handleChange(setRegistrationType, e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white text-gray-600 font-semibold"
                  >
                    <option value="Private Limited Company">Private Limited Company</option>
                    <option value="Proprietorship">Proprietorship</option>
                    <option value="Partnership">Partnership Firm</option>
                    <option value="One Person Company">One Person Company (OPC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Website</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={website}
                      onChange={(e) => handleChange(setWebsite, e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600 font-mono" 
                    />
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Secondary settings list */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs max-w-5xl">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Verification Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-indigo-100 bg-indigo-50/20 rounded px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  Enable e-Invoicing 
                  <span className="bg-indigo-100 text-indigo-600 text-[8px] px-1 rounded uppercase font-bold">New</span>
                </span>
                <div className="w-8 h-4.5 bg-indigo-600 rounded-full relative cursor-pointer flex items-center justify-end px-0.5">
                  <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="border border-gray-200 bg-gray-50/20 rounded px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">Enable Tally Auto-Export</span>
                <div className="w-8 h-4.5 bg-gray-200 rounded-full relative cursor-pointer flex items-center justify-start px-0.5">
                  <div className="w-3.5 h-3.5 bg-white rounded-full border border-gray-300"></div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}