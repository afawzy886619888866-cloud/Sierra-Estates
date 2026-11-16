/**
 * G2 wiring regression (2026-10-19): Inventory Ingest Bridge.
 *
 * Pins the contract every ingest route now depends on:
 *   1. Create path  — domain-service write with fingerprint id, dupeCheckHash
 *                     column mapping, lifecycle status per source, sources
 *                     provenance, extraColumns applied.
 *   2. Cross-path duplicate — when ANOTHER row (Property Finder id / admin
 *                     insert) already owns the fingerprint under a different
 *                     primary key, the DB unique index (uq_listings_dupe_check_hash)
 *                     rejects the insert and the bridge MERGES into the winner
 *                     row instead of surfacing a raw 500.
 *   3. Failure honesty — every other error propagates (P0 regression lock).
 *   4. §21 no-fabrication — payload builders return null for incomplete
 *                     listings and unstated offer types; PF price 0 (NOT NULL
 *                     column coercion) is unknown, not a price.
 *   5. Column mapping — doc fields land on REAL columns (location_area /
 *                     area_sqm / price_currency / sync_source / latitude /
 *                     longitude), never on non-existent ones.
 */
import {
  upsertCanonicalListing,
  buildCanonicalPayloadFromParsed,
  buildCanonicalPayloadFromPfRow,
  deriveOfferType,
  getInventoryService,
  __resetInventoryServiceSingleton,
} from '../lib/services/inventory/ingest-bridge';
import { fingerprint } from '../lib/services/inventory/dedupe';
import { GravityMemory } from '@sierra-estates/gravity-memory';
import type { UpsertPayload } from '../lib/services/inventory/types';

// ── @sierra-estates/db mock: in-memory store + simulated partial unique index
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

  // Simulates migration 013: UNIQUE (dupe_check_hash) WHERE dupe_check_hash IS
  // NOT NULL — an insert/upsert with a hash already owned by ANOTHER id throws
  // the same message PostgREST would surface.
  const upsertRecord = jest.fn(async (t: string, values: any) => {
    if (failures.upsert) throw failures.upsert;
    const hash = values.dupeCheckHash ?? null;
    if (hash) {
      for (const [existingId, row] of table(t).entries()) {
        if (existingId !== values.id && row.dupeCheckHash === hash) {
          throw new Error(
            `[supabase:upsert ${t}] duplicate key value violates unique constraint "uq_listings_dupe_check_hash"`,
          );
        }
      }
    }
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

  const listRecords = jest.fn(async (t: string, opts: any = {}) => {
    if (failures.list) throw failures.list;
    let rows = [...table(t).values()];
    for (const w of opts.where ?? []) {
      rows = rows.filter((r) => String(r[w.column]) === String(w.value));
    }
    return rows.slice(0, opts.limit ?? rows.length);
  });

  const insertRecord = jest.fn(async (t: string, values: any) => {
    table(t).set(values.id ?? `row-${table(t).size}`, values);
    return values;
  });

  const assertCanonicalBackendForWrites = jest.fn();

  const __reset = () => {
    for (const k of Object.keys(tables)) delete tables[k];
    for (const k of Object.keys(failures)) delete failures[k];
    getRecord.mockClear();
    upsertRecord.mockClear();
    updateRecord.mockClear();
    listRecords.mockClear();
  };
  const __fail = (op: string, err: Error) => {
    (failures as any)[op] = err;
  };

  return {
    getRecord,
    upsertRecord,
    updateRecord,
    listRecords,
    insertRecord,
    assertCanonicalBackendForWrites,
    __reset,
    __fail,
    __dump: (t: string) => [...table(t).values()],
  };
});

const mocked = jest.requireMock('@sierra-estates/db') as ReturnType<typeof jest.requireMock>;

const basePayload: UpsertPayload = {
  title: 'Apartment · Mivida',
  compound: 'Mivida',
  propertyType: 'Apartment',
  offerType: 'sale',
  bedrooms: 3,
  area: 210,
  price: 8_500_000,
  currency: 'EGP',
};

const BASE_FP = fingerprint({
  compound: 'Mivida',
  propertyType: 'Apartment',
  offerType: 'sale',
  bedrooms: 3,
  area: 210,
  price: 8_500_000,
});

describe('Inventory Ingest Bridge (G2 wiring regression, 2026-10-19)', () => {
  beforeEach(() => {
    mocked.__reset();
    GravityMemory.reset();
    __resetInventoryServiceSingleton();
  });

  describe('1. create path through the domain service', () => {
    it('creates a fingerprint-id row with hash, lifecycle status and source provenance', async () => {
      const result = await upsertCanonicalListing('whatsapp_scrape', basePayload, {
        extraColumns: { rawData: { group: 'NC Brokers' } },
      });

      expect(result.action).toBe('created');
      expect(result.fingerprint).toBe(BASE_FP);

      const row = mocked.__dump('listings')[0];
      expect(row.id).toBe(BASE_FP);
      expect(row.dupeCheckHash).toBe(BASE_FP);
      // scrapes enter at draft; trusted feeds at pending_verification
      expect(row.status).toBe('draft');
      expect(row.sources?.whatsapp_scrape?.lastSeenAt).toBeTruthy();
      expect(row.rawData).toEqual({ group: 'NC Brokers' });
      expect(row.statusHistory).toHaveLength(1);
    });

    it('trusted feeds (property_finder) enter at pending_verification with extraColumns applied', async () => {
      const result = await upsertCanonicalListing('property_finder', basePayload, {
        extraColumns: { images: ['https://img/1.jpg'], agentName: 'Cairo Brokers' },
      });

      expect(result.action).toBe('created');
      const row = mocked.__dump('listings')[0];
      expect(row.status).toBe('pending_verification');
      expect(row.images).toEqual(['https://img/1.jpg']);
      expect(row.agentName).toBe('Cairo Brokers');
    });

    it('maps doc fields onto REAL columns (no location/area/currency/source/coordinates columns)', async () => {
      await upsertCanonicalListing('whatsapp_scrape', {
        ...basePayload,
        coordinates: { lat: 30.01, lng: 31.49 },
      });

      const row = mocked.__dump('listings')[0];
      expect(row.locationArea).toBe('Mivida');      // not `location`
      expect(row.areaSqm).toBe(210);                // not `area`
      expect(row.priceCurrency).toBe('EGP');        // not `currency`
      expect(row.syncSource).toBe('whatsapp_scrape'); // not `source`
      expect(row.latitude).toBe(30.01);             // decomposed coordinates
      expect(row.longitude).toBe(31.49);
      expect(row.location).toBeUndefined();
      expect(row.area).toBeUndefined();
      expect(row.currency).toBeUndefined();
      expect(row.source).toBeUndefined();
      expect(row.coordinates).toBeUndefined();
      expect(row.sourceRef).toBeUndefined();        // lives inside sources jsonb only
    });

    it('strips identity/dedup keys from extraColumns — the bridge owns them', async () => {
      await upsertCanonicalListing('admin_manual', basePayload, {
        extraColumns: { id: 'evil-id', fingerprint: 'evil-fp', dupeCheckHash: 'evil-hash', bedrooms: 3 },
      });
      const row = mocked.__dump('listings')[0];
      expect(row.id).toBe(BASE_FP);
      expect(row.dupeCheckHash).toBe(BASE_FP);
    });
  });

  describe('2. fingerprint re-ingest merges (domain fast path)', () => {
    it('re-ingesting the same unit reports duplicate_merged and keeps one row', async () => {
      await upsertCanonicalListing('whatsapp_scrape', basePayload);
      const second = await upsertCanonicalListing('sheets_sync', basePayload, {
        extraColumns: { finishingType: 'fully_finished' },
      });

      expect(second.action).toBe('duplicate_merged');
      const rows = mocked.__dump('listings');
      expect(rows).toHaveLength(1);
      expect(rows[0].sources).toHaveProperty('whatsapp_scrape');
      expect(rows[0].sources).toHaveProperty('sheets_sync');
    });
  });

  describe('3. cross-path duplicate → merge into the winner row', () => {
    it('merges into a Property-Finder-id row that already owns the hash', async () => {
      // Simulate a pre-existing PF row (id = PF reference, hash already set by mapProperty).
      await mocked.insertRecord('listings', {
        id: 'pf-12345',
        compound: 'Mivida',
        dupeCheckHash: BASE_FP,
        status: 'pending_verification',
        sources: { property_finder: { lastSeenAt: '2026-10-01T00:00:00Z', ref: 'pf-12345' } },
      });

      const result = await upsertCanonicalListing('whatsapp_scrape', basePayload, {
        extraColumns: { rawData: { group: 'NC Brokers' } },
      });

      expect(result.action).toBe('duplicate_merged');
      expect(result.id).toBe('pf-12345'); // merged into the winner, not a new row

      const rows = mocked.__dump('listings');
      expect(rows).toHaveLength(1); // still exactly one row for this unit
      const winner = rows[0];
      expect(winner.sources).toHaveProperty('property_finder');
      expect(winner.sources).toHaveProperty('whatsapp_scrape');
      expect(winner.rawData).toEqual({ group: 'NC Brokers' });
      expect(winner.dupeCheckHash).toBe(BASE_FP);
    });
  });

  describe('4. failure honesty (P0 regression lock extends to the bridge)', () => {
    it('propagates non-unique database errors', async () => {
      mocked.__fail('upsert', new Error('[supabase:upsert listings] Connection error: fetch failed'));
      await expect(upsertCanonicalListing('whatsapp_scrape', basePayload)).rejects.toThrow(/Connection error/);
    });

    it('rethrows the original violation when the winner row cannot be found (true anomaly)', async () => {
      // Hash owned by nobody, but the mock's index simulation only throws on a
      // conflicting row — so simulate the anomaly explicitly instead.
      const original = new Error(
        '[supabase:upsert listings] duplicate key value violates unique constraint "uq_listings_dupe_check_hash"',
      );
      mocked.__fail('upsert', original);
      await expect(upsertCanonicalListing('whatsapp_scrape', basePayload)).rejects.toThrow(
        /uq_listings_dupe_check_hash/,
      );
    });

    it('listRecords failures during winner lookup propagate (never masked)', async () => {
      // Seed a conflicting winner (the mock's index simulation then throws the
      // unique violation on insert), and break the winner LOOKUP itself.
      await mocked.insertRecord('listings', { id: 'pf-1', dupeCheckHash: BASE_FP });
      mocked.__fail('list', new Error('[supabase:list listings] timeout'));
      await expect(upsertCanonicalListing('whatsapp_scrape', basePayload)).rejects.toThrow(/timeout/);
    });
  });

  describe('5. §21 no-fabrication payload builders', () => {
    it('deriveOfferType: stated sale/rent only, never a default', () => {
      expect(deriveOfferType('فيلا للبيع في ميفيدا')).toBe('sale');
      expect(deriveOfferType('Apartment for rent, Katameya')).toBe('rent');
      expect(deriveOfferType('شقة 200م 3 غرف')).toBeNull();
      expect(deriveOfferType('Great opportunity, must see!')).toBeNull();
    });

    it('buildCanonicalPayloadFromParsed: complete rent listing builds a payload', () => {
      const payload = buildCanonicalPayloadFromParsed(
        {
          isListing: true,
          compound: 'Katameya Dunes',
          propertyType: 'Apartment',
          bedrooms: 2,
          area: 165,
          price: 25_000,
          currency: 'EGP',
        },
        'شقة للايجار التشليف الراقي 165 متر',
        'whatsapp:+201000000000',
      );
      expect(payload).toMatchObject({
        compound: 'Katameya Dunes',
        offerType: 'rent',
        bedrooms: 2,
        area: 165,
        price: 25_000,
        sourceRef: 'whatsapp:+201000000000',
      });
    });

    it('buildCanonicalPayloadFromParsed: ANY missing mandatory field → null', () => {
      const complete = {
        isListing: true,
        compound: 'Mivida',
        propertyType: 'Apartment',
        bedrooms: 3,
        area: 210,
        price: 8_500_000,
      };
      expect(buildCanonicalPayloadFromParsed({ ...complete, area: 0 }, 'للبيع 210م', undefined)).toBeNull();
      expect(buildCanonicalPayloadFromParsed({ ...complete, price: 0 }, 'للبيع', undefined)).toBeNull();
      expect(buildCanonicalPayloadFromParsed({ ...complete, bedrooms: null as any }, 'للبيع', undefined)).toBeNull();
      expect(buildCanonicalPayloadFromParsed({ ...complete, compound: '  ' }, 'للبيع', undefined)).toBeNull();
      expect(buildCanonicalPayloadFromParsed({ ...complete, isListing: false }, 'للبيع', undefined)).toBeNull();
    });

    it('buildCanonicalPayloadFromParsed: unstated offer type → null (no sale-default fabrication)', () => {
      const payload = buildCanonicalPayloadFromParsed(
        {
          isListing: true,
          compound: 'Mivida',
          propertyType: 'Apartment',
          bedrooms: 3,
          area: 210,
          price: 8_500_000,
        },
        'upcoming launch, prime location', // neither sale nor rent stated
        undefined,
      );
      expect(payload).toBeNull();
    });

    it('buildCanonicalPayloadFromPfRow: price 0 (NOT NULL coercion) is unknown → null', () => {
      expect(
        buildCanonicalPayloadFromPfRow({
          compound: 'Mivida',
          propertyType: 'Apartment',
          offerType: 'sale',
          bedrooms: 3,
          areaSqm: 210,
          price: 0,
          title: 'Property PF-1',
        }),
      ).toBeNull();
      expect(
        buildCanonicalPayloadFromPfRow({
          compound: 'Mivida',
          propertyType: 'Apartment',
          offerType: 'sale',
          bedrooms: null,
          areaSqm: 210,
          price: 9_000_000,
          title: 'Property PF-1',
        }),
      ).toBeNull();
      expect(
        buildCanonicalPayloadFromPfRow({
          compound: 'Mivida',
          propertyType: 'Apartment',
          offerType: 'sale',
          bedrooms: 3,
          areaSqm: 210,
          price: 9_000_000,
          title: 'Property PF-1',
        }),
      ).toMatchObject({ offerType: 'sale', area: 210 });
    });
  });

  describe('6. singleton behavior', () => {
    it('getInventoryService returns one shared instance until reset', () => {
      const a = getInventoryService();
      const b = getInventoryService();
      expect(a).toBe(b);
      __resetInventoryServiceSingleton();
      const c = getInventoryService();
      expect(c).not.toBe(a);
    });
  });
});
