// "use client";

// import { useState } from "react";
// import { db, auth } from "@/lib/firebase";
// import { addDoc, collection, serverTimestamp } from "firebase/firestore";
// import { useRouter } from "next/navigation";
// import toast from "react-hot-toast";

// export default function CreateProduct() {
//   const router = useRouter();

//   const [name, setName] = useState("");
//   const [price, setPrice] = useState(0);
//   const [gst, setGst] = useState(18);
//   const [stock, setStock] = useState(0);
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async () => {
//     const user = auth.currentUser;
//     if (!user) return toast.error("Not logged in");

//     if (!name.trim()) return toast.error("Enter product name");

//     try {
//       setLoading(true);

//       await addDoc(collection(db, "products"), {
//         userId: user.uid,
//         name,
//         price: Number(price),
//         gst: Number(gst),
//         stock: Number(stock),
//         createdAt: serverTimestamp(),
//       });

//       toast.success("Product added");
//       router.push("/dashboard/products");
//     } catch {
//       toast.error("Failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 text-white bg-[#0B1120] min-h-screen">
//       <div className="max-w-xl mx-auto space-y-4">

//         <h1>Add Product</h1>

//         <input
//           placeholder="Product name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <input
//           type="number"
//           placeholder="Price"
//           value={price}
//           onChange={(e) => setPrice(Number(e.target.value))}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <input
//           type="number"
//           placeholder="GST %"
//           value={gst}
//           onChange={(e) => setGst(Number(e.target.value))}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <input
//           type="number"
//           placeholder="Stock"
//           value={stock}
//           onChange={(e) => setStock(Number(e.target.value))}
//           className="w-full p-3 bg-white/10 rounded"
//         />

//         <button
//           onClick={handleSubmit}
//           className="w-full bg-purple-600 p-3 rounded"
//         >
//           {loading ? "Saving..." : "Add Product"}
//         </button>

//       </div>
//     </div>
//   );
// }

"use client";
import { v4 as uuidv4 } from "uuid";
import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { ArrowLeft, Package } from "lucide-react";
import { sanitizeNumericInput } from "@/lib/sanitize";

export default function CreateProduct() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState<number | string>("");
  const [price, setPrice] = useState<number | string>(0);
  const [discountPrice, setDiscountPrice] = useState<number | string>("");
  const [itemCode, setItemCode] = useState("");
  const [gst, setGst] = useState<number | string>(18);
  const [stock, setStock] = useState<number | string>(0);
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");

  // Auto-sync barcode with itemCode if barcode is empty or matches itemCode
  const handleItemCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (barcode === itemCode) {
      setBarcode(val);
    }
    setItemCode(val);
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    if (!name.trim()) return toast.error("Enter product name");

    try {
      setLoading(true);
      const generatedBarcode = barcode || itemCode || "PRD" + Math.floor(100000 + Math.random() * 900000);

      await addDoc(collection(db, "products"), {
        userId: user.uid,
        name,
        costPrice: Number(costPrice) || 0,
        price: Number(price) || 0,
        discountPrice: Number(discountPrice) || 0,
        itemCode,
        gst: Number(gst),
        stock: Number(stock),
        barcode: generatedBarcode,
        createdAt: serverTimestamp(),
      });

      toast.success("Product added");
      router.push("/dashboard/products");
    } catch {
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* 🔥 HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="text-purple-600" size={20} />
            <h1 className="text-2xl font-semibold text-gray-900">
              Add Product
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
            <p className="text-sm font-medium text-gray-800">Product Details</p>

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

            {/* BARCODE */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Barcode (Optional)
              </label>

              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Auto generated if empty"
                className="
      w-full
      border border-gray-300
      rounded-lg
      px-4 py-3
      text-sm
      focus:ring-2
      focus:ring-purple-500
      outline-none
    "
              />
            </div>
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:opacity-90"
          >
            {loading ? "Saving..." : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
