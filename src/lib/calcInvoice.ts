type Item = {
  name: string;
  qty: number;
  price: number;
};

export type DiscountType = "flat" | "percent";

export function calculateInvoice(
  items: Item[],
  discountType: DiscountType,
  discountValue: number,
  gstEnabled: boolean
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );

  const discountAmount =
    discountType === "flat"
      ? discountValue
      : (subtotal * discountValue) / 100;

  const afterDiscount = subtotal - discountAmount;

  const gst = gstEnabled ? afterDiscount * 0.18 : 0;

  const cgst = gst / 2;
  const sgst = gst / 2;

  const total = afterDiscount + gst;

  return {
    subtotal,
    discountAmount,
    cgst,
    sgst,
    total,
  };
}