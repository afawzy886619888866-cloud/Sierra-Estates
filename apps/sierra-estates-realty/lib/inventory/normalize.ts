/**
 * Inventory normalization — turns a raw owner-CRM sheet row into a public-safe
 * `InventoryUnit` (see lib/inventory/types.ts).
 *
 * PRIVACY: the source sheet has owner "Name", "Mobile" and "Owner" columns.
 * Those are intentionally never read here, so they cannot leak into the API
 * response, the committed snapshot, or the public map.
 */
import type { InventoryUnit, InventoryStatus, ListingMode, PropertyType } from './types';
import type { ResolvedLocation } from './gazetteer';

/** Column headers as they appear in the sheet (note the trailing spaces). */
const COL = {
  no: 'NO',
  updated: 'تاريخ اخر تحديث ',
  availability: 'Availablty',
  bedrooms: 'bedrooms',
  location: 'Location ',
  price: 'Unit Price',
  furnished: 'Furnished or not',
  mode: 'Type',
  propertyType: 'Property Tybe',
  code: 'Code',
  garden: 'Garden',
  space: 'Space',
  pool: 'Pool',
  comment: 'Comment',
};

/** Read a column tolerantly (exact header, then trimmed-key fallback). */
function cell(row: Record<string, unknown>, key: string): string {
  if (row[key] != null) return String(row[key]).trim();
  const want = key.trim().toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.trim().toLowerCase() === want) return String(row[k] ?? '').trim();
  }
  return '';
}

/**
 * Scrub owner PII that occasionally lands in free-text comment cells — phone
 * numbers, most commonly. Removes any run of 7+ digits (optionally split by
 * spaces/dashes) and collapses the leftover whitespace.
 */
function scrubText(raw: string | null | undefined): string | null {
  const t = String(raw || '')
    .replace(/(?:\+?\d[\d\s-]{6,}\d)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return t || null;
}

/** Parse a possibly comma-grouped integer ("8,500,000" → 8500000). */
function toInt(raw: unknown): number {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Classify listing mode (rent | sale) from the sheet's free-text "Type" column,
 * falling back to price magnitude when the text is ambiguous.
 */
function classifyMode(rawMode: string, price: number): ListingMode {
  const m = String(rawMode || '').toLowerCase();
  if (/sale|بيع/.test(m)) return 'sale';
  if (/rent|ايجار|إيجار/.test(m)) return 'rent';
  return price >= 1_000_000 ? 'sale' : 'rent';
}

/**
 * Map the sheet's "Availablty" (+ Arabic "Type" states) to a status enum.
 */
function classifyStatus(rawAvail: string, rawMode: string): InventoryStatus {
  const a = String(rawAvail || '').toLowerCase();
  const m = String(rawMode || '');
  if (/اتباعت|تم الايجار|تم البيع/.test(m)) return 'unavailable';
  if (a.includes('available') && !a.includes('not')) return 'available';
  if (a.includes('follow')) return 'follow_up';
  if (a.includes('no answer')) return 'no_answer';
  if (a.includes('not available')) return 'unavailable';
  return 'no_answer';
}

const STATUS_LABEL: Record<InventoryStatus, string> = {
  available: 'Available',
  follow_up: 'Follow up',
  no_answer: 'Pending',
  unavailable: 'Unavailable',
};

/** Human-friendly price label. Exported so the domain→map mapper can reuse it. */
export function priceLabel(price: number, mode?: ListingMode): string {
  if (!price) return 'Price on request';
  if (mode === 'rent') return `EGP ${price.toLocaleString('en-US')}/mo`;
  if (price >= 1_000_000) return `EGP ${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`;
  return `EGP ${price.toLocaleString('en-US')}`;
}

/** Clamp implausible price typos (e.g. a 12-digit rent) to 0 = "on request". */
function clampPrice(price: number, rawMode: string): number {
  const mode = /sale|بيع/.test(String(rawMode).toLowerCase()) ? 'sale' : null;
  if (price <= 0) return 0;
  if (mode === 'sale') return price > 5_000_000_000 ? 0 : price;
  return price > 5_000_000 ? 0 : price;
}

/** Title-case + tidy the property-type free text. */
function normalizeType(raw: string): PropertyType | null {
  const t = String(raw || '').trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const map: Record<string, PropertyType> = {
    apartment: 'Apartment',
    villa: 'Villa',
    'standalone villa': 'Standalone Villa',
    'town house': 'Townhouse',
    townhouse: 'Townhouse',
    'twin house': 'Twin House',
    duplex: 'Duplex',
    'duplex + garden': 'Duplex',
    studio: 'Studio',
    penthouse: 'Penthouse',
    'floor with garden': 'Floor with Garden',
    'admin apartment': 'Admin Apartment',
    admin: 'Admin',
    clinic: 'Clinic',
  };
  return map[lower] || (t.replace(/\b\w/g, (c) => c.toUpperCase()) as PropertyType);
}

/**
 * Normalize a single raw sheet row.
 */
export function normalizeRow(
  row: Record<string, unknown>,
  index: number,
  deps: { resolveLocation: (raw: string) => ResolvedLocation },
): InventoryUnit | null {
  const rawMode = cell(row, COL.mode);
  if (/لا يوجد وحدات/.test(rawMode)) return null;
  const rawType = cell(row, COL.propertyType);
  if (rawType === 'Property Tybe') return null;

  const rawLocation = cell(row, COL.location);
  const price = clampPrice(toInt(cell(row, COL.price)), rawMode);
  const rawBeds = cell(row, COL.bedrooms);
  const code = cell(row, COL.code);

  if (!rawLocation && !price && !rawType && !code) return null;

  const mode = classifyMode(rawMode, price);
  const status = classifyStatus(cell(row, COL.availability), rawMode);
  const geo = deps.resolveLocation(rawLocation);
  const beds = toInt(rawBeds) || null;
  const area = toInt(cell(row, COL.space)) || null;
  const garden = toInt(cell(row, COL.garden)) || null;
  const poolRaw = cell(row, COL.pool);
  const no = toInt(cell(row, COL.no));

  return {
    id: code || `row-${no || index + 1}`,
    code: code || null,
    mode,
    status,
    statusLabel: STATUS_LABEL[status],
    location: geo.label,
    rawLocation: rawLocation || null,
    zone: geo.zone,
    lat: geo.lat,
    lng: geo.lng,
    approxLocation: geo.approx,
    propertyType: normalizeType(rawType),
    beds,
    area,
    garden,
    pool: /yes|نعم|pool|مسبح|حمام سباحه|حمام سباحة/i.test(poolRaw) || (!!poolRaw && poolRaw !== '0'),
    furnished: cell(row, COL.furnished) || null,
    price,
    priceLabel: priceLabel(price, mode),
    comment: scrubText(cell(row, COL.comment)),
    updatedAt: cell(row, COL.updated) || null,
  };
}

/**
 * Normalize every row, dropping non-units.
 */
export function normalizeRows(
  rows: Array<Record<string, unknown>>,
  deps: { resolveLocation: (raw: string) => ResolvedLocation },
): InventoryUnit[] {
  const out: InventoryUnit[] = [];
  rows.forEach((row, i) => {
    const unit = normalizeRow(row, i, deps);
    if (unit) out.push(unit);
  });
  return out;
}
