/**
 * packages/db record layer.
 *
 * Two behaviours matter for the Firebase → Supabase migration:
 *
 * 1. Key conversion. Routes and the frontend speak camelCase, Postgres speaks
 *    snake_case. If this leaks, every API response changes shape and clients
 *    break — so responses must come back camelCase and writes must go out
 *    snake_case.
 * 2. Errors must throw. supabase-js returns `{ data, error }` instead of
 *    throwing. Routes were written against Firestore, which throws into their
 *    try/catch, so a swallowed `error` would turn a failed write into a 200.
 */
import {
  toColumns,
  toRecord,
  snakeCaseKey,
  camelCaseKey,
} from '@sierra-estates/db';

describe('key conversion', () => {
  it('converts single keys both ways', () => {
    expect(snakeCaseKey('propertyCode')).toBe('property_code');
    expect(snakeCaseKey('id')).toBe('id');
    expect(camelCaseKey('property_code')).toBe('propertyCode');
    expect(camelCaseKey('id')).toBe('id');
  });

  it('round-trips a realistic record', () => {
    const record = {
      id: 'abc',
      visitorName: 'Test',
      preferredDate: '2026-09-10',
      numberOfPeople: 2,
    };
    expect(toRecord(toColumns(record))).toEqual(record);
  });

  it('writes snake_case columns', () => {
    expect(toColumns({ visitorName: 'A', numberOfPeople: 3 })).toEqual({
      visitor_name: 'A',
      number_of_people: 3,
    });
  });

  it('reads camelCase back out', () => {
    expect(toRecord({ visitor_name: 'A', created_at: 'x' })).toEqual({
      visitorName: 'A',
      createdAt: 'x',
    });
  });

  it('converts nested objects and arrays', () => {
    expect(
      toRecord({
        lead_id: '1',
        raw_data: { owner_name: 'X', deal_type: 'sale' },
        items: [{ unit_price: 1 }, { unit_price: 2 }],
      })
    ).toEqual({
      leadId: '1',
      rawData: { ownerName: 'X', dealType: 'sale' },
      items: [{ unitPrice: 1 }, { unitPrice: 2 }],
    });
  });

  it('serialises Date to ISO, matching the Firestore Timestamp output', () => {
    const when = new Date('2026-09-02T10:00:00.000Z');
    expect(toColumns({ dueAt: when })).toEqual({ due_at: '2026-09-02T10:00:00.000Z' });
  });

  it('leaves null and primitives alone', () => {
    expect(toColumns({ notes: null, count: 0, ok: false })).toEqual({
      notes: null,
      count: 0,
      ok: false,
    });
  });

  it('does not mangle keys that are already snake_case on write', () => {
    // Routes migrated in stages may pass either shape; both must land correctly.
    expect(toColumns({ lead_id: '1' })).toEqual({ lead_id: '1' });
  });
});
