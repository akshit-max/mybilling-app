import React, { useState } from "react";
import { X, Send, User } from "lucide-react";

interface ChatBotProps {
  onClose: () => void;
}

export default function ChatBot({ onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Hi, welcome to Cloud Ledger Support!", isBot: true },
    { text: "How would you like us to help you today?", isBot: true }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, isBot: false }]);
    const userText = input.toLowerCase();
    setInput("");
    
    setTimeout(() => {
      let botResponse = "Thanks for reaching out! Our agents are currently assisting other users. Please leave your email and we'll get back to you shortly.";
      
      // Dummy Knowledge Base Logic
      if (userText.includes("invoice") || userText.includes("bill")) {
        botResponse = "To create an invoice, navigate to 'Sales' > 'Sales Invoices' on the left menu and click the '+ Create Sales Invoice' button. You can also use the quick create button at the top left of the sidebar!";
      } else if (userText.includes("party") || userText.includes("customer")) {
        botResponse = "You can manage all your customers and suppliers in the 'Parties' section. Here you can track 'To Collect' and 'To Pay' balances, view ledgers, and bulk upload your contacts via Excel.";
      } else if (userText.includes("report")) {
        botResponse = "We have over 30+ detailed business reports available! Go to the 'Reports' module to find GSTR-1, Balance Sheet, Profit & Loss, Partywise Outstanding, and more. You can export them to Excel or print them instantly.";
      } else if (userText.includes("price") || userText.includes("plan") || userText.includes("cost")) {
        botResponse = "We offer a Free plan for basic invoicing, and Premium plans starting at ₹1299/year which include e-Invoicing, Staff Payroll, and priority support. Check the 'Plans & Pricing' button in the sidebar!";
      } else if (userText.includes("stock") || userText.includes("item") || userText.includes("inventory")) {
        botResponse = "Manage your inventory in the 'Items' module. You can track low stock levels, setup Godowns, create variations, and adjust stock directly from there.";
      } else if (userText.includes("desktop") || userText.includes("app")) {
        botResponse = "We have a blazing fast native Desktop App available! Click the Monitor icon at the top right of your screen to download it and experience perfect offline syncing.";
      }

      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
    }, 800);
  };

  const handleOptionClick = (option: string) => {
    setMessages(prev => [...prev, { text: option, isBot: false }]);
    setTimeout(() => {
      let botResponse = "Transferring you now... (This is a dummy action)";
      if (option === "Website Features Overview") {
        botResponse = "Cloud Ledger handles Invoicing, Inventory, Party Ledgers, GSTR Reports, and Staff Attendance. Type 'invoice', 'party', 'report', or 'inventory' to learn more!";
      } else if (option === "Plans & Pricing") {
         botResponse = "We offer free and premium tiers. Premium gives you Staff Access, E-invoicing, and more! Ask me about 'pricing' for details.";
      }
      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
    }, 800);
  };

  return (
    <div className="fixed bottom-4 right-4 w-[340px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden font-sans">
      
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-secondary rounded-full flex items-center justify-center text-[10px] font-bold">
            <User size={12} className="text-white" />
          </div>
          <span className="font-semibold text-sm">Cloud Ledger AI Support</span>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[350px] max-h-[450px] overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col max-w-[85%] ${msg.isBot ? "self-start" : "self-end"}`}>
            <div className={`p-2.5 rounded-lg text-xs leading-relaxed shadow-xs ${
              msg.isBot 
                ? "bg-white text-gray-700 border border-gray-100 rounded-tl-none" 
                : "bg-indigo-600 text-white rounded-tr-none"
            }`}>
              {msg.text}
            </div>
            {msg.isBot && idx === 1 && (
              <div className="mt-2 text-[10px] text-gray-500 font-semibold mb-1">
                Suggested Topics
              </div>
            )}
            {msg.isBot && idx === 1 && (
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => handleOptionClick("Website Features Overview")}
                  className="border border-indigo-200 text-indigo-700 text-[11px] font-semibold px-2.5 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  Features Overview
                </button>
                <button 
                  onClick={() => handleOptionClick("Plans & Pricing")}
                  className="border border-indigo-200 text-indigo-700 text-[11px] font-semibold px-2.5 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  Plans & Pricing
                </button>
                <button 
                  onClick={() => handleOptionClick("Chat with an agent")}
                  className="border border-gray-300 text-gray-700 text-[11px] font-semibold px-2.5 py-1.5 rounded bg-white hover:bg-gray-50 transition-colors"
                >
                  Talk to a Human
                </button>
              </div>
            )}
            <span className="text-[9px] text-gray-400 mt-1 self-start ml-1">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        ))}
      </div>

      {/* Footer / Input */}
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything about the app..."
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-400"
          />
          <button 
            onClick={handleSend}
            className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-md shadow-sm"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

    </div>
  );
}
