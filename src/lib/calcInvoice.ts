type Item = {
  name: string;
  qty: number;
  price: number;
  gstRate?: number;
  discountPct?: number;   // legacy: per-item % discount
  discountType?: string;  // 'percent' | 'flat'
  discountValue?: number; // amount for discountType
};

export type DiscountType = "flat" | "percent";

export function calculateInvoice(
  items: Item[],
  discountType: DiscountType,
  discountValue: number,
  gstEnabled: boolean,
  isInterstate: boolean
) {
  // Step 1: Calculate each item's base amount AFTER per-item discount
  const itemBases = items.map((item) => {
    const rawAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
    // Support both old discountPct and new discountType/discountValue fields
    let itemDiscountAmt = 0;
    if ((item as any).discountType === "flat") {
      itemDiscountAmt = Number((item as any).discountValue) || 0;
    } else if ((item as any).discountType === "percent" || (item as any).discountType === undefined || item.discountPct !== undefined) {
      const pct = Number((item as any).discountValue ?? item.discountPct ?? 0);
      itemDiscountAmt = rawAmount * (pct / 100);
    }
    return Math.max(0, rawAmount - itemDiscountAmt);
  });

  // Subtotal = sum of post-item-discount amounts
  const subtotal = itemBases.reduce((sum, base) => sum + base, 0);

  // Step 2: Apply invoice-level discount on top
  const invoiceDiscountAmount =
    discountType === "flat"
      ? Number(discountValue) || 0
      : (subtotal * (Number(discountValue) || 0)) / 100;

  const discountAmount = invoiceDiscountAmount;

  // Step 3: Calculate GST per item (on invoice-discount-adjusted amount)
  let totalGst = 0;

  if (gstEnabled) {
    items.forEach((item, i) => {
      const itemBase = itemBases[i];
      
      // Proportional invoice-level discount applied to this item
      const discountRatio = subtotal > 0 ? itemBase / subtotal : 0;
      const itemInvoiceDiscount = discountAmount * discountRatio;

      const itemAfterDiscount = itemBase - itemInvoiceDiscount;

      // If gstRate is undefined/null → treat as 0% (user hasn't selected a rate)
      const rate = item.gstRate !== undefined && item.gstRate !== null
        ? Number(item.gstRate)
        : 0;

      totalGst += itemAfterDiscount * (rate / 100);
    });
  }

  const afterDiscount = subtotal - discountAmount;

  const cgst = gstEnabled && !isInterstate ? totalGst / 2 : 0;
  const sgst = gstEnabled && !isInterstate ? totalGst / 2 : 0;
  const igst = gstEnabled && isInterstate ? totalGst : 0;

  const total = afterDiscount + totalGst;

  return {
    subtotal,
    discountAmount,
    totalGst,
    cgst,
    sgst,
    igst,
    total,
  };
}

export function getItemBaseAmount(item: Item | any): number {
  const rawAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
  let itemDiscountAmt = 0;
  if (item.discountType === "flat") {
    itemDiscountAmt = Number(item.discountValue) || 0;
  } else if (item.discountType === "percent" || item.discountType === undefined || item.discountPct !== undefined) {
    const pct = Number(item.discountValue ?? item.discountPct ?? 0);
    itemDiscountAmt = rawAmount * (pct / 100);
  }
  return Math.max(0, rawAmount - itemDiscountAmt);
}