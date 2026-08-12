import { PropertyType, PropertyStatus, Unit } from '../models/schema';

/**
 * Shared normalization helpers for inbound listing data (Airtable, Google
 * Sheets, CSV/Excel exports, etc.).
 *
 * Real-world Sierra inventory arrives as messy bilingual (English/Arabic) rows
 * with inconsistent headers and free-form values. These helpers map that raw
 * shape onto the canonical Firestore `Unit` schema so every ingestion path
 * behaves identically (and we don't duplicate mapping logic per source).
 */

type Raw = Record<string, unknown>;

/** Canonical residential/commercial property-type buckets. */
const COMMERCIAL_TYPES: PropertyType[] = ['commercial'];

/**
 * Maps a free-form property-type string (English or Arabic) onto the canonical
 * `PropertyType` union plus its `category`. Commercial subtypes — offices,
 * co-working / business centres, shops, clinics, warehouses, etc. — collapse to
 * `commercial` so they are never mislabelled as `apartment`.
 */
export function normalizePropertyType(raw: unknown): {
  propertyType: PropertyType;
  category: 'residential' | 'commercial';
} {
  const s = String(raw ?? '').trim().toLowerCase();

  const matches = (...needles: string[]) => needles.some((n) => s.includes(n));

  // Commercial first (most specific), incl. co-working / office handling.
  if (
    matches(
      'office', 'co-work', 'cowork', 'co work', 'business-cent', 'business cent',
      'shop', 'retail', 'show-room', 'show room', 'showroom', 'clinic', 'medical',
      'warehouse', 'factory', 'restaurant', 'cafeteria', 'cafe', 'commercial',
      'مكتب', 'محل', 'تجار', 'عياد', 'مخزن', 'مصنع', 'مطعم', 'ورك',
    )
  ) {
    return { propertyType: 'commercial', category: 'commercial' };
  }

  if (matches('land', 'plot', 'أرض', 'ارض', 'قطعة')) {
    return { propertyType: 'land', category: 'residential' };
  }
  if (matches('penthouse', 'بنتهاوس', 'بنت هاوس')) {
    return { propertyType: 'penthouse', category: 'residential' };
  }
  if (matches('duplex', 'دوبلكس', 'دوبليكس')) {
    return { propertyType: 'duplex', category: 'residential' };
  }
  if (matches('townhouse', 'town house', 'town-house', 'تاون')) {
    return { propertyType: 'townhouse', category: 'residential' };
  }
  if (matches('studio', 'استوديو', 'ستوديو')) {
    return { propertyType: 'studio', category: 'residential' };
  }
  if (matches('chalet', 'شاليه')) {
    return { propertyType: 'chalet', category: 'residential' };
  }
  // Villa family: villa, twin house, i-villa, standalone, "vills" (common typo).
  if (matches('villa', 'vills', 'twin', 'i-villa', 'ivilla', 'standalone', 'فيلا', 'فيللا', 'توين')) {
    return { propertyType: 'villa', category: 'residential' };
  }
  // Apartment family (incl. "apartment with garden", flat, roof, Arabic شقة).
  if (matches('apartment', 'apart', 'flat', 'roof', 'شقة', 'شقه')) {
    return { propertyType: 'apartment', category: 'residential' };
  }

  return { propertyType: 'apartment', category: 'residential' };
}

/** True when a canonical property type belongs to the commercial category. */
export function isCommercialType(t: PropertyType): boolean {
  return COMMERCIAL_TYPES.includes(t);
}

/** Maps a free-form availability/status string onto the canonical status. */
export function normalizeStatus(raw: unknown): PropertyStatus {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return 'available';
  if (s.includes('reserv') || s.includes('محجوز')) return 'reserved';
  if (s.includes('sold') || s.includes('مباع') || s.includes('تم البيع')) return 'sold';
  if (s.includes('rented') || s.includes('مؤجر') || s.includes('مؤجره')) return 'rented';
  if (s.includes('off') || s.includes('غير متاح') || s.includes('غير متاحه')) return 'off-market';
  if (s.includes('avail') || s.includes('متاح')) return 'available';
  // "No answer" and other contact states are not listing states — keep visible.
  return 'available';
}

/** Maps a free-form listing-type string onto sale vs rent. */
export function normalizeListingType(raw: unknown): 'sale' | 'rent' {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.includes('rent') || s.includes('ايجار') || s.includes('إيجار') || s.includes('اجار')) {
    return 'rent';
  }
  return 'sale';
}

/** Maps free-form finishing/furnishing text onto the canonical finishing enum. */
export function normalizeFinishing(
  raw: unknown,
): Unit['finishingType'] | undefined {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return undefined;
  if (s.includes('core') || s.includes('shell') || s.includes('محارة') || s.includes('طوب')) {
    return 'core-shell';
  }
  if (s.includes('semi') || s.includes('half') || s.includes('نص')) return 'semi-finished';
  if (s.includes('not') || s.includes('بدون')) return 'not-finished';
  if (
    s.includes('full') || s.includes('finished') || s.includes('furnished') ||
    s.includes('شركة') || s.includes('شركه') || s.includes('كامل') || s.includes('مفروش')
  ) {
    return 'fully-finished';
  }
  return undefined;
}

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * Parses a price/number that may arrive as a JS number or a messy string such
 * as `"4.600.000"`, `"8,500,000"`, `"6 مليون"`, or with Arabic-Indic digits.
 * Returns a finite number, or 0 when nothing parseable is found.
 */
export function parseNumeric(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw == null) return 0;

  let s = String(raw).trim();
  if (!s) return 0;

  // Normalize Arabic-Indic digits to ASCII.
  s = s.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] ?? d);

  // Handle Arabic "million"/"thousand" word multipliers on a leading number.
  const lower = s.toLowerCase();
  const millionWord = lower.includes('مليون') || lower.includes('million') || /\bm\b/.test(lower);
  const thousandWord = lower.includes('الف') || lower.includes('ألف') || lower.includes('thousand') || /\bk\b/.test(lower);

  // Keep only digits and separators.
  const cleaned = s.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  let numeric: number;
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;

  if (dotCount > 1) {
    // Dots used as thousands separators: "4.600.000".
    numeric = Number(cleaned.replace(/\./g, ''));
  } else if (commaCount >= 1 && dotCount === 0) {
    // Commas as thousands separators: "8,500,000".
    numeric = Number(cleaned.replace(/,/g, ''));
  } else {
    // Single dot (decimal) or plain digits, commas treated as thousands.
    numeric = Number(cleaned.replace(/,/g, ''));
  }

  if (!Number.isFinite(numeric)) return 0;
  if (millionWord && numeric < 1000) numeric *= 1_000_000;
  else if (thousandWord && numeric < 1000) numeric *= 1_000;
  return numeric;
}

/** Reads the first present value across a list of candidate header keys. */
function pick(row: Raw, keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] != null && row[k] !== '') return row[k];
    // Case-insensitive / trimmed fallback.
    const found = Object.keys(row).find(
      (rk) => rk.trim().toLowerCase() === k.trim().toLowerCase(),
    );
    if (found && row[found] != null && row[found] !== '') return row[found];
  }
  return undefined;
}

export interface MapOptions {
  /** Default owner type when the source can't tell us (sheet/table dependent). */
  ownerType?: Unit['ownerType'];
  /** Source tag stored on the record for provenance/sync bookkeeping. */
  syncSource?: NonNullable<Unit['syncSource']>;
}

/**
 * Maps one raw bilingual listing row (from Airtable, Sheets, or an Excel
 * export) onto a `Partial<Unit>`. Returns `null` when the row lacks the minimum
 * fields (a price or a reference code) needed to be a real listing.
 */
export function mapRowToUnit(row: Raw, opts: MapOptions = {}): Partial<Unit> | null {
  const code = pick(row, ['Code', 'code', 'الكود', 'كود', 'Reference', 'Reference Number', 'reference']);
  const rawPrice = pick(row, ['Unit Price', 'Price', 'price', 'السعر', 'unitPrice']);
  const name = pick(row, ['Name', 'name', 'Owner', 'owner', 'الاسم', 'اسم']);
  const location = pick(row, ['Location', 'location', 'Compound', 'compound', 'الكمبوند', 'المنطقة', 'المنطقه']);
  const propertyTypeRaw = pick(row, ['Property Type', 'Property Tybe', 'propertyType', 'Type', 'نوع الوحده', 'نوع الوحدة', 'النوع']);
  const listingTypeRaw = pick(row, ['Type', 'listingType', 'بيع/ ايجار', 'بيع/ايجار', 'بيع / ايجار']);

  const price = parseNumeric(rawPrice);
  // A real listing must have at least a price or a reference code.
  if (!price && !code) return null;

  const { propertyType, category } = normalizePropertyType(propertyTypeRaw);
  const listingType = normalizeListingType(listingTypeRaw ?? propertyTypeRaw);
  const area = parseNumeric(pick(row, ['Space', 'Area', 'area', 'المساحه', 'المساحة', 'size', 'Size']));
  const bedrooms = parseNumeric(pick(row, ['bedrooms', 'Bedrooms', 'beds', 'غرف', 'الغرف']));
  const bathrooms = parseNumeric(pick(row, ['bathrooms', 'Bathrooms', 'baths', 'حمام', 'حمامات', 'الحمامات', 'دورات المياه']));
  const garden = parseNumeric(pick(row, ['Garden', 'garden', 'الحديقة', 'الحديقه']));
  const imageUrl = pick(row, ['Image URL', 'imageUrl', 'Image', 'image', 'Photo', 'photo', 'صورة', 'الصورة', 'الصوره']);
  const mobile = pick(row, ['Mobile', 'mobile', 'Phone', 'phone', 'تليفون', 'موبايل', 'رقم']);
  const comment = pick(row, ['Comment', 'comment', 'بيان الوحده', 'تفاصيل الوحده', 'ملحوظة', 'ملاحظات', 'Description', 'description']);
  const finishing = normalizeFinishing(pick(row, ['Furnished or not', 'Furnished', 'التشطيب', 'finishing', 'finishingType']));

  const refNumber = code
    ? String(code).trim()
    : `SBR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const unit: Partial<Unit> = {
    title: name ? String(name).trim() : String(refNumber),
    referenceNumber: refNumber,
    code: code ? String(code).trim() : undefined,
    propertyType,
    category,
    status: normalizeStatus(pick(row, ['Availablty', 'Availability', 'availability', 'status', 'Status', 'متاحه /غير متاحه', 'متاح'])),
    price,
    area: area || 0,
    bedrooms: bedrooms || undefined,
    bathrooms: bathrooms || undefined,
    compound: location ? String(location).trim() : undefined,
    location: location ? String(location).trim() : undefined,
    finishingType: finishing,
    description: comment ? String(comment).trim() : '',
    ownerType: opts.ownerType ?? 'owner',
    ownerContact: mobile ? String(mobile).trim() : undefined,
    syncSource: opts.syncSource,
    lastSyncAt: new Date().toISOString(),
  };

  if (listingType === 'rent') unit.monthlyRent = price;
  if (garden > 0) {
    unit.amenities = ['garden', ...(unit.amenities ?? [])];
  }
  if (imageUrl) {
    const url = String(imageUrl).trim();
    if (url) {
      unit.featuredImage = url;
      unit.images = [url, ...(unit.images ?? [])];
    }
  }

  return unit;
}
