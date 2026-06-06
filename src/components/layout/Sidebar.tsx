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
  Building2,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useSession } from "@/context/SessionContext";

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

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  
  const [businessName, setBusinessName] = useState("Loading...");
  const [phone, setPhone] = useState("...");
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [planName, setPlanName] = useState("");

  const { activeProfile, isSuperAdminUser } = useSession();
  const role = activeProfile.role;

  // RBAC Permission Helper
  const isAllowed = (itemName: string) => {
    if (role === "Admin" || role === "Partner") return true;
    if (role === "Salesman") return ["Dashboard", "Parties", "Sales", "Items", "POS Billing"].includes(itemName);
    if (role === "Stock Manager") return ["Dashboard", "Items", "Purchases"].includes(itemName);
    if (role === "CA") return ["Dashboard", "Sales", "Purchases", "Reports", "Expenses", "E-Invoicing"].includes(itemName);
    if (role === "Delivery Boy") return ["Dashboard", "Sales"].includes(itemName);
    return false;
  };

  useEffect(() => {
    let unsubSettings: () => void;
    let unsubUsers: () => void;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubSettings = onSnapshot(doc(db, "settings", user.uid), (snap) => {
          if (snap.exists()) {
            setBusinessName(snap.data().businessName || "self");
            setPhone(snap.data().phone || "...");
          } else {
            setBusinessName("self");
            setPhone("...");
          }
        });

        unsubUsers = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            setIsPaid(snap.data().isPaid || false);
            setPlanName(snap.data().plan || "Free");
          } else {
            setIsPaid(false);
            setPlanName("Free");
          }
        });
      } else {
        setBusinessName("self");
        setPhone("...");
        setIsPaid(false);
        setPlanName("Free");
      }
    });

    return () => {
      unsubAuth();
      if (unsubSettings) unsubSettings();
      if (unsubUsers) unsubUsers();
    };
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
      title: "PLATFORM ADMIN",
      items: [
        {
          name: "Platform Dashboard",
          href: "/dashboard/superadmin",
          icon: ShieldCheck,
        },
        {
          name: "Companies",
          href: "/dashboard/superadmin", // Points to the same dashboard since it's an all-in-one view
          icon: Building2,
        },
        {
          name: "Subscriptions",
          href: "/dashboard/superadmin",
          icon: BadgeCheck,
        },
        {
          name: "Security",
          href: "/dashboard/settings/security",
          icon: Lock,
        }
      ]
    },
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
        // { name: "AI Collections", href: "#", icon: Share2 },
        { name: "Staff Attendance & Payroll", href: "/dashboard/staff", icon: UsersRound },
        { name: "Manage Users", href: "/dashboard/manage-users", icon: UserCog },
        // { name: "Online Orders", href: "/dashboard/online-orders", icon: Globe },
        // { name: "SMS Marketing", href: "/dashboard/sms", icon: MessageSquare },
      ],
    },
  ].filter(group => {
    if (group.title === "PLATFORM ADMIN") return isSuperAdminUser;
    if (pathname?.startsWith("/dashboard/superadmin")) return group.title === "PLATFORM ADMIN";
    return true;
  }).map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (group.title === "PLATFORM ADMIN") return true;
      return isAllowed(item.name);
    })
  })).filter(group => group.items.length > 0);

  return (
    <aside className={`${collapsed ? "w-20" : "w-64"} bg-brand-primary text-white flex flex-col h-screen flex-shrink-0 font-sans border-r border-white/5 relative z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(31,41,55,0.15)]`}>

      {/* User Profile Area */}
      <Link href="/dashboard/settings/account" className={`p-4 flex items-center ${collapsed ? "justify-center" : "gap-3"} border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer`}>
        <div className="w-10 h-10 rounded-full bg-brand-secondary/20 flex items-center justify-center text-brand-secondary font-bold text-sm uppercase shrink-0">
          {businessName.charAt(0)}
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-semibold text-sm truncate">{businessName}</div>
            <div className="text-xs text-gray-400 truncate">{phone}</div>
          </div>
        )}
      </Link>

      {/* Primary Action Buttons */}
      <div className={`px-4 py-4 space-y-2.5 ${collapsed ? "px-2" : ""}`}>
        <div className="relative z-50">
          <button
            onClick={() => router.push('/dashboard/invoices/create')}
            className={`w-full bg-white text-brand-primary flex items-center ${collapsed ? "justify-center" : "justify-center gap-2"} px-4 py-2.5 rounded-xl font-bold hover:bg-brand-neutral transition-colors text-sm shadow-sm`}
            title="Create Sales Invoice"
          >
              <Plus size={16} className="text-brand-secondary font-extrabold shrink-0" />
              {!collapsed && <span>Create Sales Invoice</span>}
          </button>
        </div>

        {(() => {
          let planColors = "from-amber-500/20 via-amber-400/20 to-amber-500/5 border-amber-500/40 hover:from-amber-500/30 hover:to-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]";
          let iconColor = "text-amber-400";
          let textColor = "text-amber-300";

          if (isPaid) {
            if (planName === "Diamond") {
              planColors = "from-orange-500/20 via-orange-400/20 to-orange-500/5 border-orange-500/40 hover:from-orange-500/30 hover:to-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]";
              iconColor = "text-orange-400";
              textColor = "text-orange-300";
            } else if (planName === "Platinum") {
              planColors = "from-indigo-500/20 via-indigo-400/20 to-indigo-500/5 border-indigo-500/40 hover:from-indigo-500/30 hover:to-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]";
              iconColor = "text-indigo-400";
              textColor = "text-indigo-300";
            } else if (planName === "Enterprise") {
              planColors = "from-emerald-500/20 via-emerald-400/20 to-emerald-500/5 border-emerald-500/40 hover:from-emerald-500/30 hover:to-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]";
              iconColor = "text-emerald-400";
              textColor = "text-emerald-300";
            } else {
              planColors = "from-emerald-500/20 via-emerald-400/20 to-emerald-500/5 border-emerald-500/40 hover:from-emerald-500/30 hover:to-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]";
              iconColor = "text-emerald-400";
              textColor = "text-emerald-300";
            }
          }

          return !collapsed && (
            <Link 
              href="/dashboard/settings/pricing"
              className={`w-full bg-gradient-to-r ${planColors} border flex items-center justify-between px-3.5 py-2.5 rounded-full font-bold transition-all text-xs relative overflow-hidden group block`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              <div className="flex items-center gap-2 relative z-10">
                <Crown size={15} className={`${iconColor} shrink-0 drop-shadow-md`} />
                <span className={`font-bold tracking-wide uppercase text-[11px] ${textColor}`}>{isPaid ? `${planName} Plan` : "Premium Plans"}</span>
              </div>
              {!isPaid && <span className="bg-[#ef4444] text-white text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider shadow-sm relative z-10 border border-red-500/50">Upgrade</span>}
            </Link>
          );
        })()}
      </div>

      {/* Navigation Links */}
      <div className={`flex-1 overflow-y-auto ${collapsed ? "px-1" : "px-2"} py-1 space-y-5 scrollbar-none [&::-webkit-scrollbar]:hidden`}>
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-0.5">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1.5 mt-1">
                {group.title}
              </h3>
            )}

            {group.items.map((item) => {
              const isParentActive = (pathname?.startsWith(item.href) && item.href !== "/dashboard") || (item.name === "Purchases" && (pathname?.startsWith("/dashboard/purchase-return") || pathname?.startsWith("/dashboard/debit-note") || pathname?.startsWith("/dashboard/purchase-orders") || pathname?.startsWith("/dashboard/payment-out"))) || (item.name === "Sales" && (pathname?.startsWith("/dashboard/credit-note") || pathname?.startsWith("/dashboard/delivery-challan") || pathname?.startsWith("/dashboard/proforma-invoice") || pathname?.startsWith("/dashboard/payment-in") || pathname?.startsWith("/dashboard/sales-return") || pathname?.startsWith("/dashboard/quotations"))) ? true : pathname === item.href;
              const isExpanded = expandedMenus[item.name];

              if (!item.hasSubmenu) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isParentActive
                        ? "bg-brand-secondary text-white font-bold shadow-md shadow-brand-secondary/20"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={`${isParentActive ? "text-white" : "text-white/50"} shrink-0`} />
                      {!collapsed && <span>{item.name}</span>}
                    </div>
                  </Link>
                );
              }

              // ── submenu parent ──
              return (
                <div key={item.name}>
                  <button
                    onClick={() => {
                      if (collapsed) setCollapsed?.(false);
                      toggleMenu(item.name);
                    }}
                    className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isParentActive && !isExpanded
                        ? "bg-brand-secondary text-white font-bold shadow-md shadow-brand-secondary/20"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        size={18}
                        className={`${isParentActive && !isExpanded ? "text-white" : "text-white/50"} shrink-0`}
                      />
                      {!collapsed && <span>{item.name}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown
                        size={14}
                        className={`text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {/* Submenu Items */}
                  {!collapsed && isExpanded && item.subItems && item.subItems.length > 0 && (
                    <div className="mt-0.5 ml-4 border-l border-gray-700/60 pl-2 space-y-0.5 pb-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className={`flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all ${
                              isSubActive
                                ? "bg-white/10 text-white font-bold"
                                : "text-white/50 hover:text-white hover:bg-white/5"
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
      <div className={`p-4 border-t border-gray-800 ${collapsed ? "flex flex-col items-center justify-center space-y-3" : "space-y-3"}`}>
        {(role === "Admin" || role === "Partner") && (
          <Link
            href="/dashboard/settings"
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-xl text-sm transition-all ${
              pathname?.startsWith("/dashboard/settings")
                ? "bg-brand-secondary text-white font-bold shadow-md shadow-brand-secondary/20"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings size={17} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        )}
        {!collapsed && (
          <div className="flex items-center gap-2 text-[11px] text-gray-600 px-3">
            <ShieldCheck size={13} />
            <span>100% Secure • ISO Certified</span>
          </div>
        )}
      </div>
    </aside>
  );
}
