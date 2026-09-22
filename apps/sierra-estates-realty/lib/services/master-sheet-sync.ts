import { google } from 'googleapis';
import { listRecords, upsertRecords } from '@sierra-estates/db';
import { COLLECTIONS, Unit, PropertyStatus, PropertyType, FurnishingCode } from '@/lib/models/schema';
import { logger } from '@/lib/logger';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { toListingColumns } from '@/lib/server/listing-columns';
import { egpToUsd, usdToEgp } from '@/lib/fx';

export const MASTER_SHEET_ID_DEFAULT = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';

/** Stamp written to listings.sync_source for rows produced by this sync. */
export const SYNC_SOURCE = 'master-owner-sheet';

export interface RawOwnerSheetRow {
  timestamp?: string;
  rowNo?: string;
  lastUpdated?: string;
  name?: string;
  mobile?: string;
  availability?: string;
  bedrooms?: string;
  location?: string;
  priceRaw?: string;
  furnished?: string;
  typeRaw?: string;
  propertyTypeRaw?: string;
  code?: string;
  ownerTypeRaw?: string;
  gardenArea?: string;
  spaceArea?: string;
  pool?: string;
  comment?: string;
}

function getSheetsClient() {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyRaw) {
    try {
      const credentials = JSON.parse(keyRaw);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      return google.sheets({ version: 'v4', auth });
    } catch (_err: any) {
      logger.warn('[MasterSheetSync] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY credentials, falling back to API key');
    }
  }

  // Fallback to unauthenticated / API key if available
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  return google.sheets({ version: 'v4', auth: apiKey });
}

function convertArabicNumerals(str: string): string {
  if (!str) return '';
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicNumbers.indexOf(w).toString());
}

function parsePrice(priceStr?: string): { amount: number; currency: 'EGP' | 'USD' } {
  if (!priceStr) return { amount: 0, currency: 'EGP' };
  const normalized = convertArabicNumerals(priceStr).trim().toLowerCase();
  const isUsd = normalized.includes('$') || normalized.includes('usd') || normalized.includes('دولار');

  let multiplier = 1;
  if (/(m|million|مليون)/i.test(normalized)) {
    multiplier = 1_000_000;
  } else if (/(k|thousand|الف|ألف)/i.test(normalized)) {
    multiplier = 1_000;
  }

  const clean = normalized.replace(/[^0-9.]/g, '');
  const baseNum = parseFloat(clean) || 0;
  const amount = baseNum * multiplier;

  return { amount, currency: isUsd ? 'USD' : 'EGP' };
}

/**
 * The sheet quotes some units in USD ("$250k", "2M دولار"). public.listings
 * stores one canonical price column interpreted as EGP by every consumer
 * (feed, admin, valuation), so a USD figure is converted at the boundary via
 * the unified FX module — never the raw number, which would understate the
 * price by ~48x and poison the price-per-sqm stats.
 */
function parsePriceEgp(priceStr?: string): number {
  const { amount, currency } = parsePrice(priceStr);
  if (amount <= 0) return 0;
  return currency === 'USD' ? usdToEgp(amount) : amount;
}

function parseAvailability(avail?: string, typeRaw?: string): PropertyStatus {
  const normAvail = (avail || '').toLowerCase().trim();
  const normType = (typeRaw || '').toLowerCase().trim();
  const combined = `${normAvail} ${normType}`;

  if (combined.includes('اتباعت') || combined.includes('مباع') || combined.includes('sold')) return 'sold';
  if (combined.includes('تم الايجار') || combined.includes('مؤجر') || combined.includes('rented')) return 'rented';
  if (combined.includes('no answer') || combined.includes('غير متاح') || combined.includes('مغلق') || combined.includes('off market')) return 'off-market';
  if (combined.includes('متاح') || combined.includes('available')) return 'available';
  return 'available';
}

function parsePropertyType(raw?: string): PropertyType {
  const norm = (raw || '').toLowerCase().trim();
  if (norm.includes('villa') || norm.includes('فيلا') || norm.includes('فيللا')) return 'villa';
  if (norm.includes('town') || norm.includes('تاون')) return 'townhouse';
  if (norm.includes('duplex') || norm.includes('دوبلكس') || norm.includes('garden')) return 'duplex';
  if (norm.includes('penthouse') || norm.includes('بنتهاوس')) return 'penthouse';
  if (norm.includes('chalet') || norm.includes('شاليه')) return 'chalet';
  if (norm.includes('apartment') || norm.includes('شقة') || norm.includes('شقه') || norm.includes('استوديو')) return 'apartment';
  return 'apartment';
}

/** 'مفروش'/'F' → 'F' (furnished), 'نص مفروش'/'S' → 'S', 'غير مفروش'/'U' → 'U'. */
function parseFurnishing(raw?: string): FurnishingCode | undefined {
  const s = convertArabicNumerals(raw || '').trim().toLowerCase();
  if (!s) return undefined;
  // Negations first — 'غير مفروش' contains 'مفروش'.
  if (s.includes('غير مفروش') || s.includes('unfurnish') || s === 'u') return 'U';
  if (s.includes('نص مفروش') || s.includes('semi') || s === 's') return 'S';
  if (s.includes('مفروش') || s.includes('furnish') || s === 'f') return 'F';
  if (s === 'k') return 'K';
  return undefined;
}

// ─── Status lifecycle mirror ─────────────────────────────────────────────────
//
// Inventory OS v2 (migrations/011) enforces the canonical lifecycle at the
// database level with a BEFORE UPDATE trigger: an UPDATE whose status change
// is not on the transition matrix raises an exception, which would abort the
// whole 500-row upsert chunk. The matrix below mirrors
// normalize_listing_status() + can_transition_listing() so the sync can
// decide per row, up front, whether to apply the sheet's status or defer to
// the lifecycle queue (the desired state is parked in raw_data.sheet_status
// for the ops team to action through the Inventory OS view).

function normalizeStatus(raw?: string | null): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === '') return 'draft';
  if (['available', 'active', 'verified'].includes(s)) return 'published';
  if (['pending', 'pending review', 'pending_review', 'pending_verification'].includes(s)) return 'pending_verification';
  if (s === 'sold') return 'sold';
  if (s === 'rented') return 'rented';
  if (s === 'reserved') return 'reserved';
  if (s === 'off-market' || s === 'off_market') return 'off_market';
  if (s === 'expired') return 'expired';
  if (s === 'archived') return 'archived';
  return 'draft';
}

const LIFECYCLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['pending_verification', 'archived'],
  pending_verification: ['verified', 'draft', 'archived'],
  verified: ['published', 'pending_verification', 'archived'],
  published: ['reserved', 'rented', 'off_market', 'expired', 'pending_verification', 'archived'],
  reserved: ['sold', 'rented', 'published', 'archived'],
  rented: ['published', 'archived'],
  off_market: ['published', 'archived'],
  expired: ['pending_verification', 'archived'],
  // sold / archived are terminal
};

function canTransition(fromRaw?: string | null, toRaw?: string | null): boolean {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);
  if (from === to) return true;
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function syncMasterOwnerSheet(sheetId?: string) {
  const spreadsheetId = sheetId || process.env.MASTER_SHEET_ID || MASTER_SHEET_ID_DEFAULT;
  logger.info(`[MasterSheetSync] Starting sync for sheet ID: ${spreadsheetId}`);

  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:R', // All 18 columns
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
      logger.warn('[MasterSheetSync] Sheet is empty or header only.');
      return { success: true, count: 0, units: [] };
    }

    const dataRows = rows.slice(1); // skip header
    const parsedUnits: Partial<Unit>[] = [];
    const pendingWrites: { docId: string; data: Record<string, unknown> }[] = [];

    // Sheet-derived doc ids for this batch, used to fetch the stored status of
    // each row so the lifecycle guard never sees an illegal UPDATE.
    const docIds: string[] = [];
    const parsed: {
      docId: string;
      sheetStatus: PropertyStatus;
      appUnit: Partial<Unit>;
      columns: Record<string, unknown>;
    }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length < 3) continue;

      const [
        _timestamp,
        _rowNo,
        _lastUpdated,
        _name,
        mobile,
        availability,
        bedrooms,
        location,
        priceRaw,
        furnished,
        typeRaw,
        propertyTypeRaw,
        code,
        ownerTypeRaw,
        _gardenArea,
        spaceArea,
        _pool,
        comment
      ] = row;

      const price = parsePriceEgp(priceRaw); // canonical EGP
      const sheetStatus = parseAvailability(availability, typeRaw);
      const propertyType = parsePropertyType(propertyTypeRaw);
      const furnishing = parseFurnishing(furnished);

      const cleanSpaceStr = convertArabicNumerals(spaceArea || '').replace(/[^0-9.]/g, '');
      const area = parseFloat(cleanSpaceStr) || 0;

      const cleanBedStr = convertArabicNumerals(bedrooms || '').replace(/[^0-9]/g, '');
      const bedCount = parseInt(cleanBedStr, 10) || 0;

      const unitCode = (code || `SB-UNIT-${i + 1}`).trim();
      const sanitizedDocId = unitCode.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      // Geocode for the inventory map (lib/inventory/gazetteer.js — same
      // compound/area centroid table used by the public map's live-sheet
      // fallback, so pins stay consistent whichever source served them).
      const geo = resolveLocation(location || '');

      // Column payload for public.listings. Field names are the camelCase
      // column names (translated to snake_case by the record layer) — NOT the
      // legacy app names: this sync previously wrote `location`, `area`,
      // `ownerContact` and a nested `coordinates` object, none of which are
      // columns, so every upsert failed wholesale with PGRST204.
      // toListingColumns() is the last line of defence: a key that is not a
      // column lands in raw_data instead of killing the request.
      const columnPayload: Record<string, unknown> = {
        id: sanitizedDocId,
        code: unitCode,
        unitCode, // Inventory OS v2 cross-source unit identity
        title: `${propertyType.toUpperCase()} in ${location || 'New Cairo'} - ${unitCode}`,
        compound: (location || 'New Cairo').trim(),
        locationArea: (location || 'New Cairo').trim(),
        city: geo.zone, // canonical zone from the gazetteer, not hardcoded
        propertyType,
        dealType: 'resale', // owner sheet is secondary-market inventory
        category: 'residential',
        price,
        priceCurrency: 'EGP',
        egpM: price > 0 ? Number((price / 1_000_000).toFixed(2)) : undefined,
        usd: price > 0 ? egpToUsd(price) : undefined,
        areaSqm: area,
        pricePerSqm: price > 0 && area > 0 ? Math.round(price / area) : undefined,
        bedrooms: bedCount,
        furnishingStatus: furnishing,
        ownerType: (ownerTypeRaw || '').toLowerCase().includes('broker') ? 'broker' : 'owner',
        ownerPhone: mobile || '',
        description: comment || `${furnished || ''} ${typeRaw || ''}`.trim(),
        latitude: geo.lat,
        longitude: geo.lng,
        syncSource: SYNC_SOURCE,
        sheetPriceRaw: priceRaw || '', // traceability: original sheet quote (→ raw_data)
      };

      // App-shaped twin for the response — the shape callers of this sync
      // have always received.
      const appUnit: Partial<Unit> = {
        code: unitCode,
        title: columnPayload.title as string,
        compound: (location || 'New Cairo').trim(),
        location: (location || 'New Cairo').trim(),
        city: geo.zone,
        propertyType,
        category: 'residential',
        price,
        area,
        bedrooms: bedCount,
        ownerType: columnPayload.ownerType as 'owner' | 'broker' | 'internal',
        ownerContact: mobile || '',
        description: columnPayload.description as string,
        coordinates: { lat: geo.lat, lng: geo.lng },
        syncSource: SYNC_SOURCE,
      };

      parsed.push({ docId: sanitizedDocId, sheetStatus, appUnit, columns: columnPayload });
      docIds.push(sanitizedDocId);
    }

    // Stored status per doc id — decides whether the sheet's status can be
    // applied directly or must be deferred to the lifecycle queue.
    const existingRows = docIds.length
      ? await listRecords<{ id: string; status: string }>(COLLECTIONS.units, {
          where: [{ column: 'id', op: 'in', value: docIds }],
          select: 'id, status',
        })
      : [];
    const storedStatus = new Map(existingRows.map((r) => [r.id, r.status]));

    const skippedStatusTransitions: { id: string; from: string; to: string }[] = [];

    for (const item of parsed) {
      const stored = storedStatus.get(item.docId);
      let finalStatus: PropertyStatus = item.sheetStatus;

      if (stored != null && !canTransition(stored, item.sheetStatus)) {
        // e.g. sheet says 'sold' but the unit is 'available' (published):
        // the lifecycle requires published → reserved → sold. Keep the
        // stored status, park the sheet's intent in raw_data.sheet_status
        // and let ops drive it through the Inventory OS view so the
        // status_history audit trail stays intact.
        finalStatus = stored as PropertyStatus;
        item.columns.status = finalStatus;
        item.columns.sheetStatus = item.sheetStatus; // → raw_data via toListingColumns
        skippedStatusTransitions.push({ id: item.docId, from: stored, to: item.sheetStatus });
        logger.warn(
          `[MasterSheetSync] Deferred illegal transition ${stored} → ${item.sheetStatus} for ${item.docId} (parked in raw_data.sheet_status)`
        );
      } else {
        item.columns.status = item.sheetStatus;
      }

      const now = new Date();
      item.columns.lastSyncAt = now;
      item.columns.updatedAt = now;

      const appUnit = { ...item.appUnit, status: finalStatus, updatedAt: now } as Partial<Unit>;
      parsedUnits.push(appUnit);
      pendingWrites.push({ docId: item.docId, data: toListingColumns(item.columns) });
    }

    // One upsert per chunk keyed on the sheet-derived id. Chunks are about
    // request size only — Postgres has no Firestore 500-op batch cap.
    if (pendingWrites.length > 0) {
      await upsertRecords(
        COLLECTIONS.units,
        pendingWrites.map((item) => ({ ...item.data })),
        'id'
      );
    }

    logger.info(
      `[MasterSheetSync] Successfully synchronized ${parsedUnits.length} active inventory assets` +
        (skippedStatusTransitions.length ? ` (${skippedStatusTransitions.length} status changes deferred to lifecycle queue)` : '')
    );

    return {
      success: true,
      count: parsedUnits.length,
      units: parsedUnits,
      skippedStatusTransitions,
    };
  } catch (err: any) {
    logger.error('[MasterSheetSync] Error syncing master owner sheet:', err.message);
    return { success: false, error: err.message };
  }
}
