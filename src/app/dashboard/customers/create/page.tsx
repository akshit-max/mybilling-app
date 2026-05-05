

// "use client";

// import { useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import { addDoc, collection, serverTimestamp } from "firebase/firestore";
// import { useRouter } from "next/navigation";
// import toast from "react-hot-toast";

// export default function CreateCustomer() {
//   const router = useRouter();

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [address, setAddress] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [gstin, setGstin] = useState("");

//   const handleSubmit = async () => {
//     const user = auth.currentUser;

//     if (!user) {
//       toast.error("Not logged in");
//       return;
//     }

//     if (!name.trim()) {
//       toast.error("Enter customer name");
//       return;
//     }

//     try {
//       setLoading(true);

//       await addDoc(collection(db, "customers"), {
//         userId: user.uid,
//         name: name.trim(),
//         phone: phone.trim(),
//         address: address.trim(),
//         gstin: gstin.trim() || "",
//         createdAt: serverTimestamp(),
//       });

//       toast.success("Customer added ✅");

//       // reset form (optional but good UX)
//       setName("");
//       setPhone("");
//       setAddress("");

//       router.push("/dashboard/customers");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to add customer");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen p-6 bg-[#0B1120] text-white">
//       <div className="max-w-xl mx-auto space-y-4">
//         <h1 className="text-xl font-semibold">Add Customer</h1>

//         {/* NAME */}
//         <input
//           placeholder="Customer Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded outline-none"
//         />

//         {/* PHONE */}
//         <input
//           placeholder="Phone Number"
//           value={phone}
//           onChange={(e) => setPhone(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded outline-none"
//         />

//         {/* ADDRESS */}
//         <input
//           placeholder="Address"
//           value={address}
//           onChange={(e) => setAddress(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded outline-none"
//         />
//         {/* {GSTIN} */}
//         <input
//           placeholder="GSTIN (optional)"
//           value={gstin}
//           onChange={(e) => setGstin(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded outline-none"
//         />

//         {/* SUBMIT */}
//         <button
//           onClick={handleSubmit}
//           disabled={loading}
//           className="w-full bg-purple-600 p-3 rounded hover:opacity-90 transition disabled:opacity-50"
//         >
//           {loading ? "Saving..." : "Add Customer"}
//         </button>
//       </div>
//     </div>
//   );
// }






"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Users, Phone, MapPin, FileText } from "lucide-react";

export default function CreateCustomer() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [gstin, setGstin] = useState("");

  /* 🔥 VALIDATION FUNCTION */
  const validate = () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return false;
    }

    if (!phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }

    // remove spaces
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return false;
    }

    if (!address.trim()) {
      toast.error("Address is required");
      return false;
    }

    // GSTIN validation (basic)
    if (gstin.trim()) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;

      if (!gstRegex.test(gstin.trim().toUpperCase())) {
        toast.error("Invalid GSTIN format");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;

    if (!user) {
      toast.error("Not logged in");
      return;
    }

    /* 🔥 VALIDATION CHECK */
    if (!validate()) return;

    try {
      setLoading(true);

      await addDoc(collection(db, "customers"), {
        userId: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gstin: gstin.trim() || "",
        createdAt: serverTimestamp(),
      });

      toast.success("Customer added ✅");

      setName("");
      setPhone("");
      setAddress("");
      setGstin("");

      router.push("/dashboard/customers");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-2xl mx-auto px-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Users className="text-purple-600" size={20} />
            <h1 className="text-2xl font-semibold text-gray-900">
              Add Customer
            </h1>
          </div>

          <Link
            href="/dashboard/customers"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            Customers
          </Link>
        </div>

        {/* CARD */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">

          {/* NAME */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-purple-600" />
              <label className="text-sm font-medium text-gray-700">
                Customer Name *
              </label>
            </div>

            <input
              placeholder="Enter customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* PHONE */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Phone size={16} className="text-purple-600" />
              <label className="text-sm font-medium text-gray-700">
                Phone Number *
              </label>
            </div>

            <input
              placeholder="10 digit phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* ADDRESS */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-purple-600" />
              <label className="text-sm font-medium text-gray-700">
                Address *
              </label>
            </div>

            <input
              placeholder="Enter address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* GSTIN */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-purple-600" />
              <label className="text-sm font-medium text-gray-700">
                GSTIN (optional)
              </label>
            </div>

            <input
              placeholder="Enter GSTIN"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add Customer"}
          </button>

        </div>
      </div>
    </section>
  );
}