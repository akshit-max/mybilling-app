const fs = require('fs');

const path = 'src/app/dashboard/cash-bank/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update BankAccount Type to include status, holderName
content = content.replace(
  `  branchName?: string;\n};`,
  `  branchName?: string;\n  status?: "active" | "inactive";\n  holderName?: string;\n};`
);

// 2. Add New States for Update and Share Modals
content = content.replace(
  `  const [showTransfer, setShowTransfer] = useState(false);`,
  `  const [showTransfer, setShowTransfer] = useState(false);
  const [showUpdateBank, setShowUpdateBank] = useState(false);
  const [showShareBank, setShowShareBank] = useState(false);
  const [updateBankData, setUpdateBankData] = useState<BankAccount | null>(null);`
);

// 3. Add Handlers for Update and Share
content = content.replace(
  `  const handleTransfer = async () => {`,
  `  const handleUpdateBank = async () => {
    if (!updateBankData || !updateBankData.name.trim()) return toast.error("Account Name is required");
    const user = auth.currentUser;
    if (!user) return;
    try {
      const bRef = doc(db, "bankAccounts", updateBankData.id);
      await updateDoc(bRef, {
        name: updateBankData.name,
        accountNumber: updateBankData.accountNumber || "",
        ifsc: updateBankData.ifsc || "",
        bankName: updateBankData.bankName || "",
        branchName: updateBankData.branchName || "",
        holderName: updateBankData.holderName || "",
        status: updateBankData.status || "active",
      });
      toast.success("Bank Details Updated");
      setShowUpdateBank(false);
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to update bank details");
    }
  };

  const handleDeactivateBank = async () => {
    if (!updateBankData) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "bankAccounts", updateBankData.id), { status: "inactive" });
      toast.success("Account Deactivated");
      setShowUpdateBank(false);
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to deactivate account");
    }
  };

  const handleReactivateBank = async (bankId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "bankAccounts", bankId), { status: "active" });
      toast.success("Account Reactivated");
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to reactivate account");
    }
  };

  const handleTransfer = async () => {`
);

// 4. Exclude inactive banks from Adjust & Transfer Modals
content = content.replace(
  `{bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}`,
  `{bankAccounts.filter(b => b.status !== "inactive").map(b => <option key={b.id} value={b.id}>{b.name}</option>)}`
);
content = content.replace(
  `{bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}`,
  `{bankAccounts.filter(b => b.status !== "inactive").map(b => <option key={b.id} value={b.id}>{b.name}</option>)}`
);
content = content.replace(
  `{bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}`,
  `{bankAccounts.filter(b => b.status !== "inactive").map(b => <option key={b.id} value={b.id}>{b.name}</option>)}`
);

// 5. Update Bank Accounts Sidebar (Left Pane) to show Deactivated
content = content.replace(
  `<span className="text-sm font-semibold text-gray-700">{b.name}</span>`,
  `<span className="text-sm font-semibold text-gray-700 flex items-center gap-2">{b.name} {b.status === "inactive" && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Deactivated</span>}</span>`
);
content = content.replace(
  `className={\`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer border-b border-gray-50 border-l-4 \${selectedAccount === b.id ? "border-indigo-600 bg-indigo-50/50" : "border-transparent hover:bg-gray-50"}\`}`,
  `className={\`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer border-b border-gray-50 border-l-4 \${selectedAccount === b.id ? "border-indigo-600 bg-indigo-50/50" : "border-transparent hover:bg-gray-50"} \${b.status === "inactive" ? "opacity-60" : ""}\`}`
);

// 6. Right Pane Toolbar - Update Buttons, and Reactivate Logic
const rightPaneSearch = `{/* Action Toolbar for selected Bank */}
          {selectedAccount !== "cash" && selectedAccount !== "unlinked" && (
            <div className="p-3 border-b border-gray-100 flex justify-end gap-3 bg-gray-50/30">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition">
                <Pencil size={12} /> Update Bank Details
              </button>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition">
                <Share2 size={12} /> Share Bank Details
              </button>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition">
                <Download size={12} /> Download Statement
              </button>
            </div>
          )}`;
const rightPaneReplacement = `{/* Account Details Header for selected Bank */}
          {selectedAccount !== "cash" && selectedAccount !== "unlinked" && (() => {
            const b = bankAccounts.find(x => x.id === selectedAccount);
            if (!b) return null;
            return (
              <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-white">
                <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs">
                  <div className="flex gap-2"><span className="text-gray-500 w-32">Account Holder's Name:</span><span className="font-semibold text-gray-800">{b.holderName || "-"}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500 w-32">Account Name:</span><span className="font-semibold text-gray-800 flex items-center gap-2">{b.name} {b.status === "inactive" && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Deactivated</span>}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500 w-32">Account Number:</span><span className="font-bold text-gray-800">{b.accountNumber || "-"}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500 w-32">IFSC Code:</span><span className="font-semibold text-gray-800 uppercase">{b.ifsc || "-"}</span></div>
                  <div className="flex gap-2 col-span-2"><span className="text-gray-500 w-32">Bank & Branch:</span><span className="font-semibold text-gray-800">{b.bankName || "-"} {b.branchName ? \`, \${b.branchName}\` : ""}</span></div>
                </div>
                <div className="flex flex-col gap-2">
                  {b.status === "inactive" ? (
                    <button onClick={() => handleReactivateBank(b.id)} className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded hover:bg-indigo-100 transition shadow-sm">
                      <Search size={14} /> Reactivate Account
                    </button>
                  ) : (
                    <button onClick={() => { setUpdateBankData(b); setShowUpdateBank(true); }} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition shadow-sm">
                      <Pencil size={12} /> Update Bank Details
                    </button>
                  )}
                  <button onClick={() => { setUpdateBankData(b); setShowShareBank(true); }} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition shadow-sm">
                    <Share2 size={12} /> Share Bank Details
                  </button>
                  <button className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded transition shadow-sm">
                    <Download size={12} /> Download Statement
                  </button>
                </div>
              </div>
            );
          })()}`;
content = content.replace(rightPaneSearch, rightPaneReplacement);

// 7. Modals
const modalsReplacement = `
      {/* Update Bank Modal */}
      {showUpdateBank && updateBankData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUpdateBank(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Update Bank Account</h2>
              <button onClick={() => setShowUpdateBank(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Account Name</label>
                <input type="text" value={updateBankData.name} onChange={e => setUpdateBankData({...updateBankData, name: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Bank Account Number</label>
                <input type="text" value={updateBankData.accountNumber || ""} onChange={e => setUpdateBankData({...updateBankData, accountNumber: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">IFSC Code</label>
                <input type="text" value={updateBankData.ifsc || ""} onChange={e => setUpdateBankData({...updateBankData, ifsc: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold uppercase" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Bank & Branch Name</label>
                <input type="text" value={updateBankData.bankName || ""} onChange={e => setUpdateBankData({...updateBankData, bankName: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Account Holder's Name</label>
                <input type="text" value={updateBankData.holderName || ""} onChange={e => setUpdateBankData({...updateBankData, holderName: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
            </div>
            <div className="flex justify-between items-center p-5 bg-gray-50 border-t border-gray-100">
              <button onClick={handleDeactivateBank} className="text-xs font-bold text-red-500 flex items-center gap-1.5 hover:text-red-700 transition"><Trash2 size={14} /> Deactivate Account</button>
              <button onClick={handleUpdateBank} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition">Edit Bank Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Bank Details Modal */}
      {showShareBank && updateBankData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareBank(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Share Account Details</h2>
              <button onClick={() => setShowShareBank(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Holder Name</p>
                  <p className="text-sm font-semibold text-gray-800">{updateBankData.holderName || updateBankData.name}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(updateBankData.holderName || updateBankData.name); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Number</p>
                  <p className="text-sm font-semibold text-gray-800">{updateBankData.accountNumber || "-"}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(updateBankData.accountNumber || ""); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">IFSC Code</p>
                  <p className="text-sm font-semibold text-gray-800 uppercase">{updateBankData.ifsc || "-"}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(updateBankData.ifsc || ""); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bank & Branch</p>
                  <p className="text-sm font-semibold text-gray-800">{updateBankData.bankName || "-"} {updateBankData.branchName}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(\`\${updateBankData.bankName} \${updateBankData.branchName}\`); toast.success("Copied!")}} className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">COPY</button>
              </div>
            </div>
            <div className="flex gap-3 p-5 justify-end bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowShareBank(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 border rounded-lg transition">Cancel</button>
              <button onClick={() => {
                const text = \`Account Details:\\nHolder: \${updateBankData.holderName || updateBankData.name}\\nA/C No: \${updateBankData.accountNumber}\\nIFSC: \${updateBankData.ifsc}\\nBank: \${updateBankData.bankName}\`;
                if (navigator.share) { navigator.share({ title: 'Bank Details', text }); } else { navigator.clipboard.writeText(text); toast.success("Copied all details to clipboard!"); }
              }} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition">Share Details</button>
            </div>
          </div>
        </div>
      )}
`;
content = content.replace(`{/* MODALS */}`, `{/* MODALS */}\n` + modalsReplacement);

fs.writeFileSync(path, content);
console.log("Updated Cash & Bank page with Update & Share features.");
