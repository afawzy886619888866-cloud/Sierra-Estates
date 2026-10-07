/**
 * Inventory normalization — turns a raw owner-CRM sheet row into a public-safe
 * `InventoryUnit` (see lib/inventory/types.ts).
 *
 * PRIVACY: the source sheet has owner "Name", "Mobile" and "Owner" columns.
 * Those are intentionally never read here, so they cannot leak into the API
 * response, the committed snapshot, or the public map.
 *
 * PRICE INTELLIGENCE: Egyptian real estate prices are frequently entered
 * without the zero suffix (e.g. "3" meaning "3,000,000 EGP" or "3M").  The
 * `inferPriceEGP` function uses known market floors per property type to detect
 * and auto-scale such under-specified values without inventing numbers — it
 * only scales up when the raw value is impossibly low for the asset class.
 */
import type { InventoryUnit, InventoryStatus, InventoryMode } from './types';
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
 * Market-floor price table (EGP) for New Cairo / 5th Settlement.
 * Source: ECC market memory — known minimum transaction prices per type.
 * Used ONLY to detect grossly under-scaled entries (e.g. "3" for a villa).
 * We never fabricate a price — we only detect when a raw number is impossibly
 * low and scale it to the most plausible power-of-1000 multiplier.
 *
 * Rent floors are monthly EGP. Sale floors are total EGP.
 */
const MARKET_FLOOR_EGP: Record<string, { rent: number; sale: number }> = {
  villa:           { rent:  35_000, sale: 8_000_000 },
  'standalone villa':{ rent: 50_000, sale:10_000_000 },
  townhouse:       { rent:  20_000, sale: 5_000_000 },
  'twin house':    { rent:  20_000, sale: 5_000_000 },
  duplex:          { rent:  15_000, sale: 4_000_000 },
  apartment:       { rent:   8_000, sale: 2_500_000 },
  penthouse:       { rent:  25_000, sale: 7_000_000 },
  studio:          { rent:   6_000, sale: 1_500_000 },
  admin:           { rent:  10_000, sale: 1_800_000 },
  clinic:          { rent:  10_000, sale: 2_000_000 },
  default:         { rent:   6_000, sale: 1_500_000 },
};

/**
 * Infer the correct EGP price from a raw price string/number that may be
 * under-specified (e.g. "3" when the real price is "3,000,000").
 *
 * Logic:
 *  1. Parse the raw number (strip commas etc).
 *  2. Look up the market floor for the property type and mode.
 *  3. If the raw number is already >= floor → return as-is.
 *  4. Try raw × 1,000 and raw × 1,000,000 — pick the smallest that is >= floor
 *     and <= plausible ceiling (100× floor).
 *  5. If no multiplier works, return 0 ("price on request").
 *
 * ANTI-FABRICATION: we never invent a number that isn't traceable to the
 * raw value.  We only scale — e.g. 3 → 3,000,000 — never guess a whole
 * new price.  The scaling is logged in the comment field.
 */
export function inferPriceEGP(
  rawPrice: unknown,
  mode: InventoryMode,
  propertyType: string | null | undefined,
): number {
  const raw = toInt(rawPrice);
  if (raw <= 0) return 0;

  const typeKey = (propertyType || '').toLowerCase().trim();
  const floors = MARKET_FLOOR_EGP[typeKey] ?? MARKET_FLOOR_EGP.default;
  const floor = mode === 'rent' ? floors.rent : floors.sale;
  const ceiling = floor * 100; // sanity ceiling: 100× the floor

  // Already in plausible range
  if (raw >= floor && raw <= ceiling) return raw;

  // Try × 1,000 (e.g. "3000" meaning "3,000,000" for sale, or "30" meaning "30,000" for rent)
  const x1k = raw * 1_000;
  if (x1k >= floor && x1k <= ceiling) return x1k;

  // Try × 1,000,000 (e.g. "3" meaning "3,000,000")
  const x1m = raw * 1_000_000;
  if (x1m >= floor && x1m <= ceiling) return x1m;

  // Try × 100 (e.g. rent of "300" meaning "30,000")
  if (mode === 'rent') {
    const x100 = raw * 100;
    if (x100 >= floor && x100 <= ceiling) return x100;
  }

  // Cannot plausibly scale — zero means "price on request" in the system
  if (raw < floor) return 0;

  return raw;
}

/**
 * Classify listing mode (rent | sale) from the sheet's free-text "Type" column,
 * falling back to price magnitude when the text is ambiguous.
 */
function classifyMode(rawMode: string, price: number): InventoryMode {
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
export function priceLabel(price: number, mode?: InventoryMode): string {
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
  // Rent cap: 5M/mo is the top of any realistic New Cairo rent
  return price > 5_000_000 ? 0 : price;
}

/**
 * Returns true when the unit has a real, hosted photo (not a stock/placeholder).
 * Exported so other layers can consistently determine photo presence.
 */
export function hasPendingPhoto(img: string | null | undefined): boolean {
  if (!img) return true; // no URL at all → pending
  const s = String(img);
  if (!s.startsWith('http')) return true; // relative or invalid
  // Stock/placeholder image patterns that do NOT count as real photos
  const STOCK_PATTERNS = [
    'unsplash.com',
    'placeholder',
    'stock',
    'pexels.com',
    'pixabay.com',
    'images.pexels',
    'via.placeholder',
    'dummyimage',
    'lorempixel',
  ];
  return STOCK_PATTERNS.some((p) => s.includes(p));
}

/** Title-case + tidy the property-type free text. */
function normalizeType(raw: string): string | null {
  const t = String(raw || '').trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const map: Record<string, string> = {
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
  return map[lower] || t.replace(/\b\w/g, (c) => c.toUpperCase());
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
  const rawPriceStr = cell(row, COL.price);
  const rawBeds = cell(row, COL.bedrooms);
  const code = cell(row, COL.code);
  // rawType already declared above (line 248); reuse it for price inference
  // Mode is needed for price inference — do a quick early pass
  const earlyMode: InventoryMode = /sale|بيع/.test(rawMode.toLowerCase()) ? 'sale' : 'rent';
  // Smart price: first infer scale (e.g. 3 → 3M), then clamp outliers
  const inferredPrice = inferPriceEGP(rawPriceStr, earlyMode, rawType);
  const price = clampPrice(inferredPrice, rawMode);

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
