/**
 * db-adapter error contract — regression test for the 2026-10-19 hardening.
 *
 * The adapter that bridges InventoryDomainService to Supabase MUST NOT mask
 * real database failures as "record not found". records.ts getRecord()
 * returns null ONLY on a clean miss and throws on network/auth/RLS/timeout
 * failures. Before the fix, the adapter caught every throw and returned
 * `exists: false`, which silently disabled deduplication during outages and
 * let the next write fabricate a brand-new inventory record.
 */
jest.mock('@sierra-estates/db', () => ({
  getRecord: jest.fn(),
  upsertRecord: jest.fn(),
  updateRecord: jest.fn(),
  listRecords: jest.fn(async () => []),
  assertCanonicalBackendForWrites: jest.fn(),
}));

jest.mock('@sierra-estates/gravity-memory', () => ({
  GravityMemory: { seen: jest.fn(() => false) },
}));

import { getRecord, upsertRecord } from '@sierra-estates/db';
import { createSupabaseDbAdapter } from '../lib/services/inventory/db-adapter';
import { InventoryDomainService } from '../lib/services/inventory/InventoryDomainService';

const mockedGet = getRecord as unknown as jest.Mock;
const mockedUpsert = upsertRecord as unknown as jest.Mock;

const payload = {
  title: '3BR in Mivida', compound: 'Mivida', propertyType: 'Apartment',
  offerType: 'sale' as const, bedrooms: 3, area: 165, price: 12_500_000,
};

const env = { ...process.env };
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  jest.clearAllMocks();
});
afterEach(() => {
  process.env = { ...env };
});

describe('db-adapter error contract', () => {
  it('clean miss (null) maps to exists:false — dedup lookup proceeds', async () => {
    mockedGet.mockResolvedValueOnce(null);
    const adapter = createSupabaseDbAdapter();
    const snap = await adapter.collection('listings').doc('fp-abc').get();
    expect(snap.exists).toBe(false);
    expect(snap.data()).toBeNull();
  });

  it('a found record maps to exists:true', async () => {
    mockedGet.mockResolvedValueOnce({ id: 'fp-abc', status: 'published' });
    const adapter = createSupabaseDbAdapter();
    const snap = await adapter.collection('listings').doc('fp-abc').get();
    expect(snap.exists).toBe(true);
    expect(snap.data()).toMatchObject({ id: 'fp-abc' });
  });

  it('network/auth/timeout failures REJECT instead of exists:false (no silent dedup loss)', async () => {
    const outage = new Error('[supabase:get listings] Connection timeout');
    mockedGet.mockRejectedValueOnce(outage);
    const adapter = createSupabaseDbAdapter();
    await expect(adapter.collection('listings').doc('fp-abc').get()).rejects.toThrow(/Connection timeout/);
  });

  it('upsertFromSource fails loudly on outage — never fabricates a new record', async () => {
    mockedGet.mockRejectedValueOnce(new Error('[supabase:get listings] 503 unavailable'));
    const svc = new InventoryDomainService(createSupabaseDbAdapter());
    await expect(svc.upsertFromSource('property_finder', payload)).rejects.toThrow(/503 unavailable/);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it('clean-miss → create path still works end-to-end through the adapter', async () => {
    mockedGet.mockResolvedValueOnce(null); // first lookup: miss
    mockedUpsert.mockResolvedValueOnce({ id: 'fp-new' });
    const svc = new InventoryDomainService(createSupabaseDbAdapter());
    const result = await svc.upsertFromSource('whatsapp_scrape', payload);
    expect(result.action).toBe('created');
    expect(mockedUpsert).toHaveBeenCalledTimes(1);
  });

  it('known fingerprint on a healthy DB merges instead of creating', async () => {
    mockedGet.mockResolvedValueOnce({
      id: 'fp-abc', status: 'published', sources: { property_finder: { lastSeenAt: '2026-10-01T00:00:00Z', ref: null } },
    });
    mockedUpsert.mockResolvedValueOnce({});
    const svc = new InventoryDomainService(createSupabaseDbAdapter());
    const result = await svc.upsertFromSource('whatsapp_scrape', payload);
    expect(result.action).toBe('duplicate_merged');
    expect(mockedUpsert).toHaveBeenCalledTimes(1);
  });
});
