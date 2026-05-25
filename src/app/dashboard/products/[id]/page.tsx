"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Search, Plus, Package, FileText, ChevronDown, Check, AlertTriangle, X, Landmark, QrCode, Printer } from "lucide-react";
import QRCode from "react-qr-code";

type Product = {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  discountPrice?: number;
  gst?: number;
  stock: number;
  barcode?: string;
  itemCode?: string;
  category?: string;
  unit?: string;
  lowStockThreshold?: number;
  description?: string;
  hsnCode?: string;
  type?: "Product" | "Service";
  lowStockWarning?: boolean;
  taxIncluded?: boolean;
  costTaxIncluded?: boolean;
  asOfDate?: string;
};

type InvoiceItem = {
  name: string;
  quantity?: number;
  qty?: number;
  price?: number;
  rate?: number;
  gst?: number;
  total?: number;
  amount?: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  items: InvoiceItem[];
  total: number;
};

type StockTransaction = {
  date: string;
  type: string;
  quantity: string;
  invoiceNo: string;
  closingStock: string;
};

type PartyReport = {
  partyName: string;
  salesQty: number;
  salesAmt: number;
  purchaseQty: number;
  purchaseAmt: string;
};

export default function ItemDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"details" | "stock" | "report" | "prices" | "qr">("details");
  const [searchTerm, setSearchTerm] = useState("");

  // Invoices & Analytics State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockTxList, setStockTxList] = useState<StockTransaction[]>([]);
  const [partyReports, setPartyReports] = useState<PartyReport[]>([]);

  // Adjust Stock Modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split("T")[0]);
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [adjustQty, setAdjustQty] = useState("0");
  const [adjustRemarks, setAdjustRemarks] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const fetchWorkspaceDetails = async (userId: string) => {
    try {
      // 1. Fetch current item details
      const itemRef = doc(db, "products", id);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists() || itemSnap.data().userId !== userId) {
        toast.error("Item not found");
        router.push("/dashboard/products");
        return;
      }

      const data = itemSnap.data();
      const mainProduct: Product = {
        id: itemSnap.id,
        name: data.name || "Unknown Product",
        price: Number(data.price || 0),
        costPrice: Number(data.costPrice || 0),
        discountPrice: Number(data.discountPrice || 0),
        gst: Number(data.gst !== undefined ? data.gst : 18),
        stock: Number(data.stock || 0),
        barcode: data.barcode || "",
        itemCode: data.itemCode || "",
        category: data.category || "-",
        unit: data.unit || "PCS",
        lowStockThreshold: Number(data.lowStockThreshold || 2),
        description: data.description || "",
        hsnCode: data.hsnCode || "",
        type: data.type || "Product",
        lowStockWarning: !!data.lowStockWarning,
        taxIncluded: !!data.taxIncluded,
        costTaxIncluded: !!data.costTaxIncluded,
        asOfDate: data.asOfDate || "",
      };

      setProduct(mainProduct);

      // 2. Fetch list of all items for the left bar
      const q = query(
        collection(db, "products"),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      const allItems = snap.docs.map((docSnap) => {
        const docData = docSnap.data();
        return {
          id: docSnap.id,
          name: docData.name || "Unknown Product",
          price: Number(docData.price || 0),
          stock: Number(docData.stock || 0),
          unit: docData.unit || "PCS",
          category: docData.category || "-",
        };
      }) as Product[];

      setProductsList(allItems);

      // 3. Fetch Invoices and calculate logs dynamically
      const invoicesQuery = query(
        collection(db, "invoices"),
        where("userId", "==", userId)
      );
      const invoicesSnap = await getDocs(invoicesQuery);
      const invoicesList: Invoice[] = invoicesSnap.docs.map((docSnap) => {
        const docData = docSnap.data();
        return {
          id: docSnap.id,
          invoiceNumber: docData.invoiceNumber || "",
          customerName: docData.customerName || "Cash Sale",
          date: docData.date || "",
          items: docData.items || [],
          total: Number(docData.total || 0),
        };
      });

      setInvoices(invoicesList);

      // Calculate Stock Transactions
      const txs: StockTransaction[] = [];
      const reportsMap: { [key: string]: PartyReport } = {};

      // Filter invoices that contain this item name
      const matchingInvoices = invoicesList.filter(inv => 
        inv.items.some(item => item.name.toLowerCase() === mainProduct.name.toLowerCase())
      );

      // Add Opening Stock log at the bottom
      txs.push({
        date: mainProduct.asOfDate || new Date().toISOString().split("T")[0],
        type: "Opening Stock",
        quantity: `${mainProduct.stock} ${mainProduct.unit}`,
        invoiceNo: "-",
        closingStock: `${mainProduct.stock} ${mainProduct.unit}`,
      });

      matchingInvoices.forEach(inv => {
        const matchingItem = inv.items.find(item => item.name.toLowerCase() === mainProduct.name.toLowerCase());
        if (matchingItem) {
          const itemQty = Number(matchingItem.qty || matchingItem.quantity || 0);
          const itemTotal = Number(matchingItem.amount || matchingItem.total || (itemQty * (matchingItem.price || matchingItem.rate || 0)) || 0);

          txs.unshift({
            date: inv.date,
            type: "Sales Invoices",
            quantity: `- ${itemQty} ${mainProduct.unit}`,
            invoiceNo: inv.invoiceNumber,
            closingStock: `${mainProduct.stock} ${mainProduct.unit}`, // Simple reference
          });

          // Aggregate client sales report
          const party = inv.customerName || "Cash Sale";
          if (!reportsMap[party]) {
            reportsMap[party] = {
              partyName: party,
              salesQty: 0,
              salesAmt: 0,
              purchaseQty: 0,
              purchaseAmt: "-",
            };
          }
          reportsMap[party].salesQty += itemQty;
          reportsMap[party].salesAmt += itemTotal;
        }
      });

      setStockTxList(txs);
      setPartyReports(Object.values(reportsMap));

    } catch (err) {
      console.error("Workspace load error:", err);
      toast.error("Failed to load detailed workspace data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        fetchWorkspaceDetails(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      toast.success("Item deleted successfully");
      router.push("/dashboard/products");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete item");
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const parsedQty = Number(adjustQty) || 0;
    if (parsedQty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    if (adjustType === "reduce" && parsedQty > product.stock) {
      toast.error(`Cannot reduce stock by ${parsedQty} ${product.unit}. Only ${product.stock} ${product.unit} is currently in stock.`);
      return;
    }

    try {
      setAdjustSaving(true);
      const newStock = adjustType === "add" 
        ? product.stock + parsedQty 
        : product.stock - parsedQty;

      await updateDoc(doc(db, "products", id), {
        stock: newStock,
      });

      toast.success(`Successfully adjusted stock quantity to ${newStock} ${product.unit}!`);
      setIsAdjustOpen(false);
      
      // Refresh state
      const user = auth.currentUser;
      if (user) {
        fetchWorkspaceDetails(user.uid);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to adjust stock quantities");
    } finally {
      setAdjustSaving(false);
    }
  };

  const filteredList = productsList.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-12 text-gray-400 gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span className="text-xs">Loading item details workspace...</span>
      </div>
    );
  }

  if (!product) return null;

  const isLowStock = product.stock <= (product.lowStockThreshold || 2);
  const isOutOfStock = product.stock === 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50/50 font-sans relative">
      
      {/* LEFT NAVIGATION BAR - ALL PRODUCTS WITH SPACING */}
      <div className="w-full md:w-64 border-r border-gray-200 bg-white flex flex-col h-auto md:h-screen sticky top-0 overflow-y-auto shrink-0 shadow-sm">
        <div className="p-3 border-b border-gray-100 space-y-2">
          <Link href="/dashboard/products" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium">
            <ArrowLeft size={13} />
            <span>Back to Inventory</span>
          </Link>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400"
            />
          </div>
          <button 
            onClick={() => router.push("/dashboard/products?action=create")}
            className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs py-1.5 rounded font-semibold transition-all flex items-center justify-center gap-1 shadow-sm border border-indigo-100 mt-2"
          >
            <Plus size={13} />
            <span>Create Item</span>
          </button>
        </div>

        {/* Small List Items */}
        <div className="divide-y divide-gray-50 flex-1 overflow-y-auto">
          {filteredList.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/products/${p.id}`}
              className={`block px-4 py-3 text-left transition-all ${
                p.id === id ? "bg-indigo-50/40 border-l-2 border-indigo-600" : "hover:bg-gray-50/60"
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xs font-semibold ${p.id === id ? "text-indigo-600" : "text-gray-700"}`}>
                  {p.name}
                </span>
                <span className="text-[10px] font-bold font-mono text-gray-500">
                  {p.stock} {p.unit || "PCS"}
                </span>
              </div>
              {p.category && p.category !== "-" && (
                <span className="text-[9px] text-gray-400 block mt-0.5">{p.category}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE PANEL - PRODUCT DETAILED ANALYTICS AND HISTORY */}
      <div className="flex-1 p-6 space-y-6">
        
        {/* HEADER BAR */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-800">{product.name}</h2>
              {isOutOfStock ? (
                <span className="bg-red-50 text-red-600 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border border-red-100">Out of Stock</span>
              ) : isLowStock ? (
                <span className="bg-amber-50 text-amber-600 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border border-amber-100">Low Stock</span>
              ) : (
                <span className="bg-green-50 text-green-600 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border border-green-100">In Stock</span>
              )}
            </div>
            {product.category && product.category !== "-" && (
              <span className="text-xs text-gray-400 block">Category: {product.category}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setAdjustQty("0");
                setAdjustRemarks("");
                setIsAdjustOpen(true);
              }}
              className="text-xs text-indigo-600 border border-indigo-200 bg-white px-3 py-1.5 rounded hover:bg-indigo-50 font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>Adjust Stock</span>
            </button>
            <button 
              onClick={() => router.push(`/dashboard/products?action=edit&id=${id}`)}
              className="text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition-colors flex items-center gap-1.5"
            >
              <Pencil size={12} className="text-indigo-500" />
              <span>Edit</span>
            </button>
            <button 
              onClick={handleDelete}
              className="text-xs text-red-600 border border-red-200 bg-white p-1.5 rounded hover:bg-red-50 font-semibold transition-colors flex items-center justify-center shrink-0"
            >
              <Trash2 size={13} className="text-red-500" />
            </button>
          </div>
        </div>

        {/* WORKSPACE SUB TABS */}
        <div className="border-b border-gray-200 flex gap-6 text-xs font-semibold">
          <button 
            onClick={() => setActiveSubTab("details")}
            className={`pb-2 transition-all ${
              activeSubTab === "details" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            Item Details
          </button>
          <button 
            onClick={() => setActiveSubTab("stock")}
            className={`pb-2 transition-all ${
              activeSubTab === "stock" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            Stock Details
          </button>
          <button 
            onClick={() => setActiveSubTab("report")}
            className={`pb-2 transition-all ${
              activeSubTab === "report" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            Party Wise Report
          </button>
          <button 
            onClick={() => setActiveSubTab("prices")}
            className={`pb-2 transition-all ${
              activeSubTab === "prices" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            Party Wise Prices
          </button>
          <button 
            onClick={() => setActiveSubTab("qr")}
            className={`pb-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === "qr" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <QrCode size={13} />
            <span>Barcode / QR</span>
          </button>
        </div>

        {/* GRID SPECIFICATIONS CARDS */}
        {activeSubTab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* General Specs */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <Package size={15} className="text-indigo-500" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">General Details</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                <div>
                  <p className="text-gray-400 font-medium">Item Name</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{product.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Item Code</p>
                  <p className="font-semibold text-gray-700 mt-0.5 font-mono">{product.itemCode || product.barcode || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Category</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{product.category}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Current Stock</p>
                  <p className="font-bold text-gray-700 mt-0.5 font-mono">{product.stock} {product.unit}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Stock Value</p>
                  <p className="font-bold text-green-600 mt-0.5 font-mono">₹ {(product.stock * product.price).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Low Stock Warning</p>
                  <p className={`font-semibold mt-0.5 ${product.lowStockWarning ? "text-amber-600" : "text-gray-500"}`}>
                    {product.lowStockWarning ? `Enabled (Threshold: ${product.lowStockThreshold})` : "Disabled"}
                  </p>
                </div>
              </div>

              {product.description && (
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Item Description</p>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded border border-gray-100">{product.description}</p>
                </div>
              )}
            </div>

            {/* Pricing details card */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <Landmark size={14} className="text-indigo-500" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Pricing Specifications</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                <div>
                  <p className="text-gray-400 font-medium">Sales Price</p>
                  <p className="font-bold text-gray-700 mt-0.5 font-mono">
                    ₹ {product.price.toLocaleString("en-IN")} 
                    <span className="text-[9px] font-normal text-gray-400 ml-1">({product.taxIncluded ? "With Tax" : "Without Tax"})</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Purchase Price</p>
                  <p className="font-semibold text-gray-500 mt-0.5 font-mono">
                    {product.costPrice ? `₹ ${product.costPrice.toLocaleString("en-IN")}` : "-"}
                    {product.costPrice ? (
                      <span className="text-[9px] font-normal text-gray-400 ml-1">({product.costTaxIncluded ? "With Tax" : "Without Tax"})</span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">GST Tax Rate</p>
                  <p className="font-semibold text-gray-700 mt-0.5 font-mono">{product.gst}%</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">HSN Code</p>
                  <p className="font-semibold text-gray-700 mt-0.5 font-mono">{product.hsnCode || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Measuring Unit</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{product.unit}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Discount On Sales</p>
                  <p className="font-semibold text-gray-700 mt-0.5 font-mono">{product.discountPrice || "0"}%</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* View Tab: Stock adjustments list */}
        {activeSubTab === "stock" && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Stock adjustment logs</h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-bold uppercase">Opening Balance: {product.stock} {product.unit}</span>
            </div>
            
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold">Transaction Type</th>
                  <th className="px-4 py-2 font-semibold">Quantity</th>
                  <th className="px-4 py-2 font-semibold">Invoice Number</th>
                  <th className="px-4 py-2 font-semibold">Closing Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockTxList.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-500 font-mono">{tx.date}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700">{tx.type}</td>
                    <td className={`px-4 py-2.5 font-bold font-mono ${tx.quantity.startsWith("-") ? "text-red-500" : "text-green-600"}`}>
                      {tx.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono">{tx.invoiceNo}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700 font-mono">{tx.closingStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Tab: Reports */}
        {activeSubTab === "report" && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Party Wise Invoicing Report</h3>
            </div>
            
            {partyReports.length === 0 ? (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <FileText size={28} className="mx-auto text-gray-300" />
                <p className="text-xs font-medium">No sales transactions logged for this item yet</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2 font-semibold">Party Name</th>
                    <th className="px-4 py-2 font-semibold">Sales Quantity</th>
                    <th className="px-4 py-2 font-semibold">Sales Amount</th>
                    <th className="px-4 py-2 font-semibold">Purchase Quantity</th>
                    <th className="px-4 py-2 font-semibold">Purchase Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partyReports.map((rpt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{rpt.partyName}</td>
                      <td className="px-4 py-2.5 font-bold font-mono text-gray-700">{rpt.salesQty} PCS</td>
                      <td className="px-4 py-2.5 font-bold font-mono text-indigo-600">₹ {rpt.salesAmt.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-400">{rpt.purchaseQty}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-400">{rpt.purchaseAmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* View Tab: Party Wise Prices Placeholder */}
        {activeSubTab === "prices" && (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center shadow-sm max-w-lg mx-auto space-y-3 mt-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-2xl mx-auto shadow-sm">
              📋
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-700">Party Wise Custom Prices</p>
              <p className="text-[10px] text-gray-400 leading-normal">
                To specify custom selling margins, party discounts or pre-negotiated wholesale prices for specific customers, unlock our Business Plan.
              </p>
            </div>
          </div>
        )}

        {/* View Tab: Barcode / QR */}
        {activeSubTab === "qr" && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto mt-4 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-800">Item Label & QR Code</h3>
              <p className="text-xs text-gray-500">Scan this code using the Webcam Barcode Scanner in Sales to quickly add this item.</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <QRCode 
                id="product-qr-code"
                value={product.barcode || product.itemCode || product.name} 
                size={180}
                level="H"
                fgColor="#1e1b4b"
              />
            </div>
            
            <div className="text-center">
              <p className="text-xs font-bold text-gray-800">{product.name}</p>
              <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-widest">{product.barcode || product.itemCode || product.name}</p>
            </div>

            <button 
              onClick={() => {
                const qrValue = product.barcode || product.itemCode || product.name;
                const printWindow = window.open('', '', 'width=400,height=500');
                if (!printWindow) return toast.error("Pop-up blocked. Please allow pop-ups to print.");
                
                const svgElement = document.getElementById('product-qr-code');
                const svgHtml = svgElement ? svgElement.outerHTML : '';

                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Print QR Code - ${product.name}</title>
                      <style>
                        body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        h2 { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #111827; }
                        p { font-size: 12px; color: #6b7280; margin-bottom: 20px; font-family: monospace; }
                        .qr-container { padding: 20px; border: 2px dashed #e5e7eb; border-radius: 8px; }
                        @media print {
                          @page { size: auto; margin: 0mm; }
                          body { height: auto; padding: 20px; }
                        }
                      </style>
                    </head>
                    <body>
                      <h2>${product.name}</h2>
                      <p>${qrValue}</p>
                      <div class="qr-container">
                        ${svgHtml}
                      </div>
                      <script>
                        window.onload = () => {
                          window.print();
                          setTimeout(() => window.close(), 500);
                        };
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="flex items-center justify-center gap-2 w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-xs font-bold transition-colors shadow-sm"
            >
              <Printer size={14} />
              <span>Print Label</span>
            </button>
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* 🚀 HIGH-FIDELITY ADJUST STOCK QUANTITY MODAL 🚀 */}
      {/* ==================================================== */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          
          {/* Modal Box */}
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-200">
            
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Adjust Stock Quantity</h3>
              <button 
                onClick={() => setIsAdjustOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleAdjustStock} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Form Inputs (2/3 Col) */}
              <div className="md:col-span-2 space-y-4">
                
                {/* Date Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date</label>
                  <input 
                    type="date"
                    required
                    value={adjustDate}
                    onChange={(e) => setAdjustDate(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600"
                  />
                </div>

                {/* Add or Reduce radios */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Add or Reduce Stock</label>
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white cursor-pointer text-gray-700 font-semibold"
                    >
                      <option value="add">Add (+)</option>
                      <option value="reduce">Reduce (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Adjust quantity</label>
                    <div className="flex border border-gray-200 rounded overflow-hidden">
                      <input 
                        type="number"
                        required
                        value={adjustQty}
                        onChange={(e) => setAdjustQty(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                      />
                      <span className="bg-gray-50 text-[10px] border-l border-gray-200 px-2 py-1.5 text-gray-400 font-bold uppercase tracking-wider">
                        {product.unit || "PCS"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Remarks (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Enter remarks"
                    value={adjustRemarks}
                    onChange={(e) => setAdjustRemarks(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  ></textarea>
                </div>

              </div>

              {/* Right Side Summary panel (1/3 Col) */}
              <div className="md:col-span-1 border border-gray-150 rounded bg-gray-50 p-4 space-y-4">
                
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Name</p>
                  <p className="text-xs font-semibold text-gray-700 mt-1">{product.name}</p>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock Calculation</p>
                  <div className="flex justify-between items-center bg-white border border-gray-200 rounded p-2.5 mt-1.5 shadow-sm">
                    <span className="text-[10px] text-gray-400 font-medium">Current Stock</span>
                    <span className="text-xs font-bold font-mono text-gray-800">{product.stock} {product.unit}</span>
                  </div>
                </div>

              </div>

              {/* Bottom Sticky Action Buttons */}
              <div className="col-span-1 md:col-span-3 border-t border-gray-150 pt-4 flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={adjustSaving}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {adjustSaving ? "Adjusting..." : "Save"}
                </button>
              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
