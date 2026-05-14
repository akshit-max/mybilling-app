// "use client";

// import { useEffect, useState } from "react";
// import { db } from "@/lib/firebase";
// import {
//   doc,
//   getDoc,
//   updateDoc,
// } from "firebase/firestore";
// import { useParams, useRouter } from "next/navigation";
// import toast from "react-hot-toast";

// export default function EditProduct() {
//   const { id } = useParams() as { id: string };
//   const router = useRouter();

//   const [name, setName] = useState("");
//   const [price, setPrice] = useState(0);
//   const [gst, setGst] = useState(18);
//   const [stock, setStock] = useState(0);

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   /* 🔥 FETCH PRODUCT */
//   useEffect(() => {
//     const fetchProduct = async () => {
//       try {
//         const ref = doc(db, "products", id);
//         const snap = await getDoc(ref);

//         if (snap.exists()) {
//           const data = snap.data();

//           setName(data.name || "");
//           setPrice(data.price || 0);
//           setGst(data.gst || 18);
//           setStock(data.stock || 0);
//         }
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load product");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProduct();
//   }, [id]);

//   /* 🔥 UPDATE PRODUCT */
//   const handleUpdate = async () => {
//     if (!name.trim()) {
//       toast.error("Enter product name");
//       return;
//     }

//     try {
//       setSaving(true);

//       await updateDoc(doc(db, "products", id), {
//         name: name.trim(),
//         price: Number(price),
//         gst: Number(gst),
//         stock: Number(stock),
//       });

//       toast.success("Product updated ✅");
//       router.push("/dashboard/products");

//     } catch (err) {
//       console.error(err);
//       toast.error("Update failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return <p className="p-6">Loading...</p>;
//   }

//   return (
//     <div className="min-h-screen bg-[#0B1120] text-white p-6">
//       <div className="max-w-xl mx-auto space-y-4">

//         <h1 className="text-xl font-semibold">
//           Edit Product
//         </h1>

//         {/* NAME */}
//         <input
//           placeholder="Product name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         {/* PRICE */}
//         <input
//           type="number"
//           placeholder="Price"
//           value={price}
//           onChange={(e) => setPrice(Number(e.target.value))}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         {/* GST */}
//         <input
//           type="number"
//           placeholder="GST %"
//           value={gst}
//           onChange={(e) => setGst(Number(e.target.value))}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         {/* STOCK */}
//         <input
//           type="number"
//           placeholder="Stock"
//           value={stock}
//           onChange={(e) => setStock(Number(e.target.value))}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         {/* SUBMIT */}
//         <button
//           onClick={handleUpdate}
//           disabled={saving}
//           className="w-full bg-purple-600 p-3 rounded"
//         >
//           {saving ? "Updating..." : "Update Product"}
//         </button>

//       </div>
//     </div>
//   );
// }







"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import {
  Package,
  ArrowLeft,
} from "lucide-react";
import { sanitizeNumericInput } from "@/lib/sanitize";

export default function EditProduct() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState<number | string>("");
  const [price, setPrice] = useState<number | string>(0);
  const [discountPrice, setDiscountPrice] = useState<number | string>("");
  const [itemCode, setItemCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [gst, setGst] = useState<number | string>(18);
  const [stock, setStock] = useState<number | string>(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auto-sync barcode with itemCode if barcode is empty or matches itemCode
  const handleItemCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (barcode === itemCode) {
      setBarcode(val);
    }
    setItemCode(val);
  };

  /* FETCH PRODUCT */
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const ref = doc(db, "products", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          setName(data.name || "");
          setCostPrice(data.costPrice || "");
          setPrice(data.price || 0);
          setDiscountPrice(data.discountPrice || "");
          setItemCode(data.itemCode || "");
          setBarcode(data.barcode || "");
          setGst(data.gst || 18);
          setStock(data.stock || 0);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  /* UPDATE PRODUCT */
  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error("Enter product name");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "products", id), {
        name: name.trim(),
        costPrice: Number(costPrice) || 0,
        price: Number(price) || 0,
        discountPrice: Number(discountPrice) || 0,
        itemCode,
        barcode: barcode || itemCode,
        gst: Number(gst),
        stock: Number(stock),
      });

      toast.success("Product updated ✅");
      router.push("/dashboard/products");

    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-xl mx-auto space-y-6">

        {/* 🔥 HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Package className="text-purple-600" size={20} />
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Product
            </h1>
          </div>

          <Link
            href="/dashboard/products"
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

        </div>

        {/* 📦 CARD */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">

          {/* PRODUCT DETAILS */}
          <div className="space-y-4">

            <p className="text-sm font-medium text-gray-800">
              Product Details
            </p>

            {/* NAME */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* ITEM CODE */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Item Code
              </label>
              <input
                value={itemCode}
                onChange={handleItemCodeChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="e.g. ITM-001"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* COST PRICE */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(sanitizeNumericInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* SELLING PRICE */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(sanitizeNumericInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* DISCOUNT PRICE */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Discount Price (₹)
                </label>
                <input
                  type="number"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(sanitizeNumericInput(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            {/* GST */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                GST (%)
              </label>
              <input
                type="number"
                value={gst}
                onChange={(e) => setGst(sanitizeNumericInput(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* STOCK */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Stock Quantity
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(sanitizeNumericInput(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

          </div>

          {/* SUBMIT */}
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:opacity-90"
          >
            {saving ? "Updating..." : "Update Product"}
          </button>

        </div>
      </div>
    </div>
  );
}