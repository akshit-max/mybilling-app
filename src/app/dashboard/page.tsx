"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
// import { ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Building2,
  ShieldCheck,
} from "lucide-react";
/* TYPES */
type Invoice = {
  id: string;
  customerName: string;
  total: number;
  status: "paid" | "pending" | "credit";
  createdAt?: { toDate?: () => Date; seconds?: number } | string | Date;
  invoiceType?: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
};

type Customer = {
  id: string;
};

export default function Dashboard() {
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  /* 🔹 LOGOUT */
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      toast.success("Logged out");
      // router.replace("/");
      window.location.href = "/";
    } catch {
      toast.error("Logout failed");
    } finally {
      setLoggingOut(false);
    }
  };

  /* 🔥 FETCH DATA */

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoadingData(false);
        return;
      }

      try {
        // INVOICES
        const iq = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid),
        );
        const isnap = await getDocs(iq);

        const invoiceData: Invoice[] = isnap.docs.map((d) => ({
          id: d.id,
          customerName: d.data().customerName,
          total: d.data().total,
          status: d.data().status || "pending",
          createdAt: d.data().createdAt,
          invoiceType: d.data().invoiceType || "invoice",
        }));

        setInvoices(invoiceData);

        // PRODUCTS
        const pq = query(
          collection(db, "products"),
          where("userId", "==", user.uid),
        );
        const psnap = await getDocs(pq);

        const productData: Product[] = psnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          stock: d.data().stock || 0,
        }));

        setProducts(productData);

        // CUSTOMERS
        const cq = query(
          collection(db, "customers"),
          where("userId", "==", user.uid),
        );
        const csnap = await getDocs(cq);

        setCustomers(csnap.docs.map((d) => ({ id: d.id })));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard");
      } finally {
        setLoadingData(false);
      }
    });

    return () => unsubscribe();
  }, []);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const user = auth.currentUser;
  //     if (!user) return;

  //     try {
  //       // INVOICES
  //       const iq = query(
  //         collection(db, "invoices"),
  //         where("userId", "==", user.uid),
  //       );
  //       const isnap = await getDocs(iq);

  //       const invoiceData: Invoice[] = isnap.docs.map((d) => ({
  //         id: d.id,
  //         customerName: d.data().customerName,
  //         total: d.data().total,
  //         status: d.data().status || "pending",
  //       }));

  //       setInvoices(invoiceData);

  //       // PRODUCTS
  //       const pq = query(
  //         collection(db, "products"),
  //         where("userId", "==", user.uid),
  //       );
  //       const psnap = await getDocs(pq);

  //       const productData: Product[] = psnap.docs.map((d) => ({
  //         id: d.id,
  //         name: d.data().name,
  //         stock: d.data().stock || 0,
  //       }));

  //       setProducts(productData);

  //       // CUSTOMERS
  //       const cq = query(
  //         collection(db, "customers"),
  //         where("userId", "==", user.uid),
  //       );
  //       const csnap = await getDocs(cq);

  //       setCustomers(csnap.docs.map((d) => ({ id: d.id })));
  //     } catch (err) {
  //       console.error(err);
  //       toast.error("Failed to load dashboard");
  //     } finally {
  //       setLoadingData(false);
  //     }
  //   };

  //   fetchData();
  // }, []);

  /* 🔹 STATS */
  // Helper to get a JS Date from Firestore Timestamp or ISO string
  const toDate = (val: Invoice["createdAt"]): Date | null => {
    if (!val) return null;
    if (typeof (val as any).toDate === "function") return (val as any).toDate();
    if (typeof val === "string" || val instanceof Date) return new Date(val as any);
    if (typeof (val as any).seconds === "number") return new Date((val as any).seconds * 1000);
    return null;
  };

  const realInvoices = invoices.filter((i) => (i.invoiceType || "invoice") === "invoice");
  const totalRevenue = realInvoices.reduce((sum, i) => sum + i.total, 0);
  const totalInvoices = realInvoices.length;

  const pendingAmount = realInvoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.total, 0);

  const now = new Date();
  const todaySales = realInvoices
    .filter((i) => {
      const d = toDate(i.createdAt);
      if (!d) return false;
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    })
    .reduce((sum, i) => sum + i.total, 0);

  const monthlySales = realInvoices
    .filter((i) => {
      const d = toDate(i.createdAt);
      if (!d) return false;
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, i) => sum + i.total, 0);

  const totalCustomers = customers.length;

  const lowStockProducts = products.filter((p) => p.stock <= 2);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex bg-gray-100">
        {/* 🔥 LOGOUT LOADER */}
        {loggingOut && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-10 h-10 border-4 border-white/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}

        {/* SIDEBAR */}
        <aside className="w-64 bg-[#0B1120] text-white p-6 flex flex-col justify-between">
          {/* <div>
            <h2 className="text-xl font-semibold mb-8">
              <span className="text-purple-400">my</span>BillBook
            </h2>

            <nav className="space-y-4 text-sm text-white/70">
              <Link href="/dashboard" className="block hover:text-white">
                Dashboard
              </Link>
              <Link
                href="/dashboard/invoices"
                className="block hover:text-white"
              >
                Invoices
              </Link>
              <Link
                href="/dashboard/customers"
                className="block hover:text-white"
              >
                Customers
              </Link>
              <Link
                href="/dashboard/products"
                className="block hover:text-white"
              >
                Inventory
              </Link>
              <Link href="/dashboard/settings"
              className="block hover:text-white">Company</Link>

              <Link  href="/dashboard/backup"
                className="block hover:text-white">
              
                Settings
              </Link>
            </nav>
          </div> */}

          {/* <aside className="w-64 bg-[#0B1120] text-white p-6 flex flex-col justify-between"> */}

          <div>
            {/* LOGO */}
            <h2 className="text-2xl font-semibold mb-10 tracking-tight">
              <span className="text-purple-400">my</span>
              BillBook
            </h2>

            {/* NAVIGATION */}
            <nav className="space-y-2 text-sm">
              {/* DASHBOARD */}
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              {/* INVOICES */}
              <Link
                href="/dashboard/invoices"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <FileText size={18} />
                Invoices
              </Link>

              {/* CUSTOMERS */}
              <Link
                href="/dashboard/customers"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <Users size={18} />
                Customers
              </Link>

              {/* INVENTORY */}
              <Link
                href="/dashboard/products"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <Package size={18} />
                Inventory
              </Link>

              {/* COMPANY */}
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <Building2 size={18} />
                Company
              </Link>

              {/* SETTINGS / BACKUP */}
              <Link
                href="/dashboard/backup"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <ShieldCheck size={18} />
                Settings
              </Link>
            </nav>
          </div>
          {/* </aside> */}

          {/* <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-red-400 hover:text-red-500 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button> */}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
             border border-red-200 text-red-500
             hover:bg-red-50 hover:border-red-300 hover:text-red-600
             transition disabled:opacity-50 w-full"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </aside>

        {/* MAIN */}
        <div className="flex-1">
          {/* HEADER */}
          <header className="bg-white border-b px-6 py-4">
            <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          </header>

          {/* CONTENT */}
          <main className="p-6 space-y-6">
            {/* STATS */}
            {loadingData ? (
              <div className="grid md:grid-cols-3 gap-6 mb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-xl animate-pulse h-24" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 mb-4">
                <Card title="Today Sales" value={`₹${todaySales.toFixed(2)}`} highlight />
                <Card title="Monthly Sales" value={`₹${monthlySales.toFixed(2)}`} highlight />
                <Card title="Revenue (All)" value={`₹${totalRevenue.toFixed(2)}`} />
              </div>
            )}
            {loadingData ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-xl animate-pulse h-24" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <Card title="Invoices" value={`${totalInvoices}`} />
                <Card title="Pending" value={`₹${pendingAmount.toFixed(2)}`} />
                <Card title="Customers" value={`${totalCustomers}`} />
              </div>
            )}

            {/* LOW STOCK */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="font-semibold mb-4 text-gray-800 flex items-center gap-2">
                ⚠ Low Stock
              </h2>

              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-gray-500">All products in stock</p>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center text-sm border-b pb-2"
                    >
                      {/* LEFT */}
                      <span className="font-medium">{p.name}</span>

                      {/* RIGHT */}
                      <div className="flex items-center gap-2">
                        {/* 🔴 OUT OF STOCK */}
                        {p.stock === 0 && (
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                            Out
                          </span>
                        )}

                        {/* 🟡 LOW STOCK */}
                        {p.stock > 0 && p.stock <= 2 && (
                          <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded">
                            Low
                          </span>
                        )}

                        {/* STOCK COUNT */}
                        <span className="text-red-500 font-semibold">
                          {p.stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RECENT INVOICES */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="font-semibold mb-4 text-gray-800">
                Recent Invoices
              </h2>

              {invoices.length === 0 ? (
                <p className="text-sm text-gray-500">No invoices yet</p>
              ) : (
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex justify-between text-sm border-b pb-2"
                    >
                      <span>{inv.customerName}</span>
                      <span className="font-medium">₹{inv.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* CARD */
function Card({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-xl shadow-sm border ${highlight ? "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100" : "bg-white"}`}>
      <p className={`text-sm ${highlight ? "text-purple-600" : "text-gray-500"}`}>{title}</p>
      <h3 className={`text-2xl font-semibold mt-2 ${highlight ? "text-purple-800" : "text-gray-800"}`}>{value}</h3>
    </div>
  );
}



// type Product = {
//   id: string;
//   name: string;
//   stock: number;
// };

// type Customer = {
//   id: string;
// };

// export default function Dashboard() {
//   const router = useRouter();

//   const [loggingOut, setLoggingOut] = useState(false);
//   const [loadingData, setLoadingData] = useState(true);

//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);
//   const [customers, setCustomers] = useState<Customer[]>([]);

//   /* 🔴 LOGOUT */
//   const handleLogout = async () => {
//     try {
//       setLoggingOut(true);
//       await signOut(auth);
//       toast.success("Logged out");
//       router.replace("/login");
//     } catch {
//       toast.error("Logout failed");
//     } finally {
//       setLoggingOut(false);
//     }
//   };

//   /* 🔥 FETCH */
//   useEffect(() => {
//     const fetchData = async () => {
//       const user = auth.currentUser;
//       if (!user) return;

//       try {
//         // invoices
//         const iq = query(
//           collection(db, "invoices"),
//           where("userId", "==", user.uid)
//         );
//         const isnap = await getDocs(iq);

//         const invoiceData: Invoice[] = isnap.docs.map((d) => ({
//           id: d.id,
//           customerName: d.data().customerName,
//           total: d.data().total,
//           status: d.data().status || "pending",
//         }));

//         setInvoices(invoiceData);

//         // products
//         const pq = query(
//           collection(db, "products"),
//           where("userId", "==", user.uid)
//         );
//         const psnap = await getDocs(pq);

//         const productData: Product[] = psnap.docs.map((d) => ({
//           id: d.id,
//           name: d.data().name,
//           stock: d.data().stock || 0,
//         }));

//         setProducts(productData);

//         // customers
//         const cq = query(
//           collection(db, "customers"),
//           where("userId", "==", user.uid)
//         );
//         const csnap = await getDocs(cq);

//         setCustomers(csnap.docs.map((d) => ({ id: d.id })));

//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load dashboard");
//       } finally {
//         setLoadingData(false);
//       }
//     };

//     fetchData();
//   }, []);

//   /* STATS */
//   const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
//   const pendingAmount = invoices
//     .filter((i) => i.status !== "paid")
//     .reduce((sum, i) => sum + i.total, 0);

//   const lowStockProducts = products.filter((p) => p.stock <= 2);

//   return (
//     <ProtectedRoute>
//       <div className="min-h-screen flex bg-gray-50">

//         {/* SIDEBAR */}
//         <aside className="w-64 bg-[#0B1120] text-white p-6 flex flex-col justify-between">

//           <div>
//             <h2 className="text-xl font-semibold mb-8">
//               <span className="text-purple-400">my</span>BillBook
//             </h2>

//             {/* 🔥 WORKING LINKS */}
//             <nav className="space-y-2 text-sm">

//               <Link href="/dashboard" className="block px-3 py-2 rounded hover:bg-white/10">
//                 Dashboard
//               </Link>

//               <Link href="/dashboard/invoices" className="block px-3 py-2 rounded hover:bg-white/10">
//                 Invoices
//               </Link>

//               <Link href="/dashboard/customers" className="block px-3 py-2 rounded hover:bg-white/10">
//                 Customers
//               </Link>

//               <Link href="/dashboard/products" className="block px-3 py-2 rounded hover:bg-white/10">
//                 Inventory
//               </Link>

//               <Link href="/dashboard/settings" className="block px-3 py-2 rounded hover:bg-white/10">
//                 Settings
//               </Link>

//             </nav>
//           </div>

//           {/* LOGOUT */}
//           <button
//             onClick={handleLogout}
//             disabled={loggingOut}
//             className="bg-red-500/10 text-red-400 px-4 py-2 rounded-full hover:bg-red-500/20 text-sm"
//           >
//             {loggingOut ? "Logging out..." : "Logout"}
//           </button>
//         </aside>

//         {/* MAIN */}
//         <div className="flex-1">

//           {/* HEADER */}
//           <header className="bg-white border-b px-6 py-4">
//             <h1 className="text-lg font-semibold text-gray-800">
//               Dashboard
//             </h1>
//           </header>

//           {/* CONTENT */}
//           <main className="p-6 space-y-6">

//             {/* STATS */}
//             {loadingData ? (
//               <div className="grid md:grid-cols-4 gap-6">
//                 {[1, 2, 3, 4].map((i) => (
//                   <div key={i} className="bg-white p-6 rounded-xl animate-pulse h-24" />
//                 ))}
//               </div>
//             ) : (
//               <div className="grid md:grid-cols-4 gap-6">
//                 <Card title="Revenue" value={`₹${totalRevenue}`} />
//                 <Card title="Invoices" value={`${invoices.length}`} />
//                 <Card title="Pending" value={`₹${pendingAmount}`} />
//                 <Card title="Customers" value={`${customers.length}`} />
//               </div>
//             )}

//             {/* LOW STOCK */}
//             <div className="bg-white rounded-xl p-6 shadow-sm border">
//               <h2 className="font-semibold mb-4 flex items-center gap-2">
//                 ⚠ Low Stock
//               </h2>

//               {lowStockProducts.length === 0 ? (
//                 <p className="text-sm text-gray-500">All products in stock</p>
//               ) : (
//                 <div className="space-y-3">
//                   {lowStockProducts.map((p) => (
//                     <div key={p.id} className="flex justify-between items-center border-b pb-2 text-sm">
//                       <span>{p.name}</span>

//                       <div className="flex items-center gap-2">
//                         {p.stock === 0 && (
//                           <span className="bg-red-600 text-white px-2 py-1 text-xs rounded">
//                             Out
//                           </span>
//                         )}

//                         {p.stock > 0 && p.stock <= 2 && (
//                           <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-xs rounded">
//                             Low
//                           </span>
//                         )}

//                         <span className="text-red-500 font-semibold">
//                           {p.stock}
//                         </span>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* RECENT INVOICES */}
//             <div className="bg-white rounded-xl p-6 shadow-sm border">
//               <h2 className="font-semibold mb-4">Recent Invoices</h2>

//               {invoices.length === 0 ? (
//                 <p className="text-sm text-gray-500">No invoices yet</p>
//               ) : (
//                 <div className="space-y-3">
//                   {invoices.slice(0, 5).map((inv) => (
//                     <div key={inv.id} className="flex justify-between border-b pb-2 text-sm">
//                       <span>{inv.customerName}</span>
//                       <span className="font-medium">₹{inv.total}</span>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//           </main>
//         </div>
//       </div>
//     </ProtectedRoute>
//   );
// }

// /* CARD */
// function Card({ title, value }: { title: string; value: string }) {
//   return (
//     <div className="bg-white p-6 rounded-xl shadow-sm border">
//       <p className="text-sm text-gray-500">{title}</p>
//       <h3 className="text-2xl font-semibold mt-2">{value}</h3>
//     </div>
//   );
// }
