"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TrialExpiredModal from "./ui/TrialExpiredModal";
import { usePathname } from "next/navigation";

export default function TrialEnforcer() {
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let unsubSnapshot: () => void;
    
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          
          unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              // 1. If paid, check whether the subscription is still active.
              //    Uses the same calculation as dashboard/page.tsx:
              //    Monthly = 31 days, Yearly = 365 days.
              //    No Firestore writes — client-side check only.
              if (data.isPaid) {
                if (data.subscriptionStartDate) {
                  const start = new Date(data.subscriptionStartDate);
                  const duration = data.subscriptionCycle === "Yearly" ? 365 : 31;
                  const diffDays = Math.floor(
                    (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  if (diffDays >= duration) {
                    // Paid but expired → block access, same as expired trial
                    setIsExpired(true);
                    setLoading(false);
                    return;
                  }
                }
                // Paid and active (or no start date on record) → allow
                setIsExpired(false);
                setLoading(false);
                return;
              }

              // 2. Check Trial Timeline
              let startDate = new Date();
              if (data.trialStartDate) {
                startDate = new Date(data.trialStartDate);
              } else if (user.metadata.creationTime) {
                startDate = new Date(user.metadata.creationTime);
              }
              
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)); 
              
              if (diffDays >= 3) {
                setIsExpired(true);
              } else {
                setIsExpired(false);
              }
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

  // Don't enforce trial on settings or checkout pages so they can actually upgrade
  if (pathname?.startsWith('/dashboard/settings')) {
    return null;
  }
  
  if (loading) return null;

  return <TrialExpiredModal isOpen={isExpired} onClose={() => {}} />;
}
