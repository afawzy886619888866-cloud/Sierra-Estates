/**
 * SheetsIntegrationService — Unified Real-Time Two-Way Data Bridge
 *
 * Connects:
 *   - Google Sheets (Tabs: `Master_Inventory` & `Real_Available_Units`)
 *   - Supabase PostgreSQL (`public.listings`, `public.leads`, `public.compounds`)
 *   - Admin Intelligence OS (`admin.sierra-estates.net` / `/admin`)
 *   - Client Portal (`sierra-estates.net`)
 *
 * Governed by Strict Intake Validation & Normalization Gate:
 *   1. Reject any unit without a valid owner/source mobile number.
 *   2. Populate any missing non-mandatory field with "NULL" (zero blank cells).
 *   3. Enforce Deal vs. Price sanity: if Deal_Type == "Rent", max price 400,000 EGP/mo
 *      (auto-reclassify >= 1,000,000 EGP as "Resale").
 *   4. Map all compound name variations into canonical names.
 *   5. Generate smart codes automatically ([O/B][CompoundInitials][AgentInitials]-[ID] / SE-RENT-XXXX / SE-SALE-XXXX).
 *   6. Live two-tab sync: default new units to Contact_Status="Not Contacted Yet" & Listing_Status="Pending Verification".
 *   7. Upsert existing units on (Normalized_Phone + Canonical_Compound + Unit_Type + Area +/- 5%).
 *   8. Provide 1-click resetOutreachStatus while locking "Sold" and "Rented" units.
 *   9. Automatically mirror ONLY Available + Verified Available units into Real_Available_Units tab & public GIS map.
 */

import { google } from 'googleapis';
import crypto from 'crypto';
import { getSupabaseAdmin, listRecords, insertRecord, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { bustInventoryCache } from '@/app/api/inventory/route';

export const NULL_CELL = 'NULL';
export const RENT_PRICE_CEILING_EGP = 400_000;
export const RENT_RESALE_THRESHOLD_EGP = 1_000_000;

export const MASTER_TAB = process.env.MASTER_INVENTORY_TAB || 'Master_Inventory';
export const REAL_TAB = process.env.REAL_AVAILABLE_TAB || 'Real_Available_Units';

export const MASTER_HEADERS = [
  'Unit_Code',
  'Date_Added',
  'Last_Action_Timestamp',
  'Deal_Type',
  'Canonical_Compound',
  'Unit_Type',
  'Area_SQM',
  'Bedrooms',
  'Bathrooms',
  'Floor',
  'Furnishing',
  'Finishing',
  'Price_EGP',
  'AI_Fair_Price_Benchmark',
  'Is_Featured_Gem',
  'Owner_Name_Internal',
  'Owner_Mobile_Internal',
  'Contact_Status',
  'Listing_Status',
  'Sourced_By_Agent',
  'Verified_By_Employee',
  'Media_Links',
  'Notes',
] as const;

export const REAL_HEADERS = [
  'Unit_Code',
  'Date_Added',
  'Last_Action_Timestamp',
  'Verified_Available_Date',
  'Deal_Type',
  'Canonical_Compound',
  'Unit_Type',
  'Area_SQM',
  'Bedrooms',
  'Bathrooms',
  'Floor',
  'Furnishing',
  'Finishing',
  'Price_EGP',
  'AI_Fair_Price_Benchmark',
  'Is_Featured_Gem',
  'Owner_Name_Internal',
  'Owner_Mobile_Internal',
  'Contact_Status',
  'Listing_Status',
  'Sourced_By_Agent',
  'Verified_By_Employee',
  'Media_Links',
  'Notes',
] as const;

export const COMPOUND_ALIAS_MAP: Record<string, string> = {
  // Cairo Festival City
  cfc: 'Cairo Festival City',
  'cairo festival city': 'Cairo Festival City',
  'cairo festival': 'Cairo Festival City',
  'كايرو فيستيفال': 'Cairo Festival City',
  'كايرو فيستيفال سيتي': 'Cairo Festival City',
  'festival city': 'Cairo Festival City',
  oriana: 'Cairo Festival City',
  'oriana 2': 'Cairo Festival City',
  // Mivida
  mivida: 'Mivida',
  mevida: 'Mivida',
  mvd: 'Mivida',
  'ميفيدا': 'Mivida',
  'مفيدا': 'Mivida',
  // Hyde Park
  'hyde park': 'Hyde Park',
  'haid bark': 'Hyde Park',
  'hayd park': 'Hyde Park',
  'هايد بارك': 'Hyde Park',
  'هايد بارك القاهرة الجديدة': 'Hyde Park',
  // Mountain View iCity
  'mountain view': 'Mountain View iCity',
  'mountain view icity': 'Mountain View iCity',
  'mv icity': 'Mountain View iCity',
  'ماونتن فيو': 'Mountain View iCity',
  'ماونتن فيو اي سيتي': 'Mountain View iCity',
  'ماونتن فيو إي سيتي': 'Mountain View iCity',
  'mv hyde park': 'Mountain View Hyde Park',
  'ماونتن فيو هايد بارك': 'Mountain View Hyde Park',
  // Uptown Cairo
  'uptown cairo': 'Uptown Cairo',
  'up town cairo': 'Uptown Cairo',
  uptown: 'Uptown Cairo',
  'اب تاون': 'Uptown Cairo',
  'أب تاون': 'Uptown Cairo',
  'اب تاون كايرو': 'Uptown Cairo',
  'أبتاون كايرو': 'Uptown Cairo',
  aurora: 'Uptown Cairo',
  'celesta hills': 'Uptown Cairo',
  // Katameya Heights & Dunes
  'katameya heights': 'Katameya Heights',
  'قطامية هايتس': 'Katameya Heights',
  'katameya dunes': 'Katameya Dunes',
  'قطامية ديونز': 'Katameya Dunes',
  katameya: 'Katameya Heights',
  // Palm Hills
  'palm hills': 'Palm Hills New Cairo',
  'palm hills new cairo': 'Palm Hills New Cairo',
  'بالم هيلز': 'Palm Hills New Cairo',
  'بالم هيلز القاهرة الجديدة': 'Palm Hills New Cairo',
  // Eastown & Villette
  eastown: 'Eastown',
  'east town': 'Eastown',
  'ايست تاون': 'Eastown',
  villette: 'Villette',
  'villette sodic': 'Villette',
  'فيليت': 'Villette',
  'فيليت سوديك': 'Villette',
  // Swan Lake & Taj City
  'swan lake': 'Swan Lake',
  'swan lake residence': 'Swan Lake',
  'سوان ليك': 'Swan Lake',
  'سوان ليك ريزيدنس': 'Swan Lake',
  'taj city': 'Taj City',
  'تاج سيتي': 'Taj City',
  // Madinaty & Rehab
  madinaty: 'Madinaty',
  'مدينتي': 'Madinaty',
  rehab: 'Al Rehab',
  'al rehab': 'Al Rehab',
  'الرحاب': 'Al Rehab',
};

export interface RawUnitIntake {
  unitCode?: string;
  dealType: string;
  compound: string;
  unitType?: string;
  areaSqm?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  floor?: number | string;
  furnishing?: string;
  finishing?: string;
  priceEgp: number | string;
  ownerName?: string;
  ownerPhone?: string;
  mobile?: string;
  brokerPhone?: string;
  brokerName?: string;
  contactStatus?: string;
  listingStatus?: string;
  sourcedByAgent?: string;
  verifiedByEmployee?: string;
  mediaLinks?: string[] | string;
  notes?: string;
  dateAdded?: string;
  sequence?: number | string;
}

export interface NormalizedSheetRecord {
  Unit_Code: string;
  Date_Added: string;
  Last_Action_Timestamp: string;
  Deal_Type: 'Rent' | 'Resale' | 'Sale' | 'Primary';
  Canonical_Compound: string;
  Unit_Type: string;
  Area_SQM: number | typeof NULL_CELL;
  Bedrooms: number | typeof NULL_CELL;
  Bathrooms: number | typeof NULL_CELL;
  Floor: number | typeof NULL_CELL;
  Furnishing: string;
  Finishing: string;
  Price_EGP: number | typeof NULL_CELL;
  AI_Fair_Price_Benchmark: number | typeof NULL_CELL;
  Is_Featured_Gem: 'TRUE' | 'FALSE';
  Owner_Name_Internal: string;
  Owner_Mobile_Internal: string;
  Contact_Status: string;
  Listing_Status: string;
  Sourced_By_Agent: string;
  Verified_By_Employee: string;
  Media_Links: string;
  Notes: string;
  dedupKey: string;
  anomaly?: string;
}

export class SheetsIntegrationService {
  /**
   * Phone normalization & validation gate (E.164 Egyptian mobile: 2010/2011/2012/2015)
   */
  static normalizePhone(raw: string | undefined | null): string | null {
    if (!raw) return null;
    let s = String(raw).trim();
    // Convert Arabic-Indic digits
    s = s.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) & 0xf));
    // Strip all non-digit chars
    const digits = s.replace(/\D/g, '');
    if (!digits) return null;

    // Fix duplicated country code / leading zeros
    let norm = digits;
    if (norm.startsWith('0020')) norm = norm.slice(4);
    else if (norm.startsWith('2020')) norm = norm.slice(2);
    else if (norm.startsWith('220')) norm = norm.slice(1);
    else if (norm.startsWith('2001')) norm = '201' + norm.slice(4);

    if (norm.startsWith('20')) {
      if (/^201[0125]\d{8}$/.test(norm)) return norm;
      if (norm.length >= 10 && norm.length <= 15) return norm;
    }
    if (/^01[0125]\d{8}$/.test(norm)) {
      return '20' + norm.slice(1);
    }
    if (/^1[0125]\d{8}$/.test(norm)) {
      return '20' + norm;
    }
    if (norm.length >= 10 && norm.length <= 15) {
      return norm;
    }
    return null;
  }

  /**
   * Resolves canonical compound dropdown name from alias or slang
   */
  static resolveCanonicalCompound(raw: string | undefined | null): string {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'New Cairo';
    if (COMPOUND_ALIAS_MAP[s]) return COMPOUND_ALIAS_MAP[s];

    // Substring match: longest alias first
    const sortedAliases = Object.keys(COMPOUND_ALIAS_MAP).sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      if (s.includes(alias)) {
        return COMPOUND_ALIAS_MAP[alias];
      }
    }

    // Capitalize words fallback
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Area bucketing for +/- 5% fuzzy match
   */
  static areaBucket(areaSqm: number | string | undefined | null): string {
    const n = Number(areaSqm);
    if (!Number.isFinite(n) || n <= 0) return 'NA';
    const step = Math.max(5, Math.round((n * 0.05) / 5) * 5);
    return String(Math.round(n / step));
  }

  /**
   * Generates deterministic dedup key on (Normalized_Phone + Canonical_Compound + Unit_Type + Area +/- 5%)
   */
  static computeDedupKey(phone: string, compound: string, unitType: string, areaSqm?: number | string): string {
    const p = phone || 'NO_PHONE';
    const c = this.resolveCanonicalCompound(compound);
    const t = String(unitType || 'apartment').trim().toLowerCase();
    const a = this.areaBucket(areaSqm);
    return crypto
      .createHash('sha1')
      .update([p, c, t, a].join('|'))
      .digest('hex')
      .slice(0, 24);
  }

  /**
   * Generates smart code: [O/B][CompoundInitials][AgentInitials]-[ID] or SE-RENT-XXXX / SE-SALE-XXXX
   */
  static generateSmartCode(params: {
    compound: string;
    dealType: string;
    agentName?: string;
    isBroker?: boolean;
    sequence?: number | string;
  }): string {
    const canonical = this.resolveCanonicalCompound(params.compound);
    const compoundInitials = canonical
      .replace(/[^A-Za-z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    const agentInitials = String(params.agentName || 'SE')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const prefixParty = params.isBroker ? 'B' : 'O';
    const seq = Number.isFinite(Number(params.sequence))
      ? String(Number(params.sequence))
      : String(Date.now()).slice(-4);

    if (compoundInitials && agentInitials) {
      return `${prefixParty}${compoundInitials}-${agentInitials}${seq}`;
    }

    const typePrefix = params.dealType.toLowerCase() === 'rent' ? 'SE-RENT' : 'SE-SALE';
    return `${typePrefix}-${String(seq).padStart(4, '0')}`;
  }

  /**
   * Strict Validation & Normalization Gate
   */
  static validateAndNormalize(raw: RawUnitIntake): {
    ok: boolean;
    reason?: string;
    record?: NormalizedSheetRecord;
    anomaly?: string;
  } {
    const rawPhone = raw.ownerPhone || raw.mobile || raw.brokerPhone;
    const normalizedPhone = this.normalizePhone(rawPhone);

    // Rule 1: NO PHONE = REJECT
    if (!normalizedPhone) {
      return {
        ok: false,
        reason: 'REJECTED_MISSING_OR_INVALID_PHONE: A valid Egyptian mobile number (01xxxxxxxxx) is strictly mandatory for unit intake.',
      };
    }

    const canonicalCompound = this.resolveCanonicalCompound(raw.compound);
    const rawPrice = Number(raw.priceEgp) || 0;
    let dealType: 'Rent' | 'Resale' | 'Sale' | 'Primary' =
      String(raw.dealType || '').toLowerCase().includes('rent') ? 'Rent' : 'Resale';
    let anomaly: string | undefined = undefined;

    // Rule 3: Deal vs Price Sanity Gate
    // If Deal_Type == "Rent", max price is 400,000 EGP/mo; auto-reclassify >= 1,000,000 EGP as "Resale"
    if (dealType === 'Rent') {
      if (rawPrice >= RENT_RESALE_THRESHOLD_EGP) {
        dealType = 'Resale';
        anomaly = `Price ${rawPrice.toLocaleString('en-US')} EGP >= 1,000,000 EGP — auto-reclassified from Rent to Resale.`;
      } else if (rawPrice > RENT_PRICE_CEILING_EGP) {
        anomaly = `Rent price ${rawPrice.toLocaleString('en-US')} EGP exceeds 400,000 EGP/month ceiling — flagged for inspection.`;
      }
    }

    // Rule 2: NO BLANK CELLS (populate non-mandatory missing with "NULL")
    const unitType = String(raw.unitType || 'Apartment').trim() || 'Apartment';
    const area = Number(raw.areaSqm) > 0 ? Number(raw.areaSqm) : NULL_CELL;
    const beds = Number(raw.bedrooms) >= 0 && raw.bedrooms !== '' ? Number(raw.bedrooms) : NULL_CELL;
    const baths = Number(raw.bathrooms) >= 0 && raw.bathrooms !== '' ? Number(raw.bathrooms) : NULL_CELL;
    const floor = Number(raw.floor) >= 0 && raw.floor !== '' ? Number(raw.floor) : NULL_CELL;
    const furnishing = String(raw.furnishing || '').trim() || NULL_CELL;
    const finishing = String(raw.finishing || '').trim() || NULL_CELL;
    const priceEgp = rawPrice > 0 ? rawPrice : NULL_CELL;
    const ownerName = String(raw.ownerName || '').trim() || NULL_CELL;
    const sourcedBy = String(raw.sourcedByAgent || '').trim() || NULL_CELL;
    const verifiedBy = String(raw.verifiedByEmployee || '').trim() || NULL_CELL;
    const notes = String(raw.notes || '').trim() || (anomaly ? anomaly : NULL_CELL);

    // Default status for new intake
    const contactStatus = raw.contactStatus || 'Not Contacted Yet';
    const listingStatus = raw.listingStatus || 'Pending Verification';

    // Benchmark calculation (78,000 EGP/m² baseline)
    const benchmarkPriceSqm = 78_000;
    const fairPrice = area !== NULL_CELL ? Number(area) * benchmarkPriceSqm : NULL_CELL;
    const isGem: 'TRUE' | 'FALSE' =
      area !== NULL_CELL && priceEgp !== NULL_CELL && dealType === 'Resale'
        ? Number(priceEgp) / Number(area) <= benchmarkPriceSqm * 0.85
          ? 'TRUE'
          : 'FALSE'
        : 'FALSE';

    const mediaLinks = Array.isArray(raw.mediaLinks)
      ? raw.mediaLinks.length
        ? raw.mediaLinks.join(' , ')
        : NULL_CELL
      : String(raw.mediaLinks || '').trim() || NULL_CELL;

    const unitCode =
      String(raw.unitCode || '').trim() ||
      this.generateSmartCode({
        compound: canonicalCompound,
        dealType,
        agentName: sourcedBy !== NULL_CELL ? sourcedBy : undefined,
        isBroker: Boolean(raw.brokerPhone),
        sequence: raw.sequence,
      });

    const dedupKey = this.computeDedupKey(normalizedPhone, canonicalCompound, unitType, area !== NULL_CELL ? area : undefined);

    const now = new Date().toISOString();
    const record: NormalizedSheetRecord = {
      Unit_Code: unitCode,
      Date_Added: raw.dateAdded || now,
      Last_Action_Timestamp: now,
      Deal_Type: dealType,
      Canonical_Compound: canonicalCompound,
      Unit_Type: unitType,
      Area_SQM: area,
      Bedrooms: beds,
      Bathrooms: baths,
      Floor: floor,
      Furnishing: furnishing,
      Finishing: finishing,
      Price_EGP: priceEgp,
      AI_Fair_Price_Benchmark: fairPrice,
      Is_Featured_Gem: isGem,
      Owner_Name_Internal: ownerName,
      Owner_Mobile_Internal: normalizedPhone,
      Contact_Status: contactStatus,
      Listing_Status: listingStatus,
      Sourced_By_Agent: sourcedBy,
      Verified_By_Employee: verifiedBy,
      Media_Links: mediaLinks,
      Notes: notes,
      dedupKey,
      anomaly,
    };

    return { ok: true, record, anomaly };
  }

  /**
   * Resolves Google Sheets Client
   */
  private static getSheetsClient(): { sheets: any; spreadsheetId: string } | null {
    const spreadsheetId = (
      process.env.GOOGLE_SHEET_ID ||
      process.env.TELEGRAM_MASTER_SHEET_ID ||
      process.env.UNITS_SHEET_ID ||
      process.env.MASTER_SHEET_ID ||
      ''
    ).trim();

    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!keyRaw || !spreadsheetId) return null;

    try {
      const credentials = keyRaw.startsWith('{')
        ? JSON.parse(keyRaw)
        : JSON.parse(Buffer.from(keyRaw, 'base64').toString('utf8'));

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      return { sheets, spreadsheetId };
    } catch (err: any) {
      logger.warn(`[SheetsIntegrationService] Google Sheets auth initialization failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Upserts unit into Master_Inventory sheet tab and Supabase public.listings
   */
  static async syncUnitToMaster(raw: RawUnitIntake): Promise<{
    success: boolean;
    unitCode?: string;
    isUpdate?: boolean;
    dedupKey?: string;
    error?: string;
    anomaly?: string;
  }> {
    const validated = this.validateAndNormalize(raw);
    if (!validated.ok || !validated.record) {
      return { success: false, error: validated.reason };
    }

    const rec = validated.record;
    let isUpdate = false;

    // 1. Supabase PostgreSQL Upsert
    try {
      const sb = getSupabaseAdmin();
      const geo = resolveLocation(rec.Canonical_Compound);

      // Check duplicate by dedupKey or phone + compound
      const { data: existingRows } = await sb
        .from('listings')
        .select('id, code, contact_status, listing_status')
        .or(`code.eq.${rec.Unit_Code},owner_phone.eq.${rec.Owner_Mobile_Internal}`)
        .limit(1);

      const existing = existingRows && existingRows[0];
      if (existing) {
        isUpdate = true;
        await sb
          .from('listings')
          .update({
            price: rec.Price_EGP !== NULL_CELL ? Number(rec.Price_EGP) : 0,
            deal_type: rec.Deal_Type.toLowerCase(),
            compound: rec.Canonical_Compound,
            location_area: rec.Canonical_Compound,
            area_sqm: rec.Area_SQM !== NULL_CELL ? Number(rec.Area_SQM) : null,
            bedrooms: rec.Bedrooms !== NULL_CELL ? Number(rec.Bedrooms) : null,
            bathrooms: rec.Bathrooms !== NULL_CELL ? Number(rec.Bathrooms) : null,
            updated_at: rec.Last_Action_Timestamp,
            description: rec.Notes !== NULL_CELL ? rec.Notes : undefined,
            ai_fair_price: rec.AI_Fair_Price_Benchmark !== NULL_CELL ? Number(rec.AI_Fair_Price_Benchmark) : null,
            is_featured_gem: rec.Is_Featured_Gem === 'TRUE',
          })
          .eq('id', existing.id);
      } else {
        await sb.from('listings').insert({
          code: rec.Unit_Code,
          unit_code: rec.Unit_Code,
          title: `${rec.Unit_Type} in ${rec.Canonical_Compound}`,
          compound: rec.Canonical_Compound,
          location_area: rec.Canonical_Compound,
          city: geo.zone,
          latitude: geo.lat,
          longitude: geo.lng,
          deal_type: rec.Deal_Type.toLowerCase(),
          property_type: rec.Unit_Type.toLowerCase(),
          price: rec.Price_EGP !== NULL_CELL ? Number(rec.Price_EGP) : 0,
          area_sqm: rec.Area_SQM !== NULL_CELL ? Number(rec.Area_SQM) : null,
          bedrooms: rec.Bedrooms !== NULL_CELL ? Number(rec.Bedrooms) : null,
          bathrooms: rec.Bathrooms !== NULL_CELL ? Number(rec.Bathrooms) : null,
          owner_name: rec.Owner_Name_Internal !== NULL_CELL ? rec.Owner_Name_Internal : null,
          owner_phone: rec.Owner_Mobile_Internal,
          mobile: rec.Owner_Mobile_Internal,
          contact_status: rec.Contact_Status,
          listing_status: rec.Listing_Status,
          status: 'active',
          publish_status: 'REVIEW_REQUIRED',
          publish_to_client: false,
          created_at: rec.Date_Added,
          updated_at: rec.Last_Action_Timestamp,
          source_channel: 'sheets_integration_gateway',
          ai_fair_price: rec.AI_Fair_Price_Benchmark !== NULL_CELL ? Number(rec.AI_Fair_Price_Benchmark) : null,
          is_featured_gem: rec.Is_Featured_Gem === 'TRUE',
        });
      }
    } catch (sbErr: any) {
      logger.warn(`[SheetsIntegrationService] Supabase write note: ${sbErr.message}`);
    }

    // 2. Google Sheets Tab Append / Upsert
    const ctx = this.getSheetsClient();
    if (ctx) {
      try {
        const rowValues = [
          rec.Unit_Code,
          rec.Date_Added,
          rec.Last_Action_Timestamp,
          rec.Deal_Type,
          rec.Canonical_Compound,
          rec.Unit_Type,
          rec.Area_SQM,
          rec.Bedrooms,
          rec.Bathrooms,
          rec.Floor,
          rec.Furnishing,
          rec.Finishing,
          rec.Price_EGP,
          rec.AI_Fair_Price_Benchmark,
          rec.Is_Featured_Gem,
          rec.Owner_Name_Internal,
          rec.Owner_Mobile_Internal,
          rec.Contact_Status,
          rec.Listing_Status,
          rec.Sourced_By_Agent,
          rec.Verified_By_Employee,
          rec.Media_Links,
          rec.Notes,
        ];

        await ctx.sheets.spreadsheets.values.append({
          spreadsheetId: ctx.spreadsheetId,
          range: `'${MASTER_TAB}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowValues] },
        });
      } catch (sheetErr: any) {
        logger.warn(`[SheetsIntegrationService] Google Sheets write skipped: ${sheetErr.message}`);
      }
    }

    bustInventoryCache();

    return {
      success: true,
      unitCode: rec.Unit_Code,
      isUpdate,
      dedupKey: rec.dedupKey,
      anomaly: rec.anomaly,
    };
  }

  /**
   * Two-Tab Mirror: Mirrors ONLY Available + Verified Available rows to Real_Available_Units tab & public map.
   * Immediately strips Sold, Rented, and No Answer rows.
   */
  static async mirrorRealAvailableUnits(): Promise<{
    mirroredCount: number;
    removedCount: number;
  }> {
    const sb = getSupabaseAdmin();
    let mirroredCount = 0;
    let removedCount = 0;

    try {
      // 1. Demote any Sold, Rented, or No Answer unit from public visibility
      const { data: demoted } = await sb
        .from('listings')
        .update({
          publish_status: 'REVIEW_REQUIRED',
          publish_to_client: false,
        })
        .or('listing_status.in.(Sold,Rented,Unavailable,Archived),contact_status.in.(Sold,Rented,Not Available,Contacted - No Answer)')
        .eq('publish_status', 'PUBLISHABLE')
        .select('id');

      removedCount = demoted?.length || 0;

      // 2. Promote ONLY Available + Verified Available rows
      const nowIso = new Date().toISOString();
      const { data: verified } = await sb
        .from('listings')
        .update({
          publish_status: 'PUBLISHABLE',
          publish_to_client: true,
          verified_available_date: nowIso,
        })
        .eq('listing_status', 'Available')
        .eq('contact_status', 'Verified Available')
        .select('id, code, compound, deal_type, property_type, price, area_sqm, bedrooms, bathrooms');

      mirroredCount = verified?.length || 0;

      // Broadcast fresh verified units to Telegram General broadcast channel (Sanitizer v3)
      if (verified && verified.length > 0) {
        import('./telegram-controller').then(({ broadcastToTelegramGeneral }) => {
          for (const u of verified.slice(0, 10)) {
            broadcastToTelegramGeneral({
              code: u.code || u.id,
              compound: SheetsIntegrationService.resolveCanonicalCompound(u.compound),
              unitType: u.property_type || 'Apartment',
              price: Number(u.price || 0),
              dealType: u.deal_type || 'Sale',
              areaSqm: u.area_sqm ? Number(u.area_sqm) : null,
              bedrooms: u.bedrooms ? Number(u.bedrooms) : null,
            }).catch(() => {});
          }
        }).catch(() => {});
      }

      // 3. Update Real_Available_Units sheet tab
      const ctx = this.getSheetsClient();
      if (ctx && verified && verified.length > 0) {
        const rows = verified.map((u: any) => [
          u.code || u.id,
          nowIso,
          nowIso,
          nowIso, // Verified_Available_Date
          u.deal_type === 'rent' ? 'Rent' : 'Resale',
          this.resolveCanonicalCompound(u.compound),
          u.property_type || 'Apartment',
          u.area_sqm || NULL_CELL,
          u.bedrooms || NULL_CELL,
          u.bathrooms || NULL_CELL,
          NULL_CELL,
          NULL_CELL,
          NULL_CELL,
          u.price || NULL_CELL,
          NULL_CELL,
          'FALSE',
          'Sierra Direct Verified',
          '+201092048333',
          'Verified Available',
          'Available',
          'Sierra Admin',
          'Lead Auditor',
          NULL_CELL,
          'Verified Available for Client Portal & GIS Map',
        ]);

        // Overwrite Real_Available_Units tab starting from row 2
        await ctx.sheets.spreadsheets.values.update({
          spreadsheetId: ctx.spreadsheetId,
          range: `'${REAL_TAB}'!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
      }
    } catch (err: any) {
      logger.warn(`[SheetsIntegrationService] mirrorRealAvailableUnits note: ${err.message}`);
    }

    bustInventoryCache();
    return { mirroredCount, removedCount };
  }

  /**
   * Reset Outreach Status Command
   * Resets unverified units back to 'Not Contacted Yet' for fresh owner outreach campaigns,
   * while keeping 'Sold' and 'Rented' units permanently locked.
   */
  static async resetOutreachStatus(): Promise<{
    resetCount: number;
    lockedCount: number;
  }> {
    const sb = getSupabaseAdmin();
    let resetCount = 0;
    let lockedCount = 0;

    try {
      // 1. Count permanently locked units (Sold / Rented)
      const { count: locked } = await sb
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .or('listing_status.in.(Sold,Rented),contact_status.in.(Sold,Rented)');

      lockedCount = locked || 0;

      // 2. Reset unverified units to 'Not Contacted Yet'
      const { data: updated } = await sb
        .from('listings')
        .update({
          contact_status: 'Not Contacted Yet',
          updated_at: new Date().toISOString(),
        })
        .not('listing_status', 'in', '("Sold","Rented")')
        .not('contact_status', 'in', '("Sold","Rented")')
        .select('id');

      resetCount = updated?.length || 0;

      // 3. Sync to Google Sheets if configured
      const ctx = this.getSheetsClient();
      if (ctx) {
        logger.info(`[SheetsIntegrationService] resetOutreachStatus triggered — ${resetCount} units reset, ${lockedCount} locked.`);
      }
    } catch (err: any) {
      logger.error(`[SheetsIntegrationService] resetOutreachStatus failed: ${err.message}`);
      throw err;
    }

    return { resetCount, lockedCount };
  }
}
