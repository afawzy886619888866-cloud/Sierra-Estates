 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Inventory domain — unit tests (pure logic + fake Firestore).
 * Runner-agnostic: works under jest or vitest globals.
 */
import { fingerprint, normalizeText, priceBand } from '../lib/services/inventory/dedupe';
import { canTransition, assertTransition, isStale } from '../lib/services/inventory/lifecycle';
import { InventoryDomainService, } from '../lib/services/inventory/InventoryDomainService';

// ── dedupe ──────────────────────────────────────────────────────────────
describe('dedupe fingerprint', () => {
  const base = { compound: 'Mivida', propertyType: 'Apartment', offerType: 'sale', bedrooms: 3, area: 165, price: 12500000 };

  it('is stable for identical input', () => {
    expect(fingerprint(base)).toBe(fingerprint({ ...base }));
  });

  it('ignores case/whitespace noise in text fields', () => {
    expect(fingerprint({ ...base, compound: '  MIVIDA ' })).toBe(fingerprint(base));
  });

  it('keeps fingerprint across a small price correction (<2.5%)', () => {
    expect(fingerprint({ ...base, price: 12550000 })).toBe(fingerprint(base));
  });

  it('changes for a genuinely different unit', () => {
    expect(fingerprint({ ...base, bedrooms: 4 })).not.toBe(fingerprint(base));
    expect(fingerprint({ ...base, price: 15000000 })).not.toBe(fingerprint(base));
  });

  it('normalizes Arabic text safely', () => {
    expect(normalizeText('ميفيدا  التجمع')).toBe(normalizeText('ميفيدا التجمع'));
  });

  it('priceBand is monotonic', () => {
    expect(priceBand(10000000)).toBeLessThan(priceBand(20000000));
  });
});

// ── lifecycle ───────────────────────────────────────────────────────────
describe('lifecycle state machine', () => {
  it('allows the happy path', () => {
    expect(canTransition('draft', 'pending_verification')).toBe(true);
    expect(canTransition('pending_verification', 'verified')).toBe(true);
    expect(canTransition('verified', 'published')).toBe(true);
    expect(canTransition('published', 'reserved')).toBe(true);
    expect(canTransition('reserved', 'sold')).toBe(true);
  });

  it('blocks illegal jumps', () => {
    expect(canTransition('draft', 'published')).toBe(false);
    expect(canTransition('sold', 'published')).toBe(false);
    expect(() => assertTransition('draft', 'sold')).toThrow(/Illegal/);
  });

  it('rental cycle can relist, sales cannot', () => {
    expect(canTransition('rented', 'published')).toBe(true);
    expect(canTransition('sold', 'published')).toBe(false);
  });

  it('isStale respects the SLA', () => {
    const now = new Date('2026-07-20T00:00:00Z');
    expect(isStale(undefined, now)).toBe(true);
    expect(isStale('2026-07-01T00:00:00Z', now)).toBe(false);
    expect(isStale('2026-05-01T00:00:00Z', now)).toBe(true);
  });
});

// ── service with fake Firestore ────────────────────────────────────────
function fakeDb() {
  const store = new Map();
  const db = {
    collection: () => ({
      doc: (id) => {
        const key = _nullishCoalesce(id, () => ( `auto-${store.size}`));
        return {
          id: key,
          get: async () => ({ exists: store.has(key), id: key, data: () => store.get(key) }),
          set: async (data, opts) => {
            const prev = _optionalChain([opts, 'optionalAccess', _ => _.merge]) ? (_nullishCoalesce(store.get(key), () => ( {}))) : {};
            store.set(key, { ...prev, ...(data ) });
          },
          update: async (data) => {
            store.set(key, { ...(_nullishCoalesce(store.get(key), () => ( {}))), ...(data ) });
          },
        };
      },
      where: () => ({}),
    }),
  };
  return { db, store };
}

describe('InventoryDomainService', () => {
  const payload = {
    title: '3BR in Mivida', compound: 'Mivida', propertyType: 'Apartment',
    offerType: 'sale' , bedrooms: 3, area: 165, price: 12500000,
  };

  it('creates once, merges the duplicate from another source', async () => {
    const { db, store } = fakeDb();
    const svc = new InventoryDomainService(db);
    const first = await svc.upsertFromSource('whatsapp_scrape', payload);
    expect(first.action).toBe('created');
    const second = await svc.upsertFromSource('property_finder', { ...payload, price: 12550000 });
    expect(second.action).toBe('duplicate_merged');
    expect(second.id).toBe(first.id);
    expect(store.size).toBe(1);
  });

  it('trusted feeds start at pending_verification, scrapes at draft', async () => {
    const { db, store } = fakeDb();
    const svc = new InventoryDomainService(db);
    const scrape = await svc.upsertFromSource('whatsapp_scrape', payload);
    expect((store.get(scrape.id) ).status).toBe('draft');
    const pf = await svc.upsertFromSource('property_finder', { ...payload, compound: 'Hyde Park' });
    expect((store.get(pf.id) ).status).toBe('pending_verification');
  });

  it('enforces lifecycle on transition and records audit history', async () => {
    const { db, store } = fakeDb();
    const svc = new InventoryDomainService(db);
    const { id } = await svc.upsertFromSource('admin_manual', payload);
    await svc.transition(id, 'verified', 'ahmed');
    await svc.transition(id, 'published', 'ahmed');
    await expect(svc.transition(id, 'sold', 'ahmed')).rejects.toThrow(/Illegal/);
    const doc = store.get(id) ;
    expect(doc.status).toBe('published');
    expect(doc.verifiedBy).toBe('ahmed');
    expect(doc.statusHistory.length).toBe(3);
  });

  it('requires a reservationRef to reserve', async () => {
    const { db } = fakeDb();
    const svc = new InventoryDomainService(db);
    const { id } = await svc.upsertFromSource('admin_manual', payload);
    await svc.verifyAndPublish(id, 'ahmed');
    await expect(svc.transition(id, 'reserved', 'ahmed')).rejects.toThrow(/reservationRef/);
    await svc.transition(id, 'reserved', 'ahmed', 'pi_123');
  });
});
