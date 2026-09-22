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
 *     the query, not after it), and
 *   - treat an explicit `publishToClient: false` in raw_data as a moderation
 *     off-switch while letting unflagged live rows through.
 *
 * Public submissions stay excluded: /api/listings/submit writes them as
 * `pending` AND parks `publishToClient: false` in raw_data.
 */
const listMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listMock(...args),
  getRecord: jest.fn(async () => null),
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

  it('filters status and orders newest-first inside the query, not after it', async () => {
    listMock.mockResolvedValueOnce([]);

    await GET(new Request('http://localhost/api/listings?limit=24'));

    expect(listMock).toHaveBeenCalledTimes(1);
    const [table, options] = listMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(table).toBe('listings');
    // The live table has ~9.7k archived rows; without this where clause the
    // first `limit` rows would all be archived and the page would render empty.
    expect(options.where).toEqual([
      { column: 'status', op: 'in', value: ['active', 'available'] },
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

  it('falls back to seed data (never a 5xx) when the live read fails', async () => {
    listMock.mockRejectedValueOnce(new Error('[supabase:list listings] connection refused'));

    const res = await GET(new Request('http://localhost/api/listings?limit=24'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.seeded).toBe(true);
    expect(Array.isArray(body.listings)).toBe(true);
    expect(body.listings.length).toBeGreaterThan(0);
  });
});
