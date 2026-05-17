"use client";

import React from "react";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, ChevronDown, FileText } from "lucide-react";

export default function PurchasesPage() {
  const dummyPurchases: any[] = [];

  const purchaseColumns = [
    { header: "DATE", accessorKey: "date" },
    { header: "PURCHASE INVOICE NUMBER", accessorKey: "invoiceNumber" },
    { header: "PARTY NAME", accessorKey: "partyName" },
    { header: "DUE IN", accessorKey: "dueIn" },
    { header: "AMOUNT", accessorKey: "amount" },
    { header: "STATUS", accessorKey: "status" },
  ];

  return (
    <div className="space-y-0 max-w-full mx-auto pb-10 font-sans">

      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Purchase Invoices</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-blue-600 border border-blue-200 px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-50 transition-colors">
            <FileText size={16} /> Reports <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pt-5">
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-4 flex flex-col justify-center h-24">
          <div className="flex items-center gap-2 text-indigo-500 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span className="text-sm font-medium">Total Purchases</span>
          </div>
          <div className="text-2xl font-semibold text-gray-800">₹ 0</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col justify-center h-24">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span className="text-sm font-medium">Paid</span>
          </div>
          <div className="text-2xl font-semibold text-gray-800">₹ 0</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col justify-center h-24">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span className="text-sm font-medium">Unpaid</span>
          </div>
          <div className="text-2xl font-semibold text-gray-800">₹ 0</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-200 rounded-lg mx-6 mt-5 flex flex-col min-h-[500px] shadow-sm">

        {/* Toolbar */}
        <div className="p-3 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-4 py-1.5 border border-gray-300 rounded text-sm w-48 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button className="flex items-center gap-2 border border-gray-300 bg-white px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-50">
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Last 365 Days
              </span>
              <ChevronDown size={14} />
            </button>
          </div>

          <button className="bg-indigo-600 text-white px-5 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 transition-colors">
            Create Purchase Invoice
          </button>
        </div>

        {/* Table / Empty State */}
        <div className="flex-1 flex flex-col">
          <DataTable
            columns={purchaseColumns}
            data={dummyPurchases}
            keyExtractor={(row) => row.id}
            emptyState={
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <EmptyState
                  title="No Transactions Matching the current filter"
                  icon={
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      <line x1="3" y1="3" x2="21" y2="21"/>
                    </svg>
                  }
                />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
