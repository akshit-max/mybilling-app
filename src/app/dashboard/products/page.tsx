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
// import Link from "next/link";

// type Product = {
//   id: string;
//   name: string;
//   price: number;
//   stock: number;
// };

// export default function ProductsPage() {
//   const [products, setProducts] = useState<Product[]>([]);

//   useEffect(() => {
//     const fetch = async () => {
//       const user = auth.currentUser;
//       if (!user) return;

//       const q = query(
//         collection(db, "products"),
//         where("userId", "==", user.uid),
//       );

//       const snap = await getDocs(q);

//       setProducts(
//         snap.docs.map((doc) => ({
//           id: doc.id,
//           name: doc.data().name,
//           price: doc.data().price,
//           stock: doc.data().stock,
//         })),
//       );
//     };

//     fetch();
//   }, []);

//   const handleDelete = async (id: string) => {
//     await deleteDoc(doc(db, "products", id));
//     setProducts((prev) => prev.filter((p) => p.id !== id));
//   };

//   return (
//     <div className="p-6 text-white bg-[#0B1120] min-h-screen">
//       <div className="max-w-4xl mx-auto space-y-4">
//         <div className="flex justify-between">
//           <h1>Products</h1>

//           <Link href="/dashboard/products/create">Add Product</Link>
//         </div>

//         {products.map((p) => (
//   <div
//     key={p.id}
//     className="flex justify-between items-center p-4 border-b"
//   >
//     {/* LEFT */}
//     <div>
//       <p className="font-medium flex items-center gap-2">
//         {p.name}

//         {/* 🔴 OUT OF STOCK */}
//         {p.stock === 0 && (
//           <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
//             Out of Stock
//           </span>
//         )}

//         {/* 🟡 LOW STOCK */}
//         {p.stock > 0 && p.stock <= 2 && (
//           <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded">
//             Low Stock
//           </span>
//         )}
//       </p>

//       <p className="text-sm text-gray-500">
//         ₹{p.price}
//       </p>
//     </div>

//     {/* RIGHT */}
//     <div className="flex items-center gap-4 text-sm">
//       <p className="text-gray-600">
//         Stock: {p.stock}
//       </p>

//       <Link
//         href={`/dashboard/products/edit/${p.id}`}
//         className="text-purple-400 hover:underline"
//       >
//         Edit
//       </Link>

//       <button
//         onClick={() => handleDelete(p.id)}
//         className="text-red-500 hover:underline"
//       >
//         Delete
//       </button>
//     </div>
//   </div>
// ))}
//       </div>
//     </div>
//   );
// }

// "use client";
// import Barcode from "react-barcode";
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
// import Link from "next/link";

// import { Package, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

// type Product = {
//   id: string;
//   name: string;
//   price: number;
//   stock: number;
//   barcode: string;
// };

// export default function ProductsPage() {
//   const [products, setProducts] = useState<Product[]>([]);

//   useEffect(() => {
//     const fetch = async () => {
//       const user = auth.currentUser;
//       if (!user) return;

//       const q = query(
//         collection(db, "products"),
//         where("userId", "==", user.uid),
//       );

//       const snap = await getDocs(q);

//       setProducts(
//         snap.docs.map((doc) => ({
//           id: doc.id,
//           name: doc.data().name,
//           price: doc.data().price,
//           stock: doc.data().stock,
//           barcode: doc.data().barcode,
//         })),
//       );
//     };

//     fetch();
//   }, []);

//   const handleDelete = async (id: string) => {
//     await deleteDoc(doc(db, "products", id));
//     setProducts((prev) => prev.filter((p) => p.id !== id));
//   };

//   /* STATUS STYLE */
//   const getStockBadge = (stock: number) => {
//     if (stock === 0) return "bg-red-100 text-red-600";
//     if (stock <= 2) return "bg-yellow-100 text-yellow-600";
//     return "bg-green-100 text-green-600";
//   };

//   return (
//     <div className="min-h-screen bg-[#F9FAFB] p-6">
//       <div className="max-w-7xl mx-auto space-y-6">
//         {/* 🔥 HEADER */}
//         <div className="flex items-center justify-between">
//           {/* LEFT */}
//           <div className="flex items-center gap-3">
//             <Package className="text-purple-600" size={20} />
//             <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
//           </div>

//           {/* RIGHT ACTIONS */}
//           <div className="flex items-center gap-3">
//             {/* BACK */}
//             <Link
//               href="/dashboard"
//               className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
//             >
//               <ArrowLeft size={16} />
//               Dashboard
//             </Link>

//             {/* ADD PRODUCT */}
//             <Link
//               href="/dashboard/products/create"
//               className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
//             >
//               <Plus size={16} />
//               Add Product
//             </Link>
//           </div>
//         </div>

//         {/* 📦 CARD */}
//         <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
//           {products.length === 0 ? (
//             <p className="p-6 text-sm text-gray-500">No products found</p>
//           ) : (
//             <div className="divide-y">
//               {products.map((p) => (
//                 <div
//                   key={p.id}
//                   className="p-5 flex justify-between items-center hover:bg-gray-50 transition"
//                 >
//                   {/* LEFT */}
//                   <div className="space-y-1">
//                     <p className="font-medium text-gray-900 flex items-center gap-2">
//                       {p.name}

//                       <span
//                         className={`px-2.5 py-1 rounded text-xs font-medium ${getStockBadge(
//                           p.stock,
//                         )}`}
//                       >
//                         {p.stock === 0
//                           ? "Out of Stock"
//                           : p.stock <= 2
//                             ? "Low Stock"
//                             : "In Stock"}
//                       </span>
//                     </p>

//                     <p className="text-sm text-gray-600">₹{p.price}</p>
//                   </div>

//                   {/* RIGHT */}
//                   <div className="flex items-center gap-4">
//                     <p className="text-sm text-gray-500">Stock: {p.stock}</p>

//                     <Link
//                       href={`/dashboard/products/edit/${p.id}`}
//                       className="p-2 rounded hover:bg-gray-100 text-purple-600 transition"
//                     >
//                       <Pencil size={16} />
//                     </Link>

//                     <button
//                       onClick={() => handleDelete(p.id)}
//                       className="p-2 rounded hover:bg-red-100 text-red-500 transition"
//                     >
//                       <Trash2 size={16} />
//                     </button>
//                   </div>
//                   <div className="mt-4 overflow-x-auto">
//                     <Barcode
//                       value={p.barcode || "N/A"}
//                       width={1.2}
//                       height={40}
//                       fontSize={12}
//                       displayValue={true}
//                     />

//                     <button
//                       onClick={() => window.print()}
//                       className="
//       mt-3
//       bg-purple-600
//       hover:bg-purple-700
//       text-white
//       px-4
//       py-2
//       rounded-lg
//       text-sm
//     "
//                     >
//                       Print Barcode
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

import Barcode from "react-barcode";
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

import Link from "next/link";

import { Package, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const user = auth.currentUser;
      if (!user) return;

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

        if (isOfflineMode) {
          throw new Error("Offline");
        }

        const q = query(
          collection(db, "products"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);

        setProducts(
          snap.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            price: doc.data().price,
            stock: doc.data().stock,
            barcode: doc.data().barcode || "",
          }))
        );
      } catch (err) {
        // Fallback to local cache
        const { getCachedProducts } = await import("@/lib/indexedDB");
        const cached = await getCachedProducts();
        setProducts(cached as any);
      }
    };

    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "products", id));

    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return "bg-red-100 text-red-600";

    if (stock <= 2) return "bg-yellow-100 text-yellow-700";

    return "bg-green-100 text-green-700";
  };

  const printBarcode = (barcode: string) => {
    const content = document.getElementById(`barcode-${barcode}`);

    if (!content) return;

    const pri = window.open("", "", "width=600,height=600");

    if (!pri) return;

    pri.document.write(`
    <html>

      <head>

        <title>Print Barcode</title>

        <style>

          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial;
            flex-direction: column;
          }

        </style>

      </head>

      <body>

        ${content.innerHTML}

      </body>

    </html>
  `);

    pri.document.close();

    pri.focus();

    setTimeout(() => {
      pri.print();
      pri.close();
    }, 500);
  };
  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}

        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* LEFT */}

          <div className="flex items-center gap-3">
            <div
              className="
                h-11
                w-11
                rounded-xl
                bg-purple-100
                flex
                items-center
                justify-center
              "
            >
              <Package className="text-purple-600" size={22} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">Products</h1>

              <p className="text-sm text-gray-500">
                Manage inventory & barcodes
              </p>
            </div>
          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-3">
            {/* BACK */}

            <Link
              href="/dashboard"
              className="
                flex items-center gap-2
                border border-gray-300
                bg-white
                px-4 py-2.5
                rounded-xl
                text-sm
                text-gray-700
                hover:bg-gray-100
                transition
              "
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            {/* ADD PRODUCT */}

            <Link
              href="/dashboard/products/create"
              className="
                flex items-center gap-2
                bg-gradient-to-r
                from-purple-600
                to-indigo-600
                hover:from-purple-700
                hover:to-indigo-700
                text-white
                px-6 py-2.5
                rounded-xl
                text-sm
                font-medium
                transition
              "
            >
              <Plus size={16} />
              Add Product
            </Link>
          </div>
        </div>

        {/* PRODUCT LIST */}

        <div
          className="
            bg-white
            border border-gray-200
            rounded-2xl
            overflow-hidden
            shadow-sm
          "
        >
          {products.length === 0 ? (
            <div className="p-12 text-center">
              <Package
                size={42}
                className="
                  mx-auto
                  text-gray-300
                  mb-4
                "
              />

              <h2 className="text-lg font-semibold text-gray-700">
                No Products Yet
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Add products to start managing inventory
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="
                    px-6 py-5
                    flex
                    items-center
                    justify-between
                    gap-6
                    hover:bg-gray-50
                    transition
                    flex-wrap
                  "
                >
                  {/* LEFT */}

                  <div className="space-y-2 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {p.name}
                      </h2>

                      <span
                        className={`
                          px-2 py-1
                          rounded-md
                          text-xs
                          font-medium
                          ${getStockBadge(p.stock)}
                        `}
                      >
                        {p.stock === 0
                          ? "Out of Stock"
                          : p.stock <= 2
                            ? "Low Stock"
                            : "In Stock"}
                      </span>
                    </div>

                    <p className="text-2xl font-bold text-gray-900">
                      ₹{p.price}
                    </p>

                    <p className="text-sm text-gray-500">Stock: {p.stock}</p>
                  </div>

                  {/* CENTER */}

                  {/* <div className="flex flex-col items-center"> */}
                  <div
                    id={`barcode-${p.barcode || p.id}`}
                    className="flex flex-col items-center"
                  >
                    <Barcode
                      value={p.barcode || p.id}
                      width={2}
                      height={60}
                      fontSize={11}
                      displayValue={true}
                    />
{/* 
                    <p className="text-xs text-gray-400 mt-2">
                      {p.barcode || p.id}
                    </p> */}
                  </div>

                  {/* RIGHT */}

                  <div className="flex items-center gap-3">
                    {/* PRINT */}

                    <button
                      onClick={() => printBarcode(p.barcode || p.id)}
                      className="
                        bg-purple-600
                        hover:bg-purple-700
                        text-white
                        px-4 py-2
                        rounded-lg
                        text-sm
                        transition
                      "
                    >
                      Print
                    </button>

                    {/* EDIT */}

                    <Link
                      href={`/dashboard/products/edit/${p.id}`}
                      className="
                        p-2.5
                        rounded-lg
                        border border-gray-200
                        hover:bg-gray-100
                        text-purple-600
                        transition
                      "
                    >
                      <Pencil size={18} />
                    </Link>

                    {/* DELETE */}

                    <button
                      onClick={() => handleDelete(p.id)}
                      className="
                        p-2.5
                        rounded-lg
                        border border-gray-200
                        hover:bg-red-100
                        text-red-500
                        transition
                      "
                    >
                      <Trash2 size={18} />
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
