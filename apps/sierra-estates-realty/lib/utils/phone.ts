/**
 * SIERRA ESTATES — CANONICAL EGYPTIAN PHONE NORMALIZATION
 *
 * Single shared implementation used by every intake surface (client request
 * form, careers application, add-listing owner intake, WhatsApp/Telegram
 * parsers, Google Sheets sync). Server AND client safe (no server-only
 * imports) so the forms can validate inline before submitting.
 *
 * Output contract: E.164 Egyptian mobile `+20XXXXXXXXXX` (11 digits after
 * the plus), or `null` when the input cannot be an Egyptian mobile — the
 * caller decides whether to reject or ask again. Never guesses: a number
 * that is not provably an Egyptian mobile returns null.
 *
 * Accepted input shapes:
 *   01012345678 · +201012345678 · 00201012345678 · 201012345678
 *   ٠١٠١٢٣٤٥٦٧٨ (Arabic-Indic digits) · "0101 234 5678" (whitespace/dashes)
 */

/** Arabic-Indic ٠-٩ and Eastern-Arabic ۰-۹ → ASCII digits. */
export function toAsciiDigits(raw: string): string {
  return String(raw ?? '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalize any Egyptian mobile representation to `+20XXXXXXXXXX`.
 * Egyptian mobiles: 010 / 011 / 012 / 015 prefixes (We / Orange / Vodafone / Etisalat).
 */
export function normalizeEgyptianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = toAsciiDigits(String(raw)).replace(/\D/g, '');

  // International prefixes → national form:
  //   00201012345678 (0020…) → strip '00'  → 201012345678
  //   201012345678   (20…, 12 digits)     → 01012345678
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('20') && digits.length === 12) digits = '0' + digits.slice(2);
  // Missing leading zero on the local mobile: 1012345678 → 01012345678
  if (digits.length === 10 && /^1[0125]/.test(digits)) digits = '0' + digits;

  if (!/^01[0125]\d{8}$/.test(digits)) return null;
  return `+20${digits.slice(1)}`;
}

/** True when the value normalizes to a valid Egyptian mobile. */
export function isValidEgyptianPhone(raw: string | null | undefined): boolean {
  return normalizeEgyptianPhone(raw) !== null;
}

/**
 * Display form for sheets/notifications: `+20 101 234 5678`.
 * Falls back to the raw input when it cannot be normalized (never throws).
 */
export function formatEgyptianPhoneDisplay(raw: string | null | undefined): string {
  const normalized = normalizeEgyptianPhone(raw);
  if (!normalized) return String(raw ?? '').trim();
  const national = normalized.slice(4); // +201012345678 → 1012345678
  return `+20 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}
