/**
 * P0-D REGRESSION — /api/feeds/property-finder file-fallback bypass CLOSED
 * + canonical-query semantics (2026-10-21 vocabulary fix).
 *
 * Until 2026-10-20 the GET route served a pre-generated XML
 * (public/feeds/propertyfinder-feed.xml) verbatim BEFORE the canonical
 * publish-gated query could run, so ~1,762 stale owner-scraped
 * (OWNERS-AUG26-*) ads — including price-on-application rows — were served as
 * the LIVE production feed. That bypass is closed (test 1).
 *
 * The canonical query itself was then found permanently empty (2026-10-21):
 * it asked for status='available' — a value no canonical row carries (the
 * table + public RLS policy use 'active') — and filtered an `ownerType`
 * field that no row provides. These tests pin the corrected semantics:
 * status='active', publish_status='PUBLISHABLE', explicit-evidence broker
 * attribution via source_channel, for-sale deal_type only (rent rows must
 * never be mislabelled as for-sale), and PostgREST-safe pagination.
 */

type Chain = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  gte: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
};

const pages: Array<{ data: unknown[] | null; error: { message: string } | null }> = [];
const eqCalls: Array<[string, unknown]> = [];
const inCalls: Array<[string, unknown[]]> = [];
const gteCalls: Array<[string, unknown]> = [];
const orCalls: Array<string> = [];
const rangeCalls: Array<[number, number]> = [];

function makeChain(): Chain {
  const chain = {} as Chain;
  chain.select = jest.fn().mockReturnThis();
  chain.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return chain;
  });
  chain.in = jest.fn((col: string, vals: unknown[]) => {
    inCalls.push([col, vals]);
    return chain;
  });
  chain.gte = jest.fn((col: string, val: unknown) => {
    gteCalls.push([col, val]);
    return chain;
  });
  chain.or = jest.fn((expr: string) => {
    orCalls.push(expr);
    return chain;
  });
  chain.order = jest.fn().mockReturnThis();
  chain.range = jest.fn((from: number, to: number) => {
    rangeCalls.push([from, to]);
    const page = pages[Math.floor(from / 1000)] ?? { data: [], error: null };
    return Promise.resolve(page);
  });
  return chain;
}

const fromMock = jest.fn(() => makeChain());

jest.mock('@sierra-estates/db', () => ({
  getSupabase: () => ({ from: (...a: unknown[]) => fromMock(...a) }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import fs from 'fs';
import path from 'path';
import { GET } from '../app/api/feeds/property-finder/route';

const LEGACY_FEED_PATH = path.join(process.cwd(), 'public', 'feeds', 'propertyfinder-feed.xml');
const FAKE_XML = `<?xml version="1.0"?><list><property><reference_number>OWNERS-AUG26-00001</reference_number><price>0</price></property></list>`;

beforeAll(() => {
  fs.mkdirSync(path.dirname(LEGACY_FEED_PATH), { recursive: true });
  fs.writeFileSync(LEGACY_FEED_PATH, FAKE_XML, 'utf8');
});

afterAll(() => {
  try { fs.rmSync(path.dirname(LEGACY_FEED_PATH), { recursive: true, force: true }); } catch { /* best effort */ }
});

/** A canonical listings row (snake_case) that passes every export filter. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    code: 'SE-SL-HYD-0142',
    ref_id: 'OOA775',
    compound: 'Hyde Park',
    location_area: 'New Cairo',
    city: 'New Cairo',
    property_type: 'Apartment',
    deal_type: 'sale',
    price: 11_500_000,
    bedrooms: 3,
    bathrooms: 2,
    area_sqm: 180,
    images: ['https://img.example/1.jpg'],
    source_channel: 'broker_portal',
    ...overrides,
  };
}

describe('P0-D: the pre-generated XML fallback can never shadow the publish gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages.length = 0;
    eqCalls.length = 0;
    rangeCalls.length = 0;
  });

  it('a planted legacy feed file is IGNORED — no eligible inventory yields an honest empty <list>', async () => {
    pages.push({ data: [], error: null });

    const res = await GET();
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('<list>');
    expect(xml).not.toContain('OWNERS-AUG26-00001'); // the planted file's content
    expect((xml.match(/<property>/g) || []).length).toBe(0);
  });

  it('queries the canonical table with the ACTIVE status vocabulary + publish gate', async () => {
    pages.push({ data: [row()], error: null });

    await GET();

    expect(fromMock).toHaveBeenCalledWith('listings');
    expect(eqCalls).toContainEqual(['status', 'active']);
    expect(eqCalls).toContainEqual(['publish_status', 'PUBLISHABLE']);
    // regression pin: the old vocabulary that permanently zeroed the feed
    expect(eqCalls).not.toContainEqual(['status', 'available']);
    // for-sale membership + plausibility floor are enforced in-query
    expect(inCalls).toContainEqual(['deal_type', ['sale', 'resale']]);
    expect(gteCalls).toContainEqual(['price', 2_000_000]);
    expect(orCalls[0] || '').toContain('source_channel');
  });

  it('exports broker-attributed for-sale rows and never mislabels rent as for-sale', async () => {
    pages.push({
      data: [
        row(),                                                    // exported (sale, 11.5M)
        row({ id: 'r-2', code: 'SE-RS-001', deal_type: 'resale' }), // exported (resale is for-sale)
        row({ id: 'r-3', code: 'SE-RT-001', deal_type: 'rent' }),   // NEVER exported
        row({ id: 'r-4', code: 'SE-OW-001', source_channel: 'owner_direct' }), // owner channel: skipped
        row({ id: 'r-5', code: 'SE-AM-001', source_channel: '' }),  // ambiguous: skipped
        row({ id: 'r-6', code: 'SE-PF-001', source_channel: 'property-finder' }), // hyphen spelling: broker
      ],
      error: null,
    });

    const xml = await (await GET()).text();

    expect((xml.match(/<property>/g) || []).length).toBe(3);
    expect(xml).toContain('SE-SL-HYD-0142');
    expect(xml).toContain('SE-RS-001');
    expect(xml).toContain('SE-PF-001');
    expect(xml).not.toContain('SE-RT-001');
    expect(xml).not.toContain('SE-OW-001');
    expect(xml).not.toContain('SE-AM-001');
  });

  it('rent-scale prices are never advertised as for-sale (2M EGP plausibility floor)', async () => {
    pages.push({
      data: [
        row({ id: 'r-f1', code: 'SE-FLOOR-OK', price: 2_500_000 }),  // exported (above floor)
        row({ id: 'r-f2', code: 'SE-FLOOR-150K', price: 150_000 }),   // rent-scale: NEVER exported
        row({ id: 'r-f3', code: 'SE-FLOOR-190K', price: 190_000 }),   // rent-scale: NEVER exported
        row({ id: 'r-f4', code: 'SE-FLOOR-1M', price: 1_000_000 }),   // borderline: NEVER exported
      ],
      error: null,
    });

    const xml = await (await GET()).text();

    expect((xml.match(/<property>/g) || []).length).toBe(1);
    expect(xml).toContain('SE-FLOOR-OK');
    expect(xml).not.toContain('SE-FLOOR-150K');
    expect(xml).not.toContain('SE-FLOOR-190K');
    expect(xml).not.toContain('SE-FLOOR-1M');
  });

  it('units missing required fields are skipped, not invented', async () => {
    pages.push({
      data: [
        row(),                                // exported
        row({ id: 'r-b', bathrooms: null }),  // skipped: bathrooms missing
        row({ id: 'r-c', price: 0 }),         // skipped: no real price
        row({ id: 'r-d', property_type: null }), // skipped: no type
      ],
      error: null,
    });

    const xml = await (await GET()).text();

    expect((xml.match(/<property>/g) || []).length).toBe(1);
    expect(xml).toContain('SE-SL-HYD-0142');
    expect(xml).toContain('11500000');
  });

  it('paginates past the PostgREST 1000-row cap with .range()', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row({ id: `p-${i}`, code: `SE-PG-${i}` }));
    pages.push({ data: full, error: null });
    pages.push({ data: [row({ id: 'p-2', code: 'SE-PG-2ND' })], error: null });

    await GET();

    expect(rangeCalls.length).toBeGreaterThanOrEqual(2);
    expect(rangeCalls[0]).toEqual([0, 999]);
    expect(rangeCalls[1]).toEqual([1000, 1999]);
  });

  it('a database error degrades to the honest empty feed (no fallback fabricaton)', async () => {
    pages.push({ data: null, error: { message: 'boom' } });

    const res = await GET();
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect((xml.match(/<property>/g) || []).length).toBe(0);
  });

  it('serves XML content-type with bounded caching', async () => {
    pages.push({ data: [row()], error: null });

    const res = await GET();

    expect(res.headers.get('content-type')).toContain('application/xml');
    expect(res.headers.get('cache-control')).toMatch(/max-age=\d+/);
  });
});
