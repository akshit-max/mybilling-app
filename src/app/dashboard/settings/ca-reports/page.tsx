"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import toast from "react-hot-toast";

import SettingsSidebar from "../SettingsSidebar";

export default function CAReportsSharingPage() {
  const [sharing, setSharing] = useState(false);

  const handleSave = () => {
    toast.success("CA Report settings saved successfully!");
  };

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      <SettingsSidebar />
      <div className="flex-1 bg-gray-50 flex flex-col font-sans h-[calc(100vh-60px)] relative overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-800">CA Reports Sharing</h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Automatically share reports to your CA every month</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-gray-200 text-gray-600 font-semibold px-6 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-indigo-100 text-indigo-400 font-bold px-6 py-1.5 rounded text-xs pointer-events-none">
              Save Changes
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-6 max-w-[1200px] w-full mx-auto flex flex-col space-y-4">
          
          <h2 className="text-sm font-bold text-gray-800">Settings</h2>

          <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            
            {/* Main Toggle Block */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Enable Sharing</h3>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Control the business reports sharing with your CA</p>
              </div>
              {/* Custom Toggle Switch */}
              <div 
                onClick={() => setSharing(!sharing)}
                className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors shrink-0 mt-1 ${sharing ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${sharing ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-[#FFF8E7] border-t border-b border-[#F5E6CA] px-4 py-3 flex items-start gap-2">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 font-medium">
                Automatic report sending will be scheduled for the 1st of every month starting from June 1, 2026
              </p>
            </div>

          </div>

        </main>

        {/* FOOTER DISCLAIMER */}
        <div className="absolute bottom-4 left-6 right-6">
          <p className="text-[9px] text-gray-400 font-medium">
            Note: The use of this logo does not imply any endorsement, affiliation, or association with the ICAI. The logo is the intellectual property of ICAI, and all rights to the logo remain with them.
          </p>
        </div>

      </div>
    </div>
  );
}
