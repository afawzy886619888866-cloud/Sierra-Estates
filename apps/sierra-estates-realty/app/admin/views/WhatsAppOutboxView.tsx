'use client';

/**
 * WhatsApp Outbox & Gateway Status — the operations surface for the message
 * backbone. Lives inside the WhatsApp Hub (4th sub-tab) and wires the admin
 * to the SAME pipeline the site uses: public.whatsapp_queue → drain →
 * OpenWA gateway (54.89.162.250:2785) with Twilio/simulation fallbacks.
 *
 * Shows: live gateway session state, queue counters, the latest jobs with
 * per-row retry/cancel, and a manual "Drain now" that runs the same worker
 * the cron route runs. Auto-refreshes every 20s; respects EN/AR labels.
 */
import React, { useCallback, useEffect, useState } from 'react';

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
    status?: string;
    phone?: string;
    pushName?: string;
    lastActive?: string;
    engineLoaded?: boolean;
    error?: string;
  };
  stats?: { queued: number; sending: number; sent: number; failed: number; sentToday: number };
  jobs?: OutboxJob[];
  error?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  'owner-negotiation': 'Owner Negotiation',
  'client-recommendation': 'Client Recommendation',
  'general-outreach': 'General Outreach',
  'viewing-followup': 'Viewing Follow-up',
  'lead-qualification': 'Lead Qualification',
  'viewing-confirmation': 'Viewing Confirmation',
  'property-recommendation': 'Property Recommendation',
  'closer-handshake': 'Closer Handshake',
  'campaign-broadcast': 'Campaign Broadcast',
  'custom-outreach': 'Custom Outreach',
};

function statusChip(status?: string): { label: string; color: string } {
  switch (status) {
    case 'sent': return { label: 'Sent', color: '#34D399' };
    case 'delivered': return { label: 'Delivered', color: '#34D399' };
    case 'read': return { label: 'Read', color: '#2DD4BF' };
    case 'queued': return { label: 'Queued', color: '#60A5FA' };
    case 'pending': return { label: 'Pending', color: '#60A5FA' };
    case 'sending': case 'processing': return { label: 'Sending', color: '#F59E0B' };
    case 'failed': return { label: 'Failed', color: '#F87171' };
    default: return { label: status || '—', color: '#9CA3AF' };
  }
}

export default function WhatsAppOutboxView({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const [data, setData] = useState<OutboxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/outbox?status=${encodeURIComponent(statusFilter)}&limit=100&t=${Date.now()}`, { cache: 'no-store' });
      const json = (await res.json()) as OutboxResponse;
      setData(json);
    } catch (err: any) {
      setToast(isAr ? 'فشل تحميل الصندوق' : 'Failed to load outbox');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isAr]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { load(); }, 20000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (action: string, ids?: string[]) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/whatsapp/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids ? { action, ids } : { action }),
      });
      const json = await res.json();
      if (json?.success) {
        if (action === 'drain') {
          const s = json.summary || {};
          setToast(isAr
            ? `تمت التصفية: أُرسل ${s.sent ?? 0}، فشل ${s.failed ?? 0}${s.skipped ? ` — ${s.skipped}` : ''}`
            : `Drain done: sent ${s.sent ?? 0}, failed ${s.failed ?? 0}${s.skipped ? ` — ${s.skipped}` : ''}`);
        } else {
          setToast(isAr ? 'تم التنفيذ بنجاح' : 'Action completed');
        }
      } else {
        setToast(json?.error || (isAr ? 'فشل الإجراء' : 'Action failed'));
      }
      await load();
    } catch (err: any) {
      setToast(err?.message || 'Request error');
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const gw = data?.gateway;
  const stats = data?.stats;
  const jobs = data?.jobs || [];
  const failedIds = jobs.filter((j) => j.status === 'failed' && (j.errorMessage || '') !== 'Cancelled by admin').map((j) => j.id);

  const card = (label: string, value: string | number, color?: string) => (
    <div style={{
      flex: '1 1 120px', background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--tx-m)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--tx)' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Gateway status card */}
      <div style={{ background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 14, padding: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          width: 10, height: 10, borderRadius: 999,
          background: gw?.reachable ? (gw.status === 'ready' ? '#34D399' : '#F59E0B') : '#F87171',
          boxShadow: gw?.reachable && gw.status === 'ready' ? '0 0 8px rgba(52,211,153,0.8)' : 'none',
          flexShrink: 0,
        }} />
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>
            {isAr ? 'بوابة واتساب الحية' : 'Live WhatsApp Gateway'}
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx-m)', marginLeft: 8 }}>
              {data?.provider === 'openwa' ? (isAr ? 'القناة الأساسية' : 'PRIMARY CHANNEL') : ''}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx-m)', marginTop: 2 }}>
            {gw?.reachable
              ? `${gw.pushName || 'Sierra Estates'} · +${gw.phone || '—'} · ${isAr ? 'الحالة' : 'state'}: ${gw.status} · ${isAr ? 'آخر نشاط' : 'last active'}: ${gw.lastActive ? new Date(gw.lastActive).toLocaleTimeString() : '—'}`
              : (isAr ? 'البوابة غير متاحة: ' : 'Gateway unreachable: ') + (gw?.error || '—')}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn btn-ghost"
          style={{ padding: '7px 14px', fontSize: 12, borderRadius: 9, border: '1px solid var(--bd)', cursor: 'pointer' }}
        >
          ⟳ {isAr ? 'تحديث' : 'Refresh'}
        </button>
        <button
          onClick={() => act('drain')}
          disabled={busy}
          style={{
            padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 9, cursor: 'pointer',
            border: '1px solid #25D366', background: 'rgba(37,211,102,0.14)', color: '#25D366',
          }}
        >
          ▶ {isAr ? 'تصفية الصندوق الآن' : 'Drain now'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {card(isAr ? 'بالانتظار' : 'Queued', stats?.queued ?? '—', '#60A5FA')}
        {card(isAr ? 'قيد الإرسال' : 'Sending', stats?.sending ?? '—', '#F59E0B')}
        {card(isAr ? 'أُرسلت' : 'Sent', stats?.sent ?? '—', '#34D399')}
        {card(isAr ? 'أُرسلت اليوم' : 'Sent today', stats?.sentToday ?? '—', '#34D399')}
        {card(isAr ? 'فشلت' : 'Failed', stats?.failed ?? '—', '#F87171')}
      </div>

      {/* Failed batch action */}
      {failedIds.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => act('retry', failedIds)}
            disabled={busy}
            style={{
              padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
              border: '1px solid #F59E0B', background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
            }}
          >
            ↻ {isAr ? `إعادة محاولة الفاشلة (${failedIds.length})` : `Retry all failed (${failedIds.length})`}
          </button>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['all', 'queued', 'sent', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '5px 12px', fontSize: 11, borderRadius: 999, cursor: 'pointer',
              border: statusFilter === s ? '1px solid #D4AF37' : '1px solid var(--bd)',
              background: statusFilter === s ? 'rgba(212,175,55,0.14)' : 'transparent',
              color: statusFilter === s ? '#D4AF37' : 'var(--tx-m)',
            }}
          >
            {s === 'all' ? (isAr ? 'الكل' : 'All') : statusChip(s).label}
          </button>
        ))}
      </div>

      {/* Queue table */}
      <div style={{ background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--tx-m)', borderBottom: '1px solid var(--bd)' }}>
              <th style={{ padding: '10px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'الوقت' : 'Time'}</th>
              <th style={{ padding: '10px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'الغرض' : 'Purpose'}</th>
              <th style={{ padding: '10px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'المرسل إليه' : 'Recipient'}</th>
              <th style={{ padding: '10px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'الرسالة' : 'Message'}</th>
              <th style={{ padding: '10px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'الحالة' : 'Status'}</th>
              <th style={{ padding: '10px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 22, textAlign: 'center', color: 'var(--tx-m)' }}>
                {isAr ? 'لا توجد رسائل في الصندوق بعد' : 'No messages in the outbox yet'}
              </td></tr>
            )}
            {jobs.map((j) => {
              const chip = statusChip(j.status);
              const via = (j.metadata as any)?.sentVia;
              return (
                <tr key={j.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '9px 12px', color: 'var(--tx-m)', whiteSpace: 'nowrap' }}>
                    {new Date(j.createdAt || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--tx)' }}>
                    {PURPOSE_LABELS[j.purpose || ''] || j.purpose || '—'}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--tx)', whiteSpace: 'nowrap' }}>
                    {j.recipientName ? `${j.recipientName} · ` : ''}{j.recipientPhone || '—'}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--tx-m)', maxWidth: 260 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.messageBody || '—'}</div>
                    {j.errorMessage && <div style={{ color: '#F87171', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.errorMessage}</div>}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span className="chip" style={{ color: chip.color, border: `1px solid ${chip.color}44`, background: `${chip.color}14`, borderRadius: 999, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
                      {chip.label}{via && j.status === 'sent' ? ` · ${via}` : ''}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                    {j.status === 'failed' && (
                      <button onClick={() => act('retry', [j.id])} disabled={busy} className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10, cursor: 'pointer', color: '#F59E0B' }}>↻</button>
                    )}
                    {['queued', 'pending'].includes(j.status || '') && (
                      <button onClick={() => act('cancel', [j.id])} disabled={busy} className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10, cursor: 'pointer', color: '#F87171' }}>✕</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 22, right: 22, zIndex: 60,
          background: 'var(--bg-e)', border: '1px solid var(--bd)', borderLeft: '3px solid #D4AF37',
          borderRadius: 10, padding: '10px 16px', fontSize: 12, color: 'var(--tx)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
