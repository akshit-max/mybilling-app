"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Star, FileText, Share2, Search, ChevronUp } from "lucide-react";

export default function ReportsPage() {
  const filterChips = ["Party", "Category", "Payment Collection", "Item", "Invoice Details", "Summary"];

  const reportSections = [
    {
      title: "Favourite",
      icon: <Star size={16} className="text-gray-400" />,
      items: [
        { name: "Balance Sheet", isFav: true },
        { name: "GSTR-1 (Sales)", isFav: true },
        { name: "Profit And Loss Report", isFav: true },
        { name: "Sales Summary", isFav: true },
      ]
    },
    {
      title: "GST",
      icon: <span className="text-xs font-bold bg-gray-200 px-1 rounded text-gray-600">GST</span>,
      items: [
        { name: "GSTR-2 (Purchase)", isFav: false },
        { name: "GSTR-3B", isFav: false },
        { name: "GST Purchase (With HSN)", isFav: false },
        { name: "GST Sales (With HSN)", isFav: false },
        { name: "HSN Wise Sales Summary", isFav: false },
        { name: "TDS Payable", isFav: false },
        { name: "TDS Receivable", isFav: false },
        { name: "TCS Payable", isFav: false },
        { name: "TCS Receivable", isFav: false },
      ],
      showMore: true
    },
    {
      title: "Transaction",
      icon: <FileText size={16} className="text-gray-400" />,
      items: [
        { name: "Audit Trail", isFav: false },
        { name: "Bill Wise Profit", isFav: false },
        { name: "Cash and Bank Report (All Payments)", isFav: false },
        { name: "Daybook", isFav: false },
        { name: "Expense Category Report", isFav: false },
        { name: "Expense Transaction Report", isFav: false },
        { name: "Purchase Summary", isFav: false },
      ],
      showMore: true
    },
    {
      title: "Item",
      icon: <div className="w-4 h-4 border border-gray-400 rounded-sm" />,
      items: [
        { name: "Item Report By Party", isFav: false },
        { name: "Item Sales and Purchase Summary", isFav: false },
        { name: "Low Stock Summary", isFav: false },
        { name: "Rate List", isFav: false },
        { name: "Stock Detail Report", isFav: false },
        { name: "Stock Summary", isFav: false },
      ],
      showMore: true
    },
    {
      title: "Party",
      icon: <UsersIcon />,
      items: [
        { name: "Receivable Ageing Report", isFav: false },
        { name: "Party Report By Item", isFav: false },
        { name: "Party Statement (Ledger)", isFav: false },
        { name: "Party Wise Outstanding", isFav: false },
        { name: "Sales Summary - Category Wise", isFav: false },
      ],
      showMore: true
    },
    {
      title: "", // Empty for layout spacing if needed
      icon: null,
      items: []
    }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20 relative min-h-[80vh]">
      <PageHeader 
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
            <Share2 size={16} />
            CA Reports Sharing
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <span className="text-gray-500 font-medium">Filter By</span>
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button key={chip} className="px-4 py-1.5 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 transition-colors">
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          
          {/* Top Row */}
          {reportSections.slice(0, 3).map((section, idx) => (
            <div key={idx} className="p-6">
              <div className="flex items-center gap-2 mb-4 text-gray-500 font-medium border-b border-gray-100 pb-3">
                {section.icon}
                {section.title}
              </div>
              <ul className="space-y-4">
                {section.items.map((item, i) => (
                  <li key={i} className="flex justify-between items-center text-sm text-gray-700 hover:text-indigo-600 cursor-pointer">
                    {item.name}
                    {item.isFav && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                  </li>
                ))}
              </ul>
              {section.showMore && (
                <button className="mt-4 text-blue-500 text-sm flex items-center gap-1 hover:underline">
                  See less <ChevronUp size={14} />
                </button>
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
                  <div className="flex items-center gap-2 mb-4 text-gray-500 font-medium border-b border-gray-100 pb-3">
                    {section.icon}
                    {section.title}
                  </div>
                  <ul className="space-y-4">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex justify-between items-center text-sm text-gray-700 hover:text-indigo-600 cursor-pointer">
                        {item.name}
                      </li>
                    ))}
                  </ul>
                  {section.showMore && (
                    <button className="mt-4 text-blue-500 text-sm flex items-center gap-1 hover:underline">
                      See less <ChevronUp size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Floating Find Action */}
      <div className="fixed bottom-6 right-8 text-gray-400 text-xs flex items-center gap-2">
        Find Report <kbd className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">Ctrl + F</kbd>
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
