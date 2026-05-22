const fs = require('fs');

const path = 'src/app/dashboard/cash-bank/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const tableHeaderSearch = `<th className="p-4 text-right">Balance</th>`;
const tableHeaderReplacement = `<th className="p-4 text-right">Balance</th>\n                    <th className="p-4 text-center">Actions</th>`;

const tableRowSearch = `<td className="p-4 text-right font-mono font-bold text-gray-800">₹{txn.balanceAfter}</td>`;
const tableRowReplacement = `<td className="p-4 text-right font-mono font-bold text-gray-800">₹{txn.balanceAfter}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setEditData({ id: txn.id, date: txn.date, remarks: txn.remarks || "" }); setShowEdit(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" title="Edit Remarks/Date"><Pencil size={14} /></button>
                          <button onClick={() => { setPrintTxn(txn); setShowPrint(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Print Receipt"><Download size={14} /></button>
                          <button onClick={() => handleDeleteTransaction(txn)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>`;

// Add new state variables at the beginning of the component
const stateVarsSearch = `  const [transferData, setTransferData] = useState({`;
const stateVarsReplacement = `  const [showEdit, setShowEdit] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printTxn, setPrintTxn] = useState<Transaction | null>(null);
  const [editData, setEditData] = useState({ id: "", date: "", remarks: "" });
  
  const [transferData, setTransferData] = useState({`;

const handlersSearch = `  // Filtering transactions for the selected pane`;
const handlersReplacement = `  const handleDeleteTransaction = async (txn: Transaction) => {
    if (!confirm("Are you sure you want to delete this transaction? This will revert the account balances.")) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      if (txn.type === "add") {
        await updateAccountBalance(txn.accountId, -txn.received, user.uid);
      } else if (txn.type === "reduce") {
        await updateAccountBalance(txn.accountId, txn.paid, user.uid);
      } else if (txn.type === "transfer") {
        if (txn.paid > 0) { // Source (Reduce) record
           await updateAccountBalance(txn.accountId, txn.paid, user.uid);
           if (txn.relatedAccountId) await updateAccountBalance(txn.relatedAccountId, -txn.paid, user.uid);
        } else { // Destination (Add) record
           await updateAccountBalance(txn.accountId, -txn.received, user.uid);
           if (txn.relatedAccountId) await updateAccountBalance(txn.relatedAccountId, txn.received, user.uid);
        }
      }
      await deleteDoc(doc(db, "cashBankTransactions", txn.id));
      toast.success("Transaction deleted & balance reverted");
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to delete transaction");
    }
  };

  const handleEditSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "cashBankTransactions", editData.id), {
        date: editData.date,
        remarks: editData.remarks
      });
      toast.success("Transaction updated");
      setShowEdit(false);
      fetchData(user.uid);
    } catch (err) {
      toast.error("Failed to update transaction");
    }
  };

  // Filtering transactions for the selected pane`;

const modalsSearch = `    </div>
  );
}`;
const modalsReplacement = `
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEdit(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Edit Transaction</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remarks</label>
                <textarea value={editData.remarks} onChange={e => setEditData({...editData, remarks: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold" rows={3}></textarea>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded border transition">Cancel</button>
              <button onClick={handleEditSave} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {showPrint && printTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPrint(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
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
      )}

    </div>
  );
}`;

content = content.replace(tableHeaderSearch, tableHeaderReplacement);
content = content.replace(tableRowSearch, tableRowReplacement);
content = content.replace(stateVarsSearch, stateVarsReplacement);
content = content.replace(handlersSearch, handlersReplacement);
content = content.replace(modalsSearch, modalsReplacement);

fs.writeFileSync(path, content);
console.log("Successfully added edit and print actions");
