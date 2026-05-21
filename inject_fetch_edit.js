const fs = require('fs');
const path = "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\sales-return\\edit\\[id]\\page.tsx";

let content = fs.readFileSync(path, "utf-8");

// Change Save Invoice to Update Return
content = content.replace(/Save Invoice/g, "Update Return");
content = content.replace(/Create Sales Return/g, "Edit Sales Return");

// Change save logic
content = content.replace(/await addDoc\(collection\(db, "salesReturns"\), invoiceData\);/g, 'await updateDoc(doc(db, "salesReturns", id), invoiceData);');
content = content.replace(/toast.success\("Sales Invoice created successfully! ✅"\);/g, 'toast.success("Sales Return updated successfully! ✅");');

// Add fetch logic at the end of the existing fetch data useEffect
const fetchLogic = `
        // Fetch existing Sales Return for edit
        if (id) {
          try {
            const docRef = doc(db, "salesReturns", id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const data = snap.data();
              setCustomerName(data.customerName || "");
              setSalesReturnNumber(data.salesReturnNumber || "");
              setSalesReturnDate(data.date || new Date().toISOString().split("T")[0]);
              setDueDate(data.dueDate || "");
              if (data.items && data.items.length) {
                setItems(data.items);
              }
              setShippingAddress(data.shippingAddress || "");
              if (data.notes) {
                setNotes(data.notes);
                setShowNotes(true);
              }
              setDiscountType(data.discountType || "flat");
              if (data.discountValue) {
                setDiscountValue(data.discountValue);
                setShowDiscountInput(true);
              }
              setAdditionalChargeName(data.additionalChargeName || "Transport Charges");
              setAdditionalChargeValue(data.additionalChargeValue || 0);
              
              setLinkedInvoiceNumber(data.linkedInvoiceNumber || "");
              setPoNumber(data.poNumber || "");
              setVehicleNumber(data.vehicleNumber || "");
              setLicNumber(data.licNumber || "");
              setPaymentTerms(data.paymentTerms || "30");
              setAmountReceived(data.amountReceived || 0);
              setPaymentMode(data.paymentMode || "Cash");
              setStatus(data.status || "paid");
              setInvoiceType(data.invoiceType || "invoice");
              setAutoRoundOff(data.autoRoundOff !== false);
            } else {
              toast.error("Sales Return not found!");
            }
          } catch (e) {
            console.error("Failed to load Sales Return for edit", e);
          }
        }
`;

// Insert after "const fromQuoteId = params.get("fromQuote");" logic
// Actually, it's safer to just inject it at the beginning of fetchData
content = content.replace(/const fetchData = async \(\) => {[\s\S]*?const user = auth\.currentUser;[\s\S]*?if \(!user\) return;/m, `const fetchData = async () => {\n      const user = auth.currentUser;\n      if (!user) return;\n      ${fetchLogic}`);

fs.writeFileSync(path, content, "utf-8");
console.log("Done inject fetch edit");
