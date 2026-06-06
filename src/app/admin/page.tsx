"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ShieldCheck, CheckCircle2, X, Info, Users } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { FirebaseError } from "firebase/app";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // If already logged in, check if they are the super admin
        try {
          const platSnap = await getDoc(doc(db, "platformSettings", "security"));
          if (platSnap.exists() && platSnap.data().superAdminUid === user.uid) {
             router.replace("/superadmin");
             return;
          }
        } catch(e) {}
      }
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Enter email and password");

    setLoading(true);
    try {
      // 1. Try to sign in
      let user;
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        user = cred.user;
      } catch (err: any) {
        // If they don't exist, try to create them (they might be the first admin)
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-login-credentials") {
          try {
             const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
             user = cred.user;
          } catch (createErr: any) {
             if (createErr.code === "auth/email-already-in-use") {
                throw new Error("Invalid email or password.");
             }
             throw createErr;
          }
        } else {
          throw err;
        }
      }

      // 2. Now that we are authenticated, check if a Super Admin is already registered
      const platSnap = await getDoc(doc(db, "platformSettings", "security"));
      const isConfigured = platSnap.exists() && !!platSnap.data()?.superAdminUid;

      if (!isConfigured) {
        // First time initialization!
        await setDoc(doc(db, "platformSettings", "security"), { superAdminUid: user.uid }, { merge: true });
        toast.success("Platform Admin Initialized!");
        router.push("/superadmin");
      } else {
        // Normal Login Check
        const savedUid = platSnap.data()?.superAdminUid;
        if (user.uid !== savedUid) {
           await auth.signOut();
           toast.error("Access Denied: Not the Platform Admin.");
           return;
        }
        
        toast.success("Welcome, Platform Owner");
        router.push("/superadmin");
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("Password reset link sent to your email!");
      setIsResetMode(false);
    } catch (error: any) {
      if (error instanceof FirebaseError) {
        if (error.code === "auth/user-not-found") {
          toast.error("User not found");
        } else if (error.code === "auth/invalid-email") {
          toast.error("Invalid email format");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return null;

  return (
    <section className="min-h-screen grid lg:grid-cols-2 select-none bg-white font-sans">
      
      {/* LEFT SIDE: Premium Hero Graphic Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0A1128] relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-[#F97316]/40 to-transparent blur-3xl transform rotate-12 rounded-full"></div>
          <div className="absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl from-blue-500/20 to-transparent blur-3xl transform -rotate-12 rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F97316] rounded-xl text-white shadow-lg shadow-[#F97316]/30 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">Cloud <span className="text-[#F97316]/80">Ledger</span> Admin</span>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="max-w-md space-y-6 my-auto">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Platform Command Center.
            </h1>
            <p className="text-lg text-slate-300 font-medium">
              Oversee platform health, analyze growth, and manage global subscriptions from a secure portal.
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-6 text-sm font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#F97316]/80" />
              End-to-End Encrypted
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#F97316]/80" />
              Owner Access Only
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Form Panel */}
      <div className="flex flex-col justify-center px-6 sm:px-16 py-12 bg-slate-50 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>
        
        {/* Top Right Close Button */}
        <button 
          onClick={() => router.push("/")}
          className="absolute top-6 right-6 p-2 rounded-full bg-white ring-1 ring-gray-200 text-slate-400 hover:text-slate-900 hover:bg-gray-50 transition-colors shadow-sm z-20"
        >
          <X size={20} />
        </button>

        <div className="relative z-10 w-full max-w-[440px] mx-auto flex flex-col bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-[#F97316]/5 ring-1 ring-[#F97316]/5">
          
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="p-2 bg-[#F97316] rounded-lg text-white shadow-md flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">Cloud <span className="text-[#F97316]">Ledger</span> Admin</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              Platform Owner
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Sign in to access the SaaS management dashboard
            </p>
          </div>

          <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all font-medium sm:text-sm placeholder:text-slate-400"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            {!isResetMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-xs font-bold text-[#F97316] hover:text-[#F97316] transition-colors"
                    tabIndex={-1}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all font-medium sm:text-sm placeholder:text-slate-400 tracking-widest"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}
{/* 
            {!isResetMode && (
              <div className="bg-[#FFF7ED]/50 border border-[#F97316]/20 rounded-lg p-3 flex gap-3 mt-4">
                <Info className="text-[#F97316]/90 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-[#F97316] font-medium leading-relaxed">
                  If this is your first time logging in, entering an email and password will automatically initialize and register the Platform Owner account.
                </p>
              </div>
            )} */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : (isResetMode ? "Send Reset Link" : "Secure Login")}
            </button>

            {isResetMode && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="text-xs font-bold text-slate-500 hover:text-[#F97316] transition-colors"
                >
                  Back to Login
                </button>
              </div>
            )}

          </form>

          <div className="mt-8 text-center">
            <div className="pt-6 border-t border-slate-100">
              <Link href="/login" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FFF7ED] hover:bg-[#FFF7ED] text-sm font-bold text-[#F97316] hover:text-[#F97316] transition-all group">
                <Users size={16} className="text-[#F97316]/80 group-hover:text-[#F97316] transition-colors" /> 
                <span className="tracking-wide">Return to User Login</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
