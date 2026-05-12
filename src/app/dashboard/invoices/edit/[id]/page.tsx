


// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import {
//   doc,
//   getDoc,
//   updateDoc,
//   collection,
//   getDocs,
//   query,
//   where,
// } from "firebase/firestore";
// import { useParams, useRouter } from "next/navigation";
// import toast from "react-hot-toast";
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

// export default function EditInvoice() {
//   const { id } = useParams() as { id: string };
//   const router = useRouter();

//   const [customerName, setCustomerName] = useState("");
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);

//   const [items, setItems] = useState<Item[]>([]);
//   const [originalItems, setOriginalItems] = useState<Item[]>([]); // 🔥 IMPORTANT

//   const [discountType, setDiscountType] =
//     useState<DiscountType>("flat");
//   const [discountValue, setDiscountValue] = useState(0);

//   const [gstEnabled, setGstEnabled] = useState(true);
//   const [status, setStatus] = useState<Status>("pending");

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   /* 🔥 FETCH ALL DATA */
//   useEffect(() => {
//     const fetchData = async () => {
//       const user = auth.currentUser;
//       if (!user) return;

//       try {
//         const snap = await getDoc(doc(db, "invoices", id));

//         if (snap.exists()) {
//           const d = snap.data();

//           setCustomerName(d.customerName || "");

//           const fetchedItems = d.items || [];
//           setItems(fetchedItems);
//           setOriginalItems(fetchedItems); // 🔥 STORE ORIGINAL

//           setDiscountType(d.discountType || "flat");
//           setDiscountValue(d.discountValue || 0);
//           setGstEnabled(d.gstEnabled ?? true);
//           setStatus(d.status || "pending");
//         }

//         const cq = query(
//           collection(db, "customers"),
//           where("userId", "==", user.uid)
//         );
//         const csnap = await getDocs(cq);

//         setCustomers(
//           csnap.docs.map((docSnap) => ({
//             id: docSnap.id,
//             name: docSnap.data().name,
//           }))
//         );

//         const pq = query(
//           collection(db, "products"),
//           where("userId", "==", user.uid)
//         );
//         const psnap = await getDocs(pq);

//         setProducts(
//           psnap.docs.map((docSnap) => ({
//             id: docSnap.id,
//             name: docSnap.data().name,
//             price: docSnap.data().price,
//           }))
//         );
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [id]);

//   /* 🔹 CALC */
//   const validItems = items.filter(
//     (i) => i.name && i.qty > 0 && i.price > 0
//   );

//   const calc = calculateInvoice(
//     validItems,
//     discountType,
//     discountValue,
//     gstEnabled
//   );

//   /* 🔹 UPDATE ITEM */
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

//   const addItem = () => {
//     setItems([...items, { name: "", qty: 1, price: 0 }]);
//   };

//   /* 🔥 STOCK-AWARE UPDATE */
//   const handleUpdate = async () => {
//     if (!customerName)
//       return toast.error("Select customer");

//     if (!validItems.length)
//       return toast.error("Add valid items");

//     try {
//       setSaving(true);

//       const oldMap = new Map();
//       const newMap = new Map();

//       originalItems.forEach((item) => {
//         if (item.productId)
//           oldMap.set(item.productId, item.qty);
//       });

//       validItems.forEach((item) => {
//         if (item.productId)
//           newMap.set(item.productId, item.qty);
//       });

//       const allIds = new Set([
//         ...oldMap.keys(),
//         ...newMap.keys(),
//       ]);

//       for (const pid of allIds) {
//         const oldQty = oldMap.get(pid) || 0;
//         const newQty = newMap.get(pid) || 0;

//         const diff = newQty - oldQty;

//         if (diff === 0) continue;

//         const ref = doc(db, "products", pid);
//         const snap = await getDoc(ref);

//         if (!snap.exists()) continue;

//         const stock = snap.data().stock || 0;

//         if (diff > 0 && diff > stock) {
//           return toast.error("Not enough stock");
//         }

//         await updateDoc(ref, {
//           stock: stock - diff,
//         });
//       }

//       await updateDoc(doc(db, "invoices", id), {
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
//       });

//       toast.success("Invoice updated ✅");
//       router.push("/dashboard/invoices");

//     } catch (err) {
//       console.error(err);
//       toast.error("Update failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) return <p className="p-6">Loading...</p>;

//  return (
//   <div className="min-h-screen bg-[#0B1120] text-white p-6">
//     <div className="max-w-3xl mx-auto space-y-6">

//       <h1 className="text-xl font-semibold">Edit Invoice</h1>

//       {/* CUSTOMER */}
//       <select
//         value={customerName}
//         onChange={(e) => setCustomerName(e.target.value)}
//         className="w-full p-3 bg-white/10 rounded"
//       >
//         <option value="">Select Customer</option>
//         {customers.map((c) => (
//           <option key={c.id} value={c.name}>
//             {c.name}
//           </option>
//         ))}
//       </select>

//       {/* ITEMS */}
//       {items.map((item, i) => (
//         <div key={i} className="grid grid-cols-3 gap-2">

//           {/* PRODUCT */}
//           <select
//             value={item.productId || ""}
//             onChange={(e) => {
//               const selected = products.find(
//                 (p) => p.id === e.target.value
//               );
//               if (!selected) return;

//               const updated = [...items];
//               updated[i] = {
//                 ...updated[i],
//                 productId: selected.id,
//                 name: selected.name,
//                 price: selected.price,
//               };
//               setItems(updated);
//             }}
//             className="p-2 bg-white/10 rounded"
//           >
//             <option value="">Select Product</option>
//             {products.map((p) => (
//               <option key={p.id} value={p.id}>
//                 {p.name}
//               </option>
//             ))}
//           </select>

//           {/* QTY */}
//           <input
//             type="number"
//             value={item.qty}
//             onChange={(e) =>
//               updateItem(i, "qty", Number(e.target.value))
//             }
//             className="p-2 bg-white/10 rounded"
//           />

//           {/* PRICE */}
//           <input
//             type="number"
//             value={item.price}
//             onChange={(e) =>
//               updateItem(i, "price", Number(e.target.value))
//             }
//             className="p-2 bg-white/10 rounded"
//           />
//         </div>
//       ))}

//       <button onClick={addItem} className="text-sm text-purple-400">
//         + Add Item
//       </button>

//       {/* 🔥 DISCOUNT */}
//       <div className="flex gap-2">
//         <select
//           value={discountType}
//           onChange={(e) =>
//             setDiscountType(e.target.value as DiscountType)
//           }
//           className="p-2 bg-white/10 rounded"
//         >
//           <option value="flat">₹</option>
//           <option value="percent">%</option>
//         </select>

//         <input
//           type="number"
//           value={discountValue}
//           onChange={(e) =>
//             setDiscountValue(Number(e.target.value))
//           }
//           className="w-full p-2 bg-white/10 rounded"
//         />
//       </div>

//       {/* GST */}
//       <label className="flex items-center gap-2">
//         <input
//           type="checkbox"
//           checked={gstEnabled}
//           onChange={(e) => setGstEnabled(e.target.checked)}
//         />
//         Apply GST (18%)
//       </label>

//       {/* STATUS */}
//       <select
//         value={status}
//         onChange={(e) =>
//           setStatus(e.target.value as Status)
//         }
//         className="p-2 bg-white/10 rounded"
//       >
//         <option value="pending">Pending</option>
//         <option value="paid">Paid</option>
//         <option value="credit">Credit</option>
//       </select>

//       {/* SUMMARY */}
//       <div className="text-right space-y-1 text-sm">

//         <p>Subtotal: ₹{calc.subtotal}</p>

//         <p>Discount: ₹{calc.discountAmount}</p>

//         {gstEnabled && (
//           <>
//             <p>CGST: ₹{calc.cgst.toFixed(2)}</p>
//             <p>SGST: ₹{calc.sgst.toFixed(2)}</p>
//           </>
//         )}

//         <p className="text-lg font-bold">
//           Total: ₹{calc.total}
//         </p>
//       </div>

//       {/* SUBMIT */}
//       <button
//         onClick={handleUpdate}
//         className="w-full bg-purple-600 p-3 rounded"
//       >
//         {saving ? "Saving..." : "Update Invoice"}
//       </button>

//     </div>
//   </div>
// );
// }

















"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Package,
  Tag,
  CheckCircle,
  Trash2,
} from "lucide-react";

import BarcodeScanner from "react-qr-barcode-scanner";
import { sanitizeNumericInput } from "@/lib/sanitize";
import { calculateInvoice, DiscountType } from "@/lib/calcInvoice";

/* TYPES */
type Item = {
  productId?: string;
  name: string;
  qty: number | "";
  price: number | "";
  gstRate?: number;
};

// type Customer = {
//   id: string;
//   name: string;
//   gstin?: string;
//   phone?: string;
//   address?: string;
// };

type Customer = {
  id: string;
  name: string;
  gstin?: string;
  phone?: string;
  address?: string;
  state?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  gst?: number;
};

type Status = "paid" | "pending" | "credit";

export default function EditInvoice() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [items, setItems] = useState<Item[]>([]);
  const [originalItems, setOriginalItems] = useState<Item[]>([]);

  const [discountType, setDiscountType] =
    useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState<number | string>(0);

  const [gstEnabled, setGstEnabled] = useState(true);
  const [status, setStatus] = useState<Status>("pending");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [companyState, setCompanyState] = useState("");

  /* 🔥 FETCH ALL DATA */
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // INVOICE
        try {
          const snap = await getDoc(doc(db, "invoices", id));
          if (snap.exists()) {
            const d = snap.data();
            setCustomerName(d.customerName || "");
            const fetchedItems = d.items || [];
            setItems(fetchedItems);
            setOriginalItems(fetchedItems);
            setDiscountType(d.discountType || "flat");
            setDiscountValue(d.discountValue || 0);
            setGstEnabled(d.gstEnabled ?? true);
            setStatus(d.status || "pending");
            setDueDate(d.dueDate || "");
          } else {
            throw new Error("Not in Firestore");
          }
        } catch (err) {
          const { getOfflineInvoices } = await import("@/lib/offlineInvoices");
          const offlineInvoices = await getOfflineInvoices();
          const found = offlineInvoices.find(
            (inv: any) =>
              inv.id?.toString() === id || inv.invoiceNumber === id
          );
          if (found) {
            const d = found as any;
            setCustomerName(d.customerName || "");
            const fetchedItems = d.items || [];
            setItems(fetchedItems);
            setOriginalItems(fetchedItems);
            setDiscountType(d.discountType || "flat");
            setDiscountValue(d.discountValue || 0);
            setGstEnabled(d.gstEnabled ?? true);
            setStatus(d.status || "pending");
            setDueDate(d.dueDate || "");
          }
        }

        // CUSTOMERS
        try {
          if (!navigator.onLine) throw new Error("Offline");
          const cq = query(
            collection(db, "customers"),
            where("userId", "==", user.uid)
          );
          const csnap = await getDocs(cq);
          setCustomers(
            csnap.docs.map((docSnap) => ({
              id: docSnap.id,
              name: docSnap.data().name,
              gstin: docSnap.data().gstin || "",
              phone: docSnap.data().phone || "",
              address: docSnap.data().address || "",
              state: docSnap.data().state || "",
            }))
          );
        } catch (err) {
          const { getCachedCustomers } = await import("@/lib/indexedDB");
          const cached = await getCachedCustomers();
          setCustomers(cached as any);
        }

        // PRODUCTS
        try {
          if (!navigator.onLine) throw new Error("Offline");
          const pq = query(
            collection(db, "products"),
            where("userId", "==", user.uid)
          );
          const psnap = await getDocs(pq);
          setProducts(
            psnap.docs.map((docSnap) => ({
              id: docSnap.id,
              name: docSnap.data().name,
              price: docSnap.data().price,
              barcode: docSnap.data().barcode || "",
              gst: docSnap.data().gst || 18,
            }))
          );
        } catch (err) {
          const { getCachedProducts } = await import("@/lib/indexedDB");
          const cached = await getCachedProducts();
          setProducts(cached as any);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load");
      } finally {
        setLoading(false);
      }

      /* COMPANY STATE — independent fetch so product/customer errors don't block it */
      try {
        const settingsSnap = await getDoc(doc(db, "settings", user.uid));
        if (settingsSnap.exists()) {
          setCompanyState((settingsSnap.data().state || "").trim());
        }
      } catch {
        // companyState stays "" → defaults to CGST+SGST
      }
    };

    fetchData();
  }, [id]);



/* CALC */
const validItems = items
  .filter((i) => i.name && Number(i.qty) > 0 && Number(i.price) > 0)
  .map((i) => ({
    ...i,
    qty: Number(i.qty),
    price: Number(i.price),
  }));

const selectedCustomer = customers.find(
  (c) => c.name === customerName
);

/* GST MODE — case-insensitive, trimmed comparison */
const customerStateSanitized = (selectedCustomer?.state || "").trim().toUpperCase();
const companyStateSanitized = companyState.trim().toUpperCase();

const isInterstate =
  !!customerStateSanitized &&
  !!companyStateSanitized &&
  customerStateSanitized !== companyStateSanitized;

const calc = calculateInvoice(
  validItems,
  discountType,
  Number(discountValue),
  gstEnabled,
  isInterstate
);

  /* UPDATE ITEM */
  const updateItem = (
    index: number,
    field: keyof Item,
    value: string | number
  ) => {
    const updated = [...items];
    let parsedValue: string | number = value;
    if (field === "qty" || field === "price") {
      parsedValue = sanitizeNumericInput(value);
    }
    updated[index] = {
      ...updated[index],
      [field]: field === "name" ? value : parsedValue,
    };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: "", qty: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{ name: "", qty: 1, price: 0 }]);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  /* 🔥 STOCK-AWARE UPDATE */
  const handleUpdate = async () => {
    if (!customerName) return toast.error("Select customer");
    if (!validItems.length) return toast.error("Add valid items");

    try {
      setSaving(true);

      const oldMap = new Map();
      const newMap = new Map();

      originalItems.forEach((item) => {
        if (item.productId) oldMap.set(item.productId, item.qty);
      });

      validItems.forEach((item) => {
        if (item.productId) newMap.set(item.productId, item.qty);
      });

      const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

      // 1. Determine Connectivity
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

      // 2. Check if invoice is an offline invoice
      let isOfflineInvoice = false;
      if (!isOfflineMode) {
        try {
          const snap = await getDoc(doc(db, "invoices", id));
          if (!snap.exists()) isOfflineInvoice = true;
        } catch {
          isOfflineInvoice = true;
        }
      } else {
        isOfflineInvoice = true;
      }

      const updateData = {
        customerName,
        items: validItems,
        subtotal: calc.subtotal,
        discountType,
        discountValue: Number(discountValue),
        discountAmount: calc.discountAmount,
        gstEnabled,
        isInterstate,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        total: calc.total,
        status,
        dueDate: status === "credit" ? dueDate : "",
      };

      if (isOfflineMode || isOfflineInvoice) {
        // --- OFFLINE UPDATE ---
        const { getOfflineInvoices, updateOfflineInvoice } = await import(
          "@/lib/offlineInvoices"
        );
        const { getCachedProducts, cacheProducts } = await import(
          "@/lib/indexedDB"
        );

        const offlineInvoices = await getOfflineInvoices();
        const existingInvoice = offlineInvoices.find(
          (inv: any) => inv.id?.toString() === id || inv.invoiceNumber === id
        );

        if (!existingInvoice) {
          toast.error("Offline invoice not found");
          return;
        }

        const cachedProducts = await getCachedProducts();

        for (const pid of allIds) {
          const oldQty = oldMap.get(pid) || 0;
          const newQty = newMap.get(pid) || 0;
          const diff = newQty - oldQty;

          if (diff === 0) continue;

          const pIdx = cachedProducts.findIndex((p) => p.id === pid);
          if (pIdx > -1) {
            const stock = cachedProducts[pIdx].stock || 0;
            if (diff > 0 && diff > stock) {
              return toast.error("Not enough stock locally");
            }
            cachedProducts[pIdx].stock = stock - diff;
          }
        }

        await cacheProducts(cachedProducts);

        const updatedInvoice = {
          ...existingInvoice,
          ...updateData,
        };

        await updateOfflineInvoice(updatedInvoice as any);

        toast.success("Saved offline");
        throw new Error("__OFFLINE_REDIRECT__");
      }

      // --- ONLINE UPDATE ---
      for (const pid of allIds) {
        const oldQty = oldMap.get(pid) || 0;
        const newQty = newMap.get(pid) || 0;
        const diff = newQty - oldQty;

        if (diff === 0) continue;

        const ref = doc(db, "products", pid);
        const snap = await getDoc(ref);

        if (!snap.exists()) continue;

        const stock = snap.data().stock || 0;

        if (diff > 0 && diff > stock) {
          return toast.error("Not enough stock");
        }

        await updateDoc(ref, {
          stock: stock - diff,
        });
      }

      await updateDoc(doc(db, "invoices", id), updateData);

      toast.success("Invoice updated ✅");
      router.push("/dashboard/invoices");
    } catch (err: any) {
      if (err.message === "__OFFLINE_REDIRECT__") {
        window.location.replace("/dashboard/invoices");
        return;
      }
      console.error(err);
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <section className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            Edit Invoice
          </h1>

          <Link
            href="/dashboard/invoices"
            className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>

        {/* CARD */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">

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

            {/* CUSTOMER DETAILS (Auto-fill) */}
            {customerName && (() => {
               const selectedCustomer = customers.find(c => c.name === customerName);
               if (!selectedCustomer) return null;
               return (
                 <div className="bg-gray-50 rounded-lg p-4 mt-3 text-sm text-gray-700 grid grid-cols-2 gap-4 border border-gray-100">
                   <div>
                     <span className="font-medium">Phone:</span> {selectedCustomer.phone || "N/A"}
                   </div>
                   <div>
                     <span className="font-medium">GSTIN:</span> {selectedCustomer.gstin || "N/A"}
                   </div>
                   {selectedCustomer.address && (
                     <div className="col-span-2">
                       <span className="font-medium">Address:</span> {selectedCustomer.address}
                     </div>
                   )}
                   <div className="col-span-2">
                     <span className="font-medium">State:</span>{" "}
                     {selectedCustomer.state || <span className="text-gray-400 italic">Not set</span>}
                   </div>
                 </div>
               )
            })()}
          </div>

          {/* ITEMS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-purple-600" />
              <p className="text-sm font-medium">Items</p>
            </div>

            <div className="grid grid-cols-12 gap-3 mb-2 text-xs text-gray-500 px-1">
              <p className="col-span-4">Item</p>
              <p className="col-span-1">Qty</p>
              <p className="col-span-2">Rate</p>
              <p className="col-span-2">GST %</p>
              <p className="col-span-2 text-right">Amount</p>
              <p className="col-span-1"></p>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <select
                      value={item.productId || ""}
                      onChange={(e) => {
                        const selected = products.find(
                          (p) => p.id === e.target.value
                        );
                        if (!selected) return;

                        const updated = [...items];
                        updated[i] = {
                          ...updated[i],
                          productId: selected.id,
                          name: selected.name,
                          price: selected.price,
                          gstRate: selected.gst || 18,
                        };
                        setItems(updated);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(i, "qty", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(i, "price", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-2 py-2 text-sm text-gray-600">
                      {item.gstRate || 18}%
                    </div>
                  </div>

                  <div className="col-span-2 text-right font-medium text-sm text-gray-900">
                    ₹{((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-red-500 hover:text-red-700 p-2 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={addItem}
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                + Add Item
              </button>
              
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
              >
                📷 Scan Barcode
              </button>
            </div>
          </div>

          {showScanner && (
            <div className="mt-6">
              <div className="max-w-xl mx-auto bg-black rounded-2xl overflow-hidden border-4 border-purple-500 relative">
                <button
                  type="button"
                  onClick={() => setShowScanner(false)}
                  className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium z-10"
                >
                  Close
                </button>
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
                            gstRate: found.gst || 18,
                          },
                        ]);
                        setShowScanner(false);
                      } else {
                        toast.error("Product not found");
                        setShowScanner(false);
                      }
                    }
                  }}
                />
              </div>
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
                  onChange={(e) =>
                    setDiscountValue(sanitizeNumericInput(e.target.value))
                  }
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
                onChange={(e) =>
                  setStatus(e.target.value as Status)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="credit">Credit</option>
              </select>

              {/* DUE DATE — shown only for credit invoices */}
              {status === "credit" && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* GST + TOTAL */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                />
                Apply Dynamic GST
              </label>
              <p className="text-xs text-gray-500 mt-1">
                GST Mode:
                {isInterstate ? " Interstate (IGST)" : " Local (CGST + SGST)"}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">
                {gstEnabled && (
                  isInterstate ? (
                    <p>IGST: ₹{calc.igst.toFixed(2)}</p>
                  ) : (
                    <>
                      <p>CGST: ₹{calc.cgst.toFixed(2)}</p>
                      <p>SGST: ₹{calc.sgst.toFixed(2)}</p>
                    </>
                  )
                )}
              </div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-semibold">
                ₹{calc.total.toFixed(2)}
              </p>
            </div>
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleUpdate}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg"
          >
            {saving ? "Saving..." : "Update Invoice"}
          </button>
        </div>
      </div>
    </section>
  );
}