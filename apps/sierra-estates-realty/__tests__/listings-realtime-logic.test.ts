/**
 * listings-realtime-logic.test.ts — unit tests for the PURE realtime patch
 * logic. These pin the /api/invisibility contract:
 *
 *   visible  ⇔  status='active' AND publish_status='PUBLISHABLE'
 *                AND not owner-sourced
 *
 * The regression that motivated this suite: the previous hook removed any
 * row whose status !== 'available' on UPDATE — but live rows carry
 * status='active', so every admin edit made the pin VANISH. These tests
 * make that impossible to reintroduce silently.
 */

import {
  isOwnerSourced,
  isPubliclyVisible,
  sanitizeRealtimeListing,
  applyRealtimeInsert,
  applyRealtimeUpdate,
  applyRealtimeDelete,
} from '@/lib/realtime/listings-realtime-logic';
import type { RealListing } from '@/app/(site)/properties/PropertiesPage';

/* ── fixtures: raw public.listings rows ────────────────────────────────── */

const baseRow = {
  id: 'uuid-1',
  code: 'NC-100',
  compound: 'Mivida',
  location_area: 'Mivida',
  property_type: 'Apartment',
  deal_type: 'sale',
  price: 12_500_000,
  bedrooms: 3,
  bathrooms: 2,
  area_sqm: 240,
  latitude: 30.028,
  longitude: 31.53,
  status: 'active',
  publish_status: 'PUBLISHABLE',
  source_channel: 'sheets',
  raw_data: { tag: 'Verified', img: 'https://img/x.jpg', aiScore: 88 },
};

const rentRow = {
  ...baseRow,
  id: 'uuid-2',
  code: 'NC-200',
  deal_type: 'rent',
  price: 45_000,
  bedrooms: 2,
  area_sqm: 130,
};

const initial: RealListing[] = [
  sanitizeRealtimeListing(baseRow, 0),
  sanitizeRealtimeListing(rentRow, 1),
];

/* ── visibility predicate ──────────────────────────────────────────────── */

describe('isPubliclyVisible (mirrors GET /api/inventory)', () => {
  it('accepts an active PUBLISHABLE broker row', () => {
    expect(isPubliclyVisible(baseRow)).toBe(true);
  });

  it('rejects a REVIEW_REQUIRED row (publish gate)', () => {
    expect(isPubliclyVisible({ ...baseRow, publish_status: 'REVIEW_REQUIRED' })).toBe(false);
  });

  it('rejects a NULL publish_status row', () => {
    expect(isPubliclyVisible({ ...baseRow, publish_status: null })).toBe(false);
  });

  it('rejects a non-active status row', () => {
    for (const status of ['off-market', 'sold', 'pending', 'available']) {
      // 'available' is NOT in the public contract either — /api/inventory
      // filters status='active' only.
      expect(isPubliclyVisible({ ...baseRow, status })).toBe(false);
    }
  });

  it('rejects owner-sourced rows (source_channel evidence)', () => {
    expect(isPubliclyVisible({ ...baseRow, source_channel: 'owner_direct' })).toBe(false);
    expect(isPubliclyVisible({ ...baseRow, source_channel: 'WhatsApp Owner Group' })).toBe(false);
  });

  it('rejects Direct Owner tagged rows (raw_data.tag evidence)', () => {
    expect(
      isPubliclyVisible({ ...baseRow, raw_data: { tag: 'Direct Owner' } })
    ).toBe(false);
  });
});

describe('isOwnerSourced', () => {
  it('matches owner channels case-insensitively', () => {
    expect(isOwnerSourced({ source_channel: 'OWNER' })).toBe(true);
    expect(isOwnerSourced({ source_channel: 'broker' })).toBe(false);
    expect(isOwnerSourced({ source_channel: 'property_finder' })).toBe(false);
  });

  it('handles missing raw_data safely', () => {
    expect(isOwnerSourced({ source_channel: 'sheets' })).toBe(false);
    expect(isOwnerSourced({ raw_data: 'not-an-object' })).toBe(false);
  });
});

/* ── raw row → RealListing mapping (DATABASE column names) ─────────────── */

describe('sanitizeRealtimeListing', () => {
  it('maps raw DB columns to the page shape', () => {
    const l = initial[0];
    expect(l.id).toBe('uuid-1');
    expect(l.code).toBe('NC-100');
    expect(l.compound).toBe('Mivida');
    expect(l.type).toBe('Apartment');
    expect(l.beds).toBe(3);
    expect(l.bath).toBe(2);
    expect(l.area).toBe(240);
    expect(l.price).toBe(12_500_000);
    expect(l.img).toBe('https://img/x.jpg');
    expect(l.ai).toBe(88);
    expect(l.lat).toBe(30.028);
    expect(l.lng).toBe(31.53);
    expect(l.mode).toBe('sale');
  });

  it('derives rent mode from deal_type (the old code read the wrong field)', () => {
    expect(initial[1].mode).toBe('rent');
    expect(initial[1].priceLabel).toBe('45,000 EGP/mo');
  });

  it('renders honest unknowns (anti-fabrication §21)', () => {
    const l = sanitizeRealtimeListing(
      { id: 'x', price: 0, compound: '', raw_data: {} },
      0
    );
    expect(l.compound).toBe('Unspecified');
    expect(l.priceLabel).toBe('Price on request');
    expect(l.beds).toBe(0);
    expect(l.type).toBe('Unspecified');
  });
});

/* ── reducers ──────────────────────────────────────────────────────────── */

describe('applyRealtimeInsert', () => {
  it('adds a visible row at the head', () => {
    const row = { ...baseRow, id: 'uuid-new', code: 'NC-300' };
    const next = applyRealtimeInsert(initial, row);
    expect(next).toHaveLength(3);
    expect(next[0].code).toBe('NC-300');
  });

  it('ignores an unverified insert (publish gate flash guard)', () => {
    const row = { ...baseRow, id: 'uuid-new', publish_status: 'REVIEW_REQUIRED' };
    expect(applyRealtimeInsert(initial, row)).toBe(initial);
  });

  it('ignores an owner-sourced insert', () => {
    const row = { ...baseRow, id: 'uuid-new', source_channel: 'owner' };
    expect(applyRealtimeInsert(initial, row)).toBe(initial);
  });

  it('is idempotent on duplicate events', () => {
    expect(applyRealtimeInsert(initial, baseRow)).toBe(initial);
  });
});

describe('applyRealtimeUpdate — THE regression suite', () => {
  it('keeps and refreshes a visible row on plain admin edits (status=active)', () => {
    // Old bug: any status !== 'available' removed the row. Live rows are
    // status='active', so every edit vanished the pin.
    const row = { ...baseRow, price: 13_200_000 };
    const next = applyRealtimeUpdate(initial, row);
    expect(next).toHaveLength(2);
    expect(next.find((l) => l.id === 'uuid-1')?.price).toBe(13_200_000);
  });

  it('removes a row demoted to REVIEW_REQUIRED', () => {
    const row = { ...baseRow, publish_status: 'REVIEW_REQUIRED' };
    const next = applyRealtimeUpdate(initial, row);
    expect(next.find((l) => l.id === 'uuid-1')).toBeUndefined();
    expect(next).toHaveLength(1);
  });

  it('adds a row promoted to PUBLISHABLE (was absent — appears instantly)', () => {
    const row = {
      ...baseRow,
      id: 'uuid-promoted',
      code: 'NC-400',
      publish_status: 'PUBLISHABLE',
    };
    const next = applyRealtimeUpdate(initial, row);
    expect(next).toHaveLength(3);
    expect(next[0].code).toBe('NC-400');
  });

  it('removes a row that flipped to off-market', () => {
    const row = { ...baseRow, status: 'off-market' };
    expect(applyRealtimeUpdate(initial, row)).toHaveLength(1);
  });

  it('removes a row that became owner-sourced', () => {
    const row = { ...baseRow, source_channel: 'owner' };
    expect(applyRealtimeUpdate(initial, row)).toHaveLength(1);
  });

  it('no-ops when an invisible row was never present', () => {
    const row = { ...baseRow, id: 'uuid-ghost', status: 'off-market' };
    expect(applyRealtimeUpdate(initial, row)).toBe(initial);
  });
});

describe('applyRealtimeDelete', () => {
  it('removes by primary key from the old record', () => {
    const next = applyRealtimeDelete(initial, { id: 'uuid-1' });
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('uuid-2');
  });

  it('no-ops on an unknown or malformed old record', () => {
    expect(applyRealtimeDelete(initial, {})).toBe(initial);
    // Unknown id: filter produces a new array — assert content, not identity.
    expect(applyRealtimeDelete(initial, { id: 'nope' })).toEqual(initial);
  });
});
