import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * P0-C REGRESSION — WhatsApp outreach workflow live-send is OPT-IN.
 *
 * Until 2026-10-20 .github/workflows/whatsapp-outreach.yml defaulted
 * SCHEDULED runs to WF_DRY_RUN='false' (LIVE): a standing 30-minute cron
 * that would begin real owner contact the moment the gateway session
 * re-pairs, with no operator gate in between. The safety contract now:
 *   · scheduled runs are DRY-RUN unless vars.WHATSAPP_LIVE_OUTREACH == 'true';
 *   · manual workflow_dispatch runs keep their per-run dry_run input;
 *   · the job still executes the canonical engine (workflows/09), never a
 *     bespoke sender.
 */

describe('WhatsApp outreach workflow safety contract', () => {
  const WORKFLOWS_DIR = path.resolve(__dirname, '..', '.github', 'workflows');
  const content = fs.readFileSync(path.join(WORKFLOWS_DIR, 'whatsapp-outreach.yml'), 'utf-8');

  it('scheduled runs default to DRY-RUN unless WHATSAPP_LIVE_OUTREACH is explicitly true', () => {
    expect(content).toContain("vars.WHATSAPP_LIVE_OUTREACH == 'true'");
    const dryRunLine = content
      .split('\n')
      .find((l) => l.trim().startsWith('WF_DRY_RUN:'));
    expect(dryRunLine).toBeDefined();
    // manual dispatch keeps its choice; everything else (schedule) flips to 'true' (dry)
    expect(dryRunLine).toContain("inputs.dry_run");
    expect(dryRunLine).toContain("'true'");
  });

  it('still runs the canonical outreach engine, not a bespoke sender', () => {
    expect(content).toContain('node workflows/09-owner-outreach/outreach.js');
    expect(content).not.toMatch(/sierra_master\.py/);
  });

  it('keeps concurrency + timeout guards', () => {
    expect(content).toMatch(/concurrency:/);
    expect(content).toMatch(/timeout-minutes:\s*\d+/);
  });
});
