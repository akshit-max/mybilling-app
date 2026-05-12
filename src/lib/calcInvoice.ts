type Item = {
  name: string;
  qty: number;
  price: number;
  gstRate?: number;
};

export type DiscountType = "flat" | "percent";
// export function calculateInvoice(
//   items: Item[],
//   discountType: DiscountType,
//   discountValue: number,
//   gstEnabled: boolean
// )
export function calculateInvoice(
  items: Item[],
  discountType: DiscountType,
  discountValue: number,
  gstEnabled: boolean,
  isInterstate: boolean
)
{
  const subtotal = items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );

  const discountAmount =
    discountType === "flat"
      ? discountValue
      : (subtotal * discountValue) / 100;

  let totalGst = 0;

  if (gstEnabled) {
    items.forEach((item) => {
      const itemTotal = item.qty * item.price;
      
      // Prevent division by zero if subtotal is 0
      const discountRatio = subtotal > 0 ? itemTotal / subtotal : 0;
      const itemDiscountAmount = discountAmount * discountRatio;
      
      const itemAfterDiscount = itemTotal - itemDiscountAmount;
      
      // Use item.gstRate if provided, otherwise default to 18
      const rate = item.gstRate ?? 18;
      
      const itemGst = itemAfterDiscount * (rate / 100);
      totalGst += itemGst;
    });
  }

  const afterDiscount = subtotal - discountAmount;
  
  // const cgst = totalGst / 2;
  // const sgst = totalGst / 2;
  const cgst =
  gstEnabled && !isInterstate
    ? totalGst / 2
    : 0;

const sgst =
  gstEnabled && !isInterstate
    ? totalGst / 2
    : 0;

const igst =
  gstEnabled && isInterstate
    ? totalGst
    : 0;

  const total = afterDiscount + totalGst;

//  return {
//   subtotal,
//   discountAmount,
//   totalGst,
//   cgst,
//   sgst,
//   total,
// };
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