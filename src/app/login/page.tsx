"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { FirebaseError } from "firebase/app";
import { QrCode, ShieldCheck, CheckCircle2, X } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return toast.error("All fields are required");
    }

    if (!email.includes("@")) {
      return toast.error("Enter a valid email");
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);

      toast.success("Welcome back 👋");
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (
          error.code === "auth/wrong-password" ||
          error.code === "auth/invalid-credential"
        ) {
          toast.error("Invalid email or password");
        } else if (error.code === "auth/user-not-found") {
          toast.error("User not found");
        } else if (error.code === "auth/invalid-email") {
          toast.error("Invalid email format");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-slate-100 select-none relative px-6 py-12">
      {/* Top Right Close Button */}
      <button 
        onClick={() => router.push("/")}
        className="absolute top-6 right-6 p-2 rounded-full bg-white text-gray-400 hover:text-gray-600 transition shadow-sm border border-slate-200"
      >
        <X size={20} />
      </button>

      {/* Main card */}
      <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-3xl p-8 shadow-xl flex flex-col items-center">
        
        {/* Brand Logo Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-orange-500 rounded-lg text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 22l20-20L12 12z" />
            </svg>
          </div>
          <span className="text-xl font-extrabold text-gray-900 tracking-tight">my<span className="text-orange-500">BillBook</span></span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="text-left space-y-1">
            <p className="text-[13px] font-bold text-gray-500">Login to your account</p>
          </div>

          {/* Email field */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
          />

          {/* Password field */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
          />

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] duration-150 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Signup CTA link */}
        <p className="text-sm text-gray-500 mt-5 text-center">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-indigo-600 font-bold hover:underline">
            Sign up
          </Link>
        </p>

        {/* OR Line Divider */}
        <div className="w-full flex items-center my-6">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="px-3 text-xs font-semibold text-slate-400 select-none">Or</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* QR Scan Button */}
        <button
          type="button"
          onClick={() => toast.success("QR Scan opened! Please present your device.")}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 border border-slate-200 rounded-xl bg-[#2D3748] text-white hover:bg-slate-800 transition text-sm font-bold active:scale-[0.98] duration-150 shadow-sm"
        >
          <QrCode size={18} />
          Login by scanning QR code
        </button>

        {/* Security tags at the bottom */}
        <div className="w-full flex justify-center gap-6 mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            100% secure
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <CheckCircle2 size={14} className="text-emerald-500" />
            ISO 27001 Certified
          </div>
        </div>

      </div>
    </section>
  );
}