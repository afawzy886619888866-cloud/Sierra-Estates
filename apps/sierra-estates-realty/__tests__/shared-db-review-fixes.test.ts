import { parseDSL, buildQueryClauses } from '../../../packages/db/lib/dsl/parser';
import { pushListingToPF } from '../../../packages/db/lib/integrations/property-finder';
import { VIEW_CONFIGS } from '../../../packages/db/lib/sierra-estates-view-configs';

describe('shared db review fixes', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof fetch;
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });

    (globalThis as any).__TEST_TOKEN__ = undefined;
  });

  it('keeps SHOW fields when a view starts with SBR_Code and preserves PRIMARY_ID', () => {
    const parsed = parseDSL(VIEW_CONFIGS.scribe_dashboard.dsl, VIEW_CONFIGS.scribe_dashboard.collection);

    expect(parsed.showFields[0]).toBe('SBR_Code');
    expect(parsed.showFieldsMap.SBR_Code).toBe(true);
    expect(parsed.primaryIdField).toBe('SBR_Code');
  });

  it('normalizes equals operators for standard and percent filters', () => {
    const parsed = parseDSL('FILTER "Status" = "active"\nFILTER "Completion" = 85 PERCENT');

    expect(parsed.filters).toEqual([
      { field: 'Status', operator: '==', value: 'active' },
      { field: 'Completion', operator: '==', value: 85 },
    ]);
  });

  // Firestore allowed only one array-membership filter per query, so this view
  // used to throw. Postgres ANDs the two IN clauses, so the assertion is now
  // that both actually reach the query rather than that the build is rejected.
  it('emits both IN clauses when COMPOUND IN is combined with another multi-value IN filter', () => {
    const parsed = parseDSL(VIEW_CONFIGS.hidden_gems.dsl, VIEW_CONFIGS.hidden_gems.collection);

    const clauses = buildQueryClauses(parsed);
    const inClauses = clauses.filter((c) => c.op === 'in');

    expect(inClauses.length).toBeGreaterThanOrEqual(2);
    expect(clauses.some((c) => c.column === 'Compound' && c.op === 'in')).toBe(true);
  });

  it('fails fast when listing.id is missing', async () => {
    const result = await pushListingToPF({
      title: 'Listing',
      compound: 'Mivida',
      city: 'Cairo',
      location: 'New Cairo',
      propertyType: 'apartment',
      offerType: 'sale',
      price: 1,
      area: 1,
      bedrooms: 1,
      bathrooms: 1,
      status: 'active',
    });

    expect(result).toEqual({
      success: false,
      error: 'listing.id is required',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fails fast when no Firebase token is available', async () => {
    (globalThis as any).__TEST_TOKEN__ = undefined;

    const result = await pushListingToPF({
      id: 'unit-1',
      title: 'Listing',
      compound: 'Mivida',
      city: 'Cairo',
      location: 'New Cairo',
      propertyType: 'apartment',
      offerType: 'sale',
      price: 1,
      area: 1,
      bedrooms: 1,
      bathrooms: 1,
      status: 'active',
    });

    expect(result).toEqual({ success: false, error: 'Authentication required' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends the Firebase bearer token when publishing to Property Finder', async () => {
    (globalThis as any).__TEST_TOKEN__ = 'test-token';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'pf-1' }),
    });

    const result = await pushListingToPF({
      id: 'unit-1',
      title: 'Listing',
      compound: 'Mivida',
      city: 'Cairo',
      location: 'New Cairo',
      propertyType: 'apartment',
      offerType: 'sale',
      price: 1,
      area: 1,
      bedrooms: 1,
      bathrooms: 1,
      status: 'active',
    });

    expect(result).toEqual({ success: true, id: 'pf-1' });
    expect(mockFetch).toHaveBeenCalledWith('/api/sync/publish', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + 'test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ unitId: 'unit-1' }),
    });
  });
});
