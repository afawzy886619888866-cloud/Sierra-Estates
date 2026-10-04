'use strict';
/**
 * supabase-sync.js — thin REST client over the Supabase PostgREST endpoint.
 *
 * Powers the admin-page wiring: the Workflow Studio (WorkflowStudioView →
 * /api/admin/workflow-studio) renders the public.workflows table, so the EC2
 * runner patches telemetry columns (last_run_at / last_run_ms / success_rate /
 * runs / last_run_label) after every run and READS schedule + status from the
 * same rows. That makes the admin Studio the live control surface for the
 * server-side workflows with zero app-code deploys.
 *
 * The runner NEVER patches name / description / graph / script — admin edits
 * in the Studio are respected as the source of truth.
 */
const { requestJson } = require('./gateway-client');

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function configured() {
  return Boolean(SB_URL && SB_KEY);
}

function headers(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Read workflow rows (optionally restricted to a slug list). */
async function getWorkflows(slugs = null) {
  if (!configured()) return [];
  let qs = '/rest/v1/workflows?select=id,slug,name,name_ar,description,status,schedule,category,trigger_type,success_rate,last_run_ms,last_run_at,last_run_label,runs,updated_at';
  if (slugs && slugs.length) qs += `&slug=in.(${slugs.join(',')})`;
  const res = await requestJson(`${SB_URL}${qs}`, { headers: headers(), timeoutMs: 12000 });
  if (!res.ok) {
    const err = new Error(`workflows read HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
    err.httpStatus = res.status;
    throw err;
  }
  return Array.isArray(res.data) ? res.data : [];
}

/** Patch telemetry for one slug. Only telemetry fields — never admin-owned ones. */
async function patchTelemetry(slug, { lastRunMs, successRate, runsBump = 0, label = 'ec2-runner' } = {}) {
  if (!configured()) return false;
  const patch = { last_run_at: new Date().toISOString() };
  if (Number.isFinite(lastRunMs)) patch.last_run_ms = Math.round(lastRunMs);
  if (Number.isFinite(successRate)) patch.success_rate = Math.round(successRate * 10) / 10;
  if (runsBump) patch.runs = runsBump;
  if (label) patch.last_run_label = label;
  if (!Object.keys(patch).length) return false;
  const res = await requestJson(
    `${SB_URL}/rest/v1/workflows?slug=eq.${encodeURIComponent(slug)}`,
    { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: patch, timeoutMs: 12000 }
  );
  return res.ok;
}

/** Insert a workflow row if missing (idempotent dashboard seeding). */
async function upsertWorkflowRow(row) {
  if (!configured()) return false;
  // try update-by-slug first so repeated installs stay idempotent
  const existing = await getWorkflows([row.slug]);
  if (existing.length) return true;
  const res = await requestJson(
    `${SB_URL}/rest/v1/workflows`,
    { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: row, timeoutMs: 12000 }
  );
  return res.ok;
}

module.exports = { configured, headers, getWorkflows, patchTelemetry, upsertWorkflowRow };
