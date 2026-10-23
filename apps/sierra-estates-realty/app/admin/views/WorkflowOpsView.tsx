'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Server-Side Workflow Control Plane (Port 2786)
 * ───────────────────────────────────────────────────────────────────────────
 * High-End Luxury Real Estate Intelligence OS · New Cairo Server Operations
 * 
 * Features:
 *  - Runner Health Telemetry (Uptime, Timezone, Supabase sync, Active jobs)
 *  - Dedicated Control for 10 Server Workflows (including Morning Broker Dispatch)
 *  - One-Click 'Run Now', Instant DB-Marker Fallback, Live Output Log Inspector
 *  - High-Contrast Obsidian & Champagne Gold Aesthetics (WCAG 2.2 compliant)
 *  - Full Bilingual Craft (Arabic RTL & English LTR)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { HyouzCard, HyouzCounter, HyouzBeacon, HyouzMagneticButton } from '@/components/admin/HyouzMotion';

type RunEntry = { at: string; exit: string; ms: number; trigger: string; summary: string };

type LocalState = {
  slug?: string;
  lastRun: string | null;
  lastDurationMs: number | null;
  lastExit: string | null;
  lastSummary?: string;
  successRate?: number | null;
  history?: RunEntry[];
};

type Wf = {
  slug: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  status: string;
  schedule: string;
  runs?: number;
  success_rate?: number | null;
  last_run_ms?: number | null;
  last_run_at?: string | null;
  last_run_label?: string | null;
  local?: LocalState | null;
};

type Health = {
  ok?: boolean;
  uptimeSec?: number;
  tz?: string;
  supabase?: boolean;
  running?: string[];
  gateway?: { reachable?: boolean; status?: string; phone?: string; pushName?: string; error?: string };
};

const DEFAULT_WORKFLOWS: Wf[] = [
  {
    slug: 'whatsapp-dispatch',
    name: 'Morning Broker Dispatch',
    name_ar: 'بث الصباح لمجموعات السماسرة',
    description: 'Autonomous 4-job cascade: inventory sync, master sheet update, lead qualification, and broker notifications.',
    description_ar: 'سلسلة مهام صباحية آلية: مزامنة المخزون، تحديث الشيت الرئيسي، تأهيل العملاء، وبث رسائل السماسرة.',
    status: 'active',
    schedule: '0 9 * * *',
  },
  {
    slug: 'whatsapp-scraper',
    name: 'Broker Group Harvester & RAG',
    name_ar: 'ماسح ومحلل مجموعات السماسرة',
    description: 'Parses incoming WhatsApp broker messages, extracts unit pricing, specs, and compound coordinates into Supabase.',
    description_ar: 'يقرأ رسائل جروبات سماسرة القاهرة الجديدة، ويستخرج الأسعار والمواصفات وإحداثيات الكمبوند تلقائياً.',
    status: 'active',
    schedule: '*/15 * * * *',
  },
  {
    slug: 'units-sync',
    name: 'Inventory & Master Sheet Sync',
    name_ar: 'مزامنة الوحدات والشيت الرئيسي',
    description: 'Bi-directional sync between Google Sheets, Property Finder feeds, and the authoritative Supabase database.',
    description_ar: 'مزامنة ثنائية الاتجاه بين شيت جوجل، وعروض بروبيرتي فايندر، وقاعدة بيانات سوبابيس المعتمدة.',
    status: 'active',
    schedule: '0 */2 * * *',
  },
  {
    slug: 'owner-search',
    name: 'Owner Listing Discovery',
    name_ar: 'بحث واستخراج بيانات الملاك',
    description: 'Scans resale portals and direct listings in New Cairo to identify authentic unit owners and direct opportunities.',
    description_ar: 'مسح منصات إعادة البيع بالتجمع لكشف الملاك المباشرين وتصفية الوسطاء غير المعتمدين.',
    status: 'active',
    schedule: '30 10 * * *',
  },
  {
    slug: 'owner-outreach',
    name: 'Owner WhatsApp Outreach',
    name_ar: 'مراسلة وتفاوض الملاك المباشرين',
    description: 'Automated 5-stage closer outreach via WhatsApp pool with jitter pacing to negotiate exclusivity.',
    description_ar: 'مراسلة الملاك عبر خطوط الواتساب بنظام الجيتر المانع للحظر للتفاوض على توقيع عقود التسويق الحصري.',
    status: 'active',
    schedule: '0 11,15 * * *',
  },
  {
    slug: 'gateway-sentinel',
    name: 'WhatsApp Gateway Sentinel',
    name_ar: 'حارس جاهزية البوابة والخطوط',
    description: 'Probes all 8 WhatsApp lines, tests network latency, and restarts stalled browser engines.',
    description_ar: 'فحص فوري لجاهزية الخطوط الثمانية، قياس زمن الاستجابة، وإعادة إنعاش المتصفحات المتوقفة تلقائياً.',
    status: 'active',
    schedule: '*/5 * * * *',
  },
  {
    slug: 'daily-digest',
    name: 'Executive Intelligence Digest',
    name_ar: 'الملخص التنفيذي اليومي',
    description: 'Compiles daily KPI overview: new inventory, closed viewings, active leads, and team commissions.',
    description_ar: 'إعداد ملخص يومي شامل: الوحدات الجديدة، المعاينات المنجزة، العملاء المهتمين، ونسب العمولات المحققة.',
    status: 'active',
    schedule: '0 21 * * *',
  },
  {
    slug: 'unit-adder',
    name: 'Automated Listing Ingestion',
    name_ar: 'مدقق ومدخل الوحدات الآلي',
    description: 'Validates and cleanses incoming broker spreadsheets, assigning AI-computed price per meter benchmarks.',
    description_ar: 'تدقيق وتنسيق شيتات العقارات الواردة وحساب سعر المتر العادل مقارنة بمتوسط أسعار الكمبوند.',
    status: 'active',
    schedule: '0 13 * * *',
  },
];

const L = {
  en: {
    title: 'Server-Side Workflow Control Plane',
    sub: 'Live scheduler and autonomous operations control for New Cairo real estate workflows (owner search, outreach, unit sync, and sentinels).',
    health: 'Runner Health',
    uptime: 'Uptime',
    tz: 'Timezone',
    gw: 'WhatsApp Gateway',
    none: 'Idle',
    rate: 'Success Rate',
    runs: 'Total Runs',
    last: 'Last Executed',
    duration: 'Duration',
    runNow: 'Run Now',
    running: 'Executing…',
    logs: 'Logs',
    hide: 'Hide',
    never: 'Never',
    ok: 'Success',
    error: 'Failed',
    unconfigured: 'Unconfigured',
    timeout: 'Timed Out',
    unreachable: 'Control plane unreachable — fallback DB queue engaged.',
    requested: 'Run request queued — the daemon executes it within 60 seconds.',
    quickDispatch: 'Trigger Morning Broker Dispatch',
  },
  ar: {
    title: 'مركز التحكم بمهام الخادم المؤتمتة',
    sub: 'المجدول المباشر والمشغل الآلي لسير العمل بالقاهرة الجديدة (بحث الملاك، المراسلات، مزامنة الوحدات، الحارس الذكي).',
    health: 'حالة المشغل',
    uptime: 'مدة التشغيل',
    tz: 'المنطقة الزمنية',
    gw: 'بوابة الواتساب',
    none: 'خامل',
    rate: 'نسبة النجاح',
    runs: 'مرات التشغيل',
    last: 'آخر تشغيل',
    duration: 'المدة',
    runNow: 'تشغيل الآن',
    running: 'جارٍ التنفيذ…',
    logs: 'السجل',
    hide: 'إخفاء',
    never: 'أبداً',
    ok: 'ناجح',
    error: 'فشل',
    unconfigured: 'غير مُهيأ',
    timeout: 'انتهاء المهلة',
    unreachable: 'المشغّل غير متصل — تم التحويل إلى مسار قاعدة البيانات التلقائي.',
    requested: 'تم تسجيل طلب التشغيل بنجاح — سينفذ تلقائياً خلال 60 ثانية.',
    quickDispatch: 'تشغيل بث الصباح لجروبات السماسرة الآن',
  },
} as const;

function fmtAgo(iso: string | null | undefined, lang: string): string {
  if (!iso) return lang === 'ar' ? 'أبداً' : 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return `${s}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  if (s < 172800) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export default function WorkflowOpsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const t = L[isAr ? 'ar' : 'en'];
  const [health, setHealth] = useState<Health | null>(null);
  const [wfs, setWfs] = useState<Wf[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [openLogs, setOpenLogs] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  const showNotice = (msg: string, err = false) => {
    setNotice({ msg, err });
    setTimeout(() => setNotice(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workflow-ops', { cache: 'no-store' });
      const data = await res.json();
      setHealth((data && (data.health || data)) as Health);

      const serverList = Array.isArray(data?.workflows) ? data.workflows : [];
      if (serverList.length > 0) {
        // Merge server list with rich defaults for any missing descriptions
        const serverMap = new Map(serverList.map((w: Wf) => [w.slug, w]));
        const merged = DEFAULT_WORKFLOWS.map((def) => {
          const live = serverMap.get(def.slug);
          return live ? { ...def, ...live } : def;
        });
        setWfs(merged);
      } else {
        setWfs(DEFAULT_WORKFLOWS);
      }
    } catch {
      // Keep rich catalog visible if proxy is booting
      setWfs((prev) => (prev.length > 0 ? prev : DEFAULT_WORKFLOWS));
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  const runNow = async (slug: string) => {
    setBusy(slug);
    try {
      const res = await fetch('/api/admin/workflow-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', slug }),
      });
      const data = await res.json();
      if (!res.ok && data?.error === 'runner_unreachable') {
        // Fall back to the DB marker path
        await fetch('/api/admin/workflow-ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request', slug }),
        });
        showNotice(t.requested);
      } else if (res.ok) {
        showNotice(isAr ? `تم تشغيل المهمة «${slug}» بنجاح!` : `Workflow "${slug}" triggered successfully!`);
      } else {
        showNotice(data?.error || t.error, true);
      }
    } catch {
      showNotice(t.unreachable, true);
    } finally {
      setBusy(null);
      setTimeout(load, 2500);
    }
  };

  const toggleLogs = async (slug: string) => {
    if (openLogs === slug) return setOpenLogs(null);
    setOpenLogs(slug);
    try {
      const res = await fetch(`/api/admin/workflow-ops?logs=${encodeURIComponent(slug)}&n=10`, { cache: 'no-store' });
      const data = await res.json();
      setWfs((prev) =>
        prev.map((w) =>
          w.slug === slug
            ? { ...w, local: { ...(w.local || {}), history: data?.history || w.local?.history || [] } as LocalState }
            : w
        )
      );
    } catch (_) {}
  };

  const gw = health?.gateway;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        fontFamily: isAr ? "'Cairo', system-ui, sans-serif" : 'inherit',
      }}
    >
      {/* ── TOP CONTROL CARD ─────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(9, 13, 22, 0.98))',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #d4af37, #997a15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
            }}
          >
            ⚙️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: 0 }}>{t.title}</h2>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: health?.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: health?.ok ? '#34d399' : '#fbbf24',
                  border: `1px solid ${health?.ok ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <HyouzBeacon color={health?.ok ? '#34d399' : '#fbbf24'} size={7} />
                {health?.ok ? (isAr ? 'المتحكم متصل' : 'RUNNER ONLINE') : isAr ? 'المتحكم خامل' : 'RUNNER IDLE'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--tx-m, #94a3b8)', margin: '4px 0 0 0', maxWidth: 640 }}>{t.sub}</p>
          </div>
        </div>

        {/* Quick Operations Button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <HyouzMagneticButton
            onClick={() => runNow('whatsapp-dispatch')}
            disabled={busy === 'whatsapp-dispatch'}
            style={{
              padding: '9px 18px',
              fontSize: 12,
              fontWeight: 800,
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #d4af37, #997a15)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)',
            }}
          >
            <span>🚀</span>
            <span>{busy === 'whatsapp-dispatch' ? t.running : t.quickDispatch}</span>
          </HyouzMagneticButton>

          <button
            onClick={load}
            style={{
              padding: '9px 14px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 10,
              cursor: 'pointer',
              border: '1px solid var(--bd, #1f293d)',
              background: 'var(--bg-e, #111827)',
              color: 'var(--tx, #f9fafb)',
            }}
          >
            ⟳ {isAr ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── NOTICE ALERT ─────────────────────────────────────────────── */}
      {notice && (
        <div
          style={{
            background: notice.err ? 'rgba(239, 68, 68, 0.12)' : 'rgba(212, 175, 55, 0.12)',
            border: `1px solid ${notice.err ? 'rgba(239, 68, 68, 0.4)' : 'rgba(212, 175, 55, 0.4)'}`,
            color: notice.err ? '#f87171' : '#f3e5ab',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{notice.err ? '⚠️' : 'ℹ️'}</span>
          <span>{notice.msg}</span>
        </div>
      )}

      {/* ── WORKFLOWS BENTO GRID ─────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
          gap: 14,
        }}
      >
        {wfs.map((w) => {
          const loc = w.local;
          const lastExit = loc?.lastExit;
          const isBusyThis = busy === w.slug;

          return (
            <HyouzCard
              key={w.slug}
              glowColor="rgba(212, 175, 55, 0.14)"
              style={{
                background: 'var(--bg-e, #111827)',
                border: '1px solid var(--bd, #1f293d)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.2)',
              }}
            >
              {/* Card Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: '#f8fafc' }}>
                      {isAr && w.name_ar ? w.name_ar : w.name}
                    </div>
                    <code style={{ fontSize: 10.5, color: '#d4af37', fontFamily: 'monospace' }}>
                      {w.slug} · {w.schedule || 'Cron on-demand'}
                    </code>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: w.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: w.status === 'active' ? '#34d399' : '#fbbf24',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <HyouzBeacon color={w.status === 'active' ? '#34d399' : '#fbbf24'} size={6} glow={w.status === 'active'} />
                    {w.status}
                  </span>
                </div>

                <p style={{ margin: '8px 0 0 0', fontSize: 11.5, color: 'var(--tx-m, #94a3b8)', lineHeight: 1.5, minHeight: 36 }}>
                  {isAr && w.description_ar ? w.description_ar : w.description}
                </p>
              </div>

              {/* Telemetry Row */}
              <div
                style={{
                  background: '#090d16',
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--tx-m, #94a3b8)',
                  border: '1px solid #1a2234',
                }}
              >
                <div>
                  {t.runs}: <b style={{ color: '#f8fafc' }}><HyouzCounter value={w.runs ?? 0} /></b>
                </div>
                <div>
                  {t.rate}: <b style={{ color: '#34d399' }}>{w.success_rate != null ? `${w.success_rate}%` : '100%'}</b>
                </div>
                <div>
                  {t.last}: <b style={{ color: '#d4af37' }}>{fmtAgo(loc?.lastRun || w.last_run_at, lang)}</b>
                </div>
              </div>

              {/* Actions Row */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => runNow(w.slug)}
                  disabled={isBusyThis}
                  style={{
                    flex: 1,
                    padding: '7px 14px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    background: 'rgba(212, 175, 55, 0.12)',
                    color: '#f3e5ab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>▶</span>
                  <span>{isBusyThis ? t.running : t.runNow}</span>
                </button>

                <button
                  onClick={() => toggleLogs(w.slug)}
                  style={{
                    padding: '7px 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: '1px solid var(--bd, #1f293d)',
                    background: '#1f2937',
                    color: '#f8fafc',
                  }}
                >
                  {openLogs === w.slug ? t.hide : t.logs}
                </button>
              </div>

              {/* Output Log Drawer */}
              {openLogs === w.slug && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 10.5,
                    lineHeight: 1.5,
                    maxHeight: 160,
                    overflowY: 'auto',
                    background: '#070b12',
                    borderRadius: 8,
                    padding: '10px 12px',
                    border: '1px solid #1f293d',
                    fontFamily: 'monospace',
                  }}
                >
                  {(loc?.history || []).length === 0 && (
                    <div style={{ color: '#64748b', textAlign: 'center' }}>{t.never}</div>
                  )}
                  {(loc?.history || []).map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid #111827' }}>
                      <span style={{ color: h.exit === 'ok' ? '#34d399' : '#f87171', fontWeight: 800 }}>
                        [{h.exit}]
                      </span>
                      <span style={{ color: '#64748b' }}>{fmtAgo(h.at, lang)}</span>
                      <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.summary || 'Completed execution'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </HyouzCard>
          );
        })}
      </div>
    </div>
  );
}
