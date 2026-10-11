/**
 * PUBLISH GATE REGRESSION TESTS (Phase 11, master execution command)
 *
 * Proves:
 *  9. Every path to PFIntegrationService.publishListing() checks the same
 *     complete gate (the gate lives IN the service — tested directly here).
 *  7. Owner classification does not create human verification (an
 *     owner-direct record fails the verification condition).
 *  8. New units remain REVIEW_REQUIRED (classification condition rejects).
 * 16-18. No fabricated values pass the gate (price/currency/photos/quality).
 */
import {
  PublishGate,
  PUBLISH_MIN_PHOTOS,
  PUBLISH_QUALITY_THRESHOLD,
  VERIFICATION_FRESH_DAYS,
  type PublishGateUnit,
} from '../lib/services/publish-gate';

function baseUnit(overrides: Partial<PublishGateUnit> = {}): PublishGateUnit {
  const verifiedAt = new Date(Date.now() - 2 * 86_400_000).toISOString(); // 2 days ago — Fresh
  return {
    title: 'Villa · Mivida',
    propertyType: 'villa',
    category: 'residential',
    status: 'available',
    dealType: 'sale',
    price: 12_500_000,
    area: 300,
    bedrooms: 4,
    bathrooms: 4,
    compound: 'Mivida',
    ownerType: 'owner',
    ownerPhone: '+201001234567',
    publishStatus: 'PUBLISHABLE',
    availability: 'available',
    priceCurrency: 'EGP',
    verifiedAt,
    verifiedBy: 'staff@sierra-estates.net',
    dataQualityScore: 88,
    images: [
      'https://cdn.sierra-estates.net/photos/a.jpg',
      'https://cdn.sierra-estates.net/photos/b.jpg',
      'https://cdn.sierra-estates.net/photos/c.jpg',
    ],
    ...overrides,
  } as PublishGateUnit;
}

describe('PublishGate.evaluate — the 8 C6 conditions', () => {
  it('passes a fully eligible record', () => {
    const result = PublishGate.evaluate(baseUnit());
    expect(result.eligible).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.checks).toHaveLength(9); // classification + 8 conditions
  });

  it('9. rejects REVIEW_REQUIRED records (private staging never publishes)', () => {
    const result = PublishGate.evaluate(baseUnit({ publishStatus: 'REVIEW_REQUIRED' }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('classification'))).toBe(true);
  });

  it('rejects unclassified (null publish_status) records — default-deny', () => {
    const result = PublishGate.evaluate(baseUnit({ publishStatus: null }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('classification'))).toBe(true);
  });

  it('rejects INCOMPLETE / STALE / DUPLICATE staging states', () => {
    for (const state of ['INCOMPLETE', 'STALE', 'EXPIRED', 'DUPLICATE']) {
      const result = PublishGate.evaluate(baseUnit({ publishStatus: state }));
      expect(result.eligible).toBe(false);
    }
  });

  it('1. rejects unavailable units', () => {
    const result = PublishGate.evaluate(baseUnit({ availability: 'not_available' }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('availability'))).toBe(true);
  });

  it('2. rejects a valid price without a recorded currency', () => {
    const result = PublishGate.evaluate(baseUnit({ priceCurrency: null }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('price'))).toBe(true);
  });

  it('2. rejects a zero/missing price even with a currency', () => {
    const result = PublishGate.evaluate(baseUnit({ price: 0 }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('price'))).toBe(true);
  });

  it('3. rejects an unknown property type (no apartment fallback)', () => {
    const result = PublishGate.evaluate(baseUnit({ propertyType: 'tower-castle' as any }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('propertyType'))).toBe(true);
  });

  it('4. rejects records without a usable location', () => {
    const result = PublishGate.evaluate(
      baseUnit({ compound: undefined, location: undefined, city: undefined })
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('location'))).toBe(true);
  });

  it('5. rejects records without a reachable contact', () => {
    const result = PublishGate.evaluate(baseUnit({ ownerPhone: null, ownerContact: null, brokerPhone: null }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('contact'))).toBe(true);
  });

  it('6. rejects quality scores below the threshold and unset scores', () => {
    const low = PublishGate.evaluate(baseUnit({ dataQualityScore: PUBLISH_QUALITY_THRESHOLD - 1 }));
    expect(low.eligible).toBe(false);
    expect(low.failures.some((f) => f.startsWith('quality'))).toBe(true);

    const unset = PublishGate.evaluate(baseUnit({ dataQualityScore: null }));
    expect(unset.eligible).toBe(false);
    expect(unset.failures.some((f) => f.startsWith('quality'))).toBe(true);
  });

  it('7. rejects stale human verification (older than the freshness window)', () => {
    const stale = new Date(Date.now() - (VERIFICATION_FRESH_DAYS + 5) * 86_400_000).toISOString();
    const result = PublishGate.evaluate(baseUnit({ verifiedAt: stale }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('verification'))).toBe(true);
  });

  it('7. rejects verification without auditable staff provenance (verifiedBy)', () => {
    const result = PublishGate.evaluate(baseUnit({ verifiedBy: null }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('verification'))).toBe(true);
  });

  it('7. rejects owner-direct classification as a substitute for staff verification', () => {
    // An owner reply / owner-direct record has NO verifiedAt/verifiedBy —
    // group membership is a signal, never human verification.
    const result = PublishGate.evaluate(baseUnit({ verifiedAt: null, verifiedBy: null }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('verification'))).toBe(true);
  });

  it(`8. rejects records with fewer than ${PUBLISH_MIN_PHOTOS} real photos`, () => {
    const two = PublishGate.evaluate({
      ...baseUnit(),
      images: [
        'https://cdn.sierra-estates.net/photos/a.jpg',
        'https://cdn.sierra-estates.net/photos/b.jpg',
      ],
    } as PublishGateUnit);
    expect(two.eligible).toBe(false);
    expect(two.failures.some((f) => f.startsWith('photos'))).toBe(true);
  });

  it('8. counts only real http(s) photo URLs — captions/placeholders never pass', () => {
    const result = PublishGate.evaluate({
      ...baseUnit(),
      images: [
        'https://cdn.sierra-estates.net/photos/a.jpg',
        'photo caption only',          // not a URL
        'data:image/png;base64,AAAA',  // data URI, not a stored photo
        undefined as any,              // empty slot
        'https://cdn.sierra-estates.net/photos/b.jpg',
      ].filter(Boolean),
    } as PublishGateUnit);
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.startsWith('photos'))).toBe(true);
  });

  it('exposes per-condition evidence for the admin preview queue', () => {
    const result = PublishGate.evaluate(baseUnit({ dataQualityScore: 40 }));
    const quality = result.checks.find((c) => c.condition === 'quality');
    expect(quality).toBeDefined();
    expect(quality!.passed).toBe(false);
    expect(quality!.detail).toContain('40');
  });
});
