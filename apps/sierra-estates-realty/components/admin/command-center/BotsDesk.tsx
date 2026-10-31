'use client';

/**
 * SIERRA ESTATES — AI COO & 10-BOT OPERATIONS DESK (/admin/bots)
 *
 * The agent-fleet console:
 *   · the 10-bot fleet cards (public.system_status heartbeats via
 *     /api/admin/bots);
 *   · manual workflow execution — Scribe, Curator, Stage-9 Closer and
 *     Matchmaker run server-side through /api/admin/bots/run (real Supabase
 *     work: raw_feed extraction, freshness recompute + stale SLA, late-stage
 *     follow-ups, bulk matching), each run ledgered in public.bot_runs;
 *   · the live inbound webhook ledger (public.webhook_logs, migration 037)
 *     tailed over Supabase Realtime CDC;
 *   · the raw scrape data inspector (public.raw_feed) with the Scribe's
 *     extraction results.
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Bot,
  Brain,
  Database,
  FileText,
  Gem,
  Handshake,
  Play,
  Webhook,
} from 'lucide-react';
import {
  CcButton,
  CcCard,
  CcEmpty,
  CcError,
  CcPageShell,
  CcPill,
  CcRealtimeBadge,
  CcSpinner,
  CcUnauthorized,
  mutateApi,
  timeAgo,
  useAdminApi,
} from '@/components/admin/command-center/ui';

// ─── Types (API contracts) ─────────────────────────────────────────────────

interface BotRow {
  id: string;
  status: string;
  enabled: boolean;
  lastPulse: string | null;
  stats: Record<string, unknown> | null;
  logs?: unknown[];
}

interface BotsResponse {
  success: boolean;
  bots: BotRow[];
  count: number;
}

interface WebhookLogRow {
  id: string;
  source: string;
  eventType: string | null;
  status: string;
  signatureValid: boolean | null;
  latencyMs: number | null;
  error: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
}

interface RawFeedRow {
  id: string;
  rawText: string;
  sourceChannel: string | null;
  senderPhone: string | null;
  extractedData: Record<string, unknown> | null;
  isReviewed: boolean | null;
  createdAt: string | null;
}

interface RunResult {
  workflow: string;
  metrics: Record<string, number>;
  durationMs: number;
}

const WORKFLOWS: {
  id: 'scribe' | 'curator' | 'closer' | 'matchmaker';
  botId: string;
  label: string;
  blurb: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'scribe',
    botId: 'scribe-agent',
    label: 'Run Scribe',
    blurb: 'Extract structured listing data from unreviewed raw_feed signals.',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: 'curator',
    botId: 'curator-agent',
    label: 'Run Curator',
    blurb: 'Recompute inventory freshness & apply the 30-day stale SLA.',
    icon: <Gem className="h-4 w-4" />,
  },
  {
    id: 'closer',
    botId: 'closer-agent',
    label: 'Run Stage-9 Closer',
    blurb: 'Chase quiet late-stage leads: follow-ups + WhatsApp nudges.',
    icon: <Handshake className="h-4 w-4" />,
  },
  {
    id: 'matchmaker',
    botId: 'matchmaker-agent',
    label: 'Run Matchmaker',
    blurb: 'Bulk semantic matching over the newest new/contacted leads.',
    icon: <Brain className="h-4 w-4" />,
  },
];

function statusTone(status: string): 'green' | 'gold' | 'red' | 'neutral' {
  if (status === 'active' || status === 'syncing') return 'green';
  if (status === 'error') return 'red';
  if (status === 'idle') return 'gold';
  return 'neutral';
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export default function BotsDesk() {
  const botsApi = useAdminApi<BotsResponse>('/api/admin/bots');
  const logsApi = useAdminApi<{ rows: WebhookLogRow[] }>('/api/admin/webhook-logs?limit=40');
  const feedApi = useAdminApi<{ rows: RawFeedRow[]; unreviewed: number }>(
    '/api/admin/raw-feed?limit=20',
  );

  const [running, setRunning] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'whatsapp' | 'telegram'>('all');
  const [openLog, setOpenLog] = useState<WebhookLogRow | null>(null);

  // ── Realtime tail of the webhook ledger ──────────────────────────────────
  const reloadLogsRef = useRef(logsApi.reload);
  useEffect(() => {
    reloadLogsRef.current = logsApi.reload;
  });

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return undefined;

    let disposed = false;
    let cleanup: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const client = createBrowserClient(supabaseUrl, supabaseKey);
        const channel = client
          .channel('command-center-webhook-logs')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'webhook_logs' },
            () => {
              if (disposed) return;
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => reloadLogsRef.current(), 400);
            },
          )
          .subscribe((status) => {
            if (!disposed) setRealtimeOn(status === 'SUBSCRIBED');
          });
        cleanup = () => {
          if (timer) clearTimeout(timer);
          try {
            void client.removeChannel(channel);
          } catch {
            /* socket already gone */
          }
        };
      } catch {
        setRealtimeOn(false);
      }
    })();

    return () => {
      disposed = true;
      setRealtimeOn(false);
      cleanup?.();
    };
  }, []);

  async function runWorkflow(workflow: (typeof WORKFLOWS)[number]['id']) {
    setRunning(workflow);
    setNotice(null);
    const res = await mutateApi('/api/admin/bots/run', 'POST', { workflow });
    setRunning(null);
    if (res.ok) {
      const result = res.body as unknown as RunResult;
      setLastRun(result);
      setNotice({
        tone: 'ok',
        text: `${workflow} completed in ${result.durationMs}ms — ${Object.entries(result.metrics)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ')}`,
      });
      botsApi.reload();
      feedApi.reload();
      logsApi.reload();
    } else {
      setNotice({ tone: 'err', text: String(res.body.error ?? `Workflow ${workflow} failed.`) });
    }
  }

  if (botsApi.unauthorized) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="AI COO · Bot Operations">
        <CcUnauthorized />
      </CcPageShell>
    );
  }

  const bots = botsApi.data?.bots ?? [];
  const logs = (logsApi.data?.rows ?? []).filter(
    (row) => logFilter === 'all' || row.source === logFilter,
  );
  const feed = feedApi.data?.rows ?? [];
  const activeCount = bots.filter((b) => b.enabled && (b.status === 'active' || b.status === 'syncing')).length;

  return (
    <CcPageShell
      eyebrow="Sierra Estates · Unified Admin Command Center"
      title="AI COO · 10-Bot Operations Desk"
      subtitle="The agent fleet, the inbound webhook ledger and the raw scrape pipeline — with Scribe, Curator and the Stage-9 Closer one click away."
      actions={
        <>
          <CcRealtimeBadge connected={realtimeOn} />
          <CcButton
            variant="gold"
            onClick={() => {
              botsApi.reload();
              logsApi.reload();
              feedApi.reload();
            }}
            loading={botsApi.loading}
          >
            <Activity className="h-4 w-4" aria-hidden /> Refresh
          </CcButton>
          <Link href="/admin" className="cc-btn cc-btn-ghost no-underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Overview
          </Link>
        </>
      }
    >
      {botsApi.error && !botsApi.data ? (
        <CcError message={botsApi.error} onRetry={botsApi.reload} />
      ) : botsApi.loading && !botsApi.data ? (
        <CcSpinner label="Polling the fleet" />
      ) : (
        <>
          {notice && (
            <div
              className={`mb-4 rounded-xl border px-4 py-2.5 text-xs ${
                notice.tone === 'ok'
                  ? 'border-emerald-soft/40 bg-emerald-soft/10 text-emerald-soft'
                  : 'border-ruby-soft/40 bg-ruby-soft/10 text-[#ff8b95]'
              }`}
              role="status"
            >
              {notice.text}
            </div>
          )}

          {/* ── Manual workflow triggers ──────────────────────────────────── */}
          <section aria-label="Manual workflows">
            <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f5f3ec]/40">
              Manual Workflows · AI COO
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {WORKFLOWS.map((wf) => (
                <CcCard key={wf.id} hover className="flex flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl border border-gold-500/25 bg-gold-500/10 p-2 text-gold-400">
                      {wf.icon}
                    </span>
                    <CcPill tone="neutral">{wf.botId}</CcPill>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#f5f3ec]">{wf.label}</p>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-[#f5f3ec]/50">{wf.blurb}</p>
                  <CcButton
                    variant="gold"
                    className="mt-4 w-full"
                    onClick={() => runWorkflow(wf.id)}
                    loading={running === wf.id}
                    disabled={running !== null}
                  >
                    <Play className="h-4 w-4" aria-hidden /> Execute
                  </CcButton>
                </CcCard>
              ))}
            </div>
            {lastRun && (
              <p className="mt-2 text-[0.66rem] text-[#f5f3ec]/35">
                Last run: {lastRun.workflow} · {lastRun.durationMs}ms — every execution is ledgered
                in public.bot_runs and heartbeats the fleet card below.
              </p>
            )}
          </section>

          {/* ── WhatsApp 8-Line Fleet & Gateway Operator Bar ── */}
          <div className="mt-8 rounded-2xl border border-gold-500/30 bg-gradient-to-r from-gold-500/10 via-black/40 to-blue-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/20 text-xl text-gold-300">
                  📱
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#f5f3ec]">WhatsApp 8-Line Multi-Session Gateway</h3>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400">
                      Active Fleet (Port 2785)
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#f5f3ec]/60">
                    Dedicated SIM pool with automatic phone normalization, anti-ban typing emulation, and real-time QR linking.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/admin?tab=whatsapp_outreach"
                  className="rounded-xl border border-gold-500/40 bg-gold-500/20 px-3.5 py-2 text-xs font-bold text-gold-200 transition hover:bg-gold-500/30"
                >
                  📡 Open 8-Line Operator Console
                </a>
                <a
                  href="http://127.0.0.1:2785/map"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-blue-500/40 bg-blue-500/20 px-3.5 py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-500/30"
                >
                  🗺️ Live Map Station
                </a>
              </div>
            </div>
          </div>

          {/* ── Fleet cards ────────────────────────────────────────────────── */}
          <section aria-label="Bot fleet" className="mt-8">
            <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f5f3ec]/40">
              Fleet · {activeCount}/{bots.length} active
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {bots.map((bot) => (
                <div key={bot.id} className="cc-glass p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-gold-400" aria-hidden />
                      <p className="text-[0.78rem] font-semibold text-[#f5f3ec]">{bot.id}</p>
                    </div>
                    <CcPill tone={statusTone(bot.status)}>{bot.status}</CcPill>
                  </div>
                  <p className="mt-2 text-[0.66rem] text-[#f5f3ec]/40">
                    Pulse {timeAgo(bot.lastPulse)}
                  </p>
                  {bot.stats && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {num(bot.stats.processedToday) > 0 && (
                        <span className="cc-num rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[0.6rem] text-[#f5f3ec]/60">
                          {num(bot.stats.processedToday)} today
                        </span>
                      )}
                      {typeof bot.stats.lastWorkflow === 'string' && (
                        <span className="rounded-md border border-gold-500/25 bg-gold-500/10 px-1.5 py-0.5 text-[0.6rem] text-gold-300">
                          {String(bot.stats.lastWorkflow)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {bots.length === 0 && (
                <p className="col-span-full py-6 text-center text-xs text-[#f5f3ec]/35">
                  No fleet heartbeats yet — workers register into system_status on first pulse.
                </p>
              )}
            </div>
          </section>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
            {/* ── Webhook ledger ──────────────────────────────────────────── */}
            <CcCard className="p-5 xl:col-span-3">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/60">
                  <Webhook className="h-4 w-4 text-gold-500/70" aria-hidden /> Webhook Ledger
                </h2>
                <div className="flex gap-1.5">
                  {(['all', 'whatsapp', 'telegram'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold capitalize transition ${
                        logFilter === f
                          ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                          : 'border-white/10 bg-white/[0.03] text-[#f5f3ec]/50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {logsApi.loading && !logsApi.data ? (
                <CcSpinner label="Reading the ledger" />
              ) : logsApi.error && !logsApi.data ? (
                <CcError message={logsApi.error} onRetry={logsApi.reload} />
              ) : (
                <ul className="cc-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {logs.map((row) => (
                    <li key={row.id}>
                      <button
                        onClick={() => setOpenLog(row)}
                        className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left transition hover:border-gold-500/35"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CcPill tone={row.source === 'whatsapp' ? 'green' : 'azure'}>{row.source}</CcPill>
                            <span className="text-[0.7rem] text-[#f5f3ec]/55">{row.eventType ?? 'message'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {row.signatureValid === false && <CcPill tone="red">unsigned</CcPill>}
                            <CcPill
                              tone={
                                row.status === 'processed'
                                  ? 'green'
                                  : row.status === 'error'
                                    ? 'red'
                                    : row.status === 'duplicate'
                                      ? 'azure'
                                      : 'amber'
                              }
                            >
                              {row.status}
                            </CcPill>
                          </div>
                        </div>
                        <p className="mt-1.5 text-[0.64rem] text-[#f5f3ec]/35">
                          {timeAgo(row.createdAt)}
                          {row.latencyMs !== null && row.latencyMs !== undefined ? ` · ${row.latencyMs}ms` : ''}
                          {row.error ? ` · ${row.error.slice(0, 80)}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                  {logs.length === 0 && (
                    <CcEmpty
                      title="No webhook events recorded"
                      hint="Inbound WhatsApp/Telegram traffic lands here the moment /api/webhooks/* receives it (migration 037)."
                    />
                  )}
                </ul>
              )}
            </CcCard>

            {/* ── Raw scrape data ─────────────────────────────────────────── */}
            <CcCard className="p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/60">
                  <Database className="h-4 w-4 text-gold-500/70" aria-hidden /> Raw Scrape Data
                </h2>
                {(feedApi.data?.unreviewed ?? 0) > 0 && <CcPill tone="amber">{feedApi.data?.unreviewed} pending</CcPill>}
              </div>
              {feedApi.loading && !feedApi.data ? (
                <CcSpinner label="Loading raw signals" />
              ) : feedApi.error && !feedApi.data ? (
                <CcError message={feedApi.error} onRetry={feedApi.reload} />
              ) : (
                <ul className="cc-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {feed.map((row) => (
                    <li key={row.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.66rem] font-semibold uppercase tracking-wide text-[#f5f3ec]/45">
                          {row.sourceChannel ?? 'unknown channel'}
                        </span>
                        <CcPill tone={row.isReviewed ? 'green' : 'amber'}>
                          {row.isReviewed ? 'scribed' : 'raw'}
                        </CcPill>
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[0.68rem] leading-relaxed text-[#f5f3ec]/60">
                        {row.rawText.slice(0, 220)}
                      </p>
                      {row.extractedData && Object.keys(row.extractedData).length > 0 && (
                        <p className="cc-num mt-1.5 truncate text-[0.6rem] text-gold-400/70">
                          {JSON.stringify(row.extractedData).slice(0, 140)}
                        </p>
                      )}
                      <p className="mt-1 text-[0.6rem] text-[#f5f3ec]/30">{timeAgo(row.createdAt)}</p>
                    </li>
                  ))}
                  {feed.length === 0 && (
                    <CcEmpty
                      title="No raw signals"
                      hint="The WhatsApp scraper writes broker messages into raw_feed for the Scribe to extract."
                    />
                  )}
                </ul>
              )}
            </CcCard>
          </div>
        </>
      )}

      {/* ── Webhook payload modal ─────────────────────────────────────────── */}
      {openLog && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#05080f]/80 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Webhook payload"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenLog(null);
          }}
        >
          <div className="cc-glass-raised my-auto w-full max-w-2xl p-6 sm:p-8">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#f5f3ec]">
                  {openLog.source} · {openLog.eventType ?? 'message'}
                </h2>
                <p className="mt-1 text-xs text-[#f5f3ec]/50">
                  {timeAgo(openLog.createdAt)} · {openLog.status}
                  {openLog.latencyMs !== null && openLog.latencyMs !== undefined ? ` · ${openLog.latencyMs}ms` : ''}
                </p>
              </div>
              <button
                onClick={() => setOpenLog(null)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-[#f5f3ec]/60"
              >
                ESC
              </button>
            </div>
            {openLog.error && (
              <p className="mb-3 rounded-lg border border-ruby-soft/40 bg-ruby-soft/10 p-2.5 text-xs text-[#ff8b95]">
                {openLog.error}
              </p>
            )}
            <pre className="cc-scroll max-h-[50vh] overflow-auto rounded-xl border border-white/[0.08] bg-black/40 p-4 text-[0.68rem] leading-relaxed text-[#f5f3ec]/75">
              {JSON.stringify(openLog.payload ?? {}, null, 2)}
            </pre>
            <p className="mt-3 text-[0.62rem] text-[#f5f3ec]/35">
              Auth material is redacted at write time (lib/server/webhook-log.ts); payloads are
              size-capped at 24 KB.
            </p>
          </div>
        </div>
      )}
    </CcPageShell>
  );
}
