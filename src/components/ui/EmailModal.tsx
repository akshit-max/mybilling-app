"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type EmailModalProps = {
  onClose: () => void;
  customerName: string;
  documentType: string; // e.g. "Invoice", "Quotation", "Delivery Challan"
  documentNumber: string;
  totalAmount: number;
  companyName: string;
  defaultEmail?: string;
};

export default function EmailModal({
  onClose,
  customerName,
  documentType,
  documentNumber,
  totalAmount,
  companyName,
  defaultEmail = "",
}: EmailModalProps) {
  const [to, setTo] = useState(defaultEmail);
  const [subject, setSubject] = useState(`${documentType} #${documentNumber} from ${companyName || "us"}`);
  const [sending, setSending] = useState(false);
  const [customFiles, setCustomFiles] = useState<{name: string, content: string}[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        if (base64String) {
          setCustomFiles(prev => [...prev, { name: file.name, content: base64String }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeCustomFile = (index: number) => {
    setCustomFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const trimmedTo = to.trim();
    if (!trimmedTo) {
      toast.error("Please enter a recipient email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedTo)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!subject.trim()) {
      toast.error("Email subject cannot be empty");
      return;
    }

    try {
      setSending(true);

      let attachments: any[] = [];
      const printNode = document.querySelector(".print-only-container") as HTMLElement;

      if (!printNode) {
        setSending(false);
        toast.error("Cannot send email: the printable document was not found on this page. Please open the document view page first.");
        return;
      }

      try {
        const originalDisplay = printNode.style.display;
        printNode.style.display = "block";
        const canvas = await html2canvas(printNode, { scale: 2 });
        printNode.style.display = originalDisplay;

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

        const filename = `${documentType.replace(/\s+/g, "_")}_${documentNumber}.pdf`;
        const base64String = pdf.output("datauristring").split(",")[1];

        attachments.push({ filename, content: base64String });
      } catch (pdfErr) {
        console.error("Failed to generate PDF attachment:", pdfErr);
        toast.error("Failed to generate PDF attachment. Email not sent.");
        setSending(false);
        return;
      }

      // Add user's custom attached files
      if (customFiles.length > 0) {
        attachments = [...attachments, ...customFiles];
      }

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1f2937;">${documentType} #${documentNumber}</h2>
          <p style="color: #6b7280;">Dear Customer,</p>
          <p style="color: #6b7280;">Please find details of your ${documentType.toLowerCase()} below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #f9fafb;">
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Description</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">Details</th>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${documentType} Number</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${documentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Customer</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Total Amount</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">₹${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Thank you for your business with <strong>${companyName || "us"}</strong>.</p>
        </div>
      `;

      // GUARD: block send if 0 attachments
      if (attachments.length === 0) {
        setSending(false);
        toast.error("No PDF attachment generated. Email not sent.");
        return;
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: trimmedTo,
          subject: subject.trim(),
          html: htmlBody,
          attachments,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Email send failed");
      }

      toast.success(`${documentType} emailed successfully to ${trimmedTo} ✅`);
      onClose();
    } catch (err: any) {
      console.error("Email send error:", err);
      toast.error(err.message || "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <svg className="text-indigo-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <h2 className="text-sm font-bold text-gray-800">Email {documentType}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. customer@gmail.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-[10px] text-indigo-700 leading-relaxed">
            📄 {documentType} <strong>#{documentNumber}</strong> · Customer: <strong>{customerName}</strong> · Total: <strong>₹{totalAmount.toFixed(2)}</strong>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
              <span>Attach Additional Files</span>
              <span className="text-gray-400 text-[9px] lowercase font-normal">(Optional)</span>
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition cursor-pointer"
            />
            {customFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {customFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-150 px-2 py-1.5 rounded text-xs">
                    <span className="truncate text-gray-600 max-w-[250px] font-medium" title={file.name}>{file.name}</span>
                    <button onClick={() => removeCustomFile(idx)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {sending ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Sending...
              </>
            ) : (
              <>Send Email</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
