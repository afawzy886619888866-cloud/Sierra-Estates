'use client';
/**
 * WorkflowOpsView — live control surface for the EC2 server-side workflows.
 *
 * Backed by /api/admin/workflow-ops → EC2 workflow runner (:2786) + the
 * public.workflows registry (same rows the Workflow Studio edits).
 * Shows runner health, per-workflow telemetry (real runs, success rate,
 * last duration) and offers Run now + Logs per workflow.
 */
import { useCallback, useEffect, useState } from 'react';

type RunEntry = { at: string; exit: string; ms: number; trigger: string; summary: string };
type LocalState = {
  slug?: string; lastRun: string | null; lastDurationMs: number | null;
  lastExit: string | null; lastSummary?: string; successRate?: number | null;
  history?: RunEntry[];
};
type Wf = {
  slug: string; name: string; name_ar?: string | null; description?: string | null;
  status: string; schedule: string; runs?: number; success_rate?: number | null;
  last_run_ms?: number | null; last_run_at?: string | null; last_run_label?: string | null;
  local?: LocalState | null;
};
type Health = {
  ok?: boolean; uptimeSec?: number; tz?: string; supabase?: boolean;
  running?: string[];
  gateway?: { reachable?: boolean; status?: string; phone?: string; pushName?: string; error?: string };
};

const L = {
  en: {
    title: 'Workflow Ops · EC2 Control Plane',
    sub: 'Live scheduler + control API for the server-side workflows (owner search, outreach, unit sync, sentinel).',
    health: 'Runner health', uptime: 'uptime', tz: 'timezone', gw: 'WhatsApp gateway',
    none: 'idle', rate: 'success', runs: 'runs', last: 'last run', duration: 'duration',
    runNow: 'Run now', running: 'running…', logs: 'logs', hide: 'hide',
    never: 'never', ok: 'ok', error: 'error', unconfigured: 'unconfigured', timeout: 'timeout',
    unreachable: 'Runner unreachable — using DB marker path instead.', requested: 'Run request left — the runner picks it up within 60 s.',
  },
  ar: {
    title: 'تشغيل سير العمل · مستوى الخادم',
    sub: 'مجدول ومتحكم حي بسير العمل على الخادم (بحث الملاك، المراسلة، مزامنة الوحدات، الحارس).',
    health: 'حالة المشغّل', uptime: 'مدة التشغيل', tz: 'المنطقة الزمنية', gw: 'بوابة الواتساب',
    none: 'خامل', rate: 'النجاح', runs: 'التشغيلات', last: 'آخر تشغيل', duration: 'المدة',
    runNow: 'تشغيل الآن', running: 'جارٍ التشغيل…', logs: 'السجل', hide: 'إخفاء',
    never: 'أبداً', ok: 'نجاح', error: 'خطأ', unconfigured: 'غير مُهيأ', timeout: 'انتهاء',
    unreachable: 'المشغّل غير متصل — سيُستخدم مسار قاعدة البيانات.', requested: 'تم تسجيل طلب التشغيل — ينفّذ خلال 60 ثانية.',
  },
} as const;

const exitLabel = (exit: string, t: Record<string, string>) =>
  exit === 'ok' ? t.ok : exit === 'unconfigured' ? t.unconfigured : exit === 'timeout' ? t.timeout : t.error;
const exitColor = (exit: string) =>
  exit === 'ok' ? '#39d98a' : exit === 'unconfigured' ? '#f2c94c' : '#eb5757';

function fmtAgo(iso: string | null | undefined, lang: string): string {
  if (!iso) return lang === 'ar' ? 'أبداً' : 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return `${s}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  if (s < 172800) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export default function WorkflowOpsView({ lang = 'en' }: { lang?: string }) {
  const t = L[lang === 'ar' ? 'ar' : 'en'];
  const [health, setHealth] = useState<Health | null>(null);
  const [wfs, setWfs] = useState<Wf[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [openLogs, setOpenLogs] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workflow-ops', { cache: 'no-store' });
      const data = await res.json();
      setHealth((data && (data.health || data)) as Health);
      setWfs(Array.isArray(data?.workflows) ? data.workflows : Array.isArray(data) ? data : []);
    } catch { /* keep old data */ }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const runNow = async (slug: string) => {
    setBusy(slug);
    setNotice('');
    try {
      const res = await fetch('/api/admin/workflow-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', slug }),
      });
      const data = await res.json();
      if (!res.ok && data?.error === 'runner_unreachable') {
        // fall back to the DB marker path
        await fetch('/api/admin/workflow-ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request', slug }),
        });
        setNotice(t.requested);
      }
    } catch { setNotice(t.unreachable); }
    setTimeout(load, 2500);
    setBusy(null);
  };

  const toggleLogs = async (slug: string) => {
    if (openLogs === slug) return setOpenLogs(null);
    setOpenLogs(slug);
    try {
      const res = await fetch(`/api/admin/workflow-ops?logs=${encodeURIComponent(slug)}&n=10`, { cache: 'no-store' });
      const data = await res.json();
      setWfs((prev) => prev.map((w) => (w.slug === slug
        ? { ...w, local: { ...(w.local || {}), history: data?.history || w.local?.history || [] } as LocalState }
        : w)));
    } catch { /* ignore */ }
  };

  const gw = health?.gateway;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} style={{ padding: '18px 4px' }}>
      <div className="card fade-up" style={{ padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: 0.2 }}>{t.title}</h2>
            <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: 12.5, maxWidth: 680 }}>{t.sub}</p>
          </div>
          <span className="chip" style={{ background: gw?.status === 'ready' ? 'rgba(57,217,138,.15)' : 'rgba(235,87,87,.15)', color: gw?.status === 'ready' ? '#39d98a' : '#eb5757', fontWeight: 800, fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>
            {t.gw}: {gw?.status || (gw?.reachable === false ? 'down' : '—')} {gw?.phone ? `· +${gw.phone}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12, fontSize: 12, opacity: 0.8 }}>
          <span>{t.health}: {health?.ok ? '✅' : '—'} {health?.uptimeSec != null ? `· ${t.uptime} ${Math.round(health.uptimeSec / 60)}m` : ''} {health?.tz ? `· ${t.tz} ${health.tz}` : ''}</span>
          {notice && <span style={{ color: '#f2c94c' }}>{notice}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
        {wfs.map((w) => {
          const loc = w.local;
          const lastExit = loc?.lastExit;
          return (
            <div key={w.slug} className="card fade-up" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{lang === 'ar' && w.name_ar ? w.name_ar : w.name}</div>
                  <code style={{ fontSize: 10.5, opacity: 0.6 }}>{w.slug} · {w.schedule || '—'}</code>
                </div>
                <span className="chip" style={{ fontWeight: 800, fontSize: 10, padding: '3px 9px', borderRadius: 999, background: w.status === 'active' ? 'rgba(57,217,138,.14)' : 'rgba(242,201,76,.14)', color: w.status === 'active' ? '#39d98a' : '#f2c94c' }}>
                  {w.status}
                </span>
              </div>
              {w.description && <p style={{ margin: 0, fontSize: 11.5, opacity: 0.65, minHeight: 30 }}>{w.description}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11.5, opacity: 0.85 }}>
                <span>{t.runs}: <b>{w.runs ?? 0}</b></span>
                <span>{t.rate}: <b>{w.success_rate != null ? `${w.success_rate}%` : '—'}</b></span>
                <span>{t.last}: <b>{fmtAgo(loc?.lastRun || w.last_run_at, lang)}</b></span>
                {loc?.lastDurationMs != null && <span>{t.duration}: <b>{(loc.lastDurationMs / 1000).toFixed(1)}s</b></span>}
                {lastExit && (
                  <span style={{ color: exitColor(lastExit), fontWeight: 800 }}>{exitLabel(lastExit, t)}</span>
                )}
              </div>
              {loc?.lastSummary && (
                <div style={{ fontSize: 10.5, opacity: 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {loc.lastSummary}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn" disabled={busy === w.slug} onClick={() => runNow(w.slug)} style={{ fontWeight: 800, fontSize: 12, padding: '6px 14px' }}>
                  {busy === w.slug ? t.running : t.runNow}
                </button>
                <button className="btn" onClick={() => toggleLogs(w.slug)} style={{ fontWeight: 700, fontSize: 12, padding: '6px 12px', opacity: 0.85 }}>
                  {openLogs === w.slug ? t.hide : t.logs}
                </button>
              </div>
              {openLogs === w.slug && (
                <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.5, maxHeight: 180, overflowY: 'auto', background: 'rgba(0,0,0,.25)', borderRadius: 8, padding: '8px 10px' }}>
                  {(loc?.history || []).length === 0 && <div style={{ opacity: 0.5 }}>{t.never}</div>}
                  {(loc?.history || []).map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
                      <span style={{ color: exitColor(h.exit), fontWeight: 800, minWidth: 74 }}>{exitLabel(h.exit, t)}</span>
                      <span style={{ opacity: 0.55, minWidth: 58 }}>{fmtAgo(h.at, lang)}</span>
                      <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.summary || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
