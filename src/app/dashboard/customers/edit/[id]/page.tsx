"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Settings, Landmark } from "lucide-react";

export default function EditPartyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDocs(
            query(collection(db, "customerCategories"), where("userId", "==", user.uid))
          );
          const data = snap.docs.map(d => ({
            id: d.id,
            name: d.data().name || ""
          }));
          setCategories(data);
        } catch (err) {
          console.error("Categories fetch error:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openingBalanceType, setOpeningBalanceType] = useState<"collect" | "pay">("collect");
  const [gstin, setGstin] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [type, setType] = useState<"Customer" | "Supplier">("Customer");
  const [category, setCategory] = useState("");
  
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const [creditPeriod, setCreditPeriod] = useState("30");
  const [creditLimit, setCreditLimit] = useState("0");

  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonDob, setContactPersonDob] = useState("");

  const [showBankForm, setShowBankForm] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  useEffect(() => {
    const fetchParty = async () => {
      try {
        const ref = doc(db, "customers", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || data.partyName || "");
          setPhone(data.phone || data.mobile || data.mobileNumber || "");
          setEmail(data.email || "");
          setOpeningBalance(String(data.openingBalance || 0));
          setOpeningBalanceType(data.openingBalanceType || "collect");
          setGstin(data.gstin || "");
          setPanNumber(data.panNumber || "");
          setType(data.type || "Customer");
          setCategory(data.category || "");
          setBillingAddress(data.billingAddress || data.address || "");
          setShippingAddress(data.shippingAddress || "");
          setSameAsBilling(data.sameAsBilling !== undefined ? data.sameAsBilling : true);
          setCreditPeriod(String(data.creditPeriod || 30));
          setCreditLimit(String(data.creditLimit || 0));
          setContactPersonName(data.contactPersonName || "");
          setContactPersonDob(data.contactPersonDob || "");

          if (data.bankDetails) {
            setShowBankForm(true);
            setAccountNumber(data.bankDetails.accountNumber || "");
            setIfscCode(data.bankDetails.ifscCode || "");
            setBankName(data.bankDetails.bankName || "");
            setAccountHolderName(data.bankDetails.accountHolderName || "");
          }
        } else {
          toast.error("Party not found.");
          router.push("/dashboard/customers");
        }
      } catch (err) {
        console.error("Failed to load party doc:", err);
        toast.error("Failed to load party details.");
      } finally {
        setLoading(false);
      }
    };

    fetchParty();
  }, [id, router]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      toast.error("Party Name is required");
      return;
    }

    try {
      setSaving(true);

      const bal = Number(openingBalance) || 0;
      const initialBalance = openingBalanceType === "collect" ? bal : -bal;

      const partyData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        openingBalance: bal,
        openingBalanceType,
        balance: initialBalance,
        gstin: gstin.toUpperCase().trim(),
        panNumber: panNumber.toUpperCase().trim(),
        type,
        category: category.trim() || "-",
        billingAddress: billingAddress.trim(),
        shippingAddress: sameAsBilling ? billingAddress.trim() : shippingAddress.trim(),
        sameAsBilling,
        creditPeriod: Number(creditPeriod) || 0,
        creditLimit: Number(creditLimit) || 0,
        contactPersonName: contactPersonName.trim(),
        contactPersonDob,
        // Keep these fields for backward compatibility with old logic
        address: billingAddress.trim(),
      };

      // Add bank details if provided
      const finalData = showBankForm ? {
        ...partyData,
        bankDetails: {
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.toUpperCase().trim(),
          bankName: bankName.trim(),
          accountHolderName: accountHolderName.trim()
        }
      } : {
        ...partyData,
        bankDetails: null // Remove bank details
      };

      await updateDoc(doc(db, "customers", id), finalData);

      toast.success("Party Updated Successfully ✅");
      router.push("/dashboard/customers");
    } catch (err) {
      console.error("Failed to update customer doc:", err);
      toast.error("Failed to update party details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20 text-gray-500">
        <p className="animate-pulse text-xs">Loading party details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 font-sans">
      
      {/* Top sticky navigation bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customers" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-base font-semibold text-gray-800">Edit Party: {name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-medium">
            <Settings size={13} />
            <span>Party Settings</span>
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-6 space-y-5">
        
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Card: General Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/20">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">General Details</h2>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
              
              {/* Party Name */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  PARTY NAME <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  MOBILE NUMBER
                </label>
                <input 
                  type="tel" 
                  placeholder="Enter mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  EMAIL
                </label>
                <input 
                  type="email" 
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* GSTIN */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  GSTIN
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="eg: 29XXXXX0000X0XX"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 uppercase"
                  />
                  <button 
                    type="button"
                    className="bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 text-xs px-4 py-1.5 rounded font-semibold transition-colors"
                  >
                    Get Details
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Note: You can auto populate party details from GSTIN</p>
              </div>

              {/* PAN Number */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  PAN NUMBER
                </label>
                <input 
                  type="text" 
                  placeholder="Enter party PAN Number"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 uppercase"
                />
              </div>

              {/* Opening Balance */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  OPENING BALANCE
                </label>
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <input 
                    type="number" 
                    placeholder="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs focus:outline-none"
                  />
                  <select 
                    value={openingBalanceType}
                    onChange={(e) => setOpeningBalanceType(e.target.value as any)}
                    className="bg-gray-50 text-xs border-l border-gray-200 px-2 outline-none py-1.5 text-gray-600 cursor-pointer font-medium"
                  >
                    <option value="collect">To Collect</option>
                    <option value="pay">To Pay</option>
                  </select>
                </div>
              </div>

              {/* Party Type */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  PARTY TYPE <span className="text-red-500">*</span>
                </label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer text-gray-700 bg-white"
                >
                  <option value="Customer">Customer</option>
                  <option value="Supplier">Supplier</option>
                </select>
              </div>

              {/* Party Category */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  PARTY CATEGORY
                </label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer bg-white text-gray-700 font-medium"
                >
                  <option value="-">None (-)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Card: Address */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/20 flex justify-between items-center">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Address</h2>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span>Same as Billing address</span>
              </label>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Billing Address */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  BILLING ADDRESS
                </label>
                <textarea 
                  rows={3}
                  placeholder="Enter billing address"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Shipping Address */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  SHIPPING ADDRESS
                </label>
                <textarea 
                  rows={3}
                  disabled={sameAsBilling}
                  placeholder={sameAsBilling ? "Same as Billing address" : "Enter shipping address"}
                  value={sameAsBilling ? billingAddress : shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                ></textarea>
              </div>

            </div>
          </div>

          {/* Card: Credit & Limits */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Credit Period */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  CREDIT PERIOD (DAYS)
                </label>
                <input 
                  type="number" 
                  placeholder="30"
                  value={creditPeriod}
                  onChange={(e) => setCreditPeriod(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Credit Limit */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  CREDIT LIMIT (₹)
                </label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

            </div>
          </div>

          {/* Card: Contact Person Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/20">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact Person Details</h2>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Contact Person Name */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  CONTACT PERSON NAME
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Ankit Mishra"
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  DATE OF BIRTH
                </label>
                <input 
                  type="date" 
                  value={contactPersonDob}
                  onChange={(e) => setContactPersonDob(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600"
                />
              </div>

            </div>
          </div>

          {/* Card: Party Bank Account */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Party Bank Account</h2>
            </div>

            {!showBankForm ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-2 border border-gray-200/50">
                  <Landmark size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600">Add party bank information to manage transactions</p>
                <button 
                  type="button" 
                  onClick={() => setShowBankForm(true)}
                  className="text-xs text-indigo-600 font-semibold hover:underline mt-2 flex items-center gap-1"
                >
                  + Add Bank Account
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    ACCOUNT HOLDER NAME
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter name"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    BANK ACCOUNT NUMBER
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter bank account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    IFSC CODE
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter bank IFSC"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    BANK NAME
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter bank name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2 text-right">
                  <button 
                    type="button"
                    onClick={() => setShowBankForm(false)}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold"
                  >
                    Cancel / Remove Bank Account
                  </button>
                </div>
              </div>
            )}
          </div>

        </form>

      </div>

    </div>
  );
}