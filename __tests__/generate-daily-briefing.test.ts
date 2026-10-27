/**
 * Tests: generate-daily-briefing H1 truthfulness contract (execution order
 * 2026-10-27). Regression for the observed false-success in agent-fleet
 * run 40332038097: "Total Active Listings: unavailable (count query
 * failed)" + empty compound/opportunity sections, followed by "✅ ready
 * for broadcast" and a green Actions result.
 *
 * Mandated scenarios:
 *   1. DB available with real results            → OK, ready, exit 0
 *   2. DB available with no matching results      → OK (genuine empty), ready
 *   3. DB unavailable (network failure)           → BLOCKED, NOT ready, exit 1
 *   4. Query error (PostgREST error object)       → BLOCKED, NOT ready, exit 1
 *   5. Incomplete data (count ok, sample failed)  → DEGRADED, NOT ready, exit 2
 *   6. Document created but broadcast blocked     → readyForBroadcast === false
 *   7. Fully healthy briefing                     → OK, readyForBroadcast true
 *
 * The Supabase client is mocked at the module boundary — a standard unit
 * test must not depend on production network availability (Section E).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('dotenv', () => ({ config: vi.fn(() => ({}) as Record<string, string>) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import {
  computeBriefingStatus,
  BRIEFING_EXIT_CODE,
  generateDailyDigest,
} from '../scripts/generate-daily-briefing';

const mockedCreateClient = vi.mocked(createClient);

/** supabase-js builder is a thenable with chained modifiers — mirror the
 * minimum shape generateDailyDigest uses (.select().limit() and head-count). */
function thenable<T>(resolution: T) {
  const p = Promise.resolve(resolution);
  return {
    then: p.then.bind(p) as unknown as (typeof p)['then'],
    catch: p.catch.bind(p) as unknown as (typeof p)['catch'],
    limit: () => thenable(resolution),
  };
}

function rejectedThenable(err: Error) {
  const p = Promise.reject(err);
  // The `.select().limit()` chain never awaits the intermediate builder —
  // silence the un-awaited base rejection so Node doesn't flag it while the
  // final awaited branch still rejects properly.
  p.catch(() => {});
  return {
    then: p.then.bind(p) as unknown as (typeof p)['then'],
    catch: p.catch.bind(p) as unknown as (typeof p)['catch'],
    limit: () => rejectedThenable(err),
  };
}

type QueryShape = {
  head?: { count: number | null; error: unknown };
  rows?: { data: unknown; error: unknown };
  rejectAll?: Error;
};

function mockSupabase(q: QueryShape) {
  const from = vi.fn(() => ({
    select: vi.fn((_cols: string, opts?: { count?: string; head?: boolean }) => {
      if (q.rejectAll) return rejectedThenable(q.rejectAll);
      if (opts && opts.head) return thenable(q.head ?? { count: null, error: { message: 'unavailable' } });
      return thenable(q.rows ?? { data: null, error: { message: 'unavailable' } });
    }),
  }));
  mockedCreateClient.mockReturnValue({ from } as never);
}

const SAMPLE_ROWS = Array.from({ length: 5 }, (_, i) => ({
  id: `row-${i}`,
  compound: 'Mivida',
  property_type: 'Apartment',
  price: 8_000_000 + i,
  deal_type: 'sale',
  featured: i === 0,
  is_hot_deal: i === 1,
  area_sqm: 200,
  bedrooms: 3,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('computeBriefingStatus (pure classification)', () => {
  it('both queries ok → OK, ready for broadcast', () => {
    expect(computeBriefingStatus({ activeListingsCount: 'ok', inventorySample: 'ok' })).toEqual({
      status: 'OK',
      missingMetrics: [],
      readyForBroadcast: true,
    });
  });

  it('count ok + sample error → DEGRADED with the missing metric named', () => {
    expect(computeBriefingStatus({ activeListingsCount: 'ok', inventorySample: 'error' })).toEqual({
      status: 'DEGRADED',
      missingMetrics: ['inventorySample'],
      readyForBroadcast: false,
    });
  });

  it('count error + sample ok → DEGRADED with the missing metric named', () => {
    expect(computeBriefingStatus({ activeListingsCount: 'error', inventorySample: 'ok' })).toEqual({
      status: 'DEGRADED',
      missingMetrics: ['activeListingsCount'],
      readyForBroadcast: false,
    });
  });

  it('both queries error → BLOCKED, never a fabricated empty inventory', () => {
    expect(computeBriefingStatus({ activeListingsCount: 'error', inventorySample: 'error' })).toEqual({
      status: 'BLOCKED',
      missingMetrics: ['activeListingsCount', 'inventorySample'],
      readyForBroadcast: false,
    });
  });

  it('exit codes are non-zero for DEGRADED and BLOCKED', () => {
    expect(BRIEFING_EXIT_CODE.OK).toBe(0);
    expect(BRIEFING_EXIT_CODE.DEGRADED).not.toBe(0);
    expect(BRIEFING_EXIT_CODE.BLOCKED).not.toBe(0);
  });
});

describe('generateDailyDigest (mocked Supabase boundary)', () => {
  it('1/7. DB available with real results → OK, ready for broadcast', async () => {
    mockSupabase({ head: { count: 20_252, error: null }, rows: { data: SAMPLE_ROWS, error: null } });
    const digest = await generateDailyDigest();
    expect(digest.dataStatus).toBe('OK');
    expect(digest.readyForBroadcast).toBe(true);
    expect(digest.missingMetrics).toEqual([]);
    expect(digest.totalActiveListings).toBe(20_252);
    expect(digest.totalMarketVolumeEGP).toBeGreaterThan(0);
    expect(digest.compoundDistribution.length).toBeGreaterThan(0);
    expect(digest.arbitrageOpportunities.length).toBeGreaterThan(0);
  });

  it('2. DB available with no matching results → genuine empty is OK and ready', async () => {
    mockSupabase({ head: { count: 0, error: null }, rows: { data: [], error: null } });
    const digest = await generateDailyDigest();
    // A genuine empty is valid ONLY when the query succeeded and the result
    // truly contains zero matching records — exactly this case.
    expect(digest.dataStatus).toBe('OK');
    expect(digest.readyForBroadcast).toBe(true);
    expect(digest.totalActiveListings).toBe(0);
    expect(digest.compoundDistribution).toEqual([]);
    expect(digest.arbitrageOpportunities).toEqual([]);
  });

  it('3. DB unavailable (network failure on both queries) → BLOCKED, not empty-success', async () => {
    mockSupabase({ rejectAll: new Error('fetch failed: ETIMEDOUT') });
    const digest = await generateDailyDigest();
    expect(digest.dataStatus).toBe('BLOCKED');
    expect(digest.readyForBroadcast).toBe(false);
    expect(digest.missingMetrics).toEqual(['activeListingsCount', 'inventorySample']);
    expect(digest.totalActiveListings).toBeNull();
    expect(digest.totalMarketVolumeEGP).toBeNull();
  });

  it('4. Query errors (PostgREST error objects) → BLOCKED, not empty-success', async () => {
    mockSupabase({
      head: { count: null, error: { message: 'relation does not exist', code: '42P01' } },
      rows: { data: null, error: { message: 'permission denied' } },
    });
    const digest = await generateDailyDigest();
    expect(digest.dataStatus).toBe('BLOCKED');
    expect(digest.readyForBroadcast).toBe(false);
    expect(digest.missingMetrics).toContain('activeListingsCount');
    expect(digest.missingMetrics).toContain('inventorySample');
  });

  it('5/6. Incomplete data (count ok, sample failed) → DEGRADED; document created but NOT ready for broadcast', async () => {
    mockSupabase({ head: { count: 20_252, error: null }, rows: { data: null, error: { message: 'connection reset' } } });
    const digest = await generateDailyDigest();
    expect(digest.dataStatus).toBe('DEGRADED');
    expect(digest.readyForBroadcast).toBe(false); // the sender gate
    expect(digest.missingMetrics).toEqual(['inventorySample']);
    expect(digest.totalActiveListings).toBe(20_252);
    expect(digest.totalMarketVolumeEGP).toBeNull();
    // Sections exist (document creation succeeded) but carry zero rows —
    // the status + missingMetrics make the omission explicit, never an
    // implied healthy empty inventory.
    expect(digest.compoundDistribution).toEqual([]);
    expect(digest.arbitrageOpportunities).toEqual([]);
    expect(BRIEFING_EXIT_CODE[digest.dataStatus]).toBe(2);
  });
});
