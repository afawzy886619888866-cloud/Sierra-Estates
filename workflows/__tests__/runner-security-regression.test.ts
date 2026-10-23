import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * P0 2.x SECURITY REGRESSION — runner control-plane + backfill safety.
 *
 * Source-level contract tests (the runner is a long-lived daemon; these pin
 * the exact security properties the production-recovery mission requires):
 *
 *   2.1  authentication FAILS CLOSED when RUNNER_API_KEY is not configured;
 *        comparison is timing-safe; non-loopback binds refuse to start
 *        without a key.
 *   2.2  the hard-coded tracker export credential is gone — the tracker
 *        export is authenticated exactly like every other protected route
 *        and never via a URL query parameter.
 *   2.3  pairing assets (QR image, pairing code) are authenticated and the
 *        code mint is rate-limited; responses are no-store.
 *   2.4  the admin bridge has no fallback credential and never fabricates
 *        session readiness.
 *   5.x  the backfill script never substitutes today's date for an invalid
 *        historical timestamp, keeps per-record identity (history preserved),
 *        takes its secret from the environment only, and is dry-run by
 *        default with --apply required for writes.
 */
describe('runner.js — control-plane security contract (P0 2.1–2.3)', () => {
  const runnerPath = path.resolve(__dirname, '..', 'runner.js');
  const runnerSource = fs.readFileSync(runnerPath, 'utf-8');

  it('2.1: authentication fails CLOSED when no API key is configured', () => {
    // The old fail-open interpretation is gone.
    expect(runnerSource).not.toMatch(/if\s*\(\s*!\s*API_KEY\s*\)\s*return\s*true/);
    // Fail-closed semantics: a missing key refuses every protected route.
    expect(runnerSource).toMatch(/A missing RUNNER_API_KEY means the control plane is NOT authenticated/);
    expect(runnerSource).toMatch(/if \(!API_KEY\) return false;/);
  });

  it('2.1: the API key comparison is timing-safe', () => {
    expect(runnerSource).toContain('crypto.timingSafeEqual');
    expect(runnerSource).toMatch(/createHash\('sha256'\)/);
  });

  it('2.1: a non-loopback bind without an API key refuses to start', () => {
    expect(runnerSource).toMatch(/isLoopbackHost\(BIND\)/);
    expect(runnerSource).toMatch(/refusing to expose an unauthenticated control plane/);
  });

  it('2.2: the tracker export has NO hard-coded credential path', () => {
    // No comparison against a fixed shared-secret literal anywhere.
    expect(runnerSource).not.toMatch(/key\s*!==?\s*['"][A-Za-z0-9]{8,}['"]/);
    // The literal that used to authorise the export must not appear at all.
    expect(runnerSource).not.toContain('SE2026outreach');
    // The route authenticates like every other protected route.
    const trackerBlock = runnerSource.slice(
      runnerSource.indexOf("'/tracker.csv'"),
      runnerSource.indexOf('const ledgerFile'),
    );
    expect(trackerBlock).toContain('authorized(req)');
    expect(trackerBlock).not.toMatch(/searchParams\.get\('key'\)/);
  });

  it('2.3: pairing routes are authenticated and rate-limited; no-store everywhere', () => {
    // Anchor on the actual route handlers (not the header comment).
    const pairCodeAt = runnerSource.indexOf("p === '/pair/code' && req.method === 'POST'");
    const pairQrAt = runnerSource.indexOf("p === '/pair/qr' && req.method === 'GET'");
    expect(pairCodeAt).toBeGreaterThan(0);
    expect(pairQrAt).toBeGreaterThan(0);
    const pairCodeBlock = runnerSource.slice(pairCodeAt, pairCodeAt + 900);
    const pairQrBlock = runnerSource.slice(pairQrAt, pairQrAt + 900);
    expect(pairCodeBlock).toContain('authorized(req)');
    expect(pairQrBlock).toContain('authorized(req)');
    expect(runnerSource).toMatch(/rateLimited\('paircode'/);
    expect(runnerSource).toMatch(/Cache-Control': 'no-store'/);
  });

  it('2.1: unauthenticated /api/health reveals only minimal liveness', () => {
    const healthBlock = runnerSource.slice(
      runnerSource.indexOf("'/api/health'"),
      runnerSource.indexOf('supabase: sb.configured()'),
    );
    expect(healthBlock).toContain('MINIMAL liveness');
    // The detailed payload (gateway, running list) is behind authorized().
    expect(healthBlock).toMatch(/if \(!authorized\(req\)\)/);
  });
});

describe('sierra-admin-bridge.mjs — honest telemetry (P0 2.4)', () => {
  const bridgePath = path.resolve(__dirname, '..', 'sierra-admin-bridge.mjs');
  const bridgeSource = fs.readFileSync(bridgePath, 'utf-8');

  it('has no fallback runner credential', () => {
    expect(bridgeSource).not.toContain('dev-admin-key');
    expect(bridgeSource).toMatch(/runnerHeaders\(\)/);
  });

  it('never fabricates session readiness from a missing session list', () => {
    expect(bridgeSource).not.toMatch(/default assumption for live gateway/);
    expect(bridgeSource).toMatch(/never fabricate readiness/);
    expect(bridgeSource).toMatch(/sessionsKnown/);
    // `reachable ?? true` coercion is gone — only an explicit boolean counts.
    expect(bridgeSource).not.toMatch(/\?\?\s*true/);
  });
});

describe('backfill-sheet.mjs — historical integrity (Phase 5)', () => {
  const backfillPath = path.resolve(__dirname, '..', 'backfill-sheet.mjs');
  const backfillSource = fs.readFileSync(backfillPath, 'utf-8');

  it('5.1: an invalid historical timestamp is REJECTED, never replaced with today', () => {
    // The old bug: `new Date()` fallback when the value is empty/unparseable.
    expect(backfillSource).not.toMatch(/isoStr \? new Date\(isoStr\) : new Date\(\)/);
    expect(backfillSource).toMatch(/missing timestamp/);
    expect(backfillSource).toMatch(/NEVER silently replaced with today/);
  });

  it('5.2: records keep per-row identity — no phone-keyed dedupe Map', () => {
    expect(backfillSource).not.toMatch(/records\.set\(phone,/);
    expect(backfillSource).toContain('recordId(');
    expect(backfillSource).toMatch(/NOT collapsed by phone/);
  });

  it('5.3: transport is authenticated HTTPS (loopback excepted) and secret comes from env only', () => {
    expect(backfillSource).not.toContain('SE2026outreach');
    expect(backfillSource).not.toMatch(/process\.argv\[[23]\]/); // secret/exec URL via argv removed
    expect(backfillSource).toMatch(/isHttpsOrLoopback/);
    expect(backfillSource).toContain("'X-API-Key'");
  });

  it('5.4: dry-run by default, non-zero exit on failures, preserved retry queue', () => {
    expect(backfillSource).toMatch(/process\.argv\.includes\('--apply'\)/);
    expect(backfillSource).toMatch(/if \(failed > 0\) process\.exit\(1\)/);
    expect(backfillSource).toMatch(/backfill-failures\.jsonl/);
    expect(backfillSource).toMatch(/preserve the retry queue in dry-run mode/);
  });

  it('5.x (behavior): validateTimestamp rejects missing, malformed and future dates', async () => {
    const mod = await import('../backfill-sheet.mjs');
    const { validateTimestamp, formatCairoDate, recordId } = mod as any;

    expect(validateTimestamp(null).ok).toBe(false);
    expect(validateTimestamp('').ok).toBe(false);
    expect(validateTimestamp('not-a-date').ok).toBe(false);
    expect(validateTimestamp('2099-01-01T00:00:00Z').ok).toBe(false); // future

    const ok = validateTimestamp('2026-10-01T12:00:00Z');
    expect(ok.ok).toBe(true);
    // Validated timestamps format to Cairo-local dd/mm/yyyy.
    expect(formatCairoDate(ok.iso)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);

    // Record identity is stable and distinguishes distinct history rows.
    const a = recordId({ phone: '201000000000', at: '2026-10-01', code: 'X1' });
    const b = recordId({ phone: '201000000000', at: '2026-10-01', code: 'X1' });
    const c = recordId({ phone: '201000000000', at: '2026-10-02', code: 'X1' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
