/**
 * lib/server/listing-syndication + lib/server/master-csv-append
 * (Sierra Estates 3.0, Phase 2.4) — multi-destination fan-out contract:
 *
 *  - Supabase upsert keyed on reference_code (units ≡ listings alias);
 *  - coordinates resolved from the unit, else the compounds gazetteer;
 *  - Owners-Rent master CSV append/merge with merge-owners-rent-csv.mjs
 *    semantics (dedupe on unit code + phone tail, richer wins);
 *  - Property Finder feed trigger unavailable on serverless (honest note).
 */
import fs from 'fs';

jest.mock('@sierra-estates/db', () => {
  const fromMock = jest.fn();
  const supabaseAdmin = { from: fromMock };
  return {
    getSupabaseAdmin: () => supabaseAdmin,
    isSupabaseAdminConfigured: () => true,
    insertRecord: jest.fn(),
    __fromMock: fromMock,
  };
});

import {
  resolveListingCoordinates,
  upsertListingInSupabase,
  triggerPropertyFinderFeed,
  syndicateListingBroadcast,
} from '../lib/server/listing-syndication';
import { appendListingToOwnersRentMaster } from '../lib/server/master-csv-append';
import { __fromMock } from '@sierra-estates/db';

const RENT_UNIT = {
  compound: 'Hyde Park',
  dealType: 'rent',
  unitType: 'Apartment',
  areaSqm: 165,
  bedrooms: 3,
  bathrooms: 3,
  price: 25000,
  contactPhone: '+201001234567',
  finishing: 'Fully Finished',
};

function compoundsTableMock(row: Record<string, unknown> | null) {
  __fromMock.mockImplementation((table: string) => {
    if (table !== 'compounds') throw new Error(`unexpected table ${table}`);
    return {
      select: () => ({
        ilike: () => ({
          limit: () => ({
            then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
              resolve({ data: row ? [row] : [], error: null }),
          }),
        }),
      }),
    };
  });
}

function listingsUpsertCapture() {
  const capture: { row: Record<string, unknown>; options: Record<string, unknown> }[] = [];
  __fromMock.mockImplementation((table: string) => {
    if (table !== 'listings') throw new Error(`unexpected table ${table}`);
    return {
      upsert: (row: Record<string, unknown>, options: Record<string, unknown>) => {
        capture.push({ row, options });
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: 'listing-1', ref_id: row.ref_id }, error: null }),
          }),
        };
      },
    };
  });
  return capture;
}

afterEach(() => {
  __fromMock.mockReset();
  jest.restoreAllMocks();
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
});

describe('resolveListingCoordinates', () => {
  it('uses explicit unit coordinates when provided', async () => {
    const result = await resolveListingCoordinates({ ...RENT_UNIT, lat: 30.04, lng: 31.59 });
    expect(result).toEqual({ resolved: true, lat: 30.04, lng: 31.59, source: 'unit' });
  });

  it('resolves through the compounds gazetteer table', async () => {
    compoundsTableMock({ name: 'Hyde Park', lat: 30.0355, lng: 31.5705 });
    const result = await resolveListingCoordinates(RENT_UNIT);
    expect(result.resolved).toBe(true);
    expect(result.source).toBe('compounds-table');
    expect(result.lat).toBeCloseTo(30.0355);
  });

  it('reports unresolved honestly when the compound has no gazetteer row', async () => {
    compoundsTableMock(null);
    const result = await resolveListingCoordinates({ ...RENT_UNIT, compound: 'Unknown Estates' });
    expect(result.resolved).toBe(false);
    expect(result.note).toContain('Unknown Estates');
  });
});

describe('upsertListingInSupabase', () => {
  it('upserts keyed on reference_code with the canonical row shape', async () => {
    const capture = listingsUpsertCapture();
    const result = await upsertListingInSupabase({
      unit: RENT_UNIT,
      unitCode: 'SE-RNT-HYD-0014',
      formattedCaption: 'caption',
      photoUrls: ['https://cdn.example/a.jpg'],
      coordinates: { resolved: true, lat: 30.04, lng: 31.59, source: 'unit' },
    });

    expect(result.ok).toBe(true);
    expect(result.action).toBe('upserted');
    expect(capture).toHaveLength(1);
    expect(capture[0].options).toEqual({ onConflict: 'reference_code' });
    expect(capture[0].row).toMatchObject({
      ref_id: 'SE-RNT-HYD-0014',
      reference_code: 'SE-RNT-HYD-0014',
      compound: 'Hyde Park',
      deal_type: 'rent',
      price: 25000,
      bedrooms: 3,
      area_sqm: 165,
      status: 'active',
      sync_source: 'telegram',
      verified: true,
      latitude: 30.04,
      longitude: 31.59,
    });
  });

  it('reports failure honestly on a PostgREST error', async () => {
    __fromMock.mockImplementation(() => ({
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'duplicate key' } }),
        }),
      }),
    }));
    const result = await upsertListingInSupabase({
      unit: RENT_UNIT,
      unitCode: 'SE-RNT-HYD-0014',
      formattedCaption: 'caption',
      photoUrls: [],
      coordinates: { resolved: false, lat: null, lng: null, source: null },
    });
    expect(result.ok).toBe(false);
    expect(result.action).toBe('failed');
    expect(result.error).toContain('duplicate key');
  });
});

describe('triggerPropertyFinderFeed', () => {
  const origVercel = process.env.VERCEL;
  const origVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (origVercel !== undefined) {
      process.env.VERCEL = origVercel;
    } else {
      delete process.env.VERCEL;
    }
    if (origVercelEnv !== undefined) {
      process.env.VERCEL_ENV = origVercelEnv;
    } else {
      delete process.env.VERCEL_ENV;
    }
    jest.restoreAllMocks();
  });

  it('reports the operator command on serverless runtimes', () => {
    process.env.VERCEL = '1';
    const result = triggerPropertyFinderFeed();
    expect(result.triggered).toBe(false);
    expect(result.mode).toBe('unavailable');
    expect(result.note).toContain('generate-photos-propertyfinder-feed.mjs');
    expect(result.note).toContain('Run:');
  });

  it('reports unavailable when the script is not reachable from cwd', () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const result = triggerPropertyFinderFeed();
    expect(result.triggered).toBe(false);
    expect(result.mode).toBe('unavailable');
    expect(result.note).toContain('Run:');
  });
});

describe('appendListingToOwnersRentMaster', () => {
  const SAMPLE_CSV =
    'Unit Code,Compound / Community,Zone / Area,Property Type,Monthly Rent (EGP),Rent Display,Area (sqm),Bedrooms,Bathrooms,Furnishing,Owner / Contact Name,Owner Phone,Direct WhatsApp,Listing Status,Source Channel,Listing Notes,Record ID\r\n' +
    'NC-4U-95M+V,New Cairo,New Cairo,Apartment,Price on Call,Price on Call,Upon Request,4,Upon Request,Fully Finished,Kareem,201100834387.0,https://wa.me/201100834387,Available for Rent,Direct Owner Intake,notes,INV-1\r\n';

  it('skips sale listings honestly (rentals ledger only)', async () => {
    const result = await appendListingToOwnersRentMaster(
      { ...RENT_UNIT, dealType: 'sale' },
      'caption',
    );
    expect(result.action).toBe('skipped');
    expect(result.ok).toBe(true);
    expect(result.note).toContain('Sale listings');
  });

  it('reports unavailable when the master file is absent on this runtime', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const result = await appendListingToOwnersRentMaster(RENT_UNIT, 'caption');
    expect(result.action).toBe('unavailable');
    expect(result.ok).toBe(false);
    expect(result.note).toContain('merge-owners-rent-csv.mjs');
  });

  it('appends a rent row with the canonical unit code and TG- record id', async () => {
    const writeMock = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(SAMPLE_CSV);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = await appendListingToOwnersRentMaster(RENT_UNIT, 'caption text');

    expect(result.action).toBe('appended');
    expect(result.ok).toBe(true);
    const written = writeMock.mock.calls[0][1] as string;
    expect(written).toContain('SE-RNT-HYD-');
    expect(written).toContain('TG-SE-RNT-HYD-');
    expect(written).toContain('Telegram Channel Broadcast');
    expect(written).toContain('Hyde Park');
    // Existing row preserved.
    expect(written).toContain('INV-1');
  });

  it('merges (updates) instead of duplicating when the unit code already exists', async () => {
    const writeMock = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const existing = SAMPLE_CSV.replace(
      'NC-4U-95M+V',
      'SE-RNT-HYD-0014',
    );
    jest.spyOn(fs, 'readFileSync').mockReturnValue(existing);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = await appendListingToOwnersRentMaster(
      { ...RENT_UNIT, code: 'SE-RNT-HYD-0014' },
      'caption text',
    );

    expect(result.action).toBe('updated');
    const written = writeMock.mock.calls[0][1] as string;
    const dataRows = written.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('Unit Code'));
    const codeRows = dataRows.filter((l) => l.split(',')[0].trim() === 'SE-RNT-HYD-0014');
    expect(codeRows).toHaveLength(1); // merged in place — no duplicate row
    expect(written).toContain('TG-SE-RNT-HYD-0014');
  });
});

describe('syndicateListingBroadcast — orchestration', () => {
  it('fans the broadcast out to all destinations with a single report', async () => {
    const capture = listingsUpsertCapture();
    jest.spyOn(fs, 'existsSync').mockReturnValue(false); // master csv absent

    const result = await syndicateListingBroadcast({
      unit: RENT_UNIT,
      formattedCaption: 'caption',
      photoUrls: ['https://cdn.example/a.jpg'],
    });

    expect(result.unitCode).toMatch(/^SE-RNT-HYD-\d{3,6}$/);
    expect(capture).toHaveLength(1);
    expect(result.supabase.ok).toBe(true);
    expect(result.masterCsv.action).toBe('unavailable');
    expect(result.propertyFinder.mode).toBe('unavailable'); // spawn path blocked in test env
    expect(result.coordinates.resolved).toBe(false); // no compounds row mocked
  });
});
