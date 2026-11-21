'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Listing Waiting List (admin window)
 * ───────────────────────────────────────────────────────────────────────────
 * Triage for everything the WhatsApp Station harvests. One row = one raw
 * broker message, parsed (compound/type/price/area) and privacy-masked.
 *
 *   Approve → POST /api/admin/waiting-list {action:'approve'}
 *             creates public.listings row (REVIEW_REQUIRED staging) →
 *             publish gate → PF ad when eligible → Google Sheet row →
 *             public site + map pick it up (publish-status RLS gate).
 *   Reject  → status REJECTED (stays audit-visible).
 *   Similar → RAG (768-d Gemini vector) over LIVE inventory — surfaces
 *             duplicates and near-matches before you approve.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useState } from 'react';

interface WaitingItem {
  id: string;
  code: string;
  source: string;
  group_name: string;
  broker_name: string;
  broker_phone_masked: string;
  raw_message: string;
  extracted: {
    compound?: string; property_type?: string; deal_type?: string;
    price_egp?: number; area_sqm?: number; bedrooms?: number;
    confidence?: number; photos_count?: number; is_request?: boolean;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IMPORTED';
  listing_id: string | null;
  created_at: string;
}

interface GateCheck { condition: string; label: string; passed: boolean; detail: string }

interface ApproveResult {
  success: boolean;
  status?: string;
  listingId?: string;
  gate?: { eligible?: boolean; checks?: GateCheck[]; failures?: string[] };
  publish?: Record<string, unknown>;
  sheet?: { ok: boolean; detail?: string };
  note?: string;
  error?: string;
  detail?: string;
}

const STATUSES = ['PENDING', 'APPROVED', 'IMPORTED', 'REJECTED'] as const;
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#D4AF37', APPROVED: '#10B981', IMPORTED: '#1E88D9', REJECTED: '#E63946',
};

const fmtPrice = (n?: number) =>
  n && n > 0 ? new Intl.NumberFormat('en-EG').format(n) : '—';

export default function ListingWaitingListView({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const [items, setItems] = useState<WaitingItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>('PENDING');
  const [loading, setLoading] = useState(true);
  const [notMigrated, setNotMigrated] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [similar, setSimilar] = useState<Record<string, Array<{ id?: string; compound?: string; similarity?: number; title?: string; code?: string }>>>({});
  const [approveResult, setApproveResult] = useState<{ id: string; res: ApproveResult } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/waiting-list?status=${filter}&limit=200`, { cache: 'no-store' });
      const json = await res.json();
      if (json.notMigrated) setNotMigrated(true);
      setItems(Array.isArray(json.items) ? json.items : []);
      if (json.counts) setCounts(json.counts);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'approve' | 'reject' | 'similar') => {
    setBusyId(id);
    setApproveResult(null);
    try {
      const res = await fetch('/api/admin/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      const json = await res.json() as ApproveResult & { matches?: Array<Record<string, unknown>> };
      if (action === 'similar') {
        setSimilar((s) => ({ ...s, [id]: (json.matches as typeof s[string]) || [] }));
        if (!json.matches) setApproveResult({ id, res: json });
      } else {
        setApproveResult({ id, res: json });
        load();
      }
    } catch (err) {
      setApproveResult({ id, res: { success: false, error: (err as Error).message } });
    } finally {
      setBusyId(null);
    }
  };

  if (notMigrated) {
    return (
      <div className="card fade-up" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 30 }}>🗄️</div>
        <h2 style={{ margin: '8px 0' }}>{isAr ? 'قائمة الانتظار غير مهيأة بعد' : 'Waiting list is not provisioned yet'}</h2>
        <p style={{ fontSize: 13, opacity: 0.75, maxWidth: 560, margin: '0 auto' }}>
          {isAr
            ? 'طبّق ملف الترحيل supabase/migrations/20261120_052_listing_waiting_list.sql على قاعدة Supabase ثم أعد تحميل الصفحة.'
            : 'Apply supabase/migrations/20261120_052_listing_waiting_list.sql to the Supabase database, then reload.'}
        </p>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style jsx>{`
        @keyframes wlIn { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: none;} }
        .wl-row { animation: wlIn .35s ease both; }
        .wl-chip { transition: transform .18s ease, box-shadow .18s ease; }
        .wl-chip:hover { transform: translateY(-1px); }
      `}</style>

      <div className="card" style={{ padding: '16px 20px' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          ⏳ {isAr ? 'قائمة الانتظار — معاينة عروض واتساب قبل النشر' : 'Listing Waiting List — WhatsApp intake triage'}
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, opacity: 0.7 }}>
          {isAr
            ? 'اعتمد → يُنشأ العقار في المخزون، بوابة النشر تقرر إعلان Property Finder، يُكتب في جوجل شيت، ويظهر في الموقع والخريطة تلقائياً.'
            : 'Approve → listing row created, publish gate decides the Property Finder ad, the Google Sheet gets the row, and site + map pick it up automatically.'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="wl-chip"
              style={{
                fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--bd)',
                background: filter === s ? STATUS_COLOR[s] : 'transparent', color: filter === s ? '#07111E' : 'inherit',
              }}
            >
              {s} ({counts[s] ?? 0})
            </button>
          ))}
          <span style={{ fontSize: 12, opacity: 0.6, alignSelf: 'center' }}>Σ {counts.total ?? 0}</span>
        </div>
      </div>

      {approveResult && (
        <div className="card fade-up" style={{ padding: 16, borderColor: approveResult.res.success ? 'var(--gold-luxury,#D4AF37)' : '#E63946' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            {approveResult.res.success ? '✅ ' + (approveResult.res.note || '') : '⚠️ ' + (approveResult.res.error || 'Action failed')}
            {approveResult.res.detail ? ` — ${approveResult.res.detail}` : ''}
          </div>
          {approveResult.res.gate?.checks?.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 6, fontSize: 12 }}>
              {approveResult.res.gate.checks.map((c) => (
                <div key={c.condition} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ color: c.passed ? '#10B981' : '#E63946', fontWeight: 800 }}>{c.passed ? '✓' : '✗'}</span>
                  <span style={{ opacity: 0.8 }}>{c.label}{c.detail ? ` — ${c.detail}` : ''}</span>
                </div>
              ))}
            </div>
          ) : null}
          {approveResult.res.sheet ? (
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Google Sheet: {approveResult.res.sheet.ok ? 'row appended ✓' : `not written — ${approveResult.res.sheet.detail || 'check GOOGLE_SERVICE_ACCOUNT_* env'}`}
            </div>
          ) : null}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 720 }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.65 }}>
              <th style={th}>Code</th>
              <th style={th}>{isAr ? 'المجموعة' : 'Group'}</th>
              <th style={th}>{isAr ? 'المجمع' : 'Compound'}</th>
              <th style={th}>{isAr ? 'النوع' : 'Type'}</th>
              <th style={th}>{isAr ? 'الصفقة' : 'Deal'}</th>
              <th style={th}>{isAr ? 'السعر' : 'Price'}</th>
              <th style={th}>{isAr ? 'مساحة' : 'Area'}</th>
              <th style={th}>{isAr ? 'الثقة' : 'Conf.'}</th>
              <th style={th}>{isAr ? 'الحالة' : 'Status'}</th>
              <th style={{ ...th, textAlign: 'right' }}>{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: 22, textAlign: 'center', opacity: 0.6 }}>{isAr ? 'تحميل…' : 'Loading…'}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 22, textAlign: 'center', opacity: 0.6 }}>
                {isAr ? 'لا عناصر — شغّل الحصاد من محطة واتساب.' : 'Nothing here yet — run a harvest from the WhatsApp Station.'}
              </td></tr>
            ) : items.map((it) => {
              const ex = it.extracted || {};
              return (
                <React.Fragment key={it.id}>
                  <tr className="wl-row" style={{ borderTop: '1px solid var(--bd)' }}>
                    <td style={td}><span style={{ fontFamily: 'monospace' }}>{it.code}</span><div style={{ fontSize: 10, opacity: 0.5 }}>{new Date(it.created_at).toLocaleString()}</div></td>
                    <td style={td}>{it.group_name}<div style={{ fontSize: 10, opacity: 0.5 }}>{it.broker_name || '—'} {it.broker_phone_masked || ''}</div></td>
                    <td style={td}>{ex.compound || '—'}</td>
                    <td style={td}>{ex.property_type || '—'}</td>
                    <td style={td}>{ex.deal_type === 'rent' ? (isAr ? 'إيجار' : 'rent') : (isAr ? 'بيع' : 'sale')}</td>
                    <td style={td}>{fmtPrice(ex.price_egp)}</td>
                    <td style={td}>{ex.area_sqm ? `${ex.area_sqm} ㎡` : '—'}</td>
                    <td style={td}>{typeof ex.confidence === 'number' ? `${Math.round(ex.confidence * 100)}%` : '—'}</td>
                    <td style={td}><span className="wl-chip" style={{ color: STATUS_COLOR[it.status], fontWeight: 800, fontSize: 11 }}>{it.status}</span></td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {it.status === 'PENDING' && (
                        <>
                          <button className="btn" disabled={busyId === it.id} onClick={() => act(it.id, 'approve')} style={{ fontWeight: 800, background: 'var(--gold-luxury,#D4AF37)', color: '#07111E', border: 'none', padding: '5px 12px', borderRadius: 6, marginRight: 6, cursor: 'pointer' }}>
                            {busyId === it.id ? '…' : isAr ? 'اعتماد' : 'Approve'}
                          </button>
                          <button className="btn" disabled={busyId === it.id} onClick={() => act(it.id, 'reject')} style={{ padding: '5px 12px', borderRadius: 6, marginRight: 6, color: '#E63946' }}>
                            {isAr ? 'رفض' : 'Reject'}
                          </button>
                        </>
                      )}
                      <button className="btn" disabled={busyId === it.id} onClick={() => act(it.id, 'similar')} style={{ padding: '5px 12px', borderRadius: 6 }}>
                        🧠 {isAr ? 'مشابه' : 'Similar'}
                      </button>
                      <button className="btn" onClick={() => setExpanded(expanded === it.id ? null : it.id)} style={{ padding: '5px 12px', borderRadius: 6, marginLeft: 6 }}>
                        {expanded === it.id ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {expanded === it.id && (
                    <tr>
                      <td colSpan={10} style={{ background: 'rgba(212,175,55,.05)', padding: '12px 18px', fontSize: 12.5 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{isAr ? 'الرسالة الأصلية (مقنّعة الأرقام):' : 'Raw message (numbers masked):'}</div>
                        <div style={{ whiteSpace: 'pre-wrap', opacity: 0.85, maxHeight: 160, overflow: 'auto' }}>{it.raw_message}</div>
                        {similar[it.id] && (
                          <>
                            <div style={{ fontWeight: 700, margin: '10px 0 4px' }}>🧠 {isAr ? 'أقرب العناصر الحية (RAG):' : 'Closest LIVE inventory (RAG):'}</div>
                            {similar[it.id].length ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {similar[it.id].map((m, i) => (
                                  <div key={m.id || i} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>{m.code || m.id}</span>
                                    <span>{m.title || m.compound}</span>
                                    <span style={{ color: '#10B981', fontWeight: 700 }}>{typeof m.similarity === 'number' ? `${Math.round(m.similarity * 100)}%` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ opacity: 0.6 }}>{isAr ? 'لا تطابقات فوق 30% تشابه.' : 'No matches above 30% similarity.'}</div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 700, borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '9px 12px', verticalAlign: 'top' };
