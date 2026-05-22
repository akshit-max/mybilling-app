"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, PlayCircle, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function GenerateEInvoice() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  
  // Modals
  const [showGSPModal, setShowGSPModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    sellerGstin: "",
    sellerState: "",
    sellerPincode: "",
    sellerAddress: "",
    buyerGstin: "",
    buyerState: "",
    buyerPincode: "",
    buyerAddress: "",
    supplyTypeCode: "B2B",
    transactionType: "Regular",
    shippingBillNo: "",
    shippingBillDate: "",
    port: "",
    refundClaim: "No",
    foreignCurrency: "Select",
    countryCode: "India",
    exportDuty: "",
  });

  const [gspData, setGspData] = useState({
    gstin: "",
    username: "",
    password: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch Company/Settings
        const sRef = doc(db, "settings", user.uid);
        const sSnap = await getDoc(sRef);
        let compData: any = {};
        if (sSnap.exists()) {
          compData = sSnap.data();
          setCompany(compData);
          
          if (!compData.gspUsername || !compData.gspPassword) {
            setShowGSPModal(true);
          }
          setGspData({
            gstin: compData.gstin || "",
            username: compData.gspUsername || "",
            password: compData.gspPassword || ""
          });
        }

        // Fetch Invoice
        const ref = doc(db, "invoices", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const invData = snap.data();
          setInvoice(invData);
          
          // Prefill Form
          setFormData(prev => ({
            ...prev,
            sellerGstin: compData.gstin || "",
            sellerAddress: compData.address || "",
            buyerGstin: invData.customerGSTIN || "",
            buyerAddress: invData.customerAddress || "",
          }));
        } else {
          toast.error("Invoice not found");
          router.push("/dashboard/invoices");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleSaveGSP = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, "settings", user.uid), {
        gspUsername: gspData.username,
        gspPassword: gspData.password,
        gstin: gspData.gstin
      });
      toast.success("GSP Details saved successfully");
      setShowGSPModal(false);
    } catch (err) {
      toast.error("Failed to save GSP details");
    }
  };

  const handleGenerate = async () => {
    // Strict Validation
    if (!formData.sellerGstin || !formData.sellerState || !formData.sellerPincode || !formData.sellerAddress) {
      return toast.error("Please fill all required Seller Details");
    }
    if (!formData.buyerGstin || !formData.buyerState || !formData.buyerPincode || !formData.buyerAddress) {
      return toast.error("Please fill all required Buyer Details");
    }
    if (!formData.supplyTypeCode || !formData.transactionType) {
      return toast.error("Please select Supply Type and Transaction Type");
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(formData.sellerGstin)) return toast.error("Invalid Seller GSTIN format");
    if (!gstinRegex.test(formData.buyerGstin)) return toast.error("Invalid Buyer GSTIN format");

    if (formData.sellerPincode.length !== 6 || isNaN(Number(formData.sellerPincode))) {
      return toast.error("Seller Pincode must be 6 digits");
    }
    if (formData.buyerPincode.length !== 6 || isNaN(Number(formData.buyerPincode))) {
      return toast.error("Buyer Pincode must be 6 digits");
    }

    const loadingToast = toast.loading("Generating e-Invoice via IRP...");
    
    try {
      // Simulate API call to IRP
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const ackNo = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
      const irn = "88cd8605e5d5aaed4a0c7699cf568f038827d976fbc11199fc4a6981438a1c57"; // Dummy hash
      
      // Update Invoice in DB
      await updateDoc(doc(db, "invoices", id), {
        eInvoiceGenerated: true,
        irn: irn,
        ackNo: ackNo,
        ackDate: new Date().toISOString()
      });

      setGeneratedData({ ackNo });
      toast.dismiss(loadingToast);
      setShowSuccessModal(true);

    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to generate e-Invoice");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading workspace...</div>;

  return (
    <div className="flex-1 bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Generate e-Invoice</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-6 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleGenerate} className="px-6 py-2 text-sm font-bold text-white bg-[#4f46e5] rounded hover:bg-[#4338ca] shadow-sm">
            Generate e-Invoice
          </button>
        </div>
      </div>

      {/* FORM CONTENT */}
      <div className="max-w-[1000px] mx-auto p-6 space-y-6">
        
        {/* Top Grid: Seller & Buyer Details */}
        <div className="grid grid-cols-2 gap-6 bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
          {/* Seller */}
          <div className="space-y-4 pr-6 border-r border-gray-100">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Seller Details</h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">GSTIN No <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.sellerGstin}
                onChange={e => setFormData({...formData, sellerGstin: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.sellerState}
                  onChange={e => setFormData({...formData, sellerState: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pincode <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter your pincode"
                  value={formData.sellerPincode}
                  onChange={e => setFormData({...formData, sellerPincode: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
              <textarea 
                value={formData.sellerAddress}
                onChange={e => setFormData({...formData, sellerAddress: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none h-16 resize-none"
              />
            </div>
          </div>

          {/* Buyer */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Buyer Details</h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">GSTIN No <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.buyerGstin}
                onChange={e => setFormData({...formData, buyerGstin: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.buyerState}
                  onChange={e => setFormData({...formData, buyerState: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pincode <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter party pincode"
                  value={formData.buyerPincode}
                  onChange={e => setFormData({...formData, buyerPincode: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
              <textarea 
                value={formData.buyerAddress}
                onChange={e => setFormData({...formData, buyerAddress: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none h-16 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Voucher Details */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Voucher Details</h2>
          <div className="grid grid-cols-2 gap-6 w-1/2">
             <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Supply Type Code <span className="text-red-500">*</span></label>
                <select 
                  value={formData.supplyTypeCode}
                  onChange={e => setFormData({...formData, supplyTypeCode: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="B2B">B2B</option>
                  <option value="SEZWP">SEZWP</option>
                  <option value="SEZWOP">SEZWOP</option>
                  <option value="EXPWP">EXPWP</option>
                  <option value="EXPWOP">EXPWOP</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Transaction Type <span className="text-red-500">*</span></label>
                <select 
                  value={formData.transactionType}
                  onChange={e => setFormData({...formData, transactionType: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="Regular">Regular</option>
                  <option value="Bill To - Ship To">Bill To - Ship To</option>
                  <option value="Bill From - Dispatch From">Bill From - Dispatch From</option>
                  <option value="Combination of 2 and 3">Combination of 2 and 3</option>
                </select>
             </div>
          </div>
        </div>

        {/* Export Details */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Export Details</h2>
          <div className="grid grid-cols-4 gap-4 mb-4">
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Shipping Bill No</label>
               <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Shipping Bill Date</label>
               <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Port</label>
               <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Refund Claim</label>
               <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
                 <option>No</option>
                 <option>Yes</option>
               </select>
             </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Foreign Currency</label>
               <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
                 <option>Select</option>
                 <option>USD</option>
                 <option>EUR</option>
               </select>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Country Code</label>
               <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
                 <option>India</option>
                 <option>USA</option>
               </select>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Export Duty</label>
               <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
             </div>
          </div>
        </div>

      </div>

      {/* MODALS */}
      {showGSPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[800px] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-800">Add GSP details to generate e-Invoicing</h2>
              <button onClick={() => setShowGSPModal(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="flex p-6 gap-8">
              {/* Left Box */}
              <div className="w-[300px] bg-gradient-to-br from-indigo-950 to-fuchsia-800 rounded-xl p-6 text-white flex flex-col justify-center">
                <h3 className="text-2xl font-bold mb-4 leading-tight">How to generate<br/>e-invoices?</h3>
                <p className="text-xs text-white/80 mb-6 leading-relaxed">Watch video on how to add API user on IRP to generate e-invoices</p>
                <button className="bg-white text-red-600 font-bold px-4 py-2 rounded shadow flex items-center justify-center gap-2 w-max text-sm">
                  <PlayCircle size={18} className="fill-red-600 text-white" />
                  Watch Now
                </button>
              </div>
              {/* Right Form */}
              <div className="flex-1 space-y-4">
                <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">Enter your IRP details</h3>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">GSTIN No</label>
                  <input type="text" value={gspData.gstin} onChange={e => setGspData({...gspData, gstin: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm font-mono" />
                </div>
                
                <div className="bg-orange-50 text-orange-800 text-xs p-2 rounded border border-orange-100 font-medium">
                  Enter the GSP username and password from the e-Invoice Portal
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">GSP Username</label>
                  <input type="text" value={gspData.username} onChange={e => setGspData({...gspData, username: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">GSP Password</label>
                  <input type="password" value={gspData.password} onChange={e => setGspData({...gspData, password: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm font-mono tracking-widest" />
                </div>

                <button onClick={handleSaveGSP} className="w-full bg-[#4f46e5] text-white font-bold py-2.5 rounded shadow hover:bg-[#4338ca] mt-4 transition">
                  Save GSP Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden text-center flex flex-col">
            <div className="flex justify-end p-3">
              <button onClick={() => router.push(`/dashboard/invoices/${id}`)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="px-8 pb-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-md">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 leading-tight">e-Invoice has been<br/>generated successfully</h2>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-8">GSTR 1 Report has been updated</p>
              
              <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Acknowledgement Number</p>
              <p className="text-2xl font-black text-indigo-700 font-mono mb-8">{generatedData?.ackNo}</p>
              
              <button 
                onClick={() => router.push(`/dashboard/e-invoicing/print/${id}`)}
                className="w-full bg-[#4f46e5] text-white font-bold py-3.5 rounded shadow hover:bg-[#4338ca] transition"
              >
                Download e-Invoice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
