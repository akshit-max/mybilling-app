"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Star, Mail, Download, Printer, Search, Users, X, ChevronDown } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type PartyAgeing = {
  id: string;
  name: string;
  byTomorrow: number;
  upcoming: number;
  totalDue: number;
  overdue1_15: number;
  overdue16_30: number;
  overdue30Plus: number;
  totalOverdue: number;
  totalAmount: number;
};

export default function AgeingReport() {
  const [parties, setParties] = useState<PartyAgeing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFavourite, setIsFavourite] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: "", cc: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch customers to get names
        const custSnap = await getDocs(query(collection(db, "customers"), where("userId", "==", user.uid)));
        const custMap = new Map();
        custSnap.docs.forEach(d => {
          const data = d.data();
          custMap.set(d.id, { name: data.name || data.partyName || "Unknown" });
          custMap.set(data.name || data.partyName || "Unknown", { id: d.id, name: data.name || data.partyName });
        });

        // Fetch unpaid invoices to calculate ageing
        const invSnap = await getDocs(query(collection(db, "invoices"), where("userId", "==", user.uid)));
        
        const ageingMap = new Map<string, PartyAgeing>();
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        invSnap.docs.forEach(doc => {
          const inv = doc.data();
          if (inv.invoiceType === "estimate" || inv.status === "cancelled") return;

          const total = Number(inv.total || 0);
          const received = typeof inv.amountReceived === "number" ? inv.amountReceived : (inv.status === "paid" ? total : 0);
          const adjusted = Number(inv.creditNoteAdjusted || 0);
          const unpaid = Math.max(0, total - received - adjusted);

          if (unpaid > 0) {
            const partyName = inv.customerName || "Cash Sale";
            
            if (!ageingMap.has(partyName)) {
              ageingMap.set(partyName, {
                id: custMap.get(partyName)?.id || Math.random().toString(),
                name: partyName,
                byTomorrow: 0,
                upcoming: 0,
                totalDue: 0,
                overdue1_15: 0,
                overdue16_30: 0,
                overdue30Plus: 0,
                totalOverdue: 0,
                totalAmount: 0
              });
            }

            const p = ageingMap.get(partyName)!;
            
            // Ageing logic (mocked if no due date, assuming created date + 15 days is due date)
            const createdAt = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || Date.now());
            const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000);
            
            // Compute difference in days from today to due date
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
              // Not yet due
              if (diffDays <= 1) p.byTomorrow += unpaid;
              else p.upcoming += unpaid;
              p.totalDue += unpaid;
            } else {
              // Overdue
              const overdueDays = Math.abs(diffDays);
              if (overdueDays >= 1 && overdueDays <= 15) p.overdue1_15 += unpaid;
              else if (overdueDays >= 16 && overdueDays <= 30) p.overdue16_30 += unpaid;
              else p.overdue30Plus += unpaid;
              p.totalOverdue += unpaid;
            }

            p.totalAmount += unpaid;
          }
        });

        setParties(Array.from(ageingMap.values()));
      } catch (err) {
        console.error("Ageing report fetch error:", err);
        toast.error("Failed to load ageing report.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredParties = parties.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (filteredParties.length === 0) return toast.error("No data to export");

    const headers = ["Party Name", "By Tomorrow", "Upcoming", "Total Due", "1-15 Days Overdue", "16-30 Days Overdue", "30+ Days Overdue", "Total Overdue", "Total Amount"];
    const rows = filteredParties.map(p => [
      p.name,
      p.byTomorrow.toString(),
      p.upcoming.toString(),
      p.totalDue.toString(),
      p.overdue1_15.toString(),
      p.overdue16_30.toString(),
      p.overdue30Plus.toString(),
      p.totalOverdue.toString(),
      p.totalAmount.toString()
    ]);

    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #f3f4f6; color: #111827; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          td { border: 1px solid #e5e7eb; padding: 6px; color: #374151; }
        </style>
      </head>
      <body>
        <h2>Ageing Report</h2>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ageing_Report.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Excel downloaded successfully 📊");
  };

  const handleEmailExcel = async () => {
    if (!emailData.to.trim()) {
      toast.error("Please enter your Email ID");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (emailData.cc && !emailRegex.test(emailData.cc.trim())) {
      toast.error("Please enter a valid CA email address");
      return;
    }

    if (filteredParties.length === 0) {
      toast.error("No data to email");
      return;
    }

    const headers = ["Party Name", "By Tomorrow", "Upcoming", "Total Due", "1-15 Days Overdue", "16-30 Days Overdue", "30+ Days Overdue", "Total Overdue", "Total Amount"];
    const rows = filteredParties.map(p => [
      p.name,
      p.byTomorrow > 0 ? `₹ ${p.byTomorrow.toLocaleString()}` : "-",
      p.upcoming > 0 ? `₹ ${p.upcoming.toLocaleString()}` : "-",
      p.totalDue > 0 ? `₹ ${p.totalDue.toLocaleString()}` : "-",
      p.overdue1_15 > 0 ? `₹ ${p.overdue1_15.toLocaleString()}` : "-",
      p.overdue16_30 > 0 ? `₹ ${p.overdue16_30.toLocaleString()}` : "-",
      p.overdue30Plus > 0 ? `₹ ${p.overdue30Plus.toLocaleString()}` : "-",
      p.totalOverdue > 0 ? `₹ ${p.totalOverdue.toLocaleString()}` : "-",
      `₹ ${p.totalAmount.toLocaleString()}`
    ]);

    const tableHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1e3a8a;">Ageing Report</h2>
        <p style="color: #4b5563;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #111827;">
              ${headers.map(h => `<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td style="border: 1px solid #e5e7eb; padding: 6px; color: #374151;">${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;

    const emails = [emailData.to.trim(), emailData.cc?.trim()].filter(Boolean);

    await toast.promise(
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emails,
          subject: "Ageing Report",
          html: tableHTML
        })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Email send failed");
        return data;
      }),
      {
        loading: 'Generating and emailing Excel report...',
        success: `Excel Report sent successfully to ${emailData.to}! 📧`,
        error: (err) => err.message || 'Failed to send email.',
      }
    );

    setShowEmailModal(false);
    setEmailData({ to: "", cc: "" });
  };

  return (
    <div id="print-area" className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen print:bg-white print:pb-0">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customers" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Ageing Report</h1>
          <button 
            onClick={() => {
              setIsFavourite(!isFavourite);
              toast.success(isFavourite ? "Removed from favourites" : "Added to favourites ⭐");
            }}
            className={`flex items-center gap-1.5 border px-2 py-1 rounded text-[10px] font-bold transition-colors ${
              isFavourite ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Star size={12} fill={isFavourite ? "currentColor" : "none"} />
            <span>Favourite</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition">
            <Mail size={13} className="text-gray-500" />
            <span>Email Excel</span>
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition">
            <Download size={13} className="text-gray-500" />
            <span>Download Excel</span>
            <ChevronDown size={11} className="text-gray-400 ml-1" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 px-4 py-1.5 rounded hover:bg-gray-50 font-bold transition shadow-sm">
            <Printer size={13} className="text-gray-500" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      <div className="hidden print:block text-center py-6 border-b border-gray-200 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Ageing Report</h1>
        <p className="text-sm text-gray-500 mt-1 font-semibold">All Parties</p>
        <p className="text-xs text-gray-400 mt-1">Generated on: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <div className="px-6 pt-4 pb-2 print:hidden">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input 
            type="text"
            placeholder="Search by party name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400 font-medium"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-lg mx-6 mt-2 flex flex-col shadow-sm print:border-none print:shadow-none print:mx-0 overflow-hidden print:overflow-visible">
        <div className="flex-1 overflow-x-auto print:overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span className="text-xs">Loading ageing data...</span>
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-center">
              <div className="max-w-sm">
                <Search size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-xs font-bold text-gray-500">No transactions available for selected party.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                {/* Header Grouping Row */}
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-800 font-bold text-[11px] print:bg-gray-100 text-center">
                  <th className="px-5 py-2.5 border-r border-gray-100 text-left bg-gray-100/50"></th>
                  <th colSpan={3} className="px-5 py-2.5 border-r border-gray-100 bg-[#FFFDE7]">Not yet due</th>
                  <th colSpan={4} className="px-5 py-2.5 border-r border-gray-100 bg-[#FFEBEE]">Overdue</th>
                  <th className="px-5 py-2.5 bg-gray-100/50"></th>
                </tr>
                {/* Sub Headers */}
                <tr className="bg-white border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider text-right">
                  <th className="px-5 py-3 text-left w-48">Party Name</th>
                  <th className="px-5 py-3 bg-[#FFFDE7]/30">By Tomorrow</th>
                  <th className="px-5 py-3 bg-[#FFFDE7]/30">Upcoming</th>
                  <th className="px-5 py-3 font-bold text-gray-800 bg-[#FFFDE7]/30 border-r border-gray-100">T. Due</th>
                  <th className="px-5 py-3 bg-[#FFEBEE]/30">1-15 Days</th>
                  <th className="px-5 py-3 bg-[#FFEBEE]/30">16-30 Days</th>
                  <th className="px-5 py-3 bg-[#FFEBEE]/30">30+ Days</th>
                  <th className="px-5 py-3 font-bold text-gray-800 bg-[#FFEBEE]/30 border-r border-gray-100">T. Overdue</th>
                  <th className="px-5 py-3 font-bold text-gray-800">T. Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-right">
                {filteredParties.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-5 py-3.5 text-left font-bold text-indigo-600 truncate max-w-[12rem]">{p.name}</td>
                    <td className="px-5 py-3.5 bg-[#FFFDE7]/10">{p.byTomorrow > 0 ? p.byTomorrow.toLocaleString() : "-"}</td>
                    <td className="px-5 py-3.5 bg-[#FFFDE7]/10">{p.upcoming > 0 ? p.upcoming.toLocaleString() : "-"}</td>
                    <td className="px-5 py-3.5 font-bold text-gray-800 bg-[#FFFDE7]/10 border-r border-gray-100">{p.totalDue > 0 ? p.totalDue.toLocaleString() : "-"}</td>
                    
                    <td className="px-5 py-3.5 bg-[#FFEBEE]/10">{p.overdue1_15 > 0 ? p.overdue1_15.toLocaleString() : "-"}</td>
                    <td className="px-5 py-3.5 bg-[#FFEBEE]/10">{p.overdue16_30 > 0 ? p.overdue16_30.toLocaleString() : "-"}</td>
                    <td className="px-5 py-3.5 bg-[#FFEBEE]/10">{p.overdue30Plus > 0 ? p.overdue30Plus.toLocaleString() : "-"}</td>
                    <td className="px-5 py-3.5 font-bold text-[#C62828] bg-[#FFEBEE]/10 border-r border-gray-100">{p.totalOverdue > 0 ? p.totalOverdue.toLocaleString() : "-"}</td>
                    
                    <td className="px-5 py-3.5 font-bold text-gray-900 font-mono">₹ {p.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>


      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Email Excel Report</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                We will send you the ageing report to the email below
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Your Email ID *</label>
                <input 
                  type="email" 
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="abc@gmail.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CA Email ID (Optional)</label>
                <input 
                  type="email" 
                  value={emailData.cc}
                  onChange={(e) => setEmailData({...emailData, cc: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="abc@gmail.com"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-200 rounded text-gray-600 text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEmailExcel}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded text-sm font-bold hover:bg-indigo-200 transition-colors"
              >
                Send Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
