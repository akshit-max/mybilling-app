import React, { useState } from "react";
import { X, Send, User } from "lucide-react";

interface ChatBotProps {
  onClose: () => void;
}

export default function ChatBot({ onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Hi, welcome to myBillBook Support!", isBot: true },
    { text: "How would you like us to help you today?", isBot: true }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, isBot: false }]);
    setInput("");
    
    // Dummy response
    setTimeout(() => {
      setMessages(prev => [...prev, { text: "Thanks for reaching out! Our agents are currently assisting other users. Please leave your email and we'll get back to you shortly.", isBot: true }]);
    }, 1000);
  };

  const handleOptionClick = (option: string) => {
    setMessages([...messages, { text: option, isBot: false }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { text: "Transferring you now... (This is a dummy action)", isBot: true }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden font-sans">
      
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold">
            <User size={12} className="text-white" />
          </div>
          <span className="font-semibold text-sm">myBillBook Support</span>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
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
                Options
              </div>
            )}
            {msg.isBot && idx === 1 && (
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => handleOptionClick("Chat with an agent")}
                  className="border border-gray-800 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded bg-white hover:bg-gray-100 transition-colors"
                >
                  Chat with an agent
                </button>
                <button 
                  onClick={() => handleOptionClick("Need help over a call")}
                  className="border border-gray-800 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded bg-white hover:bg-gray-100 transition-colors"
                >
                  Need help over a call
                </button>
              </div>
            )}
            <span className="text-[9px] text-gray-400 mt-1 self-start ml-1">5:11 pm, May 17</span>
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
            placeholder="Type here"
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button 
            onClick={handleSend}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

    </div>
  );
}
