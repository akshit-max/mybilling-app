/**
 * Centralized numeric sanitizer.
 * - Allows empty string "" for clearing inputs safely.
 * - Prevents leading zeros (e.g. "010" -> "10") but allows "0" and decimals like "0.5".
 * - Returns string | number so state can hold empty strings without forcing 0.
 */
export const sanitizeNumericInput = (value: string | number): string | number => {
  if (value === "" || value === null || value === undefined) return "";
  
  const strVal = String(value);
  if (strVal === "") return "";

  // Allow decimal typing safely
  if (strVal.endsWith('.')) {
    return strVal;
  }

  // Remove leading zeros if they are followed by another digit.
  // This correctly transforms "010" -> "10", but keeps "0" and "0.5" intact.
  const sanitized = strVal.replace(/^0+(?=\d)/, '');
  
  // Extra safeguard: if it ends up completely un-parsable, fallback to empty
  if (isNaN(Number(sanitized)) && sanitized !== "-" && sanitized !== "") return "";
  
  return sanitized;
};

/**
 * Recursively cleans undefined properties from any object or array.
 * Required because Firestore throws exceptions for any undefined fields.
 */
export const cleanUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  } else if (obj !== null && typeof obj === "object") {
    if (obj instanceof Date) {
      return obj;
    }
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        newObj[key] = cleanUndefined(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

/**
 * Ensures item-level discount does not exceed item value (qty * price) for flat,
 * or 100 for percent. Also blocks negative values.
 */
export const capItemDiscountUI = (item: any): any => {
  const qty = Number(item.qty) || 0;
  const price = Number(item.price) || 0;
  const dType = item.discountType || "percent";
  
  // Some modules use discountValue, some use discountPct.
  let rawDiscount = 0;
  if (item.discountValue !== undefined && item.discountValue !== "") {
    rawDiscount = Number(item.discountValue);
  } else if (item.discountPct !== undefined && item.discountPct !== "") {
    rawDiscount = Number(item.discountPct);
  } else if (item.discountRate !== undefined && item.discountRate !== "") { // For expenses/pos
    rawDiscount = Number(item.discountRate);
  }

  let capped = rawDiscount < 0 ? 0 : rawDiscount;
  if (dType === "percent" && capped > 100) capped = 100;
  if (dType === "flat" && capped > (qty * price)) capped = (qty * price);

  // We must return string or number based on original so we don't break input typing empty strings
  const finalVal = capped === 0 && rawDiscount === 0 && (item.discountValue === "" || item.discountPct === "" || item.discountRate === "") ? "" : capped;

  if (item.discountValue !== undefined) item.discountValue = finalVal;
  if (item.discountPct !== undefined) item.discountPct = finalVal;
  if (item.discountRate !== undefined) item.discountRate = finalVal;
  
  return item;
};

/**
 * Ensures global invoice discount does not exceed 100% for percent types,
 * and blocks negative values.
 */
export const capGlobalDiscountUI = (value: string | number, discountType: string): string | number => {
  if (value === "") return "";
  const numVal = Number(value);
  if (isNaN(numVal) || numVal < 0) return 0;
  if (discountType === "percent" && numVal > 100) return 100;
  return value;
};
