import {
  InventoryDomainService,
  fingerprint,
  priceBand,
  areaBand,
  canTransition,
  assertTransition,
  isStale,
  checkGravityDedupe,
  type IngestionSource,
  type UpsertPayload,
  type InventoryListing,
} from '../lib/services/inventory';
import { GravityMemory } from '@sierra-estates/gravity-memory';

describe('Inventory Domain Service & Lifecycle', () => {
  let inMemoryDocs: Map<string, any>;
  let mockDb: any;
  let service: InventoryDomainService;

  beforeEach(() => {
    inMemoryDocs = new Map();
    GravityMemory.reset();

    mockDb = {
      collection: (name: string) => ({
        doc: (id?: string) => {
          const docId = id || 'mock-id';
          return {
            id: docId,
            async get() {
              const data = inMemoryDocs.get(docId);
              return {
                exists: Boolean(data),
                id: docId,
                data: () => data,
              };
            },
            async set(data: any, opts?: { merge?: boolean }) {
              if (opts?.merge && inMemoryDocs.has(docId)) {
                inMemoryDocs.set(docId, { ...inMemoryDocs.get(docId), ...data });
              } else {
                inMemoryDocs.set(docId, data);
              }
              return Promise.resolve();
            },
            async update(patch: any) {
              const existing = inMemoryDocs.get(docId) || {};
              inMemoryDocs.set(docId, { ...existing, ...patch });
              return Promise.resolve();
            },
          };
        },
        where: () => ({}),
      }),
    };

    service = new InventoryDomainService(mockDb);
  });

  describe('1. Fingerprinting and Gravity Deduplication', () => {
    it('generates consistent business fingerprints ignoring whitespace and case', () => {
      const fp1 = fingerprint({
        compound: 'Mivida',
        propertyType: 'Apartment',
        offerType: 'sale',
        bedrooms: 3,
        area: 180,
        price: 8500000,
      });

      const fp2 = fingerprint({
        compound: '  mivida  ',
        propertyType: 'apartment',
        offerType: 'sale',
        bedrooms: 3,
        area: 182, // within 5sqm band
        price: 8500000,
      });

      expect(fp1).toBe(fp2);
    });

    it('re-uses Gravity Memory seen hook for dedupe detection', () => {
      const input = {
        compound: 'Hyde Park',
        propertyType: 'Villa',
        offerType: 'sale',
        bedrooms: 4,
        area: 320,
        price: 18000000,
      };

      const firstCheck = checkGravityDedupe(input);
      expect(firstCheck.isDuplicate).toBe(false);

      const secondCheck = checkGravityDedupe(input);
      expect(secondCheck.isDuplicate).toBe(true);
      expect(secondCheck.hash).toBe(firstCheck.hash);
    });
  });

  describe('2. upsertFromSource', () => {
    it('creates a new draft listing for unverified ingest sources', async () => {
      const payload: UpsertPayload = {
        title: 'Spacious 2BR in Palm Hills',
        compound: 'Palm Hills',
        propertyType: 'Apartment',
        offerType: 'rent',
        area: 140,
        bedrooms: 2,
        price: 35000,
      };

      const result = await service.upsertFromSource('whatsapp_scrape', payload);
      expect(result.action).toBe('created');

      const saved = inMemoryDocs.get(result.fingerprint);
      expect(saved).toBeDefined();
      expect(saved.status).toBe('draft');
      expect(saved.compound).toBe('Palm Hills');
      expect(saved.pricePerSqm).toBe(Math.round(35000 / 140));
    });

    it('sets initial status to verified when document reference is provided', async () => {
      const payload: UpsertPayload = {
        title: 'Verified Penthouse in Mivida',
        compound: 'Mivida',
        propertyType: 'Penthouse',
        offerType: 'sale',
        area: 250,
        bedrooms: 3,
        price: 14000000,
        ownershipDocRef: 'DOC-MIVIDA-2026-9921',
        verifiedBy: 'Senior Notary Ahmed',
      };

      const result = await service.upsertFromSource('admin_manual', payload);
      expect(result.action).toBe('created');

      const saved = inMemoryDocs.get(result.fingerprint);
      expect(saved.status).toBe('verified');
      expect(saved.ownershipDocRef).toBe('DOC-MIVIDA-2026-9921');
      expect(saved.verifiedBy).toBe('Senior Notary Ahmed');
      expect(saved.verifiedAt).toBeDefined();
    });

    it('merges duplicates from subsequent sources rather than creating multiple rows', async () => {
      const payload: UpsertPayload = {
        title: 'Townhouse in Villette',
        compound: 'Villette',
        propertyType: 'Townhouse',
        offerType: 'sale',
        area: 260,
        bedrooms: 4,
        price: 22000000,
        sourceRef: 'PF-VILLETTE-101',
      };

      const r1 = await service.upsertFromSource('property_finder', payload);
      expect(r1.action).toBe('created');

      // Subsequent ingest of same unit with minor price change
      const r2 = await service.upsertFromSource('sheets_sync', {
        ...payload,
        title: 'Townhouse in Villette SODIC',
        sourceRef: 'SHEET-ROW-44',
      });

      expect(r2.action).toBe('duplicate_merged');
      expect(r2.fingerprint).toBe(r1.fingerprint);

      const saved = inMemoryDocs.get(r1.fingerprint);
      expect(saved.sources?.sheets_sync?.ref).toBe('SHEET-ROW-44');
    });
  });

  describe('3. Lifecycle Transitions & Compliance Validation', () => {
    it('enforces legal state machine transitions', () => {
      expect(canTransition('draft', 'pending_verification')).toBe(true);
      expect(canTransition('draft', 'verified')).toBe(true);
      expect(canTransition('verified', 'published')).toBe(true);
      expect(canTransition('published', 'reserved')).toBe(true);
      expect(canTransition('reserved', 'sold')).toBe(true);
      expect(canTransition('sold', 'published')).toBe(false); // terminal state
    });

    it('requires document reference or verifier when transitioning to verified', async () => {
      const id = 'test-unit-01';
      inMemoryDocs.set(id, {
        id,
        status: 'draft',
        statusHistory: [],
      });

      // Attempting to verify without doc metadata or verifier throws
      expect(() =>
        assertTransition('draft', 'verified', { note: 'Unverified claim' })
      ).toThrow(/Verification requires document reference/);

      // Transition with doc reference succeeds
      await service.transition(id, 'verified', 'admin-user', {
        ownershipDocRef: 'EGY-REG-2026-8842',
        verifiedBy: 'Legal Compliance Officer',
      });

      const updated = inMemoryDocs.get(id);
      expect(updated.status).toBe('verified');
      expect(updated.ownershipDocRef).toBe('EGY-REG-2026-8842');
      expect(updated.verifiedBy).toBe('Legal Compliance Officer');
    });

    it('requires reservationRef when transitioning to reserved', async () => {
      const id = 'test-unit-02';
      inMemoryDocs.set(id, {
        id,
        status: 'published',
        statusHistory: [],
      });

      await expect(service.transition(id, 'reserved', 'broker-ali')).rejects.toThrow(
        /Reservation requires a reservationRef/
      );

      await service.transition(id, 'reserved', 'broker-ali', {
        reservationRef: 'pi_stripe_sample_9918',
        note: 'Reserved with deposit',
      });

      const updated = inMemoryDocs.get(id);
      expect(updated.status).toBe('reserved');
      expect(updated.reservationRef).toBe('pi_stripe_sample_9918');
    });
  });

  describe('4. Search and Pagination', () => {
    const catalog: InventoryListing[] = [
      {
        id: '1',
        title: 'Mivida 2BR',
        compound: 'Mivida',
        propertyType: 'Apartment',
        offerType: 'sale',
        listingType: 'resale',
        status: 'published',
        city: 'New Cairo',
        location: 'Mivida',
        area: 130,
        bedrooms: 2,
        price: 7500000,
        pricePerSqm: 57692,
        currency: 'EGP',
        fingerprint: 'fp-1',
        source: 'property_finder',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        statusHistory: [],
      },
      {
        id: '2',
        title: 'Mivida 3BR',
        compound: 'Mivida',
        propertyType: 'Apartment',
        offerType: 'sale',
        listingType: 'resale',
        status: 'published',
        city: 'New Cairo',
        location: 'Mivida',
        area: 190,
        bedrooms: 3,
        price: 11000000,
        pricePerSqm: 57894,
        currency: 'EGP',
        fingerprint: 'fp-2',
        source: 'property_finder',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        statusHistory: [],
      },
      {
        id: '3',
        title: 'Sarai Villa',
        compound: 'Sarai',
        propertyType: 'Villa',
        offerType: 'sale',
        listingType: 'primary',
        status: 'published',
        city: 'Mostakbal City',
        location: 'Sarai',
        area: 280,
        bedrooms: 4,
        price: 16500000,
        pricePerSqm: 58928,
        currency: 'EGP',
        fingerprint: 'fp-3',
        source: 'admin_manual',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        statusHistory: [],
      },
    ];

    it('filters by compound, price range, and bedrooms with pagination', async () => {
      const searchRes = await service.search(
        {
          compound: 'Mivida',
          minPrice: 6000000,
          maxPrice: 12000000,
          page: 1,
          limit: 1,
        },
        { catalog }
      );

      expect(searchRes.total).toBe(2);
      expect(searchRes.results.length).toBe(1);
      expect(searchRes.hasMore).toBe(true);
      expect(searchRes.results[0].compound).toBe('Mivida');
    });

    it('uses semantic search fallback when direct matches are empty', async () => {
      const mockFallback = jest.fn().mockResolvedValue([catalog[2]]);

      const searchRes = await service.search(
        {
          compound: 'NonExistentCompound',
          query: 'luxury villa in mostakbal city',
        },
        {
          catalog,
          semanticFallbackFn: mockFallback,
        }
      );

      expect(mockFallback).toHaveBeenCalledWith('luxury villa in mostakbal city');
      expect(searchRes.isSemanticFallback).toBe(true);
      expect(searchRes.results.length).toBe(1);
      expect(searchRes.results[0].title).toBe('Sarai Villa');
    });
  });

  describe('5. Freshness SLA Hook', () => {
    it('detects stale unverified listings past 30 days', () => {
      const now = new Date('2026-10-08T00:00:00Z');
      const freshDate = '2026-09-25T00:00:00Z'; // 13 days ago
      const staleDate = '2026-08-10T00:00:00Z'; // 59 days ago

      expect(isStale(freshDate, now)).toBe(false);
      expect(isStale(staleDate, now)).toBe(true);
      expect(isStale(undefined, now)).toBe(true);
    });

    it('sweeps published stale listings to expired', async () => {
      const now = new Date('2026-10-08T00:00:00Z');
      const staleService = new InventoryDomainService(mockDb, () => now);

      const staleId = 'stale-unit-99';
      inMemoryDocs.set(staleId, {
        id: staleId,
        status: 'published',
        verifiedAt: '2026-08-01T00:00:00Z',
        statusHistory: [],
      });

      const swept = await staleService.sweepStale([inMemoryDocs.get(staleId)]);
      expect(swept).toContain(staleId);

      const updated = inMemoryDocs.get(staleId);
      expect(updated.status).toBe('expired');
    });
  });
});
