/**
 * /api/inventory — PUBLISH GATE (activation plan Phase D).
 *
 * This is a public, unauthenticated, CDN-cached endpoint that feeds the
 * public inventory map (InventoryMap, PropertiesPage, HomePage) and the
 * admin dashboard "same units real clients see" charts. It must therefore:
 *
 *   - filter `publish_status = 'PUBLISHABLE'` INSIDE the Supabase query —
 *     the deployed RLS policy does not yet enforce publish_status
 *     (migration 020 is pending), so this app-layer gate is what keeps the
 *     ~500 unverified units off the public map;
 *   - pass the same gate to the domain tier (InventoryQueryService) so the
 *     fallback is gated too;
 *   - serve NO unverified local-file tiers (Excel workbook, Airtable,
 *     WhatsApp-ingested demo-group units, sheet, snapshot) — removed with
 *     the /api/listings Phase E doctrine: honest empty beats unreviewed; and
 *   - never invent a 'New Cairo' location for rows that carry none (§21).
 */

// Universal chainable thenable: every builder method returns the builder, and
// awaiting the builder resolves the stored result — mirrors the PostgREST
// client contract (.from().select().eq().order().limit() and bare
// .from().select() both work).
function makeChain(result: { data: unknown; error: unknown }, log: Array<[string, unknown[]]>, table: string) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'in', 'range', 'ilike', 'like']) {
    c[m] = (...args: unknown[]) => {
      log.push([`${table}.${m}`, args]);
      return c;
    };
  }
  c.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return c;
}

const listRecordsMock = jest.fn();
const getSupabaseImpl = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getSupabase: (...args: unknown[]) => getSupabaseImpl(...args),
  getSupabaseAdmin: jest.fn(),
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  getRecord: jest.fn(async () => null),
  insertRecord: jest.fn(async () => ({ id: 'demo' })),
  upsertRecord: jest.fn(async () => ({})),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  applyRateLimit: async () => null,
  publicEndpointLimiter: {},
}));

import { GET } from '@/app/api/inventory/route';
import { queryUnitToMapUnit } from '@/lib/inventory/domain-map';

describe('queryUnitToMapUnit — honest location labels (§21)', () => {
  it('canoncializes a gazetteer-matched location', () => {
    const u = queryUnitToMapUnit({
      id: 'd1',
      code: 'D1',
      title: 'Unit',
      compound: 'Mivida',
      location: 'Mivida',
      city: 'New Cairo',
      propertyType: 'Apartment',
      category: 'sale',
      status: 'available',
      price: 9_000_000,
      area: 200,
      bedrooms: 3,
      ownerType: 'broker',
      ownerContact: '+201000000000',
    });
    expect(u.location).toBe('Mivida');
    expect(u.zone).toBeTruthy();
    // PII strip: ownerContact never crosses to the public map shape.
    expect((u as Record<string, unknown>).ownerContact).toBeUndefined();
  });

  it('never invents a "New Cairo" label for an unknown or missing location', () => {
    const base = {
      id: 'd2',
      code: 'D2',
      title: 'Unit',
      propertyType: 'Apartment',
      category: 'sale',
      status: 'available' as const,
      price: 5_000_000,
      area: 150,
      bedrooms: 2,
      ownerType: 'broker' as const,
      ownerContact: '+201000000000',
    };
    // Unknown compound: the raw string surfaces, not the centroid label.
    const unknown = queryUnitToMapUnit({ ...base, compound: 'Totally Unknown Place', location: 'Totally Unknown Place', city: '' });
    expect(unknown.location).toBe('Totally Unknown Place');
    expect(unknown.approxLocation).toBe(true);
    // No location at all: honest empty label, centroid pin flagged approx.
    const empty = queryUnitToMapUnit({ ...base, compound: '', location: '', city: '' });
    expect(empty.location).toBe('');
    expect(empty.approxLocation).toBe(true);
  });
});

const PUBLISHABLE_ROW = {
  id: 'live-gated-1',
  ref_id: 'PF-GATED-1',
  code: 'PF-GATED-1',
  title: '3 Bed Apartment in Mivida',
  compound: 'Mivida',
  location_area: 'Mivida',
  property_type: 'Apartment',
  deal_type: 'sale',
  price: 9_000_000,
  status: 'active',
  bedrooms: 3,
  bathrooms: 3,
  area_sqm: 190,
  latitude: 30.04,
  longitude: 31.58,
  images: ['https://static.shared.propertyfinder.eg/media/images/listing/x/1.jpg'],
};

describe('GET /api/inventory — publish gate (Phase D)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listRecordsMock.mockResolvedValue([]);
  });

  it('filters publish_status = PUBLISHABLE inside the Supabase query', async () => {
    const calls: Array<[string, unknown[]]> = [];
    getSupabaseImpl.mockReturnValue({
      from: (t: string) => makeChain({ data: [PUBLISHABLE_ROW], error: null }, calls, t),
    });

    const res = await GET(new Request('http://localhost/api/inventory'));
    expect(res.status).toBe(200);
    const body = await res.json();

    // The gate ran inside the query (defense-in-depth ahead of RLS 020).
    const eqCalls = calls.filter(([label]) => label === 'listings.eq');
    expect(eqCalls).toContainEqual(['listings.eq', ['publish_status', 'PUBLISHABLE']]);
    expect(eqCalls).toContainEqual(['listings.eq', ['status', 'active']]);

    expect(body.source).toBe('supabase');
    expect(body.units).toHaveLength(1);
    expect(body.units[0].compound).toBe('Mivida');
  });

  it('never labels a location-less row "New Cairo" (§21 honest empty)', async () => {
    const row = { ...PUBLISHABLE_ROW, id: 'no-loc', compound: null, location_area: null };
    getSupabaseImpl.mockReturnValue({
      from: (t: string) => makeChain({ data: [row], error: null }, [], t),
    });

    const res = await GET(new Request('http://localhost/api/inventory'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.units).toHaveLength(1);
    // Unknown location surfaces as '' — the map pin may fall back to the
    // service-area centroid (approxLocation: true), but the LABEL is never
    // an invented 'New Cairo'.
    expect(body.units[0].compound).toBe('');
    expect(body.units[0].location).toBe('');
    expect(body.units[0].approxLocation).toBe(true);
  });

  it('gates the domain (InventoryQueryService) fallback tier too', async () => {
    // Supabase tier fails → domain tier must carry the same publish gate.
    getSupabaseImpl.mockImplementation(() => {
      throw new Error('[supabase] anon env absent');
    });
    listRecordsMock.mockResolvedValue([
      {
        id: 'domain-gated-1',
        code: 'DOM-1',
        compound: 'Hyde Park',
        location: 'Hyde Park',
        status: 'available',
        price: 7_500_000,
        propertyType: 'Apartment',
        bedrooms: 3,
        area: 180,
        ownerType: 'broker',
      },
    ]);

    const res = await GET(new Request('http://localhost/api/inventory'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.source).toBe('domain');
    const [table, options] = listRecordsMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(table).toBe('listings');
    expect(options.where).toEqual([
      { column: 'status', op: 'in', value: ['available'] },
      // PUBLISH GATE (Phase D): public caller passes publishStatus so only
      // verified rows leave the database.
      { column: 'publish_status', op: 'in', value: ['PUBLISHABLE'] },
    ]);
    expect(body.units).toHaveLength(1);
    // queryUnitToMapUnit maps the compound into `location` (public map shape).
    expect(body.units[0].location).toBe('Hyde Park');
  });

  it('returns an honest empty inventory (source: none) when nothing is verified', async () => {
    getSupabaseImpl.mockReturnValue({
      from: (t: string) => makeChain({ data: [], error: null }, [], t),
    });
    listRecordsMock.mockResolvedValue([]);

    const res = await GET(new Request('http://localhost/api/inventory'));
    expect(res.status).toBe(200);
    const body = await res.json();

    // ANTI-FABRICATION / Phase E: no Excel / WhatsApp-ingested / sheet /
    // snapshot tier — unverified rows never reach the public map.
    expect(body.source).toBe('none');
    expect(body.units).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('serves no unverified WhatsApp-ingested or Excel workbook units (no local-file tiers)', async () => {
    getSupabaseImpl.mockReturnValue({
      from: (t: string) => makeChain({ data: [], error: null }, [], t),
    });
    // Even when the domain tier returns rows, they must be the gated query's
    // rows — the local-file merges (whatsapp-ingested-units.json, Excel
    // workbooks) were removed from this public response entirely.
    listRecordsMock.mockResolvedValue([]);

    const res = await GET(new Request('http://localhost/api/inventory?sheetOnly=true'));
    const body = await res.json();
    expect(body.units).toEqual([]);
    expect(body.count).toBe(0);
  });
});
