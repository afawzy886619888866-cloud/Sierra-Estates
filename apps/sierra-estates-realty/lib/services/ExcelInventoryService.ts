import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { logger } from '../logger';
import { resolveLocation } from '../inventory/gazetteer';
import { getSupabaseAdmin } from '@sierra-estates/db';
import { egpToUsd } from '../fx';
import type { InventoryUnit } from '../inventory/types';

export const EXCEL_COLUMNS = [
  'RecordID',
  'UnitCode',
  'Compound',
  'Location',
  'Zone',
  'PropertyType',
  'Operation',
  'Price (EGP)',
  'Price Formatted',
  'Area (sqm)',
  'Bedrooms',
  'Bathrooms',
  'Furnishing',
  'Contact Name',
  'Contact Phone',
  'WhatsApp Direct',
  'Inventory Status',
  'Photo Match Status',
  'Photo URLs',
  'Description',
  'Source',
  'Updated At',
] as const;

export type ExcelColumn = (typeof EXCEL_COLUMNS)[number];

export interface NewExcelListingInput {
  recordId?: string;
  code?: string;
  compound: string;
  location?: string;
  zone?: string;
  propertyType?: string;
  operation?: 'Rent' | 'Sale' | 'Buy';
  price: number;
  priceFormatted?: string;
  areaSqm?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  furnishing?: string;
  contactName?: string;
  contactPhone?: string;
  whatsAppDirect?: string;
  inventoryStatus?: string;
  photoMatchStatus?: string;
  photoUrls?: string | string[];
  description?: string;
  source?: string;
  sourceType?: 'owner' | 'broker';
}

/**
 * Check if a URL represents a real uploaded unit photo (not an Unsplash or generic placeholder).
 */
export function isRealPhoto(url?: string | null): boolean {
  if (!url) return false;
  const s = String(url).trim().toLowerCase();
  if (!s.startsWith('http')) return false;
  if (s.includes('unsplash.com')) return false;
  if (s.includes('placeholder')) return false;
  if (s.includes('example.com')) return false;
  return true;
}

/**
 * Resolve master Excel inventory workbook location (Inventory_with_Photos.xlsx).
 */
export function getMasterExcelPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'Inventory_with_Photos.xlsx'),
    path.resolve(process.cwd(), '../../Inventory_with_Photos.xlsx'),
    path.resolve(process.cwd(), 'data/Inventory_with_Photos.xlsx'),
    path.resolve(process.cwd(), 'apps/sierra-estates-realty/data/Inventory_with_Photos.xlsx'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.resolve(process.cwd(), 'Inventory_with_Photos.xlsx');
}

/**
 * Resolve sierra-estates-master-inventory.xlsx path.
 */
export function getMasterInventoryWorkbookPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx'),
    path.resolve(process.cwd(), 'data/sierra-estates-master-inventory.xlsx'),
    path.resolve(process.cwd(), '../../apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Resolve sierra-estates-airtable-import.csv path.
 */
export function getAirtableImportCsvPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'apps/sierra-estates-realty/data/sierra-estates-airtable-import.csv'),
    path.resolve(process.cwd(), 'data/sierra-estates-airtable-import.csv'),
    path.resolve(process.cwd(), '../../apps/sierra-estates-realty/data/sierra-estates-airtable-import.csv'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Helper to build standard price label.
 */
function formatPriceLabel(price: number, mode: 'rent' | 'sale'): string {
  if (!price || price <= 0) return 'Price on request';
  if (mode === 'rent') {
    return `${price.toLocaleString('en-US')} EGP / mo`;
  }
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(1)}M EGP`;
  }
  return `${price.toLocaleString('en-US')} EGP`;
}

/**
 * Read listings from sierra-estates-airtable-import.csv
 */
function readAirtableListingsInternal(stripPII: boolean): InventoryUnit[] {
  const filePath = getAirtableImportCsvPath();
  if (!filePath || !fs.existsSync(filePath)) return [];

  try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    const units: InventoryUnit[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawCode = String(row['Sierra Code'] || row['Record ID'] || `AT-${i + 1}`).trim();
      const compoundName = String(row['Compound Name'] || row.Compound || row['Location / Area'] || 'New Cairo').trim();
      const resolved = resolveLocation(compoundName);

      const price = Number(row['Price (EGP)']) || 0;
      const op = String(row['Operation (Sale / Rent)'] || row.Operation || '').toLowerCase();
      const mode: 'rent' | 'sale' = op.includes('rent') || (price > 0 && price < 1_000_000) ? 'rent' : 'sale';

      const photoStatus = String(row['Has Photo? (YES / NO)'] || '').trim().toUpperCase();
      const primaryPhotoUrl = String(row['Primary Photo URL (Airtable Attachment)'] || '').trim();
      const hasRealPhoto = photoStatus === 'YES' || isRealPhoto(primaryPhotoUrl);

      const lat = Number(row.Latitude) || resolved.lat;
      const lng = Number(row.Longitude) || resolved.lng;

      const unit: InventoryUnit = {
        id: `AT-${rawCode}`,
        code: rawCode,
        compound: compoundName || resolved.label,
        location: compoundName || resolved.label,
        rawLocation: row['Location / Area'] || compoundName,
        zone: resolved.zone,
        lat,
        lng,
        approxLocation: resolved.approx,
        propertyType: row['Property Type'] || 'Apartment',
        type: row['Property Type'] || 'Apartment',
        mode,
        status: 'available',
        statusLabel: 'Available',
        price,
        priceLabel: formatPriceLabel(price, mode),
        egpM: price > 0 ? Number((price / 1_000_000).toFixed(2)) : undefined,
        usd: price > 0 ? egpToUsd(price) : undefined,
        beds: row.Bedrooms ? Number(row.Bedrooms) : null,
        bath: row.Bathrooms ? Number(row.Bathrooms) : null,
        area: row['Area (sqm)'] ? Number(row['Area (sqm)']) : null,
        img: primaryPhotoUrl || undefined,
        hasPhoto: hasRealPhoto,
        sourceType: 'airtable',
        finishingQuality: row['Finishing Quality'] || undefined,
        description: row['Notes & Broker Description'] || undefined,
        segment: mode === 'rent' ? 'broker_rent' : 'broker_buy',
        segmentLabel: 'Airtable Import',
        tag: row['Source Classification'] || 'Airtable Master',
        party: String(row['Source Classification'] || '').includes('Owner') ? 'Owner' : 'Broker',
      };

      if (!stripPII) {
        (unit as any).contactPhone = row['Owner / Broker Contact Info'];
      }

      units.push(unit);
    }

    return units;
  } catch (err) {
    logger.warn(`[ExcelInventory] Error reading Airtable CSV: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Read listings from sierra-estates-master-inventory.xlsx
 */
function readMasterExcelWorkbookInternal(stripPII: boolean): InventoryUnit[] {
  const filePath = getMasterInventoryWorkbookPath();
  if (!filePath || !fs.existsSync(filePath)) return [];

  try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames.includes('All_Master_Units') ? 'All_Master_Units' : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    const units: InventoryUnit[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Note BOM on Sierra Code
      const rawCode = String(row['\ufeffSierra Code'] || row['Sierra Code'] || row.Code || `MASTER-${i + 1}`).trim();
      const compoundName = String(row.Compound || row.Location || 'New Cairo').trim();
      const resolved = resolveLocation(compoundName);

      const price = Number(row['Price (EGP)']) || 0;
      const op = String(row.Operation || '').toLowerCase();
      const mode: 'rent' | 'sale' = op.includes('rent') || (price > 0 && price < 1_000_000) ? 'rent' : 'sale';

      const primaryImgUrl = String(row['Primary Image URL'] || '').trim();
      const hasRealPhoto = isRealPhoto(primaryImgUrl);

      const lat = Number(row.Latitude) || resolved.lat;
      const lng = Number(row.Longitude) || resolved.lng;

      const unit: InventoryUnit = {
        id: `MASTER-${rawCode}`,
        code: rawCode,
        compound: compoundName || resolved.label,
        location: compoundName || resolved.label,
        rawLocation: row.Location || compoundName,
        zone: resolved.zone,
        lat,
        lng,
        approxLocation: resolved.approx,
        propertyType: row['Property Type'] || 'Apartment',
        type: row['Property Type'] || 'Apartment',
        mode,
        status: 'available',
        statusLabel: 'Available',
        price,
        priceLabel: formatPriceLabel(price, mode),
        egpM: price > 0 ? Number((price / 1_000_000).toFixed(2)) : undefined,
        usd: price > 0 ? egpToUsd(price) : undefined,
        beds: row.Bedrooms ? Number(row.Bedrooms) : null,
        bath: row.Bathrooms ? Number(row.Bathrooms) : null,
        area: row['Area (sqm)'] ? Number(row['Area (sqm)']) : null,
        img: primaryImgUrl || undefined,
        hasPhoto: hasRealPhoto,
        sourceType: 'excel',
        finishingQuality: row['Finishing Quality'] || undefined,
        description: row['Listing Description & Notes'] || undefined,
        segment: mode === 'rent' ? 'broker_rent' : 'broker_buy',
        segmentLabel: 'Master Excel',
        tag: row['Source Type (Owner / Broker)'] || 'Master Sheet',
        party: String(row['Source Type (Owner / Broker)'] || '').includes('Owner') ? 'Owner' : 'Broker',
      };

      if (!stripPII) {
        (unit as any).contactPhone = row['Contact Info / Owner Name'];
      }

      units.push(unit);
    }

    return units;
  } catch (err) {
    logger.warn(`[ExcelInventory] Error reading Master Excel: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Read listings from Inventory_with_Photos.xlsx
 */
function readInventoryWithPhotosInternal(options?: {
  sheetName?: string;
  stripPII?: boolean;
}): InventoryUnit[] {
  const stripPII = options?.stripPII !== false;
  const filePath = getMasterExcelPath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const targetSheets = options?.sheetName
      ? [options.sheetName]
      : wb.SheetNames.filter((name) =>
          ['Owners Rent', 'Owners Buy', 'Broker Rent', 'Broker Buy', 'Unknown Broker or Owner'].includes(name)
        );

    const units: InventoryUnit[] = [];

    for (const sheetName of targetSheets) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      const segment = sheetName.toLowerCase().replace(/\s+/g, '_');
      const isRentSheet = sheetName.toLowerCase().includes('rent');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const compoundName = String(row.Compound || row.Location || 'New Cairo').trim();
        const resolved = resolveLocation(compoundName);

        const price = Number(row['Price (EGP)']) || 0;
        const op = String(row.Operation || '').toLowerCase();
        const mode: 'rent' | 'sale' = isRentSheet || op === 'rent' ? 'rent' : 'sale';

        // Extract primary photo and photo gallery
        const rawPhotos = String(row['Photo URLs'] || '').trim();
        const photosList = rawPhotos
          ? rawPhotos
              .split(/[\n,;]+/)
              .map((u) => u.trim())
              .filter((u) => u.startsWith('http'))
          : [];
        const primaryImg = photosList[0] || undefined;
        const hasRealPhoto = isRealPhoto(primaryImg);

        const priceLabel =
          row['Price Formatted'] || formatPriceLabel(price, mode);

        const recordId = String(row.RecordID || row.UnitCode || `EXCEL-${segment}-${i + 1}`).trim();
        const unitCode = row.UnitCode ? String(row.UnitCode).trim() : null;

        const unit: InventoryUnit = {
          id: recordId,
          code: unitCode || recordId,
          compound: compoundName || resolved.label,
          location: compoundName || resolved.label,
          rawLocation: row.Location || compoundName,
          zone: row.Zone || resolved.zone,
          lat: resolved.lat,
          lng: resolved.lng,
          approxLocation: resolved.approx,
          propertyType: row.PropertyType || 'Apartment',
          type: row.PropertyType || 'Apartment',
          mode,
          status: 'available',
          statusLabel: 'Available',
          price,
          priceLabel,
          egpM: price > 0 ? Number((price / 1_000_000).toFixed(2)) : undefined,
          usd: price > 0 ? egpToUsd(price) : undefined,
          beds: row.Bedrooms ? Number(row.Bedrooms) : null,
          bath: row.Bathrooms ? Number(row.Bathrooms) : null,
          area: row['Area (sqm)'] ? Number(row['Area (sqm)']) : null,
          furnishing: row.Furnishing || undefined,
          img: primaryImg,
          hasPhoto: hasRealPhoto,
          sourceType: 'excel',
          description: row.Description || undefined,
          segment,
          segmentLabel: sheetName,
          tag: row.Source || (sheetName.includes('Owner') ? 'Verified Owner' : 'Verified Broker'),
          party: sheetName.includes('Owner') ? 'Owner' : 'Broker',
        };

        if (!stripPII) {
          (unit as any).contactName = row['Contact Name'];
          (unit as any).contactPhone = row['Contact Phone'];
          (unit as any).whatsAppDirect = row['WhatsApp Direct'];
        }

        units.push(unit);
      }
    }

    return units;
  } catch (err) {
    logger.warn(`[ExcelInventory] Error reading Inventory_with_Photos: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Unified Reader: Ingests listings from:
 * 1. Inventory_with_Photos.xlsx
 * 2. sierra-estates-master-inventory.xlsx (All_Master_Units)
 * 3. sierra-estates-airtable-import.csv
 *
 * CRITICAL RULE: Units with real pictures (hasPhoto: true) are sorted FIRST
 * to give priority to verified photo-backed properties.
 */
export function readExcelListings(options?: {
  sheetName?: string;
  limit?: number;
  stripPII?: boolean;
}): InventoryUnit[] {
  const stripPII = options?.stripPII !== false;

  const photosUnits = readInventoryWithPhotosInternal({
    sheetName: options?.sheetName,
    stripPII,
  });
  const airtableUnits = readAirtableListingsInternal(stripPII);
  const masterExcelUnits = readMasterExcelWorkbookInternal(stripPII);

  const seenCodes = new Set<string>();
  const combinedUnits: InventoryUnit[] = [];

  // Order of ingestion: Photos first, then Airtable, then Master Excel
  const allRaw = [...photosUnits, ...airtableUnits, ...masterExcelUnits];

  for (const u of allRaw) {
    const key = (u.code || u.id || '').trim().toUpperCase();
    if (key && seenCodes.has(key)) continue;
    if (key) seenCodes.add(key);
    combinedUnits.push(u);
  }

  // PRIORITIZATION: Units with pictures (hasPhoto === true) are prioritized first
  combinedUnits.sort((a, b) => {
    const aPhoto = a.hasPhoto ? 1 : 0;
    const bPhoto = b.hasPhoto ? 1 : 0;
    if (bPhoto !== aPhoto) {
      return bPhoto - aPhoto;
    }
    // Secondary sort: Higher priced units first
    return (b.price || 0) - (a.price || 0);
  });

  if (options?.limit && combinedUnits.length > options.limit) {
    return combinedUnits.slice(0, options.limit);
  }

  return combinedUnits;
}

/**
 * Append a newly submitted unit into the appropriate sheet of Inventory_with_Photos.xlsx
 * and simultaneously sync to Supabase listings table.
 */
export async function appendToExcelInventory(
  input: NewExcelListingInput,
  customFilePath?: string
): Promise<{
  success: boolean;
  recordId: string;
  sheetName: string;
  filePath: string;
  error?: string;
}> {
  const filePath = customFilePath || getMasterExcelPath();

  try {
    let wb: XLSX.WorkBook;
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      wb = XLSX.read(buf, { type: 'buffer' });
    } else {
      wb = XLSX.utils.book_new();
    }

    // Determine target sheet
    const isOwner =
      input.sourceType === 'owner' ||
      String(input.source || '').toLowerCase().includes('owner') ||
      Boolean(input.contactName && !input.source?.toLowerCase().includes('broker'));
    const isRent =
      input.operation?.toLowerCase() === 'rent' ||
      (input.price > 0 && input.price < 1_000_000 && input.operation !== 'Sale');

    let sheetName = 'Broker Buy';
    if (isOwner && isRent) sheetName = 'Owners Rent';
    else if (isOwner && !isRent) sheetName = 'Owners Buy';
    else if (!isOwner && isRent) sheetName = 'Broker Rent';
    else sheetName = 'Broker Buy';

    const timestamp = new Date().toISOString();
    const prefix = isOwner ? 'OWNER' : 'BROKER';
    const recordId = input.recordId || `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    const unitCode = input.code || recordId;

    const resolved = resolveLocation(input.compound || input.location || 'New Cairo');

    const formattedPrice =
      input.priceFormatted || formatPriceLabel(input.price, isRent ? 'rent' : 'sale');

    const photoUrlsStr = Array.isArray(input.photoUrls)
      ? input.photoUrls.join(', ')
      : input.photoUrls || '';

    const newRowRecord: Record<string, any> = {
      RecordID: recordId,
      UnitCode: unitCode,
      Compound: input.compound || resolved.label,
      Location: input.location || input.compound || resolved.label,
      Zone: input.zone || resolved.zone,
      PropertyType: input.propertyType || 'Apartment',
      Operation: isRent ? 'Rent' : 'Sale',
      'Price (EGP)': input.price,
      'Price Formatted': formattedPrice,
      'Area (sqm)': input.areaSqm || '',
      Bedrooms: input.bedrooms || '',
      Bathrooms: input.bathrooms || '',
      Furnishing: input.furnishing || 'Unknown',
      'Contact Name': input.contactName || (isOwner ? 'Direct Owner' : 'Broker Desk'),
      'Contact Phone': input.contactPhone || '',
      'WhatsApp Direct': input.whatsAppDirect || (input.contactPhone ? `https://wa.me/${input.contactPhone.replace(/\D/g, '')}` : ''),
      'Inventory Status': input.inventoryStatus || 'Active',
      'Photo Match Status': input.photoMatchStatus || (photoUrlsStr ? 'high-confidence' : 'pending'),
      'Photo URLs': photoUrlsStr,
      Description: input.description || `Added via Sierra Portal on ${new Date().toLocaleDateString()}`,
      Source: input.source || (isOwner ? 'Direct owner' : 'Broker inventory'),
      'Updated At': timestamp,
    };

    // Append to existing sheet or create new
    let existingRows: any[] = [];
    if (wb.Sheets[sheetName]) {
      existingRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    }
    existingRows.push(newRowRecord);

    const newWs = XLSX.utils.json_to_sheet(existingRows, { header: [...EXCEL_COLUMNS] });
    wb.Sheets[sheetName] = newWs;
    if (!wb.SheetNames.includes(sheetName)) {
      wb.SheetNames.push(sheetName);
    }

    const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(filePath, outBuf);
    logger.info(`[ExcelInventory] Successfully appended unit ${recordId} to sheet "${sheetName}" in ${filePath}`);

    // Synchronize to Supabase database (fire and forget / graceful fallback)
    try {
      const supabase = getSupabaseAdmin();
      const primaryPhoto = photoUrlsStr.split(/[\n,;]+/)[0]?.trim() || null;
      await supabase.from('listings').upsert(
        {
          id: recordId,
          code: unitCode,
          ref_id: recordId,
          compound: input.compound || resolved.label,
          location_area: input.location || resolved.label,
          property_type: input.propertyType || 'Apartment',
          deal_type: isRent ? 'rent' : 'sale',
          price: input.price,
          price_currency: 'EGP',
          bedrooms: input.bedrooms ? Number(input.bedrooms) : null,
          bathrooms: input.bathrooms ? Number(input.bathrooms) : null,
          area_sqm: input.areaSqm ? Number(input.areaSqm) : null,
          status: 'active',
          description: input.description || null,
          img: primaryPhoto,
          photos: photoUrlsStr ? photoUrlsStr.split(/[\n,;]+/).map((s) => s.trim()) : [],
          updated_at: timestamp,
        },
        { onConflict: 'id' }
      );
    } catch (dbErr) {
      logger.warn(`[ExcelInventory] Supabase secondary mirror write failed (non-fatal): ${(dbErr as Error).message}`);
    }

    return {
      success: true,
      recordId,
      sheetName,
      filePath,
    };
  } catch (err) {
    const msg = (err as Error).message;
    logger.error(`[ExcelInventory] Failed to append unit to Excel: ${msg}`);
    return {
      success: false,
      recordId: input.recordId || 'UNKNOWN',
      sheetName: 'Error',
      filePath,
      error: msg,
    };
  }
}
