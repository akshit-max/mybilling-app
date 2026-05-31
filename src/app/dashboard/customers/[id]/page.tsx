"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, User, Download, Printer, Share2, Search, ChevronDown, Landmark, ShieldCheck, Mail, Phone, MapPin, Pencil } from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  total: number;
  status: "paid" | "pending" | "credit";
  invoiceType?: string;
  createdAt: any;
  items: any[];
  paymentMode?: string;
  balanceAmount?: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
  type?: string;
  category?: string;
  openingBalance?: number;
  openingBalanceType?: "collect" | "pay";
  creditPeriod?: number;
  creditLimit?: number;
  contactPersonName?: string;
  contactPersonDob?: string;
  panNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  sameAsBilling?: boolean;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountHolderName?: string;
  } | null;
};

export default function CustomerDetailsPage() {
  const { id } = useParams() as { id: string };

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transactions" | "profile" | "ledger" | "items">("transactions");

  // Stats
  const [totalSales, setTotalSales] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [lastPurchaseDate, setLastPurchaseDate] = useState<Date | null>(null);

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionTimeFilter, setTransactionTimeFilter] = useState("365");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");

  const exportToExcel = () => {
    if (invoices.length === 0) return toast.error("No transactions to export");
    const headers = ["Date", "Voucher Type", "Payment Mode", "Debit (Sales)", "Credit (Received)", "Balance"];
    
    const rows: string[][] = [];
    
    // Opening balance row
    if (customer?.openingBalance) {
      const obDebit = customer.openingBalanceType === "collect" ? customer.openingBalance : 0;
      const obCredit = customer.openingBalanceType === "pay" ? customer.openingBalance : 0;
      const obBal = customer.openingBalanceType === "collect" ? customer.openingBalance : -customer.openingBalance;
      rows.push(["-", "Opening Balance", "-", obDebit.toString(), obCredit.toString(), obBal.toString()]);
    }

    invoices.forEach(inv => {
      const dateStr = inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString("en-IN") : new Date(inv.createdAt || 0).toLocaleDateString("en-IN");
      const vType = inv.invoiceType === "estimate" ? "Estimate" : `Sales Invoice #${inv.invoiceNumber}`;
      const isPaid = inv.status === "paid";
      const debit = inv.total;
      const credit = isPaid ? inv.total : 0;
      const bal = isPaid ? 0 : inv.total;
      rows.push([dateStr, vType, inv.paymentMode || "Cash", debit.toString(), credit.toString(), bal.toString()]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${customer?.name}_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger downloaded successfully! 📊");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Customer Doc
        const customerRef = doc(db, "customers", id);
        const customerSnap = await getDoc(customerRef);

        if (!customerSnap.exists() || customerSnap.data().userId !== user.uid) {
          toast.error("Customer not found");
          setLoading(false);
          return;
        }

        const data = customerSnap.data();
        const customerData: Customer = {
          id: customerSnap.id,
          name: data.name || data.partyName || "",
          phone: data.phone || data.mobile || data.mobileNumber || "",
          email: data.email || "",
          gstin: data.gstin || "",
          address: data.billingAddress || data.address || "",
          state: data.state || "",
          type: data.type || "Customer",
          category: data.category || "-",
          openingBalance: Number(data.openingBalance || 0),
          openingBalanceType: data.openingBalanceType || "collect",
          creditPeriod: Number(data.creditPeriod || 30),
          creditLimit: Number(data.creditLimit || 0),
          contactPersonName: data.contactPersonName || "",
          contactPersonDob: data.contactPersonDob || "",
          panNumber: data.panNumber || "",
          billingAddress: data.billingAddress || data.address || "",
          shippingAddress: data.shippingAddress || "",
          sameAsBilling: data.sameAsBilling !== undefined ? data.sameAsBilling : true,
          bankDetails: data.bankDetails || null,
        };

        setCustomer(customerData);

        // 2. Fetch Invoices and match name
        const iq = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid)
        );

        const isnap = await getDocs(iq);
        const fetchedInvoices: Invoice[] = isnap.docs
          .map((docSnap) => {
            const docData = docSnap.data();
            const totalVal = Number(docData.total || 0);
            const receivedVal = typeof docData.amountReceived === "number"
              ? docData.amountReceived
              : (docData.status === "paid" ? totalVal : 0);
            const balAmount = Math.max(0, totalVal - receivedVal);
            return {
              id: docSnap.id,
              invoiceNumber: docData.invoiceNumber || "N/A",
              total: totalVal,
              status: docData.status || "pending",
              invoiceType: docData.invoiceType || "invoice",
              createdAt: docData.createdAt,
              items: docData.items || [],
              paymentMode: docData.paymentMode || "Cash",
              balanceAmount: balAmount,
              partyName: docData.partyName || docData.customerName || "",
            };
          })
          // Filter matching customer name safely
          .filter((inv: any) => inv.partyName.toLowerCase() === customerData.name.toLowerCase()) as Invoice[];

        // Sort invoices by date descending
        fetchedInvoices.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setAllInvoices(fetchedInvoices);
      } catch (err) {
        console.error("Failed to load customer details:", err);
        toast.error("Failed to load customer details");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [id]);

  // Derived state filters
  useEffect(() => {
    let filtered = allInvoices;

    if (fromDate) {
      filtered = filtered.filter((inv) => {
        const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || 0);
        return d >= new Date(fromDate);
      });
    }

    if (toDate) {
      filtered = filtered.filter((inv) => {
        const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        return d <= end;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter((inv) => 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply transactionTimeFilter logic for the Transactions tab (independent of Ledger fromDate/toDate)
    if (activeTab === "transactions") {
       if (transactionTimeFilter !== "all") {
         const days = parseInt(transactionTimeFilter);
         const cutoff = new Date();
         cutoff.setDate(cutoff.getDate() - days);
         filtered = filtered.filter(inv => {
           const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || 0);
           return d >= cutoff;
         });
       }
       if (transactionTypeFilter !== "all") {
         filtered = filtered.filter(inv => inv.invoiceType === transactionTypeFilter || (transactionTypeFilter === "invoice" && !inv.invoiceType));
       }
    }

    setInvoices(filtered);

    let tSales = 0;
    let pAmount = 0;
    let count = 0;
    let lastDate: Date | null = null;

    filtered.forEach((inv) => {
      if (inv.invoiceType === "estimate") return;
      tSales += inv.total;
      count += 1;
      pAmount += inv.balanceAmount || 0;
      
      if (inv.createdAt) {
        const invDate = inv.createdAt.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt);
        if (!lastDate || invDate > lastDate) lastDate = invDate;
      }
    });

    setTotalSales(tSales);
    setPendingAmount(pAmount);
    setTotalInvoicesCount(count);
    setLastPurchaseDate(lastDate);
  }, [allInvoices, fromDate, toDate, searchTerm, transactionTimeFilter, transactionTypeFilter, activeTab]);

  // Print PDF Export
  const handleExportPDF = () => {
    if (!customer) return;
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20 text-gray-500">
        <p className="animate-pulse text-xs">Loading customer dashboard...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-sm">Customer not found.</p>
        <Link href="/dashboard/customers" className="text-indigo-600 hover:underline text-xs mt-2">
          Back to all parties
        </Link>
      </div>
    );
  }

  const paidAmount = totalSales - pendingAmount;

  return (
    <div id="print-area" className="min-h-screen bg-gray-50/50 pb-16 font-sans print:bg-white print:pb-0">
      
      {/* Top sticky header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm ">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customers" className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-800">{customer.name}</h1>
            <p className="text-[10px] text-gray-400 capitalize">{customer.type || "Customer"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href={`/dashboard/customers/edit/${customer.id}`} 
            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded hover:bg-gray-50 font-semibold"
          >
            <Pencil size={13} className="text-indigo-600" />
            <span>Edit</span>
          </Link>
          <Link 
            href="/dashboard/invoices/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
          >
            <span>Create Sales Invoice</span>
          </Link>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-6 z-0 relative">
        {(["transactions", "profile", "ledger", "items"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-semibold capitalize border-b-2 transition-all -mb-px ${
              activeTab === tab 
                ? "border-indigo-600 text-indigo-600 font-bold" 
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab === "transactions" ? "Transactions" : tab === "profile" ? "Profile" : tab === "ledger" ? "Ledger (Statement)" : "Item Wise Report"}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-6">

        {/* Tab Content: Transactions */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            
            {/* Toolbar Filter */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs w-48 focus:outline-none focus:border-indigo-500 bg-white placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <select
                    value={transactionTimeFilter}
                    onChange={(e) => setTransactionTimeFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs text-gray-500 font-semibold bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer shadow-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Time</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="365">Last 365 Days</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={transactionTypeFilter}
                    onChange={(e) => setTransactionTypeFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs text-gray-500 font-semibold bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer shadow-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Transactions</option>
                    <option value="invoice">Sales Invoices</option>
                    <option value="estimate">Estimates</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Transaction Type</th>
                    <th className="px-4 py-2.5 font-semibold">Transaction Number</th>
                    <th className="px-4 py-2.5 font-semibold">Amount</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">
                        No transactions found matching filters.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const dateStr = inv.createdAt?.toDate
                        ? inv.createdAt.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : inv.createdAt
                          ? new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "N/A";
                      
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 font-mono">{dateStr}</td>
                          <td className="px-4 py-3 font-semibold text-gray-700 capitalize">
                            {inv.invoiceType === "estimate" ? "Estimate / Quotation" : "Sales Invoice"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 font-mono">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 font-semibold font-mono text-gray-900">₹ {inv.total.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3">
                            {inv.status === "paid" ? (
                              <span className="bg-green-50 text-green-700 border border-green-100 text-[9px] px-2 py-0.5 rounded font-bold uppercase">Paid</span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] px-2 py-0.5 rounded font-bold uppercase">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/dashboard/invoices/${inv.id}`} className="text-indigo-600 hover:underline font-semibold">View</Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab Content: Profile Details */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* General Info Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">General Details</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Party Name</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{customer.name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Party Type</p>
                  <p className="font-semibold text-indigo-600 mt-0.5">{customer.type || "Customer"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Mobile Number</p>
                  <p className="font-semibold text-gray-800 mt-0.5 font-mono">{customer.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Party Category</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{customer.category || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">Email Address</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{customer.email || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Opening Balance</p>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    ₹ {customer.openingBalance || 0} ({customer.openingBalanceType === "collect" ? "To Collect" : "To Pay"})
                  </p>
                </div>
              </div>
            </div>

            {/* Business & Address Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Business Details</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">GSTIN</p>
                  <p className="font-semibold text-gray-800 mt-0.5 font-mono">{customer.gstin || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-400">PAN Number</p>
                  <p className="font-semibold text-gray-800 mt-0.5 font-mono">{customer.panNumber || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">Billing Address</p>
                  <p className="font-medium text-gray-700 mt-1 whitespace-pre-wrap">{customer.billingAddress || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">Shipping Address</p>
                  <p className="font-medium text-gray-700 mt-1 whitespace-pre-wrap">
                    {customer.sameAsBilling ? "Same as Billing address" : (customer.shippingAddress || "-")}
                  </p>
                </div>
              </div>
            </div>

            {/* Credit Controls */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Credit Details</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Credit Period</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{customer.creditPeriod || 30} Days</p>
                </div>
                <div>
                  <p className="text-gray-400">Credit Limit</p>
                  <p className="font-semibold text-gray-800 mt-0.5">₹ {customer.creditLimit || 0}</p>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Party Bank Details</h2>
              {customer.bankDetails ? (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400">Account Holder Name</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{customer.bankDetails.accountHolderName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Bank Name</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{customer.bankDetails.bankName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Bank Account Number</p>
                    <p className="font-semibold text-gray-800 mt-0.5 font-mono">{customer.bankDetails.accountNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">IFSC Code</p>
                    <p className="font-semibold text-gray-800 mt-0.5 font-mono">{customer.bankDetails.ifscCode || "-"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No bank account details linked to this party.</p>
              )}
            </div>

          </div>
        )}

        {/* Tab Content: Ledger (Statement) */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            
            {/* Statement Summary Cards Row */}
            <div className="grid grid-cols-4 gap-4">
              
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-4 shadow-sm h-20 flex flex-col justify-between">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Receivable</p>
                <p className="text-xl font-bold text-indigo-700">₹ {pendingAmount.toLocaleString("en-IN")}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm h-20 flex flex-col justify-between">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Overdue Amount</p>
                <p className="text-xl font-bold text-amber-700">₹ {pendingAmount.toLocaleString("en-IN")}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm h-20 flex flex-col justify-between">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Sales Amount</p>
                <p className="text-xl font-bold text-gray-800">₹ {totalSales.toLocaleString("en-IN")}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm h-20 flex flex-col justify-between">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Received</p>
                <p className="text-xl font-bold text-green-700">₹ {paidAmount.toLocaleString("en-IN")}</p>
              </div>

            </div>

            {/* Date Filters Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 border rounded text-xs text-gray-600 outline-none focus:border-indigo-500"
                  title="From Date"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 border rounded text-xs text-gray-600 outline-none focus:border-indigo-500"
                  title="To Date"
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 bg-white px-3 py-1.5 rounded hover:bg-indigo-50 font-semibold transition-colors"
                >
                  <Printer size={13} />
                  <span>Print PDF</span>
                </button>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 bg-white px-3 py-1.5 rounded hover:bg-indigo-50 font-semibold transition-colors"
                >
                  <Download size={13} />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>

            {/* Ledger statement list */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Voucher</th>
                    <th className="px-4 py-2.5 font-semibold">Payment Mode</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Debit (Sales)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Credit (Received)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Opening Balance Row */}
                  <tr className="bg-gray-50/20 font-medium text-gray-500">
                    <td className="px-4 py-2.5 font-mono">-</td>
                    <td className="px-4 py-2.5">Opening Balance</td>
                    <td className="px-4 py-2.5">-</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {customer.openingBalanceType === "collect" ? `₹ ${(customer.openingBalance || 0).toLocaleString("en-IN")}` : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {customer.openingBalanceType === "pay" ? `₹ ${(customer.openingBalance || 0).toLocaleString("en-IN")}` : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ₹ {((customer.openingBalanceType === "collect" ? 1 : -1) * (customer.openingBalance || 0)).toLocaleString("en-IN")}
                    </td>
                  </tr>

                  {invoices.map((inv) => {
                    const dateStr = inv.createdAt?.toDate
                      ? inv.createdAt.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : inv.createdAt
                        ? new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "N/A";
                    
                    const isPaid = inv.status === "paid";
                    const debit = inv.total;
                    const credit = isPaid ? inv.total : 0;
                    const remainingBalance = isPaid ? 0 : inv.total;

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-mono">{dateStr}</td>
                        <td className="px-4 py-3 text-gray-800">
                          {inv.invoiceType === "estimate" ? "Estimate" : `Sales Invoice #${inv.invoiceNumber}`}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{inv.paymentMode || "Cash"}</td>
                        <td className="px-4 py-3 text-right font-semibold font-mono text-gray-800">₹ {debit.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right font-semibold font-mono text-green-600">
                          {credit > 0 ? `₹ ${credit.toLocaleString("en-IN")}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold font-mono text-amber-700">₹ {remainingBalance.toLocaleString("en-IN")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab Content: Item Wise Report */}
        {activeTab === "items" && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {(() => {
              const itemSalesMap = new Map();
              allInvoices.forEach(inv => {
                if (inv.invoiceType === "estimate") return;
                inv.items?.forEach(item => {
                   if (!itemSalesMap.has(item.name)) {
                      itemSalesMap.set(item.name, { qty: 0, amount: 0, count: 0 });
                   }
                   const curr = itemSalesMap.get(item.name);
                   curr.qty += Number(item.qty) || 0;
                   curr.amount += (Number(item.qty) || 0) * (Number(item.price || item.rate) || 0);
                   curr.count += 1;
                });
              });
              const itemSales = Array.from(itemSalesMap.entries()).map(([name, data]) => ({ name, ...data }));

              if (itemSales.length === 0) {
                return (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-xs">No item wise purchase records found for this party.</p>
                  </div>
                );
              }

              return (
                <table className="w-full text-left text-xs text-gray-600 border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-2.5 font-semibold">Item Name</th>
                      <th className="px-4 py-2.5 font-semibold text-center">Invoices count</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Total Quantity Sold</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemSales.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                        <td className="px-4 py-3 text-center text-gray-500 font-mono">{item.count}</td>
                        <td className="px-4 py-3 text-right text-gray-800 font-mono">{item.qty.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right font-semibold font-mono text-indigo-700">₹ {item.amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}

      </div>

    </div>
  );
}
