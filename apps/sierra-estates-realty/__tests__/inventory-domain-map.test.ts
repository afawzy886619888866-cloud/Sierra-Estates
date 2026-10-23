/**
 * Tests: lib/inventory/domain-map.ts
 *
 * Maps a canonical `units` doc (InventoryQueryService shape) to the public map
 * unit. The source shape carries `ownerContact` — the owner's raw mobile
 * number — for internal/admin/bot consumers, and the mapper must NEVER forward
 * it. That privacy invariant is asserted explicitly below, not just implied by
 * the happy-path shape assertions.
 *
 * `resolveLocation` is mocked so the gazetteer's real data can change without
 * breaking these tests; the fallback path is exercised via the mock.
 */
const resolveLocation = jest.fn();

jest.mock('@/lib/inventory/gazetteer', () => ({
  resolveLocation: (...args: unknown[]) => resolveLocation(...args),
}));

import { queryUnitToMapUnit } from '../lib/inventory/domain-map';

type QueryUnit = Parameters<typeof queryUnitToMapUnit>[0];

const RESOLVED = { zone: 'New Cairo', lat: 30.02, lng: 31.49, label: 'New Cairo', approx: false };

/** A canonical unit including the PII field the mapper must strip. */
function queryUnit(overrides: Partial<QueryUnit> = {}): QueryUnit {
  return {
    id: 'u-1',
    code: 'HP-VL-04',
    title: 'Grand Villa',
    compound: 'Hyde Park',
    location: 'New Cairo',
    city: 'Cairo',
    propertyType: 'villa',
    category: 'residential',
    status: 'available',
    price: 28_500_000,
    area: 480,
    bedrooms: 5,
    ownerType: 'owner',
    ownerContact: '+201061399688',
    description: 'A spacious villa.',
    updatedAt: '2026-08-15T12:00:00.000Z',
    ...overrides,
  } as QueryUnit;
}

beforeEach(() => {
  jest.clearAllMocks();
  resolveLocation.mockReturnValue(RESOLVED);
});

describe('privacy invariant', () => {
  it('never forwards ownerContact to the public map unit', () => {
    const result = queryUnitToMapUnit(queryUnit({ ownerContact: '+201061399688' }));

    expect(result).not.toHaveProperty('ownerContact');
    expect(JSON.stringify(result)).not.toContain('201061399688');
  });

  it('never forwards ownerType either', () => {
    const result = queryUnitToMapUnit(queryUnit({ ownerType: 'broker' }));

    expect(result).not.toHaveProperty('ownerType');
  });

  it('emits only the known public field set', () => {
    const result = queryUnitToMapUnit(queryUnit());

    expect(Object.keys(result).sort()).toEqual(
      [
        'approxLocation', 'area', 'beds', 'code', 'comment', 'furnished', 'garden',
        'id', 'lat', 'lng', 'location', 'mode', 'pool', 'price', 'priceLabel',
        'propertyType', 'rawLocation', 'status', 'statusLabel', 'updatedAt', 'zone',
      ].sort(),
    );
  });
});

describe('status mapping', () => {
  it.each([
    ['available', 'available', 'Available'],
    ['rented', 'unavailable', 'Rented'],
    ['sold', 'unavailable', 'Sold'],
    ['off-market', 'unavailable', 'Off-market'],
  ])('maps %s → %s / %s', (source, status, statusLabel) => {
    const result = queryUnitToMapUnit(queryUnit({ status: source as QueryUnit['status'] }));

    expect(result.status).toBe(status);
    expect(result.statusLabel).toBe(statusLabel);
  });

  it('falls back to off-market for an unrecognised status', () => {
    const result = queryUnitToMapUnit(queryUnit({ status: 'pending' as QueryUnit['status'] }));

    expect(result.status).toBe('unavailable');
    expect(result.statusLabel).toBe('Off-market');
  });
});

describe('rent vs sale heuristic', () => {
  it('treats a sub-1M price as rent', () => {
    expect(queryUnitToMapUnit(queryUnit({ price: 45_000 })).mode).toBe('rent');
    expect(queryUnitToMapUnit(queryUnit({ price: 999_999 })).mode).toBe('rent');
  });

  it('treats 1M and above as sale', () => {
    expect(queryUnitToMapUnit(queryUnit({ price: 1_000_000 })).mode).toBe('sale');
    expect(queryUnitToMapUnit(queryUnit({ price: 28_500_000 })).mode).toBe('sale');
  });

  it('treats a zero price as sale rather than rent', () => {
    // price > 0 fails, so the heuristic falls through to 'sale'.
    expect(queryUnitToMapUnit(queryUnit({ price: 0 })).mode).toBe('sale');
  });
});

describe('price labelling', () => {
  it('renders a whole-million price with no decimal', () => {
    expect(queryUnitToMapUnit(queryUnit({ price: 28_000_000 })).priceLabel).toBe('EGP 28M');
  });

  it('renders a partial million to one decimal', () => {
    expect(queryUnitToMapUnit(queryUnit({ price: 28_500_000 })).priceLabel).toBe('EGP 28.5M');
  });

  it('renders sub-million prices with thousands separators', () => {
    expect(queryUnitToMapUnit(queryUnit({ price: 45_000 })).priceLabel).toBe('EGP 45,000');
  });

  it('renders a missing price as "Price on request"', () => {
    expect(queryUnitToMapUnit(queryUnit({ price: 0 })).priceLabel).toBe('Price on request');
  });
});

describe('coordinates', () => {
  it('prefers the unit\'s own coordinates and marks the location exact', () => {
    const unit = { ...queryUnit(), coordinates: { lat: 30.1, lng: 31.5 } } as QueryUnit;

    const result = queryUnitToMapUnit(unit);

    expect(result.lat).toBe(30.1);
    expect(result.lng).toBe(31.5);
    expect(result.approxLocation).toBe(false);
  });

  it('falls back to the gazetteer when the unit has no coordinates', () => {
    resolveLocation.mockReturnValueOnce({ ...RESOLVED, lat: 29.9, lng: 31.2, approx: true });

    const result = queryUnitToMapUnit(queryUnit());

    expect(result.lat).toBe(29.9);
    expect(result.lng).toBe(31.2);
    expect(result.approxLocation).toBe(true);
  });

  it('resolves location from the raw location, falling back to the compound', () => {
    queryUnitToMapUnit(queryUnit({ location: 'Tagamoa', compound: 'Hyde Park' }));
    expect(resolveLocation).toHaveBeenCalledWith('Tagamoa');

    resolveLocation.mockClear();
    queryUnitToMapUnit(queryUnit({ location: '', compound: 'Hyde Park' }));
    expect(resolveLocation).toHaveBeenCalledWith('Hyde Park');
  });
});

describe('field passthrough and null-coalescing', () => {
  it('carries the public fields through', () => {
    const result = queryUnitToMapUnit(queryUnit());

    expect(result).toMatchObject({
      id: 'u-1',
      code: 'HP-VL-04',
      location: 'Hyde Park',
      rawLocation: 'New Cairo',
      zone: 'New Cairo',
      propertyType: 'villa',
      beds: 5,
      area: 480,
      price: 28_500_000,
      comment: 'A spacious villa.',
      updatedAt: '2026-08-15T12:00:00.000Z',
    });
  });

  it('uses the gazetteer label when the unit has no compound', () => {
    resolveLocation.mockReturnValueOnce({ ...RESOLVED, label: 'New Cairo (approx)' });

    const result = queryUnitToMapUnit(queryUnit({ compound: '' }));

    expect(result.location).toBe('New Cairo (approx)');
  });

  it.each(['code', 'propertyType'] as const)('nulls an empty %s rather than emitting ""', (field) => {
    const result = queryUnitToMapUnit(queryUnit({ [field]: '' } as Partial<QueryUnit>));

    expect(result[field]).toBeNull();
  });

  it('nulls zero bedrooms and zero area', () => {
    const result = queryUnitToMapUnit(queryUnit({ bedrooms: 0, area: 0 }));

    expect(result.beds).toBeNull();
    expect(result.area).toBeNull();
  });

  it('nulls a missing description and updatedAt', () => {
    const result = queryUnitToMapUnit(
      queryUnit({ description: undefined, updatedAt: undefined }),
    );

    expect(result.comment).toBeNull();
    expect(result.updatedAt).toBeNull();
  });

  it('emits the fields the canonical sheet does not carry as constant blanks', () => {
    const result = queryUnitToMapUnit(queryUnit());

    expect(result.garden).toBeNull();
    expect(result.furnished).toBeNull();
    expect(result.pool).toBe(false);
  });
});
