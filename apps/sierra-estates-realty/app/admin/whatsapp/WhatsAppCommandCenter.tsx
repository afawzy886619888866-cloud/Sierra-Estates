'use client';
/* cspell:disable */

/**
 * SIERRA ESTATES — WHATSAPP COMMAND CENTER
 * Standalone admin console at /admin/whatsapp — ITQANE PC Diagnostic layout
 * (deep navy canvas, gold-gradient panels, sidebar rail, vertical status
 * cards, footer status bar, EN/FR/AR switcher).
 *
 * Data surfaces:
 *   GET  /api/admin/whatsapp/outbox        → gateway status, queue stats, jobs
 *   GET  /api/admin/whatsapp/qr?line=N     → live pairing QR for one line
 *   GET  /api/admin/whatsapp/qr?target=…   → /pair portal info + link QR
 *   POST /api/admin/whatsapp/direct-send   → instant dispatch via gateway
 *   POST /api/admin/whatsapp/schedule      → queued / scheduled dispatch
 *   POST /api/admin/whatsapp/outbox        → drain / retry / cancel / restart
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../itqane-console.css';

type Lang = 'en' | 'fr' | 'ar';

/* ─────────────────────────────────────────────────────────────────────────
   i18n — EN · FR · AR (the reference app ships the same three switches)
   ───────────────────────────────────────────────────────────────────────── */
const DICT = {
  en: {
    brandSub: 'WhatsApp Operations',
    tagline: 'Send › Track › Deliver',
    taglineSub: 'Your lines, our priority',
    check: 'Check Gateway',
    lastCheck: 'Last check',
    never: 'never',
    // sidebar
    navOverview: 'Overview',
    navLines: 'SIM Lines',
    navPairing: 'QR Pairing',
    navComposer: 'Message Composer',
    navOutbox: 'Outbox & Queue',
    navApps: 'Applications',
    navBackAdmin: 'Back to Admin',
    navSectionConsole: 'Console',
    navSectionOps: 'Operations',
    navSectionSwitch: 'Switch',
    sideQrCap: 'Scan to open the mobile pairing portal',
    sideQrOffline: 'Gateway offline — QR unavailable',
    sidePhone: '+20 109 204 8333',
    // status cards
    cardActive: 'Active Lines',
    cardQueued: 'Queued',
    cardSentToday: 'Sent Today',
    cardFailed: 'Failed',
    ofEight: (n: number) => `${n} / 8`,
    ok: 'OK',
    offline: 'OFFLINE',
    none: 'none',
    // gateway info
    gwTitle: 'Gateway Information',
    gwEndpoint: 'Endpoint',
    gwTunnel: 'Tunnel',
    gwProvider: 'Provider',
    gwLines: 'Lines ready',
    gwBridge: 'App bridge',
    gwPrimary: 'Primary line',
    gwLastActive: 'Last activity',
    gwCairo: 'Cairo time',
    gwNoTunnel: 'no tunnel',
    gwChartTitle: 'Send activity',
    gwChartSub: 'last 15 min · one point per probe',
    gwChartIdle: 'idle — no messages dispatched in the window',
    linesGauge: 'Line health',
    linesGaugeSub: (n: number) => `${n} of 8 lines READY`,
    osName: '8-Line Gateway',
    osOk: 'System OK',
    osSub: 'All paired lines are running normally',
    osDown: 'Gateway Offline',
    osDownSub: 'Start the local worker on port 2785',
    // line wall
    linesTitle: 'SIM Lines — Live Wall',
    linesMeta: 'line-1 … line-8',
    lineReady: 'READY',
    lineAwait: 'SCAN QR',
    lineStarting: 'STARTING',
    lineError: 'ERROR',
    lineUnknown: 'UNKNOWN',
    noPhone: 'not paired',
    sent: (n: number) => `${n} sent`,
    engineOn: 'engine on',
    engineOff: 'engine off',
    btnPair: 'Pair',
    btnRestart: 'Restart',
    // pairing panel
    pairTitle: 'QR Pairing',
    pairSelectLine: 'Select a line to pair',
    pairHint: 'Open WhatsApp on the phone → Linked Devices → Link a Device → scan this code. The QR refreshes automatically every few seconds.',
    pairWaiting: 'Waiting for the gateway to produce a QR code…',
    pairReadyLine: 'This line is already paired',
    pairPhone: (p: string) => `Paired as ${p}`,
    openPortal: 'Open mobile portal',
    // composer
    compTitle: 'Message Composer',
    compInstant: 'Instant',
    compScheduled: 'Scheduled',
    compLine: 'Dispatch line',
    compAuto: 'Auto (round-robin)',
    compRecipients: 'Recipients',
    compRecHint: 'One phone per line — commas or newlines. Names optional: 201092048333, Ahmed',
    compBody: 'Message',
    compBodyHint: '{{name}} is replaced with each recipient name.',
    compWhen: 'Send at',
    compSend: 'Send Now',
    compQueue: 'Queue Message',
    compGroupGuard: 'Group numbers are blocked automatically (safety guard).',
    // outbox
    outTitle: 'Outbox & Queue',
    outMeta: 'latest jobs',
    outJob: 'Job',
    outTo: 'To',
    outStatus: 'Status',
    outPurpose: 'Purpose',
    outWhen: 'Scheduled',
    outEmpty: 'Queue is empty — nothing pending.',
    outDrain: 'Drain Now',
    outRetry: 'Retry Selected',
    outCancel: 'Cancel Selected',
    outSelected: (n: number) => `${n} selected`,
    // contact
    contactTitle: 'Contact us',
    contactNote: 'Tap the logo to open the Sierra Estates portal',
    contactBtn: 'Chat on WhatsApp',
    // footer
    footVer: 'Sierra Estates WhatsApp Control v1.0.0',
    footB1: 'Live status',
    footB2: '8 SIM lines',
    footB3: 'Direct dispatch',
    footB4: 'Admin-guarded',
    // toasts
    tSent: (n: number, f: number) => `Dispatched ${n} message(s)${f ? `, ${f} failed` : ''}`,
    tQueued: (n: number) => `Queued ${n} message(s)`,
    tDrained: (s: string) => `Queue drained — ${s}`,
    tRestarted: (l: string) => `Restart triggered for ${l}`,
    tRetried: (n: number) => `Requeued ${n} job(s)`,
    tCancelled: (n: number) => `Cancelled ${n} job(s)`,
    tError: 'Request failed — see console',
    tGatewayDown: 'Gateway unreachable — is the local worker running?',
  },
  fr: {
    brandSub: 'Opérations WhatsApp',
    tagline: 'Envoyer › Suivre › Livrer',
    taglineSub: 'Vos lignes, notre priorité',
    check: 'Vérifier la passerelle',
    lastCheck: 'Dernière vérif.',
    never: 'jamais',
    navOverview: 'Vue générale',
    navLines: 'Lignes SIM',
    navPairing: 'Appairage QR',
    navComposer: 'Composeur',
    navOutbox: 'Boîte d’envoi',
    navApps: 'Applications',
    navBackAdmin: 'Retour à l’admin',
    navSectionConsole: 'Console',
    navSectionOps: 'Opérations',
    navSectionSwitch: 'Navigation',
    sideQrCap: 'Scannez pour ouvrir le portail mobile d’appairage',
    sideQrOffline: 'Passerelle hors ligne — QR indisponible',
    sidePhone: '+20 109 204 8333',
    cardActive: 'Lignes actives',
    cardQueued: 'En file',
    cardSentToday: 'Envoyés aujourd’hui',
    cardFailed: 'Échecs',
    ofEight: (n: number) => `${n} / 8`,
    ok: 'OK',
    offline: 'HORS LIGNE',
    none: 'aucun',
    gwTitle: 'Informations passerelle',
    gwEndpoint: 'Point d’accès',
    gwTunnel: 'Tunnel',
    gwProvider: 'Fournisseur',
    gwLines: 'Lignes prêtes',
    gwBridge: 'Pont applicatif',
    gwPrimary: 'Ligne principale',
    gwLastActive: 'Dernière activité',
    gwCairo: 'Heure du Caire',
    gwNoTunnel: 'pas de tunnel',
    gwChartTitle: 'Activité d’envoi',
    gwChartSub: '15 dernières min · un point par sonde',
    gwChartIdle: 'inactif — aucun message envoyé dans la fenêtre',
    linesGauge: 'Santé des lignes',
    linesGaugeSub: (n: number) => `${n} lignes sur 8 PRÊTES`,
    osName: 'Passerelle 8 lignes',
    osOk: 'Système OK',
    osSub: 'Toutes les lignes appairées fonctionnent normalement',
    osDown: 'Passerelle hors ligne',
    osDownSub: 'Démarrez le worker local sur le port 2785',
    linesTitle: 'Lignes SIM — Mur en direct',
    linesMeta: 'line-1 … line-8',
    lineReady: 'PRÊTE',
    lineAwait: 'SCANNER QR',
    lineStarting: 'DÉMARRAGE',
    lineError: 'ERREUR',
    lineUnknown: 'INCONNU',
    noPhone: 'non appairée',
    sent: (n: number) => `${n} envoyés`,
    engineOn: 'moteur actif',
    engineOff: 'moteur inactif',
    btnPair: 'Appairer',
    btnRestart: 'Redémarrer',
    pairTitle: 'Appairage QR',
    pairSelectLine: 'Choisissez une ligne à appairer',
    pairHint: 'Sur le téléphone : WhatsApp › Appareils connectés › Connecter un appareil, puis scannez ce code. Le QR se renouvelle automatiquement.',
    pairWaiting: 'En attente d’un QR de la passerelle…',
    pairReadyLine: 'Cette ligne est déjà appairée',
    pairPhone: (p: string) => `Appairée sous ${p}`,
    openPortal: 'Ouvrir le portail mobile',
    compTitle: 'Composeur de messages',
    compInstant: 'Immédiat',
    compScheduled: 'Programmé',
    compLine: 'Ligne d’envoi',
    compAuto: 'Auto (tourniquet)',
    compRecipients: 'Destinataires',
    compRecHint: 'Un numéro par ligne — virgules ou retours. Nom optionnel : 201092048333, Ahmed',
    compBody: 'Message',
    compBodyHint: '{{name}} est remplacé par le nom de chaque destinataire.',
    compWhen: 'Envoyer à',
    compSend: 'Envoyer',
    compQueue: 'Mettre en file',
    compGroupGuard: 'Les numéros de groupes sont bloqués automatiquement (garde-fou).',
    outTitle: 'Boîte d’envoi & file',
    outMeta: 'derniers messages',
    outJob: 'Message',
    outTo: 'Destinataire',
    outStatus: 'Statut',
    outPurpose: 'Objet',
    outWhen: 'Programmé',
    outEmpty: 'File vide — rien en attente.',
    outDrain: 'Vider la file',
    outRetry: 'Relancer la sélection',
    outCancel: 'Annuler la sélection',
    outSelected: (n: number) => `${n} sélectionné(s)`,
    contactTitle: 'Contactez-nous',
    contactNote: 'Touchez le logo pour ouvrir le portail Sierra Estates',
    contactBtn: 'Discuter sur WhatsApp',
    footVer: 'Sierra Estates Contrôle WhatsApp v1.0.0',
    footB1: 'État en direct',
    footB2: '8 lignes SIM',
    footB3: 'Envoi direct',
    footB4: 'Accès admin protégé',
    tSent: (n: number, f: number) => `${n} message(s) envoyé(s)${f ? `, ${f} en échec` : ''}`,
    tQueued: (n: number) => `${n} message(s) en file`,
    tDrained: (s: string) => `File vidée — ${s}`,
    tRestarted: (l: string) => `Redémarrage lancé pour ${l}`,
    tRetried: (n: number) => `${n} message(s) remis en file`,
    tCancelled: (n: number) => `${n} message(s) annulé(s)`,
    tError: 'Échec de la requête — voir la console',
    tGatewayDown: 'Passerelle injoignable — le worker local tourne-t-il ?',
  },
  ar: {
    brandSub: 'عمليات الواتساب',
    tagline: 'إرسال › تتبع › تسليم',
    taglineSub: 'خطوطك أولويتنا',
    check: 'فحص البوابة',
    lastCheck: 'آخر فحص',
    never: 'أبدًا',
    navOverview: 'النظرة العامة',
    navLines: 'خطوط الشريحة',
    navPairing: 'ربط QR',
    navComposer: 'محرر الرسائل',
    navOutbox: 'الصادر والطابور',
    navApps: 'التطبيقات',
    navBackAdmin: 'العودة للإدارة',
    navSectionConsole: 'الوحدة',
    navSectionOps: 'العمليات',
    navSectionSwitch: 'تنقّل',
    sideQrCap: 'امسح الكود لفتح بوابة الربط على الموبايل',
    sideQrOffline: 'البوابة غير متصلة — الكود غير متاح',
    sidePhone: '+20 109 204 8333',
    cardActive: 'الخطوط النشطة',
    cardQueued: 'في الطابور',
    cardSentToday: 'أُرسلت اليوم',
    cardFailed: 'فشلت',
    ofEight: (n: number) => `${n} / 8`,
    ok: 'سليم',
    offline: 'غير متصل',
    none: 'لا شيء',
    gwTitle: 'بيانات البوابة',
    gwEndpoint: 'العنوان',
    gwTunnel: 'النفق',
    gwProvider: 'المزوّد',
    gwLines: 'خطوط جاهزة',
    gwBridge: 'جسر التطبيق',
    gwPrimary: 'الخط الرئيسي',
    gwLastActive: 'آخر نشاط',
    gwCairo: 'توقيت القاهرة',
    gwNoTunnel: 'لا نفق',
    gwChartTitle: 'نشاط الإرسال',
    gwChartSub: 'آخر ١٥ دقيقة · نقطة لكل فحص',
    gwChartIdle: 'خامل — لا رسائل مُرسلة خلال النافذة',
    linesGauge: 'صحة الخطوط',
    linesGaugeSub: (n: number) => `${n} من ٨ خطوط جاهزة`,
    osName: 'بوابة 8 خطوط',
    osOk: 'النظام سليم',
    osSub: 'جميع الخطوط المرتبطة تعمل بشكل طبيعي',
    osDown: 'البوابة غير متصلة',
    osDownSub: 'شغّل العامل المحلي على المنفذ 2785',
    linesTitle: 'خطوط الشريحة — الجدار الحي',
    linesMeta: 'line-1 … line-8',
    lineReady: 'جاهز',
    lineAwait: 'امسح QR',
    lineStarting: 'يبدأ',
    lineError: 'خطأ',
    lineUnknown: 'مجهول',
    noPhone: 'غير مرتبط',
    sent: (n: number) => `${n} مرسلة`,
    engineOn: 'المحرك يعمل',
    engineOff: 'المحرك متوقف',
    btnPair: 'ربط',
    btnRestart: 'إعادة تشغيل',
    pairTitle: 'ربط QR',
    pairSelectLine: 'اختر خطًا للربط',
    pairHint: 'على الهاتف: واتساب › الأجهزة المرتبطة › ربط جهاز، ثم امسح هذا الكود. يتجدد الكود تلقائيًا كل ثوانٍ.',
    pairWaiting: 'بانتظار صدور كود QR من البوابة…',
    pairReadyLine: 'هذا الخط مرتبط بالفعل',
    pairPhone: (p: string) => `مرتبط بالرقم ${p}`,
    openPortal: 'افتح بوابة الموبايل',
    compTitle: 'محرر الرسائل',
    compInstant: 'فوري',
    compScheduled: 'مجدول',
    compLine: 'خط الإرسال',
    compAuto: 'تلقائي (توزيع دائري)',
    compRecipients: 'المستلمون',
    compRecHint: 'رقم واحد في كل سطر — فواصل أو أسطر. الاسم اختياري: 201092048333, أحمد',
    compBody: 'نص الرسالة',
    compBodyHint: 'يُستبدل {{name}} باسم كل مستلم.',
    compWhen: 'وقت الإرسال',
    compSend: 'أرسل الآن',
    compQueue: 'ضع في الطابور',
    compGroupGuard: 'أرقام المجموعات محجوبة تلقائيًا (حارس السلامة).',
    outTitle: 'الصادر والطابور',
    outMeta: 'أحدث الرسائل',
    outJob: 'الرسالة',
    outTo: 'إلى',
    outStatus: 'الحالة',
    outPurpose: 'الغرض',
    outWhen: 'الموعد',
    outEmpty: 'الطابور فارغ — لا شيء معلّق.',
    outDrain: 'نفّذ الطابور',
    outRetry: 'أعد المحدد',
    outCancel: 'ألغِ المحدد',
    outSelected: (n: number) => `${n} محدد`,
    contactTitle: 'تواصل معنا',
    contactNote: 'اضغط الشعار لفتح بوابة سييرا إستيتس',
    contactBtn: 'تحدث عبر واتساب',
    footVer: 'سييرا إستيتس تحكم الواتساب v1.0.0',
    footB1: 'حالة حية',
    footB2: '8 خطوط شريحة',
    footB3: 'إرسال مباشر',
    footB4: 'محمي بصلاحيات الإدارة',
    tSent: (n: number, f: number) => `تم إرسال ${n} رسالة${f ? ` وفشل ${f}` : ''}`,
    tQueued: (n: number) => `أُضيفت ${n} رسالة إلى الطابور`,
    tDrained: (s: string) => `تم تنفيذ الطابور — ${s}`,
    tRestarted: (l: string) => `بدأت إعادة تشغيل ${l}`,
    tRetried: (n: number) => `أُعيد ${n} رسالة إلى الطابور`,
    tCancelled: (n: number) => `أُلغيت ${n} رسالة`,
    tError: 'فشل الطلب — راجع السجل',
    tGatewayDown: 'البوابة غير قابلة للوصول — هل العامل المحلي يعمل؟',
  },
} as const;

/* ─────────────────────────────────────────────────────────────────────────
   types mirroring the admin API contracts
   ───────────────────────────────────────────────────────────────────────── */
interface GatewaySession {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
  pushName?: string | null;
  lastActive?: string | null;
  engineLoaded?: boolean;
  totalSent?: number;
  hasQr?: boolean;
  error?: string | null;
}

interface GatewayInfo {
  reachable: boolean;
  endpoint?: string;
  tunnelUrl?: string | null;
  status?: string;
  phone?: string;
  pushName?: string;
  lastActive?: string;
  engineLoaded?: boolean;
  sessions?: GatewaySession[];
  activeSessions?: number;
  totalSessions?: number;
  error?: string;
}

interface OutboxStats {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  sentToday: number;
}

interface QueueJob {
  id: string;
  toPhone?: string;
  body?: string;
  status?: string;
  purpose?: string;
  scheduledFor?: string | null;
  createdAt?: string;
  sentAt?: string | null;
  errorMessage?: string | null;
}

const LINE_IDS = ['line-1', 'line-2', 'line-3', 'line-4', 'line-5', 'line-6', 'line-7', 'line-8'];

/* Send-activity waveform window: 60 probes ≈ 15 min at the 15 s poll cadence. */
const ACTIVITY_WINDOW = 60;
const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const SECTIONS = ['overview', 'lines', 'pairing', 'composer', 'outbox'] as const;
type Section = (typeof SECTIONS)[number];

/* ─────────────────────────────────────────────────────────────────────────
   helpers
   ───────────────────────────────────────────────────────────────────────── */
function fmtPhone(raw?: string | null): string {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('20') && d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  if (d.length >= 10) return `+${d}`;
  return d;
}

/* Reference-style circular gauge (the ITQANE battery widget): SVG ring
   filled to pct with a big center number and a small label underneath. */
function LineHealthGauge({ pct, center, label }: { pct: number; center: string; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const color = clamped >= 75 ? 'var(--iq-ok)' : clamped >= 25 ? 'var(--iq-warn)' : 'var(--iq-danger)';
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        direction: 'ltr',
        padding: '4px 10px',
        borderRadius: 10,
        background: 'rgba(56, 189, 248, 0.06)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
      }}
      title={label}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(C * clamped) / 100} ${C}`}
          transform="rotate(-90 32 32)"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.6s ease' }}
        />
        <text x="32" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--iq-text)">
          {center}
        </text>
        <text x="32" y="43" textAnchor="middle" fontSize="7.5" fill="var(--iq-dim)">
          {clamped}%
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--iq-dim)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: 11, fontFamily: 'var(--iq-font-mono)', color: 'var(--iq-text)' }}>{clamped}%</span>
      </div>
    </div>
  );
}

function statusKeyOf(s?: string): 'ready' | 'await' | 'starting' | 'error' | 'unknown' {
  switch (String(s || '')) {
    case 'ready': return 'ready';
    case 'scan_qr': return 'await';
    case 'starting': return 'starting';
    case 'error': return 'error';
    default: return 'unknown';
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   component
   ───────────────────────────────────────────────────────────────────────── */
export default function WhatsAppCommandCenter() {
  const [lang, setLang] = useState<Lang>('en');
  const [section, setSection] = useState<Section>('overview');

  const [gateway, setGateway] = useState<GatewayInfo | null>(null);
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [provider, setProvider] = useState('openwa_multisession');
  const [lastCheck, setLastCheck] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [clock, setClock] = useState('--:--');

  const [pairLine, setPairLine] = useState<string>('line-1');
  const [pairQr, setPairQr] = useState<string | null>(null);
  const [pairStatus, setPairStatus] = useState<string>('unknown');
  const [pairPhone, setPairPhone] = useState<string | null>(null);

  const [pairUrl, setPairUrl] = useState<string | null>(null);
  const [pairLinkTs, setPairLinkTs] = useState<number>(0);

  const [mode, setMode] = useState<'instant' | 'scheduled'>('instant');
  const [sendLine, setSendLine] = useState('auto');
  const [recipients, setRecipients] = useState('');
  const [body, setBody] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [sending, setSending] = useState(false);

  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'bad' | 'info' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* send-activity history for the reference-style waveform chart — one point
     per outbox probe (sent-delta since previous probe), rolling window. */
  const [activity, setActivity] = useState<number[]>([]);
  const prevSentRef = useRef<number | null>(null);
  const chartCanvas = useRef<HTMLCanvasElement | null>(null);

  const t = DICT[lang];
  const isAr = lang === 'ar';

  const showToast = useCallback((text: string, kind: 'ok' | 'bad' | 'info' = 'info') => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  /* language preference + RTL */
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('iq_wa_lang') : null;
    if (saved === 'en' || saved === 'fr' || saved === 'ar') setLang(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('iq_wa_lang', lang);
  }, [lang]);

  /* Cairo clock (footer, reference style) */
  useEffect(() => {
    const tick = () => {
      try {
        setClock(
          new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date()),
        );
      } catch {
        setClock(new Date().toLocaleTimeString());
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  /* outbox poll — gateway status + stats + jobs */
  const pollOutbox = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const res = await fetch('/api/admin/whatsapp/outbox?limit=50', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        setGateway(json.gateway || null);
        setStats(json.stats || null);
        setJobs(Array.isArray(json.jobs) ? json.jobs : []);
        setProvider(String(json.provider || 'openwa_multisession'));
        setLastCheck(new Date().toLocaleTimeString());
        const sentNow = Number(json.stats?.sentToday ?? 0);
        const delta = prevSentRef.current === null ? 0 : Math.max(0, sentNow - prevSentRef.current);
        prevSentRef.current = sentNow;
        setActivity((prev) => [...prev.slice(-(ACTIVITY_WINDOW - 1)), delta]);
      } else if (json && json.gateway) {
        setGateway(json.gateway);
      }
    } catch {
      /* network hiccup — next poll retries */
    } finally {
      if (!silent) setChecking(false);
    }
  }, []);

  useEffect(() => {
    pollOutbox();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') pollOutbox(true);
    }, 15000);
    return () => clearInterval(id);
  }, [pollOutbox]);

  /* draw the send-activity waveform (reference CPU-chart style) whenever a
     new probe lands — cyan line, soft fill, faint horizontal grid. */
  useEffect(() => {
    const cv = chartCanvas.current;
    if (!cv) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const w = cv.clientWidth || 480;
    const h = cv.clientHeight || 64;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // faint grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    for (let gy = h; gy > 0; gy -= h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    const data = activity.slice(-ACTIVITY_WINDOW);
    const max = Math.max(1, ...data);
    const stepX = w / (ACTIVITY_WINDOW - 1);
    const x0 = data.length > 1 ? w - (data.length - 1) * stepX : 0; // right-align when history exists
    const yOf = (v: number) => h - 4 - (v / max) * (h - 10);

    // With fewer than two probes, still draw a flat baseline across the full
    // width — mirrors the reference GPU chart's 0% flat waveform.
    const pts: [number, number][] =
      data.length > 1
        ? data.map((v, i) => [x0 + i * stepX, yOf(v)] as [number, number])
        : (Array.from({ length: ACTIVITY_WINDOW }, (_, i) => [i * stepX, yOf(0)] as [number, number]));

    // soft fill under the line
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
    ctx.beginPath();
    ctx.moveTo(pts[0][0], h);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // crisp waveform
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }, [activity]);

  /* pair portal info */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/whatsapp/qr?target=pair-info', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!cancelled && json && json.success && json.pairUrl) {
          setPairUrl(String(json.pairUrl));
          setPairLinkTs(Date.now());
        }
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  /* pairing QR poll — only while a line is awaiting */
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (!pairLine) return;
      try {
        const res = await fetch(`/api/admin/whatsapp/qr?line=${encodeURIComponent(pairLine)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (json && json.success) {
          setPairQr(json.qrDataUrl || null);
          setPairStatus(String(json.status || 'unknown'));
          setPairPhone(json.phone ? String(json.phone) : null);
        } else {
          setPairQr(null);
          setPairStatus('offline');
          setPairPhone(null);
        }
      } catch {
        if (!cancelled) setPairStatus('offline');
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [pairLine]);

  /* derived */
  const sessions = useMemo<GatewaySession[]>(() => (gateway?.sessions || []), [gateway]);
  const byId = useMemo(() => {
    const m = new Map<string, GatewaySession>();
    for (const s of sessions) m.set(s.id, s);
    return m;
  }, [sessions]);
  const readyCount = gateway?.reachable ? (gateway.activeSessions ?? sessions.filter((s) => s.status === 'ready').length) : 0;
  const reachable = Boolean(gateway?.reachable);

  const lines = useMemo(
    () => LINE_IDS.map((id) => byId.get(id) || { id, name: id, status: 'starting' as string }),
    [byId],
  );

  const primaryLine = useMemo(() => {
    const ready = sessions.find((s) => s.status === 'ready');
    return ready || sessions[0] || null;
  }, [sessions]);

  const linePct = readyCount / 8;
  const queued = stats?.queued ?? 0;
  const sentToday = stats?.sentToday ?? 0;
  const failed = stats?.failed ?? 0;

  /* actions */
  const goSection = (s: Section) => {
    setSection(s);
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`iq-sec-${s}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const selectPairLine = (id: string) => {
    setPairLine(id);
    goSection('pairing');
  };

  const restartLine = async (id: string) => {
    try {
      const res = await fetch('/api/admin/whatsapp/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart_session', sessionId: id }),
      });
      const json = await res.json().catch(() => null);
      if (json && json.success) showToast(t.tRestarted(id), 'ok');
      else showToast(t.tError, 'bad');
    } catch {
      showToast(t.tError, 'bad');
    }
  };

  const parseRecipients = () => {
    const out: { phone: string; name?: string }[] = [];
    const parts = recipients.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const m = p.match(/^([+\d][\d\s\-()]{6,})\s*(?:[,|]\s*(.+))?$/);
      if (m) out.push({ phone: m[1].trim(), name: m[2]?.trim() || undefined });
      else if (p.replace(/\D/g, '').length >= 8) out.push({ phone: p });
    }
    return out;
  };

  const sendInstant = async () => {
    const rec = parseRecipients();
    if (!body.trim() || rec.length === 0) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/whatsapp/direct-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: rec, body, sessionId: sendLine }),
      });
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        showToast(t.tSent(Number(json.sentCount || 0), Number(json.failedCount || 0)), json.failedCount ? 'info' : 'ok');
        setRecipients('');
      } else {
        showToast(String((json && json.error) || t.tError), 'bad');
      }
    } catch {
      showToast(t.tError, 'bad');
    } finally {
      setSending(false);
      pollOutbox(true);
    }
  };

  const queueScheduled = async () => {
    const rec = parseRecipients();
    if (!body.trim() || rec.length === 0) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        recipients: rec,
        body,
        purpose: 'custom-outreach',
      };
      if (scheduledFor) {
        const d = new Date(scheduledFor);
        if (!isNaN(d.getTime())) payload.scheduledFor = d.toISOString();
      }
      const res = await fetch('/api/admin/whatsapp/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        showToast(t.tQueued(Number(json.count || 0)), 'ok');
        setRecipients('');
      } else {
        showToast(String((json && json.error) || t.tError), 'bad');
      }
    } catch {
      showToast(t.tError, 'bad');
    } finally {
      setSending(false);
      pollOutbox(true);
    }
  };

  const drainQueue = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drain' }),
      });
      const json = await res.json().catch(() => null);
      if (json && json.success) showToast(t.tDrained(JSON.stringify(json.summary || {})), 'ok');
      else showToast(t.tError, 'bad');
    } catch {
      showToast(t.tError, 'bad');
    } finally {
      pollOutbox(true);
    }
  };

  const batchJobs = async (action: 'retry' | 'cancel') => {
    if (selectedJobs.length === 0) return;
    try {
      const res = await fetch('/api/admin/whatsapp/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedJobs }),
      });
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        showToast(action === 'retry' ? t.tRetried(Number(json.retried || 0)) : t.tCancelled(Number(json.cancelled || 0)), 'ok');
        setSelectedJobs([]);
      } else showToast(t.tError, 'bad');
    } catch {
      showToast(t.tError, 'bad');
    } finally {
      pollOutbox(true);
    }
  };

  const toggleJob = (id: string) => {
    setSelectedJobs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const pairLineSession = byId.get(pairLine);
  const pairLineReady = statusKeyOf(pairLineSession?.status) === 'ready';

  /* ───────────────────────────────────────────────────────────────────────
     render
     ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="iq-root" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="iq-shell">
        {/* ══════════ SIDEBAR (reference rail) ══════════ */}
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
            <button className={`iq-nav-item ${section === 'lines' ? 'is-active' : ''}`} onClick={() => goSection('lines')}>
              <span className="iq-nav-ic">📶</span><span>{t.navLines}</span>
              <span className={`iq-nav-badge ${readyCount === 0 ? 'is-bad' : ''}`}>{readyCount}/8</span>
            </button>
            <button className={`iq-nav-item ${section === 'pairing' ? 'is-active' : ''}`} onClick={() => goSection('pairing')}>
              <span className="iq-nav-ic">🔗</span><span>{t.navPairing}</span>
            </button>

            <div className="iq-nav-label">{t.navSectionOps}</div>
            <button className={`iq-nav-item ${section === 'composer' ? 'is-active' : ''}`} onClick={() => goSection('composer')}>
              <span className="iq-nav-ic">✉️</span><span>{t.navComposer}</span>
            </button>
            <button className={`iq-nav-item ${section === 'outbox' ? 'is-active' : ''}`} onClick={() => goSection('outbox')}>
              <span className="iq-nav-ic">📤</span><span>{t.navOutbox}</span>
              {queued > 0 && <span className="iq-nav-badge is-bad">{queued}</span>}
            </button>

            <div className="iq-nav-label">{t.navSectionSwitch}</div>
            <button className="iq-nav-item" onClick={() => window.open('/admin/apps', '_self')}>
              <span className="iq-nav-ic">🧩</span><span>{t.navApps}</span>
            </button>
            <button className="iq-nav-item" onClick={() => window.open('/admin', '_self')}>
              <span className="iq-nav-ic">🎛️</span><span>{t.navBackAdmin}</span>
            </button>
          </nav>

          <div className="iq-side-foot">
            {reachable ? (
              <div
                className="iq-side-qr"
                title={pairUrl || '/pair'}
                onClick={() => pairUrl && window.open(pairUrl, '_blank')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/whatsapp/qr?target=pair-link&ts=${pairLinkTs}`}
                  alt="pair portal QR"
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement)?.classList.add('is-empty'); }}
                />
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
          {/* header */}
          <header className="iq-header">
            <div className="iq-header-title">
              <h1>
                {isAr ? (
                  <>{t.tagline}</>
                ) : (
                  <>
                    Send<span className="iq-sep">›</span>Track<span className="iq-sep">›</span>Deliver
                  </>
                )}
              </h1>
              <p>{t.taglineSub}</p>
            </div>

            <div className="iq-scan-widget" onClick={() => pollOutbox()} role="button" tabIndex={0}>
              <div className={`iq-scan-check ${reachable ? '' : 'is-bad'}`}>
                {reachable ? '✓' : '!'}
              </div>
              <div>
                <div className="iq-scan-main">{checking ? '…' : t.check}</div>
                <div className="iq-scan-sub">
                  {t.lastCheck}: {lastCheck || t.never}
                </div>
              </div>
            </div>

            <div className="iq-langs">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  className={`iq-lang-btn ${lang === l.key ? 'is-active' : ''}`}
                  onClick={() => setLang(l.key)}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </header>

          <div className="iq-content">
            {/* ══ ROW 1 — Gateway Information + status cards ══ */}
            <section id="iq-sec-overview" className="iq-row r-2a">
              <div className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">⚙️</span>
                    <span className="iq-panel-title">{t.gwTitle}</span>
                    <span className="iq-panel-meta">
                      <span className={`iq-chip ${reachable ? 'ok' : 'bad'}`}>
                        <span className={`iq-dot ${reachable ? 'ok' : 'bad'}`} />
                        {reachable ? t.ok : t.offline}
                      </span>
                    </span>
                  </div>
                  <div className="iq-panel-bd">
                    <div className="iq-row r-2b" style={{ gap: 14 }}>
                      <dl className="iq-kv">
                        <dt>{t.gwEndpoint}</dt>
                        <dd className="iq-mono">{gateway?.endpoint || '—'}</dd>
                        <dt>{t.gwTunnel}</dt>
                        <dd className="iq-mono">{gateway?.tunnelUrl || t.gwNoTunnel}</dd>
                        <dt>{t.gwProvider}</dt>
                        <dd className="iq-mono">{provider}</dd>
                        <dt>{t.gwLines}</dt>
                        <dd className="iq-mono">{readyCount} / {gateway?.totalSessions ?? 8}</dd>
                        <dt>{t.gwPrimary}</dt>
                        <dd className="iq-mono">
                          {primaryLine ? `${primaryLine.id} ${primaryLine.phone ? '· ' + fmtPhone(primaryLine.phone) : ''}` : '—'}
                        </dd>
                        <dt>{t.gwLastActive}</dt>
                        <dd className="iq-mono">{primaryLine?.lastActive ? new Date(primaryLine.lastActive).toLocaleString() : '—'}</dd>
                        <dt>{t.gwCairo}</dt>
                        <dd className="iq-mono">{clock}</dd>
                      </dl>
                      <div className="iq-osbox">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: 34 }}>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ height: 15, borderRadius: 2, background: 'rgba(56,189,248,.55)' }} />
                          ))}
                        </div>
                        <div className="iq-os-name">{t.osName}</div>
                        {reachable ? (
                          <>
                            <div className="iq-os-ok">✓ {t.osOk}</div>
                            <div className="iq-os-sub">{t.osSub}</div>
                          </>
                        ) : (
                          <>
                            <div className="iq-os-ok" style={{ color: 'var(--iq-danger)' }}>✕ {t.osDown}</div>
                            <div className="iq-os-sub">{t.osDownSub}</div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* send-activity waveform — reference CPU-chart styling */}
                    <div
                      style={{
                        border: '1px solid var(--iq-hair)',
                        borderRadius: 10,
                        background: 'rgba(7, 11, 29, 0.55)',
                        padding: '10px 12px 8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>{t.gwChartTitle}</span>
                        <span style={{ fontSize: 9.5, color: 'var(--iq-dim)', fontFamily: 'var(--iq-font-mono)' }}>{t.gwChartSub}</span>
                        {activity.length >= 1 && Math.max(...activity, 0) === 0 && (
                          <span style={{ marginInlineStart: 'auto', fontSize: 9, color: 'var(--iq-faint)', fontStyle: 'italic' }}>{t.gwChartIdle}</span>
                        )}
                      </div>
                      <canvas ref={chartCanvas} style={{ width: '100%', height: 64, display: 'block' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* status cards (reference: CPU / RAM / Storage / Battery) */}
              <div className="iq-row r-4" style={{ gridTemplateRows: 'auto', gap: 12, alignContent: 'start' }}>
                <div className="iq-statcard">
                  <div className="iq-stat-ic">📶</div>
                  <div className="iq-stat-label">{t.cardActive}</div>
                  <div className="iq-stat-value">{readyCount}<small> / 8</small></div>
                  <div className={`iq-stat-ok ${readyCount > 0 ? 'ok' : 'bad'}`}>{readyCount > 0 ? `✓ ${t.ok}` : t.offline}</div>
                  <div className="iq-bar"><div className={`iq-bar-fill ${readyCount >= 4 ? 'ok' : readyCount > 0 ? 'warn' : 'bad'}`} style={{ width: `${Math.round(linePct * 100)}%` }} /></div>
                </div>
                <div className="iq-statcard">
                  <div className="iq-stat-ic">⏳</div>
                  <div className="iq-stat-label">{t.cardQueued}</div>
                  <div className="iq-stat-value">{queued}</div>
                  <div className={`iq-stat-ok ${queued === 0 ? 'ok' : 'warn'}`}>{queued === 0 ? `✓ ${t.ok}` : `${t.cardQueued}`}</div>
                  <div className="iq-bar"><div className={`iq-bar-fill ${queued === 0 ? 'ok' : 'gold'}`} style={{ width: `${Math.min(100, queued * 10)}%` }} /></div>
                </div>
                <div className="iq-statcard">
                  <div className="iq-stat-ic">📨</div>
                  <div className="iq-stat-label">{t.cardSentToday}</div>
                  <div className="iq-stat-value">{sentToday}</div>
                  <div className="iq-stat-ok ok">✓ {t.ok}</div>
                  <div className="iq-bar"><div className="iq-bar-fill cyan" style={{ width: `${Math.min(100, sentToday * 5)}%` }} /></div>
                </div>
                <div className="iq-statcard">
                  <div className="iq-stat-ic">⚠️</div>
                  <div className="iq-stat-label">{t.cardFailed}</div>
                  <div className="iq-stat-value">{failed}</div>
                  <div className={`iq-stat-ok ${failed === 0 ? 'ok' : 'bad'}`}>{failed === 0 ? `✓ ${t.none}` : `✕ ${t.cardFailed}`}</div>
                  <div className="iq-bar"><div className={`iq-bar-fill ${failed === 0 ? 'ok' : 'bad'}`} style={{ width: `${Math.min(100, failed * 12)}%` }} /></div>
                </div>
              </div>
            </section>

            {/* ══ ROW 2 — 8-line wall ══ */}
            <section id="iq-sec-lines">
              <div className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">📲</span>
                    <span className="iq-panel-title">{t.linesTitle}</span>
                    <span className="iq-panel-meta">{t.linesMeta}</span>
                    <LineHealthGauge
                      pct={linePct * 100}
                      center={`${readyCount}/8`}
                      label={t.linesGauge}
                    />
                  </div>
                  <div className="iq-panel-bd">
                    <div className="iq-row r-lines">
                      {lines.map((s) => {
                        const sk = statusKeyOf(s.status);
                        const st = sk === 'ready' ? t.lineReady : sk === 'await' ? t.lineAwait : sk === 'starting' ? t.lineStarting : sk === 'error' ? t.lineError : t.lineUnknown;
                        const chipCls = sk === 'ready' ? 'ok' : sk === 'await' ? 'warn' : sk === 'error' ? 'bad' : '';
                        const idx = Number(String(s.id).split('-')[1] || 0);
                        return (
                          <div
                            key={s.id}
                            className={`iq-line ${sk === 'ready' ? 'is-ready' : ''} ${sk === 'await' ? 'is-await' : ''} ${pairLine === s.id ? 'is-selected' : ''}`}
                            onClick={() => selectPairLine(s.id)}
                          >
                            <div className="iq-line-hd">
                              <span className="iq-line-name">SIM #{idx}</span>
                              <span className="iq-chip gold">line-{idx}</span>
                              <span className="iq-line-num">{s.id}</span>
                            </div>
                            <div className={`iq-line-phone ${s.phone ? '' : 'is-none'}`}>
                              {s.phone ? fmtPhone(s.phone) : t.noPhone}
                            </div>
                            <div className="iq-bar">
                              <div
                                className={`iq-bar-fill ${sk === 'ready' ? 'ok' : sk === 'await' ? 'warn' : sk === 'error' ? 'bad' : 'idle'}`}
                                style={{ width: sk === 'ready' ? '100%' : sk === 'await' ? '55%' : '12%' }}
                              />
                            </div>
                            <div className="iq-line-foot">
                              <span className={`iq-chip ${chipCls}`}>
                                <span className={`iq-dot ${sk === 'ready' ? 'ok' : sk === 'await' ? 'warn' : sk === 'error' ? 'bad' : 'idle'}`} />
                                {st}
                              </span>
                              <span>{t.sent(Number(s.totalSent || 0))}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="iq-btn iq-btn-ghost iq-btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); selectPairLine(s.id); }}>
                                🔗 {t.btnPair}
                              </button>
                              <button className="iq-btn iq-btn-ghost iq-btn-sm" onClick={(e) => { e.stopPropagation(); restartLine(s.id); }}>
                                ↻ {t.btnRestart}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ ROW 3 — QR Pairing + Composer ══ */}
            <section id="iq-sec-pairing" className="iq-row r-2b">
              <div className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">🔗</span>
                    <span className="iq-panel-title">{t.pairTitle}</span>
                    <span className="iq-panel-meta">
                      <select
                        className="iq-select" style={{ width: 'auto', padding: '4px 24px 4px 8px', fontSize: 10.5 }}
                        value={pairLine}
                        onChange={(e) => setPairLine(e.target.value)}
                      >
                        {LINE_IDS.map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </span>
                  </div>
                  <div className="iq-panel-bd">
                    <div className="iq-qr-stage">
                      <span className="iq-tick-b" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                      <div className="iq-qr-frame">
                        {pairQr ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={pairQr} alt={`QR ${pairLine}`} />
                        ) : (
                          <div className="iq-qr-frame is-empty" style={{ width: '100%', height: '100%', border: 'none', borderRadius: 0 }}>
                            {pairStatus === 'offline' ? t.tGatewayDown : pairLineReady ? t.pairReadyLine : t.pairWaiting}
                          </div>
                        )}
                      </div>
                      <div className="iq-qr-hint">
                        {pairPhone ? t.pairPhone(fmtPhone(pairPhone)) : t.pairHint}
                      </div>
                      {pairUrl && (
                        <button className="iq-btn iq-btn-ghost iq-btn-sm" onClick={() => window.open(pairUrl, '_blank')}>
                          📱 {t.openPortal}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* composer */}
              <div id="iq-sec-composer" className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">✉️</span>
                    <span className="iq-panel-title">{t.compTitle}</span>
                    <span className="iq-panel-meta">
                      <div className="iq-seg">
                        <button className={mode === 'instant' ? 'is-active' : ''} onClick={() => setMode('instant')}>{t.compInstant}</button>
                        <button className={mode === 'scheduled' ? 'is-active' : ''} onClick={() => setMode('scheduled')}>{t.compScheduled}</button>
                      </div>
                    </span>
                  </div>
                  <div className="iq-panel-bd" style={{ gap: 10 }}>
                    <div className="iq-field">
                      <label>{t.compLine}</label>
                      <select className="iq-select" value={sendLine} onChange={(e) => setSendLine(e.target.value)}>
                        <option value="auto">{t.compAuto}</option>
                        {LINE_IDS.map((id) => {
                          const s = byId.get(id);
                          const ready = statusKeyOf(s?.status) === 'ready';
                          return (
                            <option key={id} value={id} disabled={Boolean(s) && !ready}>
                              {id}{s?.phone ? ` · ${fmtPhone(s.phone)}` : ''}{ready ? '' : s ? ' — offline' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="iq-field">
                      <label>{t.compRecipients}</label>
                      <textarea
                        className="iq-textarea"
                        style={{ minHeight: 74 }}
                        value={recipients}
                        onChange={(e) => setRecipients(e.target.value)}
                        placeholder="201092048333, Ahmed&#10;201031622600"
                      />
                      <span style={{ fontSize: 9.5, color: 'var(--iq-faint)', fontFamily: 'var(--iq-font-mono)' }}>{t.compRecHint}</span>
                    </div>

                    <div className="iq-field">
                      <label>{t.compBody}</label>
                      <textarea
                        className="iq-textarea"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={isAr ? 'أهلاً {{name}}، معك سييرا إستيتس…' : 'Hello {{name}}, this is Sierra Estates…'}
                      />
                      <span style={{ fontSize: 9.5, color: 'var(--iq-faint)', fontFamily: 'var(--iq-font-mono)' }}>{t.compBodyHint}</span>
                    </div>

                    {mode === 'scheduled' && (
                      <div className="iq-field">
                        <label>{t.compWhen}</label>
                        <input
                          className="iq-input"
                          type="datetime-local"
                          value={scheduledFor}
                          onChange={(e) => setScheduledFor(e.target.value)}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {mode === 'instant' ? (
                        <button className="iq-btn iq-btn-green" disabled={sending || !body.trim() || !recipients.trim()} onClick={sendInstant}>
                          🚀 {t.compSend}
                        </button>
                      ) : (
                        <button className="iq-btn iq-btn-gold" disabled={sending || !body.trim() || !recipients.trim()} onClick={queueScheduled}>
                          📅 {t.compQueue}
                        </button>
                      )}
                      <span style={{ fontSize: 9.5, color: 'var(--iq-faint)' }}>🛡 {t.compGroupGuard}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ ROW 4 — Outbox + Contact ══ */}
            <section id="iq-sec-outbox" className="iq-row r-2a">
              <div className="iq-panel">
                <div className="iq-panel-inner">
                  <div className="iq-panel-hd">
                    <span className="iq-panel-ic">📤</span>
                    <span className="iq-panel-title">{t.outTitle}</span>
                    <span className="iq-panel-meta">
                      {selectedJobs.length > 0 && <span className="iq-chip gold">{t.outSelected(selectedJobs.length)}</span>}
                      <button className="iq-btn iq-btn-ghost iq-btn-sm" onClick={drainQueue}>⚡ {t.outDrain}</button>
                      <button className="iq-btn iq-btn-ghost iq-btn-sm" disabled={selectedJobs.length === 0} onClick={() => batchJobs('retry')}>↻ {t.outRetry}</button>
                      <button className="iq-btn iq-btn-ghost iq-btn-sm" disabled={selectedJobs.length === 0} onClick={() => batchJobs('cancel')}>✕ {t.outCancel}</button>
                    </span>
                  </div>
                  <div className="iq-panel-bd">
                    {jobs.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--iq-dim)', textAlign: 'center', padding: '22px 0' }}>{t.outEmpty}</div>
                    ) : (
                      <div className="iq-table-wrap">
                        <table className="iq-table">
                          <thead>
                            <tr>
                              <th style={{ width: 26 }} />
                              <th>{t.outTo}</th>
                              <th>{t.outStatus}</th>
                              <th>{t.outPurpose}</th>
                              <th>{t.outWhen}</th>
                              <th>{t.compBody}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobs.slice(0, 30).map((j) => {
                              const st = String(j.status || '');
                              const cls = st === 'sent' || st === 'delivered' || st === 'read' ? 'ok' : st === 'failed' ? 'bad' : st === 'sending' || st === 'processing' ? 'cyan' : 'warn';
                              return (
                                <tr key={j.id}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={selectedJobs.includes(j.id)}
                                      onChange={() => toggleJob(j.id)}
                                      style={{ accentColor: '#f0c040', cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td className="iq-mono">{fmtPhone(j.toPhone)}</td>
                                  <td><span className={`iq-chip ${cls}`}>{st || '—'}</span></td>
                                  <td className="iq-mono">{j.purpose || '—'}</td>
                                  <td className="iq-mono">{j.scheduledFor ? new Date(j.scheduledFor).toLocaleString() : (j.createdAt ? new Date(j.createdAt).toLocaleString() : '—')}</td>
                                  <td className="iq-mono" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.errorMessage ? `⚠ ${j.errorMessage}` : (j.body || '—').slice(0, 80)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* contact (reference bottom-right panel) */}
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
          </div>

          {/* footer status bar (reference) */}
          <footer className="iq-footer">
            <span className="iq-foot-ver">{t.footVer}</span>
            <span className="iq-foot-badges">
              <span className="iq-foot-badge"><span className={`iq-dot ${reachable ? 'ok' : 'bad'}`} /> {t.footB1}</span>
              <span className="iq-foot-badge">📶 {t.footB2}</span>
              <span className="iq-foot-badge">⚡ {t.footB3}</span>
              <span className="iq-foot-badge">🛡 {t.footB4}</span>
            </span>
            <span className="iq-foot-clock">🕰 {clock}</span>
          </footer>
        </div>
      </div>

      {toast && <div className={`iq-toast ${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}
