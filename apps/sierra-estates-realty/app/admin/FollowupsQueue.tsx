'use client';
/**
 * SIERRA ESTATES — CRM · FOLLOW-UPS WORK QUEUE
 *
 * The follow-ups API (app/api/admin/followups) has existed since the Supabase
 * migration, but no surface ever consumed it: 465 open tasks (443 overdue at
 * the time this component landed) were invisible to the sales team. This queue
 * renders them as an actionable board inside the Leads CRM tab.
 *
 * Rules inherited from the portal:
 *  - ANTI-FABRICATION: no invented follow-ups; loading/empty/error states are
 *    honest (see data-constants.ts Master Rule 5).
 *  - The server is the source of truth: every mutation is optimistic locally,
 *    then PATCHed, and reverted with a visible error if the save fails.
 *  - Bilingual EN/AR via the same `T('lang')` convention the SPA uses.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';

/* ── constants ─────────────────────────────────────────────────────────── */

const OPEN_STATUSES = ['pending', 'overdue', 'in_progress'];

const TYPE_META: Record<string, { icon: string; en: string; ar: string }> = {
  call: { icon: '📞', en: 'Call', ar: 'مكالمة' },
  whatsapp: { icon: '💬', en: 'WhatsApp', ar: 'واتساب' },
  email: { icon: '✉️', en: 'Email', ar: 'بريد' },
  meeting: { icon: '🗓️', en: 'Meeting', ar: 'اجتماع' },
  viewing: { icon: '🏠', en: 'Viewing', ar: 'معاينة' },
  other: { icon: '📌', en: 'Other', ar: 'أخرى' },
};

const PRIORITY_META: Record<string, { en: string; ar: string; cls: string }> = {
  urgent: { en: 'Urgent', ar: 'عاجل', cls: 'chip-red' },
  high: { en: 'High', ar: 'مرتفع', cls: 'chip-amber' },
  medium: { en: 'Medium', ar: 'متوسط', cls: 'chip-blue' },
  low: { en: 'Low', ar: 'منخفض', cls: 'chip-amber' },
};

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDue(iso: string, ar: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (ar) return `${d.getDate()} ${d.getMonth() + 1} · ${hh}:${mm}`;
  return `${MONTHS_EN[d.getMonth()]} ${d.getDate()} · ${hh}:${mm}`;
}

function daysLate(iso: string): number {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return 0;
  const diff = startOfDay(new Date()).getTime() - startOfDay(due).getTime();
  return Math.floor(diff / 86400000);
}

/* ── component ─────────────────────────────────────────────────────────── */

export default function FollowupsQueue({ leads, T }: { leads: any[]; T: any }) {
  const ar = T('lang') === 'ar';
  const tr = useCallback((en: string, arText: string) => (ar ? arText : en), [ar]);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'overdue' | 'today' | 'upcoming'>('overdue');

  const fetchQueue = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/followups?limit=500')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setItems(Array.isArray(d?.followups) ? d.followups : []);
        setError(null);
      })
      .catch((e: any) =>
        setError(tr('Could not load the follow-ups queue', 'تعذر تحميل قائمة المتابعات') + ` (${e?.message ?? 'network'})`)
      )
      .finally(() => setLoading(false));
  }, [tr]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  /* Lead context is merged client-side from the leads the CRM tab already
   * loaded — no extra round trip, and the queue shows exactly the same
   * client names/phones/sources the table below it does. */
  const leadById = useMemo(
    () => new Map((leads || []).map((l: any) => [String(l?.id), l])),
    [leads]
  );

  const buckets = useMemo(() => {
    const overdue: any[] = [];
    const today: any[] = [];
    const upcoming: any[] = [];
    const t0 = startOfDay(new Date()).getTime();
    const t1 = t0 + 86400000;

    for (const f of items) {
      if (!f || !OPEN_STATUSES.includes(f.status) || f.completedAt) continue;
      const due = f.dueAt ? new Date(f.dueAt).getTime() : Number.NaN;
      // Stored status wins ('overdue' is stamped by the auto-timer); otherwise
      // a pending task whose due date already passed is overdue by computation.
      if (f.status === 'overdue' || (Number.isFinite(due) && due < t0)) overdue.push(f);
      else if (Number.isFinite(due) && due < t1) today.push(f);
      else if (Number.isFinite(due)) upcoming.push(f);
    }
    const byDue = (a: any, b: any) => String(a.dueAt ?? '').localeCompare(String(b.dueAt ?? ''));
    overdue.sort(byDue);
    today.sort(byDue);
    upcoming.sort(byDue);
    return { overdue, today, upcoming };
  }, [items]);

  const visible = buckets[tab];

  /* ── mutations: optimistic + rollback, server is source of truth ────── */

  const patchFollowup = async (id: string, body: Record<string, unknown>, revert: () => void) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setError(null);
    } catch (e: any) {
      revert();
      setError(
        tr('The change could not be saved and was reverted', 'تعذر حفظ التغيير وتم التراجع عنه') +
          ` (${e?.message ?? 'network'})`
      );
    } finally {
      setBusyId(null);
    }
  };

  const complete = (f: any) => {
    if (!f?.id) return;
    const prev = [...items];
    const stamp = new Date().toISOString();
    setItems((cur) =>
      cur.map((x) => (x?.id === f.id ? { ...x, status: 'completed', completedAt: stamp } : x))
    );
    patchFollowup(f.id, { status: 'completed' }, () => setItems(prev));
  };

  const snooze = (f: any, days: number) => {
    if (!f?.id) return;
    const prev = [...items];
    const next = new Date();
    next.setDate(next.getDate() + days);
    const iso = next.toISOString();
    setItems((cur) =>
      cur.map((x) => (x?.id === f.id ? { ...x, dueAt: iso, status: 'pending' } : x))
    );
    patchFollowup(f.id, { dueAt: iso, status: 'pending' }, () => setItems(prev));
  };

  const openWhatsApp = (lead: any, f: any) => {
    const clean = String(lead?.phone || '').replace(/[^0-9]/g, '');
    if (!clean) return;
    const name = lead?.name || '';
    const task = f?.title || '';
    const text = ar
      ? `مرحباً ${name}، مستشار سييرا العقاري معك بخصوص ${task}.`
      : `Hello ${name}, this is your Sierra Estates advisor following up on: ${task}.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  /* ── render helpers ─────────────────────────────────────────────────── */

  const tabPill = (key: 'overdue' | 'today' | 'upcoming', label: string, emoji: string, count: number, activeBg: string, activeFg: string) => (
    <button
      key={key}
      className="topbar-pill"
      onClick={() => setTab(key)}
      style={tab === key ? { background: activeBg, color: activeFg, borderColor: activeBg } : {}}
      aria-pressed={tab === key}
    >
      {emoji} {label} ({count})
    </button>
  );

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-hd">
        <span className="card-title">⏱️ {tr('Follow-ups Work Queue', 'قائمة المتابعات اليومية')}</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {buckets.overdue.length > 0 && (
            <span className="chip chip-red">
              <span className="pulse-dot">●</span> {buckets.overdue.length} {tr('overdue', 'متأخرة')}
            </span>
          )}
          <button
            className="btn btn-ghost"
            style={{ fontSize: 10, padding: '4px 10px' }}
            onClick={fetchQueue}
            disabled={loading}
            title={tr('Refresh queue', 'تحديث القائمة')}
          >
            {loading ? '⏳' : '⟳'}
          </button>
        </span>
      </div>

      {/* Bucket tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '0 14px 12px', flexWrap: 'wrap' }}>
        {tabPill('overdue', tr('Overdue', 'المتأخرة'), '🔥', buckets.overdue.length, '#EF4444', '#fff')}
        {tabPill('today', tr('Due Today', 'اليوم'), '📌', buckets.today.length, '#C8961A', '#071422')}
        {tabPill('upcoming', tr('Upcoming', 'القادمة'), '🗓️', buckets.upcoming.length, '#1E88D9', '#fff')}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 10,
            padding: '8px 12px',
            margin: '0 14px 12px',
            fontSize: 11,
            color: '#FCA5A5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', fontWeight: 700 }} aria-label="Dismiss error">✕</button>
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 11, color: 'var(--tx-f)', margin: '0 14px 12px', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="pulse-dot" style={{ color: 'var(--gold)' }}>●</span> {tr('Loading follow-ups from Supabase…', 'جارٍ تحميل المتابعات…')}
        </div>
      )}

      {!loading && visible.length === 0 && !error && (
        <div style={{ margin: '0 14px 14px', padding: '18px 14px', textAlign: 'center', fontSize: 12, color: 'var(--tx-f)', border: '1px dashed var(--bd)', borderRadius: 10 }}>
          {tab === 'overdue'
            ? tr('No overdue follow-ups — the queue is clear. 🎉', 'لا توجد متابعات متأخرة — القائمة نظيفة. 🎉')
            : tab === 'today'
              ? tr('Nothing due today. Overdue items, if any, appear in the red tab.', 'لا يوجد شيء مستحق اليوم. المتأخرات تظهر في التبويب الأحمر.')
              : tr('No upcoming follow-ups scheduled.', 'لا توجد متابعات قادمة مجدولة.')}
        </div>
      )}

      {visible.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{tr('Priority', 'الأولوية')}</th>
                <th>{tr('Task', 'المهمة')}</th>
                <th>{tr('Client', 'العميل')}</th>
                <th>{tr('Source', 'المصدر')}</th>
                <th>{tr('Due', 'الاستحقاق')}</th>
                <th style={{ textAlign: 'end' }}>{tr('Actions', 'إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f: any) => {
                const lead = leadById.get(String(f.leadId));
                const type = TYPE_META[f.type] || TYPE_META.other;
                const prio = PRIORITY_META[f.priority] || PRIORITY_META.medium;
                const late = tab === 'overdue' ? Math.max(daysLate(f.dueAt), 0) : 0;
                const busy = busyId === f.id;
                return (
                  <tr key={f.id} style={busy ? { opacity: 0.55 } : undefined}>
                    <td>
                      <span className={`chip ${prio.cls}`} style={{ fontSize: 9 }}>{prio[ar ? 'ar' : 'en']}</span>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{type.icon} {f.title || tr('Follow-up', 'متابعة')}</div>
                      {f.notes && <div style={{ fontSize: 10, color: 'var(--tx-f)', marginTop: 2 }}>{f.notes}</div>}
                    </td>
                    <td>
                      {lead ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{lead.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--tx-f)', direction: 'ltr' }}>{lead.phone || '—'}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--tx-f)' }}>
                          {String(f.leadId || '').slice(0, 8) || tr('Unknown', 'غير معروف')}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 10 }}>{lead?.source || '—'}</td>
                    <td>
                      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}>{fmtDue(f.dueAt, ar)}</div>
                      {late > 0 && (
                        <div style={{ fontSize: 10, color: '#F87171', fontWeight: 700 }}>
                          {late === 1 ? tr('1 day late', 'متأخرة يوم واحد') : tr(`${late} days late`, `متأخرة ${late} يوم`)}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 10, padding: '3px 8px', marginInlineEnd: 4 }}
                        disabled={busy}
                        onClick={() => complete(f)}
                        title={tr('Mark completed', 'إتمام المتابعة')}
                      >
                        ✓ {tr('Done', 'تم')}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 10, padding: '3px 8px' }}
                        disabled={busy}
                        onClick={() => snooze(f, 1)}
                        title={tr('Postpone by 1 day', 'تأجيل يوم')}
                      >
                        +1d
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 10, padding: '3px 8px' }}
                        disabled={busy}
                        onClick={() => snooze(f, 3)}
                        title={tr('Postpone by 3 days', 'تأجيل 3 أيام')}
                      >
                        +3d
                      </button>
                      {lead?.phone && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 10, padding: '3px 8px', marginInlineStart: 4 }}
                          disabled={busy}
                          onClick={() => openWhatsApp(lead, f)}
                          title={tr('Open WhatsApp', 'فتح واتساب')}
                        >
                          💬
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--tx-f)', margin: '10px 14px 14px', fontFamily: 'JetBrains Mono' }}>
        {tr(
          `${buckets.overdue.length} overdue · ${buckets.today.length} due today · ${buckets.upcoming.length} upcoming — live from public.followups`,
          `${buckets.overdue.length} متأخرة · ${buckets.today.length} اليوم · ${buckets.upcoming.length} قادمة — مباشرة من قاعدة البيانات`
        )}
      </div>
    </div>
  );
}
