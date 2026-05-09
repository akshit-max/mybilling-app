// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import { runTransaction } from "firebase/firestore";
// import {
//   addDoc,
//   collection,
//   serverTimestamp,
//   getDocs,
//   query,
//   where,
//   doc,
//   updateDoc,
//   getDoc,
// } from "firebase/firestore";
// import toast from "react-hot-toast";
// import { useRouter } from "next/navigation";
// import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";

// /* TYPES */
// type Item = {
//   productId?: string;
//   name: string;
//   qty: number;
//   price: number;
// };

// type Customer = {
//   id: string;
//   name: string;
//   gstin?: string;
// };

// type Product = {
//   id: string;
//   name: string;
//   price: number;
// };

// type Status = "paid" | "pending" | "credit";

// export default function CreateInvoice() {
//   const router = useRouter();

//   const [customerName, setCustomerName] = useState("");
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);

//   const [items, setItems] = useState<Item[]>([
//     { name: "", qty: 1, price: 0 },
//   ]);

//   const [discountType, setDiscountType] =
//     useState<DiscountType>("flat");
//   const [discountValue, setDiscountValue] = useState(0);

//   const [gstEnabled, setGstEnabled] = useState(true);
//   const [status, setStatus] = useState<Status>("pending");

//   const [loading, setLoading] = useState(false);

//   /* 🔥 FETCH CUSTOMERS + PRODUCTS */
//   useEffect(() => {
//     const fetchData = async () => {
//       const user = auth.currentUser;
//       if (!user) return;

//       const cq = query(
//         collection(db, "customers"),
//         where("userId", "==", user.uid)
//       );
//       const csnap = await getDocs(cq);

//       setCustomers(
//         csnap.docs.map((docSnap) => ({
//           id: docSnap.id,
//           name: docSnap.data().name,
//         }))
//       );

//       const pq = query(
//         collection(db, "products"),
//         where("userId", "==", user.uid)
//       );
//       const psnap = await getDocs(pq);

//       setProducts(
//         psnap.docs.map((docSnap) => ({
//           id: docSnap.id,
//           name: docSnap.data().name,
//           price: docSnap.data().price,
//         }))
//       );
//     };

//     fetchData();
//   }, []);

// const generateInvoiceNumber = async (userId: string, now: Date) => {
//   const dateStr =
//     now.getFullYear().toString() +
//     String(now.getMonth() + 1).padStart(2, "0") +
//     String(now.getDate()).padStart(2, "0");

//   const counterRef = doc(db, "invoiceCounters", `${userId}_${dateStr}`);

//   const newNumber = await runTransaction(db, async (transaction) => {
//     const counterDoc = await transaction.get(counterRef);

//     let count = 1;

//     if (counterDoc.exists()) {
//       count = counterDoc.data().count + 1;
//     }

//     transaction.set(counterRef, { count });

//     return count;
//   });

//   const padded = String(newNumber).padStart(3, "0");

//   return `INV-${dateStr}-${padded}`;
// };

//   /* VALID ITEMS */
//   const validItems = items.filter(
//     (i) => i.name && i.qty > 0 && i.price > 0
//   );

//   const calc = calculateInvoice(
//     validItems,
//     discountType,
//     discountValue,
//     gstEnabled
//   );

//   /* UPDATE ITEM */
//   const updateItem = (
//     index: number,
//     field: keyof Item,
//     value: string | number
//   ) => {
//     const updated = [...items];

//     updated[index] = {
//       ...updated[index],
//       [field]: field === "name" ? value : Number(value),
//     };

//     setItems(updated);
//   };

//   /* ADD ITEM */
//   const addItem = () => {
//     setItems([...items, { name: "", qty: 1, price: 0 }]);
//   };

//   /* 🔥 SUBMIT */
//   const handleSubmit = async () => {
//     const now = new Date();
//     const user = auth.currentUser;
//     if (!user) return toast.error("Not logged in");

//     if (!customerName)
//       return toast.error("Select customer");

//     if (!validItems.length)
//       return toast.error("Add valid items");

//     try {
//       setLoading(true);

//       /* 🔥 STOCK CHECK + UPDATE */
//       for (const item of validItems) {
//         if (!item.productId) continue;

//         const productRef = doc(db, "products", item.productId);
//         const productSnap = await getDoc(productRef);

//         if (!productSnap.exists()) {
//           toast.error(`Product not found: ${item.name}`);
//           return;
//         }

//         const productData = productSnap.data();
//         const currentStock = productData?.stock || 0;

//         if (item.qty > currentStock) {
//           toast.error(
//             `Not enough stock for ${item.name} (Available: ${currentStock})`
//           );
//           return;
//         }

//         await updateDoc(productRef, {
//           stock: currentStock - item.qty,
//         });

//         if (currentStock - item.qty <= 2) {
//           toast(`Low stock: ${item.name}`);
//         }
//       }

//       /* 🔥 GENERATE NUMBER */
//       // const invoiceNumber = await generateInvoiceNumber(user.uid);
//       // const invoiceNumber = generateInvoiceNumber();
//       // const invoiceNumber = generateInvoiceNumber(now);
//       // const now = new Date();
//       const now = new Date();

// const invoiceNumber = await generateInvoiceNumber(user.uid, now);

//       /* 🧾 CREATE INVOICE */
//       await addDoc(collection(db, "invoices"), {
//         userId: user.uid,
//         invoiceNumber,

//         customerName,
//         items: validItems,

//         subtotal: calc.subtotal,
//         discountType,
//         discountValue,
//         discountAmount: calc.discountAmount,

//         gstEnabled,
//         cgst: calc.cgst,
//         sgst: calc.sgst,

//         total: calc.total,
//         status,

//         // createdAt: serverTimestamp(),
//         createdAt: now,
//       });

//       toast.success("Invoice created ✅");
//       router.push("/dashboard/invoices");

//     } catch (err) {
//       console.error(err);
//       toast.error("Failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#0B1120] text-white p-6">
//       <div className="max-w-3xl mx-auto space-y-6">

//         <h1>Create Invoice</h1>

//         {/* CUSTOMER */}
//         <select
//           value={customerName}
//           onChange={(e) => setCustomerName(e.target.value)}
//           className="w-full p-3 bg-white/10"
//         >
//           <option value="">Select Customer</option>
//           {customers.map((c) => (
//             <option key={c.id} value={c.name}>
//               {c.name}
//             </option>
//           ))}
//         </select>

//         {/* ITEMS */}
//         {items.map((item, i) => (
//           <div key={i} className="grid grid-cols-3 gap-2">

//             <select
//               value={item.productId || ""}
//               onChange={(e) => {
//                 const selected = products.find(
//                   (p) => p.id === e.target.value
//                 );

//                 if (!selected) return;

//                 const updated = [...items];
//                 updated[i] = {
//                   ...updated[i],
//                   productId: selected.id,
//                   name: selected.name,
//                   price: selected.price,
//                 };

//                 setItems(updated);
//               }}
//               className="p-2 bg-white/10"
//             >
//               <option value="">Select Product</option>
//               {products.map((p) => (
//                 <option key={p.id} value={p.id}>
//                   {p.name}
//                 </option>
//               ))}
//             </select>

//             <input
//               type="number"
//               value={item.qty}
//               onChange={(e) =>
//                 updateItem(i, "qty", Number(e.target.value))
//               }
//               className="p-2 bg-white/10"
//             />

//             <input
//               type="number"
//               value={item.price}
//               onChange={(e) =>
//                 updateItem(i, "price", Number(e.target.value))
//               }
//               className="p-2 bg-white/10"
//             />
//           </div>
//         ))}

//         <button onClick={addItem}>+ Add Item</button>

//         {/* DISCOUNT */}
//         <div className="flex gap-2">
//           <select
//             value={discountType}
//             onChange={(e) =>
//               setDiscountType(e.target.value as DiscountType)
//             }
//             className="p-2 bg-white/10"
//           >
//             <option value="flat">₹</option>
//             <option value="percent">%</option>
//           </select>

//           <input
//             type="number"
//             value={discountValue}
//             onChange={(e) =>
//               setDiscountValue(Number(e.target.value))
//             }
//             className="p-2 bg-white/10"
//           />
//         </div>

//         {/* GST */}
//         <label>
//           <input
//             type="checkbox"
//             checked={gstEnabled}
//             onChange={() => setGstEnabled(!gstEnabled)}
//           />
//           GST (18%)
//         </label>

//         {/* STATUS */}
//         <select
//           value={status}
//           onChange={(e) =>
//             setStatus(e.target.value as Status)
//           }
//           className="p-2 bg-white/10"
//         >
//           <option value="pending">Pending</option>
//           <option value="paid">Paid</option>
//           <option value="credit">Credit</option>
//         </select>

//         {/* TOTAL */}
//         <div className="font-semibold">
//           Total: ₹{calc.total}
//         </div>

//         <button
//           onClick={handleSubmit}
//           className="w-full bg-purple-600 p-3"
//         >
//           {loading ? "Creating..." : "Create Invoice"}
//         </button>

//       </div>
//     </div>
//   );
// }

// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import {
//   addDoc,
//   collection,
//   getDocs,
//   query,
//   where,
//   doc,
//   updateDoc,
//   getDoc,
//   runTransaction,
// } from "firebase/firestore";
// import { useRouter } from "next/navigation";
// import toast from "react-hot-toast";
// import Link from "next/link";

// import {
//   ArrowLeft,
//   Users,
//   Package,
//   Tag,
//   CheckCircle,
// } from "lucide-react";

// import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";

// /* TYPES */
// type Item = {
//   productId?: string;
//   name: string;
//   qty: number;
//   price: number;
// };

// type Customer = {
//   id: string;
//   name: string;
// };

// type Product = {
//   id: string;
//   name: string;
//   price: number;
// };

// type Status = "paid" | "pending" | "credit";

// export default function CreateInvoice() {
//   const router = useRouter();

//   const [customerName, setCustomerName] = useState("");
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);

//   const [items, setItems] = useState<Item[]>([
//     { name: "", qty: 1, price: 0 },
//   ]);

//   const [discountType, setDiscountType] =
//     useState<DiscountType>("flat");
//   const [discountValue, setDiscountValue] = useState(0);

//   const [gstEnabled, setGstEnabled] = useState(true);
//   const [status, setStatus] = useState<Status>("pending");

//   const [loading, setLoading] = useState(false);

//   /* 🔥 FETCH CUSTOMERS + PRODUCTS */
//   useEffect(() => {
//     const fetchData = async () => {
//       const user = auth.currentUser;
//       if (!user) return;

//       const cq = query(
//         collection(db, "customers"),
//         where("userId", "==", user.uid)
//       );
//       const csnap = await getDocs(cq);

//       setCustomers(
//         csnap.docs.map((d) => ({
//           id: d.id,
//           name: d.data().name,
//         }))
//       );

//       const pq = query(
//         collection(db, "products"),
//         where("userId", "==", user.uid)
//       );
//       const psnap = await getDocs(pq);

//       setProducts(
//         psnap.docs.map((d) => ({
//           id: d.id,
//           name: d.data().name,
//           price: d.data().price,
//         }))
//       );
//     };

//     fetchData();
//   }, []);

//   /* 🔥 INVOICE NUMBER (ORIGINAL LOGIC SAFE) */
//   const generateInvoiceNumber = async (
//     userId: string,
//     now: Date
//   ) => {
//     const dateStr =
//       now.getFullYear().toString() +
//       String(now.getMonth() + 1).padStart(2, "0") +
//       String(now.getDate()).padStart(2, "0");

//     const counterRef = doc(
//       db,
//       "invoiceCounters",
//       `${userId}_${dateStr}`
//     );

//     const newNumber = await runTransaction(db, async (tx) => {
//       const snap = await tx.get(counterRef);
//       let count = 1;

//       if (snap.exists()) {
//         count = snap.data().count + 1;
//       }

//       tx.set(counterRef, { count });

//       return count;
//     });

//     const padded = String(newNumber).padStart(3, "0");
//     return `INV-${dateStr}-${padded}`;
//   };

//   /* CALC */
//   const validItems = items.filter(
//     (i) => i.name && i.qty > 0 && i.price > 0
//   );

//   const calc = calculateInvoice(
//     validItems,
//     discountType,
//     discountValue,
//     gstEnabled
//   );

//   /* UPDATE ITEM */
//   const updateItem = (
//     index: number,
//     field: keyof Item,
//     value: string | number
//   ) => {
//     const updated = [...items];
//     updated[index] = {
//       ...updated[index],
//       [field]: field === "name" ? value : Number(value),
//     };
//     setItems(updated);
//   };

//   /* ADD ITEM */
//   const addItem = () => {
//     setItems([...items, { name: "", qty: 1, price: 0 }]);
//   };

//   /* 🔥 SUBMIT (FULL LOGIC PRESERVED) */
//   const handleSubmit = async () => {
//     const user = auth.currentUser;
//     if (!user) return toast.error("Not logged in");

//     if (!customerName)
//       return toast.error("Select customer");

//     if (!validItems.length)
//       return toast.error("Add valid items");

//     try {
//       setLoading(true);

//       /* 🔥 STOCK CHECK */
//       for (const item of validItems) {
//         if (!item.productId) continue;

//         const productRef = doc(db, "products", item.productId);
//         const snap = await getDoc(productRef);

//         if (!snap.exists()) {
//           toast.error(`Product not found: ${item.name}`);
//           return;
//         }

//         const stock = snap.data()?.stock || 0;

//         if (item.qty > stock) {
//           toast.error(
//             `Not enough stock for ${item.name} (Available: ${stock})`
//           );
//           return;
//         }

//         await updateDoc(productRef, {
//           stock: stock - item.qty,
//         });

//         if (stock - item.qty <= 2) {
//           toast(`Low stock: ${item.name}`);
//         }
//       }

//       const now = new Date();

//       const invoiceNumber = await generateInvoiceNumber(
//         user.uid,
//         now
//       );

//       /* 🔥 CREATE */
//       await addDoc(collection(db, "invoices"), {
//         userId: user.uid,
//         invoiceNumber,

//         customerName,
//         items: validItems,

//         subtotal: calc.subtotal,
//         discountType,
//         discountValue,
//         discountAmount: calc.discountAmount,

//         gstEnabled,
//         cgst: calc.cgst,
//         sgst: calc.sgst,

//         total: calc.total,
//         status,

//         createdAt: now,
//       });

//       toast.success("Invoice created ✅");
//       router.push("/dashboard/invoices");

//     } catch (err) {
//       console.error(err);
//       toast.error("Failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <section className="bg-gray-50 min-h-screen py-10">
//       <div className="max-w-5xl mx-auto px-6">

//         {/* HEADER */}
//         <div className="flex items-center justify-between mb-8">
//           <h1 className="text-3xl font-semibold text-gray-900">
//             Create Invoice
//           </h1>

//           <Link
//             href="/dashboard/invoices"
//             className="flex items-center gap-2 text-sm px-4 py-2 border rounded-lg hover:bg-gray-100"
//           >
//             <ArrowLeft size={16} />
//             Back to Invoices
//           </Link>
//         </div>

//         {/* CARD */}
//         <div className="bg-white rounded-xl border p-6 space-y-6 shadow-sm">

//           {/* CUSTOMER */}
//           <div>
//             <div className="flex items-center gap-2 mb-2">
//               <Users size={16} className="text-purple-600" />
//               <p className="text-sm font-medium">Customer</p>
//             </div>

//             <select
//               value={customerName}
//               onChange={(e) => setCustomerName(e.target.value)}
//               className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
//             >
//               <option value="">Select Customer</option>
//               {customers.map((c) => (
//                 <option key={c.id} value={c.name}>
//                   {c.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* ITEMS */}
//           <div>
//             <div className="flex items-center gap-2 mb-3">
//               <Package size={16} className="text-purple-600" />
//               <p className="text-sm font-medium">Items</p>
//             </div>

//             <div className="grid grid-cols-3 gap-3 mb-2 text-xs text-gray-500">
//               <p>Product</p>
//               <p>Qty</p>
//               <p>Price</p>
//             </div>

//             <div className="space-y-3">
//               {items.map((item, i) => (
//                 <div key={i} className="grid grid-cols-3 gap-3">

//                   <select
//                     value={item.productId || ""}
//                     onChange={(e) => {
//                       const p = products.find(
//                         (p) => p.id === e.target.value
//                       );
//                       if (!p) return;

//                       const updated = [...items];
//                       updated[i] = {
//                         productId: p.id,
//                         name: p.name,
//                         qty: 1,
//                         price: p.price,
//                       };
//                       setItems(updated);
//                     }}
//                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                   >
//                     <option value="">Select product</option>
//                     {products.map((p) => (
//                       <option key={p.id} value={p.id}>
//                         {p.name}
//                       </option>
//                     ))}
//                   </select>

//                   <input
//                     type="number"
//                     value={item.qty}
//                     onChange={(e) =>
//                       updateItem(i, "qty", e.target.value)
//                     }
//                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                   />

//                   <input
//                     type="number"
//                     value={item.price}
//                     onChange={(e) =>
//                       updateItem(i, "price", e.target.value)
//                     }
//                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                   />
//                 </div>
//               ))}
//             </div>

//             <button
//               onClick={addItem}
//               className="mt-3 text-sm text-purple-600"
//             >
//               + Add Item
//             </button>
//           </div>

//           {/* DISCOUNT + STATUS */}
//           <div className="grid md:grid-cols-2 gap-6">

//             <div>
//               <div className="flex items-center gap-2 mb-2">
//                 <Tag size={16} className="text-purple-600" />
//                 <p className="text-sm font-medium">Discount</p>
//               </div>

//               <div className="flex gap-2">
//                 <select
//                   value={discountType}
//                   onChange={(e) =>
//                     setDiscountType(e.target.value as DiscountType)
//                   }
//                   className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                 >
//                   <option value="flat">₹</option>
//                   <option value="percent">%</option>
//                 </select>

//                 <input
//                   type="number"
//                   value={discountValue}
//                   onChange={(e) =>
//                     setDiscountValue(Number(e.target.value))
//                   }
//                   className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                 />
//               </div>
//             </div>

//             <div>
//               <div className="flex items-center gap-2 mb-2">
//                 <CheckCircle size={16} className="text-purple-600" />
//                 <p className="text-sm font-medium">Status</p>
//               </div>

//               <select
//                 value={status}
//                 onChange={(e) =>
//                   setStatus(e.target.value as Status)
//                 }
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
//               >
//                 <option value="pending">Pending</option>
//                 <option value="paid">Paid</option>
//                 <option value="credit">Credit</option>
//               </select>
//             </div>
//           </div>

//           {/* GST + TOTAL */}
//           <div className="flex items-center justify-between border-t pt-4">
//             <label className="flex items-center gap-2 text-sm">
//               <input
//                 type="checkbox"
//                 checked={gstEnabled}
//                 onChange={() => setGstEnabled(!gstEnabled)}
//               />
//               Apply GST (18%)
//             </label>

//             <div className="text-right">
//               <p className="text-sm text-gray-500">Total</p>
//               <p className="text-xl font-semibold">
//                 ₹{calc.total}
//               </p>
//             </div>
//           </div>

//           {/* SUBMIT */}
//           <button
//             onClick={handleSubmit}
//             className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg"
//           >
//             {loading ? "Creating..." : "Create Invoice"}
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// }

"use client";
import BarcodeScanner from "react-qr-barcode-scanner";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { ArrowLeft, Users, Package, Tag, CheckCircle } from "lucide-react";

import { saveOfflineInvoice } from "@/lib/offlineInvoices";
import {
  cacheCustomers,
  cacheProducts,
  getCachedCustomers,
  getCachedProducts,
} from "@/lib/indexedDB";

import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";

/* TYPES */
type Item = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
};

type Customer = {
  id: string;
  name: string;
  gstin?: string; // ✅ ADDED
  phone?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  stock?: number;
};

type Status = "paid" | "pending" | "credit";

export default function CreateInvoice() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  const [isOffline, setIsOffline] = useState(false);

  const [scannedBarcode, setScannedBarcode] = useState("");

  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, price: 0 }]);

  const [discountType, setDiscountType] = useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState(0);

  const [gstEnabled, setGstEnabled] = useState(true);
  const [status, setStatus] = useState<Status>("pending");

  const [loading, setLoading] = useState(false);

  /* FETCH */
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const cq = query(
          collection(db, "customers"),
          where("userId", "==", user.uid),
        );
        const csnap = await getDocs(cq);
        const customerList = csnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          gstin: d.data().gstin || "",
          phone: d.data().phone || "",
        }));
        setCustomers(customerList);
        await cacheCustomers(customerList);

        const pq = query(
          collection(db, "products"),
          where("userId", "==", user.uid),
        );
        const psnap = await getDocs(pq);
        const productList = psnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          price: d.data().price,
          barcode: d.data().barcode || "",
          stock: d.data().stock || 0,
        }));
        setProducts(productList);
        await cacheProducts(productList);
      } catch (err) {
        console.error(err);
        const cachedCustomers = await getCachedCustomers();
        const cachedProducts = await getCachedProducts();
        setCustomers(cachedCustomers);
        setProducts(cachedProducts);
        if (!cachedCustomers.length && !cachedProducts.length) {
          toast("Offline cache empty. You can still create invoice manually.");
        } else {
          toast("Loaded cached customers/products for offline mode.");
        }
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const updateStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    updateStatus();

    window.addEventListener("online", updateStatus);

    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);

      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  /* INVOICE NUMBER */
  const generateInvoiceNumber = async (userId: string, now: Date) => {
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const counterRef = doc(db, "invoiceCounters", `${userId}_${dateStr}`);

    const newNumber = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      let count = 1;

      if (snap.exists()) {
        count = snap.data().count + 1;
      }

      tx.set(counterRef, { count });

      return count;
    });

    const padded = String(newNumber).padStart(3, "0");
    return `INV-${dateStr}-${padded}`;
  };

  /* CALC */
  const validItems = items.filter((i) => i.name && i.qty > 0 && i.price > 0);

  const calc = calculateInvoice(
    validItems,
    discountType,
    discountValue,
    gstEnabled,
  );

  /* UPDATE ITEM */
  const updateItem = (
    index: number,
    field: keyof Item,
    value: string | number,
  ) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: field === "name" ? value : Number(value),
    };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: "", qty: 1, price: 0 }]);
  };

  /* SUBMIT */
  // const handleSubmit = async () => {
  //   const user = auth.currentUser;
  //   if (!user) return toast.error("Not logged in");

  //   if (!customerName) return toast.error("Select customer");

  //   if (!validItems.length) return toast.error("Add valid items");

  //   try {
  //     setLoading(true);

  //     /* STOCK CHECK */
  //     for (const item of validItems) {
  //       if (!item.productId) continue;

  //       const productRef = doc(db, "products", item.productId);
  //       const snap = await getDoc(productRef);

  //       if (!snap.exists()) {
  //         toast.error(`Product not found: ${item.name}`);
  //         return;
  //       }

  //       const stock = snap.data()?.stock || 0;

  //       if (item.qty > stock) {
  //         toast.error(
  //           `Not enough stock for ${item.name} (Available: ${stock})`,
  //         );
  //         return;
  //       }

  //       await updateDoc(productRef, {
  //         stock: stock - item.qty,
  //       });

  //       if (stock - item.qty <= 2) {
  //         toast(`Low stock: ${item.name}`);
  //       }
  //     }

  //     const now = new Date();

  //     const invoiceNumber = await generateInvoiceNumber(user.uid, now);

  //     const selectedCustomer = customers.find((c) => c.name === customerName);

  //     const invoiceData = {
  //       userId: user.uid,
  //       invoiceNumber,

  //       customerName,
  //       customerGSTIN: selectedCustomer?.gstin || "",

  //       customerPhone: selectedCustomer?.phone || "",

  //       items: validItems,

  //       subtotal: calc.subtotal,

  //       discountType,
  //       discountValue,

  //       discountAmount: calc.discountAmount,

  //       gstEnabled,

  //       cgst: calc.cgst,
  //       sgst: calc.sgst,

  //       total: calc.total,

  //       status,

  //       createdAt: now,
  //     };

  //     // await addDoc(collection(db, "invoices"), {
  //     //   userId: user.uid,
  //     //   invoiceNumber,

  //     //   customerName,
  //     //   customerGSTIN: selectedCustomer?.gstin || "", // ✅ ONLY ADDITION
  //     //   customerPhone: selectedCustomer?.phone || "",

  //     //   items: validItems,

  //     //   subtotal: calc.subtotal,
  //     //   discountType,
  //     //   discountValue,
  //     //   discountAmount: calc.discountAmount,

  //     //   gstEnabled,
  //     //   cgst: calc.cgst,
  //     //   sgst: calc.sgst,

  //     //   total: calc.total,
  //     //   status,

  //     //   createdAt: now,
  //     // });

  //     if (!navigator.onLine) {
  //       await saveOfflineInvoice(invoiceData);

  //       toast.success("Invoice saved offline ✅");

  //       router.push("/dashboard/invoices");

  //       return;
  //     }

  //     await addDoc(collection(db, "invoices"), invoiceData);
  //     toast.success("Invoice created ✅");
  //     router.push("/dashboard/invoices");
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Failed");
  //   } finally {
  //     setLoading(false);
  //   }
  // };



  const handleSubmit = async () => {

  const user = auth.currentUser;

  if (!user)
    return toast.error(
      "Not logged in"
    );

  if (!customerName)
    return toast.error(
      "Select customer"
    );

  if (!validItems.length)
    return toast.error(
      "Add valid items"
    );

  try {

    setLoading(true);

    const now = new Date();

    /* OFFLINE HELPER */
    const executeOfflineSave = async () => {
      const dateStr =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");
      const invoiceNumber = `OFFLINE-${dateStr}-${Date.now()}`;
      const selectedCustomer = customers.find((c) => c.name === customerName);

      const offlineInvoiceData = {
        userId: user.uid,
        invoiceNumber,
        customerName,
        customerGSTIN: selectedCustomer?.gstin || "",
        customerPhone: selectedCustomer?.phone || "",
        items: validItems,
        subtotal: calc.subtotal,
        discountType,
        discountValue,
        discountAmount: calc.discountAmount,
        gstEnabled,
        cgst: calc.cgst,
        sgst: calc.sgst,
        total: calc.total,
        status,
        createdAt: now,
        offline: true,
      };

      const stockUsageByProduct = new Map<string, number>();
      for (const item of validItems) {
        if (!item.productId) continue;
        stockUsageByProduct.set(item.productId, (stockUsageByProduct.get(item.productId) || 0) + item.qty);
      }

      for (const [productId, requestedQty] of stockUsageByProduct) {
        const cachedProduct = products.find((p) => p.id === productId);
        const availableStock = cachedProduct?.stock ?? 0;

        if (requestedQty > availableStock) {
          toast.error(`Not enough offline stock for ${cachedProduct?.name || "product"} (Available: ${availableStock})`);
          setLoading(false);
          return;
        }
      }

      // Delay setLoading(false) to prevent double clicks during save
      await saveOfflineInvoice(offlineInvoiceData as any);

      const updatedProducts = products.map((product) => {
        const usedQty = stockUsageByProduct.get(product.id) || 0;
        if (!usedQty) return product;
        return { ...product, stock: Math.max(0, (product.stock || 0) - usedQty) };
      });

      setProducts(updatedProducts);
      await cacheProducts(updatedProducts);

      toast.success("Invoice saved offline ✅");
      window.dispatchEvent(
  new Event("offline-invoice-created")
);


      setLoading(false);
      window.location.replace(
  "/dashboard/invoices"
);

throw new Error(
  "__OFFLINE_REDIRECT__"
);
      // return Promise.resolve();
    };

    /* OFFLINE FIRST EXECUTION */
    // if (!navigator.onLine) {
    //   return executeOfflineSave();
    // }

    // /* ONLINE EXECUTION BELOW */
    // let invoiceNumber;
    // try {
    //   invoiceNumber = await generateInvoiceNumber(user.uid, now);
    // } catch (err) {
    //   console.warn("Falling back to offline invoice save", err);
    //   return executeOfflineSave();
    // }

    /* REAL CONNECTIVITY TEST */

    /* 1. INSTANT PHYSICAL DISCONNECT CHECK */
if (!navigator.onLine) {
  return executeOfflineSave();
}

/* 2. REAL CONNECTIVITY TEST (LIE-FI CHECK) */
try {

  await fetch(
    `/favicon.ico?_=${Date.now()}`,
    {
      method: "HEAD",
      cache: "no-store",
    }
  );

} catch (err) {

  console.warn(
    "Internet unreachable (Lie-Fi), saving offline",
    err
  );

  return executeOfflineSave();
}
// try {

//   await fetch("/favicon.ico", {
//     method: "HEAD",
//     cache: "no-store",
//   });

// } catch (err) {

//   console.warn(
//     "Internet unreachable, saving offline",
//     err
//   );

//   return executeOfflineSave();
// }

/* ONLINE EXECUTION BELOW */
let invoiceNumber;

try {

  invoiceNumber =
    await generateInvoiceNumber(
      user.uid,
      now
    );

} catch (err) {

  console.warn(
    "Falling back to offline invoice save",
    err
  );

  return executeOfflineSave();
}

    const selectedCustomer = customers.find((c) => c.name === customerName);

    const invoiceData = {
      userId: user.uid,
      invoiceNumber,
      customerName,
      customerGSTIN: selectedCustomer?.gstin || "",
      customerPhone: selectedCustomer?.phone || "",
      items: validItems,
      subtotal: calc.subtotal,
      discountType,
      discountValue,
      discountAmount: calc.discountAmount,
      gstEnabled,
      cgst: calc.cgst,
      sgst: calc.sgst,
      total: calc.total,
      status,
      createdAt: now,
    };

    /* STOCK CHECK */

    for (const item of validItems) {

      if (!item.productId)
        continue;

      const productRef = doc(
        db,
        "products",
        item.productId
      );

      const snap =
        await getDoc(
          productRef
        );

      if (!snap.exists()) {

        toast.error(
          `Product not found: ${item.name}`
        );

        return;

      }

      const stock =
        snap.data()?.stock || 0;

      if (item.qty > stock) {

        toast.error(
          `Not enough stock for ${item.name} (Available: ${stock})`
        );

        return;

      }

      await updateDoc(
        productRef,
        {
          stock:
            stock - item.qty,
        }
      );

      if (
        stock - item.qty <= 2
      ) {

        toast(
          `Low stock: ${item.name}`
        );

      }

    }

    /* FIREBASE SAVE */

    await addDoc(
      collection(
        db,
        "invoices"
      ),
      invoiceData
    );

    toast.success(
      "Invoice created ✅"
    );

    router.push(
      "/dashboard/invoices"
    );

  } catch (err) {

  if (
    err instanceof Error &&
    err.message ===
      "__OFFLINE_REDIRECT__"
  ) {
    return;
  }

  console.error(err);

  toast.error("Failed");

} finally {

  setLoading(false);

}

};

  return (
    <section className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            Create Invoice
          </h1>

          <Link
            href="/dashboard/invoices"
            className="flex items-center gap-2 text-sm px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            Back to Invoices
          </Link>
        </div>

        {isOffline && (
          <div
            className="
      bg-yellow-100
      border
      border-yellow-300
      text-yellow-800
      px-4
      py-3
      rounded-xl
      mb-4
      text-sm
    "
          >
            You are offline. Invoices will sync automatically.
          </div>
        )}

        {/* CARD */}
        <div className="bg-white rounded-xl border p-6 space-y-6 shadow-sm">
          {/* CUSTOMER */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-purple-600" />
              <p className="text-sm font-medium">Customer</p>
            </div>

            <select
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* ITEMS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-purple-600" />
              <p className="text-sm font-medium">Items</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-2 text-xs text-gray-500">
              <p>Product</p>
              <p>Qty</p>
              <p>Price</p>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-3 gap-3">
                  <select
                    value={item.productId || ""}
                    onChange={(e) => {
                      const p = products.find((p) => p.id === e.target.value);
                      if (!p) return;

                      const updated = [...items];
                      updated[i] = {
                        productId: p.id,
                        name: p.name,
                        qty: 1,
                        price: p.price,
                      };
                      setItems(updated);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  {/* <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="
    bg-purple-600
    hover:bg-purple-700
    text-white
    px-4
    py-2
    rounded-lg
    text-sm
  "
                  >
                    Scan Barcode
                  </button> */}

                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />

                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />

                   <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="
    bg-purple-600
    hover:bg-purple-700
    text-white
    px-4
    py-2
    rounded-lg
    text-sm
  "
                  >
                    Scan Barcode
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addItem} className="mt-3 text-sm text-purple-600">
              + Add Item
            </button>
          </div>
          {showScanner && (
            <div className="mt-6">
              <div
                className="
        max-w-xl
        mx-auto
        bg-black
        rounded-2xl
        overflow-hidden
        border-4
        border-purple-500
      "
              >
                <BarcodeScanner
                  width={500}
                  height={300}
                  onUpdate={(err, result) => {
                    if (result) {
                      const text = result.getText();

                      const found = products.find((p) => p.barcode === text);

                      if (found) {
                        toast.success(`${found.name} scanned`);

                        setItems((prev) => [
                          ...prev,

                          {
                            productId: found.id,
                            name: found.name,
                            qty: 1,
                            price: found.price,
                          },
                        ]);
                      } else {
                        toast.error("Product not found");
                      }

                      setShowScanner(false);
                    }
                  }}
                />
              </div>

              <p className="text-center text-sm text-gray-500 mt-3">
                Point camera at barcode
              </p>
            </div>
          )}

          {/* DISCOUNT + STATUS */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={16} className="text-purple-600" />
                <p className="text-sm font-medium">Discount</p>
              </div>

              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as DiscountType)
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="flat">₹</option>
                  <option value="percent">%</option>
                </select>

                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-purple-600" />
                <p className="text-sm font-medium">Status</p>
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>

          {/* GST + TOTAL */}
          <div className="flex items-center justify-between border-t pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={() => setGstEnabled(!gstEnabled)}
              />
              Apply GST (18%)
            </label>

            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-semibold">₹{calc.total}</p>
            </div>
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-600"
            }`}
          >
            {loading ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </div>
    </section>
  );
}
