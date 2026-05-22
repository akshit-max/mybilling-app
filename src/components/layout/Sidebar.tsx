"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  ShoppingBag,
  FileText,
  Landmark,
  FileCheck2,
  ReceiptText,
  Calculator,
  MonitorSmartphone,
  UsersRound,
  UserCog,
  Globe,
  MessageSquare,
  Settings,
  ShieldCheck,
  Crown,
  Plus,
  Share2,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type SubItem = {
  name: string;
  href: string;
  badge?: string;
};

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  hasSubmenu?: boolean;
  subItems?: SubItem[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  
  const [businessName, setBusinessName] = useState("Loading...");
  const [phone, setPhone] = useState("...");
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "settings", user.uid));
          if (snap.exists()) {
            setBusinessName(snap.data().businessName || "self");
            setPhone(snap.data().phone || "...");
          } else {
            setBusinessName("self");
            setPhone("...");
          }
        } catch (err) {
          console.error(err);
          setBusinessName("self");
        }
      } else {
        setBusinessName("self");
        setPhone("...");
      }
    });
    return () => unsub();
  }, []);

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Auto-expand menus based on active path
  useEffect(() => {
    const expansions: Record<string, boolean> = {};
    if (pathname?.startsWith("/dashboard/customers")) expansions["Parties"] = true;
    if (pathname?.startsWith("/dashboard/products")) expansions["Items"] = true;
    if (pathname?.startsWith("/dashboard/invoices") || pathname?.startsWith("/dashboard/credit-note") || pathname?.startsWith("/dashboard/delivery-challan") || pathname?.startsWith("/dashboard/proforma-invoice")) expansions["Sales"] = true;
    if (pathname?.startsWith("/dashboard/purchases") || pathname?.startsWith("/dashboard/purchase-return") || pathname?.startsWith("/dashboard/debit-note") || pathname?.startsWith("/dashboard/purchase-orders") || pathname?.startsWith("/dashboard/payment-out")) expansions["Purchases"] = true;
    if (Object.keys(expansions).length > 0) {
      setExpandedMenus(prev => ({ ...prev, ...expansions }));
    }
  }, [pathname]);

  const navGroups: NavGroup[] = [
    {
      title: "GENERAL",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Parties",
          href: "/dashboard/customers",
          icon: Users,
          hasSubmenu: true,
          subItems: [
            { name: "All Parties", href: "/dashboard/customers" },
            { name: "Shared Ledger", href: "/dashboard/customers/shared-ledger", badge: "New" },
          ],
        },
        {
          name: "Items",
          href: "/dashboard/products",
          icon: Package,
          hasSubmenu: true,
          subItems: [
            { name: "Inventory", href: "/dashboard/products" },
            { name: "Godown (Warehouse)", href: "/dashboard/products/godown" },
          ],
        },
        {
          name: "Sales",
          href: "/dashboard/invoices",
          icon: ShoppingCart,
          hasSubmenu: true,
          subItems: [
            { name: "Sales Invoices", href: "/dashboard/invoices" },
            { name: "Quotation / Estimate", href: "/dashboard/quotations" },
            { name: "Payment In", href: "/dashboard/payment-in" },
            { name: "Sales Return", href: "/dashboard/sales-return" },
            { name: "Credit Note", href: "/dashboard/credit-note" },
            { name: "Delivery Challan", href: "/dashboard/delivery-challan" },
            { name: "Proforma Invoice", href: "/dashboard/proforma-invoice" },
          ],
        },
        {
          name: "Purchases",
          href: "/dashboard/purchases",
          icon: ShoppingBag,
          hasSubmenu: true,
          subItems: [
            { name: "Purchase Invoices", href: "/dashboard/purchases" },
            { name: "Payment Out", href: "/dashboard/payment-out" },
            { name: "Purchase Return", href: "/dashboard/purchase-return" },
            { name: "Debit Note", href: "/dashboard/debit-note" },
            { name: "Purchase Orders", href: "/dashboard/purchase-orders" },
          ],
        },
        {
          name: "Reports",
          href: "/dashboard/reports",
          icon: FileText,
        },
      ],
    },
    {
      title: "ACCOUNTING SOLUTIONS",
      items: [
        { name: "Cash & Bank", href: "/dashboard/cash-bank", icon: Landmark },
        { name: "E-Invoicing", href: "/dashboard/e-invoicing", icon: FileCheck2 },
        { name: "Automated Bills", href: "/dashboard/automated-bills", icon: ReceiptText },
        { name: "Expenses", href: "/dashboard/expenses", icon: Calculator },
        { name: "POS Billing", href: "/dashboard/pos-billing", icon: MonitorSmartphone },
      ],
    },
    {
      title: "BUSINESS TOOLS",
      items: [
        { name: "AI Collections", href: "#", icon: Share2 },
        { name: "Staff Attendance & Payroll", href: "/dashboard/staff", icon: UsersRound },
        { name: "Manage Users", href: "/dashboard/manage-users", icon: UserCog },
        { name: "Online Orders", href: "/dashboard/online-orders", icon: Globe },
        { name: "SMS Marketing", href: "/dashboard/sms", icon: MessageSquare },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#141725] text-white flex flex-col h-screen flex-shrink-0 font-sans border-r border-gray-800 relative z-50">

      {/* User Profile Area */}
      <Link href="/dashboard/settings/account" className="p-4 flex items-center gap-3 border-b border-gray-800 hover:bg-white/5 transition-colors cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-300 font-bold text-sm uppercase">
          {businessName.charAt(0)}
        </div>
        <div className="overflow-hidden">
          <div className="font-semibold text-sm truncate">{businessName}</div>
          <div className="text-xs text-gray-400 truncate">{phone}</div>
        </div>
      </Link>

      {/* Primary Action Buttons */}
      <div className="px-4 py-4 space-y-2.5">
        <div className="relative z-50">
          <button
            onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
            className="w-full bg-white text-[#141725] flex items-center justify-between px-4 py-2.5 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-indigo-600 font-bold" />
              <span>Create Sales Invoice</span>
            </div>
            <ChevronDown size={15} className={`text-gray-500 transition-transform duration-200 ${isCreateDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isCreateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-3xs" onClick={() => setIsCreateDropdownOpen(false)}></div>
              <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-150">
                <Link href="/dashboard/invoices/create" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 font-bold border-b border-gray-100 transition-colors">
                  <FileText size={16} className="text-indigo-600" />
                  <span>Sales Invoice</span>
                </Link>
                <Link href="/dashboard/quotations/create" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium border-b border-gray-100 transition-colors">
                  <FileCheck2 size={16} className="text-emerald-600" />
                  <span>Quotation / Estimate</span>
                </Link>
                <Link href="#" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium border-b border-gray-100 transition-colors">
                  <Landmark size={16} className="text-blue-600" />
                  <span>Payment In</span>
                </Link>
                <Link href="/dashboard/purchases" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium transition-colors">
                  <ShoppingBag size={16} className="text-purple-600" />
                  <span>Purchase Invoice</span>
                </Link>
              </div>
            </>
          )}
        </div>

        <button className="w-full bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/30 text-amber-300 flex items-center justify-between px-3.5 py-2.5 rounded-full font-semibold hover:bg-amber-500/25 transition-colors text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Crown size={15} className="text-amber-400" />
            <span className="font-bold tracking-wide">Plans & Pricing</span>
          </div>
          <span className="bg-[#ef4444] text-white text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider shadow-xs">Trial Expired</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-5 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-0.5">
            <h3 className="px-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1.5 mt-1">
              {group.title}
            </h3>

            {group.items.map((item) => {
              const isParentActive = (pathname?.startsWith(item.href) && item.href !== "/dashboard") || (item.name === "Purchases" && (pathname?.startsWith("/dashboard/purchase-return") || pathname?.startsWith("/dashboard/debit-note") || pathname?.startsWith("/dashboard/purchase-orders") || pathname?.startsWith("/dashboard/payment-out"))) || (item.name === "Sales" && (pathname?.startsWith("/dashboard/credit-note") || pathname?.startsWith("/dashboard/delivery-challan") || pathname?.startsWith("/dashboard/proforma-invoice") || pathname?.startsWith("/dashboard/payment-in") || pathname?.startsWith("/dashboard/sales-return") || pathname?.startsWith("/dashboard/quotations"))) ? true : pathname === item.href;
              const isExpanded = expandedMenus[item.name];

              if (!item.hasSubmenu) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isParentActive
                        ? "bg-indigo-600/20 text-indigo-300 font-medium"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={17} className={isParentActive ? "text-indigo-400" : "text-gray-500"} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              }

              // ── submenu parent ──
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isParentActive && !isExpanded
                        ? "bg-indigo-600/20 text-indigo-300 font-medium"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        size={17}
                        className={isParentActive && !isExpanded ? "text-indigo-400" : "text-gray-500"}
                      />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Submenu Items */}
                  {isExpanded && item.subItems && item.subItems.length > 0 && (
                    <div className="mt-0.5 ml-4 border-l border-gray-700/60 pl-2 space-y-0.5 pb-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className={`flex items-center justify-between px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                              isSubActive
                                ? "bg-indigo-600/25 text-indigo-300 font-semibold"
                                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                            }`}
                          >
                            <span>{sub.name}</span>
                            {sub.badge && (
                              <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-blue-500/30">
                                {sub.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname?.startsWith("/dashboard/settings")
              ? "bg-indigo-600/20 text-indigo-300"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings size={17} />
          <span>Settings</span>
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-gray-600 px-3">
          <ShieldCheck size={13} />
          <span>100% Secure • ISO Certified</span>
        </div>
      </div>
    </aside>
  );
}
