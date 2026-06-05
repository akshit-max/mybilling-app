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
