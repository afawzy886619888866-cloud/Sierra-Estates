/**
 * /api/listings?limit= — legacy envelope mode.
 *
 * The /explore portal (app/client/portalData.ts fetchListings) reads this
 * mode. It used to require `publishToClient === true`, but the deployed
 * public.listings table has no publish_to_client column (the field parks in
 * raw_data), so every live row was filtered out and the portal silently fell
 * back to its eight static FALLBACK_LISTINGS. The envelope must instead:
 *
 *   - query only publicly-visible statuses (the live table buries ~9.7k
 *     archived rows above the active ones, so the filter must run inside
<<<<<<< HEAD
 *     the query, not after it), and
=======
 *     the query, not after it),
 *   - gate the query on publish_status = 'PUBLISHABLE' (activation plan
 *     Phase D — the public client may only ever see verified inventory), and
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
 *   - treat an explicit `publishToClient: false` in raw_data as a moderation
 *     off-switch while letting unflagged live rows through.
 *
 * Public submissions stay excluded: /api/listings/submit writes them as
<<<<<<< HEAD
 * `pending` AND parks `publishToClient: false` in raw_data.
 */
const listMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listMock(...args),
  getRecord: jest.fn(async () => null),
=======
 * `pending` AND parks `publishToClient: false` in raw_data. When the live
 * read fails or nothing verified is published the honest answer is an EMPTY
 * envelope (source: 'none') — never snapshot/seed data (Phase E).
 */
const listMock = jest.fn();
const getRecordMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listMock(...args),
  getRecord: (...args: unknown[]) => getRecordMock(...args),
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  insertRecord: jest.fn(async () => ({ id: 'demo' })),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  applyRateLimit: async () => null,
  publicEndpointLimiter: {},
}));

import { GET } from '@/app/api/listings/route';

const liveRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'live-pf-1',
  refId: 'PF-01JMFXD63MAQEF8MW0QNXD96N8',
  title: '3 Bed Apartment in Uptown Cairo',
  price: 8_000_000,
  compound: 'Uptown Cairo',
  locationArea: 'Uptown Cairo',
  propertyType: 'Apartment',
  dealType: 'sale',
  bedrooms: 3,
  bathrooms: 3,
  areaSqm: 190,
  status: 'active',
  images: ['https://static.shared.propertyfinder.eg/media/images/listing/x/1.jpg'],
  description: 'Live Property Finder listing',
  rawData: {},
  ...overrides,
});

<<<<<<< HEAD
=======
describe('GET /api/listings?id= — fetch-by-id mode (Phase D publish gate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRecordMock.mockResolvedValue(null);
  });

  it('serves a PUBLISHABLE row by direct id', async () => {
    getRecordMock.mockResolvedValueOnce(
      liveRow({ id: 'live-pf-1', publishStatus: 'PUBLISHABLE' })
    );

    const res = await GET(new Request('http://localhost/api/listings?id=live-pf-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.listing.title).toContain('Uptown Cairo');
  });

  it('404s an unverified-but-active row (REVIEW_REQUIRED) — no direct-link leak', async () => {
    // /api/listings/submit hands the caller the new id, so fetch-by-id must
    // not become a direct link to an unreviewed submission even when its
    // status is publicly visible ('active').
    getRecordMock.mockResolvedValueOnce(
      liveRow({ id: 'unverified-1', publishStatus: 'REVIEW_REQUIRED' })
    );

    const res = await GET(new Request('http://localhost/api/listings?id=unverified-1'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Listing not found');
  });

  it('404s a row with no publish_status at all (fail-closed)', async () => {
    getRecordMock.mockResolvedValueOnce(liveRow({ id: 'legacy-1' }));

    const res = await GET(new Request('http://localhost/api/listings?id=legacy-1'));
    expect(res.status).toBe(404);
  });
});

>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
describe('GET /api/listings?limit= — envelope mode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serves live rows without a publishToClient flag (live schema has no column)', async () => {
    listMock.mockResolvedValueOnce([liveRow()]);

    const res = await GET(new Request('http://localhost/api/listings?limit=24'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.listings).toHaveLength(1);
    expect(body.listings[0].title).toContain('Uptown Cairo');
    expect(body.listings[0].image).toContain('propertyfinder');
    expect(body.listings[0].purpose).toBe('for-sale');
  });

<<<<<<< HEAD
  it('filters status and orders newest-first inside the query, not after it', async () => {
=======
  it('filters status AND publish_status inside the query, and orders newest-first', async () => {
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    listMock.mockResolvedValueOnce([]);

    await GET(new Request('http://localhost/api/listings?limit=24'));

    expect(listMock).toHaveBeenCalledTimes(1);
    const [table, options] = listMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(table).toBe('listings');
    // The live table has ~9.7k archived rows; without this where clause the
    // first `limit` rows would all be archived and the page would render empty.
    expect(options.where).toEqual([
      { column: 'status', op: 'in', value: ['active', 'available'] },
<<<<<<< HEAD
=======
      // PUBLISH GATE (activation plan Phase D): only verified PUBLISHABLE
      // units may reach the public surface — status alone is not enough.
      { column: 'publish_status', op: 'eq', value: 'PUBLISHABLE' },
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    ]);
    expect(options.orderBy).toEqual({ column: 'updatedAt', ascending: false });
    expect(options.limit).toBe(24);
  });

  it('hides a row whose raw_data parks publishToClient=false (moderation off-switch)', async () => {
    listMock.mockResolvedValueOnce([
      liveRow(),
      liveRow({ id: 'live-hidden', rawData: { publishToClient: false } }),
    ]);

    const res = await GET(new Request('http://localhost/api/listings?limit=24'));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.listings).toHaveLength(1);
    expect(body.listings[0].id).not.toBe('live-hidden');
  });

<<<<<<< HEAD
  it('falls back to seed data (never a 5xx) when the live read fails', async () => {
=======
  it('returns an honest empty envelope (never 5xx, never fabricated data) when the live read fails', async () => {
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    listMock.mockRejectedValueOnce(new Error('[supabase:list listings] connection refused'));

    const res = await GET(new Request('http://localhost/api/listings?limit=24'));
    expect(res.status).toBe(200);
    const body = await res.json();

<<<<<<< HEAD
    expect(body.success).toBe(true);
    expect(body.seeded).toBe(true);
    expect(Array.isArray(body.listings)).toBe(true);
    expect(body.listings.length).toBeGreaterThan(0);
=======
    // ANTI-FABRICATION (activation plan Phase E): the snapshot fallback was
    // removed. A failed read yields an explicit honest-empty envelope.
    expect(body.success).toBe(true);
    expect(body.seeded).toBe(false);
    expect(body.source).toBe('none');
    expect(body.listings).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('returns the same honest empty envelope when nothing verified is published yet', async () => {
    listMock.mockResolvedValueOnce([]);

    const res = await GET(new Request('http://localhost/api/listings?limit=24'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.seeded).toBe(false);
    expect(body.source).toBe('none');
    expect(body.listings).toEqual([]);
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  });
});
