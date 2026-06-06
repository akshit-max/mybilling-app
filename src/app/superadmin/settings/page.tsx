"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, Save, ChevronLeft, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { updateEmail, updatePassword } from "firebase/auth";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SuperAdminSettings() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (auth.currentUser?.email) {
      setEmail(auth.currentUser.email);
    }
  }, []);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setSavingEmail(true);
    try {
      await updateEmail(auth.currentUser, email);
      toast.success("Admin Email updated successfully!");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
         toast.error("This action requires a recent login. Please log out and back in.");
      } else {
         toast.error(err.message || "Failed to update email.");
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");

    setSavingPassword(true);
    try {
      await updatePassword(auth.currentUser, password);
      toast.success("Admin Password updated successfully!");
      setPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
         toast.error("This action requires a recent login. Please log out and back in.");
      } else {
         toast.error(err.message || "Failed to update password.");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/30 overflow-y-auto font-sans h-full">

      <main className="w-full max-w-2xl mx-auto p-6 mt-8 space-y-8">
        
        {/* Email Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h3 className="text-lg font-black text-gray-900 mb-1">Update Username (Email)</h3>
          <p className="text-sm text-gray-500 mb-6 font-medium">This is the email address you use to log in to the Platform Owner dashboard.</p>
          
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] sm:text-sm font-medium transition-colors"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={savingEmail || !email}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#F97316] hover:bg-[#F97316]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F97316] transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {savingEmail ? "Saving..." : "Update Email"}
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h3 className="text-lg font-black text-gray-900 mb-1">Update Password</h3>
          <p className="text-sm text-gray-500 mb-6 font-medium">Change your admin login password. Must be at least 6 characters.</p>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] sm:text-sm font-medium transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={savingPassword || password.length < 6}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#F97316] hover:bg-[#F97316]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F97316] transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {savingPassword ? "Saving..." : "Update Password"}
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
