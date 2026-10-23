'use client';

/**
 * ViewingsView — Phase 9 admin VIEWINGS board.
 *
 * 100% real data: GET /api/admin/viewings (canonical viewings + feedback
 * merged). No seeded demo rows — an empty database renders an honest empty
 * state. Actions call the real API:
 *   · Schedule / Complete / Cancel / No-show  → PATCH /api/admin/viewings/[id]
 *   · Sales report                           → PUT  /api/admin/viewings/[id]/feedback
 *   · Manager review                          → PATCH /api/admin/viewings/[id]/feedback
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VIEWING_STATUSES,
  UNIT_ACCURACY,
  CLIENT_REACTION,
  PRICE_REACTION,
  INTEREST_LEVEL,
  NEXT_ACTIONS,
  FEEDBACK_LABELS,
} from '@/lib/server/viewing-feedback-shared';

interface FeedbackRow {
  salesSubmittedAt: string | null;
  unitAccuracy: string | null;
  clientReaction: string | null;
  priceReaction: string | null;
  objections: { category: string; note?: string }[];
  interestLevel: string | null;
  nextAction: string | null;
  notes: string | null;
  clientRating: number | null;
  clientComment: string | null;
  wouldRecommend: boolean | null;
  surveySubmittedAt: string | null;
  reviewStatus: string;
  managerNotes: string | null;
}

interface ViewingRow {
  id: string;
  status: string;
  source: string;
  propertyCode: string | null;
  unitId: string | null;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  scheduledAt: string | null;
  numberPeople?: number | null;
  numberOfPeople?: number | null;
  message: string | null;
  notes: string | null;
  createdAt: string;
  feedback: FeedbackRow | null;
}

const STATUS_CHIP: Record<string, string> = {
  pending_approval: 'chip chip-amber',
  scheduled: 'chip chip-blue',
  completed: 'chip chip-green',
  cancelled: 'chip chip-red',
  no_show: 'chip chip-purple',
};

const OBJECTION_CATEGORIES = [
  'price',
  'size / layout',
  'location',
  'finishing',
  'view / floor',
  'availability',
  'payment terms',
  'other',
];

export default function ViewingsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [rows, setRows] = useState<ViewingRow[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [banner, setBanner] = useState<string | null>(null);

  // Schedule modal
  const [scheduleFor, setScheduleFor] = useState<ViewingRow | null>(null);
  const [slotValue, setSlotValue] = useState('');
  const [locationValue, setLocationValue] = useState('');

  // Feedback modal
  const [feedbackFor, setFeedbackFor] = useState<ViewingRow | null>(null);
  const [form, setForm] = useState({
    unitAccuracy: 'exact',
    clientReaction: 'positive',
    priceReaction: 'not_discussed',
    interestLevel: 'warm',
    nextAction: 'follow_up',
    notes: '',
  });
  const [objections, setObjections] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/admin/viewings');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setRows(Array.isArray(body.viewings) ? body.viewings : []);
      setPhase('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const s of VIEWING_STATUSES) c[s] = rows.filter((r) => r.status === s).length;
    return c;
  }, [rows]);

  const transition = useCallback(
    async (row: ViewingRow, status: string, extra: Record<string, unknown> = {}) => {
      setBusy(true);
      setBanner(null);
      try {
        const res = await fetch(`/api/admin/viewings/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, ...extra }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setBanner(
          status === 'completed' && body.surveyQueued
            ? isAr
              ? 'اكتملت المعاينة — تم إرسال رابط استطلاع العميل عبر واتساب.'
              : 'Viewing completed — client survey link queued on WhatsApp.'
            : isAr
              ? `تم تحديث المعاينة إلى ${status}.`
              : `Viewing updated to ${status}.`
        );
        await load();
      } catch (err) {
        setBanner(`⚠ ${err instanceof Error ? err.message : 'Action failed'}`);
      } finally {
        setBusy(false);
      }
    },
    [isAr, load]
  );

  const openSchedule = (row: ViewingRow) => {
    setScheduleFor(row);
    setSlotValue(row.scheduledAt ? row.scheduledAt.slice(0, 16) : '');
    setLocationValue('');
  };

  const confirmSchedule = async () => {
    if (!scheduleFor) return;
    if (!slotValue) {
      setBanner(isAr ? '⚠ اختر موعدًا أولًا.' : '⚠ Pick a slot first.');
      return;
    }
    await transition(scheduleFor, 'scheduled', {
      scheduledAt: new Date(slotValue).toISOString(),
      ...(locationValue ? { location: locationValue } : {}),
    });
    setScheduleFor(null);
  };

  const openFeedback = (row: ViewingRow) => {
    setFeedbackFor(row);
    setManagerNotes(row.feedback?.managerNotes ?? '');
    setObjections((row.feedback?.objections ?? []).map((o) => o.category));
    if (row.feedback?.salesSubmittedAt) {
      setForm({
        unitAccuracy: row.feedback.unitAccuracy ?? 'exact',
        clientReaction: row.feedback.clientReaction ?? 'positive',
        priceReaction: row.feedback.priceReaction ?? 'not_discussed',
        interestLevel: row.feedback.interestLevel ?? 'warm',
        nextAction: row.feedback.nextAction ?? 'follow_up',
        notes: row.feedback.notes ?? '',
      });
    } else {
      setForm({
        unitAccuracy: 'exact',
        clientReaction: 'positive',
        priceReaction: 'not_discussed',
        interestLevel: 'warm',
        nextAction: 'follow_up',
        notes: '',
      });
    }
  };

  const saveFeedback = async () => {
    if (!feedbackFor) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/viewings/${feedbackFor.id}/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, objections: objections.map((category) => ({ category })) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setBanner(isAr ? 'تم حفظ تقرير المعاينة.' : 'Sales report saved.');
      setFeedbackFor(null);
      await load();
    } catch (err) {
      setBanner(`⚠ ${err instanceof Error ? err.message : 'Save failed'}`);
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (reviewStatus: 'approved' | 'needs_changes') => {
    if (!feedbackFor) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/viewings/${feedbackFor.id}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus, ...(managerNotes ? { managerNotes } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setBanner(
        reviewStatus === 'approved'
          ? isAr ? 'تم اعتماد التقييم المشترك.' : 'Combined analysis approved.'
          : isAr ? 'تم إرجاع التقرير لتعديلات.' : 'Report returned for changes.'
      );
      setFeedbackFor(null);
      await load();
    } catch (err) {
      setBanner(`⚠ ${err instanceof Error ? err.message : 'Review failed'}`);
    } finally {
      setBusy(false);
    }
  };

  const label = (v: string | null) => (v ? FEEDBACK_LABELS[v] ?? v : '—');

  return (
    <div className="fade-up" style={{ padding: '8px 4px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: isAr ? "'Cairo',sans-serif" : "'Cormorant Garamond',serif", fontSize: '1.55rem', color: 'var(--tx-s)', margin: 0 }}>
            {isAr ? 'المعاينات · الدورة الكاملة' : 'Viewings · Full Loop'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--tx-m)', marginTop: 4 }}>
            {isAr
              ? 'طلب ← تأكيد ← معاينة ← تقرير المبيعات + استطلاع العميل ← اعتماد المدير'
              : 'Request → Slot → Viewing → Sales report + client survey → Manager approval'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={phase === 'loading'}>
          {phase === 'loading' ? (isAr ? 'جارٍ التحميل…' : 'Loading…') : isAr ? '↻ تحديث' : '↻ Refresh'}
        </button>
      </div>

      {banner && (
        <div style={{ padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'var(--surf2)', border: '1px solid var(--bd)', fontSize: 12.5, color: 'var(--tx)' }}>
          {banner}
        </div>
      )}

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          className={`chip ${statusFilter === 'all' ? 'chip-blue' : ''}`}
          style={{ cursor: 'pointer', opacity: statusFilter === 'all' ? 1 : 0.7 }}
          onClick={() => setStatusFilter('all')}
        >
          {isAr ? 'الكل' : 'All'} · {counts.all}
        </button>
        {VIEWING_STATUSES.map((s) => (
          <button
            key={s}
            className={STATUS_CHIP[s] ?? 'chip'}
            style={{ cursor: 'pointer', opacity: statusFilter === s ? 1 : 0.7 }}
            onClick={() => setStatusFilter(s)}
          >
            {s.replace(/_/g, ' ')} · {counts[s] ?? 0}
          </button>
        ))}
      </div>

      {phase === 'loading' && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx-m)', fontSize: 13 }}>
          {isAr ? 'جارٍ تحميل المعاينات من قاعدة البيانات…' : 'Loading viewings from the database…'}
        </div>
      )}

      {phase === 'error' && (
        <div style={{ padding: 24, borderRadius: 14, border: '1px solid rgba(230,57,70,.35)', background: 'rgba(230,57,70,.08)' }}>
          <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>
            {isAr ? 'تعذّر تحميل المعاينات' : 'Failed to load viewings'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--tx-m)', fontFamily: 'JetBrains Mono, monospace' }}>{errorMsg}</div>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={load}>
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {phase === 'ready' && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--bd)', borderRadius: 16, color: 'var(--tx-m)', fontSize: 13 }}>
          {rows.length === 0
            ? isAr
              ? 'لا توجد معاينات بعد — ستظهر هنا عندما يطلب العملاء معاينة من الموقع أو عن طريق الوكيل.'
              : 'No viewings yet — they appear here the moment a client requests one from the site or an agent books one.'
            : isAr
              ? 'لا توجد معاينات بهذه الحالة.'
              : 'No viewings in this status.'}
        </div>
      )}

      {phase === 'ready' && filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: 980 }}>
            <thead>
              <tr>
                <th>{isAr ? 'التاريخ' : 'Date'}</th>
                <th>{isAr ? 'الزائر' : 'Visitor'}</th>
                <th>{isAr ? 'الوحدة' : 'Unit'}</th>
                <th>{isAr ? 'المصدر' : 'Source'}</th>
                <th>{isAr ? 'الحالة' : 'Status'}</th>
                <th>{isAr ? 'التقرير' : 'Sales report'}</th>
                <th>{isAr ? 'استطلاع العميل' : 'Client survey'}</th>
                <th>{isAr ? 'الاعتماد' : 'Review'}</th>
                <th>{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    {r.scheduledAt
                      ? new Date(r.scheduledAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })
                      : r.preferredDate
                        ? `${r.preferredDate}${r.preferredTime ? ` · ${r.preferredTime}` : ''}`
                        : new Date(r.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.visitorName ?? '—'}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--tx-m)' }}>
                      {r.visitorPhone ?? ''}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    {r.propertyCode ?? r.unitId ?? '—'}
                  </td>
                  <td style={{ fontSize: 11.5 }}>{r.source ?? '—'}</td>
                  <td><span className={STATUS_CHIP[r.status] ?? 'chip'}>{r.status.replace(/_/g, ' ')}</span></td>
                  <td>
                    {r.feedback?.salesSubmittedAt ? (
                      <span className="chip chip-green" title={label(r.feedback.unitAccuracy)}>
                        {label(r.feedback.interestLevel)} · {label(r.feedback.nextAction)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--tx-m)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {r.feedback?.surveySubmittedAt ? (
                      <span className="chip chip-blue">{'★'.repeat(r.feedback.clientRating ?? 0)}</span>
                    ) : (
                      <span style={{ color: 'var(--tx-m)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {r.feedback?.salesSubmittedAt ? (
                      <span className={`chip ${r.feedback.reviewStatus === 'approved' ? 'chip-green' : r.feedback.reviewStatus === 'needs_changes' ? 'chip-red' : 'chip-amber'}`}>
                        {r.feedback.reviewStatus.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--tx-m)' }}>—</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.status === 'pending_approval' && (
                      <>
                        <button className="btn btn-gold" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => openSchedule(r)} disabled={busy}>
                          {isAr ? 'تأكيد' : 'Schedule'}
                        </button>{' '}
                        <button className="btn btn-red" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => transition(r, 'cancelled')} disabled={busy}>
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                      </>
                    )}
                    {r.status === 'scheduled' && (
                      <>
                        <button className="btn btn-green" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => transition(r, 'completed')} disabled={busy}>
                          {isAr ? 'اكتملت' : 'Complete'}
                        </button>{' '}
                        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => transition(r, 'no_show')} disabled={busy}>
                          {isAr ? 'لم يحضر' : 'No-show'}
                        </button>{' '}
                        <button className="btn btn-red" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => transition(r, 'cancelled')} disabled={busy}>
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                      </>
                    )}
                    {r.status === 'completed' && (
                      <button className="btn btn-gold" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => openFeedback(r)}>
                        {isAr ? 'التقرير/التقييم' : 'Report / Review'}
                      </button>
                    )}
                    {(r.status === 'cancelled' || r.status === 'no_show') && (
                      <span style={{ color: 'var(--tx-m)', fontSize: 11 }}>{isAr ? 'مغلقة' : 'closed'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Schedule modal ─────────────────────────────────────────────── */}
      {scheduleFor && (
        <div className="modal-ov" onClick={() => setScheduleFor(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <strong>{isAr ? 'تأكيد موعد المعاينة' : 'Confirm viewing slot'}</strong>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 12.5, color: 'var(--tx-m)' }}>
                {scheduleFor.visitorName ?? 'Visitor'} · {scheduleFor.propertyCode ?? scheduleFor.unitId ?? ''}
              </div>
              <label style={{ fontSize: 11, color: 'var(--tx-m)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {isAr ? 'الموعد' : 'Slot'}
                <input
                  className="f-in"
                  type="datetime-local"
                  value={slotValue}
                  onChange={(e) => setSlotValue(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              </label>
              <label style={{ fontSize: 11, color: 'var(--tx-m)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {isAr ? 'المكان (اختياري)' : 'Location (optional)'}
                <input
                  className="f-in"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  placeholder={isAr ? 'مثال: بوابة الكمبوند' : 'e.g. compound gate'}
                  style={{ marginTop: 6 }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setScheduleFor(null)}>
                  {isAr ? 'تراجع' : 'Back'}
                </button>
                <button className="btn btn-gold" onClick={confirmSchedule} disabled={busy}>
                  {isAr ? 'تأكيد' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback modal (combined analysis) ─────────────────────────── */}
      {feedbackFor && (
        <div className="modal-ov" onClick={() => setFeedbackFor(null)}>
          <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <strong>
                {isAr ? 'التقييم المشترك · ' : 'Combined analysis · '}
                {feedbackFor.visitorName ?? 'Visitor'} · {feedbackFor.propertyCode ?? feedbackFor.unitId ?? ''}
              </strong>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 18 }}>
              {/* Sales side */}
              <section>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--gold)', marginBottom: 10 }}>
                  {isAr ? '① تقرير المبيعات' : '① Sales report'}
                </div>
                <div className="grid-2">
                  <label style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                    {isAr ? 'دقة الوحدة' : 'Unit accuracy'}
                    <select className="f-in" style={{ marginTop: 4 }} value={form.unitAccuracy} onChange={(e) => setForm((f) => ({ ...f, unitAccuracy: e.target.value }))}>
                      {UNIT_ACCURACY.map((v) => <option key={v} value={v}>{FEEDBACK_LABELS[v]}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                    {isAr ? 'تفاعل العميل' : 'Client reaction'}
                    <select className="f-in" style={{ marginTop: 4 }} value={form.clientReaction} onChange={(e) => setForm((f) => ({ ...f, clientReaction: e.target.value }))}>
                      {CLIENT_REACTION.map((v) => <option key={v} value={v}>{FEEDBACK_LABELS[v]}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                    {isAr ? 'رد فعل السعر' : 'Price reaction'}
                    <select className="f-in" style={{ marginTop: 4 }} value={form.priceReaction} onChange={(e) => setForm((f) => ({ ...f, priceReaction: e.target.value }))}>
                      {PRICE_REACTION.map((v) => <option key={v} value={v}>{FEEDBACK_LABELS[v]}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--tx-m)' }}>
                    {isAr ? 'مستوى الاهتمام' : 'Interest level'}
                    <select className="f-in" style={{ marginTop: 4 }} value={form.interestLevel} onChange={(e) => setForm((f) => ({ ...f, interestLevel: e.target.value }))}>
                      {INTEREST_LEVEL.map((v) => <option key={v} value={v}>{FEEDBACK_LABELS[v]}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--tx-m)', marginBottom: 6 }}>{isAr ? 'الاعتراضات' : 'Objections'}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {OBJECTION_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        className={`chip ${objections.includes(c) ? 'chip-red' : ''}`}
                        style={{ cursor: 'pointer', opacity: objections.includes(c) ? 1 : 0.65 }}
                        onClick={() =>
                          setObjections((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]))
                        }
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginTop: 10 }}>
                  {isAr ? 'الإجراء التالي' : 'Next action'}
                  <select className="f-in" style={{ marginTop: 4 }} value={form.nextAction} onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))}>
                    {NEXT_ACTIONS.map((v) => <option key={v} value={v}>{FEEDBACK_LABELS[v]}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginTop: 10 }}>
                  {isAr ? 'ملاحظات' : 'Notes'}
                  <textarea className="f-in" style={{ marginTop: 4, minHeight: 70 }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </label>
                <button className="btn btn-gold" style={{ marginTop: 10 }} onClick={saveFeedback} disabled={busy}>
                  {isAr ? 'حفظ تقرير المبيعات' : 'Save sales report'}
                </button>
              </section>

              {/* Client side (read-only — submitted by the client) */}
              <section style={{ borderTop: '1px solid var(--bd)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--blue)', marginBottom: 10 }}>
                  {isAr ? '② استطلاع العميل' : '② Client survey'}
                </div>
                {feedbackFor.feedback?.surveySubmittedAt ? (
                  <div style={{ fontSize: 12.5, display: 'grid', gap: 6 }}>
                    <div>
                      <span className="chip chip-blue">{'★'.repeat(feedbackFor.feedback.clientRating ?? 0)}</span>{' '}
                      {feedbackFor.feedback.wouldRecommend === true && <span className="chip chip-green">{isAr ? 'سيوصي بنا' : 'Would recommend'}</span>}
                      {feedbackFor.feedback.wouldRecommend === false && <span className="chip chip-amber">{isAr ? 'لن يوصي بنا' : 'Would not recommend'}</span>}
                    </div>
                    {feedbackFor.feedback.clientComment && (
                      <div style={{ fontStyle: 'italic', color: 'var(--tx-m)' }}>“{feedbackFor.feedback.clientComment}”</div>
                    )}
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--tx-m)' }}>
                      {new Date(feedbackFor.feedback.surveySubmittedAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--tx-m)' }}>
                    {isAr ? 'لم يُرسل العميل الاستطلاع بعد (يُرسل رابطه عبر واتساب عند إكمال المعاينة).' : 'Not submitted yet — the survey link is WhatsApp-queued when the viewing is completed.'}
                  </div>
                )}
              </section>

              {/* Manager review */}
              {feedbackFor.feedback?.salesSubmittedAt && (
                <section style={{ borderTop: '1px solid var(--bd)', paddingTop: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--emerald)', marginBottom: 10 }}>
                    {isAr ? '③ اعتماد المدير' : '③ Manager review'}
                  </div>
                  <textarea
                    className="f-in"
                    style={{ minHeight: 56 }}
                    placeholder={isAr ? 'ملاحظات المدير (اختياري)…' : 'Manager notes (optional)…'}
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => submitReview('needs_changes')} disabled={busy}>
                      {isAr ? 'إعادة تعديل' : 'Request changes'}
                    </button>
                    <button className="btn btn-green" onClick={() => submitReview('approved')} disabled={busy}>
                      {isAr ? 'اعتماد' : 'Approve'}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
