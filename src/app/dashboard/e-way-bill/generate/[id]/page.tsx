"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function GenerateEWayBill() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  
  // Modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    transactionType: "Regular",
    yourGstin: "",
    fromPincode: "",
    partyGstin: "",
    toPincode: "",
    fromAddress: "",
    toAddress: "",
    fromState: "",
    toState: "",
    transporterId: "",
    approxDistance: "0",
    modeOfTransportation: "Road",
    vehicleNumber: "",
    transporterDocNo: "",
    transporterDocDate: "",
    vehicleType: "Regular",
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
            yourGstin: compData.gstin || "",
            fromAddress: compData.address || "",
            partyGstin: invData.customerGSTIN || "",
            toAddress: invData.customerAddress || "",
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

  const handleGenerate = async () => {
    // Strict Validation
    if (!formData.yourGstin || !formData.fromPincode || !formData.toPincode || !formData.transporterId || !formData.approxDistance) {
      return toast.error("Please fill all required General and Transportation details");
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(formData.yourGstin)) return toast.error("Invalid Your GSTIN format");
    if (formData.partyGstin && !gstinRegex.test(formData.partyGstin)) return toast.error("Invalid Party GSTIN format");

    if (formData.fromPincode.length !== 6 || isNaN(Number(formData.fromPincode))) {
      return toast.error("From Pincode must be 6 digits");
    }
    if (formData.toPincode.length !== 6 || isNaN(Number(formData.toPincode))) {
      return toast.error("To Pincode must be 6 digits");
    }
    
    if (isNaN(Number(formData.approxDistance)) || Number(formData.approxDistance) <= 0) {
      return toast.error("Approximate Distance must be greater than 0 KM");
    }

    const loadingToast = toast.loading("Generating e-Way Bill via NIC...");
    
    try {
      // Simulate API call to NIC Eway Bill Portal
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const ewayBillNo = Math.floor(100000000000 + Math.random() * 900000000000).toString(); // 12 digit
      
      // Update Invoice in DB
      await updateDoc(doc(db, "invoices", id), {
        ewayBillGenerated: true,
        ewayBillNo: ewayBillNo,
        ewayBillDate: new Date().toISOString()
      });

      setGeneratedData({ ewayBillNo });
      toast.dismiss(loadingToast);
      setShowSuccessModal(true);

    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to generate e-Way Bill");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading workspace...</div>;

  return (
    <div className="flex-1 bg-gray-50 min-h-screen font-sans pb-12">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm ">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Generate e-Way Bill</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-6 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleGenerate} className="px-6 py-2 text-sm font-bold text-white bg-[#4f46e5] rounded hover:bg-[#4338ca] shadow-sm">
            Generate e-Way Bill
          </button>
        </div>
      </div>

      {/* FORM CONTENT */}
      <div className="max-w-[1000px] mx-auto p-6 space-y-6">
        
        {/* General Details */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">General Details</h2>
          
          <div className="mb-6 w-1/3">
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

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Your GSTIN No <span className="text-red-500">*</span></label>
              <input type="text" value={formData.yourGstin} onChange={e => setFormData({...formData, yourGstin: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none font-mono" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">From Pincode <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Enter your pincode" value={formData.fromPincode} onChange={e => setFormData({...formData, fromPincode: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Party GSTIN No (If Applicable)</label>
              <input type="text" value={formData.partyGstin} onChange={e => setFormData({...formData, partyGstin: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none font-mono" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">To Pincode <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Enter party pincode" value={formData.toPincode} onChange={e => setFormData({...formData, toPincode: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">From Address</label>
              <textarea value={formData.fromAddress} onChange={e => setFormData({...formData, fromAddress: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none h-16 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">To Address</label>
              <textarea value={formData.toAddress} onChange={e => setFormData({...formData, toAddress: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none h-16 resize-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">From State</label>
              <input type="text" value={formData.fromState} onChange={e => setFormData({...formData, fromState: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">To State</label>
              <input type="text" value={formData.toState} onChange={e => setFormData({...formData, toState: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Transportation Details */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Transportation Details</h2>
          
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Transporter ID <span className="text-red-500">*</span></label>
              <input type="text" placeholder="ex - 12345687" value={formData.transporterId} onChange={e => setFormData({...formData, transporterId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Approx Distance (In KM) <span className="text-red-500">*</span></label>
              <input type="number" value={formData.approxDistance} onChange={e => setFormData({...formData, approxDistance: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex items-center text-[10px] text-gray-400 font-medium">
              Use the Distance Calculator to measure the distance between the place of dispatch and delivery.
            </div>
          </div>
        </div>

        {/* PART B */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">PART B</h2>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mode Of Transportation</label>
              <select value={formData.modeOfTransportation} onChange={e => setFormData({...formData, modeOfTransportation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Ship">Ship</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Number</label>
              <input type="text" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none uppercase font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Transporter's Doc No</label>
              <input type="text" value={formData.transporterDocNo} onChange={e => setFormData({...formData, transporterDocNo: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Transporter's Doc Date</label>
              <input type="date" value={formData.transporterDocDate} onChange={e => setFormData({...formData, transporterDocDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <span className="text-xs font-bold text-gray-700">Vehicle Type</span>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="radio" name="vtype" value="Regular" checked={formData.vehicleType === "Regular"} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="text-indigo-600" />
              Regular
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="radio" name="vtype" value="Over Dimensional Cargo" checked={formData.vehicleType === "Over Dimensional Cargo"} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="text-indigo-600" />
              Over Dimensional Cargo
            </label>
          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden text-center flex flex-col">
            <div className="flex justify-end p-3">
              <button onClick={() => router.push(`/dashboard/invoices/${id}`)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="px-8 pb-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-brand-tertiary rounded-full flex items-center justify-center mb-6 shadow-md">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 leading-tight">e-Way Bill has been<br/>generated successfully</h2>
              
              <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">e-Way Bill Number</p>
              <p className="text-2xl font-black text-indigo-700 font-mono mb-8">{generatedData?.ewayBillNo}</p>
              
              <button 
                onClick={() => router.push(`/dashboard/e-way-bill/print/${id}`)}
                className="w-full bg-[#4f46e5] text-white font-bold py-3.5 rounded shadow hover:bg-[#4338ca] transition"
              >
                Download e-Way Bill
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
