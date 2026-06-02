"use client";

import React, { useState } from "react";
import { MessageSquare, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

import SettingsSidebar from "../SettingsSidebar";
import { useChat } from "@/context/ChatContext";

export default function RemindersPage() {
  const [sendBilling, setSendBilling] = useState(true);
  const [getPayment, setGetPayment] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("party");
  const [innerToggles, setInnerToggles] = useState<Record<string, boolean>>({
    payment: true,
    purchase: false,
    lowStock: true,
    salesReturn: false
  });
  const { openChat } = useChat();

  const toggleInner = (key: string) => {
    setInnerToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success("Reminder settings saved successfully!");
  };

  const handleComingSoon = () => {
    toast("Feature coming soon!", { icon: "🚀" });
  };

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      <SettingsSidebar />
      <div className="flex-1 bg-gray-50 flex flex-col font-sans h-[calc(100vh-60px)] overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Reminder Settings</h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Select Which Reminders Are Sent To You And Your Parties</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openChat} className="flex items-center gap-1.5 text-indigo-600 font-semibold px-4 py-1.5 rounded text-xs hover:bg-indigo-50 transition-colors">
              <MessageSquare size={14} /> Chat Support
            </button>
            <button className="border border-gray-200 text-gray-600 font-semibold px-6 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-indigo-100 text-indigo-400 font-bold px-6 py-1.5 rounded text-xs pointer-events-none">
              Save Changes
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 max-w-[1200px] w-full mx-auto">
          
          {/* Top Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            
            {/* Card 1 */}
            <div className="bg-white border border-gray-200 rounded p-4 flex items-start justify-between shadow-sm">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Send billing Whatsapp/SMS to Party</h3>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Send WhatsApp/SMS to your Party on creating any transaction</p>
              </div>
              {/* Custom Toggle Switch */}
              <div 
                onClick={() => setSendBilling(!sendBilling)}
                className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors shrink-0 mt-1 ${sendBilling ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${sendBilling ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-gray-200 rounded p-4 flex items-start justify-between shadow-sm">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Get payment reminders on WhatsApp</h3>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Set WhatsApp alerts when you have to collect payment from customers</p>
              </div>
              {/* Custom Toggle Switch */}
              <div 
                onClick={() => setGetPayment(!getPayment)}
                className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors shrink-0 mt-1 ${getPayment ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${getPayment ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </div>

          </div>

          {/* Collapsible Lists */}
          <div className="bg-white border border-gray-200 rounded shadow-sm divide-y divide-gray-100">
            
            {/* Section 1: TO PARTY */}
            <div>
              <div 
                onClick={() => setExpandedSection(expandedSection === "party" ? null : "party")}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors group"
              >
                <h4 className="text-xs font-bold text-gray-800">
                  TO PARTY <span className="font-normal text-gray-500 ml-1">(Reminders will be sent through sms)</span>
                </h4>
                <ChevronRight size={16} className={`text-gray-400 group-hover:text-gray-600 transition-transform ${expandedSection === "party" ? "rotate-90" : ""}`} />
              </div>
              {expandedSection === "party" && (
                <div className="bg-gray-50/50 p-4 border-t border-gray-100 space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Payment Reminders</p>
                      <p className="text-[10px] text-gray-500">Automatically remind customers of pending invoices</p>
                    </div>
                    <div 
                      onClick={() => toggleInner("payment")}
                      className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${innerToggles.payment ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${innerToggles.payment ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Sales Return Receipts</p>
                      <p className="text-[10px] text-gray-500">Send an SMS receipt when a return is processed</p>
                    </div>
                    <div 
                      onClick={() => toggleInner("salesReturn")}
                      className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${innerToggles.salesReturn ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${innerToggles.salesReturn ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Section 2: TO YOU */}
            <div>
              <div 
                onClick={() => setExpandedSection(expandedSection === "you" ? null : "you")}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors group"
              >
                <h4 className="text-xs font-bold text-gray-800">
                  TO YOU <span className="font-normal text-gray-500 ml-1">(Reminders will be sent on mobile app and whatsapp)</span>
                </h4>
                <ChevronRight size={16} className={`text-gray-400 group-hover:text-gray-600 transition-transform ${expandedSection === "you" ? "rotate-90" : ""}`} />
              </div>
              {expandedSection === "you" && (
                <div className="bg-gray-50/50 p-4 border-t border-gray-100 space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Low Stock Alerts</p>
                      <p className="text-[10px] text-gray-500">Get notified when items drop below minimum threshold</p>
                    </div>
                    <div 
                      onClick={() => toggleInner("lowStock")}
                      className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${innerToggles.lowStock ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${innerToggles.lowStock ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Purchase Order Updates</p>
                      <p className="text-[10px] text-gray-500">Get notified when vendors accept purchase orders</p>
                    </div>
                    <div 
                      onClick={() => toggleInner("purchase")}
                      className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${innerToggles.purchase ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${innerToggles.purchase ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
