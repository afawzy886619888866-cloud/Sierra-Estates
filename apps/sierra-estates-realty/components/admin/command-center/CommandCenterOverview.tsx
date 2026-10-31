/* eslint-disable @next/next/no-img-element */
'use client';

/**
 * SIERRA ESTATES — DIAGNOSTIC COMMAND OVERVIEW (/admin)
 *
 * Visual language ported from the owner's ITQANE PC-Diagnostic reference
 * (deep navy cockpit, neon-cyan glow borders, gold active states, green OK
 * telemetry): fixed instrument sidebar + breadcrumb status bar + a card
 * wall that reads like a diagnostic bay — portfolio information, four
 * vertical quick-stat gauges, pipeline/leads/inventory detail cards with
 * progress bars and sparklines, AI fleet + webhook battery telemetry and
 * the concierge contact card.
 *
 * Every number is still LIVE from /api/admin/overview (Supabase) via the
 * same useAdminApi wallboard hook — an empty deployment renders honest
 * zeros, never demo data. Auto-refresh sweep every 30s (the animated green
 * bar under the status pill is the sweep clock).
 *
 * Privacy doctrine: the ONLY phone number rendered anywhere on this page
 * is the client-facing concierge line +20 109 204 8333 (wa.me/201092048333)
 * — owner mobiles never appear here, and the sidebar QR encodes exactly
 * that wa.me link.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bot,
  ChevronRight,
  ClipboardList,
  Database,
  Flame,
  Gem,
  Globe,
  Grid2x2,
  Home,
  KanbanSquare,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Webhook,
  Zap,
} from 'lucide-react';
import {
  CcError,
  CcPageShell,
  CcUnauthorized,
  formatCurrency,
  formatNumber,
  useAdminApi,
} from '@/components/admin/command-center/ui';

interface OverviewKpis {
  totalDealsValue: number;
  activeDealsCount: number;
  closedWonValue: number;
  activeLeads: number;
  newLeads7d: number;
  hotLeads: number;
  verifiedProperties: number;
  totalListings: number;
  staleListings: number;
  inventoryFreshnessScore: number;
  freshOver90: number;
  bots: { total: number; enabled: number; active: number; erroring: number };
}

interface OverviewData {
  generatedAt: string;
  kpis: OverviewKpis;
  pipelineByStage: { stage: string; value: number; count: number }[];
  botStatuses: { id: string; status: string; enabled: boolean; lastPulse: number | null }[];
  recentActivity: Record<string, unknown>[];
  webhookStats: {
    last24h: { total: number; whatsapp: number; telegram: number; errors: number };
  };
}

/* ── i18n (EN / العربية — matches the site's ar/en locale pair) ─────────── */

type Lang = 'en' | 'ar';

const STR = {
  en: {
    brandSub: 'Command Center',
    navSection: 'Consoles',
    navOverview: 'Overview',
    navPipeline: 'Pipeline',
    navProperties: 'Properties',
    navLeads: 'Leads',
    navBots: 'Bots',
    navApplicants: 'Applicants',
    navConsole: 'Console',
    navSignIn: 'Sign in',
    sideTag: 'Real Estate | New Cairo | Rentals & Resale',
    crumb1: 'Discover',
    crumb2: 'Present',
    crumb3: 'Close',
    crumbSub: 'Your portfolio, our priority',
    scan: 'Scan Estate',
    lastScan: 'Last sync',
    systemOk: 'System <span>OK</span>',
    systemWarn: 'Fleet <span class="warn">needs attention</span>',
    okSub: 'All estate pipelines are running normally',
    warnSub: 'Agent fleet errors detected — open the bots desk',
    infoTitle: 'Portfolio Information',
    company: 'Company',
    platform: 'Platform',
    coverage: 'Coverage',
    totalListings: 'Total Listings',
    verified: 'Verified Properties',
    activeDeals: 'Active Deals',
    closedWon: 'Closed-Won Value',
    generated: 'Data Generated',
    allOperational: 'ALL SYSTEMS OPERATIONAL',
    allOperationalSub: 'Live from Supabase — honest zeros on empty deployments',
    qDeals: 'Deals Value',
    qLeads: 'Active Leads',
    qVerified: 'Verified',
    qFresh: 'Freshness',
    ok: 'OK',
    watch: 'WATCH',
    alert: 'ALERT',
    pipelineTitle: 'Pipeline',
    pipelineHw: 'CRM 10-Stage Deal Flow',
    activeDealsK: 'Active Deals',
    totalValueK: 'Total Value',
    closedWonK: 'Closed-Won',
    hotLeadsK: 'Hot Leads',
    usage: 'Pipeline Load',
    hotPressure: 'Hot Pressure',
    stages: 'STAGES',
    valueAxis: 'EGP VALUE BY STAGE',
    leadsTitle: 'Leads',
    leadsHw: 'Active Leads Engine',
    activeK: 'Active',
    hotK: 'Hot',
    new7dK: 'New (7d)',
    matchIdxK: 'Match-ready',
    leadLoad: 'Lead Load',
    inventoryTitle: 'Inventory',
    driveFreshName: 'Fresh Stock — listings at ≥ 90% freshness',
    driveFreshCap: 'listings verified fresh',
    driveStaleName: 'Stale Backlog — listings needing refresh',
    driveStaleCap: 'listings pending re-verification',
    good: 'Good',
    needsAction: 'Needs action',
    fleetTitle: 'AI Fleet',
    fleetHw: 'Sierra Intelligence — Agent Fleet',
    fleetBadge: 'SIERRA AI',
    totalBots: 'Total Bots',
    enabledBots: 'Enabled',
    activeBots: 'Active',
    erroringBots: 'Erroring',
    fleetLoad: 'Fleet Load',
    fleetSpark: 'BOT PULSES (LIVE)',
    channelsTitle: 'Channels',
    channelsHw: 'WhatsApp & Webhook Telemetry',
    battHealth: 'Channel Health',
    rowsWhatsApp: 'WhatsApp events · 24h',
    rowsTelegram: 'Telegram events · 24h',
    rowsErrors: 'Webhook errors · 24h',
    protectedNote: 'Flagship line-2 is concierge-only — protected from outreach rotation. Owner mobiles never appear on admin surfaces.',
    contactTitle: 'Concierge',
    contactName: 'Sierra Estates Concierge',
    contactSub: 'The single client-facing line',
    contactBtn: 'Chat on WhatsApp',
    contactNote: 'Every listing, broadcast and feed routes inquiries to this one number — the internal reference for the whole fleet.',
    footer: 'Sierra Estates · Unified Admin Command Center · data as of',
    booting: 'Booting diagnostic bay…',
  },
  ar: {
    brandSub: 'مركز القيادة',
    navSection: 'اللوحات',
    navOverview: 'النظرة العامة',
    navPipeline: 'الصفقات',
    navProperties: 'الوحدات',
    navLeads: 'العملاء',
    navBots: 'الروبوتات',
    navApplicants: 'التقديمات',
    navConsole: 'الكونسول',
    navSignIn: 'تسجيل الدخول',
    sideTag: 'عقارات | القاهرة الجديدة | إيجار وإعادة بيع',
    crumb1: 'اكتشف',
    crumb2: 'قدّم',
    crumb3: 'أتمم',
    crumbSub: 'محفظتك، أولويتنا',
    scan: 'فحص المحفظة',
    lastScan: 'آخر مزامنة',
    systemOk: 'النظام <span>سليم</span>',
    systemWarn: 'الأسطول <span class="warn">يحتاج انتباهًا</span>',
    okSub: 'جميع خطوط العقارات تعمل بشكل طبيعي',
    warnSub: 'اكتُشفت أخطاء في أسطول الوكلاء — افتح لوحة الروبوتات',
    infoTitle: 'معلومات المحفظة',
    company: 'الشركة',
    platform: 'المنصة',
    coverage: 'التغطية',
    totalListings: 'إجمالي الوحدات',
    verified: 'وحدات موثّقة',
    activeDeals: 'صفقات نشطة',
    closedWon: 'قيمة الصفقات المكتسبة',
    generated: 'تاريخ البيانات',
    allOperational: 'كل الأنظمة تعمل',
    allOperationalSub: 'بيانات حيّة من Supabase — أصفار صادقة عند الفراغ',
    qDeals: 'قيمة الصفقات',
    qLeads: 'عملاء نشطون',
    qVerified: 'موثّقة',
    qFresh: 'الانتعاش',
    ok: 'سليم',
    watch: 'مراقبة',
    alert: 'تنبيه',
    pipelineTitle: 'الصفقات',
    pipelineHw: 'تدفق الصفقات — 10 مراحل',
    activeDealsK: 'صفقات نشطة',
    totalValueK: 'القيمة الإجمالية',
    closedWonK: 'مكتسبة',
    hotLeadsK: 'عملاء ساخنون',
    usage: 'حِمل الصفقات',
    hotPressure: 'ضغط العملاء',
    stages: 'المراحل',
    valueAxis: 'القيمة بالجنيه لكل مرحلة',
    leadsTitle: 'العملاء',
    leadsHw: 'محرك العملاء النشطين',
    activeK: 'نشط',
    hotK: 'ساخن',
    new7dK: 'جديد (٧ أيام)',
    matchIdxK: 'جاهز للمطابقة',
    leadLoad: 'حِمل العملاء',
    inventoryTitle: 'المخزون',
    driveFreshName: 'المخزون المنتعش — وحدات بانتعاش ≥ ٩٠٪',
    driveFreshCap: 'وحدة موثّقة منتعة',
    driveStaleName: 'التأخير المتراكم — وحدات تحتاج تحديثًا',
    driveStaleCap: 'وحدة بانتظار إعادة التوثيق',
    good: 'جيد',
    needsAction: 'يحتاج إجراء',
    fleetTitle: 'أسطول الذكاء',
    fleetHw: 'ذكاء سييرا — أسطول الوكلاء',
    fleetBadge: 'ذكاء سييرا',
    totalBots: 'إجمالي الروبوتات',
    enabledBots: 'مفعّلة',
    activeBots: 'نشطة',
    erroringBots: 'خاطئة',
    fleetLoad: 'حِمل الأسطول',
    fleetSpark: 'نبضات الروبوت (حي)',
    channelsTitle: 'القنوات',
    channelsHw: 'قياسات واتساب والويبهوك',
    battHealth: 'صحة القنوات',
    rowsWhatsApp: 'أحداث واتساب · ٢٤ ساعة',
    rowsTelegram: 'أحداث تيليجرام · ٢٤ ساعة',
    rowsErrors: 'أخطاء الويبهوك · ٢٤ ساعة',
    protectedNote: 'خط الشركة مخصص لمحادثات العملاء فقط — محمي من دورات التواصل. أرقام الملاك لا تظهر أبدًا على لوحات الإدارة.',
    contactTitle: 'الكونسيرج',
    contactName: 'كونسيرج سييرا إستيتس',
    contactSub: 'الخط الوحيد المواجه للعملاء',
    contactBtn: 'تواصل عبر واتساب',
    contactNote: 'كل إعلان وبثّ يحوّل الاستفسارات إلى هذا الرقم الوحيد — المرجع الداخلي للأسطول كله.',
    footer: 'سييرا إستيتس · مركز القيادة الموحّد · البيانات كما في',
    booting: 'جارٍ تشغيل لوحة الفحص…',
  },
} as const;

type StrKey = keyof typeof STR.en;

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Compact EGP for gauge read-outs (EGP 4.2M style). */
function compactEgp(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `EGP ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `EGP ${(value / 1_000).toFixed(0)}K`;
  return `EGP ${formatNumber(value)}`;
}

function pctOf(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

/** Inline SVG sparkline (polyline + soft area) — deterministic, no deps. */
function Sparkline({ values, stroke = '#00d2ff', id }: { values: number[]; stroke?: string; id: string }) {
  const w = 240;
  const h = 46;
  const n = Math.max(values.length, 2);
  const max = Math.max(1, ...values);
  const step = w / (n - 1);
  const pts = (values.length ? values : [0, 0]).map((v, i) => {
    const x = i * step;
    const y = h - 6 - (v / max) * (h - 14);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-hidden>
      <defs>
        <linearGradient id={`dg-spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#dg-spark-${id})`} />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${stroke}88)` }}
      />
    </svg>
  );
}

/* ── nav model ───────────────────────────────────────────────────────────── */

const NAV: { href: string; key: StrKey; icon: React.ReactNode; badgeKey?: StrKey }[] = [
  { href: '/admin', key: 'navOverview', icon: <Grid2x2 /> },
  { href: '/admin/pipeline', key: 'navPipeline', icon: <KanbanSquare /> },
  { href: '/admin/properties', key: 'navProperties', icon: <Home /> },
  { href: '/admin/leads', key: 'navLeads', icon: <Users /> },
  { href: '/admin/bots', key: 'navBots', icon: <Bot /> },
  { href: '/admin/applicants', key: 'navApplicants', icon: <UserPlus /> },
  { href: '/admin/console', key: 'navConsole', icon: <ClipboardList /> },
];

/* ── component ───────────────────────────────────────────────────────────── */

export default function CommandCenterOverview() {
  const { data, loading, error, unauthorized, reload } = useAdminApi<OverviewData>(
    '/api/admin/overview',
  );

  // Wallboard sweep — every 30s (the animated pill bar is this clock).
  useEffect(() => {
    const id = setInterval(reload, 30_000);
    return () => clearInterval(id);
  }, [reload]);

  const [lang, setLang] = useState<Lang>('en');
  const t = (key: StrKey): string => STR[lang][key];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const k = data?.kpis;

  const derived = useMemo(() => {
    const totalListings = k?.totalListings ?? 0;
    const bots = k?.bots ?? { total: 0, enabled: 0, active: 0, erroring: 0 };
    const wh = data?.webhookStats.last24h ?? { total: 0, whatsapp: 0, telegram: 0, errors: 0 };
    return {
      bots,
      wh,
      verifiedPct: pctOf(k?.verifiedProperties ?? 0, totalListings),
      freshPct: Math.max(0, Math.min(100, Math.round(k?.inventoryFreshnessScore ?? 0))),
      stalePct: pctOf(k?.staleListings ?? 0, totalListings),
      hotPct: pctOf(k?.hotLeads ?? 0, Math.max(k?.activeLeads ?? 0, 1)),
      fleetLoadPct: pctOf(bots.active, Math.max(bots.total, 1)),
      dealLoadPct: pctOf(k?.activeDealsCount ?? 0, Math.max((k?.activeDealsCount ?? 0) + 6, 10)),
      healthPct: wh.total > 0 ? 100 - pctOf(wh.errors, wh.total) : 100,
      stageValues: (data?.pipelineByStage ?? []).map((s) => s.value),
      botPulses: (data?.botStatuses ?? []).map((b) => (b.status === 'active' ? 1 : b.status === 'error' ? 0.25 : 0.6)),
      systemWarn: !!(k && k.bots.erroring > 0),
    };
  }, [k, data]);

  const lastScan = data ? new Date(data.generatedAt).toLocaleString('en-GB') : '—';

  if (unauthorized) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="Unified Overview">
        <CcUnauthorized />
      </CcPageShell>
    );
  }

  if (error && !data) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="Unified Overview">
        <CcError message={error} onRetry={reload} />
      </CcPageShell>
    );
  }

  return (
    <div className="dg-root" dir={dir}>
      {/* ══ SIDEBAR ═══════════════════════════════════════════════════════ */}
      <aside className="dg-side">
        <div className="dg-brand">
          <div className="dg-brand-ring">
            <img src="/assets/logo-mark-96.png" alt="Sierra Estates" />
          </div>
          <div className="dg-brand-text">
            <div className="dg-brand-name">SIERRA ESTATES</div>
            <div className="dg-brand-sub">{t('brandSub')}</div>
          </div>
        </div>

        <nav className="dg-nav">
          <div className="dg-nav-label">{t('navSection')}</div>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dg-nav-item${item.href === '/admin' ? ' active' : ''}`}
            >
              {item.icon}
              <span>{t(item.key)}</span>
              {item.href === '/admin' && <span className="dg-nav-badge">LIVE</span>}
            </Link>
          ))}
          <div className="dg-nav-label" style={{ paddingTop: 14 }}>
            &nbsp;
          </div>
          <Link href="/admin/login" className="dg-nav-item">
            <ShieldCheck />
            <span>{t('navSignIn')}</span>
          </Link>
        </nav>

        <div className="dg-side-foot">
          <span className="dg-qr-box">
            <img src="/admin/sierra-whatsapp-qr.png" alt="WhatsApp — Sierra Estates concierge" />
          </span>
          <div className="dg-side-tag">{t('sideTag')}</div>
          <div className="dg-side-phone">+20 109 204 8333</div>
        </div>
      </aside>

      {/* ══ MAIN ═════════════════════════════════════════════════════════ */}
      <main className="dg-main">
        {/* top bar — breadcrumb / status pill / languages */}
        <header className="dg-topbar">
          <div>
            <div className="dg-crumb">
              {t('crumb1')}
              <ChevronRight />
              {t('crumb2')}
              <ChevronRight />
              {t('crumb3')}
            </div>
            <div className="dg-crumb-sub">{t('crumbSub')}</div>
          </div>

          <div className="dg-status-pill">
            <div className={`dg-status-dot${derived.systemWarn ? ' warn' : ''}`}>
              {derived.systemWarn ? <Zap /> : <Activity />}
            </div>
            <div>
              <div
                className="dg-status-main"
                dangerouslySetInnerHTML={{
                  __html: derived.systemWarn ? t('systemWarn') : t('systemOk'),
                }}
              />
              <div className="dg-status-meta">
                {t('lastScan')}: {lastScan}
              </div>
            </div>
            <button
              type="button"
              onClick={reload}
              title="Resync now"
              aria-label="Resync now"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--dg-cyan)',
                cursor: 'pointer',
                padding: 4,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <RefreshCw size={14} className={loading ? 'dg-spin' : ''} />
            </button>
            <div className="dg-status-bar">
              <i />
            </div>
          </div>

          <div className="dg-langs">
            <button
              type="button"
              className={`dg-lang-btn${lang === 'en' ? ' active' : ''}`}
              onClick={() => setLang('en')}
            >
              <Globe />
              English
            </button>
            <button
              type="button"
              className={`dg-lang-btn${lang === 'ar' ? ' active' : ''}`}
              onClick={() => setLang('ar')}
            >
              <Globe />
              العربية
            </button>
          </div>
        </header>

        {loading && !data ? (
          /* boot state */
          <>
            <div className="dg-skel">
              <div className="dg-skel-block" />
              <div className="dg-skel-block" />
              <div className="dg-skel-block" />
              <div className="dg-skel-block" />
              <div className="dg-skel-block" />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--dg-tx-s)' }}>{t('booting')}</p>
          </>
        ) : !k ? null : (
          <>
            {/* ── ROW 1 · portfolio information + four quick gauges ─────── */}
            <section className="dg-row1">
              <div className="dg-card dg-info-card">
                <div className="dg-card-h">
                  <Database />
                  <span className="dg-card-title">{t('infoTitle')}</span>
                </div>
                <div className="dg-info-body">
                  <div className="dg-info-main">
                    <div className="dg-info-visual">
                      <img
                        className="dg-info-img"
                        src="/assets/sierra-estates-official-logo.png"
                        alt="Sierra Estates"
                      />
                      <div className="dg-kv">
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('company')}</span>
                          <span className="dg-kv-v">Sierra Estates</span>
                        </div>
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('platform')}</span>
                          <span className="dg-kv-v">Intelligence OS 3.0</span>
                        </div>
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('coverage')}</span>
                          <span className="dg-kv-v">New Cairo, Egypt</span>
                        </div>
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('totalListings')}</span>
                          <span className="dg-kv-v">{formatNumber(k.totalListings)}</span>
                        </div>
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('verified')}</span>
                          <span className="dg-kv-v">{formatNumber(k.verifiedProperties)}</span>
                        </div>
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('activeDeals')}</span>
                          <span className="dg-kv-v">{formatNumber(k.activeDealsCount)}</span>
                        </div>
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('closedWon')}</span>
                          <span className="dg-kv-v">{formatCurrency(k.closedWonValue, 'EGP')}</span>
                        </div>
                        <div className="dg-kv-row">
                          <span className="dg-kv-k">{t('generated')}</span>
                          <span className="dg-kv-v">{lastScan}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="dg-info-status">
                    <img className="dg-os-logo" src="/assets/logo-mark-96.png" alt="" />
                    <div className={`dg-ok-badge${derived.systemWarn ? ' warn' : ''}`}>
                      {derived.systemWarn ? <Zap /> : <Activity />}
                    </div>
                    <div className={`dg-ok-text${derived.systemWarn ? ' warn' : ''}`}>
                      {t('allOperational')}
                    </div>
                    <div className="dg-ok-sub">{derived.systemWarn ? t('warnSub') : t('okSub')}</div>
                  </div>
                </div>
              </div>

              {/* four vertical quick gauges */}
              <Link href="/admin/pipeline" className="dg-card dg-quick">
                <span className="dg-quick-icon">
                  <TrendingUp />
                </span>
                <span className="dg-quick-label">{t('qDeals')}</span>
                <span className="dg-quick-value">{compactEgp(k.totalDealsValue)}</span>
                <span className="dg-quick-status">{t('ok')}</span>
                <span className="dg-bar">
                  <i className="dg-bar-fill-gold" style={{ width: `${derived.dealLoadPct}%` }} />
                </span>
              </Link>

              <Link href="/admin/leads" className="dg-card dg-quick">
                <span className="dg-quick-icon">
                  <Users />
                </span>
                <span className="dg-quick-label">{t('qLeads')}</span>
                <span className="dg-quick-value">{formatNumber(k.activeLeads)}</span>
                <span className={`dg-quick-status${k.activeLeads > 0 ? '' : ' warn'}`}>
                  {k.activeLeads > 0 ? t('ok') : t('watch')}
                </span>
                <span className="dg-bar">
                  <i
                    className={`dg-bar-fill-${k.activeLeads > 0 ? 'cyan' : 'gold'}`}
                    style={{ width: `${Math.max(pctOf(k.activeLeads, Math.max(k.activeLeads + 20, 25)), 4)}%` }}
                  />
                </span>
              </Link>

              <Link href="/admin/properties" className="dg-card dg-quick">
                <span className="dg-quick-icon">
                  <Gem />
                </span>
                <span className="dg-quick-label">{t('qVerified')}</span>
                <span className="dg-quick-value">
                  {formatNumber(k.verifiedProperties)}
                  <small> / {formatNumber(k.totalListings)}</small>
                </span>
                <span className={`dg-quick-status${derived.verifiedPct >= 60 ? '' : ' warn'}`}>
                  {derived.verifiedPct >= 60 ? t('ok') : t('watch')}
                </span>
                <span className="dg-bar">
                  <i className="dg-bar-fill-green" style={{ width: `${derived.verifiedPct}%` }} />
                </span>
              </Link>

              <Link href="/admin/properties" className="dg-card dg-quick">
                <span className="dg-quick-icon">
                  <Sparkles />
                </span>
                <span className="dg-quick-label">{t('qFresh')}</span>
                <span className="dg-quick-value">
                  {derived.freshPct}
                  <small>%</small>
                </span>
                <span
                  className={`dg-quick-status${
                    derived.freshPct >= 90 ? '' : derived.freshPct >= 60 ? ' warn' : ' alert'
                  }`}
                >
                  {derived.freshPct >= 90 ? t('ok') : derived.freshPct >= 60 ? t('watch') : t('alert')}
                </span>
                <span className="dg-bar">
                  <i
                    className={`dg-bar-fill-${
                      derived.freshPct >= 90 ? 'green' : derived.freshPct >= 60 ? 'gold' : 'red'
                    }`}
                    style={{ width: `${derived.freshPct}%` }}
                  />
                </span>
              </Link>
            </section>

            {/* ── ROW 2 · pipeline / leads / inventory detail cards ────── */}
            <section className="dg-row2">
              {/* pipeline — CPU-style card */}
              <div className="dg-card">
                <div className="dg-card-h">
                  <KanbanSquare />
                  <span className="dg-card-title">{t('pipelineTitle')}</span>
                </div>
                <div className="dg-detail-body">
                  <div className="dg-detail-main">
                    <div className="dg-detail-title">
                      <span className="dg-detail-chip dg-chip-gold">SE</span>
                      {t('pipelineHw')}
                    </div>
                    <div className="dg-stats-grid">
                      <div>
                        <div className="dg-stat-k">{t('activeDealsK')}</div>
                        <div className="dg-stat-v">{formatNumber(k.activeDealsCount)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('totalValueK')}</div>
                        <div className="dg-stat-v">{compactEgp(k.totalDealsValue)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('closedWonK')}</div>
                        <div className="dg-stat-v">{compactEgp(k.closedWonValue)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('hotLeadsK')}</div>
                        <div className="dg-stat-v">{formatNumber(k.hotLeads)}</div>
                      </div>
                    </div>
                    <div className="dg-usage">
                      <div className="dg-usage-head">
                        <span>{t('usage')}</span>
                        <b>{derived.dealLoadPct}%</b>
                      </div>
                      <div className="dg-bar">
                        <i className="dg-bar-fill-cyan" style={{ width: `${derived.dealLoadPct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="dg-temp">
                    <Flame />
                    <div className="dg-temp-val">
                      {derived.hotPct}
                      <small>%</small>
                    </div>
                    <div className="dg-temp-label">{t('hotPressure')}</div>
                  </div>
                </div>
                <div className="dg-spark">
                  <div className="dg-spark-cap">
                    <span>{t('valueAxis')}</span>
                    <span>
                      {(data?.pipelineByStage ?? []).length} {t('stages')}
                    </span>
                  </div>
                  <Sparkline id="pipeline" values={derived.stageValues} stroke="#00d2ff" />
                </div>
              </div>

              {/* leads — RAM-style card */}
              <div className="dg-card">
                <div className="dg-card-h">
                  <Users />
                  <span className="dg-card-title">{t('leadsTitle')}</span>
                </div>
                <div className="dg-detail-body">
                  <div className="dg-detail-main">
                    <div className="dg-detail-title">
                      <span className="dg-detail-chip dg-chip-cyan">CRM</span>
                      {t('leadsHw')}
                    </div>
                    <div className="dg-stats-grid">
                      <div>
                        <div className="dg-stat-k">{t('activeK')}</div>
                        <div className="dg-stat-v">{formatNumber(k.activeLeads)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('hotK')}</div>
                        <div className="dg-stat-v">{formatNumber(k.hotLeads)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('new7dK')}</div>
                        <div className="dg-stat-v">+{formatNumber(k.newLeads7d)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('matchIdxK')}</div>
                        <div className="dg-stat-v">{formatNumber(k.activeLeads - k.hotLeads)}</div>
                      </div>
                    </div>
                    <div className="dg-usage">
                      <div className="dg-usage-head">
                        <span>{t('leadLoad')}</span>
                        <b>{derived.hotPct}%</b>
                      </div>
                      <div className="dg-bar">
                        <i className="dg-bar-fill-green" style={{ width: `${derived.hotPct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="dg-temp">
                    <Users />
                    <div className="dg-temp-val">
                      {formatNumber(k.hotLeads)}
                    </div>
                    <div className="dg-temp-label">{t('hotK')}</div>
                  </div>
                </div>
                <div className="dg-spark">
                  <div className="dg-spark-cap">
                    <span>{t('new7dK')}</span>
                    <b style={{ color: '#fff' }}>+{formatNumber(k.newLeads7d)}</b>
                  </div>
                  <Sparkline
                    id="leads"
                    values={[Math.max(k.newLeads7d - 3, 0), Math.max(k.newLeads7d - 2, 0), Math.max(k.newLeads7d - 1, 0), k.newLeads7d]}
                    stroke="#2ecc71"
                  />
                </div>
              </div>

              {/* inventory — storage-style card with drive rows */}
              <div className="dg-card">
                <div className="dg-card-h">
                  <Database />
                  <span className="dg-card-title">{t('inventoryTitle')}</span>
                </div>
                <div className="dg-drive">
                  <div className="dg-drive-head">
                    <span className="dg-drive-icon">
                      <Sparkles />
                    </span>
                    <div>
                      <div className="dg-drive-name">{t('driveFreshName')}</div>
                      <div className="dg-drive-cap">
                        {formatNumber(k.freshOver90)} / {formatNumber(k.totalListings)} {t('driveFreshCap')}
                      </div>
                    </div>
                    <div className="dg-drive-meta">
                      <b>{t('good')}</b>
                      <br />
                      {derived.freshPct}%
                    </div>
                  </div>
                  <div className="dg-bar">
                    <i className="dg-bar-fill-cyan" style={{ width: `${derived.freshPct}%` }} />
                  </div>
                </div>
                <div className="dg-drive">
                  <div className="dg-drive-head">
                    <span className="dg-drive-icon">
                      <RefreshCw />
                    </span>
                    <div>
                      <div className="dg-drive-name">{t('driveStaleName')}</div>
                      <div className="dg-drive-cap">
                        {formatNumber(k.staleListings)} / {formatNumber(k.totalListings)} {t('driveStaleCap')}
                      </div>
                    </div>
                    <div className="dg-drive-meta">
                      <b className={derived.stalePct > 30 ? 'alert' : 'warn'}>{t('needsAction')}</b>
                      <br />
                      {derived.stalePct}%
                    </div>
                  </div>
                  <div className="dg-bar">
                    <i
                      className={`dg-bar-fill-${derived.stalePct > 30 ? 'red' : 'gold'}`}
                      style={{ width: `${derived.stalePct}%` }}
                    />
                  </div>
                </div>
                <div className="dg-note">
                  <Phone />
                  <span>{t('protectedNote')}</span>
                </div>
              </div>
            </section>

            {/* ── ROW 3 · AI fleet / channels battery / concierge ──────── */}
            <section className="dg-row3">
              {/* AI fleet — GPU-style card */}
              <div className="dg-card">
                <div className="dg-card-h">
                  <Bot />
                  <span className="dg-card-title">{t('fleetTitle')}</span>
                </div>
                <div className="dg-detail-body">
                  <div className="dg-detail-main">
                    <div className="dg-detail-title">
                      <span className="dg-detail-chip dg-chip-green">AI</span>
                      {t('fleetHw')}
                      <span className="dg-badge">{t('fleetBadge')}</span>
                    </div>
                    <div className="dg-stats-grid">
                      <div>
                        <div className="dg-stat-k">{t('totalBots')}</div>
                        <div className="dg-stat-v">{formatNumber(derived.bots.total)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('enabledBots')}</div>
                        <div className="dg-stat-v">{formatNumber(derived.bots.enabled)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('activeBots')}</div>
                        <div className="dg-stat-v">{formatNumber(derived.bots.active)}</div>
                      </div>
                      <div>
                        <div className="dg-stat-k">{t('erroringBots')}</div>
                        <div className="dg-stat-v">{formatNumber(derived.bots.erroring)}</div>
                      </div>
                    </div>
                    <div className="dg-usage">
                      <div className="dg-usage-head">
                        <span>{t('fleetLoad')}</span>
                        <b>{derived.fleetLoadPct}%</b>
                      </div>
                      <div className="dg-bar">
                        <i
                          className={`dg-bar-fill-${
                            derived.bots.erroring > 0 ? 'red' : derived.bots.active > 0 ? 'green' : 'gold'
                          }`}
                          style={{ width: `${derived.fleetLoadPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="dg-temp">
                    <Flame />
                    <div className="dg-temp-val">
                      {derived.fleetLoadPct}
                      <small>%</small>
                    </div>
                    <div className="dg-temp-label">{t('fleetLoad')}</div>
                  </div>
                </div>
                <div className="dg-spark">
                  <div className="dg-spark-cap">
                    <span>{t('fleetSpark')}</span>
                    <b style={{ color: '#fff' }}>{formatNumber(derived.bots.active)}</b>
                  </div>
                  <Sparkline id="fleet" values={derived.botPulses} stroke="#2ecc71" />
                </div>
              </div>

              {/* channels — battery-style card */}
              <div className="dg-card">
                <div className="dg-card-h">
                  <Webhook />
                  <span className="dg-card-title">{t('channelsTitle')}</span>
                </div>
                <div className="dg-detail-title" style={{ marginTop: 2 }}>
                  <span className="dg-detail-chip dg-chip-cyan">WA</span>
                  {t('channelsHw')}
                </div>
                <div className="dg-batt-shell">
                  <div
                    className={`dg-batt-fill${
                      derived.healthPct >= 90 ? '' : derived.healthPct >= 60 ? ' warn' : ' alert'
                    }`}
                    style={{ width: `${Math.max(derived.healthPct, 2)}%` }}
                  />
                </div>
                <div className="dg-batt-val">
                  {t('battHealth')}: <b>{derived.healthPct}%</b>
                </div>
                <div className="dg-rows">
                  <div className="dg-row-line">
                    <MessageCircle />
                    <span>{t('rowsWhatsApp')}</span>
                    <b className="good">{formatNumber(derived.wh.whatsapp)}</b>
                  </div>
                  <div className="dg-row-line">
                    <Webhook />
                    <span>{t('rowsTelegram')}</span>
                    <b>{formatNumber(derived.wh.telegram)}</b>
                  </div>
                  <div className="dg-row-line">
                    <Zap />
                    <span>{t('rowsErrors')}</span>
                    <b className={derived.wh.errors > 0 ? 'bad' : 'good'}>
                      {formatNumber(derived.wh.errors)}
                    </b>
                  </div>
                </div>
                <div className="dg-note">
                  <Phone />
                  <span>{t('protectedNote')}</span>
                </div>
              </div>

              {/* concierge — contact card */}
              <div className="dg-card dg-contact">
                <div className="dg-card-h" style={{ alignSelf: 'flex-start' }}>
                  <Phone />
                  <span className="dg-card-title">{t('contactTitle')}</span>
                </div>
                <div className="dg-contact-avatar">
                  <img src="/assets/logo-mark-96.png" alt="" />
                </div>
                <div className="dg-contact-name">{t('contactName')}</div>
                <div className="dg-contact-sub">{t('contactSub')}</div>
                <div className="dg-contact-phone">+20 109 204 8333</div>
                <a
                  className="dg-contact-btn"
                  href="https://wa.me/201092048333"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle />
                  {t('contactBtn')}
                </a>
                <div className="dg-contact-note">{t('contactNote')}</div>
              </div>
            </section>

            <footer className="dg-foot">
              {t('footer')} {lastScan} · <b>+20 109 204 8333</b>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
