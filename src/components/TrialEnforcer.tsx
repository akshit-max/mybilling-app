"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TrialExpiredModal from "./ui/TrialExpiredModal";
import { usePathname } from "next/navigation";

export default function TrialEnforcer() {
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // 1. If paid, never block
            if (data.isPaid) {
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
            
            if (diffDays >= 7) {
              setIsExpired(true);
            } else {
              setIsExpired(false);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Don't enforce trial on settings or checkout pages so they can actually upgrade
  if (pathname?.startsWith('/dashboard/settings')) {
    return null;
  }
  
  if (loading) return null;

  return <TrialExpiredModal isOpen={isExpired} onClose={() => {}} />;
}
