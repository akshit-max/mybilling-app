






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
// } from "firebase/firestore";
// import { onAuthStateChanged } from "firebase/auth";
// import Link from "next/link";
// import toast from "react-hot-toast";

// /* TYPES */
// type Customer = {
//   id: string;
//   name: string;
//   phone: string;
//   gstin?: string;
// };

// type Invoice = {
//   customerName?: string;
//   total: number;
//   status: "paid" | "pending" | "credit";
// };

// type Stats = {
//   [key: string]: { total: number; pending: number };
// };

// export default function CustomersPage() {
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const [customerStats, setCustomerStats] = useState<Stats>({});
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (user) => {
//       if (!user) return setLoading(false);

//       try {
//         /* 🔹 FETCH CUSTOMERS */
//         const cq = query(
//           collection(db, "customers"),
//           where("userId", "==", user.uid),
//         );

//         const csnap = await getDocs(cq);

//         const customerData: Customer[] = csnap.docs.map((doc) => ({
//           id: doc.id,
//           name: doc.data().name,
//           phone: doc.data().phone,
//           gstin: doc.data().gstin || "",
//         }));

//         setCustomers(customerData);

//         /* 🔹 FETCH INVOICES */
//         const iq = query(
//           collection(db, "invoices"),
//           where("userId", "==", user.uid),
//         );

//         const isnap = await getDocs(iq);

//         const invoiceData: Invoice[] = isnap.docs.map((doc) => ({
//           customerName: doc.data().customerName,
//           total: doc.data().total,
//           status: doc.data().status || "pending",
//         }));

//         /* 🔥 CALCULATE STATS */
//         const stats: Stats = {};

//         invoiceData.forEach((inv) => {
//           const name = inv.customerName || "Unknown";

//           if (!stats[name]) {
//             stats[name] = { total: 0, pending: 0 };
//           }

//           stats[name].total += inv.total;

//           if (inv.status !== "paid") {
//             stats[name].pending += inv.total;
//           }
//         });

//         setCustomerStats(stats);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load");
//       } finally {
//         setLoading(false);
//       }
//     });

//     return () => unsub();
//   }, []);

//   /* 🔥 DELETE */
//   const handleDelete = async (id: string) => {
//     if (!confirm("Delete customer?")) return;

//     try {
//       await deleteDoc(doc(db, "customers", id));
//       setCustomers((prev) => prev.filter((c) => c.id !== id));
//       toast.success("Customer deleted");
//     } catch (err) {
//       console.error(err);
//       toast.error("Delete failed");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-4xl mx-auto space-y-6">
//         {/* HEADER */}
//         <div className="flex justify-between">
//           <h1 className="text-xl font-semibold">Customers</h1>

//           <Link
//             href="/dashboard/customers/create"
//             className="bg-purple-600 text-white px-4 py-2 rounded"
//           >
//             + Add
//           </Link>
//         </div>

//         {/* LIST */}
//         <div className="bg-white rounded shadow">
//           {loading ? (
//             <p className="p-4">Loading...</p>
//           ) : customers.length === 0 ? (
//             <p className="p-4 text-gray-500">No customers</p>
//           ) : (
//             <div className="divide-y">
//               {customers.map((c) => (
//                 <div
//                   key={c.id}
//                   className="p-4 flex justify-between items-center"
//                 >
//                   {/* LEFT */}
//                   <div>
//                     <p className="font-medium">{c.name}</p>

//                     <p className="text-sm text-gray-500">{c.phone}</p>

//                     {/* 🔥 TOTALS */}
//                     <p className="text-xs text-gray-500 mt-1">
//                       Total: ₹{customerStats[c.name]?.total || 0}
//                     </p>

//                     <p className="text-xs text-yellow-600">
//                       Pending: ₹{customerStats[c.name]?.pending || 0}
//                     </p>
//                   </div>

//                   {/* ACTION */}
//                   <button
//                     onClick={() => handleDelete(c.id)}
//                     className="text-red-500 hover:underline"
//                   >
//                     Delete
//                   </button>
//                   <Link
//                     href={`/dashboard/customers/edit/${c.id}`}
//                     className="text-purple-500 hover:underline"
//                   >
//                     Edit
//                   </Link>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }








// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import { getCustomerAnalytics } from "@/lib/customerAnalytics";
// import {
//   collection,
//   getDocs,
//   query,
//   where,
//   deleteDoc,
//   doc,
// } from "firebase/firestore";
// import { onAuthStateChanged } from "firebase/auth";
// import Link from "next/link";
// import toast from "react-hot-toast";
// import { Users, Trash2, Pencil, ArrowLeft } from "lucide-react";

// /* TYPES */
// type Customer = {
//   id: string;
//   name: string;
//   phone: string;
//   gstin?: string;
//    totalSales?: number;
//   pendingAmount?: number;
// };

// type Invoice = {
//   customerName?: string;
//   total: number;
//   status: "paid" | "pending" | "credit";
// };

// type Stats = {
//   [key: string]: { total: number; pending: number };
// };

// export default function CustomersPage() {
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const [customerStats, setCustomerStats] = useState<Stats>({});
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (user) => {
//       if (!user) return setLoading(false);

//       try {
//         /* 🔹 FETCH CUSTOMERS */
//         const cq = query(
//           collection(db, "customers"),
//           where("userId", "==", user.uid)
//         );

//         const csnap = await getDocs(cq);

//         const customerData: Customer[] = csnap.docs.map((docSnap) => ({
//           id: docSnap.id,
//           name: docSnap.data().name,
//           phone: docSnap.data().phone,
//           gstin: docSnap.data().gstin || "",
//         }));

//         setCustomers(customerData);

//         /* 🔹 FETCH INVOICES */
//         const iq = query(
//           collection(db, "invoices"),
//           where("userId", "==", user.uid)
//         );

//         const isnap = await getDocs(iq);

//         const invoiceData: Invoice[] = isnap.docs.map((docSnap) => ({
//           customerName: docSnap.data().customerName,
//           total: docSnap.data().total,
//           status: docSnap.data().status || "pending",
//         }));

//         /* 🔥 CALCULATE STATS */
//         const stats: Stats = {};

//         invoiceData.forEach((inv) => {
//           const name = inv.customerName || "Unknown";

//           if (!stats[name]) {
//             stats[name] = { total: 0, pending: 0 };
//           }

//           stats[name].total += inv.total;

//           if (inv.status !== "paid") {
//             stats[name].pending += inv.total;
//           }
//         });

//         setCustomerStats(stats);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load");
//       } finally {
//         setLoading(false);
//       }
//     });

//     return () => unsub();
//   }, []);

//   /* 🔥 DELETE */
//   const handleDelete = async (id: string) => {
//     if (!confirm("Delete customer?")) return;

//     try {
//       await deleteDoc(doc(db, "customers", id));
//       setCustomers((prev) => prev.filter((c) => c.id !== id));
//       toast.success("Customer deleted");
//     } catch (err) {
//       console.error(err);
//       toast.error("Delete failed");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 px-6 py-8">
//       <div className="max-w-6xl mx-auto space-y-6">

//         {/* HEADER */}
//         <div className="flex items-center justify-between">

//           {/* LEFT */}
//           <div className="flex items-center gap-3">
//             <Users size={20} className="text-purple-600" />
//             <h1 className="text-2xl font-semibold text-gray-900">
//               Customers
//             </h1>
//           </div>

//           {/* RIGHT */}
//           <div className="flex items-center gap-3">

//             {/* BACK BUTTON */}
//             <Link
//               href="/dashboard"
//               className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
//             >
//               <ArrowLeft size={16} />
//               Dashboard
//             </Link>

//             {/* ADD BUTTON */}
//             <Link
//               href="/dashboard/customers/create"
//               className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
//             >
//               + Add Customer
//             </Link>

//           </div>
//         </div>

//         {/* CARD */}
//         <div className="bg-white border border-gray-200 rounded-xl shadow-sm">

//           {loading ? (
//             <div className="p-6 space-y-3">
//               {[1, 2, 3].map((i) => (
//                 <div
//                   key={i}
//                   className="h-12 bg-gray-100 rounded animate-pulse"
//                 />
//               ))}
//             </div>
//           ) : customers.length === 0 ? (
//             <p className="p-6 text-sm text-gray-500">
//               No customers found
//             </p>
//           ) : (
//             <div className="divide-y">

//               {customers.map((c) => (
//                 <div
//                   key={c.id}
//                   className="p-5 flex justify-between items-center hover:bg-gray-50 transition"
//                 >

//                   {/* LEFT */}
//                   <div className="space-y-1">

//                     <p className="font-medium text-gray-900">
//                       {c.name}
//                     </p>

//                     <p className="text-sm text-gray-500">
//                       +91 {c.phone}
//                     </p>

//                     {/* ✅ GSTIN */}
//                     {c.gstin && (
//                       <p className="text-xs text-gray-400">
//                         GSTIN: {c.gstin}
//                       </p>
//                     )}

//                     {/* STATS */}
//                     <div className="flex gap-6 text-xs mt-1">

//                       <span className="text-gray-500">
//                         Total:
//                         <span className="ml-1 font-medium text-gray-900">
//                           ₹{customerStats[c.name]?.total || 0}
//                         </span>
//                       </span>

//                       <span className="text-yellow-600">
//                         Pending:
//                         <span className="ml-1 font-medium">
//                           ₹{customerStats[c.name]?.pending || 0}
//                         </span>
//                       </span>

//                     </div>
//                   </div>

//                   {/* ACTIONS */}
//                   <div className="flex items-center gap-3">

//                     <Link
//                       href={`/dashboard/customers/edit/${c.id}`}
//                       className="p-2 rounded-lg hover:bg-gray-100 text-purple-600 transition"
//                     >
//                       <Pencil size={16} />
//                     </Link>

//                     <button
//                       onClick={() => handleDelete(c.id)}
//                       className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition"
//                     >
//                       <Trash2 size={16} />
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
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import Link from "next/link";

import toast from "react-hot-toast";

import {
  Users,
  Trash2,
  Pencil,
  ArrowLeft,
} from "lucide-react";

/* TYPES */

type Customer = {
  id: string;
  name: string;
  phone: string;
  gstin?: string;

  totalSales?: number;
  pendingAmount?: number;
  totalInvoices?: number;
};

type Invoice = {
  customerName?: string;
  total: number;
  status: "paid" | "pending" | "credit";
  invoiceType?: string;
};

type Stats = {
  [key: string]: {
    total: number;
    pending: number;
    count: number;
  };
};

export default function CustomersPage() {

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [customerStats, setCustomerStats] =
    useState<Stats>({});

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const unsub = onAuthStateChanged(
      auth,
      async (user) => {

        if (!user) {
          setLoading(false);
          return;
        }

        try {

          /* FETCH CUSTOMERS */

          const cq = query(
            collection(db, "customers"),
            where("userId", "==", user.uid)
          );

          const csnap = await getDocs(cq);

          const customerData: Customer[] =
            csnap.docs.map((docSnap) => ({
              id: docSnap.id,

              name: docSnap.data().name || "",

              phone: docSnap.data().phone || "",

              gstin: docSnap.data().gstin || "",
            }));


          /* FETCH INVOICES */

          const iq = query(
            collection(db, "invoices"),
            where("userId", "==", user.uid)
          );

          const isnap = await getDocs(iq);

          const invoiceData: Invoice[] =
            isnap.docs.map((docSnap) => ({
              customerName:
                docSnap.data().customerName,

              total:
                Number(docSnap.data().total || 0),

              status:
                docSnap.data().status ||
                "pending",

              invoiceType: docSnap.data().invoiceType || "invoice",
            }));


          /* CALCULATE STATS */

          const stats: Stats = {};

          invoiceData.forEach((inv) => {
            // Exclude estimates from sales totals
            if ((inv.invoiceType || "invoice") !== "invoice") return;

            const name =
              inv.customerName || "Unknown";

            if (!stats[name]) {

              stats[name] = {
                total: 0,
                pending: 0,
                count: 0,
              };
            }

            stats[name].total += inv.total;
            stats[name].count += 1;

            if (
              inv.status === "pending" ||
              inv.status === "credit"
            ) {
              stats[name].pending += inv.total;
            }
          });


          /* ATTACH ANALYTICS */

          const enrichedCustomers =
            customerData.map((customer) => ({

              ...customer,

              totalSales:
                stats[customer.name]?.total || 0,

              pendingAmount:
                stats[customer.name]?.pending || 0,

              totalInvoices:
                stats[customer.name]?.count || 0,
            }));


          setCustomers(enrichedCustomers);

          setCustomerStats(stats);

        } catch (err) {

          console.error(err);

          toast.error("Failed to load customers");

        } finally {

          setLoading(false);
        }
      }
    );

    return () => unsub();

  }, []);


  /* DELETE CUSTOMER */

  const handleDelete = async (
    id: string
  ) => {

    if (!confirm("Delete customer?"))
      return;

    try {

      await deleteDoc(
        doc(db, "customers", id)
      );

      setCustomers((prev) =>
        prev.filter((c) => c.id !== id)
      );

      toast.success("Customer deleted");

    } catch (err) {

      console.error(err);

      toast.error("Delete failed");
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">

      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}

        <div className="flex items-center justify-between flex-wrap gap-4">

          {/* LEFT */}

          <div className="flex items-center gap-3">

            <Users
              size={20}
              className="text-purple-600"
            />

            <h1 className="text-2xl font-semibold text-gray-900">
              Customers
            </h1>

          </div>


          {/* RIGHT */}

          <div className="flex items-center gap-3">

            {/* BACK BUTTON */}

            <Link
              href="/dashboard"
              className="
                flex items-center gap-2
                px-4 py-2
                text-sm
                border border-gray-300
                rounded-lg
                text-gray-700
                hover:bg-gray-100
                transition
              "
            >

              <ArrowLeft size={16} />

              Dashboard

            </Link>


            {/* ADD BUTTON */}

            <Link
              href="/dashboard/customers/create"
              className="
                bg-purple-600
                hover:bg-purple-700
                text-white
                px-6 py-2.5
                rounded-lg
                text-sm
                font-medium
                transition
              "
            >
              + Add Customer
            </Link>

          </div>
        </div>


        {/* CUSTOMER CARD */}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">

          {loading ? (

            <div className="p-6 space-y-3">

              {[1, 2, 3].map((i) => (

                <div
                  key={i}
                  className="
                    h-20
                    bg-gray-100
                    rounded
                    animate-pulse
                  "
                />

              ))}

            </div>

          ) : customers.length === 0 ? (

            <p className="p-6 text-sm text-gray-500">
              No customers found
            </p>

          ) : (

            <div className="divide-y">

              {customers.map((c) => (

                <div
                  key={c.id}
                  className="
                    p-5
                    flex
                    justify-between
                    items-start
                    hover:bg-gray-50
                    transition
                    flex-wrap
                    gap-4
                  "
                >

                  {/* LEFT */}

                  <div className="space-y-2">

                    <div>

                      <p className="font-medium text-gray-900">
                        {c.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        +91 {c.phone}
                      </p>

                    </div>


                    {/* GSTIN */}

                    {c.gstin && (

                      <p className="text-xs text-gray-400">
                        GSTIN: {c.gstin}
                      </p>

                    )}


                    {/* ANALYTICS */}

                    <div className="flex flex-wrap gap-3 mt-3">

                      {/* TOTAL INVOICES */}
                      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 min-w-[120px]">
                        <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
                        <h3 className="text-lg font-bold text-gray-800">{c.totalInvoices ?? 0}</h3>
                      </div>

                      {/* TOTAL SALES */}
                      <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 min-w-[150px]">
                        <p className="text-xs text-green-700 mb-1">Total Spent</p>
                        <h3 className="text-lg font-bold text-green-900">₹{(c.totalSales ?? 0).toFixed(2)}</h3>
                      </div>

                      {/* PENDING */}
                      <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 min-w-[150px]">
                        <p className="text-xs text-yellow-700 mb-1">Pending Amount</p>
                        <h3 className="text-lg font-bold text-yellow-800">₹{(c.pendingAmount ?? 0).toFixed(2)}</h3>
                      </div>

                    </div>

                  </div>


                  {/* ACTIONS */}

                  <div className="flex items-center gap-3">

                    <Link
                      href={`/dashboard/customers/edit/${c.id}`}
                      className="
                        p-2
                        rounded-lg
                        hover:bg-gray-100
                        text-purple-600
                        transition
                      "
                    >

                      <Pencil size={16} />

                    </Link>


                    <button
                      onClick={() =>
                        handleDelete(c.id)
                      }
                      className="
                        p-2
                        rounded-lg
                        hover:bg-red-100
                        text-red-500
                        transition
                      "
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