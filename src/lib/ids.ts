// Indian ID numbers typed loosely ("abcde1234f", "2345 6789 0123") are
// cleaned up here. Each normaliser returns the canonical value or null.
// The database applies the same patterns as check constraints.

const clean = (raw: string) => raw.replace(/[\s\-–.()]/g, "").toUpperCase();

function match(raw: string, pattern: RegExp): string | null {
  const value = clean(raw);
  return pattern.test(value) ? value : null;
}

export function normalizePhone(raw: string): string | null {
  let digits = clean(raw).replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0"))
    digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const normalizeAadhaar = (raw: string) => match(raw, /^[2-9]\d{11}$/);
export const normalizePan = (raw: string) => match(raw, /^[A-Z]{5}\d{4}[A-Z]$/);
export const normalizeIfsc = (raw: string) =>
  match(raw, /^[A-Z]{4}0[A-Z0-9]{6}$/);
export const normalizeUan = (raw: string) => match(raw, /^\d{12}$/);
export const normalizeAccountNumber = (raw: string) => match(raw, /^\d{9,18}$/);

/** "234567890123" → "XXXX XXXX 0123"; "ABCDE1234F" → "XXXXXX234F". */
export function maskId(value: string, visible = 4): string {
  const masked =
    "X".repeat(Math.max(0, value.length - visible)) + value.slice(-visible);
  if (/^\d{12}$/.test(value)) return masked.replace(/(.{4})(?=.)/g, "$1 ");
  return masked;
}
