import 'server-only';

/**
 * SIERRA ESTATES 3.0 — STANDARD PROPERTY CODING (Phase 2)
 *
 * Canonical unit-code architecture for every listing that flows through the
 * Telegram inbound/outbound pipeline:
 *
 *   Rental ………… SE-RNT-[AREA]-[SERIAL]     e.g. SE-RNT-HYD-014
 *   Sale/Resale … SE-SL-[AREA]-[SERIAL]      e.g. SE-SL-PK-007
 *
 * Compound-prefixed short form (equally canonical, used on channel posts):
 *
 *   HYD-RNT-014 · AUC-RNT-032 · PK-SL-007
 *
 * Rules:
 *  - [AREA] is a 2–4 character deterministic compound code (gazetteer first,
 *    then initials of the compound's significant words).
 *  - [SERIAL] is 3–6 digits. When a source listing carries no code, the
 *    serial is derived deterministically from a hash of
 *    Compound + Deal Type + stable seed — the same input always produces the
 *    same code (idempotent re-runs never mint a second identity). The
 *    listings.reference_code UNIQUE constraint is the final collision guard.
 */

export type DealType = 'rent' | 'sale' | 'resale' | 'primary';

/** Known New Cairo compounds → canonical area codes (spec gazetteer). */
const COMPOUND_CODE_GAZETTEER: Readonly<Record<string, string>> = {
  'hyde park': 'HYD',
  'palm hills': 'PK',
  'mountain view': 'MVI',
  'mivida': 'MVD',
  'madinaty': 'MDN',
  'uptown cairo': 'UPC',
  'eastown': 'EST',
  'villette': 'VIL',
  'the estates': 'TET',
  'allegria': 'ALG',
  'katameya dunes': 'KTD',
  'katameya': 'KAT',
  'new cairo': 'AUC',
  'mostakbal city': 'MBC',
  'rehab': 'REH',
  'shorouk': 'SHR',
  'third settlements': '5ST',
  '5th settlement': '5ST',
  'new capital': 'NCP',
  'zayed': 'ZAY',
  'sheikh zayed': 'ZAY',
  'october': 'OCT',
  '6th of october': 'OCT',
  'north coast': 'NCS',
  'sokhna': 'SOK',
  'ain sokhna': 'SOK',
  'cairo plaza': 'CPL',
};

/** Words that carry no area identity and are skipped by the initialism. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'new', 'compound', 'residences', 'living',
  'real', 'estate', 'development', 'group', 'sodic', 'emaar',
]);

const SERIAL_PAD = 4;
const SERIAL_MAX = 9999;

/** Deal-type token for the code: RNT for rentals, SL for sales/resales. */
export function dealToken(dealType: string | undefined | null): 'RNT' | 'SL' {
  const d = String(dealType ?? '').trim().toLowerCase();
  if (d === 'rent' || d === 'rental' || d === 'إيجار' || d === 'ايجار') return 'RNT';
  return 'SL'; // sale | resale | primary | default per spec (SE-SL-…)
}

export function normalizeDealType(dealType: string | undefined | null): DealType {
  const d = String(dealType ?? '').trim().toLowerCase();
  if (d === 'rent' || d === 'rental' || d === 'إيجار' || d === 'ايجار') return 'rent';
  if (d === 'resale') return 'resale';
  if (d === 'primary') return 'primary';
  return 'sale';
}

/** Deterministic 2–4 char uppercase area code for a compound name. */
export function areaCodeForCompound(compound: string | undefined | null): string {
  const name = String(compound ?? '').trim().toLowerCase();
  if (!name) return 'GCA'; // Greater Cairo fallback — deterministic, never random

  const gazetteer = COMPOUND_CODE_GAZETTEER[name];
  if (gazetteer) return gazetteer;

  // Containment pass: 'hyde park new cairo' → 'hyde park' entry.
  for (const [key, code] of Object.entries(COMPOUND_CODE_GAZETTEER)) {
    if (name.length > key.length && name.includes(key)) return code;
  }

  const initials = name
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const code = (initials || name.replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase());
  return code.slice(0, 4) || 'GCA';
}

/** FNV-1a 32-bit hash — deterministic, dependency-free. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Deterministic serial from Compound + Deal Type + seed hash. */
export function serialForSeed(compound: string, dealType: string, seed: string): string {
  const hash = fnv1a(`${String(compound).trim().toLowerCase()}|${normalizeDealType(dealType)}|${String(seed).trim()}`);
  return String((hash % SERIAL_MAX) + 1).padStart(SERIAL_PAD, '0');
}

/** Canonical long form: SE-RNT-HYD-014 / SE-SL-PK-007. */
export function canonicalUnitCode(params: {
  compound: string;
  dealType: string;
  serial: string | number;
}): string {
  const area = areaCodeForCompound(params.compound);
  const token = dealToken(params.dealType);
  const serial = String(params.serial).replace(/\D/g, '') || '001';
  return `SE-${token}-${area}-${serial.padStart(SERIAL_PAD, '0').slice(0, 6)}`;
}

/** Compound-prefixed short form: HYD-RNT-014 / PK-SL-007. */
export function compoundUnitCode(params: {
  compound: string;
  dealType: string;
  serial: string | number;
}): string {
  const area = areaCodeForCompound(params.compound);
  const token = dealToken(params.dealType);
  const serial = String(params.serial).replace(/\D/g, '') || '001';
  return `${area}-${token}-${serial.padStart(SERIAL_PAD, '0').slice(0, 6)}`;
}

const CANONICAL_PATTERN = /^SE-(RNT|SL)-([A-Z0-9]{2,4})-(\d{3,6})$/;
const COMPOUND_PATTERN = /^([A-Z0-9]{2,4})-(RNT|SL)-(\d{3,6})$/;

/** True for either canonical form (long or compound-prefixed). */
export function isCanonicalSierraCode(code: string | undefined | null): boolean {
  const c = String(code ?? '').trim().toUpperCase();
  return CANONICAL_PATTERN.test(c) || COMPOUND_PATTERN.test(c);
}

/** Parse a canonical code into its parts (null when not canonical). */
export function parseSierraUnitCode(
  code: string | undefined | null,
): { prefix: string; deal: 'RNT' | 'SL'; area: string; serial: string } | null {
  const c = String(code ?? '').trim().toUpperCase();
  const long = CANONICAL_PATTERN.exec(c);
  if (long) {
    return { prefix: 'SE', deal: long[1] as 'RNT' | 'SL', area: long[2], serial: long[3] };
  }
  const short = COMPOUND_PATTERN.exec(c);
  if (short) {
    return { prefix: short[1], deal: short[2] as 'RNT' | 'SL', area: short[1], serial: short[3] };
  }
  return null;
}

/**
 * Resolve the definitive unit code for an incoming listing:
 *  1. a valid canonical code passes through (normalized uppercase);
 *  2. a non-canonical/absent code gets a deterministic canonical code from
 *     Compound + Deal Type + a stable seed (the legacy code or the unit's
 *     stable identity), so re-ingesting the same source never mints a new id.
 */
export function resolveUnitCode(unit: {
  code?: string | null;
  compound: string;
  dealType?: string | null;
  seed?: string;
  title?: string | null;
  contactPhone?: string | null;
  areaSqm?: number | null;
  price?: number | null;
}): { code: string; generated: boolean; basedOn: 'provided-canonical' | 'deterministic-hash' } {
  const provided = String(unit.code ?? '').trim();
  if (provided && isCanonicalSierraCode(provided)) {
    return { code: provided.toUpperCase(), generated: false, basedOn: 'provided-canonical' };
  }

  const seed =
    unit.seed?.trim() ||
    provided ||
    [
      unit.title ?? '',
      unit.compound ?? '',
      unit.areaSqm ?? '',
      unit.price ?? '',
      (unit.contactPhone ?? '').replace(/\D/g, '').slice(-10),
    ]
      .join('|');

  const code = canonicalUnitCode({
    compound: unit.compound,
    dealType: unit.dealType ?? 'sale',
    serial: serialForSeed(unit.compound, unit.dealType ?? 'sale', seed),
  });
  return { code, generated: true, basedOn: 'deterministic-hash' };
}
