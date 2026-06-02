"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { ArrowLeft, Package, User, Phone, CheckCircle, Clock, Truck, XCircle, FileText } from "lucide-react";

export default function EditOnlineOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<any>(null);
  
  const [status, setStatus] = useState("Pending");

  useEffect(() => {
    if (!id) return;
    
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "quotations", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrder({ id: docSnap.id, ...data });
          if (data.status) setStatus(data.status);
        } else {
          toast.error("Order not found");
          router.push("/dashboard/online-orders");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load order");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [id, router]);

  const handleSave = async () => {
    if (!order) return;
    
    try {
      setSaving(true);
      await updateDoc(doc(db, "quotations", order.id), {
        status: status
      });
      toast.success("Order status updated successfully!");
      router.push("/dashboard/online-orders");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "Pending": return <Clock size={16} />;
      case "Confirmed": return <CheckCircle size={16} />;
      case "Shipped": return <Truck size={16} />;
      case "Delivered": return <Package size={16} />;
      case "Cancelled": return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Pending": return "text-orange-600 bg-orange-100 border-orange-200";
      case "Confirmed": return "text-brand-primary bg-blue-100 border-blue-200";
      case "Shipped": return "text-purple-600 bg-purple-100 border-purple-200";
      case "Delivered": return "text-brand-tertiary bg-green-100 border-green-200";
      case "Cancelled": return "text-red-600 bg-red-100 border-red-200";
      default: return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!order) return null;

  const orderDate = order.createdAt?.seconds 
    ? new Date(order.createdAt.seconds * 1000).toLocaleString() 
    : "Unknown Date";

  return (
    <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/online-orders")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Order {order.invoiceNumber}
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                {status.toUpperCase()}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Placed on {orderDate} via Online Store</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/dashboard/online-orders")}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded font-semibold text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Items & Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2 bg-gray-50/50">
              <Package size={18} className="text-gray-500" />
              <h2 className="text-base font-bold text-gray-800">Order Items</h2>
            </div>
            <div className="p-0">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Item Name</th>
                    <th className="px-6 py-3 text-center">Quantity</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-center">{item.quantity}</td>
                      <td className="px-6 py-4 text-right">₹{item.price?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold">₹{item.amount?.toFixed(2)}</td>
                    </tr>
                  ))}
                  
                  {(!order.items || order.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No items found in this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{order.subTotal?.toFixed(2) || order.totalAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 pb-2 border-b border-gray-200">
                  <span>Shipping</span>
                  <span className="text-brand-tertiary font-medium">Free</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1">
                  <span>Total Amount</span>
                  <span className="text-indigo-700">₹{order.totalAmount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column: Customer & Status */}
        <div className="space-y-6">
          
          {/* Update Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
              <FileText size={18} className="text-gray-500" />
              <h2 className="text-base font-bold text-gray-800">Order Status</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Change Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="Pending">🕒 Pending</option>
                <option value="Confirmed">✅ Confirmed</option>
                <option value="Shipped">🚚 Shipped</option>
                <option value="Delivered">📦 Delivered</option>
                <option value="Cancelled">❌ Cancelled</option>
              </select>
              
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Updating the status will help you track fulfillment and may trigger SMS notifications (if enabled).
              </p>
            </div>
          </div>
          
          {/* Customer Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
              <User size={18} className="text-gray-500" />
              <h2 className="text-base font-bold text-gray-800">Customer Info</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Name</label>
                <div className="font-semibold text-gray-900">{order.customerName || "N/A"}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  {order.customerPhone || "N/A"}
                </div>
              </div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
