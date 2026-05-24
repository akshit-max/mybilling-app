"use client";

import React, { useState, useEffect } from "react";
import { Search, Settings, PlayCircle, CheckCircle2, ChevronDown, Download, AlertTriangle, FileText, QrCode, Smartphone, X } from "lucide-react";
import toast from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import QRCode from "react-qr-code";

type SharedTransaction = {
  id: string;
  date: string;
  type: string;
  number: string;
  amount: number;
  status: "Unpaid" | "Completed";
  actionStatus: "pending" | "converted" | "recorded";
  items: { name: string; qty: number; rate: number }[];
};

type SharedParty = {
  id: string;
  name: string;
  phone: string;
  type: string; // Display string like "Customer - is expecting"
  actualType: string; // "Supplier" | "Customer" for Details card
  balance: number;
  transactions: SharedTransaction[];
};

export default function SharedLedgerPage() {
  const [search, setSearch] = useState("");
  const [parties, setParties] = useState<SharedParty[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [userId, setUserId] = useState<string>("");
  const [businessName, setBusinessName] = useState("My Business");
  const [dateFilter, setDateFilter] = useState("365");

  // Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<SharedTransaction | null>(null);
  const [showAiModal, setShowAiModal] = useState<SharedTransaction | null>(null);
  
  // Loading Flow
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const settingsSnap = await getDoc(doc(db, "settings", user.uid));
          if (settingsSnap.exists()) setBusinessName(settingsSnap.data().businessName || "My Business");

          // 1. Fetch Customers
          const cSnap = await getDocs(query(collection(db, "customers"), where("userId", "==", user.uid)));
          const customers = cSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

          // 2. Fetch Transactions
          const iSnap = await getDocs(query(collection(db, "invoices"), where("userId", "==", user.uid)));
          const pSnap = await getDocs(query(collection(db, "purchases"), where("userId", "==", user.uid)));
          const piSnap = await getDocs(query(collection(db, "paymentIn"), where("userId", "==", user.uid)));

          const partiesMap = new Map<string, SharedParty>();

          // Initialize parties from customers
          customers.forEach(c => {
            partiesMap.set((c.name || c.partyName || "").toLowerCase().trim(), {
              id: c.id,
              name: c.name || c.partyName || "Unknown",
              phone: c.phone || c.mobile || "",
              type: `${c.type || "Customer"} - is expecting`,
              actualType: c.type || "Customer",
              balance: Number(c.openingBalance || 0), // Will dynamically calculate
              transactions: []
            });
          });

          // Process Sales Invoices
          iSnap.docs.forEach(d => {
            const data = d.data();
            const pName = (data.customerName || "").toLowerCase().trim();
            if (partiesMap.has(pName)) {
              const p = partiesMap.get(pName)!;
              p.transactions.push({
                id: d.id,
                date: data.date || "N/A",
                type: "Sales Invoices",
                number: data.invoiceNumber || "-",
                amount: Number(data.total || 0),
                status: data.status === "paid" ? "Completed" : "Unpaid",
                actionStatus: "pending",
                items: (data.items || []).map((i: any) => ({
                  name: i.name,
                  qty: Number(i.qty || 0),
                  rate: Number(i.price || 0)
                }))
              });
              if (data.status !== "paid") {
                p.balance += (Number(data.total || 0) - Number(data.amountReceived || 0));
              }
            }
          });

          // Process Purchase Invoices
          pSnap.docs.forEach(d => {
            const data = d.data();
            const pName = (data.customerName || data.supplierName || "").toLowerCase().trim();
            if (partiesMap.has(pName)) {
              const p = partiesMap.get(pName)!;
              p.transactions.push({
                id: d.id,
                date: data.date || "N/A",
                type: "Purchase Invoices",
                number: data.purchaseInvoiceNumber || data.invoiceNumber || "-",
                amount: Number(data.total || 0),
                status: data.status === "paid" ? "Completed" : "Unpaid",
                actionStatus: "recorded",
                items: (data.items || []).map((i: any) => ({
                  name: i.name,
                  qty: Number(i.qty || 0),
                  rate: Number(i.price || 0)
                }))
              });
              if (data.status !== "paid") {
                p.balance -= (Number(data.total || 0) - Number(data.amountPaid || 0));
              }
            }
          });

          // Process Payment In
          piSnap.docs.forEach(d => {
            const data = d.data();
            const pName = (data.partyName || "").toLowerCase().trim();
            if (partiesMap.has(pName)) {
              const p = partiesMap.get(pName)!;
              p.transactions.push({
                id: d.id,
                date: data.paymentDate || "N/A",
                type: "Payment In",
                number: data.paymentNumber || "-",
                amount: Number(data.amountReceived || 0),
                status: "Completed",
                actionStatus: "recorded",
                items: []
              });
              p.balance -= Number(data.amountReceived || 0);
            }
          });

          // Sort and finalize
          Array.from(partiesMap.values()).forEach(p => {
            p.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          });

          const finalParties = Array.from(partiesMap.values()).filter(p => p.transactions.length > 0 || p.balance !== 0);
          setParties(finalParties);
          if (finalParties.length > 0) setSelectedPartyId(finalParties[0].id);

        } catch (err) {
          console.error("Failed to load synced data", err);
          toast.error("Failed to sync website data");
        } finally {
          setIsLoadingData(false);
        }
      } else {
        setIsLoadingData(false);
      }
    });
    return () => unsub();
  }, []);

  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search));

  const filteredTransactions = selectedParty?.transactions.filter(t => {
    if (dateFilter === "all") return true;
    const days = parseInt(dateFilter);
    const txDate = new Date(t.date);
    const diffTime = Math.abs(new Date().getTime() - txDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }) || [];

  const downloadLedgerCSV = () => {
    if (!selectedParty || filteredTransactions.length === 0) {
      return toast.error("No transactions to download");
    }
    const headers = ["Date", "Transaction Type", "Transaction Number", "Amount", "Status"];
    const rows = filteredTransactions.map(t => [
      t.date, t.type, t.number, t.amount, t.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedParty.name}_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger downloaded successfully");
  };

  const handleDownloadInvoice = () => {
    toast.success("Preparing invoice for print...");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const markAsRecorded = (tId: string) => {
    setParties(prev => prev.map(p => {
      if (p.id !== selectedPartyId) return p;
      return {
        ...p,
        transactions: p.transactions.map(t => t.id === tId ? { ...t, actionStatus: "recorded" } : t)
      };
    }));
    setShowInvoiceModal(null);
    toast.success("Marked as recorded");
  };

  const handleStartPurchaseConversion = (t: SharedTransaction) => {
    setShowAiModal(t);
  };

  const executePurchaseConversion = async () => {
    if (!showAiModal || !selectedParty || !userId) return;

    setIsProcessingPurchase(true);
    setLoadingStep(1); // Saving your updates
    await new Promise(r => setTimeout(r, 1000));
    setLoadingStep(2); // Adding party & items
    await new Promise(r => setTimeout(r, 1200));
    setLoadingStep(3); // Creating purchase
    await new Promise(r => setTimeout(r, 1000));

    try {
      // Actually create a purchase in the database
      await addDoc(collection(db, "purchases"), {
        customerName: selectedParty.name,
        customerPhone: selectedParty.phone,
        purchaseInvoiceNumber: `PUR-${showAiModal.number}`,
        date: showAiModal.date,
        total: showAiModal.amount,
        subtotal: showAiModal.amount,
        items: showAiModal.items.map(i => ({
          name: i.name,
          qty: i.qty,
          price: i.rate,
          amount: i.qty * i.rate
        })),
        status: "unpaid",
        balanceDue: showAiModal.amount,
        userId: userId,
        createdAt: serverTimestamp(),
        source: "SharedLedger_AI"
      });

      // Update UI state
      setParties(prev => prev.map(p => {
        if (p.id !== selectedParty.id) return p;
        return {
          ...p,
          transactions: p.transactions.map(t => t.id === showAiModal.id ? { ...t, actionStatus: "converted" } : t)
        };
      }));

      toast.success("Purchase created successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create purchase");
    } finally {
      setIsProcessingPurchase(false);
      setLoadingStep(0);
      setShowAiModal(null);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
           <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
           <span className="text-sm font-semibold">Syncing website data...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="print-area" className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans print:shadow-none print:border-none print:m-0 print:h-auto print:min-h-0 print:block">
      
      {/* LEFT COLUMN: List */}
      <div className="w-[320px] border-r border-gray-200 flex flex-col bg-white shrink-0">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-800">SharedLedger</h2>
            <button onClick={() => setShowHowItWorks(true)} className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold uppercase hover:bg-blue-100 transition-colors">
              <PlayCircle size={12} />
              How it Works?
            </button>
          </div>
          <button className="p-1.5 text-gray-400 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            <Settings size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by Party Name or Number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredParties.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-gray-400">No synchronized data found</div>
          ) : (
            filteredParties.map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedPartyId(p.id)}
                className={`w-full text-left p-4 flex items-center justify-between hover:bg-indigo-50/30 transition-colors ${selectedPartyId === p.id ? "bg-indigo-50/50 border-l-2 border-indigo-500" : "border-l-2 border-transparent"}`}
              >
                <div>
                  <h3 className="text-xs font-bold text-gray-800 truncate w-40 flex items-center gap-1.5">
                    {p.name}
                    {p.transactions.length > 0 && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded leading-none">↹</span>}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">{p.type}</p>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${p.balance > 0 ? "text-red-600" : "text-gray-600"}`}>
                    ₹{Math.abs(p.balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {p.balance > 0 ? "↓" : p.balance < 0 ? "↑" : ""}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* Refer Bottom Button */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
           <button onClick={() => setShowQrModal(true)} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-indigo-200 text-indigo-600 rounded text-xs font-bold hover:bg-indigo-50 shadow-sm transition-colors">
              <QrCode size={14} /> Connect via QR
           </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Details */}
      <div className="flex-1 flex flex-col bg-[#fafafc] relative">
        
        {selectedParty ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
               <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                  <FileText size={16} className="text-gray-400" />
                  Ledger Created by {selectedParty.name}
               </div>
               <div className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                 View Only Mode
               </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
               
               {/* Party Details Card */}
               <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 w-[400px] mb-6">
                 <div className="flex items-center gap-2 mb-4">
                   <FileText size={14} className="text-gray-400" />
                   <h4 className="text-xs font-bold text-gray-700">Party Details</h4>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Party Name</p>
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                         {selectedParty.name} 
                         <span className="text-orange-500">↹</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Balance</p>
                      <p className={`text-xs font-bold ${selectedParty.balance > 0 ? 'text-red-600' : selectedParty.balance < 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {selectedParty.balance > 0 ? "↓ " : selectedParty.balance < 0 ? "↑ " : ""}
                        ₹{Math.abs(selectedParty.balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Party Type</p>
                      <p className="text-xs font-bold text-gray-800">{selectedParty.actualType}</p>
                    </div>
                 </div>
               </div>

               {/* Table Area Header */}
               <div className="flex justify-between items-center mb-4">
                 <div className="relative">
                   <select 
                     value={dateFilter}
                     onChange={(e) => setDateFilter(e.target.value)}
                     className="appearance-none pl-3 pr-8 py-1.5 text-xs text-gray-500 font-semibold bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer shadow-sm focus:outline-none focus:border-indigo-500"
                   >
                     <option value="30">Last 30 Days</option>
                     <option value="90">Last 90 Days</option>
                     <option value="365">Last 365 Days</option>
                     <option value="all">All Time</option>
                   </select>
                   <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                 </div>
                 <button onClick={downloadLedgerCSV} className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 font-bold shadow-sm">
                   <Download size={14} />
                   Download Ledger
                 </button>
               </div>

               {/* Transactions Table */}
               <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                 <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-700 font-bold">
                       <tr>
                         <th className="px-4 py-3 cursor-pointer">Date ↕</th>
                         <th className="px-4 py-3">Transaction Type</th>
                         <th className="px-4 py-3">Transaction Number</th>
                         <th className="px-4 py-3">Amount ↕</th>
                         <th className="px-4 py-3">Status</th>
                         <th className="px-4 py-3 text-right"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-400">No transactions recorded yet.</td>
                        </tr>
                      ) : (
                        filteredTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setShowInvoiceModal(t)}>
                            <td className="px-4 py-3 text-gray-600">{t.date}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{t.type}</td>
                            <td className="px-4 py-3 text-gray-600">{t.number}</td>
                            <td className="px-4 py-3 font-bold text-gray-800">₹{t.amount.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              {t.status === "Unpaid" ? (
                                <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold">Unpaid</span>
                              ) : (
                                <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Completed</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                               {t.actionStatus === "pending" && t.type === "Sales Invoices" ? (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleStartPurchaseConversion(t); }} 
                                   className="text-indigo-600 font-bold flex items-center justify-end gap-1 w-full hover:underline"
                                 >
                                   <FileText size={12} /> Convert to Purchase
                                 </button>
                               ) : t.actionStatus === "converted" ? (
                                 <span className="text-gray-400 flex items-center justify-end gap-1 font-medium">
                                   <CheckCircle2 size={12} /> Converted to Purchase
                                 </span>
                               ) : (
                                 <span className="text-gray-400 flex items-center justify-end gap-1 font-medium">
                                   <CheckCircle2 size={12} /> Already Recorded
                                 </span>
                               )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Select a Party</h3>
            <p className="text-xs text-gray-500">Choose a party from the left to view their SharedLedger.</p>
          </div>
        )}
      </div>

      {/* QR CODE MODAL (Referral) */}
      {showQrModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Smartphone size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-800 text-center mb-2">Scan to Connect</h2>
            <p className="text-xs text-gray-500 text-center mb-6 max-w-[250px]">
              Ask your supplier or customer to scan this QR code with their phone camera to instantly share their ledger.
            </p>
            
            <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl mb-6 flex items-center justify-center relative">
               <QRCode 
                 value={`https://app.mybillbook.in/ledger-connect/${businessName}`} 
                 size={150} 
                 fgColor="#312e81" 
                 level="M"
               />
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-1 rounded shadow-sm border border-gray-100">
                    <span className="text-orange-500 font-bold text-xl leading-none">↹</span>
                  </div>
               </div>
            </div>

            <button onClick={() => setShowQrModal(false)} className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* VIEW INVOICE MODAL (Mock PDF View) */}
      {showInvoiceModal && selectedParty && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center shrink-0 rounded-t-lg print:hidden">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-gray-800 text-sm">Invoice #{showInvoiceModal.number}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadInvoice} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded text-xs font-bold hover:bg-gray-50 transition-colors bg-white">
                  <Download size={14} /> Download Invoice
                </button>
                <button onClick={() => setShowInvoiceModal(null)} className="p-1 border border-gray-200 rounded text-gray-400 hover:bg-gray-100 bg-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body (The Invoice Document) */}
            <div className="p-6 overflow-y-auto flex justify-center bg-gray-100 flex-1 print:p-0 print:bg-white print:overflow-visible">
               <div className="bg-white p-8 w-[210mm] min-h-[297mm] shadow-md border border-gray-200 text-xs text-gray-800 relative print:shadow-none print:border-none print:m-0 print:w-full">
                  
                  <div className="text-[10px] text-gray-400 mb-2 font-bold tracking-wider">BILL OF SUPPLY <span className="px-2 py-0.5 border border-gray-200 ml-2 rounded text-[9px]">ORIGINAL FOR RECIPIENT</span></div>
                  
                  {/* Company Header */}
                  <div className="border border-gray-800 p-4 mb-4 text-center">
                    <h1 className="text-lg font-bold uppercase">{selectedParty.name}</h1>
                    <p className="text-[10px]">Shop No. 60, opposite Bus Stand Road, Lajpat Nagar, Model Gram, Ludhiana, Punjab 141002</p>
                    <p className="text-[10px] font-bold mt-1">Mobile: {selectedParty.phone}</p>
                  </div>

                  <div className="flex border border-gray-800 mb-4 divide-x divide-gray-800">
                    <div className="w-1/2 p-3">
                      <p className="font-bold uppercase text-[10px] mb-1">Bill To</p>
                      <h3 className="font-bold text-sm uppercase">{businessName}</h3>
                      <p className="text-[10px] mt-1 text-gray-600">Address: Delhi, South West Delhi, Delhi, 110043</p>
                    </div>
                    <div className="w-1/2 p-3 grid grid-cols-2 gap-y-2">
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Invoice No.</p>
                        <p className="font-bold">{showInvoiceModal.number}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Invoice Date</p>
                        <p className="font-bold">{showInvoiceModal.date}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Due Date</p>
                        <p className="font-bold">-</p>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full border-collapse border border-gray-800 text-xs mb-4">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-800 p-2 w-12 text-center">S.NO.</th>
                        <th className="border border-gray-800 p-2 text-center">ITEMS/SERVICES</th>
                        <th className="border border-gray-800 p-2 text-center w-24">QTY.</th>
                        <th className="border border-gray-800 p-2 text-center w-24">RATE</th>
                        <th className="border border-gray-800 p-2 text-center w-24">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showInvoiceModal.items.length > 0 ? showInvoiceModal.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border-l border-r border-gray-800 p-2 text-center">{idx + 1}</td>
                          <td className="border-l border-r border-gray-800 p-2">
                            <span className="font-bold">{item.name}</span>
                          </td>
                          <td className="border-l border-r border-gray-800 p-2 text-center font-bold">{item.qty}</td>
                          <td className="border-l border-r border-gray-800 p-2 text-center">{item.rate}</td>
                          <td className="border-l border-r border-gray-800 p-2 text-right">{item.qty * item.rate}</td>
                        </tr>
                      )) : (
                         <tr>
                          <td className="border-l border-r border-gray-800 p-2 text-center text-gray-300">-</td>
                          <td className="border-l border-r border-gray-800 p-2 text-gray-400 italic">No Items</td>
                          <td className="border-l border-r border-gray-800 p-2 text-center text-gray-300">-</td>
                          <td className="border-l border-r border-gray-800 p-2 text-center text-gray-300">-</td>
                          <td className="border-l border-r border-gray-800 p-2 text-right text-gray-300">-</td>
                        </tr>
                      )}
                      
                      {/* Empty rows filler */}
                      <tr className="h-24">
                          <td className="border-l border-r border-gray-800"></td>
                          <td className="border-l border-r border-gray-800"></td>
                          <td className="border-l border-r border-gray-800"></td>
                          <td className="border-l border-r border-gray-800"></td>
                          <td className="border-l border-r border-gray-800"></td>
                      </tr>

                      <tr className="border border-gray-800 font-bold bg-gray-50">
                        <td colSpan={2} className="border border-gray-800 p-2 text-right">TOTAL</td>
                        <td className="border border-gray-800 p-2 text-center">-</td>
                        <td className="border border-gray-800 p-2 text-center"></td>
                        <td className="border border-gray-800 p-2 text-right">₹{showInvoiceModal.amount}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex border border-gray-800">
                    <div className="w-1/2 p-2 border-r border-gray-800 flex justify-between">
                       <span>Received Amount: ₹0</span>
                    </div>
                    <div className="w-1/2 p-2 font-bold flex justify-between bg-gray-50">
                       <span>Balance Amount: ₹{showInvoiceModal.amount}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-8 right-8 text-center text-gray-300 font-bold text-4xl opacity-20 -rotate-12 pointer-events-none">
                     MYBILLBOOK
                  </div>

               </div>
            </div>

            {/* Modal Footer Action */}
            <div className="p-4 bg-white border-t border-gray-200 flex justify-end shrink-0 rounded-b-lg">
              {showInvoiceModal.actionStatus === "recorded" ? (
                <button disabled className="px-6 py-2.5 bg-gray-100 text-gray-400 font-bold rounded text-sm flex items-center gap-2 cursor-not-allowed border border-gray-200">
                  <CheckCircle2 size={16} /> Already Recorded
                </button>
              ) : showInvoiceModal.actionStatus === "converted" ? (
                <button disabled className="px-6 py-2.5 bg-gray-100 text-gray-400 font-bold rounded text-sm flex items-center gap-2 cursor-not-allowed border border-gray-200">
                  <CheckCircle2 size={16} /> Converted
                </button>
              ) : (
                <button 
                  onClick={() => markAsRecorded(showInvoiceModal.id)}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <CheckCircle2 size={16} className="text-gray-400" /> Mark as Already Recorded
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI CONVERT TO PURCHASE MODAL */}
      {showAiModal && selectedParty && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative">
             
             {isProcessingPurchase ? (
                <div className="p-12 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <Search className="text-blue-500 animate-pulse" size={32} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg mb-8">Creating purchase</h3>
                  
                  <div className="w-full space-y-4">
                     <div className="flex items-center gap-3">
                       <CheckCircle2 size={18} className={loadingStep >= 1 ? "text-indigo-600" : "text-gray-300"} />
                       <span className={`text-sm ${loadingStep >= 1 ? "text-gray-800 font-medium" : "text-gray-400"}`}>Saving your updates</span>
                     </div>
                     <div className="flex items-center gap-3">
                       <CheckCircle2 size={18} className={loadingStep >= 2 ? "text-indigo-600" : "text-gray-300"} />
                       <span className={`text-sm ${loadingStep >= 2 ? "text-gray-800 font-medium" : "text-gray-400"}`}>Adding party & items</span>
                     </div>
                     <div className="flex items-center gap-3">
                       {loadingStep >= 3 ? (
                         <CheckCircle2 size={18} className="text-indigo-600" />
                       ) : (
                         <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin"></div>
                       )}
                       <span className={`text-sm ${loadingStep >= 3 ? "text-gray-800 font-medium" : "text-gray-400"}`}>Creating purchase</span>
                     </div>
                  </div>
                </div>
             ) : (
                <>
                  <div className="bg-[#fff8eb] p-4 flex items-start gap-3 border-b border-orange-100">
                    <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-bold text-gray-800 leading-snug">
                      Please check the details wisely before proceeding, as <span className="text-orange-500">AI can make mistakes.</span>
                    </p>
                    <button onClick={() => setShowAiModal(null)} className="text-gray-400 hover:text-gray-600 ml-auto shrink-0">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="p-6">
                     <div className="flex justify-between text-xs text-gray-500 font-bold mb-1">
                        <span>#{showAiModal.number}</span>
                        <span>{showAiModal.date}</span>
                     </div>
                     <h3 className="font-bold text-gray-800 text-lg mb-6">{selectedParty.name}</h3>

                     <div className="flex justify-between items-center text-sm font-bold text-gray-800 border-t border-gray-100 pt-4 mb-8">
                       <span className="text-gray-500">{showAiModal.items.length} item{showAiModal.items.length > 1 ? 's' : ''}</span>
                       <span>₹{showAiModal.amount.toLocaleString()}</span>
                     </div>

                     <button 
                       onClick={executePurchaseConversion}
                       className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-md mb-3"
                     >
                       Yes, Continue
                     </button>
                     <button 
                       onClick={() => setShowAiModal(null)}
                       className="w-full py-3 bg-white text-gray-500 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                     >
                       Cancel
                     </button>
                  </div>
                </>
             )}
          </div>
        </div>
      )}

      {/* HOW IT WORKS MODAL */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative">
            <div className="p-4 bg-indigo-600 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <PlayCircle size={18} />
                <h3 className="font-bold text-sm">How SharedLedger Works</h3>
              </div>
              <button onClick={() => setShowHowItWorks(false)} className="text-indigo-200 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6 text-sm text-gray-700">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Connect with Parties</h4>
                    <p className="text-xs text-gray-600">Scan the QR code to connect your account with your suppliers or customers using myBillBook.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Live Sync</h4>
                    <p className="text-xs text-gray-600">Whenever they create a bill for you, it instantly appears in your SharedLedger.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Convert to Purchase</h4>
                    <p className="text-xs text-gray-600">Click &quot;Convert to Purchase&quot; to auto-magically record their Sales Invoice as your Purchase Invoice without any data entry.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setShowHowItWorks(false)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition-colors text-xs">Got it</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
