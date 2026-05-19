import React from "react";
import { X } from "lucide-react";

interface ShortcutsPanelProps {
  onClose: () => void;
}

export default function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  const createShortcuts = [
    { label: "Sales Invoice", key: "S" },
    { label: "POS Billing", key: "B" },
    { label: "Purchase Invoice", key: "P" },
    { label: "Payment In", key: "I" },
    { label: "Payment Out", key: "O" },
    { label: "Sales Return", key: "C" },
    { label: "Purchase Return", key: "R" },
    { label: "Quotation", key: "Q" },
    { label: "Expense", key: "F" },
    { label: "Party", key: "Y" },
    { label: "Item", key: "M" },
  ];

  const supportShortcuts = [
    { label: "Chat Support", key: "H" },
  ];

  return (
    <div className="fixed top-[56px] bottom-0 right-0 w-80 bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] border-l border-gray-200 z-40 flex flex-col font-sans transition-transform transform translate-x-0">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-white">
        <div>
          <h2 className="font-bold text-gray-800 text-sm">Keyboard shortcuts</h2>
          <p className="text-xs text-gray-500 mt-1">Press <span className="font-bold">Alt</span> to open or close the shortcuts panel</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        
        {/* Create Section */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider">Create</h3>
          <div className="flex flex-col">
            {createShortcuts.map((shortcut, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-gray-600">{shortcut.label}</span>
                <div className="flex items-center gap-1.5">
                  <kbd className="min-w-[24px] h-[24px] px-1.5 flex items-center justify-center text-[10px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded">Alt</kbd>
                  <kbd className="min-w-[24px] h-[24px] px-1.5 flex items-center justify-center text-[10px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded">{shortcut.key}</kbd>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Support Section */}
        <div>
          <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider">Customer Support</h3>
          <div className="flex flex-col">
            {supportShortcuts.map((shortcut, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-gray-600">{shortcut.label}</span>
                <div className="flex items-center gap-1.5">
                  <kbd className="min-w-[24px] h-[24px] px-1.5 flex items-center justify-center text-[10px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded">Alt</kbd>
                  <kbd className="min-w-[24px] h-[24px] px-1.5 flex items-center justify-center text-[10px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded">{shortcut.key}</kbd>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
