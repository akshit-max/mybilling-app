"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronDown, Plus, Package, FileSpreadsheet, Pencil, Trash2, MoreVertical, Share2, Tag, AlertTriangle, X, Settings, Sparkles, AlertCircle } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, getDocsFromCache, query, where, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useSession } from "@/context/SessionContext";

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
  discountOnSales?: number;
  isOffline?: boolean;
};

type ModalTab = "basic" | "stock" | "pricing" | "party" | "custom";

export default function ItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProfile } = useSession();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Category CRUD states
  const [productCategories, setProductCategories] = useState<{ id: string; name: string }[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // Modals Toggles & Actions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>("basic");
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [showBulkActionsDropdown, setShowBulkActionsDropdown] = useState(false);
  const [showReportsDropdown, setShowReportsDropdown] = useState(false);
  
  // Bulk Edit State
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<Product[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Form State
  const [formType, setFormType] = useState<"Product" | "Service">("Product");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("0");
  const [formTaxIncluded, setFormTaxIncluded] = useState<"with" | "without">("without");
  const [formGst, setFormGst] = useState("18");
  const [formUnit, setFormUnit] = useState("PCS");
  const [formStock, setFormStock] = useState("0");
  const [formItemCode, setFormItemCode] = useState("");
  const [formHsnCode, setFormHsnCode] = useState("");
  const [formAsOfDate, setFormAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [formLowStockWarning, setFormLowStockWarning] = useState(false);
  const [formLowStockThreshold, setFormLowStockThreshold] = useState("2");
  const [formDescription, setFormDescription] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("0");
  const [formCostTaxIncluded, setFormCostTaxIncluded] = useState<"with" | "without">("without");
  const [formDiscountOnSales, setFormDiscountOnSales] = useState("0");

  const fetchProductsList = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "products"),
        where("userId", "==", user.uid)
      );
      
      let snap;
      if (!navigator.onLine) {
        snap = await getDocsFromCache(q);
      } else {
        snap = await getDocs(q);
      }

      let onlineData: Product[] = snap.docs.map((docSnap) => {
        const docData = docSnap.data();
        return {
          id: docSnap.id,
          name: docData.name || "Unknown Product",
          price: Number(docData.price || 0),
          costPrice: Number(docData.costPrice || 0),
          discountPrice: Number(docData.discountPrice || 0),
          gst: Number(docData.gst !== undefined ? docData.gst : 18),
          stock: Number(docData.stock || 0),
          barcode: docData.barcode || "",
          itemCode: docData.itemCode || "",
          category: docData.category || "-",
          unit: docData.unit || "PCS",
          lowStockThreshold: Number(docData.lowStockThreshold || 2),
          description: docData.description || "",
          hsnCode: docData.hsnCode || "",
          type: docData.type || "Product",
          lowStockWarning: !!docData.lowStockWarning,
          taxIncluded: !!docData.taxIncluded,
          costTaxIncluded: !!docData.costTaxIncluded,
          discountOnSales: Number(docData.discountOnSales || 0),
          isOffline: docSnap.metadata.hasPendingWrites,
        };
      });

      let offlineData: Product[] = [];
      try {
        const { getOfflineProducts } = await import("@/lib/offlineProducts");
        const cached = await getOfflineProducts();
        offlineData = cached.map((c: any) => ({
          id: c.id?.toString() || `offline-${Math.random()}`,
          name: c.name || "Unknown Product",
          price: Number(c.price || 0),
          costPrice: Number(c.costPrice || 0),
          discountPrice: 0,
          gst: Number(c.gst !== undefined ? c.gst : 18),
          stock: Number(c.stock || 0),
          barcode: c.barcode || "",
          itemCode: c.itemCode || "",
          category: c.category || "-",
          unit: c.unit || "PCS",
          lowStockThreshold: Number(c.lowStockThreshold || 2),
          description: c.description || "",
          hsnCode: c.hsnCode || "",
          type: c.type || "Product",
          lowStockWarning: !!c.lowStockWarning,
          taxIncluded: !!c.taxIncluded,
          costTaxIncluded: !!c.costTaxIncluded,
          discountOnSales: Number(c.discountOnSales || 0),
          isOffline: true,
        }));
      } catch (err) {
        console.error("IndexedDB fetch error:", err);
      }

      const combined = [...offlineData, ...onlineData];
      
      const uniqueMap = new Map<string, Product>();
      combined.forEach(p => {
        uniqueMap.set(p.id, p);
      });

      setProducts(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error("Products fetch error:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesList = async (userUid: string) => {
    try {
      const q = query(
        collection(db, "productCategories"),
        where("userId", "==", userUid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "",
      }));
      setProductCategories(data);
    } catch (err) {
      console.error("Categories fetch error:", err);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        fetchProductsList();
        fetchCategoriesList(u.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Handle Redirect Query Params to open modals cleanly
  useEffect(() => {
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (action === "create") {
      openCreateModal();
      // Clean query params
      router.replace("/dashboard/products");
    } else if (action === "edit" && id) {
      openEditModal(id);
      // Clean query params
      router.replace("/dashboard/products");
    }
  }, [searchParams, router]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode("create");
    setActiveModalTab("basic");
    setEditProductId(null);

    // Reset Form Fields
    setFormType("Product");
    setFormName("");
    setFormCategory("");
    setFormPrice("0");
    setFormTaxIncluded("without");
    setFormGst("18");
    setFormUnit("PCS");
    setFormStock("0");
    setFormItemCode("");
    setFormHsnCode("");
    setFormAsOfDate(new Date().toISOString().split("T")[0]);
    setFormLowStockWarning(false);
    setFormLowStockThreshold("2");
    setFormDescription("");
    setFormCostPrice("0");
    setFormCostTaxIncluded("without");
    setFormDiscountOnSales("0");

    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = async (id: string) => {
    setModalMode("edit");
    setActiveModalTab("basic");
    setEditProductId(id);

    try {
      const snap = await getDoc(doc(db, "products", id));
      if (snap.exists()) {
        const data = snap.data();
        setFormType(data.type || "Product");
        setFormName(data.name || "");
        setFormCategory(data.category && data.category !== "-" ? data.category : "");
        setFormPrice(String(data.price || "0"));
        setFormTaxIncluded(data.taxIncluded ? "with" : "without");
        setFormGst(String(data.gst !== undefined ? data.gst : "18"));
        setFormUnit(data.unit || "PCS");
        setFormStock(String(data.stock || "0"));
        setFormItemCode(data.itemCode || data.barcode || "");
        setFormHsnCode(data.hsnCode || "");
        setFormAsOfDate(data.asOfDate || new Date().toISOString().split("T")[0]);
        setFormLowStockWarning(!!data.lowStockWarning);
        setFormLowStockThreshold(String(data.lowStockThreshold || "2"));
        setFormDescription(data.description || "");
        setFormCostPrice(String(data.costPrice || "0"));
        setFormCostTaxIncluded(data.costTaxIncluded ? "with" : "without");
        setFormDiscountOnSales(String(data.discountOnSales || "0"));

        setIsModalOpen(true);
      } else {
        toast.error("Item details not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load item specs");
    }
  };

  const handleBarcodeGenerate = () => {
    const randomCode = "PRD" + Math.floor(100000 + Math.random() * 900000);
    setFormItemCode(randomCode);
    toast.success(`Generated Item Code: ${randomCode} 🏷️`);
  };

  const handleSaveModal = async (e?: React.FormEvent, saveAndNew = false) => {
    if (e) e.preventDefault();

    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");

    if (!formName.trim()) {
      toast.error("Item Name is required");
      return;
    }

    const priceVal = Number(formPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      toast.error("Sales Price must be a valid positive number or zero");
      return;
    }

    const costPriceVal = Number(formCostPrice);
    if (isNaN(costPriceVal) || costPriceVal < 0) {
      toast.error("Purchase Price must be a valid positive number or zero");
      return;
    }

    const discountVal = Number(formDiscountOnSales);
    if (isNaN(discountVal) || discountVal < 0 || discountVal > 100) {
      toast.error("Discount on Sales must be a percentage between 0 and 100");
      return;
    }

    const gstVal = Number(formGst);
    if (isNaN(gstVal) || gstVal < 0 || gstVal > 100) {
      toast.error("GST Tax Rate must be a percentage between 0 and 100");
      return;
    }

    const stockVal = Number(formStock);
    if (isNaN(stockVal)) {
      toast.error("Opening Stock must be a valid number");
      return;
    }

    const thresholdVal = Number(formLowStockThreshold);
    if (formLowStockWarning && (isNaN(thresholdVal) || thresholdVal < 0)) {
      toast.error("Low Stock Threshold must be a valid positive number or zero");
      return;
    }

    try {
      setModalSaving(true);

      const productData = {
        userId: user.uid,
        name: formName.trim(),
        type: formType,
        category: formCategory.trim() || "-",
        price: Number(formPrice) || 0,
        taxIncluded: formTaxIncluded === "with",
        gst: Number(formGst) || 0,
        unit: formUnit,
        stock: Number(formStock) || 0,
        itemCode: formItemCode.trim() || null,
        barcode: formItemCode.trim() || null,
        hsnCode: formHsnCode.trim() || null,
        asOfDate: formAsOfDate,
        lowStockWarning: formLowStockWarning,
        lowStockThreshold: Number(formLowStockThreshold) || 2,
        description: formDescription.trim(),
        costPrice: Number(formCostPrice) || 0,
        costTaxIncluded: formCostTaxIncluded === "with",
        discountOnSales: Number(formDiscountOnSales) || 0,
      };

      if (!navigator.onLine) {
        const { saveOfflineProduct } = await import("@/lib/offlineProducts");
        await saveOfflineProduct({
          ...productData,
          createdAt: new Date(),
          createdBy: activeProfile?.name || "Admin",
          isOffline: true,
          isEdit: modalMode === "edit",
          originalProductId: editProductId || undefined
        } as any);
        toast.success("Saved offline. Will sync when online! 🔄");
      } else {
        if (modalMode === "create") {
          await addDoc(collection(db, "products"), {
            ...productData,
            createdAt: serverTimestamp(),
            createdBy: activeProfile.name
          });
          toast.success("Item Added Successfully ✅");
        } else if (modalMode === "edit" && editProductId) {
          await updateDoc(doc(db, "products", editProductId), productData);
          toast.success("Item Updated Successfully ✅");
        }
      }

      await fetchProductsList();

      if (saveAndNew && modalMode === "create") {
        openCreateModal();
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save item spec data");
    } finally {
      setModalSaving(false);
    }
  };

  const handleBulkEditChange = (id: string, field: keyof Product, value: any) => {
    setBulkEditData(prev => 
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  };

  const handleSaveBulkEdit = async () => {
    try {
      setBulkSaving(true);
      const batchPromises = bulkEditData.map(item => 
        updateDoc(doc(db, "products", item.id), {
          name: item.name,
          price: Number(item.price) || 0,
          costPrice: Number(item.costPrice) || 0,
          stock: Number(item.stock) || 0,
          gst: Number(item.gst) || 0
        })
      );
      await Promise.all(batchPromises);
      toast.success("Items updated successfully! ✅");
      setShowBulkEditModal(false);
      fetchProductsList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update items");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Item deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete item");
    }
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid .csv file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast.error("CSV is empty or missing data rows");
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const priceIdx = headers.findIndex(h => h.includes('price'));
        const stockIdx = headers.findIndex(h => h.includes('stock'));
        const catIdx = headers.findIndex(h => h.includes('category'));
        const gstIdx = headers.findIndex(h => h.includes('gst'));
        const codeIdx = headers.findIndex(h => h.includes('code'));

        if (nameIdx === -1) {
          toast.error("CSV must contain a 'Name' column");
          return;
        }

        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        toast.loading("Uploading items...", { id: "bulk-upload" });

        let addedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (!cols[nameIdx]) continue;

          await addDoc(collection(db, "products"), {
            userId: user.uid,
            name: cols[nameIdx],
            price: priceIdx !== -1 ? Number(cols[priceIdx]) || 0 : 0,
            stock: stockIdx !== -1 ? Number(cols[stockIdx]) || 0 : 0,
            category: catIdx !== -1 && cols[catIdx] ? cols[catIdx] : "-",
            gst: gstIdx !== -1 ? Number(cols[gstIdx]) || 18 : 18,
            itemCode: codeIdx !== -1 && cols[codeIdx] ? cols[codeIdx] : null,
            barcode: codeIdx !== -1 && cols[codeIdx] ? cols[codeIdx] : null,
            type: "Product",
            unit: "PCS",
            createdAt: serverTimestamp(),
            createdBy: activeProfile?.name || "Admin"
          });
          addedCount++;
        }

        toast.success(`Successfully added ${addedCount} items! ✅`, { id: "bulk-upload" });
        fetchProductsList();
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse and upload CSV", { id: "bulk-upload" });
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Derived Analytics Stats
  const totalItems = products.length;
  const stockValue = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 2)).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;

  // Filter & Search Logic
  const getCategoryProductCount = (categoryName: string) => {
    return products.filter((p) => p.category === categoryName).length;
  };

  const filteredCategories = productCategories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return toast.error("Category name is required");
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = await addDoc(collection(db, "productCategories"), {
        name: newCategoryName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setProductCategories([...productCategories, { id: docRef.id, name: newCategoryName.trim() }]);
      setNewCategoryName("");
      setShowCreateModal(false);
      toast.success("Category created successfully! 📦");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;
    
    try {
      const ref = doc(db, "productCategories", editingCategory.id);
      await updateDoc(ref, {
        name: editCategoryName.trim(),
      });

      // Update local state list
      setProductCategories(productCategories.map(c => c.id === editingCategory.id ? { ...c, name: editCategoryName.trim() } : c));

      // Cascade updates to products that currently use this category
      const affectedProducts = products.filter(p => p.category === editingCategory.name);
      for (const p of affectedProducts) {
        await updateDoc(doc(db, "products", p.id), {
          category: editCategoryName.trim(),
        });
      }
      
      // Refresh products list
      fetchProductsList();

      // Reset states
      setEditingCategory(null);
      setEditCategoryName("");
      setShowEditModal(false);
      toast.success("Category updated successfully! 🔄");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    if (!confirm(`Are you sure you want to delete "${editingCategory.name}"?`)) return;

    try {
      await deleteDoc(doc(db, "productCategories", editingCategory.id));
      
      // Update local state
      setProductCategories(productCategories.filter(c => c.id !== editingCategory.id));

      // Cascade remove from products that use this category
      const affectedProducts = products.filter(p => p.category === editingCategory.name);
      for (const p of affectedProducts) {
        await updateDoc(doc(db, "products", p.id), {
          category: "-",
        });
      }

      // Refresh list
      fetchProductsList();

      setEditingCategory(null);
      setEditCategoryName("");
      setShowEditModal(false);
      toast.success("Category deleted successfully! 🗑️");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(searchTerm)) ||
                          (p.itemCode && p.itemCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    
    const matchesLowStock = !showLowStockOnly || (p.stock || 0) <= (p.lowStockThreshold || 2);

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const categories = Array.from(new Set(products.map(p => p.category).filter(c => c && c !== "-")));

  return (
    <div className="space-y-0 max-w-full mx-auto pb-10 font-sans bg-gray-50/50 min-h-screen relative">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800">Items</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-indigo-50 transition-all">
            <span>Manage Offer</span>
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowReportsDropdown(!showReportsDropdown)}
              className="flex items-center gap-2 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-indigo-50 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>Reports</span>
              <ChevronDown size={12} />
            </button>
            {showReportsDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowReportsDropdown(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 py-1.5 text-left text-xs font-medium text-gray-700">
                  <Link href="/dashboard/reports/rate-list" className="block px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 w-full text-left">
                    Rate List
                  </Link>
                  <Link href="/dashboard/reports/stock-summary" className="block px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 w-full text-left">
                    Stock Summary
                  </Link>
                  <Link href="/dashboard/reports/low-stock-summary" className="block px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 w-full text-left">
                    Low Stock Summary
                  </Link>
                  <Link href="/dashboard/reports/item-sales-summary" className="block px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 w-full text-left">
                    Item Sales Summary
                  </Link>
                </div>
              </>
            )}
          </div>
          <button className="p-1.5 text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-600 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button className="p-1.5 text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-600 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>
        </div>
      </div>

      {/* Promos Banner */}
      {showBanner && (
        <div className="mx-6 mt-4 bg-amber-500/10 text-amber-800 px-6 py-2.5 rounded-lg flex items-center justify-between border border-amber-500/20 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏷️</span>
            <div>
              <p className="text-xs font-semibold">Launch Offers on Your Items</p>
              <p className="text-[10px] text-amber-600/80">Launch discounts, coupons and boost your item sales instantly.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-amber-700 transition-all shadow-sm">
              Create Offer Now
            </button>
            <button onClick={() => setShowBanner(false)} className="text-amber-500 hover:text-amber-800 text-lg leading-none p-1 font-light">&times;</button>
          </div>
        </div>
      )}

      {/* Modern Stats Cards Navigation */}
      <div className="grid grid-cols-4 gap-4 px-6 pt-4">
        
        {/* Total Items Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-20 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>Total Items</span>
          </div>
          <div className="text-xl font-bold text-gray-800">{loading ? "..." : totalItems}</div>
        </div>

        {/* Inventory Value Tab */}
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-20 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Stock Value</span>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-800">₹ {loading ? "..." : stockValue.toLocaleString("en-IN")}</div>
        </div>

        {/* Low Stock Stat Tab */}
        <button 
          onClick={() => {
            setShowLowStockOnly(!showLowStockOnly);
          }}
          className={`border text-left rounded-lg p-3.5 flex flex-col justify-between h-20 transition-all duration-200 shadow-sm ${
            showLowStockOnly 
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-500/20" 
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Low Stock Items</span>
          </div>
          <div className="text-xl font-bold text-gray-800">{loading ? "..." : lowStockCount}</div>
        </button>

        {/* Out of Stock Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-20 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            <span>Out of Stock</span>
          </div>
          <div className="text-xl font-bold text-gray-800">{loading ? "..." : outOfStockCount}</div>
        </div>

      </div>

      {/* Enterprise Styled Card */}
      <div className="bg-white border border-gray-200 rounded-lg mx-6 mt-4 flex flex-col min-h-[420px] shadow-sm overflow-visible">

        {/* Toolbar */}
        <div className="p-3 border-b border-gray-100 flex flex-wrap gap-3 justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs w-48 focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400"
              />
            </div>
            
            {/* High-Fidelity Categories Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold transition"
              >
                <span>{selectedCategory === "all" ? "Search Categories" : selectedCategory}</span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              {showCategoryDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)}></div>
                  <div className="absolute left-0 mt-1.5 w-56 bg-white border border-gray-200 rounded shadow-lg z-20 p-2 space-y-2">
                    
                    {/* Category Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                      <input 
                        type="text"
                        placeholder="Search Categories"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded text-[11px] focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400"
                      />
                    </div>

                    {/* Category List */}
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                      <button
                        onClick={() => {
                          setSelectedCategory("all");
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 hover:bg-gray-50 hover:text-indigo-650 flex justify-between items-center text-[11px] rounded font-medium transition ${
                          selectedCategory === "all" ? "text-indigo-600 bg-indigo-50/30" : "text-gray-700"
                        }`}
                      >
                        <span>All Categories</span>
                        <span className="text-[10px] text-gray-400 font-bold font-mono">({products.length})</span>
                      </button>

                      {filteredCategories.map((cat) => {
                        const count = getCategoryProductCount(cat.name);
                        return (
                          <div 
                            key={cat.id} 
                            className={`w-full flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded transition group ${
                              selectedCategory === cat.name ? "bg-indigo-50/20 text-indigo-650" : ""
                            }`}
                          >
                            <button
                              onClick={() => {
                                setSelectedCategory(cat.name);
                                setShowCategoryDropdown(false);
                              }}
                              className="flex-1 text-left text-[11px] font-semibold text-gray-700 py-0.5"
                            >
                              <span>{cat.name}</span>
                              <span className="text-[10px] text-gray-400 font-bold font-mono ml-1">({count})</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setEditCategoryName(cat.name);
                                setShowEditModal(true);
                                setShowCategoryDropdown(false);
                              }}
                              className="opacity-100 p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition"
                            >
                              <Pencil size={10} className="text-indigo-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dashed Create Button */}
                    <button
                      onClick={() => {
                        setShowCreateModal(true);
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full border border-dashed border-indigo-200 rounded py-1.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1 transition"
                    >
                      <Plus size={11} />
                      <span>Add Category</span>
                    </button>

                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border transition-all ${
                showLowStockOnly 
                  ? "bg-amber-100 border-amber-300 text-amber-700 font-semibold" 
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <AlertTriangle size={12} className="text-amber-500" />
              <span>Low Stock</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowBulkActionsDropdown(!showBulkActionsDropdown)}
                className="flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1.5 rounded hover:bg-gray-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                <span>Bulk Actions</span>
                <ChevronDown size={11} />
              </button>
              {showBulkActionsDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBulkActionsDropdown(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 py-1.5 text-left text-xs text-gray-700 divide-y divide-gray-100">
                    <div className="px-3 py-2">
                      <button 
                        onClick={() => {
                          setShowBulkActionsDropdown(false);
                          toast.success("Ready to add items via Excel!");
                          const input = document.getElementById("excel-upload-input");
                          if (input) input.click();
                        }}
                        className="w-full text-left font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                      >
                        <Plus size={12} />
                        <div>
                          <p>Add Items</p>
                          <p className="text-[9px] text-gray-400 font-normal leading-tight mt-0.5">Quickly add multiple items at once via CSV/Excel</p>
                        </div>
                      </button>
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      <p className="text-[10px] text-gray-400 font-semibold mb-1 flex items-center gap-1">
                        <Pencil size={10} /> Bulk Edit
                      </p>
                      <button onClick={() => { 
                        setShowBulkActionsDropdown(false); 
                        setBulkEditData([...products]); 
                        setShowBulkEditModal(true); 
                      }} className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded">
                        Bulk Edit Items
                      </button>
                      <button onClick={() => { 
                        setShowBulkActionsDropdown(false); 
                        setBulkEditData([...products]); 
                        setShowBulkEditModal(true); 
                        toast.success("Edit the GST % column for any item");
                      }} className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded">
                        Edit GST Rates
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button 
              onClick={openCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus size={13} /> 
              <span>Create Item</span>
            </button>
          </div>
        </div>

        {/* Dense Table */}
        <div className="flex-1 overflow-x-auto relative">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span className="text-xs">Loading items data...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-sm">
                <Package size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">No items found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Try widening your search terms or filters.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2.5 font-semibold">Item Name</th>
                  <th className="px-4 py-2.5 font-semibold">Item Code</th>
                  <th className="px-4 py-2.5 font-semibold">Stock Qty</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Selling Price</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Purchase Price</th>
                  <th className="px-4 py-2.5 font-semibold text-center w-12">GST %</th>
                  <th className="px-4 py-2.5 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock <= (p.lowStockThreshold || 2);
                  const isOutOfStock = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3 font-semibold text-brand-primary">
                        <div>
                          <p className="font-semibold text-brand-primary">{p.name}</p>
                          {p.category && p.category !== "-" && (
                            <span className="inline-block bg-gray-100 text-gray-600 text-[9px] px-1.5 py-0.5 rounded mt-0.5 font-normal">{p.category}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{p.itemCode || p.barcode || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700 font-mono">{p.stock} {p.unit || "PCS"}</span>
                          {isOutOfStock ? (
                            <span className="bg-red-50 text-red-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-red-100">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="bg-amber-50 text-amber-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-amber-100">Low Stock</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-gray-800">
                        ₹ {p.price.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-gray-500">
                        {p.costPrice ? `₹ ${p.costPrice.toLocaleString("en-IN", { minimumFractionDigits: 0 })}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold font-mono text-gray-600">
                        {p.gst}%
                      </td>
                      <td className="px-2 py-3 text-center relative overflow-visible">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === p.id ? null : p.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical size={13} />
                        </button>
                        
                        {/* Interactive Dropdown Menu */}
                        {openDropdownId === p.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                            <div className="absolute right-4 top-8 w-28 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 text-left">
                              <Link 
                                href={`/dashboard/products/${p.id}`}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5 text-[11px] text-gray-700 block"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                <span>View</span>
                              </Link>
                              <button 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  openEditModal(p.id);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5 text-[11px] text-gray-700"
                              >
                                <Pencil size={11} className="text-indigo-500" />
                                <span>Edit</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleDelete(p.id);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5 text-[11px] text-red-600"
                              >
                                <Trash2 size={11} className="text-red-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom Import Excel Promotional Banner */}
      <div className="mx-6 mt-4 bg-indigo-50/30 border border-indigo-100 rounded-lg p-4 flex items-center gap-5">
        <div className="w-14 h-11 bg-white border border-indigo-100 rounded flex items-center justify-center text-xl shrink-0 shadow-sm">
          📦
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-xs">Add Multiple Items at once</p>
          <p className="text-[10px] text-gray-400">Bulk upload your items from product library or spreadsheets like Vyapar, Vyapari, Busy & Marg.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold text-gray-600 px-3 py-1.5 rounded shadow-sm transition-all flex items-center gap-1">
            <span>Product Library</span>
          </button>
          <button 
            onClick={() => {
              toast.success("Ready to add items via Excel!");
              const input = document.getElementById("excel-upload-input");
              if (input) input.click();
            }}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold text-gray-600 px-3 py-1.5 rounded shadow-sm transition-all flex items-center gap-1"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span>Upload Excel</span>
          </button>
          <input 
            type="file" 
            id="excel-upload-input" 
            className="hidden" 
            accept=".csv" 
            onChange={handleUploadExcel}
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* 🚀 HIGH-FIDELITY SAAS POPUP DIALOG MODAL 🚀 */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          
          {/* Modal Outer Container */}
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <span>{modalMode === "create" ? "Create New Item" : "Edit Item Specifications"}</span>
                {formName && <span className="text-gray-400 font-normal">| {formName}</span>}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content - Dual Pane */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4">
              
              {/* Left Tabs Sidebar */}
              <div className="col-span-1 border-r border-gray-150 bg-gray-50/50 p-4 space-y-1 overflow-y-auto">
                <button
                  onClick={() => setActiveModalTab("basic")}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all ${
                    activeModalTab === "basic" 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-gray-600 hover:bg-gray-100/50"
                  }`}
                >
                  <span>Basic Details *</span>
                </button>
                
                {/* Advance Details Heading */}
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">Advance Details</p>

                <button
                  onClick={() => setActiveModalTab("stock")}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all ${
                    activeModalTab === "stock" 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-gray-600 hover:bg-gray-100/50"
                  }`}
                >
                  <span>Stock Details</span>
                </button>
                <button
                  onClick={() => setActiveModalTab("pricing")}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all ${
                    activeModalTab === "pricing" 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-gray-600 hover:bg-gray-100/50"
                  }`}
                >
                  <span>Pricing Details</span>
                </button>
                <button
                  onClick={() => setActiveModalTab("party")}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all ${
                    activeModalTab === "party" 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-gray-600 hover:bg-gray-100/50"
                  }`}
                >
                  <span>Party Wise Prices</span>
                </button>
                <button
                  onClick={() => setActiveModalTab("custom")}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all ${
                    activeModalTab === "custom" 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-gray-600 hover:bg-gray-100/50"
                  }`}
                >
                  <span>Custom Fields</span>
                </button>
              </div>

              {/* Right Viewport scrollable area */}
              <div className="col-span-3 p-6 overflow-y-auto max-h-[60vh] md:max-h-full">
                
                {/* 1. BASIC DETAILS VIEW */}
                {activeModalTab === "basic" && (
                  <div className="space-y-4">
                    
                    {/* Item type product/service */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Item Type *</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer">
                          <input 
                            type="radio" 
                            name="formType" 
                            checked={formType === "Product"}
                            onChange={() => setFormType("Product")}
                            className="text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <span>Product</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer">
                          <input 
                            type="radio" 
                            name="formType" 
                            checked={formType === "Service"}
                            onChange={() => setFormType("Service")}
                            className="text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <span>Service</span>
                        </label>
                      </div>
                    </div>

                    {/* Name & Category */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Item Name *</label>
                        <input 
                          type="text" 
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g. Joy Maggie 20gm"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
                        <select 
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-white cursor-pointer text-gray-700 font-semibold"
                        >
                          <option value="">None (-)</option>
                          {productCategories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Sales Price */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Sales Price (₹)</label>
                        <div className="flex border border-gray-200 rounded overflow-hidden">
                          <input 
                            type="number" 
                            value={formPrice}
                            onChange={(e) => setFormPrice(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                          <select 
                            value={formTaxIncluded}
                            onChange={(e) => setFormTaxIncluded(e.target.value as any)}
                            className="bg-gray-50 text-[10px] border-l border-gray-200 px-1 py-1 cursor-pointer outline-none text-gray-500 font-semibold"
                          >
                            <option value="without">Without Tax</option>
                            <option value="with">With Tax</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">GST Tax Rate (%)</label>
                        <select
                          value={formGst}
                          onChange={(e) => setFormGst(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer text-gray-700 bg-white"
                        >
                          <option value="0">None (0%)</option>
                          <option value="5">GST @ 5%</option>
                          <option value="12">GST @ 12%</option>
                          <option value="18">GST @ 18%</option>
                          <option value="28">GST @ 28%</option>
                        </select>
                      </div>
                    </div>

                    {/* Measuring unit & opening stock */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Measuring Unit</label>
                        <select
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer text-gray-700 bg-white"
                        >
                          <option value="PCS">Pieces (PCS)</option>
                          <option value="BOX">Box (BOX)</option>
                          <option value="KG">Kilograms (KG)</option>
                          <option value="LITRE">Litres (LITRE)</option>
                          <option value="PACKS">Packs (PACKS)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Opening Stock</label>
                        <input 
                          type="number" 
                          value={formStock}
                          onChange={(e) => setFormStock(e.target.value)}
                          placeholder="ex: 150 PCS"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* 2. STOCK DETAILS VIEW */}
                {activeModalTab === "stock" && (
                  <div className="space-y-4">
                    
                    {/* Item code / barcode */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Item Code</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={formItemCode}
                            onChange={(e) => setFormItemCode(e.target.value)}
                            placeholder="ex: ITM12349"
                            className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <button 
                            type="button"
                            onClick={handleBarcodeGenerate}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold border border-indigo-200 px-2 rounded transition-colors shrink-0"
                          >
                            Auto-Generate Code
                          </button>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 leading-tight">Barcode labels can be printed from the Product Details page.</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">HSN Code</label>
                        <input 
                          type="text" 
                          value={formHsnCode}
                          onChange={(e) => setFormHsnCode(e.target.value)}
                          placeholder="ex: 4010"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* date & low stock limit */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">As of Date</label>
                        <input 
                          type="date" 
                          value={formAsOfDate}
                          onChange={(e) => setFormAsOfDate(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-gray-600"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Low Stock Warnings</label>
                          <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer font-semibold">
                            <input 
                              type="checkbox" 
                              checked={formLowStockWarning}
                              onChange={(e) => setFormLowStockWarning(e.target.checked)}
                              className="rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <span>Enable Warning</span>
                          </label>
                        </div>
                        <input 
                          type="number" 
                          disabled={!formLowStockWarning}
                          value={formLowStockThreshold}
                          onChange={(e) => setFormLowStockThreshold(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 font-mono"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Item Description</label>
                      <textarea
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Enter Description"
                        className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      ></textarea>
                    </div>

                  </div>
                )}

                {/* 3. PRICING DETAILS VIEW */}
                {activeModalTab === "pricing" && (
                  <div className="space-y-4">
                    
                    {/* pricing fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Sales Price (₹)</label>
                        <div className="flex border border-gray-200 rounded overflow-hidden">
                          <input 
                            type="number" 
                            value={formPrice}
                            onChange={(e) => setFormPrice(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                          <select 
                            value={formTaxIncluded}
                            onChange={(e) => setFormTaxIncluded(e.target.value as any)}
                            className="bg-gray-50 text-[10px] border-l border-gray-200 px-1 py-1 cursor-pointer outline-none text-gray-500 font-semibold"
                          >
                            <option value="without">Without Tax</option>
                            <option value="with">With Tax</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Purchase Price (₹)</label>
                        <div className="flex border border-gray-200 rounded overflow-hidden">
                          <input 
                            type="number" 
                            value={formCostPrice}
                            onChange={(e) => setFormCostPrice(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                          <select 
                            value={formCostTaxIncluded}
                            onChange={(e) => setFormCostTaxIncluded(e.target.value as any)}
                            className="bg-gray-50 text-[10px] border-l border-gray-200 px-1 py-1 cursor-pointer outline-none text-gray-500 font-semibold"
                          >
                            <option value="without">Without Tax</option>
                            <option value="with">With Tax</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Tax & Discounts */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">GST Tax Rate (%)</label>
                        <select
                          value={formGst}
                          onChange={(e) => setFormGst(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer text-gray-700 bg-white"
                        >
                          <option value="0">None (0%)</option>
                          <option value="5">GST @ 5%</option>
                          <option value="12">GST @ 12%</option>
                          <option value="18">GST @ 18%</option>
                          <option value="28">GST @ 28%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Discount on Sales Price (%)</label>
                        <input 
                          type="number" 
                          value={formDiscountOnSales}
                          onChange={(e) => setFormDiscountOnSales(e.target.value)}
                          placeholder="ex: 12"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* 4. PARTY WISE PRICES PLACEHOLDER */}
                {activeModalTab === "party" && (
                  <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-2xl shadow-sm">
                      📋
                    </div>
                    <div className="max-w-xs space-y-1">
                      <p className="text-xs font-bold text-gray-700">Party Wise Prices</p>
                      <p className="text-[10px] text-gray-400 leading-normal">
                        To enable Party Wise Prices and set custom pricing structures for specific accounts, please save this item specifications first.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. CUSTOM FIELDS PLACEHOLDER */}
                {activeModalTab === "custom" && (
                  <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center text-2xl shadow-sm border border-gray-150">
                      🏷️
                    </div>
                    <div className="max-w-xs space-y-2">
                      <p className="text-xs font-bold text-gray-700">Custom Specification Fields</p>
                      <p className="text-[10px] text-gray-400 leading-normal">
                        You do not have any custom fields created yet for your inventory dashboard.
                      </p>
                      <button 
                        type="button" 
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center justify-center gap-1.5 w-full mt-1.5"
                      >
                        <Plus size={12} />
                        <span>Create Custom fields</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Modal Actions Footer Bar */}
            <div className="px-6 py-3.5 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-gray-500 border border-gray-300 bg-white px-4 py-1.5 rounded hover:bg-gray-100 font-semibold transition-colors"
              >
                Cancel
              </button>
              
              <div className="flex gap-2">
                {modalMode === "create" && (
                  <button 
                    type="button"
                    onClick={(e) => handleSaveModal(e, true)}
                    disabled={modalSaving}
                    className="text-xs text-indigo-600 border border-indigo-200 bg-white px-4 py-1.5 rounded hover:bg-indigo-50 font-semibold transition-colors disabled:opacity-50"
                  >
                    Save & New
                  </button>
                )}
                
                <button 
                  type="button"
                  onClick={(e) => handleSaveModal(e, false)}
                  disabled={modalSaving}
                  className="text-xs text-white bg-indigo-600 border border-indigo-600 px-5 py-1.5 rounded hover:bg-indigo-700 font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {modalSaving ? "Saving..." : modalMode === "create" ? "Save Item" : "Update Specifications"}
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Create Category Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCreateModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-705 text-gray-700 uppercase tracking-wide">Create New Category</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">CATEGORY NAME</label>
              <input 
                type="text" 
                placeholder="Ex: VIP Parties" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="border border-gray-200 text-gray-600 hover:bg-gray-100 px-4 py-1.5 rounded text-xs font-bold transition select-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCategory}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition select-none"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal Overlay */}
      {showEditModal && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowEditModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-705 text-gray-700 uppercase tracking-wide">Edit {editingCategory.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">CATEGORY NAME</label>
              <input 
                type="text" 
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button 
                onClick={handleDeleteCategory}
                className="text-red-650 hover:text-red-800 text-xs font-bold transition select-none cursor-pointer text-red-600"
              >
                Delete Category
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="border border-gray-200 text-gray-600 hover:bg-gray-100 px-4 py-1.5 rounded text-xs font-bold transition select-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateCategory}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition select-none"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowBulkEditModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-5xl h-[80vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <Pencil size={16} className="text-indigo-600" /> Bulk Edit Items
              </h3>
              <button onClick={() => setShowBulkEditModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-50/30">
              <table className="w-full text-left text-xs text-gray-600 border-collapse bg-white border border-gray-200 rounded">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                    <th className="px-3 py-2 border-r border-gray-100">Item Name</th>
                    <th className="px-3 py-2 border-r border-gray-100">Sales Price</th>
                    <th className="px-3 py-2 border-r border-gray-100">Purchase Price</th>
                    <th className="px-3 py-2 border-r border-gray-100">Stock Qty</th>
                    <th className="px-3 py-2">GST %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bulkEditData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 border-r border-gray-100">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => handleBulkEditChange(item.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded bg-transparent focus:bg-white transition-all outline-none font-semibold text-gray-800"
                        />
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-100">
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-1">₹</span>
                          <input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => handleBulkEditChange(item.id, 'price', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded bg-transparent focus:bg-white transition-all outline-none font-mono"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-100">
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-1">₹</span>
                          <input 
                            type="number" 
                            value={item.costPrice} 
                            onChange={(e) => handleBulkEditChange(item.id, 'costPrice', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded bg-transparent focus:bg-white transition-all outline-none font-mono"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-100">
                        <input 
                          type="number" 
                          value={item.stock} 
                          onChange={(e) => handleBulkEditChange(item.id, 'stock', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded bg-transparent focus:bg-white transition-all outline-none font-mono text-center"
                        />
                      </td>
                      <td className="px-2 py-1.5 border-gray-100">
                        <div className="flex items-center">
                          <input 
                            type="number" 
                            value={item.gst} 
                            onChange={(e) => handleBulkEditChange(item.id, 'gst', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded bg-transparent focus:bg-white transition-all outline-none font-mono text-center"
                          />
                          <span className="text-gray-400 ml-1">%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bulkEditData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400">
                        No items available to edit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-semibold">{bulkEditData.length} items</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowBulkEditModal(false)}
                  className="border border-gray-200 text-gray-600 hover:bg-gray-100 px-5 py-1.5 rounded text-xs font-bold transition select-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveBulkEdit}
                  disabled={bulkSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-1.5 rounded text-xs font-bold shadow-sm transition select-none disabled:opacity-50"
                >
                  {bulkSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
