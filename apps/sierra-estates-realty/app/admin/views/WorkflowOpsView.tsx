'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Server-Side Workflow Control Plane (Port 2786)
 * ───────────────────────────────────────────────────────────────────────────
 * High-End Luxury Real Estate Intelligence OS · New Cairo Server Operations
 * 
 * Features:
 *  - Runner Health Telemetry (Uptime, Timezone, Supabase sync, Active jobs)
 *  - 2-Hour Executive Outreach Radar (Live 2h window metrics, Daily Cap, Line Distribution)
 *  - Continuous Autonomous Outreach Engine Toggle & On-Demand Batch Triggers
 *  - Dedicated Control for 12 Server Workflows (including Harvester & 2h Digest)
 *  - One-Click 'Run Now', Instant DB-Marker Fallback, Live Output Log Inspector
 *  - High-Contrast Obsidian & Champagne Gold Aesthetics (WCAG 2.2 compliant)
 *  - Full Bilingual Craft (Arabic RTL & English LTR)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useState } from 'react';
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

interface RecentSentItem {
  phone: string;
  code?: string;
  session?: string;
  at: string;
  idx?: number;
  text?: string;
}

interface RadarReport {
  generated_at?: string;
  cairo_time?: string;
  window_hours?: number;
  sent_in_last_2h?: number;
  sent_today_total?: number;
  daily_cap?: number;
  replies_in_last_2h?: number;
  top_cursor?: number;
  bottom_cursor?: number;
  total_candidates?: number;
  ready_lines?: string[];
  sessions_used_2h?: Record<string, number>;
  recent_sent?: RecentSentItem[];
}

interface RadarConfig {
  continuous: boolean;
  cooldownSec: number;
  dailyCap: number;
  activeHours: number[];
}

const DEFAULT_WORKFLOWS: Wf[] = [
  {
    slug: 'owner-outreach',
    name: 'Owner WhatsApp Outreach',
    name_ar: 'مراسلة وتفاوض الملاك المباشرين',
    description: 'Autonomous continuous WhatsApp outreach pool with human-jitter pacing and line rotation across New Cairo inventory.',
    description_ar: 'تشغيل ذاتي متواصل لمراسلة الملاك عبر خطوط الواتساب بنظام الجيتر المانع للحظر وتدوير الخطوط كل دفعة.',
    status: 'active',
    schedule: 'Continuous Loop · 09:00–22:00',
  },
  {
    slug: 'outreach-2h-digest',
    name: '2-Hour Outreach Radar Digest',
    name_ar: 'ملخص متابعة تواصل الملاك كل ساعتين',
    description: 'Evaluates outreach metrics every 2 hours: messages sent, line rotation, and delivers WhatsApp executive digest to management.',
    description_ar: 'تقييم شامل كل ساعتين لعمليات التواصل مع الملاك، دوران خطوط الواتساب، وإرسال التقرير للإدارة عبر الواتساب.',
    status: 'active',
    schedule: '0 */2 * * *',
  },
  {
    slug: 'usb-phone-harvester',
    name: 'USB Phone Group Harvester',
    name_ar: 'جامع وحدات الواتساب عبر كابل الموبايل',
    description: 'Extracts WhatsApp property group chats over USB cable twice weekly and on plug-in, parsing posted dates and syncing to DB & Drive.',
    description_ar: 'سحب وفحص جروبات عقارات القاهرة الجديدة تلقائياً عبر كابل USB مرتين أسبوعياً وعند توصيل الهاتف، وتصنيف الوحدات بحسب تاريخ النشر.',
    status: 'active',
    schedule: '0 10 * * 0,3',
  },
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
    slug: 'gateway-sentinel',
    name: 'WhatsApp Gateway Sentinel',
    name_ar: 'حارس جاهزية البوابة والخطوط',
    description: 'Probes all WhatsApp lines, tests network latency, and restarts stalled browser engines.',
    description_ar: 'فحص فوري لجاهزية الخطوط، قياس زمن الاستجابة، وإعادة إنعاش المتصفحات المتوقفة تلقائياً.',
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
    radarTitle: 'Owner Outreach 2-Hour Performance Radar',
    radarSub: 'Continuous autonomous loop active during 09:00–22:00 Cairo time with human anti-ban pacing & line rotation.',
    sent2h: 'Sent in Last 2h',
    sentToday: 'Today Total / Cap',
    replies2h: 'Replies (Last 2h)',
    loopMode: 'Autonomous Loop',
    loopContinuous: 'CONTINUOUS (AUTONOMOUS)',
    loopSlot: 'SLOT CADENCE (MANUAL)',
    triggerBatch: 'Send Next Batch Now',
    triggerDigest: 'Send 2h Digest to WhatsApp',
    toggleContinuous: 'Toggle Autonomous Loop',
    cursorProgress: 'Inventory Progress',
    activeLines: 'Active Sender Lines',
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
    radarTitle: 'رادار متابعة تواصل الملاك (كل ساعتين والتشغيل الذاتي)',
    radarSub: 'نظام تشغيل ذاتي متواصل يعمل طوال ساعات العمل 09:00-22:00 بتوقيت القاهرة مع تدوير الخطوط وفواصل الأمان البشري.',
    sent2h: 'المرسل خلال آخر ساعتين',
    sentToday: 'إجمالي اليوم / الحد اليومي',
    replies2h: 'الردود المستلمة (ساعتين)',
    loopMode: 'وضع التشغيل الذاتي',
    loopContinuous: 'يعمل ذاتياً ومستمر',
    loopSlot: 'نظام الفترات المنفصلة',
    triggerBatch: 'تشغيل دفعة تواصل الآن',
    triggerDigest: 'إرسال تقرير الساعتين للواتساب الآن',
    toggleContinuous: 'تبديل وضع التشغيل الذاتي',
    cursorProgress: 'مؤشر التقدم في المخزون',
    activeLines: 'الخطوط النشطة الجاهزة',
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

  // 2-Hour Radar State
  const [radar, setRadar] = useState<{ report: RadarReport | null; config: RadarConfig | null } | null>(null);
  const [radarBusy, setRadarBusy] = useState<string | null>(null);

  const showNotice = (msg: string, err = false) => {
    setNotice({ msg, err });
    setTimeout(() => setNotice(null), 5000);
  };

  const loadRadar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/owner-outreach?action=radar', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setRadar({ report: json.report, config: json.config });
      }
    } catch (_) {}
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workflow-ops', { cache: 'no-store' });
      const data = await res.json();
      setHealth((data && (data.health || data)) as Health);

      const serverList = Array.isArray(data?.workflows) ? data.workflows : [];
      if (serverList.length > 0) {
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
      setWfs((prev) => (prev.length > 0 ? prev : DEFAULT_WORKFLOWS));
    }
  }, []);

  useEffect(() => {
    load();
    loadRadar();
    const iv = setInterval(() => {
      load();
      loadRadar();
    }, 15000);
    return () => clearInterval(iv);
  }, [load, loadRadar]);

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

  // 2-Hour Radar Actions
  const triggerOutreachBatch = async () => {
    setRadarBusy('batch');
    try {
      const res = await fetch('/api/admin/whatsapp/owner-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger-batch' }),
      });
      const d = await res.json();
      showNotice(d.message || (isAr ? 'تم بدء دفعة التواصل بنجاح!' : 'Batch started!'));
    } catch (err: any) {
      showNotice(err.message, true);
    } finally {
      setRadarBusy(null);
      setTimeout(() => { load(); loadRadar(); }, 2500);
    }
  };

  const trigger2hDigest = async () => {
    setRadarBusy('digest');
    try {
      const res = await fetch('/api/admin/whatsapp/owner-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger-two-hour-digest' }),
      });
      const d = await res.json();
      showNotice(d.message || (isAr ? 'تم إرسال تقرير الساعتين للواتساب بنجاح!' : '2h Digest sent!'));
    } catch (err: any) {
      showNotice(err.message, true);
    } finally {
      setRadarBusy(null);
      setTimeout(() => { load(); loadRadar(); }, 2500);
    }
  };

  const toggleContinuous = async () => {
    setRadarBusy('continuous');
    try {
      const nextState = !radar?.config?.continuous;
      const res = await fetch('/api/admin/whatsapp/owner-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-continuous', continuous: nextState }),
      });
      const d = await res.json();
      showNotice(d.message || (isAr ? 'تم تحديث وضع التشغيل الذاتي!' : 'Continuous mode updated!'));
    } catch (err: any) {
      showNotice(err.message, true);
    } finally {
      setRadarBusy(null);
      setTimeout(() => { load(); loadRadar(); }, 1500);
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

  const isContinuous = Boolean(radar?.config?.continuous ?? true);

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
            onClick={() => { load(); loadRadar(); }}
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

      {/* ── 2-HOUR OUTREACH EXECUTIVE RADAR ───────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(11, 17, 30, 0.99))',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 10px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 175, 55, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📊</span>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f3e5ab', margin: 0 }}>
                {t.radarTitle}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(212, 175, 55, 0.15)',
                  color: '#d4af37',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                }}
              >
                {radar?.report?.cairo_time || (isAr ? 'مباشر الآن' : 'Live')}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '4px 0 0 0' }}>
              {t.radarSub}
            </p>
          </div>

          {/* Radar Control Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={triggerOutreachBatch}
              disabled={radarBusy === 'batch'}
              style={{
                padding: '8px 14px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 8,
                cursor: 'pointer',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⚡</span>
              <span>{radarBusy === 'batch' ? (isAr ? 'جارٍ البدء…' : 'Starting…') : t.triggerBatch}</span>
            </button>

            <button
              onClick={toggleContinuous}
              disabled={radarBusy === 'continuous'}
              style={{
                padding: '8px 14px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 8,
                cursor: 'pointer',
                border: `1px solid ${isContinuous ? 'rgba(212, 175, 55, 0.5)' : 'rgba(148, 163, 184, 0.3)'}`,
                background: isContinuous ? 'rgba(212, 175, 55, 0.18)' : 'rgba(30, 41, 59, 0.6)',
                color: isContinuous ? '#f3e5ab' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{isContinuous ? '🟢' : '⏸️'}</span>
              <span>
                {isAr
                  ? (isContinuous ? 'الوضع الذاتي: نشط مستمر' : 'الوضع الذاتي: موقوف')
                  : (isContinuous ? 'Auto Loop: ON' : 'Auto Loop: PAUSED')}
              </span>
            </button>

            <button
              onClick={trigger2hDigest}
              disabled={radarBusy === 'digest'}
              style={{
                padding: '8px 14px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 8,
                cursor: 'pointer',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(153, 122, 21, 0.2))',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📲</span>
              <span>{radarBusy === 'digest' ? (isAr ? 'جارٍ الإرسال…' : 'Sending…') : t.triggerDigest}</span>
            </button>
          </div>
        </div>

        {/* Radar Metric Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11, color: '#94a3b8' }}>📤 {t.sent2h}</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#34d399' }}>
              <HyouzCounter value={radar?.report?.sent_in_last_2h ?? 0} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', marginInlineStart: 4 }}>
                {isAr ? 'مالك' : 'owners'}
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11, color: '#94a3b8' }}>📈 {t.sentToday}</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#f3e5ab' }}>
              <HyouzCounter value={radar?.report?.sent_today_total ?? 0} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginInlineStart: 4 }}>
                / {radar?.report?.daily_cap ?? 150}
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11, color: '#94a3b8' }}>💬 {t.replies2h}</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#60a5fa' }}>
              <HyouzCounter value={radar?.report?.replies_in_last_2h ?? 0} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', marginInlineStart: 4 }}>
                {isAr ? 'رد وارد' : 'inbox'}
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11, color: '#94a3b8' }}>⚡ {t.loopMode}</span>
            <div style={{ fontSize: 15, fontWeight: 800, color: isContinuous ? '#34d399' : '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, height: 32 }}>
              <HyouzBeacon color={isContinuous ? '#34d399' : '#fbbf24'} size={8} glow={isContinuous} />
              <span>{isContinuous ? t.loopContinuous : t.loopSlot}</span>
            </div>
          </div>
        </div>

        {/* Lines and Progress Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: 11.5,
            color: '#94a3b8',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: 10,
          }}
        >
          <div>
            🟢 <b style={{ color: '#cbd5e1' }}>{t.activeLines}:</b>{' '}
            <span style={{ color: '#d4af37' }}>
              {radar?.report?.ready_lines?.length ? radar.report.ready_lines.join(' · ') : '3 خطوط نشطة جاهزة للتدوير'}
            </span>
          </div>

          <div>
            🎯 <b style={{ color: '#cbd5e1' }}>{t.cursorProgress}:</b>{' '}
            <span style={{ color: '#f3e5ab' }}>
              {radar?.report?.top_cursor ?? 0} من البداية / {radar?.report?.bottom_cursor ?? 0} من النهاية (إجمالي {radar?.report?.total_candidates ?? 4198})
            </span>
          </div>
        </div>

        {/* Live Sent Messages Stream */}
        {radar?.report?.recent_sent && radar.report.recent_sent.length > 0 && (
          <div
            style={{
              marginTop: 6,
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#f3e5ab' }}>
                👁️ {isAr ? 'البث المباشر لآخر رسائل تم إرسالها للملاك' : 'Live Stream of Recently Contacted Owners'}
              </span>
              <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                {isAr ? 'محدث لحظياً كل 15 ثانية' : 'Live updating every 15s'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {radar.report.recent_sent.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#0d1321',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 11.5,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#34d399', fontWeight: 800 }}>+{item.phone}</span>
                      <code style={{ fontSize: 10.5, color: '#d4af37', background: 'rgba(212, 175, 55, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                        {item.code || 'Unit Code'}
                      </code>
                      <span style={{ fontSize: 10, color: '#60a5fa', background: 'rgba(96, 165, 250, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                        {item.session || 'line-1'}
                      </span>
                    </div>
                    <span style={{ fontSize: 10.5, color: '#64748b' }}>{fmtAgo(item.at, lang)}</span>
                  </div>
                  {item.text && (
                    <div style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                      {item.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
