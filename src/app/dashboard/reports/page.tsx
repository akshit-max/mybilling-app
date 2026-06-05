"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Star, FileText, Share2, Search, ChevronUp } from "lucide-react";

export default function ReportsPage() {
  const filterChips = ["All", "Party", "Category", "Payment", "Item", "Summary"];
  const [activeFilter, setActiveFilter] = React.useState("All");
  const [searchQuery, setSearchQuery] = React.useState("");

  const allReportSections = [
    {
      title: "Favourite",
      icon: <Star size={16} className="text-gray-400" />,
      items: [
        { name: "GSTR-1 (Sales)", isFav: true, tags: ["Summary"] },
        { name: "Sales Summary", isFav: true, tags: ["Summary"] },
        { name: "Item Report By Party", isFav: true, tags: ["Item", "Party"] },
      ]
    },
    {
      title: "GST",
      icon: <span className="text-xs font-bold bg-gray-200 px-1 rounded text-gray-600">GST</span>,
      items: [
        { name: "GSTR-1 (Sales)", isFav: false, tags: ["Summary"] },
        { name: "GSTR-2 (Purchase)", isFav: false, tags: ["Summary"] },
      ],
      showMore: false
    },
    {
      title: "Transaction",
      icon: <FileText size={16} className="text-gray-400" />,
      items: [
        { name: "Sales Summary", isFav: false, tags: ["Summary"] },
        { name: "Bill Wise Profit", isFav: false, tags: ["Summary"] },
        { name: "Daybook", isFav: false, tags: ["Summary"] },
        { name: "Expense Transaction Report", isFav: false, tags: ["Summary", "Expense"] },
        { name: "Expense Category Report", isFav: false, tags: ["Category", "Expense"] },
      ],
      showMore: false
    },
    {
      title: "Item / Inventory",
      icon: <div className="w-4 h-4 border border-gray-400 rounded-sm" />,
      items: [
        { name: "Item Sales Summary", isFav: false, tags: ["Item", "Summary"] },
        { name: "Item Report By Party", isFav: false, tags: ["Item", "Party"] },
        { name: "Low Stock Summary", isFav: false, tags: ["Item", "Summary"] },
        { name: "Rate List", isFav: false, tags: ["Item"] },
        { name: "Stock Summary", isFav: false, tags: ["Item", "Summary"] },
      ],
      showMore: false
    },
    {
      title: "Party",
      icon: <UsersIcon />,
      items: [
        { name: "Party Wise Outstanding", isFav: false, tags: ["Party", "Payment"] },
        { name: "Ageing Report", isFav: false, tags: ["Party", "Payment"] },
      ],
      showMore: false
    },
    {
      title: "", // Empty for layout spacing if needed
      icon: null,
      items: []
    }
  ];

  // Apply search and filter
  const reportSections = allReportSections.map(section => {
    return {
      ...section,
      items: section.items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === "All" || item.tags.includes(activeFilter);
        return matchesSearch && matchesFilter;
      })
    };
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 relative min-h-[80vh]">
      <PageHeader 
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm">
            <Share2 size={16} />
            CA Reports Sharing
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 px-6 md:px-0">
        <div className="flex items-center gap-4 text-sm overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <span className="text-gray-500 font-semibold whitespace-nowrap">Filter By:</span>
          <div className="flex flex-wrap gap-2">
            {filterChips.map((chip) => (
              <button 
                key={chip} 
                onClick={() => setActiveFilter(chip)}
                className={`px-4 py-1.5 border rounded-full transition-colors text-xs font-semibold ${
                  activeFilter === chip 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input 
            type="text" 
            placeholder="Search reports..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mx-6 md:mx-0">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          
          {/* Top Row */}
          {reportSections.slice(0, 3).map((section, idx) => (
            <div key={idx} className="p-6">
              <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold border-b border-gray-100 pb-3">
                {section.icon}
                {section.title}
              </div>
              {section.items.length === 0 ? (
                <div className="text-xs text-gray-400 italic py-2">No reports matching criteria</div>
              ) : (
                <ul className="space-y-3.5">
                  {section.items.map((item, i) => {
                    const slugMap: Record<string, string> = {
                      "GSTR-1 (Sales)": "gstr-1",
                      "GSTR-2 (Purchase)": "gstr-2",
                      "Party Wise Outstanding": "party-outstanding",
                      "Receivable Ageing Report": "ageing-report",
                      "Ageing Report": "ageing-report",
                      "Item Report By Party": "item-report-by-party",
                      "Sales Summary": "sales-summary",
                      "Bill Wise Profit": "bill-wise-profit",
                      "Daybook": "daybook",
                      "Expense Transaction Report": "expense-transaction-report",
                      "Expense Category Report": "expense-category-report",
                      "Item Sales Summary": "item-sales-summary",
                      "Low Stock Summary": "low-stock-summary",
                      "Rate List": "rate-list",
                      "Stock Summary": "stock-summary",
                    };
                    const slug = slugMap[item.name] || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    const href = `/dashboard/reports/${slug}`;
                    return (
                      <li key={i} className="flex justify-between items-center text-[13px] font-semibold text-gray-600 hover:text-indigo-600 cursor-pointer transition-colors group">
                        <Link href={href} className="flex-1 group-hover:underline">
                          {item.name}
                        </Link>
                        {item.isFav && <Star size={14} className="text-amber-400 fill-amber-400" />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 border-t border-gray-200">
          
          {/* Bottom Row */}
          {reportSections.slice(3, 6).map((section, idx) => (
            <div key={idx} className="p-6">
              {section.title && (
                <>
                  <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold border-b border-gray-100 pb-3">
                    {section.icon}
                    {section.title}
                  </div>
                  {section.items.length === 0 ? (
                    <div className="text-xs text-gray-400 italic py-2">No reports matching criteria</div>
                  ) : (
                    <ul className="space-y-3.5">
                      {section.items.map((item, i) => {
                        const slugMap: Record<string, string> = {
                          "GSTR-1 (Sales)": "gstr-1",
                          "GSTR-2 (Purchase)": "gstr-2",
                          "Party Wise Outstanding": "party-outstanding",
                          "Receivable Ageing Report": "ageing-report",
                          "Ageing Report": "ageing-report",
                          "Item Report By Party": "item-report-by-party",
                          "Sales Summary": "sales-summary",
                          "Bill Wise Profit": "bill-wise-profit",
                          "Daybook": "daybook",
                          "Expense Transaction Report": "expense-transaction-report",
                          "Expense Category Report": "expense-category-report",
                          "Item Sales Summary": "item-sales-summary",
                          "Low Stock Summary": "low-stock-summary",
                          "Rate List": "rate-list",
                          "Stock Summary": "stock-summary",
                        };
                        const slug = slugMap[item.name] || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        const href = `/dashboard/reports/${slug}`;
                        return (
                          <li key={i} className="flex justify-between items-center text-[13px] font-semibold text-gray-600 hover:text-indigo-600 cursor-pointer transition-colors group">
                            <Link href={href} className="flex-1 group-hover:underline">
                              {item.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
