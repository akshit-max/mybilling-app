



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
import { getOfflineInvoices }
from "@/lib/offlineInvoices";
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
      /* 1. ALWAYS LOAD OFFLINE INVOICES FIRST */
      const offlineInvoices = await getOfflineInvoices();
      const formattedOffline = offlineInvoices.map((inv: any) => ({
        id: inv.id?.toString() || crypto.randomUUID(),
        customerName: inv.customerName || "Unknown",
        total: inv.total || 0,
        status: inv.status || "pending",
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
      }));


      /* Show offline instantly so UI doesn't hang empty */
      if (formattedOffline.length > 0) {
        setInvoices(formattedOffline);
      }

      /* HARD STOP FIREBASE OFFLINE */
if (!navigator.onLine) {
  setLoading(false);
  return;
}

      /* 2. ATTEMPT FIRESTORE FETCH (MERGE IF ONLINE) */
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

        // Merge offline + online (newest first)
        setInvoices([...formattedOffline, ...data]);
      } catch (err) {
        console.warn("Firestore fetch failed, showing offline invoices", err);
        // Do not toast.error here because offline invoices might be perfectly fine
      } finally {
        setLoading(false);
      }
    });

    /* 🔥 LIVE OFFLINE REFRESH */ const refreshOfflineInvoices = async () => { if (!navigator.onLine) { const offlineInvoices = await getOfflineInvoices(); const formatted = offlineInvoices.map((inv: any) => ({ id: inv.id?.toString() || crypto.randomUUID(), customerName: inv.customerName || "Unknown", total: inv.total || 0, status: inv.status || "pending", invoiceNumber: inv.invoiceNumber, createdAt: inv.createdAt, })); setInvoices(formatted); } }; window.addEventListener( "offline-invoice-created", refreshOfflineInvoices ); /* CLEANUP */ return () => { unsubscribe(); window.removeEventListener( "offline-invoice-created", refreshOfflineInvoices ); };

  }, []);

  /* 🔹 DELETE */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;

    try {
      let isOfflineMode = !navigator.onLine;
      if (!isOfflineMode) {
        try {
          const testReq = await fetch(
            "/favicon.ico?cache=" + new Date().getTime(),
            { method: "HEAD", cache: "no-store" }
          );
          if (!testReq.ok) isOfflineMode = true;
        } catch {
          isOfflineMode = true;
        }
      }

      let deletedOffline = false;

      // Attempt to delete from local offline store first
      const { getOfflineInvoices, deleteOfflineInvoice } = await import(
        "@/lib/offlineInvoices"
      );
      const offlineInvoices = await getOfflineInvoices();
      const offlineInv = offlineInvoices.find(
        (inv: any) => inv.id?.toString() === id || inv.invoiceNumber === id
      );

      if (offlineInv) {
        // Restore local stock for offline deleted invoice!
        const { getCachedProducts, cacheProducts } = await import(
          "@/lib/indexedDB"
        );
        const cachedProducts = await getCachedProducts();

        for (const item of offlineInv.items || []) {
          if (!item.productId || !item.qty) continue;
          const pIdx = cachedProducts.findIndex(
            (p) => p.id === item.productId
          );
          if (pIdx > -1) {
            cachedProducts[pIdx].stock =
              (cachedProducts[pIdx].stock || 0) + item.qty;
          }
        }
        await cacheProducts(cachedProducts);

        if ((offlineInv as any).id) {
          await deleteOfflineInvoice((offlineInv as any).id);
        }
        deletedOffline = true;
      }

      if (!deletedOffline) {
        if (isOfflineMode) {
          toast.error("Cannot delete synced invoice while offline");
          return;
        }
        // It's a firestore invoice, and we are online.
        await deleteDoc(doc(db, "invoices", id));
      }

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
                      ₹{inv.total.toFixed(2)}
                    </p>

                    {inv.invoiceNumber && (
                      <p className="text-xs text-gray-400">
                        {inv.invoiceNumber}
                      </p>
                    )}

                    {inv.createdAt && (
                      <p className="text-xs text-gray-400">
                        {typeof (inv.createdAt as any).toDate === "function"
                          ? (inv.createdAt as any).toDate().toLocaleDateString()
                          : new Date(inv.createdAt as any).toLocaleDateString()}
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


