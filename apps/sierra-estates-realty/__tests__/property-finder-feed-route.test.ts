/**
 * P0-D REGRESSION — /api/feeds/property-finder file-fallback bypass CLOSED.
 *
 * Until 2026-10-20 the GET route served a pre-generated XML
 * (public/feeds/propertyfinder-feed.xml) verbatim BEFORE the canonical
 * publish-gated query could run, so ~1,762 stale owner-scraped
 * (OWNERS-AUG26-*) ads — including price-on-application rows — were served as
 * the LIVE production feed, and the same file was directly downloadable at
 * /feeds/propertyfinder-feed.xml. This test plants a fake feed file at the
 * exact legacy path and proves the route IGNORES it: only canonical,
 * publish-gated units are ever exported, and with no eligible inventory the
 * honest answer is an empty <list>.
 */

const queryMock = jest.fn();

jest.mock('@/lib/services/inventory-query', () => ({
  InventoryQueryService: {
    query: (...a: unknown[]) => queryMock(...a),
  },
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

function completeUnit(overrides: Record<string, unknown> = {}) {
  return {
    code: 'SE-SL-HYD-0142',
    compound: 'Hyde Park',
    propertyType: 'Apartment',
    bedrooms: 3,
    bath: 2,
    area: 180,
    price: 11_500_000,
    city: 'New Cairo',
    ...overrides,
  };
}

describe('P0-D: the pre-generated XML fallback can never shadow the publish gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('a planted legacy feed file is IGNORED — no eligible inventory yields an honest empty <list>', async () => {
    queryMock.mockResolvedValue([]);

    const res = await GET();
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('<list>');
    expect(xml).not.toContain('OWNERS-AUG26-00001'); // the planted file's content
    expect((xml.match(/<property>/g) || []).length).toBe(0);
  });

  it('exports ONLY through the canonical publish-gated domain query', async () => {
    queryMock.mockResolvedValue([completeUnit()]);

    await GET();

    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'available',
        publishStatus: 'PUBLISHABLE',
        ownerType: 'broker',
      }),
    );
  });

  it('units missing required fields are skipped, not invented', async () => {
    queryMock.mockResolvedValue([
      completeUnit(),                              // exported
      completeUnit({ bath: null }),                // skipped: bathrooms missing
      completeUnit({ price: 0 }),                  // skipped: no real price
      completeUnit({ propertyType: null }),        // skipped: no type
    ]);

    const xml = await (await GET()).text();

    expect((xml.match(/<property>/g) || []).length).toBe(1);
    expect(xml).toContain('SE-SL-HYD-0142');
    expect(xml).toContain('11500000');
  });

  it('serves XML content-type with bounded caching', async () => {
    queryMock.mockResolvedValue([completeUnit()]);

    const res = await GET();

    expect(res.headers.get('content-type')).toContain('application/xml');
    expect(res.headers.get('cache-control')).toMatch(/max-age=\d+/);
  });
});
