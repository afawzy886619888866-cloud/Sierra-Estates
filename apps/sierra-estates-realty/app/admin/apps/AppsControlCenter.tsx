'use client';
/* cspell:disable */

/**
 * SIERRA ESTATES — APPLICATIONS CONTROL CENTER
 * Standalone admin console at /admin/apps — ITQANE PC Diagnostic layout.
 *
 * One control page for every application in the stack:
 *   • Local runtime  — the 8-line WhatsApp gateway (live probe) and the
 *                      local workflow runner.
 *   • Cloud services — the full AppsDirectoryView catalog rendered in the
 *                      ITQANE card language, with launch actions.
 *
 * Data surfaces:
 *   GET /api/admin/whatsapp/outbox      → live gateway status (local runtime)
 *   GET /api/admin/whatsapp/qr?target=pair-info → mobile pairing portal URL
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APPS_CATALOG } from '../views/AppsDirectoryView';
import '../itqane-console.css';

type Lang = 'en' | 'fr' | 'ar';

const DICT = {
  en: {
    brandSub: 'Applications Control',
    tagline: 'Control › Monitor › Launch',
    taglineSub: 'Your applications, our priority',
    check: 'Check Status',
    lastCheck: 'Last check',
    never: 'never',
    navOverview: 'Overview',
    navLocal: 'Local Runtime',
    navCloud: 'Cloud Applications',
    navWhatsApp: 'WhatsApp Control',
    navBackAdmin: 'Back to Admin',
    navSectionConsole: 'Console',
    navSectionSwitch: 'Switch',
    sideQrCap: 'Scan to open the mobile pairing portal',
    sideQrOffline: 'Gateway offline — QR unavailable',
    sidePhone: '+20 109 204 8333',
    // status cards
    cardGateway: 'WhatsApp Gateway',
    cardLocal: 'Local Runtime',
    cardCloud: 'Cloud Apps',
    cardQueue: 'Queue Pending',
    online: 'ONLINE',
    offline: 'OFFLINE',
    ok: 'OK',
    ofEight: (n: number) => `${n} / 8`,
    none: 'none',
    // local runtime
    localTitle: 'Local Runtime — Owner Workstation',
    localMeta: 'Windows · H:\\Sierra Estates',
    waName: 'WhatsApp 8-Line Gateway',
    waDesc: 'OpenWA multi-session worker and HTTP gateway running on the owner workstation. Eight SIM lines, persistent auth, inbound app-bridge to production.',
    runnerName: 'Workflow Runner',
    runnerDesc: 'Local automation runner (workflows/) executing outreach, intake and digest jobs. Reaches the gateway through WHATSAPP_API_URL; the legacy EC2 box is retired.',
    runnerStatus: 'env-gated',
    port: 'Port',
    repo: 'Repo',
    lines: 'Lines',
    primary: 'Primary',
    endpoint: 'Endpoint',
    tunnel: 'Tunnel',
    noTunnel: 'no tunnel',
    openControl: 'Open Control Center',
    openPortal: 'Mobile Pairing Portal',
    openRunner: 'Open Automations',
    launch: 'Launch',
    // cloud grid
    cloudTitle: 'Cloud Applications',
    cloudMeta: `${APPS_CATALOG.length} services`,
    // contact
    contactTitle: 'Contact us',
    contactNote: 'Tap the logo to open the Sierra Estates portal',
    contactBtn: 'Chat on WhatsApp',
    // footer
    footVer: 'Sierra Estates Apps Control v1.0.0',
    footB1: 'Live status',
    footB2: 'Local + cloud',
    footB3: 'One console',
    footB4: 'Admin-guarded',
  },
  fr: {
    brandSub: 'Contrôle des applications',
    tagline: 'Contrôler › Surveiller › Lancer',
    taglineSub: 'Vos applications, notre priorité',
    check: 'Vérifier l’état',
    lastCheck: 'Dernière vérif.',
    never: 'jamais',
    navOverview: 'Vue générale',
    navLocal: 'Exécution locale',
    navCloud: 'Applications cloud',
    navWhatsApp: 'Contrôle WhatsApp',
    navBackAdmin: 'Retour à l’admin',
    navSectionConsole: 'Console',
    navSectionSwitch: 'Navigation',
    sideQrCap: 'Scannez pour ouvrir le portail mobile d’appairage',
    sideQrOffline: 'Passerelle hors ligne — QR indisponible',
    sidePhone: '+20 109 204 8333',
    cardGateway: 'Passerelle WhatsApp',
    cardLocal: 'Exécution locale',
    cardCloud: 'Apps cloud',
    cardQueue: 'File d’attente',
    online: 'EN LIGNE',
    offline: 'HORS LIGNE',
    ok: 'OK',
    ofEight: (n: number) => `${n} / 8`,
    none: 'aucun',
    localTitle: 'Exécution locale — Poste propriétaire',
    localMeta: 'Windows · H:\\Sierra Estates',
    waName: 'Passerelle WhatsApp 8 lignes',
    waDesc: 'Worker multi-sessions OpenWA et passerelle HTTP sur le poste du propriétaire. Huit lignes SIM, auth persistante, pont applicatif vers la production.',
    runnerName: 'Exécuteur de workflows',
    runnerDesc: 'Runner local (workflows/) exécutant prospection, intake et digests. Rejoint la passerelle via WHATSAPP_API_URL ; la box EC2 est retirée.',
    runnerStatus: 'env-gated',
    port: 'Port',
    repo: 'Dépôt',
    lines: 'Lignes',
    primary: 'Principale',
    endpoint: 'Point d’accès',
    tunnel: 'Tunnel',
    noTunnel: 'pas de tunnel',
    openControl: 'Ouvrir le centre de contrôle',
    openPortal: 'Portail mobile d’appairage',
    openRunner: 'Ouvrir les automatisations',
    launch: 'Lancer',
    cloudTitle: 'Applications cloud',
    cloudMeta: `${APPS_CATALOG.length} services`,
    contactTitle: 'Contactez-nous',
    contactNote: 'Touchez le logo pour ouvrir le portail Sierra Estates',
    contactBtn: 'Discuter sur WhatsApp',
    footVer: 'Sierra Estates Contrôle Apps v1.0.0',
    footB1: 'État en direct',
    footB2: 'Local + cloud',
    footB3: 'Une seule console',
    footB4: 'Accès admin protégé',
  },
  ar: {
    brandSub: 'تحكم التطبيقات',
    tagline: 'تحكّم › راقب › شغّل',
    taglineSub: 'تطبيقاتك أولويتنا',
    check: 'فحص الحالة',
    lastCheck: 'آخر فحص',
    never: 'أبدًا',
    navOverview: 'النظرة العامة',
    navLocal: 'التشغيل المحلي',
    navCloud: 'تطبيقات السحابة',
    navWhatsApp: 'تحكم الواتساب',
    navBackAdmin: 'العودة للإدارة',
    navSectionConsole: 'الوحدة',
    navSectionSwitch: 'تنقّل',
    sideQrCap: 'امسح الكود لفتح بوابة الربط على الموبايل',
    sideQrOffline: 'البوابة غير متصلة — الكود غير متاح',
    sidePhone: '+20 109 204 8333',
    cardGateway: 'بوابة الواتساب',
    cardLocal: 'التشغيل المحلي',
    cardCloud: 'تطبيقات السحابة',
    cardQueue: 'في الطابور',
    online: 'متصل',
    offline: 'غير متصل',
    ok: 'سليم',
    ofEight: (n: number) => `${n} / 8`,
    none: 'لا شيء',
    localTitle: 'التشغيل المحلي — جهاز المالك',
    localMeta: 'Windows · H:\\Sierra Estates',
    waName: 'بوابة واتساب 8 خطوط',
    waDesc: 'عامل OpenWA متعدد الجلسات وبوابة HTTP على جهاز المالك. ثمانية خطوط شريحة، مصادقة دائمة، وجسر تطبيقي نحو الإنتاج.',
    runnerName: 'منفذ سير العمل',
    runnerDesc: 'منفذ محلي (workflows/) يشغّل الاستقطاب والاستقبال والملخصات. يتصل بالبوابة عبر WHATSAPP_API_URL؛ وخادم EC2 القديم أُحيل للتقاعد.',
    runnerStatus: 'مُقيّد بالبيئة',
    port: 'المنفذ',
    repo: 'المستودع',
    lines: 'الخطوط',
    primary: 'الرئيسي',
    endpoint: 'العنوان',
    tunnel: 'النفق',
    noTunnel: 'لا نفق',
    openControl: 'افتح مركز التحكم',
    openPortal: 'بوابة الربط للموبايل',
    openRunner: 'افتح الأتمتة',
    launch: 'تشغيل',
    cloudTitle: 'تطبيقات السحابة',
    cloudMeta: `${APPS_CATALOG.length} خدمة`,
    contactTitle: 'تواصل معنا',
    contactNote: 'اضغط الشعار لفتح بوابة سييرا إستيتس',
    contactBtn: 'تحدث عبر واتساب',
    footVer: 'سييرا إستيتس تحكم التطبيقات v1.0.0',
    footB1: 'حالة حية',
    footB2: 'محلي + سحابي',
    footB3: 'وحدة واحدة',
    footB4: 'محمي بصلاحيات الإدارة',
  },
} as const;

const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const SECTIONS = ['overview', 'local', 'cloud'] as const;
type Section = (typeof SECTIONS)[number];

interface GatewaySession {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
}

interface GatewayInfo {
  reachable: boolean;
  endpoint?: string;
  tunnelUrl?: string | null;
  sessions?: GatewaySession[];
  activeSessions?: number;
  totalSessions?: number;
}

function fmtPhone(raw?: string | null): string {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('20') && d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  if (d.length >= 10) return `+${d}`;
  return d;
}

export default function AppsControlCenter() {
  const [lang, setLang] = useState<Lang>('en');
  const [section, setSection] = useState<Section>('overview');
  const [gateway, setGateway] = useState<GatewayInfo | null>(null);
  const [queued, setQueued] = useState(0);
  const [lastCheck, setLastCheck] = useState('');
  const [checking, setChecking] = useState(false);
  const [clock, setClock] = useState('--:--');
  const [pairUrl, setPairUrl] = useState<string | null>(null);

  const t = DICT[lang];
  const isAr = lang === 'ar';

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('iq_apps_lang') : null;
    if (saved === 'en' || saved === 'fr' || saved === 'ar') setLang(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('iq_apps_lang', lang);
  }, [lang]);

  useEffect(() => {
    const tick = () => {
      try {
        setClock(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date()));
      } catch {
        setClock(new Date().toLocaleTimeString());
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const poll = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const res = await fetch('/api/admin/whatsapp/outbox?limit=1', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        setGateway(json.gateway || null);
        setQueued(Number(json.stats?.queued || 0));
        setLastCheck(new Date().toLocaleTimeString());
      }
    } catch { /* next poll retries */ } finally {
      if (!silent) setChecking(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') poll(true);
    }, 20000);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/whatsapp/qr?target=pair-info', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!cancelled && json && json.success && json.pairUrl) setPairUrl(String(json.pairUrl));
      } catch { /* ignore */ }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const reachable = Boolean(gateway?.reachable);
  const readyCount = reachable ? (gateway?.activeSessions ?? gateway?.sessions?.filter((s) => s.status === 'ready').length ?? 0) : 0;
  const primary = useMemo(() => {
    const s = gateway?.sessions || [];
    return s.find((x) => x.status === 'ready') || null;
  }, [gateway]);

  const cloudOnline = APPS_CATALOG.filter((a) => a.status === 'online').length;

  const goSection = (s: Section) => {
    setSection(s);
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`iq-sec-${s}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const launch = (actionType: string, actionTarget: string) => {
    if (actionType === 'external') window.open(actionTarget, '_blank');
    else window.open('/admin', '_self');
  };

  return (
    <div className="iq-root" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="iq-shell">
        {/* ══════════ SIDEBAR ══════════ */}
        <aside className="iq-sidebar">
          <div className="iq-brand">
            <div className="iq-brand-logo">SE</div>
            <div>
              <div className="iq-brand-name">SIERRA ESTATES</div>
              <div className="iq-brand-sub">{t.brandSub}</div>
            </div>
          </div>

          <nav className="iq-nav">
            <div className="iq-nav-label">{t.navSectionConsole}</div>
            <button className={`iq-nav-item ${section === 'overview' ? 'is-active' : ''}`} onClick={() => goSection('overview')}>
              <span className="iq-nav-ic">📊</span><span>{t.navOverview}</span>
            </button>
            <button className={`iq-nav-item ${section === 'local' ? 'is-active' : ''}`} onClick={() => goSection('local')}>
              <span className="iq-nav-ic">🖥️</span><span>{t.navLocal}</span>
              <span className={`iq-nav-badge ${reachable ? '' : 'is-bad'}`}>{readyCount}/8</span>
            </button>
            <button className={`iq-nav-item ${section === 'cloud' ? 'is-active' : ''}`} onClick={() => goSection('cloud')}>
              <span className="iq-nav-ic">☁️</span><span>{t.navCloud}</span>
            </button>

            <div className="iq-nav-label">{t.navSectionSwitch}</div>
            <button className="iq-nav-item" onClick={() => window.open('/admin/whatsapp', '_self')}>
              <span className="iq-nav-ic">💬</span><span>{t.navWhatsApp}</span>
            </button>
            <button className="iq-nav-item" onClick={() => window.open('/admin', '_self')}>
              <span className="iq-nav-ic">🎛️</span><span>{t.navBackAdmin}</span>
            </button>
          </nav>

          <div className="iq-side-foot">
            {reachable ? (
              <div className="iq-side-qr" title={pairUrl || '/pair'} onClick={() => pairUrl && window.open(pairUrl, '_blank')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/api/admin/whatsapp/qr?target=pair-link" alt="pair portal QR" />
              </div>
            ) : (
              <div className="iq-side-qr is-empty">{t.sideQrOffline}</div>
            )}
            <div className="iq-side-cap">{t.sideQrCap}</div>
            <div className="iq-side-phone">📞 {t.sidePhone}</div>
          </div>
        </aside>

        {/* ══════════ MAIN ══════════ */}
        <div className="iq-main">
          <header className="iq-header">
            <div className="iq-header-title">
              <h1>
                {isAr ? (
                  <>{t.tagline}</>
                ) : (
                  <>
                    Control<span className="iq-sep">›</span>Monitor<span className="iq-sep">›</span>Launch
                  </>
                )}
              </h1>
              <p>{t.taglineSub}</p>
            </div>

            <div className="iq-scan-widget" onClick={() => poll()} role="button" tabIndex={0}>
              <div className={`iq-scan-check ${reachable ? '' : 'is-bad'}`}>{reachable ? '✓' : '!'}</div>
              <div>
                <div className="iq-scan-main">{checking ? '…' : t.check}</div>
                <div className="iq-scan-sub">{t.lastCheck}: {lastCheck || t.never}</div>
              </div>
            </div>

            <div className="iq-langs">
              {LANGS.map((l) => (
                <button key={l.key} className={`iq-lang-btn ${lang === l.key ? 'is-active' : ''}`} onClick={() => setLang(l.key)}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </header>

          <div className="iq-content">
            {/* ══ status cards ══ */}
            <section id="iq-sec-overview" className="iq-row r-4">
              <div className="iq-statcard">
                <div className="iq-stat-ic">💬</div>
                <div className="iq-stat-label">{t.cardGateway}</div>
                <div className="iq-stat-value">{readyCount}<small> / 8</small></div>
                <div className={`iq-stat-ok ${reachable ? 'ok' : 'bad'}`}>{reachable ? `✓ ${t.online}` : t.offline}</div>
                <div className="iq-bar"><div className={`iq-bar-fill ${readyCount > 0 ? 'ok' : 'bad'}`} style={{ width: `${Math.round((readyCount / 8) * 100)}%` }} /></div>
              </div>
              <div className="iq-statcard">
                <div className="iq-stat-ic">🖥️</div>
                <div className="iq-stat-label">{t.cardLocal}</div>
                <div className="iq-stat-value">2</div>
                <div className={`iq-stat-ok ${reachable ? 'ok' : 'warn'}`}>{reachable ? `✓ ${t.ok}` : t.offline}</div>
                <div className="iq-bar"><div className={`iq-bar-fill ${reachable ? 'ok' : 'warn'}`} style={{ width: reachable ? '100%' : '50%' }} /></div>
              </div>
              <div className="iq-statcard">
                <div className="iq-stat-ic">☁️</div>
                <div className="iq-stat-label">{t.cardCloud}</div>
                <div className="iq-stat-value">{cloudOnline}<small> / {APPS_CATALOG.length}</small></div>
                <div className="iq-stat-ok ok">✓ {t.online}</div>
                <div className="iq-bar"><div className="iq-bar-fill cyan" style={{ width: `${Math.round((cloudOnline / APPS_CATALOG.length) * 100)}%` }} /></div>
              </div>
              <div className="iq-statcard">
                <div className="iq-stat-ic">⏳</div>
                <div className="iq-stat-label">{t.cardQueue}</div>
                <div className="iq-stat-value">{queued}</div>
                <div className={`iq-stat-ok ${queued === 0 ? 'ok' : 'warn'}`}>{queued === 0 ? `✓ ${t.none}` : `${queued}`}</div>
                <div className="iq-bar"><div className={`iq-bar-fill ${queued === 0 ? 'ok' : 'gold'}`} style={{ width: `${Math.min(100, queued * 10)}%` }} /></div>
              </div>
            </section>

            {/* ══ local runtime + contact ══ */}
            <section id="iq-sec-local" className="iq-row r-2a">
              <div className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">🖥️</span>
                    <span className="iq-panel-title">{t.localTitle}</span>
                    <span className="iq-panel-meta">{t.localMeta}</span>
                  </div>
                  <div className="iq-panel-bd">
                    <div className="iq-row r-2b">
                      {/* WhatsApp gateway card */}
                      <div className="iq-line" style={{ cursor: 'default' }}>
                        <div className="iq-line-hd">
                          <span className="iq-line-name">{t.waName}</span>
                          <span className="iq-chip gold">:2785</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--iq-dim)', lineHeight: 1.6, margin: 0 }}>{t.waDesc}</p>
                        <dl className="iq-kv">
                          <dt>{t.endpoint}</dt>
                          <dd className="iq-mono">{gateway?.endpoint || '127.0.0.1:2785'}</dd>
                          <dt>{t.tunnel}</dt>
                          <dd className="iq-mono">{gateway?.tunnelUrl || t.noTunnel}</dd>
                          <dt>{t.lines}</dt>
                          <dd className="iq-mono">{t.ofEight(readyCount)}</dd>
                          <dt>{t.primary}</dt>
                          <dd className="iq-mono">{primary ? `${primary.id} · ${fmtPhone(primary.phone)}` : '—'}</dd>
                        </dl>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className={`iq-chip ${reachable ? 'ok' : 'bad'}`}>
                            <span className={`iq-dot ${reachable ? 'ok' : 'bad'}`} />
                            {reachable ? t.online : t.offline}
                          </span>
                          <span className="iq-chip">OpenWA</span>
                          <span className="iq-chip">app-bridge</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="iq-btn iq-btn-gold iq-btn-sm" onClick={() => window.open('/admin/whatsapp', '_self')}>
                            💬 {t.openControl}
                          </button>
                          {pairUrl && (
                            <button className="iq-btn iq-btn-green iq-btn-sm" onClick={() => window.open(pairUrl, '_blank')}>
                              📱 {t.openPortal}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Workflow runner card */}
                      <div className="iq-line" style={{ cursor: 'default' }}>
                        <div className="iq-line-hd">
                          <span className="iq-line-name">{t.runnerName}</span>
                          <span className="iq-chip gold">:2786</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--iq-dim)', lineHeight: 1.6, margin: 0 }}>{t.runnerDesc}</p>
                        <dl className="iq-kv">
                          <dt>{t.port}</dt>
                          <dd className="iq-mono">2786 (local)</dd>
                          <dt>{t.repo}</dt>
                          <dd className="iq-mono">workflows/</dd>
                          <dt>API</dt>
                          <dd className="iq-mono">WORKFLOW_OPS_URL</dd>
                        </dl>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className="iq-chip warn">{t.runnerStatus}</span>
                          <span className="iq-chip">EC2 retired</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="iq-btn iq-btn-ghost iq-btn-sm" onClick={() => window.open('/admin', '_self')}>
                            ⚡ {t.openRunner}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* contact */}
              <div className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">☎️</span>
                    <span className="iq-panel-title">{t.contactTitle}</span>
                  </div>
                  <div className="iq-panel-bd">
                    <div className="iq-contact">
                      <div className="iq-contact-logo" onClick={() => window.open('/', '_blank')} role="button" tabIndex={0}>SE</div>
                      <div className="iq-contact-note">{t.contactNote}</div>
                      <div className="iq-contact-phone">📞 {t.sidePhone}</div>
                      <button className="iq-btn iq-btn-green" style={{ width: '100%' }} onClick={() => window.open('https://wa.me/201092048333', '_blank')}>
                        <span style={{ fontSize: 15 }}>💬</span> {t.contactBtn}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ cloud applications ══ */}
            <section id="iq-sec-cloud">
              <div className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">☁️</span>
                    <span className="iq-panel-title">{t.cloudTitle}</span>
                    <span className="iq-panel-meta">{t.cloudMeta}</span>
                  </div>
                  <div className="iq-panel-bd">
                    <div className="iq-row r-lines">
                      {APPS_CATALOG.map((app) => (
                        <div key={app.id} className="iq-line" style={{ cursor: 'default' }}>
                          <div className="iq-line-hd">
                            <span style={{ fontSize: 20 }}>{app.icon}</span>
                            <span className="iq-line-name" style={{ fontSize: 11.5 }}>{isAr ? app.name.ar : app.name.en}</span>
                          </div>
                          <p style={{ fontSize: 10, color: 'var(--iq-dim)', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {isAr ? app.description.ar : app.description.en}
                          </p>
                          <div className="iq-line-foot">
                            <span className={`iq-chip ${app.status === 'online' ? 'ok' : 'warn'}`}>
                              <span className={`iq-dot ${app.status === 'online' ? 'ok' : 'warn'}`} />
                              {app.port || app.status}
                            </span>
                            {app.badge && <span className="iq-chip gold">{app.badge}</span>}
                          </div>
                          <button className="iq-btn iq-btn-ghost iq-btn-sm" style={{ width: '100%' }} onClick={() => launch(app.actionType, app.actionTarget)}>
                            {t.launch} {app.actionType === 'external' ? '↗' : '→'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <footer className="iq-footer">
            <span className="iq-foot-ver">{t.footVer}</span>
            <span className="iq-foot-badges">
              <span className="iq-foot-badge"><span className={`iq-dot ${reachable ? 'ok' : 'bad'}`} /> {t.footB1}</span>
              <span className="iq-foot-badge">🖥️ {t.footB2}</span>
              <span className="iq-foot-badge">🧩 {t.footB3}</span>
              <span className="iq-foot-badge">🛡 {t.footB4}</span>
            </span>
            <span className="iq-foot-clock">🕰 {clock}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
