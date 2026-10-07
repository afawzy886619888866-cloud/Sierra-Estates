/**
 * app/client/portalData.ts fetchListings — explore portal data mapping.
 *
 * The portal consumes the legacy envelope mode of /api/listings (?limit=),
 * whose rows carry `image`/`images[]`, `purpose` and `agent`. An earlier
 * mapper only understood `img`, `mode`/`listingType` and `agentName`, so
 * every live row rendered with the same static fallback photo and rentals
 * were labelled for-sale. These tests pin the corrected mapping AND the
 * anti-fabrication contract: the static FALLBACK_LISTINGS array is gone, so
 * missing fields map to honest empty values (never invented defaults) and
 * failures resolve to an empty list that renders an honest empty state.
 */
import { EMPTY_LISTINGS, fetchListings } from '@/app/client/portalData';

const envelopeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'live-pf-1',
  title: '2-Bedroom Apartment in Lake View Residence',
  price: 2_400_000,
  compound: 'Lake View Residence',
  beds: 2,
  baths: 2,
  area: 130,
  image: 'https://static.shared.propertyfinder.eg/media/images/listing/x/cover.jpg',
  images: ['https://static.shared.propertyfinder.eg/media/images/listing/x/cover.jpg'],
  description: 'Live PF listing',
  propertyType: 'Apartment',
  status: 'active',
  amenities: [],
  purpose: 'for-rent',
  agent: 'Ahmed Fawzy',
  pfReferenceNumber: 'PF-01JMFXD63MAQEF8MW0QNXD96N8',
  publishToClient: true,
  ...overrides,
});

const mockEnvelope = (listings: unknown[]) =>
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ success: true, listings, count: listings.length }), {
      status: 200,
    })
  );

describe('fetchListings — envelope row mapping', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses the live cover photo (image/images), never a static fallback', async () => {
    mockEnvelope([envelopeRow()]);

    const listings = await fetchListings();
    expect(listings).toHaveLength(1);
    expect(listings[0].img).toContain('propertyfinder');
    // The static fallback array is deleted; nothing may borrow its image.
    expect(EMPTY_LISTINGS).toEqual([]);
  });

  it('maps purpose for-rent to mode rent', async () => {
    mockEnvelope([envelopeRow({ purpose: 'for-rent' })]);
    const [rental] = await fetchListings();
    expect(rental.mode).toBe('rent');

    mockEnvelope([envelopeRow({ purpose: 'for-sale' })]);
    const [sale] = await fetchListings();
    expect(sale.mode).toBe('sale');
  });

  it('keeps the legacy mode/listingType keys working (sheet + snapshot units)', async () => {
    mockEnvelope([
      envelopeRow({ purpose: undefined, mode: 'rent', image: undefined, images: undefined, img: 'https://example.com/u.jpg' }),
    ]);
    const [legacy] = await fetchListings();
    expect(legacy.mode).toBe('rent');
    expect(legacy.img).toBe('https://example.com/u.jpg');
  });

  it('carries the listing agent through to the portal card', async () => {
    mockEnvelope([envelopeRow({ agent: 'Heba Mohamed' })]);
    const [row] = await fetchListings();
    expect(row.agent).toBe('Heba Mohamed');
  });

  it('maps missing fields to honest empty values — never invented defaults', async () => {
    mockEnvelope([
      envelopeRow({
        compound: undefined, zone: undefined, propertyType: undefined,
        beds: undefined, baths: undefined, area: undefined,
        image: undefined, images: undefined, img: undefined,
        agent: undefined, price: undefined, usd: undefined,
      }),
    ]);
    const [row] = await fetchListings();
    // ANTI-FABRICATION (activation plan Rule B): absent data surfaces as
    // empty/0 — no 'New Cairo', no ||3 beds, no ||9.0 AI score, no 'Live'.
    expect(row.cmp).toBe('');
    expect(row.type).toBe('');
    expect(row.beds).toBe(0);
    expect(row.bath).toBe(0);
    expect(row.area).toBe(0);
    expect(row.img).toBe('');
    expect(row.agent).toBe('');
    expect(row.ago).toBe('');
    expect(row.ai).toBe(0);
    expect(row.egpM).toBe(0);
    expect(row.usd).toBe(0);
  });

  it('returns [] on a non-OK response (honest empty state, no static fallback)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
    expect(await fetchListings()).toEqual([]);
  });
});
