"use client";

import { useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

export default function AutomatedBillsProcessor() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    const processBills = async (userId: string) => {
      try {
        const q = query(
          collection(db, "automatedBills"),
          where("userId", "==", userId),
          where("status", "==", "Active")
        );
        const snap = await getDocs(q);

        const today = new Date();
        // Zero out time for comparison
        today.setHours(0, 0, 0, 0);

        let processedCount = 0;

        for (const billDoc of snap.docs) {
          const bill = billDoc.data();
          const nextDateStr = bill.nextInvoiceDate || bill.startDate;
          
          if (!nextDateStr) continue;

          const nextDate = new Date(nextDateStr);
          nextDate.setHours(0, 0, 0, 0);

          if (today.getTime() >= nextDate.getTime()) {
            // Bill is due or overdue!

            // 1. Generate Invoice Number
            let invoiceNumber = "";
            try {
              const invSnap = await getDocs(query(collection(db, "invoices"), where("userId", "==", userId)));
              invoiceNumber = (invSnap.size + 1).toString();
            } catch {
              invoiceNumber = (Math.floor(1000 + Math.random() * 9000)).toString();
            }

            // Calculate due date based on payment terms
            const paymentTerms = Number(bill.paymentTerms || 0);
            const actualDueDate = new Date(nextDate);
            actualDueDate.setDate(actualDueDate.getDate() + paymentTerms);
            const dueDateStr = actualDueDate.toISOString().split("T")[0];

            // Calculate new next invoice date
            const freq = Number(bill.repeatFrequency || 1);
            const unit = bill.repeatUnit || "Days";
            const newNextDate = new Date(nextDate);

            if (unit === "Days") newNextDate.setDate(newNextDate.getDate() + freq);
            else if (unit === "Weeks") newNextDate.setDate(newNextDate.getDate() + (freq * 7));
            else if (unit === "Months") newNextDate.setMonth(newNextDate.getMonth() + freq);

            const newNextDateStr = newNextDate.toISOString().split("T")[0];

            // 2. Prepare Invoice Data
            const invoiceData = {
              userId,
              total: bill.total || 0,
              customerName: bill.customerName || "",
              customerGSTIN: bill.customerGSTIN || "",
              customerPhone: bill.customerPhone || "",
              invoiceNumber,
              date: nextDateStr,
              dueDate: dueDateStr,
              items: bill.items || [],
              subtotal: bill.subtotal || 0,
              discountType: bill.discountType || "flat",
              discountValue: bill.discountValue || 0,
              discountAmount: bill.discountAmount || 0,
              gstEnabled: bill.gstEnabled || false,
              isInterstate: bill.isInterstate || false,
              cgst: bill.cgst || 0,
              sgst: bill.sgst || 0,
              igst: bill.igst || 0,
              status: "pending",
              invoiceType: "invoice",
              amountReceived: 0,
              paymentMode: "Cash",
              createdAt: new Date(),
              shippingAddress: bill.shippingAddress || "",
              notes: bill.notes || "",
              additionalChargeName: bill.additionalChargeName || "",
              additionalChargeValue: bill.additionalChargeValue || 0,
              autoRoundOff: bill.autoRoundOff !== undefined ? bill.autoRoundOff : true,
              roundOffAmount: bill.roundOffAmount || 0,
              selectedBankId: bill.selectedBankId || "",
              selectedQRBankId: bill.selectedQRBankId || "",
              settings: bill.settings || {},
              signatureType: bill.signatureType || "",
              signatureImage: bill.signatureImage || "",
              generatedFromAutomatedBill: billDoc.id
            };

            // 3. Deduct Stock
            if (bill.items && Array.isArray(bill.items)) {
              for (const item of bill.items) {
                if (item.productId) {
                  const pRef = doc(db, "products", item.productId);
                  const pSnap = await getDoc(pRef);
                  if (pSnap.exists()) {
                    const stock = pSnap.data().stock || 0;
                    const newStock = Math.max(0, stock - (Number(item.qty) || 0));
                    await updateDoc(pRef, { stock: newStock });
                  }
                }
              }
            }

            // 4. Create Invoice
            const invoiceRef = await addDoc(collection(db, "invoices"), invoiceData);

            // 4.5. Log SMS Tracker
            try {
              const messageContent = `Dear ${bill.customerName}, your Invoice #${invoiceNumber} for ₹${bill.total || 0} has been generated automatically. Thank you.`;
              await addDoc(collection(db, "smsLogs"), {
                userId,
                automatedBillId: billDoc.id,
                invoiceId: invoiceRef.id,
                invoiceNumber,
                customerName: bill.customerName || "Unknown",
                phoneNumber: bill.customerPhone || "N/A",
                message: messageContent,
                status: "Pending",
                scheduledDate: new Date(),
                createdAt: new Date(),
                type: "Automated Bill SMS"
              });
            } catch (smsErr) {
              console.error("SMS Tracker logging skipped due to failure:", smsErr);
            }

            // 5. Update Automated Bill
            const currentVouchers = Number(bill.vouchersMade || 0);
            await updateDoc(doc(db, "automatedBills", billDoc.id), {
              vouchersMade: currentVouchers + 1,
              previousInvoiceDate: nextDateStr,
              nextInvoiceDate: newNextDateStr,
              updatedAt: new Date()
            });

            processedCount++;
          }
        }

        if (processedCount > 0) {
          toast.success(`${processedCount} Automated Bill(s) successfully generated!`, {
            duration: 5000,
            icon: '🔄'
          });
        }

      } catch (err) {
        console.error("Error processing automated bills:", err);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        hasRun.current = true;
        processBills(user.uid);
      }
    });

    return () => unsub();
  }, []);

  // Invisible component
  return null;
}
