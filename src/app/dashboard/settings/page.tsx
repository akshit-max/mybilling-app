// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import { doc, getDoc, setDoc } from "firebase/firestore";
// import toast from "react-hot-toast";

// export default function SettingsPage() {
//   const [name, setName] = useState("");
//   const [address, setAddress] = useState("");
//   const [gstin, setGstin] = useState("");

//   const user = auth.currentUser;

//   /* LOAD EXISTING */
//   useEffect(() => {
//     const fetchData = async () => {
//       if (!user) return;

//       const ref = doc(db, "settings", user.uid);
//       const snap = await getDoc(ref);

//       if (snap.exists()) {
//         const data = snap.data();
//         setName(data.name || "");
//         setAddress(data.address || "");
//         setGstin(data.gstin || "");
//       }
//     };

//     fetchData();
//   }, [user]);

//   /* SAVE */
//   const handleSave = async () => {
//     if (!user) return;

//     try {
//       await setDoc(doc(db, "settings", user.uid), {
//         name,
//         address,
//         gstin,
//       });

//       toast.success("Saved ✅");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed");
//     }
//   };

//   return (
//     <div className="min-h-screen p-6 bg-[#0B1120] text-white">
//       <div className="max-w-xl mx-auto space-y-4">

//         <h1 className="text-xl font-semibold">Company Settings</h1>

//         <input
//           placeholder="Company Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <input
//           placeholder="Address"
//           value={address}
//           onChange={(e) => setAddress(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <input
//           placeholder="GSTIN"
//           value={gstin}
//           onChange={(e) => setGstin(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <button
//           onClick={handleSave}
//           className="w-full bg-purple-600 p-3 rounded"
//         >
//           Save
//         </button>

//       </div>
//     </div>
//   );
// }





"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import Link from "next/link";
import { INDIAN_STATES } from "@/lib/indianStates";

import {
  Settings,
  ArrowLeft,
} from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("");

  const user = auth.currentUser;

  /* LOAD EXISTING */
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const ref = doc(db, "settings", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setAddress(data.address || "");
        setGstin(data.gstin || "");
        setState(data.state || "");
      }
    };

    fetchData();
  }, [user]);

  /* SAVE */
  const handleSave = async () => {
    if (!user) return;

    try {
      await setDoc(doc(db, "settings", user.uid), {
        name,
        address,
        gstin,
        state,
      });

      toast.success("Saved ✅");
    } catch (err) {
      console.error(err);
      toast.error("Failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-xl mx-auto space-y-6">

        {/* 🔥 HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Settings className="text-purple-600" size={20} />
            <h1 className="text-2xl font-semibold text-gray-900">
              Company Settings
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>

        </div>

        {/* 📦 CARD */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">

          {/* SECTION */}
          <div className="space-y-4">

            <p className="text-sm font-medium text-gray-800">
              Company Details
            </p>

            {/* NAME */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* ADDRESS */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* STATE */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* GSTIN */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                GSTIN
              </label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <p className="text-xs text-gray-500">
                Enter your registered GST number
              </p>
            </div>

          </div>

          {/* SAVE */}
          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:opacity-90"
          >
            Save Settings
          </button>

        </div>
      </div>
    </div>
  );
}