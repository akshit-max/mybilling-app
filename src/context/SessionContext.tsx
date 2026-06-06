"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";

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
  isSuperAdminUser: boolean;
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
  isSuperAdminUser: false,
});

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeProfile, setActiveProfile] = useState<SessionProfile>(defaultAdminProfile);
  const [subUsers, setSubUsers] = useState<SessionProfile[]>([]);
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);

  // Replaces the local state defaultAdminProfile with fetched data once loaded
  const [baseAdmin, setBaseAdmin] = useState<SessionProfile>(defaultAdminProfile);

  useEffect(() => {
    let unsubSubusers: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (unsubSubusers) {
        unsubSubusers();
        unsubSubusers = null;
      }
      if (unsubSettings) {
        unsubSettings();
        unsubSettings = null;
      }

      if (user) {
        let fetchedAdminPin = null;
        let isSuperAdmin = false;
        let isEligible = false;
        let settingsExist = false;

        try {
          // Fetch Admin Settings to get adminPin and SuperAdmin flag
          const settingsSnap = await getDoc(doc(db, "settings", user.uid));
          if (settingsSnap.exists()) {
            settingsExist = true;
            fetchedAdminPin = settingsSnap.data().adminPin || null;
            isSuperAdmin = !!settingsSnap.data().isSuperAdmin;
            setAdminPin(fetchedAdminPin);
            setIsSuperAdminUser(isSuperAdmin);
          }
        } catch (err) {
          console.error("Failed to fetch admin settings", err);
        }

        // Real-time synchronization for PIN and Super Admin status
        unsubSettings = onSnapshot(doc(db, "settings", user.uid), (snap) => {
          if (snap.exists()) {
            const currentAdminPin = snap.data().adminPin || null;
            const currentIsSuperAdmin = !!snap.data().isSuperAdmin;
            setAdminPin(currentAdminPin);
            setIsSuperAdminUser(currentIsSuperAdmin);
          }
        });

        // Build base admin profile based on Firebase Auth user and fetched settings
        const adminProfile: SessionProfile = {
          id: "admin", // Fixed explicit ID
          name: user.displayName || "Admin",
          role: "Admin", // ALWAYS Admin
          isAdmin: settingsExist, // Fail-safe: false if settings are corrupted/missing
          passcode: fetchedAdminPin || undefined,
        };
        
        if (!settingsExist) {
          console.error("Fail-Safe Triggered: Unable to determine permissions. Settings doc missing.");
        }

        setBaseAdmin(adminProfile);

        // Fetch sub-users linked to this admin in real-time
        const q = query(collection(db, "subusers"), where("adminId", "==", user.uid));
        unsubSubusers = onSnapshot(q, (snap) => {
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
          if (savedProfileId) {
            if (savedProfileId === "admin") {
              setActiveProfile(adminProfile);
            } else {
              const found = users.find(u => u.id === savedProfileId);
              if (found) {
                setActiveProfile(found);
              } else {
                setActiveProfile(adminProfile);
              }
            }
          } else {
            setActiveProfile(adminProfile);
          }
        }, (err) => {
          console.error("Failed to fetch subusers for session context", err);
          setActiveProfile(adminProfile);
        });

      } else {
        // User signed out
        setActiveProfile(defaultAdminProfile);
        setBaseAdmin(defaultAdminProfile);
        setSubUsers([]);
        setAdminPin(null);
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubSubusers) unsubSubusers();
      if (unsubSettings) unsubSettings();
    };
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
    <SessionContext.Provider value={{ activeProfile, subUsers, adminPin, switchProfile, unlockSession, isSessionUnlocked, loading, isSuperAdminUser }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
