"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { FirebaseError } from "firebase/app";
import { QrCode, ShieldCheck, CheckCircle2, X } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return toast.error("Please enter your email to reset password");
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("Password reset link sent to your email");
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
        toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen grid lg:grid-cols-2 select-none bg-white font-sans">
      
      {/* LEFT SIDE: Premium Hero Graphic Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand-primary relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-brand-secondary/40 to-transparent blur-3xl transform rotate-12 rounded-full"></div>
          <div className="absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl from-brand-tertiary/20 to-transparent blur-3xl transform -rotate-12 rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-secondary rounded-xl text-white shadow-lg shadow-brand-secondary/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-45 transform">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">my<span className="text-brand-secondary">BillBook</span></span>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="max-w-md space-y-6 my-auto">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Manage your business with absolute clarity.
            </h1>
            <p className="text-lg text-brand-neutral/80 font-medium">
              Join millions of businesses trusting myBillBook for invoicing, inventory, and accounting.
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-6 text-sm font-bold text-brand-neutral/60">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-secondary" />
              100% Secure
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-brand-secondary" />
              ISO 27001 Certified
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
          className="absolute top-6 right-6 p-2 rounded-full bg-white ring-1 ring-gray-200 text-brand-primary/40 hover:text-brand-primary hover:bg-gray-50 transition-colors shadow-sm z-20"
        >
          <X size={20} />
        </button>

        <div className="relative z-10 w-full max-w-[440px] mx-auto flex flex-col bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-brand-primary/5 ring-1 ring-brand-primary/5">
          
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="p-2 bg-brand-secondary rounded-lg text-white shadow-md flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-45 transform">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            </div>
            <span className="text-2xl font-extrabold text-brand-primary tracking-tight">my<span className="text-brand-secondary">BillBook</span></span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-brand-primary tracking-tight">
              {isResetMode ? "Reset Password" : "Welcome back"}
            </h2>
            <p className="text-sm font-semibold text-brand-primary/60 mt-2">
              {isResetMode 
                ? "Enter your email to receive a password reset link" 
                : "Enter your details to access your account"}
            </p>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="w-full space-y-5">

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-brand-primary/70 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-brand-primary/10 bg-slate-50 text-sm font-bold text-brand-primary placeholder:text-brand-primary/30 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all hover:bg-white shadow-inner"
              />
            </div>

            {/* Password field */}
            {!isResetMode && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-brand-primary/70 uppercase tracking-wider">Password</label>
                  <button 
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-[11px] font-bold text-brand-secondary hover:text-brand-secondary/80 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-brand-primary/10 bg-slate-50 text-sm font-bold text-brand-primary placeholder:text-brand-primary/30 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all hover:bg-white shadow-inner"
                />
              </div>
            )}

            {/* Sign In / Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 rounded-xl text-sm font-extrabold bg-brand-primary hover:bg-brand-primary/90 text-white transition-all shadow-xl hover:shadow-brand-primary/30 hover:-translate-y-0.5 active:scale-[0.98] duration-150 flex items-center justify-center"
            >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isResetMode ? "Send Reset Link" : "Login"
            )}
          </button>
        </form>

          {/* Signup CTA / Back to Login link */}
          <div className="mt-8 text-center space-y-3">
            {isResetMode && (
              <p className="text-sm font-bold text-brand-primary/60">
                Remember your password?{" "}
                <button onClick={() => setIsResetMode(false)} className="text-brand-secondary hover:text-brand-secondary/80 transition-colors ml-1">
                  Back to login
                </button>
              </p>
            )}
            <p className="text-sm font-bold text-brand-primary/60">
              Don’t have an account?{" "}
              <Link href="/signup" className="text-brand-secondary hover:text-brand-secondary/80 transition-colors ml-1">
                Sign up for free
              </Link>
            </p>
            <div className="pt-6 mt-4 border-t border-brand-primary/5">
              <Link href="/admin" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-600 hover:text-brand-primary transition-all group">
                <ShieldCheck size={16} className="text-brand-primary/40 group-hover:text-brand-primary transition-colors" /> 
                <span className="tracking-wide">Platform Owner Access</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}