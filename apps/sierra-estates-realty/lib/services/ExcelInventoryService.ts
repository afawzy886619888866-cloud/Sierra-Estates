import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { logger } from '../logger';
import { resolveLocation } from '../inventory/gazetteer';
import { getSupabaseAdmin } from '@sierra-estates/db';
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
 * Resolve master Excel inventory workbook location.
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
 * Read real listings from Inventory_with_Photos.xlsx
 */
export function readExcelListings(options?: {
  sheetName?: string;
  limit?: number;
  stripPII?: boolean;
}): InventoryUnit[] {
  const stripPII = options?.stripPII !== false; // default true for public safety
  const filePath = getMasterExcelPath();

  if (!fs.existsSync(filePath)) {
    logger.warn(`[ExcelInventory] Master workbook not found at ${filePath}`);
    return [];
  }

  try {
    const wb = XLSX.readFile(filePath);
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

        const priceLabel =
          row['Price Formatted'] ||
          (price > 0
            ? mode === 'rent'
              ? `${price.toLocaleString('en-US')} EGP / mo`
              : price >= 1_000_000
                ? `${(price / 1_000_000).toFixed(1)}M EGP`
                : `${price.toLocaleString('en-US')} EGP`
            : 'Price on request');

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
          usd: price > 0 ? (mode === 'rent' ? Math.round(price / 50) : Math.round(price / 48.5)) : undefined,
          beds: row.Bedrooms ? Number(row.Bedrooms) : null,
          bath: row.Bathrooms ? Number(row.Bathrooms) : null,
          area: row['Area (sqm)'] ? Number(row['Area (sqm)']) : null,
          furnishing: row.Furnishing || undefined,
          img: primaryImg,
          description: row.Description || undefined,
          segment,
          segmentLabel: sheetName,
          tag: row.Source || (sheetName.includes('Owner') ? 'Verified Owner' : 'Verified Broker'),
          party: sheetName.includes('Owner') ? 'Owner' : 'Broker',
        };

        // Only attach PII if stripPII is explicitly disabled (e.g. for internal admin)
        if (!stripPII) {
          (unit as any).contactName = row['Contact Name'];
          (unit as any).contactPhone = row['Contact Phone'];
          (unit as any).whatsAppDirect = row['WhatsApp Direct'];
        }

        units.push(unit);

        if (options?.limit && units.length >= options.limit) {
          return units;
        }
      }
    }

    return units;
  } catch (err) {
    logger.warn(`[ExcelInventory] Error reading master workbook: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Append a newly submitted unit into the appropriate sheet of Inventory_with_Photos.xlsx
 * and simultaneously sync to Supabase listings table.
 */
export async function appendToExcelInventory(input: NewExcelListingInput): Promise<{
  success: boolean;
  recordId: string;
  sheetName: string;
  filePath: string;
  error?: string;
}> {
  const filePath = getMasterExcelPath();

  try {
    let wb: XLSX.WorkBook;
    if (fs.existsSync(filePath)) {
      wb = XLSX.readFile(filePath);
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
      input.priceFormatted ||
      (input.price > 0
        ? isRent
          ? `${input.price.toLocaleString('en-US')} EGP / mo`
          : input.price >= 1_000_000
            ? `${(input.price / 1_000_000).toFixed(1)}M EGP`
            : `${input.price.toLocaleString('en-US')} EGP`
        : 'Price on request');

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

    XLSX.writeFile(wb, filePath);
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
