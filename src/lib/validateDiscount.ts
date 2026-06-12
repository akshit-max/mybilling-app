export function validateDiscount(
  items: any[],
  products: any[],
  discountType: string,
  discountValue: number | string,
  finalTotal: number,
  checkCostPrice: boolean = true
): { isValid: boolean; error: string } {
  
  if (finalTotal < 0) {
    return { isValid: false, error: "Total payable amount cannot be negative." };
  }

  if (!checkCostPrice) return { isValid: true, error: "" };

  // Mirror exact math from calcInvoice.ts
  const itemBases = items.map((item) => {
    const rawAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
    let itemDiscountAmt = 0;
    if (item.discountType === "flat") {
      itemDiscountAmt = Number(item.discountValue) || 0;
    } else if (item.discountType === "percent" || item.discountType === undefined || item.discountPct !== undefined) {
      const pct = Number(item.discountValue ?? item.discountPct ?? 0);
      itemDiscountAmt = rawAmount * (pct / 100);
    }
    return Math.max(0, rawAmount - itemDiscountAmt);
  });

  const subtotal = itemBases.reduce((sum, base) => sum + base, 0);
  const invoiceDiscountAmount = discountType === "flat" 
    ? Number(discountValue) || 0 
    : (subtotal * (Number(discountValue) || 0)) / 100;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.productId && Number(item.qty) > 0) {
      const product = products.find((p: any) => p.id === item.productId);
      // INTENTIONAL DEFAULT: 
      // costPrice must default to 0 to preserve backward compatibility.
      // If a product was deleted, is a legacy product missing costPrice, 
      // or comes from imported historical data, blocking it would freeze 
      // the business and prevent editing old invoices. 0 safely skips the check.
      const costPrice = Number(product?.costPrice || 0);

      const itemBase = itemBases[i];
      const discountRatio = subtotal > 0 ? itemBase / subtotal : 0;
      const itemAfterDiscount = itemBase - (invoiceDiscountAmount * discountRatio);
      
      const finalPricePerUnit = itemAfterDiscount / Number(item.qty);

      // Subtracting epsilon to prevent floating point false positives
      if (finalPricePerUnit < costPrice - 0.001) {
        return { 
          isValid: false, 
          error: `Discount applied results in selling '${item.name}' below its purchase price (₹${costPrice}).` 
        };
      }
    }
  }

  return { isValid: true, error: "" };
}
