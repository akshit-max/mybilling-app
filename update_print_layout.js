const fs = require('fs');

const path = 'src/app/dashboard/cash-bank/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const printSearch = `{showPrint && printTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPrint(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" id="print-area">
            <div className="p-8 text-center border-b border-gray-100">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-800">Transaction Receipt</h2>
              <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">{printTxn.txnNo}</p>
            </div>
            <div className="p-8 space-y-4 bg-gray-50/50">
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-bold text-gray-500">Date</span>
                <span className="text-sm font-bold text-gray-800">{new Date(printTxn.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-bold text-gray-500">Type</span>
                <span className="text-sm font-bold text-gray-800 capitalize">{printTxn.type}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-bold text-gray-500">Amount</span>
                <span className="text-sm font-black text-indigo-600">₹ {Math.max(printTxn.paid, printTxn.received).toLocaleString("en-IN")}</span>
              </div>
              {printTxn.remarks && (
                <div className="pt-2">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Remarks</span>
                  <p className="text-sm font-semibold text-gray-700">{printTxn.remarks}</p>
                </div>
              )}
            </div>
            <div className="p-5 flex gap-3 justify-end bg-white">
              <button onClick={() => setShowPrint(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded border transition">Close</button>
              <button onClick={() => window.print()} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition flex items-center gap-2"><Download size={14} /> Print Receipt</button>
            </div>
          </div>
        </div>
      )}`;

const printReplace = `{showPrint && printTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:static print:inset-auto print:bg-transparent print:flex-col print:justify-start">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm print:hidden" onClick={() => setShowPrint(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 print:shadow-none print:max-w-none print:w-[800px] print:mx-auto print:rounded-none" id="print-area">
            
            {/* Professional Receipt Header */}
            <div className="p-8 border-b border-gray-200 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">PAYMENT RECEIPT</h1>
                  <p className="text-sm text-gray-500 font-semibold mt-1">Transaction Ref: <span className="text-gray-800">{printTxn.txnNo}</span></p>
                </div>
                <div className="text-right">
                  <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center ml-auto mb-2 text-indigo-600 print:border print:border-gray-200 print:bg-white">
                    <Landmark size={24} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                  <p className="text-sm font-bold text-gray-800">{new Date(printTxn.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-8 bg-white print:bg-white space-y-6">
              
              <div className="grid grid-cols-2 gap-8 border-b border-gray-100 pb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Received From / Party</p>
                  <p className="text-base font-bold text-gray-800">{printTxn.party || "Walk-in / Cash"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Mode & Account</p>
                  <p className="text-base font-bold text-gray-800 capitalize">{printTxn.mode} <span className="text-sm font-semibold text-gray-500">({printTxn.accountId === "cash" ? "Cash" : bankAccounts.find(b => b.id === printTxn.accountId)?.name || "Bank"})</span></p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 print:border-gray-200 print:bg-white">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Transaction Type</p>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-gray-800 capitalize">{printTxn.type}</p>
                  <p className="text-2xl font-black text-indigo-600">₹ {Math.max(printTxn.paid, printTxn.received).toLocaleString("en-IN")}</p>
                </div>
              </div>

              {printTxn.remarks && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remarks / Notes</p>
                  <p className="text-sm font-semibold text-gray-700 leading-relaxed italic border-l-2 border-gray-200 pl-3">{printTxn.remarks}</p>
                </div>
              )}
            </div>

            {/* Signature Area for Print */}
            <div className="hidden print:flex justify-between items-end p-8 mt-12">
              <div className="text-center">
                <div className="w-48 border-t border-gray-400 mb-2"></div>
                <p className="text-xs font-bold text-gray-500 uppercase">Customer Signature</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-t border-gray-400 mb-2"></div>
                <p className="text-xs font-bold text-gray-500 uppercase">Authorized Signatory</p>
              </div>
            </div>

            {/* Action Buttons (Hidden in Print) */}
            <div className="p-5 flex gap-3 justify-end bg-gray-50 border-t border-gray-100 print:hidden">
              <button onClick={() => setShowPrint(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg border transition">Close</button>
              <button onClick={() => window.print()} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-2"><Download size={14} /> Print Document</button>
            </div>

          </div>
        </div>
      )}`;

content = content.replace(printSearch, printReplace);

fs.writeFileSync(path, content);
console.log("Updated print modal to a professional layout.");
