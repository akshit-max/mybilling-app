"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export type UserRole = "Admin" | "Salesman" | "Stock Manager" | "Partner" | "Delivery Boy" | "CA";

export type SessionProfile = {
  id: string;
  name: string;
  role: UserRole;
  isAdmin: boolean;
};

type SessionContextType = {
  activeProfile: SessionProfile;
  subUsers: SessionProfile[];
  switchProfile: (profile: SessionProfile) => void;
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
  switchProfile: () => {},
  loading: true,
});

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeProfile, setActiveProfile] = useState<SessionProfile>(defaultAdminProfile);
  const [subUsers, setSubUsers] = useState<SessionProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Build base admin profile based on Firebase Auth user
        const adminProfile: SessionProfile = {
          id: user.uid,
          name: user.displayName || "Admin",
          role: "Admin",
          isAdmin: true,
        };

        try {
          // Fetch sub-users linked to this admin
          const q = query(collection(db, "subusers"), where("adminId", "==", user.uid));
          const snap = await getDocs(q);
          const users: SessionProfile[] = snap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || "Unknown",
            role: (doc.data().role as UserRole) || "Salesman",
            isAdmin: false,
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
        setSubUsers([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const switchProfile = (profile: SessionProfile) => {
    setActiveProfile(profile);
    localStorage.setItem("activeProfileId", profile.id);
  };

  return (
    <SessionContext.Provider value={{ activeProfile, subUsers, switchProfile, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
