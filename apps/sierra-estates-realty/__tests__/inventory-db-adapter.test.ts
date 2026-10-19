/**
 * Regression: inventory db-adapter error propagation + field mapping.
 *
 * 2026-10-19 baseline audit P0 fix. The adapter previously swallowed
 * database errors in `get()` and returned `{ exists: false }`, so a Supabase
 * outage was indistinguishable from "record not found":
 *   - upsertFromSource() created DUPLICATE listings during outages
 *   - transition() reported a misleading "Listing not found"
 *
 * These tests pin the corrected contract:
 *   1. a database error MUST reject (never exists:false)
 *   2. a genuine miss still returns exists:false
 *   3. fingerprint fields map onto the real dupe_check_hash column and back
 *   4. upsertFromSource surfaces database failures instead of duplicating
 */
import { createSupabaseDbAdapter } from '../lib/services/inventory/db-adapter';
import { InventoryDomainService } from '../lib/services/inventory';
import { GravityMemory } from '@sierra-estates/gravity-memory';
import type { UpsertPayload } from '../lib/services/inventory';

// ── @sierra-estates/db mock: in-memory store with injectable failures ──────
jest.mock('@sierra-estates/db', () => {
  const tables: Record<string, Map<string, any>> = {};
  const failures: Record<string, Error> = {};

  const table = (name: string) => {
    if (!tables[name]) tables[name] = new Map();
    return tables[name];
  };

  const getRecord = jest.fn(async (t: string, id: string) => {
    if (failures.get) throw failures.get;
    return table(t).get(id) ?? null;
  });
  const upsertRecord = jest.fn(async (t: string, values: any) => {
    if (failures.upsert) throw failures.upsert;
    table(t).set(values.id, values);
    return values;
  });
  const updateRecord = jest.fn(async (t: string, id: string, values: any) => {
    if (failures.update) throw failures.update;
    const row = table(t).get(id);
    if (!row) return null;
    Object.assign(row, values);
    return row;
  });
  const listRecords = jest.fn(async (t: string) => [...table(t).values()]);

  const __reset = () => {
    for (const k of Object.keys(tables)) delete tables[k];
    for (const k of Object.keys(failures)) delete failures[k];
    getRecord.mockClear();
    upsertRecord.mockClear();
    updateRecord.mockClear();
  };
  const __fail = (op: string, err: Error) => {
    (failures as any)[op] = err;
  };

  const assertCanonicalBackendForWrites = jest.fn();
  return {
    getRecord,
    upsertRecord,
    updateRecord,
    listRecords,
    assertCanonicalBackendForWrites,
    __reset,
    __fail,
  };
});

const mocked = jest.requireMock('@sierra-estates/db') as ReturnType<typeof jest.requireMock>;

const OUTAGE = new Error('[supabase:get listings] Connection error: fetch failed');

const payload: UpsertPayload = {
  title: 'Apartment · Mivida',
  compound: 'Mivida',
  propertyType: 'Apartment',
  offerType: 'sale',
  bedrooms: 3,
  area: 210,
  price: 8500000,
  currency: 'EGP',
  sourceRef: 'pf-123',
};

describe('Inventory Supabase db-adapter (2026-10-19 P0 regression)', () => {
  let adapter: ReturnType<typeof createSupabaseDbAdapter>;

  beforeEach(() => {
    mocked.__reset();
    GravityMemory.reset();
    adapter = createSupabaseDbAdapter();
  });

  describe('1. get() error propagation', () => {
    it('REJECTS on a database outage instead of reporting exists:false', async () => {
      mocked.__fail('get', OUTAGE);
      const doc = adapter.collection('listings').doc('abc123');
      await expect(doc.get()).rejects.toThrow('Connection error');
    });

    it('returns exists:false only for a GENUINE miss', async () => {
      const snap = await adapter.collection('listings').doc('missing-id').get();
      expect(snap.exists).toBe(false);
      expect(snap.data()).toBeNull();
    });

    it('returns exists:true with data for a present row', async () => {
      await adapter
        .collection('listings')
        .doc('present')
        .set({ id: 'present', title: 'x' });
      const snap = await adapter.collection('listings').doc('present').get();
      expect(snap.exists).toBe(true);
      expect((snap.data() as any).title).toBe('x');
    });
  });

  describe('2. fingerprint ↔ dupe_check_hash column mapping', () => {
    it('writes fingerprint into dupeCheckHash (→ dupe_check_hash column)', async () => {
      const doc = adapter.collection('listings').doc('fp-test');
      await doc.set({ fingerprint: 'aaaa1111bbbb2222cccc333', title: 'Mivida unit' });
      // records.ts snake-cases dupeCheckHash → dupe_check_hash; the mock
      // stores whatever the adapter handed over, so assert the field rename.
      const written = (mocked.upsertRecord as jest.Mock).mock.calls[0][1];
      expect(written.dupeCheckHash).toBe('aaaa1111bbbb2222cccc333');
      expect(written.fingerprint).toBeUndefined();
    });

    it('maps dupeCheckHash back to fingerprint on read', async () => {
      const doc = adapter.collection('listings').doc('fp-read');
      await doc.set({ fingerprint: 'aaaa1111bbbb2222cccc333' });
      const snap = await doc.get();
      const data = snap.data() as any;
      expect(data.fingerprint).toBe('aaaa1111bbbb2222cccc333');
      expect(data.dupeCheckHash).toBeUndefined();
    });

    it('maps statusHistory / ownershipDocRef / reservationRef through untouched names', async () => {
      const doc = adapter.collection('listings').doc('map-test');
      await doc.set({
        statusHistory: [{ from: null, to: 'draft', at: '2026-10-19T00:00:00Z', by: 'system' }],
        ownershipDocRef: 'DOC-77',
        reservationRef: 'pi_88',
      });
      const written = (mocked.upsertRecord as jest.Mock).mock.calls[0][1];
      expect(written.statusHistory[0].to).toBe('draft');
      expect(written.ownershipDocRef).toBe('DOC-77');
      expect(written.reservationRef).toBe('pi_88');
    });
  });

  describe('3. upsertFromSource under database failure', () => {
    it('propagates the outage — never falls back to "create" (duplicate guard)', async () => {
      const service = new InventoryDomainService(adapter);
      mocked.__fail('get', OUTAGE);
      // The listing may already exist; an outage must NOT be read as a miss.
      await expect(
        service.upsertFromSource('sheets_sync', payload, 'test'),
      ).rejects.toThrow('Connection error');
      expect((mocked.upsertRecord as jest.Mock)).not.toHaveBeenCalled();
    });

    it('still creates a new listing when the record genuinely does not exist', async () => {
      const service = new InventoryDomainService(adapter);
      const result = await service.upsertFromSource('sheets_sync', payload, 'test');
      expect(result.action).toBe('created');
      const snap = await adapter.collection('listings').doc(result.fingerprint).get();
      expect(snap.exists).toBe(true);
      const data = snap.data() as any;
      expect(data.status).toBe('draft'); // untrusted source starts at draft
      expect(data.fingerprint).toBe(result.fingerprint);
    });

    it('merges instead of duplicating when the fingerprint row exists', async () => {
      const service = new InventoryDomainService(adapter);
      const first = await service.upsertFromSource('sheets_sync', payload, 'test');
      const second = await service.upsertFromSource('property_finder', payload, 'test');
      expect(second.action).toBe('duplicate_merged');
      expect(second.fingerprint).toBe(first.fingerprint);
      const rows = await mocked.listRecords('listings');
      expect(rows.length).toBe(1);
    });

    it('propagates write failures too (no silent success)', async () => {
      const service = new InventoryDomainService(adapter);
      mocked.__fail('upsert', new Error('[supabase:upsert listings] RLS violation'));
      await expect(
        service.upsertFromSource('sheets_sync', payload, 'test'),
      ).rejects.toThrow('RLS violation');
    });
  });

  describe('4. transition() under database failure', () => {
    it('surfaces the database error, NOT a fabricated "Listing not found"', async () => {
      const service = new InventoryDomainService(adapter);
      const { fingerprint } = await service.upsertFromSource('sheets_sync', payload, 'test');
      mocked.__fail('get', OUTAGE);
      await expect(
        service.transition(fingerprint, 'pending_verification', 'staff'),
      ).rejects.toThrow('Connection error');
    });
  });
});
