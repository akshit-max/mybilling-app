"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, Share2, MoreVertical, Building2, Receipt, Calendar, CreditCard, AlignLeft, Tags } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";

type ExpenseItem = {
  id: string;
  name: string;
  hsn: string;
  quantity: number;
  rate: number;
  discountRate: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
};

export default function ExpenseDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<any>(null);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const docRef = doc(db, "expenses", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setExpense({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error("Expense not found");
          router.push("/dashboard/expenses");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading expense details");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchExpense();
    });

    return () => unsubscribe();
  }, [id, router]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-sans">Loading expense details...</div>;
  }

  if (!expense) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-12">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/expenses" className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-gray-800">Expense #{expense.expenseNumber}</h1>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 uppercase">
            Recorded
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-2 text-gray-500 hover:text-indigo-600 border border-gray-200 rounded bg-white shadow-sm transition-colors"
            onClick={() => window.print()}
          >
            <Printer size={16} />
          </button>
          <button className="p-2 text-gray-500 hover:text-indigo-600 border border-gray-200 rounded bg-white shadow-sm transition-colors">
            <Download size={16} />
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 transition-colors shadow-sm">
            <Share2 size={14} />
            Share
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button 
            className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-5 py-1.5 rounded hover:bg-gray-50 transition-colors shadow-sm"
            onClick={() => router.push(`/dashboard/expenses/edit/${id}`)}
          >
            Edit
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </header>

      {/* PRINTABLE DOCUMENT AREA */}
      <main id="print-area" className="flex-1 w-full max-w-5xl mx-auto p-6 mt-6 print:p-0 print:m-0 print:max-w-full">
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden print:border-none print:shadow-none">
          
          {/* Header Banner */}
          <div className="bg-indigo-600 px-8 py-6 flex items-center justify-between text-white print:bg-white print:text-gray-900 print:border-b print:border-gray-200">
            <div>
              <h2 className="text-2xl font-black tracking-tight">EXPENSE VOUCHER</h2>
              <p className="text-indigo-200 text-sm font-medium print:text-gray-500">#{expense.expenseNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-mono font-bold">₹ {expense.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider print:text-gray-500">Total Amount</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100 print:bg-white print:border-none print:p-0">
              
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{expense.date}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Tags size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Category</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{expense.category || "-"}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <CreditCard size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Payment Mode</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{expense.paymentMode || "-"}</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Building2 size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Party / Vendor</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{expense.partyName || "-"}</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Receipt size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Original Invoice</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{expense.originalInvoiceNumber || "-"}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">GST Included</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{expense.withGst ? "Yes" : "No"}</span>
              </div>

            </div>

            {/* Notes Section */}
            {expense.notes && (
              <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-5">
                <div className="flex items-center gap-1.5 text-orange-800 mb-2">
                  <AlignLeft size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Notes / Description</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
              </div>
            )}

            {/* Itemized Table (If any) */}
            {expense.items && expense.items.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Line Items</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">NO</th>
                        <th className="px-4 py-3">ITEMS</th>
                        <th className="px-4 py-3">HSN</th>
                        <th className="px-4 py-3 text-center">QTY</th>
                        <th className="px-4 py-3 text-right">PRICE/ITEM</th>
                        <th className="px-4 py-3 text-right">DISCOUNT</th>
                        <th className="px-4 py-3 text-right">TAX</th>
                        <th className="px-4 py-3 text-right">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {expense.items.map((item: ExpenseItem, index: number) => (
                        <tr key={item.id || index}>
                          <td className="px-4 py-3 text-center text-gray-500 font-semibold">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                          <td className="px-4 py-3 text-gray-600">{item.hsn || "-"}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-600">₹ {(item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {(item.discountAmount || 0) > 0 ? (
                              <div className="flex flex-col items-end">
                                <span>₹ {item.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                <span className="text-[9px] text-gray-400">({item.discountRate}%)</span>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {(item.taxAmount || 0) > 0 ? (
                              <div className="flex flex-col items-end">
                                <span>₹ {item.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                <span className="text-[9px] text-gray-400">({item.taxRate}%)</span>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            ₹ {(item.amount || (item.quantity * item.rate)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Totals Summary */}
                  <div className="bg-gray-50 p-4 flex flex-col items-end gap-2 border-t border-gray-200">
                    <div className="flex justify-between w-64 text-xs">
                      <span className="text-gray-500 font-semibold uppercase">Sub Total</span>
                      <span className="font-mono font-bold text-gray-800">
                        ₹ {(expense.subTotal || expense.items.reduce((s:number, i:ExpenseItem) => s + (i.quantity*i.rate), 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {(expense.totalTax || 0) > 0 && (
                      <div className="flex justify-between w-64 text-xs">
                        <span className="text-gray-500 font-semibold uppercase">Total Tax</span>
                        <span className="font-mono font-bold text-gray-800">
                          ₹ {expense.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between w-64 text-sm mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-800 font-bold uppercase">Grand Total</span>
                      <span className="font-mono font-black text-indigo-700">
                        ₹ {expense.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </main>
    </div>
  );
}
