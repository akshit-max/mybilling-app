"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Star, Search, Mail, Download, Printer } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";

type ItemPartyReport = {
  itemId: string;
  itemName: string;
  itemCode: string;
  salesQty: number;
  salesAmount: number;
  purchaseQty: number;
  purchaseAmount: number;
};

type Party = { id: string, name: string, category: string };

export default function ItemReportByParty() {
  const [data, setData] = useState<ItemPartyReport[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("This Week");

  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // Fetch parties and categories
        const pSnap = await getDocs(query(collection(db, "customers"), where("userId", "==", user.uid)));
        const pList: Party[] = [];
        const cSet = new Set<string>();
        pSnap.docs.forEach(doc => {
          const d = doc.data();
          const pName = d.name || d.partyName || "Unknown";
          const pCat = d.category || "-";
          pList.push({ id: doc.id, name: pName, category: pCat });
          if (pCat && pCat !== "-") cSet.add(pCat);
        });
        setParties(pList);
        setCategories(Array.from(cSet));
        
      } catch (err) {
        console.error("Item Report fetch error:", err);
        toast.error("Failed to load parameters.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Fetch Report Data based on selected party
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedParty) {
        setData([]);
        return;
      }

      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      try {
        const itemMap = new Map<string, ItemPartyReport>();

        // 1. Fetch Sales for this party
        const invSnap = await getDocs(query(collection(db, "invoices"), where("userId", "==", user.uid)));
        invSnap.docs.forEach(doc => {
          const inv = doc.data();
          if (inv.invoiceType === "estimate" || inv.status === "cancelled") return;
          if ((inv.customerName || "Cash Sale").toLowerCase() !== selectedParty.toLowerCase()) return;

          const items = inv.items || [];
          items.forEach((it: any) => {
            const iName = it.name || "Unknown Item";
            const iCode = it.itemCode || "-";
            if (!itemMap.has(iName)) {
              itemMap.set(iName, { itemId: iName, itemName: iName, itemCode: iCode, salesQty: 0, salesAmount: 0, purchaseQty: 0, purchaseAmount: 0 });
            }
            const record = itemMap.get(iName)!;
            record.salesQty += Number(it.qty || it.quantity || 0);
            record.salesAmount += (Number(it.qty || it.quantity || 0) * Number(it.price || 0));
          });
        });

        // 2. Fetch Purchases for this party
        try {
          const pSnap = await getDocs(query(collection(db, "purchases"), where("userId", "==", user.uid)));
          pSnap.docs.forEach(doc => {
            const purch = doc.data();
            if (purch.status === "cancelled") return;
            const purchParty = purch.supplierName || purch.partyName || "";
            if (purchParty.toLowerCase() !== selectedParty.toLowerCase()) return;

            const items = purch.items || [];
            items.forEach((it: any) => {
              const iName = it.name || "Unknown Item";
              const iCode = it.itemCode || "-";
              if (!itemMap.has(iName)) {
                itemMap.set(iName, { itemId: iName, itemName: iName, itemCode: iCode, salesQty: 0, salesAmount: 0, purchaseQty: 0, purchaseAmount: 0 });
              }
              const record = itemMap.get(iName)!;
              record.purchaseQty += Number(it.qty || it.quantity || 0);
              record.purchaseAmount += (Number(it.qty || it.quantity || 0) * Number(it.price || 0));
            });
          });
        } catch(e) {}

        setData(Array.from(itemMap.values()));
      } catch(e) {
        toast.error("Error generating report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedParty]);

  const filteredParties = parties.filter(p => !selectedCategory || p.category === selectedCategory);

  const exportToExcel = () => {
    if (data.length === 0) return toast.error("No data to export");
    const headers = ["Item Name", "Sales Qty", "Sales Amount", "Purchase Qty", "Purchase Amount"];
    const rows = data.map(d => [
      d.itemName,
      d.salesQty.toString(),
      d.salesAmount.toString(),
      d.purchaseQty.toString(),
      d.purchaseAmount.toString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Item_Report_By_Party.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel downloaded successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="print-area" className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen print:bg-white print:pb-0">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customers" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Item Report By Party</h1>
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
          <button 
            onClick={() => toast.success("Emailing report...")}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition"
          >
            <Mail size={13} className="text-gray-500" />
            <span>Email Excel</span>
          </button>
          
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition"
          >
            <Download size={13} className="text-gray-500" />
            <span>Download Excel</span>
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs text-white bg-indigo-650 bg-indigo-600 border border-indigo-600 px-4 py-1.5 rounded hover:bg-indigo-750 hover:bg-indigo-700 font-bold transition shadow-sm"
          >
            <Printer size={13} />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <select 
          className="border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-indigo-500 min-w-[150px]"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Select Category</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          className="border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-indigo-500 min-w-[200px]"
          value={selectedParty}
          onChange={(e) => setSelectedParty(e.target.value)}
        >
          <option value="">Select Party</option>
          {filteredParties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>

        <select 
          className="border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-indigo-500 min-w-[150px]"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
          <option value="This Year">This Year</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-lg mx-6 mt-4 flex flex-col shadow-sm min-h-[400px]">
        <div className="flex-1 overflow-x-auto print:overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center py-32 text-gray-400 gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span className="text-xs">Loading items...</span>
            </div>
          ) : !selectedParty ? (
            <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400">
              <Search size={40} className="mb-4 text-gray-200" />
              <p className="text-sm font-semibold">Select a party to view item report</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400">
              <Search size={40} className="mb-4 text-gray-200" />
              <p className="text-sm font-semibold">No transactions available for selected party</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-[10px] uppercase tracking-wider text-center">
                  <th className="px-5 py-3 text-left">Item Name</th>
                  <th className="px-5 py-3">Item Code</th>
                  <th className="px-5 py-3 text-right">Sales Quantity</th>
                  <th className="px-5 py-3 text-right">Sales Amount</th>
                  <th className="px-5 py-3 text-right">Purchase Quantity</th>
                  <th className="px-5 py-3 text-right">Purchase Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.itemId} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-5 py-3.5 text-left font-bold text-gray-800">{item.itemName}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-gray-500">{item.itemCode}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[#2E7D32]">{item.salesQty || "-"}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">₹ {item.salesAmount.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[#C62828]">{item.purchaseQty || "-"}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">₹ {item.purchaseAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
