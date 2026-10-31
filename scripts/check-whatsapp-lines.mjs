#!/usr/bin/env node
/**
 * scripts/check-whatsapp-lines.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Live operational health probe for Sierra Estates Multi-Line WhatsApp Pool
 * (:2785 OpenWA Gateway) and Workflow Control Plane (:2786 Runner).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const rel of ['.env.local', '.env', 'workflows/.env', 'apps/agents/whatsapp-multi-session/.env']) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const gatewayUrl = (process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785').replace(/\/+$/, '');
const runnerUrl = `http://127.0.0.1:${process.env.RUNNER_PORT || '2786'}`;
const apiKey = process.env.OPENWA_OPERATOR_KEY || process.env.WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY || '';
const runnerKey = process.env.RUNNER_API_KEY || '';

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const gwHeaders = apiKey ? { 'X-API-Key': apiKey } : {};
  const rnHeaders = runnerKey ? { 'X-API-Key': runnerKey } : {};

  const [gwHealth, gwSessions, rnHealth] = await Promise.all([
    fetchJson(`${gatewayUrl}/api/health`, gwHeaders).catch((e) => ({ ok: false, error: e.message })),
    fetchJson(`${gatewayUrl}/api/sessions`, gwHeaders).catch((e) => ({ ok: false, error: e.message })),
    fetchJson(`${runnerUrl}/api/health`, rnHeaders).catch((e) => ({ ok: false, error: e.message })),
  ]);

  const sessions = Array.isArray(gwSessions.data) ? gwSessions.data : [];
  const readyLines = sessions.filter((s) => String(s.status).toLowerCase() === 'ready');

  const report = {
    checkedAt: new Date().toISOString(),
    gateway: {
      url: gatewayUrl,
      healthy: Boolean(gwHealth.ok),
      totalLines: sessions.length,
      readyLinesCount: readyLines.length,
      lines: sessions.map((s) => ({
        id: s.id,
        status: s.status,
        phone: s.phone ? `+${String(s.phone).replace(/^\+/, '')}` : null,
        pushName: s.pushName || null,
        engineLoaded: Boolean(s.engineLoaded),
        totalSent: Number(s.totalSent || 0),
        lastActive: s.lastActive || null,
      })),
    },
    workflowRunner: {
      url: runnerUrl,
      healthy: Boolean(rnHealth.ok && rnHealth.data?.ok),
      supabaseConfigured: Boolean(rnHealth.data?.supabase),
      timezone: rnHealth.data?.tz || null,
      runningWorkflows: rnHealth.data?.running || [],
    },
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.gateway.healthy || readyLines.length === 0) {
    process.exitCode = 1;
  }
}

main();
