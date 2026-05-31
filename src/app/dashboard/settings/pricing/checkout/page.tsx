"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronUp, AlertCircle, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const loadScript = (src: string) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const plan = searchParams.get("plan") || "Diamond";
  const cycle = searchParams.get("cycle") || "Monthly";

  const [showModal, setShowModal] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    state: "",
    pincode: "",
    hasGst: false,
    gstNumber: "",
    streetAddress: "",
    city: ""
  });

  // Calculate pricing
  let originalPrice = 249;
  if (plan === "Diamond" && cycle === "Yearly") originalPrice = 2599;
  if (plan === "Platinum" && cycle === "Monthly") originalPrice = 299;
  if (plan === "Platinum" && cycle === "Yearly") originalPrice = 2999;
  if (plan === "Enterprise" && cycle === "Monthly") originalPrice = 750;
  if (plan === "Enterprise" && cycle === "Yearly") originalPrice = 4999;

  const gstAmount = Math.round(originalPrice * 0.18);
  const totalPrice = originalPrice + gstAmount;

  // Fetch User details
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData({
              businessName: data.businessName || data.name || "",
              state: data.state || "",
              pincode: data.pincode || "",
              hasGst: !!data.gstNumber,
              gstNumber: data.gstNumber || "",
              streetAddress: data.streetAddress || "",
              city: data.city || ""
            });
          }
        } catch (err) {
          console.error("Failed to fetch user:", err);
        } finally {
          setIsFetchingUser(false);
        }
      } else {
        setIsFetchingUser(false);
      }
    });
    return () => unsub();
  }, []);

  const handlePayment = () => {
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("Please log in to make a payment.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const uid = auth.currentUser.uid;

      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

      if (!res) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        setIsSubmitting(false);
        return;
      }

      // 1. Create Order on Server
      const orderRes = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle })
      });
      
      const orderData = await orderRes.json();
      
      if (!orderRes.ok) {
         toast.error(orderData.error || "Failed to initialize payment. Please check your API keys.");
         setIsSubmitting(false);
         return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "", 
        amount: orderData.amount, // amount from server
        currency: orderData.currency,
        name: "Billing App Premium",
        description: `${plan} Plan - ${cycle}`,
        image: "https://example.com/your_logo", 
        order_id: orderData.id, // ID from server
        handler: async function (response: any) {
          try {
            toast.loading("Verifying payment...", { id: "upgrade" });
            
            // 2. Verify Signature on Server
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            let verifyData;
            try {
               verifyData = await verifyRes.json();
            } catch (e) {
               throw new Error("Server returned an invalid response during verification.");
            }

            if (!verifyRes.ok || !verifyData.verified) {
                toast.error(verifyData?.message || "Payment verification failed!", { id: "upgrade" });
                return;
            }

            toast.loading("Upgrading your plan...", { id: "upgrade" });
            await setDoc(doc(db, "users", uid), {
              businessName: formData.businessName,
              state: formData.state,
              pincode: formData.pincode,
              gstNumber: formData.hasGst ? formData.gstNumber : "",
              streetAddress: formData.streetAddress,
              city: formData.city,
              plan: plan,
              subscriptionCycle: cycle,
              isPaid: true
            }, { merge: true });
            setShowModal(false);
            toast.success("Payment successful! Your plan has been upgraded.", { id: "upgrade", icon: "🎉" });
            router.push("/dashboard/settings/pricing");
          } catch (err: any) {
            console.error(err);
            toast.error(`Failed to upgrade plan: ${err.message || "Unknown error"}`, { id: "upgrade" });
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: auth.currentUser.displayName || "",
          email: auth.currentUser.email || "",
          contact: "" // If you have phone number in auth
        },
        notes: {
          address: formData.streetAddress
        },
        theme: {
          color: "#4F46E5"
        },
        modal: {
          ondismiss: function() {
            setIsSubmitting(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error(err);
      toast.error("Failed to process payment. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f4f5f7] font-sans relative">
      {/* Topbar */}
      <div className="h-14 bg-[#141725] text-white flex items-center px-4 flex-shrink-0 shadow-sm">
        <button onClick={() => router.back()} className="flex items-center gap-2 hover:bg-white/10 p-2 rounded transition-colors text-sm font-medium">
          <ArrowLeft size={18} />
          Checkout
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Selected Plan */}
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500" />
                <span className="font-bold text-gray-800">Selected Plan</span>
                <span className="text-[10px] font-bold text-[#F16D31] bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase tracking-wide">
                  {plan} Plan
                </span>
              </div>
              <ChevronUp size={20} className="text-gray-400" />
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#F16D31]">{plan} {cycle} Plan</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Renews on {new Date(new Date().setMonth(new Date().getMonth() + (cycle === "Monthly" ? 1 : 12))).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (every {cycle === "Monthly" ? "month" : "year"})
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800 text-lg">₹{originalPrice} <span className="text-[10px] font-medium text-gray-500 font-normal">/{cycle === "Monthly" ? "month" : "year"}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Price Details */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Price Details</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Original Price</span>
                <span className="font-bold text-gray-800">₹{originalPrice}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">GST (18%)</span>
                <span className="font-bold text-gray-800">₹{gstAmount}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-100 border-dashed flex items-center justify-between">
                <span className="font-bold text-gray-800 text-sm">Total Price</span>
                <span className="font-black text-indigo-700 text-xl">₹{totalPrice}</span>
              </div>
              
              <button 
                onClick={handlePayment}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold py-3 rounded-lg text-sm shadow-md transition-colors"
              >
                Make Payment
              </button>
            </div>
            
            <div className="bg-amber-50 px-6 py-3 border-t border-amber-100 text-[10px] text-amber-800 flex items-center gap-2">
              <p>
                Auto Renews on <span className="font-bold">{new Date(new Date().setMonth(new Date().getMonth() + (cycle === "Monthly" ? 1 : 12))).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>? Cancel anytime via Dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM BILLING DETAILS MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">Confirm Billing Details</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">Business Name *</label>
                <input 
                  type="text" 
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">State *</label>
                  <select 
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  >
                    <option value="" disabled>Select State</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Pincode</label>
                  <input 
                    type="text" 
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                    className="w-full border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Eg. 400001"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={formData.hasGst}
                  onChange={(e) => setFormData({...formData, hasGst: e.target.checked})}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer border-gray-300"
                />
                <span className="text-[11px] font-medium text-gray-700">I have a GSTIN? Request a B2B invoice for this purchase</span>
              </label>

              {formData.hasGst && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">GST Number *</label>
                  <input 
                    type="text" 
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({...formData, gstNumber: e.target.value})}
                    className="w-full border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Eg. 24AABCG1234A1Z5"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">Street Address *</label>
                <input 
                  type="text" 
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({...formData, streetAddress: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Eg. 15, Hill View Apt, LBS Marg"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">City *</label>
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Eg. Mumbai"
                  required
                />
              </div>

              <div className="bg-gray-50 border border-gray-100 p-3 rounded flex items-start gap-2 mt-4">
                <AlertCircle size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-gray-500">
                  Please ensure correct details are entered so that a valid e-invoice can be generated.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isFetchingUser || isSubmitting}
                  className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
