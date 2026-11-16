/**
 * G2 queue item 4 contract pins (2026-10-19): the owner-outreach engine's
 * Supabase audit trail.
 *
 * outreach.js keeps its operational dedupe in the JSONL ledger + sheet column
 * (fail-open by design). These static pins lock the NEW canonical audit
 * contract so it cannot silently regress:
 *   1. every REAL send writes a row to public.owner_outreach_log
 *      (migration 033) — fire-and-forget, never blocking a send
 *   2. DRY-RUN sends never write audit rows (§21 no-fabrication)
 *   3. audit failures are counted in the run summary — never swallowed
 *   4. the audit is env-gated: missing Supabase creds disable it LOUDLY,
 *      with the ledger + sheet named as the remaining record
 *   5. migration 033 exists and creates exactly this table
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const WORKFLOWS_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(WORKFLOWS_ROOT, '..');
const OUTREACH = path.join(WORKFLOWS_ROOT, '09-owner-outreach', 'outreach.js');
const MIGRATION_ROOT = path.join(REPO_ROOT, 'supabase', 'migrations');
const MIGRATION_MIRROR = path.join(
  REPO_ROOT,
  'apps',
  'sierra-estates-realty',
  'supabase',
  'migrations',
);
const MIGRATION_033 = '20261019_033_owner_outreach_audit_log.sql';

describe('Workflow 09 - owner outreach Supabase audit trail (G2, 2026-10-19)', () => {
  const code = fs.readFileSync(OUTREACH, 'utf-8');

  it('writes a canonical audit row per REAL send (owner_outreach_log)', () => {
    expect(code).toContain("from('owner_outreach_log')");
    expect(code).toContain('function auditContact');
    // The audit call sits on the real-send success path, right after the ledger.
    expect(code).toMatch(/appendLedger\(\{ phone[\s\S]{0,400}void auditContact\(/);
  });

  it('never blocks or fails a send on audit health (fire-and-forget + own accounting)', () => {
    expect(code).toMatch(/void auditContact\(/);
    expect(code).toContain('summary.auditFailed++');
    expect(code).toContain('summary.auditWritten++');
    // Summary ships the audit counters for honest run labels.
    expect(code).toMatch(/auditWritten: 0/);
    expect(code).toMatch(/auditFailed: 0/);
  });

  it('dry-run NEVER fabricates contact records (§21)', () => {
    // The audit invocation must live inside the non-dry-run branch: the
    // dry-run branch (which prints "would send") appears earlier and has
    // no auditContact call.
    const dryRunBranch = code.split('would send')[1]?.split('} else {')[0] ?? '';
    expect(dryRunBranch).not.toContain('auditContact');
    // And the insert itself pins dry_run: false (callers = real sends only).
    expect(code).toContain('dry_run: false');
  });

  it('is env-gated with a LOUD disable notice naming the remaining record', () => {
    expect(code).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(code).toContain('Supabase audit DISABLED');
    expect(code).toContain('ledger + sheet remain the record');
  });

  it('migration 033 creates exactly this audit table (both mirrors, byte-identical)', () => {
    const root = fs.readFileSync(path.join(MIGRATION_ROOT, MIGRATION_033), 'utf-8');
    const mirror = fs.readFileSync(path.join(MIGRATION_MIRROR, MIGRATION_033), 'utf-8');
    expect(root).toBe(mirror);
    expect(root).toContain('CREATE TABLE IF NOT EXISTS public.owner_outreach_log');
    // RLS: staff read-only; service-role-only writes (no anon policy).
    expect(root).toContain('ENABLE ROW LEVEL SECURITY');
    expect(root).toContain('owner_outreach_log_staff_read');
    expect(root).not.toContain('FOR INSERT TO authenticated');
    expect(root).not.toContain('FOR ALL TO anon');
  });
});
