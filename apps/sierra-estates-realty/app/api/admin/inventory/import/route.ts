import { NextRequest, NextResponse } from 'next/server';
import { insertRecord, upsertRecords } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyAdminRequest } from '@/lib/server/auth-guard';

const CHUNK_SIZE = 75;
const MAX_ROWS = 5000;

type ImportUnit = {
  id: string;
  sierraCode: string | null;
  type: string;
  compound: string;
  location: string;
  operation: 'Sale' | 'Rent' | 'Unknown';
  price: number;
  currency: 'EGP' | 'USD';
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  finishing: string;
  sourceType: 'owner' | 'broker' | 'unknown';
  sourceGroup: string;
  contact_info: string;
  ownerName: string;
  status: 'Available' | 'Sold' | 'Rented';
  listedAt: string;
  description: string;
  listings_count: number;
  all_codes: string;
};

function isValidUnit(value: unknown): value is ImportUnit {
  if (!value || typeof value !== 'object') return false;
  const unit = value as Partial<ImportUnit>;
  return (
    typeof unit.id === 'string' &&
    typeof unit.compound === 'string' &&
    unit.compound.trim().length > 0 &&
    typeof unit.type === 'string' &&
    (unit.operation === 'Sale' || unit.operation === 'Rent' || unit.operation === 'Unknown') &&
    typeof unit.price === 'number' &&
    Number.isFinite(unit.price) &&
    (unit.area_sqm === null || (typeof unit.area_sqm === 'number' && Number.isFinite(unit.area_sqm))) &&
    typeof unit.contact_info === 'string' &&
    unit.contact_info.trim().length > 0
  );
}

function toListing(unit: ImportUnit) {
  const referenceCode = unit.sierraCode?.trim() || unit.id;
  return {
    id: referenceCode,
    referenceCode,
    refId: referenceCode,
    code: referenceCode,
    title: `${unit.type} in ${unit.compound}`,
    description: unit.description || null,
    compound: unit.compound,
    locationArea: unit.location || unit.compound,
    propertyType: unit.type,
    dealType: unit.operation === 'Rent' ? 'rent' : 'sale',
    price: unit.price,
    priceCurrency: unit.currency,
    bedrooms: unit.bedrooms ?? 0,
    bathrooms: unit.bathrooms ?? 0,
    areaSqm: unit.area_sqm ?? 0,
    finishingType: unit.finishing || null,
    status: unit.status === 'Available' ? 'available' : unit.status.toLowerCase(),
    verified: false,
    publishToClient: false,
    ownerType: unit.sourceType === 'owner' ? 'Owner' : unit.sourceType === 'broker' ? 'Broker' : null,
    ownerPhone: unit.sourceType === 'owner' ? unit.contact_info : null,
    ownerName: unit.sourceType === 'owner' ? unit.ownerName || null : null,
    brokerPhone: unit.sourceType === 'broker' ? unit.contact_info : null,
    brokerName: unit.sourceType === 'broker' ? unit.ownerName || null : null,
    sourceChannel: 'excel',
    syncSource: 'manual',
    rawData: {
      origin: 'excel_import',
      sourceGroup: unit.sourceGroup,
      listedAt: unit.listedAt,
      listingsCount: unit.listings_count,
      allCodes: unit.all_codes,
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated || !auth.uid) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const units: unknown = body?.units;
    const confirmed = body?.confirmed === true;

    if (!confirmed) {
      return NextResponse.json({ error: 'Explicit import confirmation is required' }, { status: 400 });
    }
    if (!Array.isArray(units) || units.length === 0 || units.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `units must contain between 1 and ${MAX_ROWS} rows` },
        { status: 400 },
      );
    }

    const invalidIndexes = units.reduce<number[]>((indexes, unit, index) => {
      if (!isValidUnit(unit)) indexes.push(index);
      return indexes;
    }, []);
    if (invalidIndexes.length > 0) {
      return NextResponse.json(
        { error: 'Import contains invalid rows', invalidIndexes: invalidIndexes.slice(0, 50) },
        { status: 422 },
      );
    }

    const listings = (units as ImportUnit[]).map(toListing);
    const written = await upsertRecords('listings', listings, 'reference_code', CHUNK_SIZE);

    await insertRecord('audit_logs', {
      actorUid: auth.uid,
      actorEmail: auth.email || null,
      action: 'inventory.excel_import',
      target: 'listings',
      after: {
        rowCount: written.length,
        chunkSize: CHUNK_SIZE,
        references: listings.map((listing) => listing.referenceCode).slice(0, 100),
      },
    });

    return NextResponse.json({
      success: true,
      imported: written.length,
      chunkSize: CHUNK_SIZE,
    });
  } catch (error) {
    logger.error('[inventory-import] Import failed:', error);
    return NextResponse.json(
      { error: 'Inventory import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
