/**
 * STUB-PRICE HONESTY REGRESSION (2026-10-20) — /api/inventory must never
 * display the two known ingest placeholder prices (999 rent stub,
 * 5,000,000 sale stub) as if they were real prices.
 *
 * production-smoke found 257 stub-priced rows among the 4,828 publishable+
 * active units on the public map ("EGP 999" / "EGP 5,000,000" on screen).
 * The mapper now normalizes those two exact values to "no price" so the row
 * renders the honest "Price on request" label. Real prices — including
 * genuinely cheap ones — pass through untouched.
 */

const listingsRowsRef = { rows: [] as Array<Record<string, unknown>> };

function chainable(final) {
  const o: any = {};
  for (const m of ['eq', 'ilike', 'order', 'range', 'select']) {
    o[m] = jest.fn().mockImplementation(() => o);
  }
  o.then = (resolve: any) => Promise.resolve(final).then(resolve);
  return o;
}

const getSupabase = jest.fn().mockImplementation(() => ({
  from: (table: string) => {
    if (table === 'listings') {
      return chainable({ data: listingsRowsRef.rows, error: null });
    }
    if (table === 'compounds') {
      // compounds select() is awaited directly
      return { select: () => Promise.resolve({ data: [], error: null }) };
    }
    return chainable({ data: [], error: null });
  },
}));

jest.mock('@sierra-estates/db', () => ({
  getSupabase: (...a: unknown[]) => getSupabase(...a),
}));

const domainQuery = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/services/inventory-query', () => ({
  InventoryQueryService: { query: (...a: unknown[]) => domainQuery(...a) },
}));

jest.mock('@/lib/services/ExcelInventoryService', () => ({
  appendToExcelInventory: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { GET } from '../app/api/inventory/route';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '000000000000000000000001',
    code: 'SE-RNT-HYD-0042',
    compound: 'Hyde Park',
    deal_type: 'rent',
    status: 'active',
    bedrooms: 2,
    bathrooms: 2,
    area_sqm: 150,
    updated_at: '2026-10-20T00:00:00Z',
    ...overrides,
  };
}

describe('stub prices never render as real prices on the public map', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('price 999 (rent stub) renders as "Price on request", not "EGP 999"', async () => {
    listingsRowsRef.rows = [row({ price: 999 })];

    const res = await GET();
    const json = await res.json();

    expect(json.source).toBe('supabase');
    expect(json.units[0].price).toBe(0);
    expect(json.units[0].priceLabel).toBe('Price on request');
  });

  it('price 5,000,000 (sale stub) renders as "Price on request"', async () => {
    listingsRowsRef.rows = [row({ price: 5_000_000, deal_type: 'sale' })];

    const json = await (await GET()).json();

    expect(json.units[0].price).toBe(0);
    expect(json.units[0].priceLabel).toBe('Price on request');
  });

  it('real prices — including cheap and exact-round ones that are NOT stubs — pass through', async () => {
    listingsRowsRef.rows = [
      row({ id: 'a'.repeat(24), code: 'A1', price: 125_000 }),          // real cheap rent
      row({ id: 'b'.repeat(24), code: 'B2', price: 5_000_001 }),        // not the stub value
      row({ id: 'c'.repeat(24), code: 'C3', price: 11_500_000, deal_type: 'sale' }),
    ];

    const json = await (await GET()).json();
    const byCode = Object.fromEntries(json.units.map((u: any) => [u.code, u.price]));

    expect(byCode['A1']).toBe(125_000);
    expect(byCode['B2']).toBe(5_000_001);
    expect(byCode['C3']).toBe(11_500_000);
  });

  it('a genuinely unpriced row still renders "Price on request" (absence stays honest)', async () => {
    listingsRowsRef.rows = [row({ price: null })];

    const json = await (await GET()).json();

    expect(json.units[0].price).toBe(0);
    expect(json.units[0].priceLabel).toBe('Price on request');
  });
});
