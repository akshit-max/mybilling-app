// "use client";

// import { useEffect, useState } from "react";
// import { db } from "@/lib/firebase";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { useParams, useRouter } from "next/navigation";
// import toast from "react-hot-toast";

// export default function EditCustomer() {
//   const { id } = useParams() as { id: string };
//   const router = useRouter();

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [address, setAddress] = useState("");
//   const [gstin, setGstin] = useState("");
//   const [loading, setLoading] = useState(true);

//   /* FETCH CUSTOMER */
//   useEffect(() => {
//     const fetchCustomer = async () => {
//       try {
//         const ref = doc(db, "customers", id);
//         const snap = await getDoc(ref);

//         if (snap.exists()) {
//           const data = snap.data();
//           setName(data.name || "");
//           setPhone(data.phone || "");
//           setAddress(data.address || "");
//           setGstin(data.gstin || "");
//         }
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load customer");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchCustomer();
//   }, [id]);

//   /* UPDATE */
//   const handleUpdate = async () => {
//     if (!name.trim()) {
//       return toast.error("Name required");
//     }

//     try {
//       await updateDoc(doc(db, "customers", id), {
//         name: name.trim(),
//         phone: phone.trim(),
//         address: address.trim(),
//         gstin: gstin.trim(),
//       });

//       toast.success("Customer updated ✅");
//       router.push("/dashboard/customers");
//     } catch (err) {
//       console.error(err);
//       toast.error("Update failed");
//     }
//   };

//   if (loading) return <p className="p-6">Loading...</p>;

//   return (
//     <div className="min-h-screen p-6 bg-[#0B1120] text-white">
//       <div className="max-w-xl mx-auto space-y-4">

//         <h1 className="text-xl font-semibold">Edit Customer</h1>

//         <input
//           placeholder="Customer Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <input
//           placeholder="Phone"
//           value={phone}
//           onChange={(e) => setPhone(e.target.value)}
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
//           onClick={handleUpdate}
//           className="w-full bg-purple-600 p-3 rounded"
//         >
//           Update Customer
//         </button>

//       </div>
//     </div>
//   );
// }







"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Users, Phone, MapPin, FileText } from "lucide-react";

export default function EditCustomer() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [loading, setLoading] = useState(true);

  /* FETCH CUSTOMER (UNCHANGED) */
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const ref = doc(db, "customers", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
          setGstin(data.gstin || "");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load customer");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  /* 🔥 VALIDATION (UI layer only) */
  const validate = () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return false;
    }

    if (!phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }

    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
      toast.error("Phone must be exactly 10 digits");
      return false;
    }

    if (!address.trim()) {
      toast.error("Address is required");
      return false;
    }

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

  /* UPDATE (LOGIC SAME, just added validation before it) */
  const handleUpdate = async () => {
    if (!validate()) return;

    try {
      await updateDoc(doc(db, "customers", id), {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gstin: gstin.trim(),
      });

      toast.success("Customer updated ✅");
      router.push("/dashboard/customers");
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  if (loading)
    return <p className="p-6 text-gray-500">Loading...</p>;

  return (
    <section className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-2xl mx-auto px-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Users size={20} className="text-purple-600" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Customer
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10 digit phone number"
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
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address"
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
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="Enter GSTIN"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleUpdate}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Update Customer
          </button>

        </div>
      </div>
    </section>
  );
}