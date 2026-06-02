"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Store, ShoppingBag, Plus, Minus, X, CheckCircle, Package, ArrowRight, Star } from "lucide-react";
import toast from "react-hot-toast";
import Head from "next/head";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
};

type CartItem = Product & { quantity: number };

export default function PremiumStorePage() {
  const { slug } = useParams();
  
  const [storeId, setStoreId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Premium Store");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchStore = async () => {
      try {
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
        
        const profileQ = query(collection(db, "users"), where("__name__", "==", userId));
        const profileSnap = await getDocs(profileQ);
        if (!profileSnap.empty) {
          const profileData = profileSnap.docs[0].data();
          if (profileData.businessName) setBusinessName(profileData.businessName);
        }

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
    toast.success(product.name + " added to cart", { icon: '🛒' });
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

      const orderNumber = "ORD-" + Date.now().toString().slice(-6);

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
        invoiceNumber: orderNumber
      };

      await addDoc(collection(db, "quotations"), quotationData);
      
      setOrderPlaced(true);
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Setting up your experience...</p>
      </div>
    );
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-24 h-24 bg-green-50 text-brand-tertiary rounded-full flex items-center justify-center animate-in zoom-in duration-500 mb-8">
          <CheckCircle size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Order Confirmed!</h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto mb-10 leading-relaxed">
          Thank you, <span className="font-semibold text-gray-900">{customerName}</span>. Your order has been placed successfully and the store owner has been notified.
        </p>
        <button 
          onClick={() => {
            setOrderPlaced(false);
            setCustomerName("");
            setCustomerPhone("");
          }}
          className="px-8 py-3.5 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition-all hover:scale-105 shadow-xl shadow-gray-200 flex items-center gap-2"
        >
          Continue Shopping <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100">
      <Head>
        <title>{businessName} | Online Store</title>
      </Head>

      {/* Modern Glass Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              {businessName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">{businessName}</h1>
              <p className="text-[11px] text-gray-500 font-medium uppercase tracking-widest">Official Store</p>
            </div>
          </div>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center gap-2"
          >
            <ShoppingBag size={24} strokeWidth={1.5} />
            {cartItemCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Vibrant Hero Section */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 opacity-50"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center flex flex-col items-center">
          <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs tracking-wider uppercase mb-6 inline-flex items-center gap-1 border border-indigo-100 shadow-sm">
            <Star size={12} className="fill-indigo-600" /> Discover Quality
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight max-w-3xl leading-[1.1]">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{businessName}</span>
          </h2>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl font-medium leading-relaxed">
            Browse our exclusive collection of premium products. Quality guaranteed, delivered directly to you.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Our Collection</h3>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{products.length} Products</span>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map(product => (
              <div 
                key={product.id} 
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                {/* Product Image Placeholder with abstract gradient */}
                <div className="h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden group-hover:from-indigo-50 group-hover:to-purple-50 transition-colors">
                  <Package size={48} className="text-gray-300 group-hover:text-indigo-200 transition-colors duration-500 group-hover:scale-110" strokeWidth={1} />
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="absolute top-3 left-3 bg-red-100 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Only {product.stock} left
                    </span>
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-1 truncate">{product.name}</h4>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {product.description || "Premium quality product available exclusively at our store."}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Price</span>
                      <span className="text-xl font-extrabold text-gray-900">₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-indigo-600 hover:scale-110 transition-all shadow-md active:scale-95"
                      aria-label="Add to cart"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Side Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsCartOpen(false)}
          ></div>
          
          {/* Drawer */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Cart Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                  <ShoppingBag size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingBag size={40} className="text-gray-300" />
                  </div>
                  <p className="text-lg font-bold text-gray-800">Your cart is empty</p>
                  <p className="text-gray-500 max-w-[250px]">Looks like you haven't added any premium items yet.</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group">
                      <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
                         <Package size={24} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                        <div className="font-extrabold text-indigo-600 text-sm mt-1">₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-100">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white rounded-full transition-all shadow-sm"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold text-gray-900 w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white rounded-full transition-all shadow-sm"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout Section */}
            {cart.length > 0 && (
              <div className="border-t border-gray-100 bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Shipping</span>
                    <span className="font-medium text-brand-tertiary">Free</span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-extrabold text-gray-900">₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="Your Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || !customerName.trim() || !customerPhone.trim()}
                  className="w-full py-4 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 group"
                >
                  {placingOrder ? "Placing Order..." : "Complete Order"}
                  {!placingOrder && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
