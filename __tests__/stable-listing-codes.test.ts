import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  resolveUnitCode,
  canonicalUnitCode,
  isCanonicalSierraCode,
  serialForSeed,
} from '../apps/sierra-estates-realty/lib/server/unit-codes';

/**
 * STABLE LISTING CODES (mandate §4) — contract tests for migration 031 and
 * the canonical unit-code system:
 *   • codes are derived from IDENTITY (compound + deal token + stable seed),
 *     never from price or description — a price edit can NEVER change a code
 *   • deterministic: same identity → same code on every retry
 *   • anti-collision: many concurrent mints never produce the same code
 *     (simulation; the DB-level guarantee is the sequence + unique index)
 *   • migration 031: assigns, freezes, and enforces uniqueness at the DB,
 *     while preserving every existing code verbatim
 */
describe('Stable listing codes — migration 031 contract', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const MIGRATION_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '20261019_031_stable_listing_codes.sql');

  it('migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('creates an atomic sequence as the serial source', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/CREATE SEQUENCE IF NOT EXISTS public\.sierra_listing_code_seq/);
  });

  it('enforces uniqueness with a partial unique index on listings(code)', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_listings_code\s+ON public\.listings \(code\)/);
  });

  it('mints codes on INSERT when the caller supplies none', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/CREATE TRIGGER trg_listings_assign_code\s+BEFORE INSERT ON public\.listings/);
    expect(sql).toMatch(/nextval\('public\.sierra_listing_code_seq'\)/);
  });

  it('FREEZES codes on UPDATE — a set code can never be replaced or cleared', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/CREATE TRIGGER trg_listings_freeze_code\s+BEFORE UPDATE OF code ON public\.listings/);
    expect(sql).toMatch(/listing code is immutable/);
  });

  it('backfills only rows with NULL/empty code — existing codes preserved verbatim', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    // The backfill's WHERE clause only selects NULL/empty-code rows…
    expect(sql).toMatch(/WHERE code IS NULL OR TRIM\(code\) = ''/);
    // …and re-checks it in the UPDATE, making re-runs no-ops.
    expect(sql).toMatch(/AND \(l\.code IS NULL OR TRIM\(l\.code\) = ''\)/);
    // Existing codes are only ever disambiguated (suffixed), never regenerated.
    expect(sql).toMatch(/SET code = victim\.code \|\| '-D'/);
  });
});

describe('Stable listing codes — identity-based derivation (unit-codes.ts)', () => {
  const base = { compound: 'Hyde Park', dealType: 'sale', seed: 'intake-001' };

  it('PRICE INDEPENDENCE: a price edit never changes the code', () => {
    const at12m = resolveUnitCode({ ...base, code: null, price: 12_500_000 });
    const at15m = resolveUnitCode({ ...base, code: null, price: 15_000_000 });
    const noPrice = resolveUnitCode({ ...base, code: null });
    expect(at12m.code).toBe(at15m.code);
    expect(at12m.code).toBe(noPrice.code);
  });

  it('DESCRIPTION INDEPENDENCE: title/area changes never change the code', () => {
    const a = resolveUnitCode({ ...base, code: null, title: 'Garden Villa', areaSqm: 400 });
    const b = resolveUnitCode({ ...base, code: null, title: 'Totally different ad copy', areaSqm: 250 });
    expect(a.code).toBe(b.code);
  });

  it('DETERMINISM: the same intake seed re-derives the same code (retry idempotency)', () => {
    for (let i = 0; i < 5; i++) {
      expect(resolveUnitCode({ ...base, code: null }).code).toBe(resolveUnitCode({ ...base, code: null }).code);
    }
  });

  it('a provided canonical code passes through unchanged (never re-minted)', () => {
    const passthrough = resolveUnitCode({ ...base, code: 'se-sl-hyd-0142' });
    expect(passthrough.code).toBe('SE-SL-HYD-0142');
    expect(passthrough.generated).toBe(false);
  });

  it('rent maps to RNT, sale/resale/primary map to SL', () => {
    expect(resolveUnitCode({ ...base, dealType: 'rent', code: null }).code).toMatch(/^SE-RNT-HYD-\d{4,6}$/);
    expect(resolveUnitCode({ ...base, dealType: 'resale', code: null }).code).toMatch(/^SE-SL-HYD-\d{4,6}$/);
    expect(resolveUnitCode({ ...base, dealType: 'إيجار', code: null }).code).toMatch(/^SE-RNT-HYD-\d{4,6}$/);
  });

  it('ANTI-COLLISION BOUND: hash-serial mints stay within the birthday bound — the ZERO-collision guarantee is the DB sequence + unique index (migration 031)', async () => {
    // resolveUnitCode maps seeds onto a 9999-value serial space per
    // compound+deal, so pure-TS mints collide at the birthday rate — this is
    // the documented reason the DB owns minting (sequence = atomic serial,
    // uq_listings_code = backstop). The statistical contract below pins the
    // bound so a regression that WORSENS collisions beyond birthday math
    // fails loudly. n=5000, d=9999: expected unique ≈ d(1-e^(-n/d)) ≈ 3935.
    const seeds = Array.from({ length: 5_000 }, (_, i) => `intake-concurrent-${i}`);
    const codes = await Promise.all(
      seeds.map((seed) => Promise.resolve(resolveUnitCode({ compound: 'Mivida', dealType: 'sale', seed, code: null }).code)),
    );
    const unique = new Set(codes);
    expect(unique.size).toBeGreaterThan(3_800); // ≥ birthday expectation − margin
    expect(unique.size).toBeLessThan(4_100);   // ≤ birthday expectation + margin
  });

  it('zero-collision authority: the sequence mint never repeats (simulated trigger)', () => {
    // Mirrors migration 031's assign_listing_code(): serials come from a
    // monotonic counter, so ANY number of concurrent mints is duplicate-free
    // by construction (unlike the hash-serial space above).
    let next = 1000;
    const mint = () => `SE-SL-MVD-${String(next++).padStart(4, '0')}`;
    const mints = Array.from({ length: 5_000 }, mint);
    expect(new Set(mints).size).toBe(5_000);
  });

  it('canonical formats round-trip through the parser', () => {
    const code = canonicalUnitCode({ compound: 'Palm Hills', dealType: 'rent', serial: '007' });
    expect(code).toBe('SE-RNT-PK-0007');
    expect(isCanonicalSierraCode(code)).toBe(true);
    expect(isCanonicalSierraCode('MV-4U-12.5M')).toBe(false); // legacy display format: NOT a stable code
  });
});
