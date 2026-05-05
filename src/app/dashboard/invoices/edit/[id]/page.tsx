


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
} from "lucide-react";

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
  gstin?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
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
  const [discountValue, setDiscountValue] = useState(0);

  const [gstEnabled, setGstEnabled] = useState(true);
  const [status, setStatus] = useState<Status>("pending");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* 🔥 FETCH ALL DATA */
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

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
        }

        const cq = query(
          collection(db, "customers"),
          where("userId", "==", user.uid)
        );
        const csnap = await getDocs(cq);

        setCustomers(
          csnap.docs.map((docSnap) => ({
            id: docSnap.id,
            name: docSnap.data().name,
          }))
        );

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
          }))
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  /* CALC */
  const validItems = items.filter(
    (i) => i.name && i.qty > 0 && i.price > 0
  );

  const calc = calculateInvoice(
    validItems,
    discountType,
    discountValue,
    gstEnabled
  );

  /* UPDATE ITEM */
  const updateItem = (
    index: number,
    field: keyof Item,
    value: string | number
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

  /* 🔥 STOCK-AWARE UPDATE (UNCHANGED) */
  const handleUpdate = async () => {
    if (!customerName)
      return toast.error("Select customer");

    if (!validItems.length)
      return toast.error("Add valid items");

    try {
      setSaving(true);

      const oldMap = new Map();
      const newMap = new Map();

      originalItems.forEach((item) => {
        if (item.productId)
          oldMap.set(item.productId, item.qty);
      });

      validItems.forEach((item) => {
        if (item.productId)
          newMap.set(item.productId, item.qty);
      });

      const allIds = new Set([
        ...oldMap.keys(),
        ...newMap.keys(),
      ]);

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

      await updateDoc(doc(db, "invoices", id), {
        customerName,
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
      });

      toast.success("Invoice updated ✅");
      router.push("/dashboard/invoices");

    } catch (err) {
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
                      };
                      setItems(updated);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(i, "qty", e.target.value)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />

                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(i, "price", e.target.value)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="mt-3 text-sm text-purple-600"
            >
              + Add Item
            </button>
          </div>

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
                    setDiscountValue(Number(e.target.value))
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
            </div>
          </div>

          {/* GST + TOTAL */}
          <div className="flex items-center justify-between border-t pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
              />
              Apply GST (18%)
            </label>

            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-semibold">
                ₹{calc.total}
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