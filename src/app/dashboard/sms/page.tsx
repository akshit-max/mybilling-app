"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, BarChart3, Smartphone, Tag, Gift, Sparkles, ReceiptText, X, Check, Users } from "lucide-react";
import toast from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useSession } from "@/context/SessionContext";

export default function SMSMarketingPage() {
  const { activeProfile } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("festival");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        try {
          // Fetch Customers
          const cQuery = query(collection(db, "customers"), where("userId", "==", user.uid));
          const cSnap = await getDocs(cQuery);
          setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Fetch Campaigns
          const campQuery = query(collection(db, "smsCampaigns"), where("userId", "==", user.uid));
          const campSnap = await getDocs(campQuery);
          const campData = campSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          campData.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
          setCampaigns(campData);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, []);

  const openModal = (template: string) => {
    setSelectedTemplate(template);
    setSelectedCustomers([]);
    setShowModal(true);
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const toggleCustomer = (id: string) => {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter(cId => cId !== id));
    } else {
      setSelectedCustomers([...selectedCustomers, id]);
    }
  };

  const handleSendCampaign = async () => {
    if (selectedCustomers.length === 0) {
      return toast.error("Please select at least one customer");
    }
    
    const user = auth.currentUser;
    if (!user) return toast.error("Not authenticated");

    try {
      setSending(true);
      const templateName = selectedTemplate === "festival" ? "Festival Offer" : "Discount Offer";
      const messageText = selectedTemplate === "festival" 
        ? "🎉 Festive Sale is live! Visit our store to get exclusive discounts on your favorite items. Valid till stocks last."
        : selectedTemplate === "discount" 
        ? "🔥 Special 50% OFF just for you! Drop by our store and claim your discount today. Thank you for shopping with us!"
        : "Start your custom SMS campaign message here...";

      // Extract valid phone numbers
      const phoneNumbers = selectedCustomers
        .map(id => customers.find(c => c.id === id)?.phone)
        .filter(p => p && p.replace(/\\D/g, "").length >= 10)
        .map(p => p.replace(/\\D/g, ""));

      if (phoneNumbers.length > 0) {
        // Hit the unified SMS API endpoint
        await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneNumbers.join(","),
            message: messageText,
            customerName: "Bulk Campaign"
          }),
        });
      }
      
      const campaignData = {
        userId: user.uid,
        campaignName: templateName,
        recipientsCount: selectedCustomers.length,
        status: "Sent",
        createdAt: serverTimestamp(),
        createdBy: activeProfile.name
      };

      const docRef = await addDoc(collection(db, "smsCampaigns"), campaignData);
      
      setCampaigns([{ id: docRef.id, ...campaignData, createdAt: { seconds: Date.now() / 1000 } }, ...campaigns]);
      setShowModal(false);
      toast.success(`Successfully sent SMS to ${selectedCustomers.length} customers!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send campaign");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">SMS Promotion</h1>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600">
            <ReceiptText size={18} />
          </button>
          <button onClick={() => openModal("custom")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-1.5 rounded text-sm transition-colors shadow-sm">
            Create Campaign
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 max-w-[900px] w-full mx-auto p-12 flex flex-col items-center space-y-12 pb-24">
        
        {/* Top Graphic & Title */}
        <div className="flex flex-col items-center text-center space-y-6 mt-4">
          <div className="relative w-64 h-48 flex items-end justify-center select-none">
             {/* Chart bars */}
             <div className="absolute bottom-0 left-4 flex items-end gap-2 opacity-20">
                <div className="w-8 h-12 bg-blue-500 rounded-t-sm"></div>
                <div className="w-8 h-20 bg-blue-500 rounded-t-sm"></div>
                <div className="w-8 h-32 bg-blue-500 rounded-t-sm"></div>
                <div className="w-8 h-40 bg-blue-500 rounded-t-sm"></div>
             </div>
             {/* Trend line */}
             <div className="absolute bottom-12 left-0 right-16 h-32 border-l-4 border-t-4 border-blue-300 rounded-tl-xl transform -skew-y-12 opacity-50"></div>
             
             {/* Phone */}
             <div className="relative z-10 w-32 h-40 bg-white border-2 border-slate-300 rounded-xl shadow-md p-2 flex flex-col">
                <div className="w-1/3 h-1 bg-slate-200 rounded-full mx-auto mb-2"></div>
                <div className="flex-1 border border-slate-100 rounded bg-gray-50 flex flex-col p-2 space-y-2">
                   <div className="w-full bg-indigo-100 rounded p-1.5 text-[6px] text-indigo-800 font-medium ml-auto shadow-sm">
                      New Year Sale is Live! Flat 50% off on all items. Hurry Now!!
                   </div>
                   <div className="w-3/4 bg-slate-200 rounded p-1.5 text-[6px] text-slate-500 mr-auto">
                      Thank you!
                   </div>
                </div>
             </div>

             {/* Floating bubbles */}
             <div className="absolute top-12 right-0 bg-orange-100 text-orange-600 text-[8px] font-bold px-2 py-1 rounded shadow-sm border border-orange-200">
               Holi Sale
             </div>
             <div className="absolute top-24 right-4 bg-teal-100 text-teal-700 text-[8px] font-bold px-2 py-1 rounded shadow-sm border border-teal-200">
               Diwali Sale
             </div>
             <div className="absolute top-36 -right-4 bg-rose-100 text-rose-600 text-[8px] font-bold px-2 py-1 rounded shadow-sm border border-rose-200">
               50% Discount
             </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800">Grow Your Business through SMS Promotions</h2>
            <p className="text-xs text-gray-500 mt-2 max-w-xl mx-auto leading-relaxed">
              Want to share festival sale and discount offer with your customer? Start an SMS campaign today with Cloud Ledger and make your sale a success
            </p>
          </div>
        </div>

        {/* Promo Cards */}
        <div className="w-full flex flex-col gap-4">
          {/* Blue Card */}
          <div className="bg-sky-500 rounded-lg p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="z-10 text-white space-y-3">
              <h3 className="font-bold text-base">Share festival offer with Your customer</h3>
              <p className="text-xs text-sky-100">Increase your sale this festival season with our Festival SMS Campaign</p>
              <button onClick={() => openModal("festival")} className="mt-2 bg-white text-sky-600 font-bold px-4 py-1.5 rounded text-xs shadow-sm hover:bg-sky-50 transition-colors">
                Select Template
              </button>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-8 gap-2 opacity-90">
               <div className="w-12 h-12 bg-rose-400 rounded-lg shadow-sm flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform">
                  <Gift className="text-white" size={24} />
               </div>
               <div className="w-12 h-12 bg-amber-400 rounded-lg shadow-sm flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform">
                  <Sparkles className="text-white" size={24} />
               </div>
            </div>
          </div>

          {/* Orange Card */}
          <div className="bg-[#E67E4D] rounded-lg p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="z-10 text-white space-y-3">
              <h3 className="font-bold text-base">Share discount Your customer will love</h3>
              <p className="text-xs text-orange-100">Share discount offers with your customers and watch your business grow</p>
              <button onClick={() => openModal("discount")} className="mt-2 bg-white text-orange-600 font-bold px-4 py-1.5 rounded text-xs shadow-sm hover:bg-brand-neutral transition-colors">
                Select Template
              </button>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-xl shadow-lg rotate-12 group-hover:rotate-6 transition-transform flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
               <div className="w-3 h-3 bg-gray-200 rounded-full absolute -top-1.5"></div>
               <span className="font-black text-2xl text-gray-800">50%</span>
               <span className="font-bold text-sm text-gray-500">OFF</span>
            </div>
          </div>
        </div>

        {/* Recent Campaigns */}
        {campaigns.length > 0 && (
          <div className="w-full mt-8">
            <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Recent Campaigns</h3>
            <div className="space-y-3">
              {campaigns.slice(0, 5).map(c => (
                <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{c.campaignName}</p>
                      <p className="text-xs text-gray-500">
                        {c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : "Just now"} • Sent by {c.createdBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{c.recipientsCount} Recipients</p>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* CAMPAIGN MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="font-bold text-gray-800">Create SMS Campaign</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Template Preview */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Message Preview</label>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-900 leading-relaxed shadow-sm">
                  {selectedTemplate === "festival" && "🎉 Festive Sale is live! Visit our store to get exclusive discounts on your favorite items. Valid till stocks last."}
                  {selectedTemplate === "discount" && "🔥 Special 50% OFF just for you! Drop by our store and claim your discount today. Thank you for shopping with us!"}
                  {selectedTemplate === "custom" && "Start your custom SMS campaign message here..."}
                </div>
              </div>

              {/* Customer Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Select Recipients ({selectedCustomers.length} selected)</label>
                  <button onClick={handleSelectAll} className="text-xs text-indigo-600 font-bold hover:underline">
                    {selectedCustomers.length === customers.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {customers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      <Users size={32} className="mx-auto mb-2 text-gray-300" />
                      No customers found. Please add parties in the Customers tab first.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customers.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => toggleCustomer(c.id)}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCustomers.includes(c.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                            {selectedCustomers.includes(c.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.phone || "No phone number"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendCampaign}
                disabled={sending || selectedCustomers.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded text-sm font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? "Sending..." : "Send Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
