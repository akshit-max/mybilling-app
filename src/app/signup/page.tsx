"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { Check, ArrowRight, ShieldCheck, CheckCircle2, FileText, LayoutDashboard, Headset } from "lucide-react";

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 States (Authentication & Business details)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [requirement, setRequirement] = useState<"android" | "laptop">("laptop");

  // Step 2 States (Customer Segments)
  const [customerType, setCustomerType] = useState<"retail" | "wholesale">("retail");
  const [language, setLanguage] = useState("English");

  const handleStep1Continue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      return toast.error("Email and Password are required fields");
    }
    if (!email.includes("@")) {
      return toast.error("Enter a valid email address");
    }
    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    if (!businessName.trim()) {
      return toast.error("Business Name is a required field");
    }
    if (!city.trim()) {
      return toast.error("City is a required field");
    }

    try {
      setLoading(true);
      // Perform Firebase Auth account creation
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Save user business details to settings collection
      await setDoc(doc(db, "settings", user.uid), {
        businessName: businessName.trim(),
        city: city.trim(),
        requirement,
        email: email.trim(),
        createdAt: new Date()
      }, { merge: true });

      toast.success("Account created 🎉 Let's complete the final details.");
      setStep(2);
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === "auth/email-already-in-use") {
          toast.error("Email already in use");
        } else if (error.code === "auth/invalid-email") {
          toast.error("Invalid email format");
        } else if (error.code === "auth/weak-password") {
          toast.error("Password is too weak");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "settings", user.uid), {
          customerType,
          language,
          updatedAt: new Date()
        }, { merge: true });
      }
      toast.success("Setup completed successfully! Welcome to myBillBook 🚀");
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save final details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 flex items-center justify-center select-none overflow-x-hidden">
      
      {step === 3 ? (
        /* ================= STEP 3 SCREEN ================= */
        <div className="w-full max-w-4xl px-6 text-center space-y-10 py-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            How would you like to get started?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Create Invoice Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between items-center text-center space-y-6">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                <FileText size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Create Invoice</h3>
                <p className="text-xs text-gray-400 mt-2">Start by creating your first invoice</p>
              </div>
              <button 
                onClick={() => router.push("/dashboard/invoices/create")}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-95 duration-150"
              >
                Create Invoice
              </button>
            </div>

            {/* Explore Dashboard Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between items-center text-center space-y-6">
              <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                <LayoutDashboard size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Explore Dashboard</h3>
                <p className="text-xs text-gray-400 mt-2">Browse all features at your own pace</p>
              </div>
              <button 
                onClick={() => router.push("/dashboard")}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-95 duration-150"
              >
                Explore Now
              </button>
            </div>

            {/* Book Demo Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between items-center text-center space-y-6">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Headset size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Book Demo</h3>
                <p className="text-xs text-gray-400 mt-2">Get a demo from our expert team</p>
              </div>
              <button 
                onClick={() => {
                  toast.success("Demo Booked! Our expert will call you shortly.");
                  router.push("/dashboard");
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-95 duration-150"
              >
                Book Demo
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= ONBOARDING STEP 1 & 2 DUAL PANELS ================= */
        <div className="w-full min-h-screen grid lg:grid-cols-2">
          
          {/* LEFT SIDE BRICK PANEL */}
          <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-50 border-r border-slate-200 select-none text-center items-center relative overflow-hidden">
            <div className="my-auto space-y-8 relative z-10 flex flex-col items-center">
              {/* Welcome text */}
              <p className="text-xl font-bold text-gray-800 flex items-center gap-1.5 justify-center">
                Welcome <span className="text-2xl animate-bounce">🙏</span> to
              </p>

              {/* myBillBook Logo */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-2xl text-white shadow-md shadow-orange-500/20">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 22l20-20L12 12z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">my<span className="text-orange-500">BillBook</span></h1>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest text-left mt-0.5 uppercase">by flobiz</p>
                </div>
              </div>
            </div>

            {/* Bottom secure banner */}
            <div className="flex flex-col items-center space-y-2 relative z-10 mt-auto pt-6">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-500" /> 100% Secure</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500" /> ISO Certified</span>
              </div>
              <p className="text-xs font-bold text-slate-500 pt-1">Trusted by <span className="text-orange-500">1 Crore+</span> Businesses</p>
            </div>
          </div>

          {/* RIGHT SIDE FORM PANEL */}
          <div className="flex flex-col justify-center px-6 sm:px-16 py-12 bg-white max-w-xl mx-auto lg:max-w-none lg:w-full">
            <div className="max-w-md lg:max-w-[450px] mx-auto w-full space-y-8">
              
              {/* Header Title */}
              <div className="text-left space-y-4">
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  Let&apos;s set up myBillBook<br/>for your business
                </h2>

                {/* Step indicator pipeline */}
                <div className="flex items-center gap-3 pt-2 select-none">
                  {/* Step 1 Checkmark */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition duration-300 ${
                    step > 1 ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 border-2 border-indigo-600"
                  }`}>
                    {step > 1 ? <Check size={12} strokeWidth={3} /> : "1"}
                  </div>
                  <div className="w-16 h-[2px] bg-slate-200 rounded-full">
                    <div className={`h-[2px] rounded-full transition-all duration-300 ${step > 1 ? "w-full bg-indigo-600" : "w-0 bg-indigo-200"}`}></div>
                  </div>
                  {/* Step 2 Indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition duration-300 ${
                    step === 2 ? "bg-indigo-50 text-indigo-600 border-2 border-indigo-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    2
                  </div>
                </div>
              </div>

              {step === 1 ? (
                /* ================= STEP 1 FORM ================= */
                <form onSubmit={handleStep1Continue} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-gray-600">Email Address *</label>
                    <input
                      type="email"
                      placeholder="Enter Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-gray-600">Password (Min 6 Characters) *</label>
                    <input
                      type="password"
                      placeholder="Enter Secure Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                    />
                  </div>

                  {/* Business Name Field */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-gray-600">Your Business Name *</label>
                    <input
                      type="text"
                      placeholder="Enter Business Name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                    />
                  </div>

                  {/* City Search Field */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-gray-600">Which City? *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search Cities"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                      />
                      <svg className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Billing Requirement Radio group */}
                  <div className="space-y-2 text-left pt-1">
                    <label className="text-xs font-bold text-gray-600">Select your billing requirement *</label>
                    <div className="space-y-2">
                      {/* Basic android */}
                      <label 
                        onClick={() => setRequirement("android")}
                        className={`flex items-center justify-between p-3.5 border rounded-2xl cursor-pointer transition select-none ${
                          requirement === "android" ? "border-indigo-600 bg-indigo-50/30" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-800">Basic Billing on Android App</span>
                        <input
                          type="radio"
                          name="requirement"
                          checked={requirement === "android"}
                          onChange={() => setRequirement("android")}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                      </label>

                      {/* Professional Laptop */}
                      <label 
                        onClick={() => setRequirement("laptop")}
                        className={`flex items-center justify-between p-3.5 border rounded-2xl cursor-pointer transition select-none ${
                          requirement === "laptop" ? "border-indigo-600 bg-indigo-50/30" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-800">Billing, Stock Keeping, Collections on Laptop & App</span>
                        <input
                          type="radio"
                          name="requirement"
                          checked={requirement === "laptop"}
                          onChange={() => setRequirement("laptop")}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Continue CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] duration-150 flex items-center justify-center gap-1"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Continue <ArrowRight size={16} /></>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center pt-2">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                      Login
                    </Link>
                  </p>
                </form>
              ) : (
                /* ================= STEP 2 FORM ================= */
                <form onSubmit={handleFinishSetup} className="space-y-6">
                  {/* Customers Type Radio Select */}
                  <div className="space-y-2.5 text-left">
                    <label className="text-xs font-bold text-gray-600">Who are your major customers? *</label>
                    <div className="space-y-3">
                      {/* Retail */}
                      <label 
                        onClick={() => setCustomerType("retail")}
                        className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition select-none ${
                          customerType === "retail" ? "border-indigo-600 bg-indigo-50/30" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-800">Retail Customers</span>
                        <input
                          type="radio"
                          name="customerType"
                          checked={customerType === "retail"}
                          onChange={() => setCustomerType("retail")}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                      </label>

                      {/* Wholesalers */}
                      <label 
                        onClick={() => setCustomerType("wholesale")}
                        className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition select-none ${
                          customerType === "wholesale" ? "border-indigo-600 bg-indigo-50/30" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-800">Distributors / Wholesalers</span>
                        <input
                          type="radio"
                          name="customerType"
                          checked={customerType === "wholesale"}
                          onChange={() => setCustomerType("wholesale")}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Language Selector Dropdown */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-gray-600">Which language are you most comfortable in? *</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 bg-white outline-none focus:border-indigo-600 transition"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Hinglish">Hinglish</option>
                      <option value="Marathi">Marathi</option>
                      <option value="Tamil">Tamil</option>
                    </select>
                  </div>

                  {/* Buttons group (Back and Finish) */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-slate-50 transition active:scale-[0.98]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] py-3.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] duration-150"
                    >
                      Finish Setup
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      )}

    </section>
  );
}