/**
 * app/client/portalData.ts fetchListings — explore portal data mapping.
 *
 * The portal consumes the legacy envelope mode of /api/listings (?limit=),
 * whose rows carry `image`/`images[]`, `purpose` and `agent`. An earlier
 * mapper only understood `img`, `mode`/`listingType` and `agentName`, so
 * every live row rendered with the same static fallback photo and rentals
 * were labelled for-sale. These tests pin the corrected mapping.
 */
import { fetchListings } from '@/app/client/portalData';

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

  it('uses the live cover photo (image/images), never the static fallback', async () => {
    mockEnvelope([envelopeRow()]);

    const listings = await fetchListings();
    expect(listings).toHaveLength(1);
    expect(listings[0].img).toContain('propertyfinder');
    expect(listings[0].img).not.toEqual(
      // FALLBACK_LISTINGS[0].img — same CDN host, so assert the exact URL.
      'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d539110a-ed1e-11ef-9c46-0a0bf5daed27-444bac18-0e72-47ac-9e7c-b8445ddbf6b3.png'
    );
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

  it('returns [] (→ static fallback) on a non-OK response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
    expect(await fetchListings()).toEqual([]);
  });
});
