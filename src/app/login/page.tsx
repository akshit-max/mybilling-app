"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Check if user is super admin
      let savedUid = null;
      try {
        const platSnap = await getDoc(doc(db, "platformSettings", "security"));
        savedUid = platSnap?.data()?.superAdminUid;
      } catch (adminCheckError) {
        console.error("Could not verify admin status:", adminCheckError);
      }

      // Non-blocking lastActive update for Super Admin health tracking
      try {
        setDoc(doc(db, "users", userCredential.user.uid), { 
          lastActive: new Date().toISOString() 
        }, { merge: true }).catch(err => console.error("Silent lastActive update failed:", err));
      } catch (err) {
        // Ignore errors to ensure login is never blocked
      }

      // ── Single-Session Token ──────────────────────────────────────────────
      // Generate a UUID for this session. Stored in Firestore and localStorage.
      // Any other browser/device that is still logged in will detect this
      // token change via onSnapshot and be signed out gracefully.
      try {
        const sessionToken = crypto.randomUUID();
        await setDoc(
          doc(db, "users", userCredential.user.uid),
          { activeSessionToken: sessionToken },
          { merge: true }
        );
        localStorage.setItem("sessionToken", sessionToken);
      } catch (tokenErr) {
        // Non-blocking: login continues even if token write fails.
        // TrialEnforcer's graceful recovery will establish the token on first load.
        console.warn("Session token write failed (non-critical):", tokenErr);
      }
      // ─────────────────────────────────────────────────────────────────────

      if (savedUid && userCredential.user.uid === savedUid) {
        toast.success("Welcome, Platform Owner");
        router.push("/superadmin");
      } else {
        toast.success("Welcome back 👋");
        router.push("/dashboard");
      }
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
        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-secondary rounded-[8px] text-white shadow-sm flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-45 transform">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
            <div>
              <span className="text-[20px] font-bold text-white tracking-tight">Cloud <span className="text-brand-secondary">Ledger</span></span>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="max-w-md space-y-6 my-auto">
            <h1 className="text-4xl lg:text-[40px] font-bold text-white leading-[1.1] tracking-tight">
              Manage your business with absolute clarity.
            </h1>
            <p className="text-lg text-brand-neutral/80 font-medium">
              Join millions of businesses trusting Cloud Ledger for invoicing, inventory, and accounting.
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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.15]"></div>
        
        {/* Top Right Close Button */}
        <button 
          onClick={() => router.push("/")}
          className="absolute top-6 right-6 p-2 rounded-full bg-white ring-1 ring-gray-200 text-brand-primary/40 hover:text-brand-primary hover:bg-gray-50 transition-colors shadow-sm z-20"
        >
          <X size={20} />
        </button>

        <div className="relative z-10 w-full max-w-[440px] mx-auto flex flex-col bg-white p-8 sm:p-10 rounded-[12px] shadow-lg border border-gray-200">
          
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="p-2 bg-brand-secondary rounded-[8px] text-white shadow-sm flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-45 transform">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            </div>
            <span className="text-[20px] font-bold text-brand-primary tracking-tight">Cloud <span className="text-brand-secondary">Ledger</span></span>
          </div>

          <div className="mb-8">
            <h2 className="text-[32px] font-bold text-brand-primary tracking-tight">
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
              <label className="text-[11px] font-bold text-brand-primary/70 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-[10px] border border-gray-200 bg-slate-50 text-[16px] font-medium text-brand-primary placeholder:text-brand-primary/40 outline-none focus:border-transparent focus:ring-2 focus:ring-brand-secondary transition-all hover:bg-white"
              />
            </div>

            {/* Password field */}
            {!isResetMode && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-brand-primary/70 uppercase tracking-wider">Password</label>
                  <button 
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-[11px] font-medium text-brand-secondary hover:text-brand-secondary/80 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-[10px] border border-gray-200 bg-slate-50 text-[16px] font-medium text-brand-primary placeholder:text-brand-primary/40 outline-none focus:border-transparent focus:ring-2 focus:ring-brand-secondary transition-all hover:bg-white"
                />
              </div>
            )}

            {/* Sign In / Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-[14px] mt-2 rounded-[10px] text-[14px] font-medium bg-brand-primary hover:bg-brand-primary/90 text-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] duration-150 flex items-center justify-center"
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
            <p className="text-xs font-semibold text-brand-primary/70 text-center mt-6 bg-slate-50/80 p-3 rounded-lg border border-brand-primary/10 shadow-sm">
              By logging in, you agree to our{" "}
              <Link href="/terms-and-conditions" className="text-brand-secondary hover:text-brand-secondary/80 hover:underline transition">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="text-brand-secondary hover:text-brand-secondary/80 hover:underline transition">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}