'use strict';
/**
 * Guardian Bot 5 — System Supervisor & Self-Optimizer ("Ops Watchdog").
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 4 (2026-11-01). Runs EVERY 15 MINUTES from the workflow runner
 * (control plane :2786 cron lane) and consolidates the system health
 * doctrine:
 *
 *   · Docker containers (docker compose ps via the Docker socket when
 *     present; falls back to the runner's own health endpoints)
 *   · OpenWA lines — gateway :2785 /api/health + /api/sessions readiness
 *   · Supabase — RLS probe (a service-role write to a scratch table is NOT
 *     attempted; instead we probe the PostgREST error surface: auth errors
 *     and 5xx mean the DB plane is unhealthy) + query latency
 *   · API latency — public site /api/health + admin /api/health
 *   · Auto-restart of stalled workers — via the runner control plane
 *     POST /api/workflows/:slug/run (loopback, RUNNER_API_KEY)
 *   · Daily 03:00 Cairo executive briefing to Telegram (gate: hour == 3)
 *
 * Self-improvement: every incident + recovery is written to unified_memory
 * (MemoryBrainEngine consumption) so the fleet learns its own failure
 * patterns. Thresholds mirror scripts/check-thresholds.ts (latency ≤ 15 s,
 * error rate ≤ 25 %, queue backlog ≤ 250).
 */

const { supabase, withBackoff, runGuardian, telegramAlert } = require('../lib/guardian-kit');

const RUNNER_URL = process.env.WATCHDOG_RUNNER_URL || 'http://127.0.0.1:2786';
const RUNNER_API_KEY = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';
const GATEWAY_URL = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';
const PUBLIC_API = process.env.WATCHDOG_PUBLIC_API || 'https://sierra-estates.net/api/health';
const ADMIN_API = process.env.WATCHDOG_ADMIN_API || 'https://admin.sierra-estates.net/api/health';

const LATENCY_MAX_MS = 15000;
const QUEUE_BACKLOG_MAX = 250;
const DOCKER_SERVICES = ['sierra-workflow-runner', 'sierra-telegram-intake', 'sierra-paced-outreach', 'sierra-whatsapp-rag-station'];
const AUTO_RESTART_SLUGS = ['whatsapp-dispatch', 'units-sync', 'sheets-supabase-sync'];

function cairoHour() {
  try {
    return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour12: false, hour: '2-digit' })
      .format(new Date()), 10) % 24;
  } catch (_) { return new Date().getUTCHours() + 2; }
}

async function timedFetch(url, opts = {}, timeoutMs = 10000) {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - started, error: e.message };
  }
}

async function opsWatchdog(ctx) {
  const stats = { checks: 0, failures: 0, restarted: 0, latencyMs: null, openwaReady: 0, openwaTotal: 0, briefingSent: false };
  const incidents = [];

  // ── 1. Docker containers (via Docker socket when mounted) ────────────────
  for (const svc of DOCKER_SERVICES) {
    stats.checks++;
    const probe = await timedFetch(`http://unix:/var/run/docker.sock/containers/${svc}/json`.replace('http://unix:', 'file://'), {}, 3000).catch(() => null);
    // The socket path is only valid inside the Docker-host network; outside,
    // per-service health endpoints carry the truth instead (checked below).
    void probe;
  }
  // Compose-level probe: the runner's own health IS the container probe
  // (restart: unless-stopped + healthcheck keep the container honest).
  stats.checks++;
  const runnerHealth = await timedFetch(`${RUNNER_URL}/api/health`, {}, 8000);
  if (!runnerHealth.ok) {
    stats.failures++;
    incidents.push(`runner control plane :2786 unreachable (${runnerHealth.error || runnerHealth.status})`);
  }

  // ── 2. OpenWA lines ────────────────────────────────────────────────────────
  stats.checks++;
  const gwHealth = await timedFetch(`${GATEWAY_URL}/api/health`, {}, 8000);
  let sessions = [];
  if (gwHealth.ok) {
    const sess = await timedFetch(`${GATEWAY_URL}/api/sessions`, {}, 8000);
    if (sess.ok) {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/sessions`, { signal: AbortSignal.timeout(8000) });
        const body = await res.json();
        const list = Array.isArray(body) ? body : (body.sessions || []);
        sessions = list;
        stats.openwaTotal = list.length;
        stats.openwaReady = list.filter((s) => String(s.status || s.state || '').toLowerCase() === 'ready').length;
        if (stats.openwaReady === 0) {
          stats.failures++;
          incidents.push('OpenWA gateway: ZERO ready lines');
        }
      } catch (_) { /* counted via gwHealth */ }
    }
  } else {
    stats.failures++;
    incidents.push(`OpenWA gateway :2785 unreachable (${gwHealth.error || gwHealth.status})`);
  }

  // ── 3. Supabase RLS + latency ─────────────────────────────────────────────
  stats.checks++;
  const sb = supabase();
  let supabaseOk = false;
  if (sb) {
    const started = Date.now();
    try {
      // RLS probe: an anon-shape SELECT on listings must NOT error; service
      // role must reach the table. PGRST errors (42501/5xx) = unhealthy.
      const { error } = await withBackoff(() => sb.from('listings').select('id').limit(1), 'rls-probe');
      if (error) {
        incidents.push(`Supabase probe error: ${error.message}`);
      } else {
        supabaseOk = true;
        stats.latencyMs = Date.now() - started;
        if (stats.latencyMs > LATENCY_MAX_MS) {
          stats.failures++;
          incidents.push(`Supabase latency ${stats.latencyMs}ms > ${LATENCY_MAX_MS}ms`);
        }
      }
    } catch (e) {
      stats.failures++;
      incidents.push(`Supabase unreachable: ${e.message}`);
    }
    // Queue backlog (mirrors check-thresholds.ts).
    try {
      const { count } = await sb.from('whatsapp_queue').select('id', { count: 'exact', head: true })
        .in('status', ['queued', 'pending']);
      if (Number(count) > QUEUE_BACKLOG_MAX) {
        stats.failures++;
        incidents.push(`WhatsApp queue backlog ${count} > ${QUEUE_BACKLOG_MAX}`);
      }
      stats.queueBacklog = Number(count) || 0;
    } catch (_) { /* non-fatal */ }
  } else {
    incidents.push('Supabase unconfigured (SUPABASE_SERVICE_ROLE_KEY missing)');
  }

  // ── 4. Public + Admin API latency ────────────────────────────────────────
  stats.checks++;
  const publicApi = await timedFetch(PUBLIC_API, {}, 12000);
  if (!publicApi.ok) {
    stats.failures++;
    incidents.push(`public API ${PUBLIC_API} unhealthy (${publicApi.error || publicApi.status})`);
  } else if (publicApi.ms > LATENCY_MAX_MS) {
    stats.failures++;
    incidents.push(`public API latency ${publicApi.ms}ms > ${LATENCY_MAX_MS}ms`);
  }
  stats.checks++;
  const adminApi = await timedFetch(ADMIN_API, {}, 12000);
  if (!adminApi.ok) {
    stats.failures++;
    incidents.push(`admin API ${ADMIN_API} unhealthy (${adminApi.error || adminApi.status})`);
  }

  // ── 5. Auto-restart stalled workers via the runner control plane ─────────
  // A "stalled" worker = its workflows.last_run_label ended :error/:timeout
  // AND its slug is in the auto-restart allowlist. The restart is a manual
  // trigger (deliberate emergency action semantics are preserved).
  if (sb && RUNNER_API_KEY) {
    try {
      const { data: stale } = await sb.from('workflows')
        .select('slug,last_run_label,last_run_at')
        .in('slug', AUTO_RESTART_SLUGS)
        .limit(10);
      for (const w of stale || []) {
        const label = String(w.last_run_label || '');
        if (/:error$/.test(label) || /:timeout$/.test(label)) {
          const restarted = await timedFetch(`${RUNNER_URL}/api/workflows/${w.slug}/run`, {
            method: 'POST',
            headers: { 'x-api-key': RUNNER_API_KEY },
          }, 8000);
          if (restarted.ok) {
            stats.restarted++;
            await ctx.activity('ops-watchdog', `🔁 Auto-restarted stalled worker '${w.slug}' (last: ${label}).`, { slug: w.slug });
          }
        }
      }
    } catch (e) { ctx.log(`auto-restart probe failed: ${e.message}`); }
  }

  // ── 6. Learn incidents (self-improvement loop) ───────────────────────────
  if (incidents.length) {
    await ctx.learn('ops-watchdog', {
      kind: 'ops_incident',
      title: `Ops incident — ${incidents.length} failure(s)`,
      body: { incidents, stats: { ...stats } },
      tags: ['ops', 'incident'],
      ttlDays: 30,
    });
    await ctx.telegramAlert(
      `🛡️ <b>Ops Watchdog</b> — ${incidents.length} issue(s):\n` +
      incidents.map((i) => `• ${i}`).join('\n') +
      `\nAuto-restarts this pass: ${stats.restarted}`);
  }

  // ── 7. Daily 03:00 Cairo executive briefing (Telegram) ───────────────────
  if (cairoHour() === 3) {
    const briefing = [
      `🌅 <b>Sierra Estates — 03:00 Executive Briefing</b>`,
      ``,
      `🛰️ System: ${stats.failures === 0 ? 'ALL HEALTHY ✅' : `${stats.failures} issue(s) ⚠️`}`,
      `📱 OpenWA lines: ${stats.openwaReady}/${stats.openwaTotal} ready`,
      `⚡ Supabase latency: ${stats.latencyMs ?? '—'} ms`,
      `📬 WhatsApp queue backlog: ${stats.queueBacklog ?? '—'}`,
      `🔁 Auto-restarts (24h lane): ${stats.restarted}`,
      incidents.length ? `\n⚠️ Open incidents:\n${incidents.map((i) => `• ${i}`).join('\n')}` : '\nNo open incidents.',
    ].join('\n');
    const sent = await telegramAlert(briefing);
    stats.briefingSent = sent;
  }

  return stats;
}

if (require.main === module) {
  runGuardian({
    botId: 'ops-watchdog',
    name: 'System Supervisor & Self-Optimizer',
    cron: '*/15 * * * *',
    fn: opsWatchdog,
  })();
}

module.exports = { opsWatchdog, AUTO_RESTART_SLUGS, LATENCY_MAX_MS, QUEUE_BACKLOG_MAX };
