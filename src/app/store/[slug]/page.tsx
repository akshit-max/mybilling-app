"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Store, ShoppingCart, Plus, Minus, X, CheckCircle, Package } from "lucide-react";
import toast from "react-hot-toast";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type CartItem = Product & { quantity: number };

export default function PublicStorePage() {
  const { slug } = useParams();
  
  const [storeId, setStoreId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Online Store");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchStore = async () => {
      try {
        // 1. Find the store settings by slug
        const settingsQ = query(collection(db, "settings"), where("storeSlug", "==", slug));
        const settingsSnap = await getDocs(settingsQ);
        
        if (settingsSnap.empty) {
          setLoading(false);
          return;
        }

        const settingsDoc = settingsSnap.docs[0];
        const userId = settingsDoc.id;
        const data = settingsDoc.data();
        
        if (!data.hasOnlineStore) {
          setLoading(false);
          return;
        }

        setStoreId(userId);
        
        // Let's get the business profile to show business name
        const profileQ = query(collection(db, "users"), where("__name__", "==", userId));
        const profileSnap = await getDocs(profileQ);
        if (!profileSnap.empty) {
          const profileData = profileSnap.docs[0].data();
          if (profileData.businessName) setBusinessName(profileData.businessName);
        }

        // 2. Fetch products for this userId
        const productsQ = query(collection(db, "products"), where("userId", "==", userId));
        const productsSnap = await getDocs(productsQ);
        
        const fetchedProducts = productsSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Product[];
        
        setProducts(fetchedProducts);

      } catch (err) {
        console.error("Error fetching store data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [slug]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart!`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      return toast.error("Please enter your name and phone number");
    }
    
    if (!storeId) return;

    try {
      setPlacingOrder(true);

      const quotationData = {
        userId: storeId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: item.price * item.quantity
        })),
        totalAmount: cartTotal,
        subTotal: cartTotal,
        isOnlineOrder: true,
        source: "Online Store",
        status: "Pending",
        createdAt: serverTimestamp(),
        invoiceNumber: `ORD-${Date.now().toString().slice(-6)}`
      };

      await addDoc(collection(db, "quotations"), quotationData);
      
      setOrderPlaced(true);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading Store...</div>;
  }

  if (!storeId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center space-y-4">
        <Store size={64} className="text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-800">Store Not Found</h1>
        <p className="text-gray-500">The store you are looking for does not exist or is currently inactive.</p>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-in zoom-in">
          <CheckCircle size={48} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Order Placed Successfully!</h1>
          <p className="text-gray-500 mt-2">Thank you, {customerName}. The store owner will review your order shortly.</p>
        </div>
        <button 
          onClick={() => {
            setOrderPlaced(false);
            setCustomerName("");
            setCustomerPhone("");
          }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24">
      
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">{businessName}</h1>
            <p className="text-xs text-gray-500">Official Online Store</p>
          </div>
        </div>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ShoppingCart size={24} />
          {cartItemCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {cartItemCount}
            </span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Our Products</h2>
        
        {products.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="h-40 bg-gray-100 flex items-center justify-center relative group">
                  <Package size={40} className="text-gray-300 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-800 line-clamp-2">{product.name}</h3>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="font-black text-lg text-indigo-600">₹{product.price?.toFixed(2) || "0.00"}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 animate-in fade-in" onClick={() => setIsCartOpen(false)}></div>
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <ShoppingCart size={20} /> Your Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <ShoppingCart size={48} strokeWidth={1} />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-16 h-16 bg-white rounded border border-gray-200 flex items-center justify-center">
                      <Package size={24} className="text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">₹{item.price?.toFixed(2)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center bg-white border border-gray-200 rounded">
                          <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 text-gray-500 hover:bg-gray-50"><Minus size={12} /></button>
                          <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-50"><Plus size={12} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Remove</button>
                      </div>
                    </div>
                    <div className="font-bold text-sm text-gray-800">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 font-medium">Total Amount</span>
                  <span className="text-xl font-black text-gray-800">₹{cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors shadow-sm"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-800">Checkout Details</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full p-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Phone Number</label>
                <input 
                  type="tel" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full p-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button 
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {placingOrder ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
