/**
 * Tests: lib/utils/searchRanking.ts
 *
 * Ranking = aiScore + a freshness boost that decays linearly from +2.0 to 0
 * over 10 days. Only listings published to the client page are returned, so
 * this doubles as the control-room visibility filter.
 *
 * Time is frozen throughout: the boost is a function of "now", so without a
 * fixed clock these assertions would drift.
 */
import { processAndRankInventory, type UnifiedPropertyListing } from '../lib/utils/searchRanking';

const NOW = new Date('2026-08-15T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

/** A listing created `ageInDays` before the frozen now. */
function listing(
  id: string,
  aiScore: number,
  ageInDays: number,
  isPublishedToClientPage = true,
): UnifiedPropertyListing {
  return {
    id,
    title: `Listing ${id}`,
    aiScore,
    createdAt: new Date(NOW.getTime() - ageInDays * DAY_MS).toISOString(),
    isPublishedToClientPage,
    coordinates: { lat: 30.02, lng: 31.49 },
  };
}

/** The private _calculatedScore the ranker attaches, for boost assertions. */
const scoreOf = (l: UnifiedPropertyListing) => (l as any)._calculatedScore as number;

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('visibility filter', () => {
  it('excludes listings not published to the client page', () => {
    const result = processAndRankInventory([
      listing('a', 9, 0, true),
      listing('b', 9, 0, false),
    ]);

    expect(result.map((l) => l.id)).toEqual(['a']);
  });

  it('returns an empty array when nothing is published', () => {
    const result = processAndRankInventory([listing('a', 9, 0, false)]);

    expect(result).toEqual([]);
  });

  it('returns an empty array for empty input', () => {
    expect(processAndRankInventory([])).toEqual([]);
  });

  it('requires isPublishedToClientPage to be exactly true, not merely truthy', () => {
    const truthy = { ...listing('a', 9, 0), isPublishedToClientPage: 1 as any };

    expect(processAndRankInventory([truthy])).toEqual([]);
  });
});

describe('freshness boost', () => {
  it('gives a brand-new listing the full +2.0 boost', () => {
    const [result] = processAndRankInventory([listing('a', 7, 0)]);

    expect(scoreOf(result)).toBeCloseTo(9.0, 5);
  });

  it('decays the boost by 0.2 per day', () => {
    const [oneDay] = processAndRankInventory([listing('a', 7, 1)]);
    const [fiveDays] = processAndRankInventory([listing('b', 7, 5)]);

    expect(scoreOf(oneDay)).toBeCloseTo(8.8, 5);
    expect(scoreOf(fiveDays)).toBeCloseTo(8.0, 5);
  });

  it('reaches exactly zero boost at 10 days', () => {
    const [result] = processAndRankInventory([listing('a', 7, 10)]);

    expect(scoreOf(result)).toBeCloseTo(7.0, 5);
  });

  it('clamps the boost at zero rather than going negative beyond 10 days', () => {
    const [result] = processAndRankInventory([listing('a', 7, 45)]);

    expect(scoreOf(result)).toBe(7);
  });

  it('does not penalise a future-dated listing beyond the +2.0 cap', () => {
    // A createdAt in the future yields a negative age; the boost formula would
    // exceed +2.0, so this pins the current (uncapped) behaviour.
    const [result] = processAndRankInventory([listing('a', 7, -5)]);

    expect(scoreOf(result)).toBeGreaterThan(9.0);
  });
});

describe('ordering', () => {
  it('ranks a higher final score first', () => {
    const result = processAndRankInventory([
      listing('low', 5, 0),
      listing('high', 9, 0),
    ]);

    expect(result.map((l) => l.id)).toEqual(['high', 'low']);
  });

  it('lets freshness outrank a higher raw AI score', () => {
    // 8.0 + 2.0 (new) = 10.0 beats 9.0 + 0.0 (30 days old) = 9.0
    const result = processAndRankInventory([
      listing('stale-but-strong', 9, 30),
      listing('fresh', 8, 0),
    ]);

    expect(result.map((l) => l.id)).toEqual(['fresh', 'stale-but-strong']);
  });

  it('orders a realistic mixed set correctly', () => {
    const result = processAndRankInventory([
      listing('c', 6, 0), //  8.0
      listing('a', 9, 1), // 10.8
      listing('d', 7, 20), // 7.0
      listing('b', 8, 2), // 9.6
      listing('hidden', 10, 0, false),
    ]);

    expect(result.map((l) => l.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('immutability and shape', () => {
  it('does not mutate the input listings', () => {
    const input = [listing('a', 7, 0)];
    const snapshot = JSON.parse(JSON.stringify(input));

    processAndRankInventory(input);

    expect(input).toEqual(snapshot);
    expect((input[0] as any)._calculatedScore).toBeUndefined();
  });

  it('preserves all original fields on the returned listings', () => {
    const input = listing('a', 7, 0);
    input.inventoryMetadata = {
      easyListingId: 'EL-1',
      propertyFinderRef: 'PF-1',
      leadsCount: 3,
      syncedAt: NOW.toISOString(),
    };

    const [result] = processAndRankInventory([input]);

    expect(result).toMatchObject({
      id: 'a',
      title: 'Listing a',
      aiScore: 7,
      coordinates: { lat: 30.02, lng: 31.49 },
      inventoryMetadata: { easyListingId: 'EL-1', leadsCount: 3 },
    });
  });
});
