"use client";

import React, { useState } from "react";
import { Search, PlayCircle, FileText, Package, Users, Calculator, TrendingUp, ChevronRight, BookOpen, ArrowLeft, X, Mail } from "lucide-react";
import toast from "react-hot-toast";
import SettingsSidebar from "../SettingsSidebar";
import ChatBot from "@/components/ui/ChatBot";

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const categories = [
    {
      id: 1,
      title: "Getting Started",
      articles: 6,
      icon: <PlayCircle className="text-blue-500 w-8 h-8" />,
      color: "bg-blue-50",
      description: "Learn the basics and set up your account"
    },
    {
      id: 2,
      title: "Billing & Invoicing",
      articles: 12,
      icon: <FileText className="text-indigo-500 w-8 h-8" />,
      color: "bg-indigo-50",
      description: "Create and manage invoices and estimates"
    },
    {
      id: 3,
      title: "Inventory Management",
      articles: 8,
      icon: <Package className="text-brand-secondary w-8 h-8" />,
      color: "bg-brand-neutral",
      description: "Track stock, items, and categories"
    },
    {
      id: 4,
      title: "Party Management",
      articles: 5,
      icon: <Users className="text-brand-tertiary w-8 h-8" />,
      color: "bg-green-50",
      description: "Manage customers and suppliers"
    },
    {
      id: 5,
      title: "Accounting",
      articles: 4,
      icon: <Calculator className="text-purple-500 w-8 h-8" />,
      color: "bg-purple-50",
      description: "Reports, ledgers, and financial tracking"
    },
    {
      id: 6,
      title: "Grow your business",
      articles: 3,
      icon: <TrendingUp className="text-rose-500 w-8 h-8" />,
      color: "bg-rose-50",
      description: "Tips and tools for business expansion"
    }
  ];

  const dummyArticles: Record<number, string[]> = {
    1: ["How to create your first invoice", "Setting up your company profile", "Adding your bank details", "Understanding the dashboard", "Inviting your staff", "Verifying your GSTIN"],
    2: ["Creating a Sales Invoice", "Generating an e-Invoice", "Converting Estimates to Invoices", "How to add discounts", "Setting up recurring invoices", "Customizing invoice themes", "Adding shipping charges", "Managing payment terms", "Printing invoices in thermal format", "Sending invoices via WhatsApp", "Voiding an invoice", "Handling partial payments"],
    3: ["Adding a new item", "Bulk uploading items via Excel", "Setting low stock alerts", "Managing item categories", "Understanding stock valuation", "Adjusting inventory manually", "Creating item variations", "Tracking Godowns/Warehouses"],
    4: ["Adding a customer", "Adding a supplier", "Viewing party ledgers", "Sending payment reminders", "Bulk uploading parties"],
    5: ["Understanding Daybook", "Generating Profit & Loss Report", "Balance Sheet overview", "Exporting GSTR reports"],
    6: ["Refer & Earn program", "Upgrading to Premium", "Using the mobile app"]
  };

  const handleAction = (message: string) => {
    toast.success(message);
  };

  const filteredCategories = categories.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dummyArticles[c.id]?.some(article => article.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeCategory = selectedCategory ? categories.find(c => c.id === selectedCategory) : null;
  const activeArticles = selectedCategory ? dummyArticles[selectedCategory] : [];
  
  // Also filter articles if there's a search query while inside a category
  const filteredActiveArticles = activeArticles.filter(a => a.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans relative">
      
      {/* Shared Settings Sidebar */}
      <SettingsSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto w-full">
          {/* HEADER SECTION */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Help and Support</h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Frequently Asked Questions & Guides</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-8 min-h-[500px] flex flex-col">
            
            {/* SEARCH BAR */}
            <div className="max-w-2xl mx-auto mb-8 w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={selectedCategory ? `Search in ${activeCategory?.title}...` : "Search articles, guides, and tutorials..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm bg-gray-50/50"
                />
                {searchQuery && (
                   <button 
                     onClick={() => setSearchQuery("")}
                     className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                   >
                     <X size={16} />
                   </button>
                )}
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1">
              {!selectedCategory ? (
                <>
                  {/* CATEGORY GRID */}
                  {filteredCategories.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 font-medium">No results found for "{searchQuery}"</p>
                      <button onClick={() => setSearchQuery("")} className="text-indigo-600 font-bold mt-2 hover:underline">Clear search</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCategories.map((category) => (
                        <div 
                          key={category.id}
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSearchQuery("");
                          }}
                          className="group border border-gray-100 rounded-xl p-6 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer bg-white relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-white rounded-bl-full -z-10 opacity-50 group-hover:from-indigo-50 transition-colors"></div>
                          
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${category.color}`}>
                              {category.icon}
                            </div>
                            <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              <BookOpen size={12} />
                              <span>{category.articles} articles</span>
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium mb-4">
                            {category.description}
                          </p>
                          
                          <div className="flex items-center text-sm font-bold text-indigo-600 mt-2 opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                            View Articles <ChevronRight size={16} className="ml-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* ARTICLES LIST VIEW */
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <button 
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors mb-6"
                  >
                    <ArrowLeft size={16} /> Back to Categories
                  </button>

                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div className={`p-3 rounded-xl ${activeCategory?.color}`}>
                      {activeCategory?.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{activeCategory?.title}</h2>
                      <p className="text-gray-500 text-sm font-medium mt-1">{activeCategory?.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredActiveArticles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-medium">No articles found matching "{searchQuery}"</div>
                    ) : (
                      filteredActiveArticles.map((article, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleAction(`Opening article: ${article}`)}
                          className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-indigo-200 hover:shadow-sm cursor-pointer transition-all group bg-white"
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">{article}</span>
                          </div>
                          <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER SUPPORT SECTION */}
            <div className="mt-12 bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col md:flex-row items-center justify-between mt-auto">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Still need help?</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Our support team is always ready to assist you with any queries.</p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-3">
                <button 
                  onClick={() => setShowChat(true)}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                >
                  Chat with us
                </button>
                <a 
                  href="mailto:support@billing.com"
                  className="px-5 py-2.5 bg-indigo-600 border border-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition shadow-sm inline-flex items-center gap-2"
                >
                  <Mail size={16} />
                  Contact Support
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showChat && <ChatBot onClose={() => setShowChat(false)} />}
    </div>
  );
}

