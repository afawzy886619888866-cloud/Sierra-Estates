/**
 * Hard-constraint + soft-ranking contract of the deterministic matching
 * engine (lib/server/match-scoring) — the master-spec Phase 5/6 rules:
 *
 *   HARD constraints (budget cap, minimum bedrooms; rent/sale filtered
 *   upstream) can never be traded for soft score. Violators surface ONLY
 *   as explicitly flagged "alternatives", and only when compliant results
 *   cannot fill the limit.
 */
import { hardConstraintViolations, scoreMatch, rankMatches } from '@/lib/server/match-scoring';
import type { Listing, MatchAnswers } from '@/lib/types';

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: over.id ?? 'l-1',
    code: over.code ?? 'SB-TEST',
    compound: over.compound ?? 'Mivida',
    zone: over.zone ?? 'New Cairo',
    type: over.type ?? 'Villa',
    beds: over.beds ?? 3,
    bath: over.bath ?? 3,
    area: over.area ?? 250,
    egpM: over.egpM ?? 50,
    usd: over.usd ?? 200_000,
    aiScore: over.aiScore ?? 8,
    mode: over.mode ?? 'sale',
    agent: over.agent ?? 'Sierra',
    img: over.img ?? '',
    status: over.status ?? 'active',
  } as Listing;
}

const answers = (over: Partial<MatchAnswers> = {}): MatchAnswers => ({
  budget: over.budget ?? 200_000,
  beds: over.beds ?? 3,
  type: over.type ?? 'Villa',
  mode: over.mode ?? 'sale',
  ...(over.preferredZone ? { preferredZone: over.preferredZone } : {}),
});

describe('hardConstraintViolations', () => {
  it('returns empty for a compliant listing', () => {
    expect(hardConstraintViolations(listing({ usd: 180_000 }), answers())).toEqual([]);
  });

  it('flags a listing above the budget cap (budget is a ceiling, not a target)', () => {
    const v = hardConstraintViolations(listing({ usd: 260_000 }), answers({ budget: 200_000 }));
    expect(v.length).toBe(1);
    expect(v[0]).toMatch(/Over budget by 30%/);
  });

  it('flags fewer bedrooms than requested', () => {
    const v = hardConstraintViolations(listing({ beds: 2 }), answers({ beds: 4 }));
    expect(v.length).toBe(1);
    expect(v[0]).toMatch(/2 bedrooms < 4 requested/);
  });

  it('stacks both violations with explicit messages', () => {
    const v = hardConstraintViolations(listing({ usd: 300_000, beds: 1 }), answers({ budget: 200_000, beds: 3 }));
    expect(v.length).toBe(2);
  });
});

describe('scoreMatch (soft ranking)', () => {
  it('scores a listing at 90-100% of the cap as full-budget-fit with reason', () => {
    const m = scoreMatch(listing({ usd: 195_000 }), answers({ budget: 200_000 }));
    expect(m.hardConstraintViolations).toEqual([]);
    expect(m.reasons).toContain('Within budget');
    expect(m.score).toBeGreaterThanOrEqual(85); // 40 budget + 20 beds + 15 type + 10 zone-neutral + ai
  });

  it('decays the budget score for listings far below the cap', () => {
    const near = scoreMatch(listing({ usd: 195_000 }), answers({ budget: 200_000 }));
    const far = scoreMatch(listing({ usd: 80_000 }), answers({ budget: 200_000 }));
    expect(far.score).toBeLessThan(near.score);
    expect(far.hardConstraintViolations).toEqual([]);
  });

  it('never lets an over-budget listing earn budget points', () => {
    const m = scoreMatch(listing({ usd: 400_000 }), answers({ budget: 200_000 }));
    expect(m.hardConstraintViolations.length).toBe(1);
    expect(m.reasons).not.toContain('Within budget');
    expect(m.reasons).not.toContain('Comfortably under budget');
  });
});

describe('rankMatches (alternative flagging)', () => {
  it('returns only compliant listings when 3+ exist — violators never surface', () => {
    const stock = [
      listing({ id: 'a', usd: 190_000 }),
      listing({ id: 'b', usd: 180_000 }),
      listing({ id: 'c', usd: 170_000 }),
      listing({ id: 'over', usd: 500_000 }), // highest raw soft score would be impossible, but ensure exclusion
    ];
    const ranked = rankMatches(stock, answers({ budget: 200_000 }));
    expect(ranked.length).toBe(3);
    expect(ranked.every((m) => m.alternative === false)).toBe(true);
    expect(ranked.map((m) => m.listing.id)).not.toContain('over');
  });

  it('fills shortfall with explicitly flagged alternatives, worst-case last', () => {
    const stock = [
      listing({ id: 'ok', usd: 190_000 }),
      listing({ id: 'over-a-little', usd: 210_000 }),
      listing({ id: 'over-a-lot', usd: 600_000 }),
    ];
    const ranked = rankMatches(stock, answers({ budget: 200_000 }));
    expect(ranked.length).toBe(3);
    expect(ranked[0]).toMatchObject({ listing: expect.objectContaining({ id: 'ok' }), alternative: false });
    expect(ranked[1].alternative).toBe(true);
    expect(ranked[1].hardConstraintViolations.length).toBe(1);
    expect(ranked[2].alternative).toBe(true);
    // closer violation ranks before the farther one
    expect(ranked[1].listing.id).toBe('over-a-little');
  });

  it('returns an honest empty set when nothing exists (no fabricated seeds)', () => {
    expect(rankMatches([], answers())).toEqual([]);
  });
});
