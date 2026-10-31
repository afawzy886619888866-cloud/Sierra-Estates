import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const require = createRequire(import.meta.url);
const fleet = require('../workflows/lib/fleet-dispatch.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const AGENT_FLEET_YML = path.join(ROOT_DIR, '.github', 'workflows', 'agent-fleet.yml');
const RUNNER_JS = path.join(ROOT_DIR, 'workflows', 'runner.js');
const FLEET_LIB = path.join(ROOT_DIR, 'workflows', 'lib', 'fleet-dispatch.js');
const RUNNER_COMPOSE = path.join(ROOT_DIR, 'infra', 'docker-compose.runner.yml');

/**
 * Extract the canonical task allowlist from agent-fleet.yml's case statement —
 * the SAME set the GitHub workflow accepts. The local runner's fleet registry
 * must stay in lockstep with it: adding a task to the fleet without adding it
 * here means the local bridge silently refuses a legitimate task; the reverse
 * means the bridge dispatches something GitHub rejects with a red X.
 */
function workflowAllowlist(): string[] {
  const yml = fs.readFileSync(AGENT_FLEET_YML, 'utf-8');
  // The allowlist is the shell case-pattern line ("briefing:daily|…|cline:check)")
  // that follows the `case "$task" in` line inside the fleet dispatch step.
  const lines = yml.split('\n');
  const caseIdx = lines.findIndex((l) => /^\s*case\s+"\$task"\s+in\s*$/.test(l) || /case\s+"\$task"\s+in/.test(l));
  if (caseIdx === -1) return [];
  const patternLine = lines.slice(caseIdx + 1).find((l) => l.includes('|') && l.trim().endsWith(')'));
  if (!patternLine) return [];
  return patternLine
    .trim()
    .replace(/\)$/, '')
    .split('|')
    .map((t) => t.trim())
    .filter(Boolean);
}

describe('Local Runner Fleet Dispatch (Production agent fleet bridge)', () => {
  describe('task registry — lockstep with .github/workflows/agent-fleet.yml', () => {
    it('exposes the exact allowlist the GitHub fleet workflow accepts', () => {
      const canonical = workflowAllowlist();
      expect(canonical.length).toBeGreaterThan(10); // sanity: the case line parsed
      expect([...fleet.FLEET_TASKS].sort()).toEqual([...canonical].sort());
    });

    it('accepts fleet:run-all only as the explicit full-chain request', () => {
      expect(fleet.FLEET_RUN_ALL).toBe('fleet:run-all');
      expect(fleet.FLEET_TASKS).not.toContain(fleet.FLEET_RUN_ALL); // never inside a comma list
    });
  });

  describe('parseTasks — explicit selection, no surprises', () => {
    it('accepts a comma-separated string, trimming and deduping', () => {
      const out = fleet.parseTasks(' briefing:daily , check-thresholds ,briefing:daily ');
      expect(out.ok).toBe(true);
      expect(out.tasks).toEqual(['briefing:daily', 'check-thresholds']);
      expect(out.unknown).toEqual([]);
    });

    it('accepts an array of task names', () => {
      const out = fleet.parseTasks(['automation:cycle', 'cline:audit']);
      expect(out.ok).toBe(true);
      expect(out.tasks).toEqual(['automation:cycle', 'cline:audit']);
    });

    it('rejects unknown tasks (fail-closed BEFORE GitHub is called)', () => {
      const out = fleet.parseTasks('briefing:daily,rm -rf /,curl evil.example');
      expect(out.ok).toBe(false);
      expect(out.unknown).toEqual(['rm -rf /', 'curl evil.example']);
    });

    it('rejects an empty selection', () => {
      expect(fleet.parseTasks('').ok).toBe(false);
      expect(fleet.parseTasks([]).ok).toBe(false);
      expect(fleet.parseTasks(' , , ').ok).toBe(false);
    });

    it('collapses fleet:run-all to exactly the full-chain request', () => {
      const out = fleet.parseTasks('briefing:daily,fleet:run-all');
      expect(out.ok).toBe(true);
      expect(out.tasks).toEqual(['fleet:run-all']);
    });
  });

  describe('fail-closed without FLEET_GITHUB_TOKEN', () => {
    const ORIGINAL = process.env.FLEET_GITHUB_TOKEN;

    it('dispatchFleet refuses honestly instead of sending anything', async () => {
      delete process.env.FLEET_GITHUB_TOKEN;
      const out = await fleet.dispatchFleet('briefing:daily');
      expect(out.ok).toBe(false);
      expect(out.error).toBe('unconfigured');
      expect(out.status).toBe(0);
    });

    it('dispatchFleet rejects invalid tasks even before the token check outcome matters', async () => {
      process.env.FLEET_GITHUB_TOKEN = 'test-token';
      const out = await fleet.dispatchFleet('definitely:not:a:task');
      expect(out.ok).toBe(false);
      expect(out.error).toBe('invalid_tasks');
      expect(out.unknown).toEqual(['definitely:not:a:task']);
    });

    it('fleetRunStatus reports unconfigured without a token', async () => {
      delete process.env.FLEET_GITHUB_TOKEN;
      const out = await fleet.fleetRunStatus();
      expect(out.ok).toBe(false);
      expect(out.configured).toBe(false);
    });

    it('fleetConfig never leaks token material', () => {
      process.env.FLEET_GITHUB_TOKEN = 'ghp_shouldneverappear';
      const cfg = fleet.fleetConfig();
      expect(JSON.stringify(cfg)).not.toContain('ghp_shouldneverappear');
      expect(cfg.configured).toBe(true);
      if (ORIGINAL === undefined) delete process.env.FLEET_GITHUB_TOKEN;
      else process.env.FLEET_GITHUB_TOKEN = ORIGINAL;
    });
  });

  describe('dispatch ledger persistence', () => {
    it('records dispatches and tails recent history (max 20)', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-state-'));
      const resolved = require.resolve('../workflows/lib/fleet-dispatch.js');
      const cached = require.cache[resolved];
      delete require.cache[resolved]; // bust the cache: STATE_DIR binds at require time
      process.env.WF_STATE_DIR = tmp;
      try {
        const fresh = require('../workflows/lib/fleet-dispatch.js');
        fresh.recordDispatch({ at: '2026-10-31T10:00:00Z', tasks: ['briefing:daily'], ref: 'main', origin: 'test' });
        fresh.recordDispatch({ at: '2026-10-31T10:05:00Z', tasks: ['check-thresholds'], ref: 'main', origin: 'test' });
        const st = fresh.loadFleetState();
        expect(st.lastDispatch.tasks).toEqual(['check-thresholds']);
        expect(st.history.length).toBe(2);
      } finally {
        delete process.env.WF_STATE_DIR;
        delete require.cache[resolved];
        if (cached) require.cache[resolved] = cached; // restore for any later use
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('runner.js control-plane wiring', () => {
    const runner = fs.readFileSync(RUNNER_JS, 'utf-8');

    it('requires the fleet-dispatch lib', () => {
      expect(runner).toContain("require('./lib/fleet-dispatch')");
    });

    it('exposes GET /api/fleet, POST /api/fleet/run and GET /api/fleet/status', () => {
      expect(runner).toContain("p === '/api/fleet' && req.method === 'GET'");
      expect(runner).toContain("p === '/api/fleet/run' && req.method === 'POST'");
      expect(runner).toContain("p === '/api/fleet/status' && req.method === 'GET'");
    });

    it('auth-gates every fleet route (fail-closed control plane)', () => {
      const fleetSection = runner.slice(runner.indexOf("p === '/api/fleet'"));
      expect(fleetSection.slice(0, 4000)).toContain('authorized(req)');
    });

    it('rate-limits dispatch hammering and enforces a cooldown window', () => {
      expect(runner).toContain("rateLimited('fleetrun'");
      expect(runner).toContain('FLEET_DISPATCH_COOLDOWN_MS');
      expect(runner).toContain("'cooldown'");
    });

    it('reports fleet configuration in the authenticated /api/health payload', () => {
      expect(runner).toContain('fleet: fleet.fleetConfig()');
    });
  });

  describe('docker-compose runner wiring', () => {
    it('passes the FLEET_* bridge variables into the container (empty = fail-closed)', () => {
      const compose = fs.readFileSync(RUNNER_COMPOSE, 'utf-8');
      expect(compose).toContain('FLEET_GITHUB_TOKEN=${FLEET_GITHUB_TOKEN:-}');
      expect(compose).toContain('FLEET_GITHUB_REPO=');
      expect(compose).toContain('FLEET_GITHUB_WORKFLOW=');
      expect(compose).toContain('FLEET_DISPATCH_COOLDOWN_MS=');
    });
  });

  describe('secret hygiene', () => {
    it('the fleet bridge source contains no embedded credentials', () => {
      const lib = fs.readFileSync(FLEET_LIB, 'utf-8');
      expect(lib).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
      expect(lib).not.toMatch(/github_pat_[A-Za-z0-9_]{20,}/);
      expect(lib).not.toMatch(/Bearer\s+[A-Za-z0-9]{30,}\s*['"]/);
    });
  });
});
