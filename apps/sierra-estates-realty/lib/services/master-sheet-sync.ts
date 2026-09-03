import { google } from 'googleapis';
import { upsertRecords } from '@sierra-estates/db';
import { COLLECTIONS, Unit, PropertyStatus, PropertyType } from '@/lib/models/schema';
import { logger } from '@/lib/logger';
import { resolveLocation } from '@/lib/inventory/gazetteer';

export const MASTER_SHEET_ID_DEFAULT = '1VEOSYbXPNVWVzC8A_yhYYdsYMqJwAoEnOFGZcJqSzv4';

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
    const pendingWrites: { docId: string; data: Partial<Unit> }[] = [];

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

      const { amount: price } = parsePrice(priceRaw);
      const status = parseAvailability(availability, typeRaw);
      const propertyType = parsePropertyType(propertyTypeRaw);

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

      const unitDoc: Partial<Unit> = {
        code: unitCode,
        title: `${propertyType.toUpperCase()} in ${location || 'New Cairo'} - ${unitCode}`,
        compound: (location || 'New Cairo').trim(),
        location: (location || 'New Cairo').trim(),
        city: 'New Cairo',
        propertyType,
        category: 'residential',
        status,
        price,
        area,
        bedrooms: bedCount,
        syncSource: 'sheets',
        ownerType: (ownerTypeRaw || '').toLowerCase().includes('broker') ? 'broker' : 'owner',
        ownerContact: mobile || '',
        description: comment || `${furnished || ''} ${typeRaw || ''}`.trim(),
        coordinates: { lat: geo.lat, lng: geo.lng },
        updatedAt: new Date() as any,
      };

      parsedUnits.push(unitDoc);
      pendingWrites.push({ docId: sanitizedDocId, data: unitDoc });
    }

    // Firestore chunked these at 400 to stay under its 500-operation WriteBatch
    // cap. Postgres has no such cap, so this is one upsert per chunk keyed on
    // the sheet-derived id, and the chunking is only about request size.
    await upsertRecords(
      COLLECTIONS.units,
      pendingWrites.map((item) => ({ id: item.docId, ...item.data })),
    );

    logger.info(`[MasterSheetSync] Successfully synchronized ${parsedUnits.length} active inventory assets.`);

    return {
      success: true,
      count: parsedUnits.length,
      units: parsedUnits,
    };
  } catch (err: any) {
    logger.error('[MasterSheetSync] Error syncing master owner sheet:', err.message);
    return { success: false, error: err.message };
  }
}

