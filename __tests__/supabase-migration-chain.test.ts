/**
 * Tests: Supabase migration chain reconciliation + deploy workflow contract
 * (2026-10-25).
 *
 * The "Deploy Supabase (schema + migrations)" workflow historically ran
 * ONLY apply-supabase-schema.mjs (schema.sql) — migrations 031–036 could
 * never reach production through it, and push events even attempted REAL
 * applies by default (inputs.dry_run is empty on push). All 7 recorded runs
 * failed at the credential gate because the SUPABASE_DB_URL secret does not
 * exist in the repository.
 *
 * 2026-10-31 completion: runs #8–#10 (Oct 27–31) proved the event-aware
 * routing was never actually wired — push events still took the apply path
 * because an absent inputs.dry_run coerces to false. The step conditions are
 * now explicitly event-aware (push = validate-only; apply requires an
 * explicit workflow_dispatch with dry_run=false), and this contract pins
 * that routing so it cannot silently regress.
 *
 * Pinned here:
 *   · the new chain applier (apply-supabase-migrations.mjs) derives ledger
 *     versions with G2 parity — 031/032/033 map to the versions already
 *     recorded in production (20261019031000/32000/33000), so reconciliation
 *     skips them instead of re-applying;
 *   · every derived version is unique and the chain validates statically
 *     (dry-run exits 0, no credentials, no network);
 *   · the workflow now applies schema AND migrations on the real path,
 *     gates credentials on the apply branch only, and defaults push events
 *     to safe dry-run validation;
 *   · migrations 031–036 exist and carry their advertised content.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const APPLIER = path.join(ROOT, 'scripts', 'apply-supabase-migrations.mjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'deploy-supabase.yml');

function dryRunOutput(): string {
  return execFileSync('node', [APPLIER, '--dry-run'], { encoding: 'utf8', cwd: ROOT });
}

describe('apply-supabase-migrations.mjs — chain + ledger reconciliation', () => {
  it('dry-run validates the whole chain statically (exit 0, no credentials)', () => {
    const out = dryRunOutput();
    expect(out).toContain('static validation passed');
    expect(out).toContain('no network call was made');
  });

  it('derives ledger versions with G2 parity for 031/032/033', () => {
    const out = dryRunOutput();
    // These exact versions are already recorded in the production ledger
    // (G2 evidence) — parity means the applier will SKIP them, never
    // re-apply, on its first real run.
    expect(out).toContain('20261019031000  20261019_031_stable_listing_codes.sql');
    expect(out).toContain('20261019032000  20261019_032_domain_parity_and_code_immutability.sql');
    expect(out).toContain('20261019033000  20261019_033_owner_outreach_audit_log.sql');
  });

  it('derives unique versions across the whole chain (incl. 019/019c, 020a/020b)', () => {
    const out = dryRunOutput();
    const versions = [...out.matchAll(/^\s+(\d{5,14})\s+\S+\.sql$/gm)].map((m) => m[1]);
    expect(versions.length).toBeGreaterThanOrEqual(34);
    expect(new Set(versions).size).toBe(versions.length);
    // collision disambiguation stays ordered: 019 < 019c
    expect(versions.indexOf('20261002019000')).toBeLessThan(versions.indexOf('20261002019001'));
    expect(versions).toContain('20261003020000');
    expect(versions).toContain('20261003020001');
  });

  it('covers migrations 031–036 in the chain', () => {
    const out = dryRunOutput();
    for (const f of [
      '20261019_031_stable_listing_codes.sql',
      '20261019_032_domain_parity_and_code_immutability.sql',
      '20261019_033_owner_outreach_audit_log.sql',
      '20261021_034_owner_outreach_template_softening.sql',
      '20261021_035_listing_self_transition_guard.sql',
      '20261025_036_security_definer_search_path.sql',
    ]) {
      expect(out).toContain(f);
      expect(fs.existsSync(path.join(MIGRATIONS, f))).toBe(true);
    }
  });

  it('reads the live ledger FIRST and skips already-recorded migrations (source contract)', () => {
    const code = fs.readFileSync(APPLIER, 'utf8');
    expect(code).toContain('SELECT version FROM supabase_migrations.schema_migrations');
    expect(code).toContain('already-in-ledger');
    // Applies strictly in order and STOPS at the first failure.
    expect(code).toContain('stop at the first failure');
    expect(code).toContain('break; // stop at the first failure');
  });
});

describe('deploy-supabase.yml — workflow contract', () => {
  it('applies BOTH the canonical schema and the migration chain on the real path', () => {
    const wf = fs.readFileSync(WORKFLOW, 'utf8');
    expect(wf).toContain('apply-supabase-schema.mjs');
    expect(wf).toContain('apply-supabase-migrations.mjs');
  });

  it('validates the chain with NO credentials in dry-run mode', () => {
    const wf = fs.readFileSync(WORKFLOW, 'utf8');
    expect(wf).toContain('Validate migration chain (dry run — no credentials needed)');
    expect(wf).toContain("if: ${{ github.event_name == 'push' || inputs.dry_run != false }}");
  });

  it('keeps the loud two-credential gate on the APPLY branch only', () => {
    const wf = fs.readFileSync(WORKFLOW, 'utf8');
    expect(wf).toContain('SUPABASE_ACCESS_TOKEN and SUPABASE_DB_URL are required');
    expect(wf).toContain("if: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run == false }}");
  });
});

describe('migrations 031–036 — advertised content present', () => {
  it('031 mints stable codes via a Postgres sequence and preserves existing codes', () => {
    const sql = fs.readFileSync(path.join(MIGRATIONS, '20261019_031_stable_listing_codes.sql'), 'utf8');
    expect(sql).toMatch(/CREATE SEQUENCE IF NOT EXISTS/i);
    expect(sql).toMatch(/code IS NULL OR TRIM\(code\) = ''/);
  });

  it('032 adds the domain-parity columns (sources/status_history)', () => {
    const sql = fs.readFileSync(path.join(MIGRATIONS, '20261019_032_domain_parity_and_code_immutability.sql'), 'utf8');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS status_history/);
  });

  it('033 creates the owner_outreach_log audit table with RLS', () => {
    const sql = fs.readFileSync(path.join(MIGRATIONS, '20261019_033_owner_outreach_audit_log.sql'), 'utf8');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.owner_outreach_log/i);
    expect(sql).toMatch(/ROW LEVEL SECURITY/i);
  });

  it('036 pins search_path on the SECURITY DEFINER functions', () => {
    const sql = fs.readFileSync(path.join(MIGRATIONS, '20261025_036_security_definer_search_path.sql'), 'utf8');
    expect(sql).toMatch(/ALTER FUNCTION public\.flag_stale_listings\(\)\s+SET search_path = public, pg_temp/);
    expect(sql).toMatch(/ALTER FUNCTION public\.listing_status_guard\(\)\s+SET search_path = public, pg_temp/);
  });
});
