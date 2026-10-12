import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * P0-9 REGRESSION — workflow runner fail-closed + paused-workflow contract.
 *
 * Source-level contract tests (the runner is a long-lived daemon; these
 * assertions pin the exact safety properties the mission requires):
 *
 *  1. No hardcoded local fallback workflow rows: with Supabase unconfigured
 *     the scheduler stays IDLE (fail-closed) — it never invents active rows.
 *  2. The hourly owner-outreach window only queues when the PERSISTED row
 *     for owner-outreach is 'active' — a paused/draft workflow can never be
 *     fired by a local timer.
 *  3. runWorkflow() re-checks the persisted status immediately before
 *     spawning for every AUTOMATIC trigger (cron / hourly-window / studio),
 *     and a failed status read fails CLOSED (no dispatch).
 *  4. The outreach batch cap (WF_SLOT_BATCH) is honored inside the loop.
 */

describe('runner.js — scheduler safety contract (P0-9)', () => {
  const runnerPath = path.resolve(__dirname, '..', 'runner.js');
  const runnerSource = fs.readFileSync(runnerPath, 'utf-8');

  it('1. fails closed when Supabase is not configured (no invented rows)', () => {
    // The old bug: `rows = [ { slug: 'owner-outreach', status: 'active' ... } ]`
    // as a local default. That literal must not exist.
    expect(runnerSource).not.toMatch(/slug:\s*'owner-outreach',\s*status:\s*'active'/);
    expect(runnerSource).toContain("if (!sb.configured())");
    expect(runnerSource).toMatch(/supabase not configured — scheduler idle, no dispatch \(fail-closed\)/);
    // A workflows-read failure also aborts the pass (fail-closed), not just logs.
    expect(runnerSource).toMatch(/workflows read failed — no dispatch this pass \(fail-closed\)/);
  });

  it('2. the hourly window queues ONLY when the persisted owner-outreach row is active', () => {
    expect(runnerSource).toMatch(/outreachRow && String\(outreachRow\.status \|\| ''\)\.toLowerCase\(\) === 'active'/);
    // The queue entry is gated by the row lookup, not a bare hour check.
    const hourlyBlock = runnerSource.slice(
      runnerSource.indexOf('Hourly window check'),
      runnerSource.indexOf('const now = new Date();'),
    );
    expect(hourlyBlock).toContain("rowBySlug.get('owner-outreach')");
    expect(hourlyBlock).toContain("outreachRow");
  });

  it('3. runWorkflow re-checks the persisted status immediately before execution', () => {
    expect(runnerSource).toContain('AUTOMATIC_TRIGGERS');
    expect(runnerSource).toMatch(/AUTOMATIC_TRIGGERS\.has\(trigger\)/);
    expect(runnerSource).toMatch(/dispatch refused — persisted status/);
    // A failed status read fails closed.
    expect(runnerSource).toMatch(/dispatch refused — status recheck failed \(fail-closed\)/);
  });

  it('4. outreach respects the hourly batch cap inside the traversal loop', () => {
    const outreachPath = path.resolve(__dirname, '..', '09-owner-outreach', 'outreach.js');
    const outreachSource = fs.readFileSync(outreachPath, 'utf-8');
    expect(outreachSource).toContain('BATCH_CAP');
    expect(outreachSource).toMatch(/if \(summary\.sent >= BATCH_CAP\)/);
  });
});

describe('08-units-sync — sheet sync cannot promote a record (P0 §4)', () => {
  const syncPath = path.resolve(__dirname, '..', '08-units-sync', 'sync.js');
  const syncSource = fs.readFileSync(syncPath, 'utf-8');

  it('fresh sheet rows land REVIEW_REQUIRED — never PUBLISHABLE', () => {
    expect(syncSource).toContain("listing.publish_status = 'REVIEW_REQUIRED'");
    expect(syncSource).toMatch(/publish_status: 'REVIEW_REQUIRED'/);
    expect(syncSource).not.toMatch(/publish_status\s*[:=]\s*'PUBLISHABLE'/);
  });

  it('PATCH strips human verification fields (anti-overwrite)', () => {
    expect(syncSource).toMatch(/const \{ publish_status, verified_at, verified_by, \.\.\.updatePayload \} = l;/);
  });

  it('never writes verified_at / verified_by / source_verified_at', () => {
    // Comments document the rule; only actual payload WRITES are forbidden
    // (a `verified_at:` / `verified_at =` assignment inside the code).
    const codeOnly = syncSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(codeOnly).not.toMatch(/verified_at\s*[:=]/);
    expect(codeOnly).not.toMatch(/verified_by\s*[:=]/);
    expect(codeOnly).not.toMatch(/source_verified_at\s*[:=]/);
  });
});
