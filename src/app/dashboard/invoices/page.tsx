



// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import {
//   collection,
//   getDocs,
//   query,
//   where,
//   deleteDoc,
//   doc,
//   Timestamp,
// } from "firebase/firestore";
// import { onAuthStateChanged } from "firebase/auth";
// import Link from "next/link";
// import toast from "react-hot-toast";
// import { orderBy } from "firebase/firestore";

// /* 🔹 TYPE */
// type Invoice = {
//   id: string;
//   customerName: string;
//   total: number;
//   status: "paid" | "pending" | "credit";
//   invoiceNumber?: string;
//   createdAt?: Timestamp;
// };

// export default function InvoicesPage() {
//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       try {
//         const q = query(
//           collection(db, "invoices"),
//           where("userId", "==", user.uid),
//           orderBy("createdAt", "desc") // 🔥 newest first
//         );

//         const snapshot = await getDocs(q);

//         const data: Invoice[] = snapshot.docs.map((docSnap) => {
//           const d = docSnap.data();

//           return {
//             id: docSnap.id,
//             customerName: d.customerName || "Unknown",
//             total: d.total || 0,
//             status: d.status || "pending",
//             invoiceNumber: d.invoiceNumber,
//             createdAt: d.createdAt,
//           };
//         });

//         setInvoices(data);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load invoices");
//       } finally {
//         setLoading(false);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const handleDelete = async (id: string) => {
//     if (!confirm("Delete this invoice?")) return;

//     try {
//       await deleteDoc(doc(db, "invoices", id));
//       setInvoices((prev) => prev.filter((i) => i.id !== id));
//       toast.success("Deleted");
//     } catch (err) {
//       toast.error("Delete failed");
//     }
//   };

//   const getStatusStyle = (status: string) => {
//     if (status === "paid") return "bg-green-100 text-green-600";
//     if (status === "pending") return "bg-yellow-100 text-yellow-600";
//     return "bg-red-100 text-red-600";
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-5xl mx-auto space-y-6">

//         {/* HEADER */}
//         <div className="flex justify-between items-center">
//           <h1 className="text-2xl font-semibold">Invoices</h1>

//           <Link
//             href="/dashboard/invoices/create"
//             className="px-4 py-2 bg-purple-600 text-white rounded-lg"
//           >
//             + Create Invoice
//           </Link>
//         </div>

//         {/* LIST */}
//         <div className="bg-white rounded-xl border shadow-sm">

//           {loading ? (
//             <p className="p-6">Loading...</p>
//           ) : invoices.length === 0 ? (
//             <p className="p-6 text-gray-500">No invoices found</p>
//           ) : (
//             <div className="divide-y">

//               {invoices.map((inv) => (
//                 <div
//                   key={inv.id}
//                   className="p-4 flex justify-between items-center"
//                 >

//                   {/* LEFT */}
//                   <div>
//                     <p className="font-medium">{inv.customerName}</p>

//                     <p className="text-sm text-gray-500">
//                       ₹{inv.total}
//                     </p>

//                     {/* OPTIONAL: Invoice Number */}
//                     {inv.invoiceNumber && (
//                       <p className="text-xs text-gray-400">
//                         {inv.invoiceNumber}
//                       </p>
//                     )}

//                     {/* OPTIONAL: Date */}
//                     {inv.createdAt && (
//                       <p className="text-xs text-gray-400">
//                         {inv.createdAt.toDate().toLocaleDateString()}
//                       </p>
//                     )}
//                   </div>

//                   {/* ACTIONS */}
//                   <div className="flex items-center gap-4 text-sm">

//                     <span
//                       className={`px-2 py-1 rounded text-xs ${getStatusStyle(
//                         inv.status
//                       )}`}
//                     >
//                       {inv.status}
//                     </span>

//                     <Link
//                       href={`/dashboard/invoices/${inv.id}`}
//                       className="text-blue-600 hover:underline"
//                     >
//                       View
//                     </Link>

//                     <Link
//                       href={`/dashboard/invoices/edit/${inv.id}`}
//                       className="text-purple-600 hover:underline"
//                     >
//                       Edit
//                     </Link>

//                     <button
//                       onClick={() => handleDelete(inv.id)}
//                       className="text-red-500 hover:underline"
//                     >
//                       Delete
//                     </button>

                   

//                   </div>
//                 </div>
//               ))}

//             </div>
//           )}

//         </div>
//       </div>
//     </div>
//   );
// }








"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";

/* 🔹 TYPE */
type Invoice = {
  id: string;
  customerName: string;
  total: number;
  status: "paid" | "pending" | "credit";
  invoiceNumber?: string;
  createdAt?: Timestamp;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🔹 FETCH WITH AUTH */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc") // newest first
        );

        const snapshot = await getDocs(q);

        const data: Invoice[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();

          return {
            id: docSnap.id,
            customerName: d.customerName || "Unknown",
            total: d.total || 0,
            status: d.status || "pending",
            invoiceNumber: d.invoiceNumber,
            createdAt: d.createdAt,
          };
        });

        setInvoices(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load invoices");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* 🔹 DELETE */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;

    try {
      await deleteDoc(doc(db, "invoices", id));
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  /* 🔹 STATUS STYLE */
  const getStatusStyle = (status: string) => {
    if (status === "paid") return "bg-green-100 text-green-600";
    if (status === "pending") return "bg-yellow-100 text-yellow-600";
    return "bg-red-100 text-red-600";
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 🔥 HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <FileText className="text-purple-600" size={20} />
            <h1 className="text-2xl font-semibold text-gray-900">
              Invoices
            </h1>
          </div>

          <div className="flex items-center gap-3">

            {/* BACK */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            {/* CREATE */}
            <Link
              href="/dashboard/invoices/create"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
            >
              <Plus size={16} />
              Create Invoice
            </Link>

          </div>
        </div>

        {/* 📦 CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">
              No invoices found
            </p>
          ) : (
            <div className="divide-y">

              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 flex justify-between items-center hover:bg-gray-50 transition"
                >

                  {/* LEFT */}
                  <div className="space-y-1">

                    <p className="font-medium text-gray-900">
                      {inv.customerName}
                    </p>

                    <p className="text-sm text-gray-600">
                      ₹{inv.total}
                    </p>

                    {inv.invoiceNumber && (
                      <p className="text-xs text-gray-400">
                        {inv.invoiceNumber}
                      </p>
                    )}

                    {inv.createdAt && (
                      <p className="text-xs text-gray-400">
                        {inv.createdAt
                          .toDate()
                          .toLocaleDateString()}
                      </p>
                    )}

                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center gap-3">

                    {/* STATUS */}
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-medium ${getStatusStyle(
                        inv.status
                      )}`}
                    >
                      {inv.status}
                    </span>

                    {/* VIEW */}
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="p-2 rounded hover:bg-gray-100 transition"
                    >
                      <Eye size={16} />
                    </Link>

                    {/* EDIT */}
                    <Link
                      href={`/dashboard/invoices/edit/${inv.id}`}
                      className="p-2 rounded hover:bg-gray-100 text-purple-600 transition"
                    >
                      <Pencil size={16} />
                    </Link>

                    {/* DELETE */}
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-2 rounded hover:bg-red-100 text-red-500 transition"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}


