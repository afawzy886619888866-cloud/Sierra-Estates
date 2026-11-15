/**
 * Sierra Estates — Core Phone Normalization, Compound Gazetteer,
 * Deterministic Unit Coding & PII Redaction Utilities.
 */

export const AGENCY_HELPLINE = '01092048333';
export const AGENCY_HELPLINE_INTL = '+201092048333';

const COMPOUND_PREFIX_MAP: Array<[RegExp, string, string]> = [
  [/cairo\s*festival|cfc|كايرو\s*فيستيفال|فيستيفال/i, 'CFC', 'Cairo Festival City'],
  [/madinaty|مدينتي/i, 'MAD', 'Madinaty'],
  [/mivida|mevida|ميفيدا/i, 'MIV', 'Mivida'],
  [/eastown|ايست\s*تاون|ايستاون/i, 'EST', 'Eastown'],
  [/hyde\s*park|هايد\s*بارك/i, 'HPK', 'Hyde Park'],
  [/rehab|الرحاب/i, 'RHB', 'Al Rehab'],
  [/villette|فيليت/i, 'VLT', 'Villette (Sodic)'],
  [/mountain\s*view|ماونتن\s*فيو|mv/i, 'MTG', 'Mountain View'],
  [/palm\s*hills|بالم\s*هيلز/i, 'PAL', 'Palm Hills'],
  [/lake\s*view|ليك\s*فيو/i, 'LKV', 'Lake View'],
  [/taj\s*city|تاج\s*سيتي/i, 'TAJ', 'Taj City'],
  [/sarai|سراي/i, 'SAR', 'Sarai'],
  [/katameya\s*heights|قطامية\s*هايتس/i, 'KTH', 'Katameya Heights'],
];

/**
 * Normalizes Egyptian mobile numbers into canonical 11-digit local format (`01xxxxxxxxx`).
 */
export function normalizeEgyptianPhone(input: string | null | undefined): string {
  if (!input) return '';
  const digits = String(input).replace(/[^\d]/g, '');
  if (digits.startsWith('00201') && digits.length >= 15) {
    return '0' + digits.slice(4, 14);
  }
  if (digits.startsWith('201') && digits.length >= 12) {
    return '0' + digits.slice(2, 12);
  }
  if (digits.startsWith('1') && digits.length === 10) {
    return '0' + digits;
  }
  if (digits.startsWith('01') && digits.length >= 11) {
    return digits.slice(0, 11);
  }
  return digits.length >= 7 ? digits.slice(-11) : '';
}

export function normalizeCompoundName(raw: string | null | undefined): {
  code: string;
  canonicalName: string;
} {
  const cleaned = String(raw || '').trim();
  for (const [pattern, code, canonicalName] of COMPOUND_PREFIX_MAP) {
    if (pattern.test(cleaned)) {
      return { code, canonicalName };
    }
  }
  return {
    code: 'NCR',
    canonicalName: cleaned || 'New Cairo',
  };
}

export function generateCanonicalUnitCode(input: {
  compound: string;
  mode: 'sale' | 'rent';
  areaSqm?: number;
  unitNumber?: string;
  phone?: string;
}): string {
  const { code } = normalizeCompoundName(input.compound);
  const modeChar = input.mode === 'rent' ? 'R' : 'S';
  const areaPart = input.areaSqm && input.areaSqm > 0 ? String(Math.round(input.areaSqm)) : '000';
  const phoneDigits = normalizeEgyptianPhone(input.phone);
  const suffix = input.unitNumber
    ? input.unitNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
    : phoneDigits
    ? phoneDigits.slice(-4)
    : 'UNIT';

  return `SE-${code}-${modeChar}-${areaPart}-${suffix}`;
}

export function buildUnitDedupKey(input: {
  compound: string;
  mode: 'sale' | 'rent';
  areaSqm?: number;
  phone?: string;
  unitCode?: string;
}): string {
  const { code } = normalizeCompoundName(input.compound);
  const normalizedPhone = normalizeEgyptianPhone(input.phone);
  const areaBucket = input.areaSqm ? Math.round(input.areaSqm / 5) * 5 : 0;
  return `${code}:${input.mode}:${areaBucket}:${normalizedPhone || input.unitCode || 'ANON'}`;
}

export function isDuplicateListing(
  candidate: { compound: string; mode: 'sale' | 'rent'; areaSqm?: number; phone?: string; unitCode?: string },
  existingKeys: Set<string>
): { duplicate: boolean; key: string } {
  const key = buildUnitDedupKey(candidate);
  return {
    duplicate: existingKeys.has(key),
    key,
  };
}

/**
 * Redacts phone numbers from public strings so public group replies never leak owner/broker contacts.
 */
export function stripPhoneNumbers(text: string): string {
  return String(text || '')
    .replace(/(?:\+?20|0020)?\s*0?1[0125]\s*[\d\s-]{7,12}/g, '[تواصل عبر سييرا]')
    .trim();
}
