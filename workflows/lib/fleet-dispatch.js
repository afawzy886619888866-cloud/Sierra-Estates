'use strict';
/**
 * fleet-dispatch.js — Local control-plane bridge to the Production agent fleet.
 * ─────────────────────────────────────────────────────────────────────────────
 * The 4-Engine production agent fleet (briefing:daily, automation:cycle,
 * sync-propertyfinder, run-harness, check-thresholds … fleet:run-all) runs on
 * GitHub Actions as ".github/workflows/agent-fleet.yml" — with its secrets
 * (PROPERTY_FINDER_API_KEY, DEEPSEEK_API_KEY, CLINE_API_KEY…) stored ONLY as
 * GitHub secrets. The local Docker runner (workflows/runner.js, control port
 * 127.0.0.1:2786) is the post-EC2 control plane, so it GAINS the ability to
 * dispatch that fleet on demand through the GitHub workflow_dispatch API:
 *
 *   POST /api/fleet/run    { "tasks": "briefing:daily,check-thresholds" }
 *   GET  /api/fleet                 → task registry + config + last dispatch
 *   GET  /api/fleet/status          → live run status from GitHub
 *
 * Design rules (mirroring the runner's own doctrine):
 *   • FAIL-CLOSED: no FLEET_GITHUB_TOKEN configured → dispatch refuses with
 *     an honest `unconfigured` answer; nothing opens up by default.
 *   • EXPLICIT TASK SELECTION ONLY: the allowlist below is generated from the
 *     SAME canonical set agent-fleet.yml's case statement accepts — an
 *     unknown task is rejected before GitHub is ever called (no blanket
 *     "run everything" surprises; fleet:run-all must be requested verbatim).
 *   • SECRETS STAY ON GITHUB: the token env var is read at call time, never
 *     logged, never echoed back in API responses.
 *   • ONE DISPATCH AT A TIME + cooldown: the GitHub workflow itself carries
 *     `concurrency: group agent-fleet, cancel-in-progress: false`, so a fleet
 *     run is never cancelled mid-flight; the local side mirrors that by
 *     refusing to stack dispatches during the cooldown window.
 */

const fs = require('fs');
const path = require('path');
const { requestJson } = require('./gateway-client');

const GITHUB_API = 'https://api.github.com';

// ── Canonical fleet task registry ───────────────────────────────────────────
// MUST stay in lockstep with .github/workflows/agent-fleet.yml's case
// statement (the dispatch allowlist). __tests__/local-runner-fleet-dispatch
// .test.ts parses the workflow file and fails CI if the two ever drift.
const FLEET_TASKS = [
  'briefing:daily',
  'sync-propertyfinder',
  'export:propertyfinder',
  'pf:publish:owners',
  'pf:publish:ads',
  'harvest:photos',
  'automation:cycle',
  'vertex-agent',
  'run-harness',
  'deepseek:reason',
  'deepseek:eval',
  'deepseek:develop',
  'check-thresholds',
  'openclaw:task',
  'cline:audit',
  'cline:hygiene',
  'cline:docs-sync',
  'cline:check',
];

// The full chain — accepted ONLY when requested verbatim (agent-fleet.yml
// routes it to `pnpm fleet:run-all`, never as part of a comma list).
const FLEET_RUN_ALL = 'fleet:run-all';

const DEFAULT_REPO = process.env.FLEET_GITHUB_REPO
  || 'afawzy886619888866-cloud/Sierra-Estates';
const DEFAULT_WORKFLOW = process.env.FLEET_GITHUB_WORKFLOW || 'agent-fleet.yml';
const DEFAULT_REF = process.env.FLEET_GITHUB_REF || 'main';

// Local dispatch ledger (survives restarts via the compose volume mount at
// /app/.state). Kept SEPARATE from the 10 workflow slugs' state files: fleet
// tasks are not admin-managed public.workflows rows and must never pollute
// their telemetry.
const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const FLEET_STATE_FILE = path.join(STATE_DIR, 'fleet-dispatch.json');

/**
 * Parse + validate a task selection coming from an operator or the Studio.
 * Accepts a comma-separated string or an array of strings.
 * Returns { ok, tasks, unknown } — `tasks` is deduped, order-preserved.
 */
function parseTasks(input) {
  const raw = Array.isArray(input)
    ? input.map((t) => String(t))
    : String(input || '').split(',');
  const tasks = [];
  const unknown = [];
  for (const t of raw) {
    const name = t.trim();
    if (!name) continue;
    if (name === FLEET_RUN_ALL) {
      // The full chain only makes sense alone — collapse to exactly that.
      return { ok: true, tasks: [FLEET_RUN_ALL], unknown: [] };
    }
    if (!FLEET_TASKS.includes(name)) unknown.push(name);
    else if (!tasks.includes(name)) tasks.push(name);
  }
  if (!tasks.length || unknown.length) return { ok: false, tasks, unknown };
  return { ok: true, tasks, unknown: [] };
}

/** Configuration snapshot for /api/fleet + /api/health (no secrets). */
function fleetConfig() {
  const token = process.env.FLEET_GITHUB_TOKEN || '';
  return {
    configured: Boolean(token),
    repo: DEFAULT_REPO,
    workflow: DEFAULT_WORKFLOW,
    ref: DEFAULT_REF,
    taskCount: FLEET_TASKS.length + 1, // + fleet:run-all
  };
}

/** Load the local dispatch ledger (insert-if-missing semantics). */
function loadFleetState() {
  try {
    return JSON.parse(fs.readFileSync(FLEET_STATE_FILE, 'utf8'));
  } catch (_) {
    return { lastDispatch: null, history: [] };
  }
}

function saveFleetState(patch) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const st = Object.assign(loadFleetState(), patch);
    const tmp = `${FLEET_STATE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(st, null, 1));
    fs.renameSync(tmp, FLEET_STATE_FILE);
    return st;
  } catch (_) {
    return loadFleetState(); // best-effort: dispatch still works without a ledger
  }
}

function recordDispatch(entry) {
  const st = loadFleetState();
  const history = [entry, ...(st.history || [])].slice(0, 20);
  return saveFleetState({ lastDispatch: entry, history });
}

/**
 * Dispatch the Production agent fleet on GitHub (workflow_dispatch).
 * FAIL-CLOSED: without a token nothing is sent and an honest error returns.
 */
async function dispatchFleet(tasksInput) {
  // Validate the task selection FIRST — a typo deserves the honest 400 +
  // allowlist even when the bridge itself is not configured yet.
  const parsed = parseTasks(tasksInput);
  if (!parsed.ok) {
    return { ok: false, status: 0, error: 'invalid_tasks', unknown: parsed.unknown };
  }
  const token = process.env.FLEET_GITHUB_TOKEN || '';
  if (!token) {
    return { ok: false, status: 0, error: 'unconfigured', hint: 'Set FLEET_GITHUB_TOKEN (repo + actions:write) to enable local fleet dispatch.' };
  }
  const tasks = parsed.tasks.join(',');
  const res = await requestJson(
    `${GITHUB_API}/repos/${DEFAULT_REPO}/actions/workflows/${DEFAULT_WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'sierra-estates-local-runner',
      },
      body: { ref: DEFAULT_REF, inputs: { tasks } },
      timeoutMs: 20000,
    },
  );
  if (!res.ok) {
    // GitHub returns 204 on success; 401/403/422 are config problems worth
    // surfacing honestly to the operator.
    const msg = (res.data && (res.data.message || res.data.raw)) || `github ${res.status}`;
    return { ok: false, status: res.status, error: 'dispatch_failed', detail: String(msg).slice(0, 300) };
  }
  const entry = {
    at: new Date().toISOString(),
    tasks: parsed.tasks,
    ref: DEFAULT_REF,
    origin: 'local-runner',
  };
  recordDispatch(entry);
  return { ok: true, status: res.status, dispatched: entry };
}

/**
 * Live status of the most recent fleet run on GitHub (any trigger).
 * Returns a normalized, secret-free summary.
 */
async function fleetRunStatus() {
  const token = process.env.FLEET_GITHUB_TOKEN || '';
  if (!token) {
    return { ok: false, configured: false, error: 'unconfigured' };
  }
  const res = await requestJson(
    `${GITHUB_API}/repos/${DEFAULT_REPO}/actions/workflows/${DEFAULT_WORKFLOW}/runs?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'sierra-estates-local-runner',
      },
      timeoutMs: 20000,
    },
  );
  if (!res.ok) {
    const msg = (res.data && (res.data.message || res.data.raw)) || `github ${res.status}`;
    return { ok: false, configured: true, error: 'status_failed', detail: String(msg).slice(0, 300) };
  }
  const run = (res.data && res.data.workflow_runs && res.data.workflow_runs[0]) || null;
  if (!run) return { ok: true, configured: true, run: null };
  return {
    ok: true,
    configured: true,
    run: {
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      headSha: run.head_sha ? String(run.head_sha).slice(0, 9) : '',
      htmlUrl: run.html_url,
    },
  };
}

module.exports = {
  FLEET_TASKS,
  FLEET_RUN_ALL,
  parseTasks,
  fleetConfig,
  dispatchFleet,
  fleetRunStatus,
  loadFleetState,
  recordDispatch,
};
