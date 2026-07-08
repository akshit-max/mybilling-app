"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TrialExpiredModal from "./ui/TrialExpiredModal";
import { usePathname, useRouter } from "next/navigation";

// All session-related localStorage keys used by this app.
// Centralised here so logout is always complete.
export const SESSION_STORAGE_KEYS = [
  "sessionToken",
  "activeProfileId",
  "unlocked_sessions",
  "pin_attempts",
] as const;

export function clearAllSessionStorage() {
  SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export default function TrialEnforcer() {
  const [isExpired, setIsExpired]     = useState(false);
  const [isDisplaced, setIsDisplaced] = useState(false);
  const [loading, setLoading]         = useState(true);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    let unsubSnapshot: () => void;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);

          unsubSnapshot = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();

              // ── 1. Single-Session Token Check ─────────────────────────────
              const firestoreToken: string | undefined = data.activeSessionToken;
              const localToken = localStorage.getItem("sessionToken");

              if (firestoreToken) {
                if (!localToken) {
                  // localStorage was cleared (extension, browser policy, etc.)
                  // Graceful recovery: re-establish this browser as active session.
                  const newToken = crypto.randomUUID();
                  localStorage.setItem("sessionToken", newToken);
                  try {
                    await setDoc(userDocRef, { activeSessionToken: newToken }, { merge: true });
                  } catch (e) {
                    console.warn("Session token recovery write failed:", e);
                  }
                  // Continue — don't sign out
                } else if (localToken !== firestoreToken) {
                  // Token mismatch → another browser/session logged in and displaced this one.
                  setIsDisplaced(true);
                  setLoading(false);
                  return; // Skip subscription check — session is invalid
                }
              }
              // ─────────────────────────────────────────────────────────────

              // ── 2. Subscription / Trial Check (unchanged) ─────────────────
              if (data.isPaid) {
                if (data.subscriptionStartDate) {
                  const start    = new Date(data.subscriptionStartDate);
                  const duration = data.subscriptionCycle === "Yearly" ? 365 : 31;
                  const diffDays = Math.floor(
                    (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  if (diffDays >= duration) {
                    setIsExpired(true);
                    setLoading(false);
                    return;
                  }
                }
                setIsExpired(false);
                setLoading(false);
                return;
              }

              let startDate = new Date();
              if (data.trialStartDate) {
                startDate = new Date(data.trialStartDate);
              } else if (user.metadata.creationTime) {
                startDate = new Date(user.metadata.creationTime);
              }
              const diffDays = Math.floor(
                (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              setIsExpired(diffDays >= 3);
              // ─────────────────────────────────────────────────────────────
            }
            setLoading(false);
          });
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const handleDisplacedOk = async () => {
    clearAllSessionStorage();
    await auth.signOut();
    router.replace("/login");
  };

  // Don't enforce on settings/checkout pages so users can upgrade
  if (pathname?.startsWith("/dashboard/settings")) return null;
  if (loading) return null;

  // ── Displacement Modal ───────────────────────────────────────────────────
  if (isDisplaced) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200">
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-amber-600">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-amber-900">Session Ended</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700 leading-relaxed">
              Your account has been signed in from{" "}
              <span className="font-bold">another browser or device</span>.
              For security, this session has been ended.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              If this wasn&apos;t you, please change your password immediately.
            </p>
          </div>
          <div className="px-6 pb-5">
            <button
              onClick={handleDisplacedOk}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              OK — Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TrialExpiredModal isOpen={isExpired} onClose={() => {}} />;
}
