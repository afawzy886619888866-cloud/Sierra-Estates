'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — 8-Line WhatsApp Multi-Session Outbox & Gateway Controller
 * ───────────────────────────────────────────────────────────────────────────
 * High-End Luxury Real Estate Intelligence OS · New Cairo Broker & Owner Outreach
 * 
 * Features:
 *  - 8-Line Interactive Bento Grid (line-1 .. line-8) with live QR renderers
 *  - Real-time Gateway state, SIM phone numbers, and per-line restart triggers
 *  - Public Cloudflare Tunnel & Live Broker Map Station bridge
 *  - Simulated Inbound Broker Drop (instant RAG testing)
 *  - Queue management: Drain now, Batch Retry, Cancel, Purpose filtering
 *  - Authentic Bilingual Craft (Arabic RTL & English LTR) with Obsidian & Champagne Gold
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { HyouzCard, HyouzCounter, HyouzBeacon, HyouzMagneticButton } from '@/components/admin/HyouzMotion';

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
  qrDataUrl?: string | null;
  error?: string | null;
}

interface OutboxJob {
  id: string;
  purpose?: string;
  recipientPhone?: string;
  recipientName?: string;
  messageBody?: string;
  status?: string;
  attempts?: number;
  errorMessage?: string | null;
  sentAt?: string | null;
  scheduledFor?: string | null;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
}

interface OutboxResponse {
  success: boolean;
  provider?: string;
  gateway?: {
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
  };
  stats?: {
    queued: number;
    sending: number;
    sent: number;
    failed: number;
    sentToday: number;
  };
  jobs?: OutboxJob[];
  error?: string;
}

const PURPOSE_LABELS: Record<string, { en: string; ar: string }> = {
  'owner-negotiation': { en: 'Owner Negotiation', ar: 'مفاوضة المالك' },
  'client-recommendation': { en: 'Client Recommendation', ar: 'ترشيح للعميل' },
  'general-outreach': { en: 'General Outreach', ar: 'تواصل عام' },
  'viewing-followup': { en: 'Viewing Follow-up', ar: 'متابعة المعاينة' },
  'lead-qualification': { en: 'Lead Qualification', ar: 'تأهيل العميل' },
  'viewing-confirmation': { en: 'Viewing Confirmation', ar: 'تأكيد المعاينة' },
  'property-recommendation': { en: 'Property Recommendation', ar: 'اقتراح عقاري' },
  'closer-handshake': { en: 'Closer Handshake', ar: 'مصافحة الإغلاق' },
  'campaign-broadcast': { en: 'Campaign Broadcast', ar: 'بث حملة تسويقية' },
  'custom-outreach': { en: 'Custom Outreach', ar: 'تواصل مخصص' },
};

function statusBadge(status?: string, isAr = false): { label: string; bg: string; color: string; border: string } {
  switch (status) {
    case 'sent':
      return { label: isAr ? 'تم الإرسال' : 'Sent', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(52, 211, 153, 0.3)' };
    case 'delivered':
      return { label: isAr ? 'تم التسليم' : 'Delivered', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(52, 211, 153, 0.3)' };
    case 'read':
      return { label: isAr ? 'تمت القراءة' : 'Read', bg: 'rgba(45, 212, 191, 0.14)', color: '#2dd4bf', border: 'rgba(45, 212, 191, 0.3)' };
    case 'queued':
      return { label: isAr ? 'بالانتظار' : 'Queued', bg: 'rgba(59, 130, 246, 0.14)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' };
    case 'pending':
      return { label: isAr ? 'معلق' : 'Pending', bg: 'rgba(59, 130, 246, 0.14)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' };
    case 'sending':
    case 'processing':
      return { label: isAr ? 'قيد الإرسال' : 'Sending', bg: 'rgba(245, 158, 11, 0.14)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    case 'failed':
      return { label: isAr ? 'فشل' : 'Failed', bg: 'rgba(239, 68, 68, 0.14)', color: '#f87171', border: 'rgba(248, 113, 113, 0.3)' };
    default:
      return { label: status || '—', bg: 'rgba(156, 163, 175, 0.14)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
  }
}

export default function WhatsAppOutboxView({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const [data, setData] = useState<OutboxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: 'ok' | 'err' } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeQrModal, setActiveQrModal] = useState<GatewaySession | null>(null);
  const [testBoxOpen, setTestBoxOpen] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('201092048333');
  const [testMsg, setTestMsg] = useState('Sierra Estates Luxury Property Ping');
  const [simulating, setSimulating] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/whatsapp/outbox?status=${encodeURIComponent(statusFilter)}&limit=100&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      const json = (await res.json()) as OutboxResponse;
      setData(json);
    } catch (err: any) {
      showToast(isAr ? 'تعذر تحميل بيانات البوابة' : 'Failed to load gateway data', 'err');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isAr]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      load();
    }, 12000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (action: string, payload: Record<string, any> = {}) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/whatsapp/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (json?.success) {
        if (action === 'drain') {
          const s = json.summary || {};
          showToast(
            isAr
              ? `تمت تصفية الصندوق: أُرسل ${s.sent ?? 0}، فشل ${s.failed ?? 0}${s.skipped ? ` (${s.skipped})` : ''}`
              : `Outbox drained: ${s.sent ?? 0} sent, ${s.failed ?? 0} failed${s.skipped ? ` (${s.skipped})` : ''}`
          );
        } else if (action === 'restart_session') {
          showToast(isAr ? `جاري إعادة تشغيل الخط ${payload.sessionId}...` : `Restarting line ${payload.sessionId}...`);
        } else if (action === 'test_send') {
          showToast(isAr ? 'تم إرسال الرسالة التجريبية بنجاح!' : 'Test message sent successfully!');
          setTestBoxOpen(null);
        } else if (action === 'simulate_broker') {
          const comp = json.result?.unit?.compound;
          showToast(
            isAr
              ? (comp ? `تم التقاط وحدة وسيط جديدة: ${comp}` : 'تمت محاكاة رسالة الوسيط بنجاح')
              : (comp ? `Broker unit simulated: ${comp}` : 'Broker message simulated successfully')
          );
        } else {
          showToast(isAr ? 'تم تنفيذ العملية بنجاح' : 'Action completed');
        }
      } else {
        showToast(json?.error || (isAr ? 'فشلت العملية' : 'Action failed'), 'err');
      }
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Request error', 'err');
    } finally {
      setBusy(false);
    }
  };

  const gw = data?.gateway;
  const sessions = gw?.sessions || [];
  const stats = data?.stats;
  const jobs = data?.jobs || [];
  const failedIds = useMemo(
    () => jobs.filter((j) => j.status === 'failed' && (j.errorMessage || '') !== 'Cancelled by admin').map((j) => j.id),
    [jobs]
  );

  const fallback8Sessions: GatewaySession[] = useMemo(() => {
    if (sessions.length >= 8) return sessions;
    const existingMap = new Map(sessions.map((s) => [s.id, s]));
    return Array.from({ length: 8 }, (_, i) => {
      const id = `line-${i + 1}`;
      return (
        existingMap.get(id) || {
          id,
          name: id,
          status: gw?.reachable ? 'initializing' : 'disconnected',
          phone: null,
          pushName: `Line #${i + 1}`,
          totalSent: 0,
          hasQr: false,
        }
      );
    });
  }, [sessions, gw?.reachable]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: isAr ? "'Cairo', system-ui, sans-serif" : 'inherit',
      }}
    >
      {/* ── TOP CONTROL BAR ────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(9, 13, 22, 0.98))',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: 16,
          padding: '18px 22px',
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
            📱
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: 0.2 }}>
                {isAr ? 'بوابة واتساب متعددة الخطوط (8 خطوط)' : '8-Line Multi-Session WhatsApp Gateway'}
              </h2>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: gw?.reachable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: gw?.reachable ? '#34d399' : '#f87171',
                  border: `1px solid ${gw?.reachable ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <HyouzBeacon color={gw?.reachable ? '#34d399' : '#f87171'} size={7} />
                {gw?.reachable
                  ? isAr
                    ? <><HyouzCounter value={gw.activeSessions || 0} /> من 8 خطوط جاهزة</>
                    : <><HyouzCounter value={gw.activeSessions || 0} /> / 8 LINES ONLINE</>
                  : isAr
                  ? 'البوابة متوقفة'
                  : 'GATEWAY OFFLINE'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--tx-m, #94a3b8)', margin: '4px 0 0 0' }}>
              {isAr
                ? 'مركز التحكم الميداني بحملات الإرسال ومجموعات سماسرة التجمع الخامس مع الموزع الآلي المستقر'
                : 'Dedicated multi-device broker harvesting and outreach pool for New Cairo real estate operations'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <HyouzMagneticButton
            onClick={() => act('simulate_broker')}
            disabled={busy || simulating}
            style={{
              padding: '8px 14px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 10,
              border: '1px solid rgba(212, 175, 55, 0.4)',
              background: 'rgba(212, 175, 55, 0.12)',
              color: '#f3e5ab',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚡</span>
            <span>{isAr ? 'محاكاة رسالة وسيط' : 'Simulate Broker Drop'}</span>
          </HyouzMagneticButton>

          <a
            href="http://127.0.0.1:2785/map"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '8px 14px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 10,
              textDecoration: 'none',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🗺️</span>
            <span>{isAr ? 'محطة الخريطة الحية' : 'Live Map Station'}</span>
          </a>

          <HyouzMagneticButton
            onClick={() => act('drain')}
            disabled={busy}
            style={{
              padding: '8px 16px',
              fontSize: 11.5,
              fontWeight: 800,
              borderRadius: 10,
              border: '1px solid #10b981',
              background: 'rgba(16, 185, 129, 0.18)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>▶</span>
            <span>{isAr ? 'تصفية الصندوق الآن' : 'Drain Outbox Now'}</span>
          </HyouzMagneticButton>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '8px 12px',
              fontSize: 11.5,
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

      {/* ── 8-LINE BENTO GRID ─────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx, #f8fafc)', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {isAr ? 'مصفوفة الخطوط الثمانية المخصصة (Dedicated SIM Pool)' : 'Dedicated 8-Line WhatsApp SIM Pool'}
          </h3>
          <div style={{ fontSize: 11, color: 'var(--tx-m, #94a3b8)' }}>
            {gw?.endpoint ? `Endpoint: ${gw.endpoint}` : 'Port: 2785'}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {fallback8Sessions.map((session, idx) => {
            const isReady = session.status === 'ready';
            const isScanQr = session.status === 'scan_qr' || session.hasQr;
            const isStarting = session.status === 'starting' || session.status === 'initializing';
            const lineNum = idx + 1;

            let badgeBg = 'rgba(239, 68, 68, 0.15)';
            let badgeColor = '#f87171';
            let badgeText = isAr ? 'غير متصل' : 'OFFLINE';

            if (isReady) {
              badgeBg = 'rgba(16, 185, 129, 0.18)';
              badgeColor = '#34d399';
              badgeText = isAr ? 'جاهز' : 'READY';
            } else if (isScanQr) {
              badgeBg = 'rgba(245, 158, 11, 0.18)';
              badgeColor = '#fbbf24';
              badgeText = isAr ? 'مسح الباركود' : 'SCAN QR';
            } else if (isStarting) {
              badgeBg = 'rgba(59, 130, 246, 0.18)';
              badgeColor = '#60a5fa';
              badgeText = isAr ? 'جاري التشغيل' : 'STARTING';
            }

            return (
              <HyouzCard
                key={session.id}
                glowColor={isReady ? 'rgba(16, 185, 129, 0.16)' : 'rgba(212, 175, 55, 0.14)'}
                style={{
                  background: 'var(--bg-e, #111827)',
                  border: isReady ? '1px solid rgba(16, 185, 129, 0.3)' : isScanQr ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--bd, #1f293d)',
                  borderRadius: 14,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: isReady ? '0 4px 18px rgba(16, 185, 129, 0.08)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Line Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#d4af37' }}>
                      SIM #{lineNum}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--tx-m, #94a3b8)', fontFamily: 'monospace' }}>
                      ({session.id})
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: badgeBg,
                      color: badgeColor,
                      letterSpacing: 0.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <HyouzBeacon color={badgeColor} size={6} glow={isReady} />
                    {badgeText}
                  </span>
                </div>

                {/* Line Content Body */}
                <div
                  style={{
                    background: '#090d16',
                    borderRadius: 10,
                    padding: 12,
                    minHeight: 125,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed #1e293b',
                    textAlign: 'center',
                  }}
                >
                  {isReady ? (
                    <div>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>📶</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: 0.5 }}>
                        +{session.phone || '2010XXXXXXXX'}
                      </div>
                      <div style={{ fontSize: 11, color: '#d4af37', marginTop: 3 }}>
                        {session.pushName || `Sierra Line ${lineNum}`}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#94a3b8',
                          marginTop: 6,
                          background: 'rgba(212, 175, 55, 0.1)',
                          padding: '2px 8px',
                          borderRadius: 999,
                          display: 'inline-block',
                        }}
                      >
                        <HyouzCounter value={session.totalSent || 0} /> {isAr ? 'رسالة مُرسلة' : 'messages sent'}
                      </div>
                    </div>
                  ) : isScanQr ? (
                    <div>
                      {session.qrDataUrl ? (
                        <img
                          src={session.qrDataUrl}
                          alt="QR Code"
                          onClick={() => setActiveQrModal(session)}
                          style={{
                            width: 86,
                            height: 86,
                            borderRadius: 6,
                            background: '#fff',
                            padding: 3,
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                          }}
                          title={isAr ? 'انقر لتكبير الباركود' : 'Click to enlarge QR'}
                        />
                      ) : (
                        <div style={{ fontSize: 28, cursor: 'pointer' }} onClick={() => setActiveQrModal(session)}>
                          📷
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: '#fbbf24', marginTop: 6, fontWeight: 700 }}>
                        {isAr ? 'امسح الباركود للربط' : 'Scan QR with WhatsApp'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 22, opacity: 0.6, marginBottom: 4 }}>⏳</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {session.error
                          ? isAr
                            ? 'خطأ في المحرك'
                            : 'Engine Error'
                          : isAr
                          ? 'جاري تهيئة المتصفح...'
                          : 'Starting browser engine...'}
                      </div>
                      {session.error && (
                        <div
                          style={{
                            fontSize: 9.5,
                            color: '#f87171',
                            marginTop: 4,
                            maxWidth: 190,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={session.error}
                        >
                          {session.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Controls */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => act('restart_session', { sessionId: session.id })}
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: '1px solid var(--bd, #1f293d)',
                      background: '#1f2937',
                      color: '#f8fafc',
                    }}
                  >
                    🔄 {isAr ? 'إعادة تشغيل' : 'Restart'}
                  </button>

                  {isReady && (
                    <button
                      onClick={() => setTestBoxOpen(testBoxOpen === session.id ? null : session.id)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        background: 'rgba(212, 175, 55, 0.12)',
                        color: '#f3e5ab',
                      }}
                    >
                      ✉️ {isAr ? 'اختبار' : 'Test'}
                    </button>
                  )}

                  {isScanQr && (
                    <button
                      onClick={() => setActiveQrModal(session)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                      }}
                    >
                      🔍 {isAr ? 'عرض' : 'View QR'}
                    </button>
                  )}
                </div>

                {/* Inline Test Send Box */}
                {testBoxOpen === session.id && (
                  <div
                    style={{
                      background: '#070b12',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: 8,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="2010xxxxxxxx"
                      style={{
                        background: '#111827',
                        border: '1px solid #1f293d',
                        color: '#f8fafc',
                        padding: '5px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                    />
                    <input
                      type="text"
                      value={testMsg}
                      onChange={(e) => setTestMsg(e.target.value)}
                      placeholder="Message text"
                      style={{
                        background: '#111827',
                        border: '1px solid #1f293d',
                        color: '#f8fafc',
                        padding: '5px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                    />
                    <button
                      onClick={() =>
                        act('test_send', { sessionId: session.id, phone: testPhone, text: testMsg })
                      }
                      disabled={busy}
                      style={{
                        background: 'linear-gradient(135deg, #d4af37, #997a15)',
                        border: 'none',
                        color: '#000',
                        fontWeight: 800,
                        padding: '5px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {isAr ? 'إرسال الرسالة الآن' : 'Send Ping Now'}
                    </button>
                  </div>
                )}
              </HyouzCard>
            );
          })}
        </div>
      </div>

      {/* ── QUEUE STATS BENTO ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: isAr ? 'بالانتظار' : 'Queued', val: stats?.queued ?? 0, color: '#60a5fa' },
          { label: isAr ? 'قيد المعالجة' : 'Sending', val: stats?.sending ?? 0, color: '#f59e0b' },
          { label: isAr ? 'أُرسلت اليوم' : 'Sent Today', val: stats?.sentToday ?? 0, color: '#34d399' },
          { label: isAr ? 'إجمالي الناجحة' : 'Total Delivered', val: stats?.sent ?? 0, color: '#2dd4bf' },
          { label: isAr ? 'متعثرة' : 'Failed', val: stats?.failed ?? 0, color: '#f87171' },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-e, #111827)',
              border: '1px solid var(--bd, #1f293d)',
              borderRadius: 12,
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--tx-m, #94a3b8)', marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: item.color }}>
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* ── BATCH RETRY & FILTER BAR ──────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'queued', 'sending', 'sent', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px',
                fontSize: 11.5,
                borderRadius: 999,
                cursor: 'pointer',
                border: statusFilter === s ? '1px solid #d4af37' : '1px solid var(--bd, #1f293d)',
                background: statusFilter === s ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                color: statusFilter === s ? '#f3e5ab' : 'var(--tx-m, #94a3b8)',
                fontWeight: statusFilter === s ? 700 : 500,
              }}
            >
              {s === 'all' ? (isAr ? 'كافة الرسائل' : 'All Messages') : statusBadge(s, isAr).label}
            </button>
          ))}
        </div>

        {/* Failed batch retry */}
        {failedIds.length > 0 && (
          <button
            onClick={() => act('retry', { ids: failedIds })}
            disabled={busy}
            style={{
              padding: '7px 16px',
              fontSize: 11.5,
              fontWeight: 800,
              borderRadius: 10,
              cursor: 'pointer',
              border: '1px solid #f59e0b',
              background: 'rgba(245, 158, 11, 0.14)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>↻</span>
            <span>{isAr ? `إعادة محاولة كافة المتعثرة (${failedIds.length})` : `Retry all failed (${failedIds.length})`}</span>
          </button>
        )}
      </div>

      {/* ── OUTBOX JOBS DATA TABLE ────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-e, #111827)',
          border: '1px solid var(--bd, #1f293d)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: isAr ? 'right' : 'left', color: 'var(--tx-m, #94a3b8)', borderBottom: '1px solid var(--bd, #1f293d)' }}>
                <th style={{ padding: '12px 14px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'التاريخ والوقت' : 'Timestamp'}</th>
                <th style={{ padding: '12px 14px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'الغرض' : 'Purpose'}</th>
                <th style={{ padding: '12px 14px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'المرسل إليه' : 'Recipient'}</th>
                <th style={{ padding: '12px 14px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'نص الرسالة' : 'Message Body'}</th>
                <th style={{ padding: '12px 14px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'الحالة والمصدر' : 'Status & Channel'}</th>
                <th style={{ padding: '12px 14px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--tx-m, #94a3b8)' }}>
                    {isAr ? 'لا توجد رسائل مسجلة في الصندوق حالياً' : 'No messages found in the outbox queue'}
                  </td>
                </tr>
              )}
              {jobs.map((j) => {
                const badge = statusBadge(j.status, isAr);
                const via = (j.metadata as any)?.sentVia || (j.metadata as any)?.routedSession;
                const purposeObj = PURPOSE_LABELS[j.purpose || ''];
                const purposeText = purposeObj ? (isAr ? purposeObj.ar : purposeObj.en) : j.purpose || '—';

                return (
                  <tr key={j.id} style={{ borderBottom: '1px solid var(--bd, #1f293d)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '11px 14px', color: 'var(--tx-m, #94a3b8)', whiteSpace: 'nowrap' }}>
                      {new Date(j.createdAt || Date.now()).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--tx, #f8fafc)', fontWeight: 600 }}>
                      <span
                        style={{
                          background: 'rgba(212, 175, 55, 0.08)',
                          color: '#f3e5ab',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                        }}
                      >
                        {purposeText}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--tx, #f8fafc)', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700 }}>{j.recipientPhone || '—'}</div>
                      {j.recipientName && <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{j.recipientName}</div>}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--tx-m, #94a3b8)', maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {j.messageBody || '—'}
                      </div>
                      {j.errorMessage && (
                        <div style={{ color: '#f87171', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ⚠️ {j.errorMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          borderRadius: 999,
                          padding: '3px 10px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {badge.label}
                        {via && <span style={{ opacity: 0.75 }}>· {via}</span>}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      {j.status === 'failed' && (
                        <button
                          onClick={() => act('retry', { ids: [j.id] })}
                          disabled={busy}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          ↻ {isAr ? 'إعادة' : 'Retry'}
                        </button>
                      )}
                      {['queued', 'pending'].includes(j.status || '') && (
                        <button
                          onClick={() => act('cancel', { ids: [j.id] })}
                          disabled={busy}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: '#f87171',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          ✕ {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── QR CODE MODAL ────────────────────────────────────────────── */}
      {activeQrModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setActiveQrModal(null)}
        >
          <div
            style={{
              background: '#0e1422',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: 20,
              padding: 28,
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
              {isAr ? `مسح باركود واتساب (${activeQrModal.name})` : `WhatsApp QR Code (${activeQrModal.name})`}
            </h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 18px 0' }}>
              {isAr
                ? 'افتح واتساب في هاتفك > الأجهزة المرتبطة > ربط جهاز، ووجه الكاميرا نحو الشاشة'
                : 'Open WhatsApp on your mobile phone > Linked Devices > Link a Device, and scan below'}
            </p>

            <div
              style={{
                background: '#ffffff',
                padding: 14,
                borderRadius: 14,
                display: 'inline-block',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                margin: '0 auto 16px auto',
              }}
            >
              {activeQrModal.qrDataUrl ? (
                <img
                  src={activeQrModal.qrDataUrl}
                  alt="WhatsApp QR Code"
                  style={{ width: 240, height: 240, display: 'block' }}
                />
              ) : (
                <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700 }}>
                  {isAr ? 'جاري توليد الباركود...' : 'Generating QR Code...'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                onClick={() => act('restart_session', { sessionId: activeQrModal.id })}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: '1px solid #1f293d',
                  background: '#1f2937',
                  color: '#fff',
                }}
              >
                🔄 {isAr ? 'توليد باركود جديد' : 'Regenerate QR'}
              </button>

              <button
                onClick={() => setActiveQrModal(null)}
                style={{
                  padding: '10px 20px',
                  fontSize: 12,
                  fontWeight: 800,
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #d4af37, #997a15)',
                  color: '#000',
                }}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ───────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            [isAr ? 'left' : 'right']: 24,
            zIndex: 99999,
            background: '#0e1422',
            border: `1px solid ${toast.type === 'err' ? '#f87171' : '#d4af37'}`,
            borderRadius: 12,
            padding: '12px 20px',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#f8fafc',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{toast.type === 'err' ? '⚠️' : '✅'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
