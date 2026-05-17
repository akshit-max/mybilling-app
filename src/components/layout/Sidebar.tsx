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

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Auto-expand menus based on active path
  useEffect(() => {
    const expansions: Record<string, boolean> = {};
    if (pathname?.startsWith("/dashboard/customers")) expansions["Parties"] = true;
    if (pathname?.startsWith("/dashboard/products")) expansions["Items"] = true;
    if (pathname?.startsWith("/dashboard/invoices")) expansions["Sales"] = true;
    if (pathname?.startsWith("/dashboard/purchases")) expansions["Purchases"] = true;
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
            { name: "Shared Ledger", href: "#", badge: "New" },
          ],
        },
        {
          name: "Items",
          href: "/dashboard/products",
          icon: Package,
          hasSubmenu: true,
          subItems: [
            { name: "Inventory", href: "/dashboard/products" },
            { name: "Godown (Warehouse)", href: "#" },
          ],
        },
        {
          name: "Sales",
          href: "/dashboard/invoices",
          icon: ShoppingCart,
          hasSubmenu: true,
          subItems: [
            { name: "Sales Invoices", href: "/dashboard/invoices" },
            { name: "Quotation / Estimate", href: "#" },
            { name: "Payment In", href: "#" },
            { name: "Sales Return", href: "#" },
            { name: "Credit Note", href: "#" },
            { name: "Delivery Challan", href: "#" },
            { name: "Proforma Invoice", href: "#" },
          ],
        },
        {
          name: "Purchases",
          href: "/dashboard/purchases",
          icon: ShoppingBag,
          hasSubmenu: true,
          subItems: [
            { name: "Purchase Invoices", href: "/dashboard/purchases" },
            { name: "Payment Out", href: "#" },
            { name: "Purchase Return", href: "#" },
            { name: "Debit Note", href: "#" },
            { name: "Purchase Orders", href: "#" },
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
    <aside className="w-64 bg-[#141725] text-white flex flex-col h-screen flex-shrink-0 font-sans border-r border-gray-800">

      {/* User Profile Area */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-800">
        <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-300 font-bold text-sm">
          S
        </div>
        <div>
          <div className="font-semibold text-sm">self</div>
          <div className="text-xs text-gray-400">7505371139</div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="px-4 py-4 space-y-2.5">
        <Link
          href="/dashboard/invoices/create"
          className="w-full bg-white text-[#141725] flex items-center justify-between px-4 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            <Plus size={15} />
            <span>Create Sales Invoice</span>
          </div>
          <ChevronDown size={14} className="text-gray-500" />
        </Link>

        <button className="w-full bg-gradient-to-r from-orange-500/20 to-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-between px-4 py-2 rounded-full font-semibold hover:bg-orange-500/20 transition-colors text-sm">
          <div className="flex items-center gap-2">
            <Crown size={15} />
            <span>Buy Premium Plan</span>
          </div>
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">0 Days Left</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-5 scrollbar-thin scrollbar-thumb-gray-800">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-0.5">
            <h3 className="px-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1.5 mt-1">
              {group.title}
            </h3>

            {group.items.map((item) => {
              const isParentActive = pathname?.startsWith(item.href) && item.href !== "/dashboard" 
                ? true 
                : pathname === item.href;
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
