"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export type UserRole = "Admin" | "Salesman" | "Stock Manager" | "Partner" | "Delivery Boy" | "CA";

export type SessionProfile = {
  id: string;
  name: string;
  role: UserRole;
  isAdmin: boolean;
  passcode?: string;
};

type SessionContextType = {
  activeProfile: SessionProfile;
  subUsers: SessionProfile[];
  adminPin: string | null;
  switchProfile: (profile: SessionProfile) => void;
  unlockSession: (id: string) => void;
  isSessionUnlocked: (id: string) => boolean;
  loading: boolean;
};

const defaultAdminProfile: SessionProfile = {
  id: "admin",
  name: "Admin",
  role: "Admin",
  isAdmin: true,
};

const SessionContext = createContext<SessionContextType>({
  activeProfile: defaultAdminProfile,
  subUsers: [],
  adminPin: null,
  switchProfile: () => {},
  unlockSession: () => {},
  isSessionUnlocked: () => false,
  loading: true,
});

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeProfile, setActiveProfile] = useState<SessionProfile>(defaultAdminProfile);
  const [subUsers, setSubUsers] = useState<SessionProfile[]>([]);
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Replaces the local state defaultAdminProfile with fetched data once loaded
  const [baseAdmin, setBaseAdmin] = useState<SessionProfile>(defaultAdminProfile);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        let fetchedAdminPin = null;
        try {
          // Fetch Admin Settings to get adminPin
          const settingsSnap = await getDoc(doc(db, "settings", user.uid));
          if (settingsSnap.exists()) {
            fetchedAdminPin = settingsSnap.data().adminPin || null;
            setAdminPin(fetchedAdminPin);
          }
        } catch (err) {
          console.error("Failed to fetch admin settings", err);
        }

        // Build base admin profile based on Firebase Auth user and fetched settings
        const adminProfile: SessionProfile = {
          id: user.uid,
          name: user.displayName || "Admin",
          role: "Admin",
          isAdmin: true,
          passcode: fetchedAdminPin || undefined,
        };
        setBaseAdmin(adminProfile);

        try {
          // Fetch sub-users linked to this admin
          const q = query(collection(db, "subusers"), where("adminId", "==", user.uid));
          const snap = await getDocs(q);
          const users: SessionProfile[] = snap.docs.map(docData => ({
            id: docData.id,
            name: docData.data().name || "Unknown",
            role: (docData.data().role as UserRole) || "Salesman",
            isAdmin: false,
            passcode: docData.data().passcode || undefined,
          }));
          
          setSubUsers(users);

          // Restore last active profile from localStorage if it exists
          const savedProfileId = localStorage.getItem("activeProfileId");
          if (savedProfileId && savedProfileId !== user.uid) {
            const found = users.find(u => u.id === savedProfileId);
            if (found) {
              setActiveProfile(found);
            } else {
              setActiveProfile(adminProfile);
            }
          } else {
            setActiveProfile(adminProfile);
          }
        } catch (err) {
          console.error("Failed to fetch subusers for session context", err);
          setActiveProfile(adminProfile);
        }
      } else {
        // User signed out
        setActiveProfile(defaultAdminProfile);
        setBaseAdmin(defaultAdminProfile);
        setSubUsers([]);
        setAdminPin(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const switchProfile = (profile: SessionProfile) => {
    setActiveProfile(profile);
    localStorage.setItem("activeProfileId", profile.id);
  };

  const unlockSession = (id: string) => {
    const unlocked = JSON.parse(localStorage.getItem("unlocked_sessions") || "{}");
    unlocked[id] = Date.now();
    localStorage.setItem("unlocked_sessions", JSON.stringify(unlocked));
  };

  const isSessionUnlocked = (id: string) => {
    const unlocked = JSON.parse(localStorage.getItem("unlocked_sessions") || "{}");
    const timestamp = unlocked[id];
    if (!timestamp) return false;
    // 15 minutes expiry
    const isExpired = Date.now() - timestamp > 15 * 60 * 1000;
    if (isExpired) {
      delete unlocked[id];
      localStorage.setItem("unlocked_sessions", JSON.stringify(unlocked));
      return false;
    }
    return true;
  };

  return (
    <SessionContext.Provider value={{ activeProfile, subUsers, adminPin, switchProfile, unlockSession, isSessionUnlocked, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
