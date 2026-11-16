'use client';
/**
 * SIERRA ESTATES — CRM · DEALS PIPELINE KANBAN (live, on public.deals)
 *
 * The admin SPA's "Deals Pipeline" tab previously rendered a designed kanban
 * fed by a hardcoded (and honestly empty) local array — every move was
 * local-state only and evaporated on refresh. This component is the live
 * replacement, wired end to end to the deals table:
 *
 *   · Columns are the public.deals CHECK-constraint stages (lib/server/deal-stages).
 *   · Cards come from GET /api/admin/deals (server joins the client lead and
 *     the unit listing onto every deal).
 *   · Moves (drag & drop on desktop, ◀/▶ buttons on touch) PATCH
 *     /api/admin/deals/[id] optimistically and roll back with a visible
 *     error banner if the server rejects the write.
 *   · "+ New Deal" creates a real deal from a CRM lead (POST /api/admin/deals).
 *
 * Rules inherited from the portal:
 *   · ANTI-FABRICATION: no invented deals; loading/empty/error states are
 *     honest (see data-constants.ts Master Rule 5).
 *   · The server is the source of truth; pipeline value is COMPUTED from the
 *     loaded rows — never a marketing literal.
 *   · Bilingual EN/AR via the same `T('lang')` convention the SPA uses.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

/* ── types & constants ────────────────────────────────────────────────── */

interface DealClient {
  id: string;
  name: string;
  phone: string;
  source: string | null;
}

interface DealListing {
  id: string;
  code: string | null;
  compound: string | null;
  title: string | null;
  status: string | null;
}

export interface DealCard {
  id: string;
  leadId: string | null;
  listingId: string | null;
  agentId: string | null;
  stage: string;
  dealValue: number;
  commissionPercentage: number;
  commissionAmount: number;
  closingProbability: number;
  targetClosingDate: string | null;
  notes: string;
  client: DealClient | null;
  listing: DealListing | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Column set = the stage CHECK on public.deals (mirrors lib/server/deal-stages). */
const STAGES: Array<{ id: string; en: string; ar: string; c: string; icon: string }> = [
  { id: 'proposal', en: 'Proposal', ar: 'عرض سعر', c: '#1E88D9', icon: '📄' },
  { id: 'viewing', en: 'Viewing', ar: 'معاينة', c: '#7C3AED', icon: '🏠' },
  { id: 'offer_made', en: 'Offer Made', ar: 'تم التقديم', c: '#C8961A', icon: '🤝' },
  { id: 'under_contract', en: 'Under Contract', ar: 'تحت التعاقد', c: '#f59e0b', icon: '📜' },
  { id: 'closing', en: 'Closing', ar: 'الإغلاق', c: '#E9C176', icon: '🔑' },
  { id: 'closed_won', en: 'Closed Won', ar: 'مكتملة ✓', c: '#34D399', icon: '🏆' },
  { id: 'closed_lost', en: 'Closed Lost', ar: 'ملغاة ✗', c: '#E63946', icon: '✖' },
];

const CLOSED = new Set(['closed_won', 'closed_lost']);
const STAGE_IDS = STAGES.map((s) => s.id);

const SOURCE_CHIP: Record<string, { label: string; cls: string }> = {
  'property-finder': { label: '🏢 PF', cls: 'chip-amber' },
  website: { label: '🌐 Web', cls: 'chip-blue' },
  whatsapp: { label: '💬 WA', cls: 'chip-green' },
};

function fmtEGP(v: number): string {
  if (!Number.isFinite(v) || v === 0) return 'EGP 0';
  if (v >= 1_000_000) return `EGP ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `EGP ${(v / 1_000).toFixed(0)}K`;
  return `EGP ${v.toFixed(0)}`;
}

function fmtDate(iso: string | null, ar: boolean): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
}

/* ── component ─────────────────────────────────────────────────────────── */

export default function DealsKanban({ T }: { T: any }) {
  const ar = T('lang') === 'ar';
  const [deals, setDeals] = useState<DealCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const busyRef = useRef(false);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/deals?limit=500');
      const data = await res.json();
      if (res.ok && data.success) {
        setDeals(data.deals ?? []);
        setLastSync(new Date());
      } else {
        setError(data?.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  /* ── stage move: optimistic + rollback (server is the source of truth) ── */
  const moveDeal = useCallback(
    (dealId: string, nextStage: string) => {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal || deal.stage === nextStage) return;
      const prevStage = deal.stage;
      busyRef.current = true;
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: nextStage } : d)));
      fetch(`/api/admin/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || `HTTP ${res.status}`);
          }
          setError(null);
        })
        .catch((e) => {
          setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: prevStage } : d)));
          setError(
            ar
              ? `تعذّر حفظ نقل الصفقة إلى «${nextStage}» — تم التراجع عن الحركة.`
              : `Could not move the deal to "${nextStage}" — change reverted. ${e.message ?? ''}`
          );
        })
        .finally(() => {
          busyRef.current = false;
        });
    },
    [deals, ar]
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, draggableId } = result;
      if (!destination) return; // dropped outside any column
      if (destination.droppableId === result.source.droppableId) return;
      moveDeal(draggableId, destination.droppableId);
    },
    [moveDeal]
  );

  /* ── computed KPI strip — from the loaded rows only ────────────────────── */
  const stats = useMemo(() => {
    const active = deals.filter((d) => !CLOSED.has(d.stage));
    const won = deals.filter((d) => d.stage === 'closed_won');
    const lost = deals.filter((d) => d.stage === 'closed_lost');
    const pipelineValue = active.reduce((s, d) => s + d.dealValue, 0);
    const weighted = active.reduce((s, d) => s + (d.dealValue * (d.closingProbability ?? 0)) / 100, 0);
    const commissionPipeline = active.reduce((s, d) => s + d.commissionAmount, 0);
    const commissionEarned = won.reduce((s, d) => s + d.commissionAmount, 0);
    return { active, won, lost, pipelineValue, weighted, commissionPipeline, commissionEarned };
  }, [deals]);

  const byStage = useMemo(() => {
    const m = new Map<string, DealCard[]>();
    for (const s of STAGE_IDS) m.set(s, []);
    for (const d of deals) {
      const bucket = m.has(d.stage) ? d.stage : 'proposal';
      m.get(bucket)!.push(d);
    }
    return m;
  }, [deals]);

  return (
    <div className="fade-up">
      {/* KPI strip — every number computed from the loaded public.deals rows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { l: ar ? 'قيمة الخط النشطة' : 'Active Pipeline Value', v: fmtEGP(stats.pipelineValue), c: 'var(--gold)' },
          { l: ar ? 'التوقع المرجّح' : 'Weighted Forecast', v: fmtEGP(stats.weighted), c: '#1E88D9' },
          { l: ar ? 'عمولات تحت الانتظار' : 'Commission Pipeline', v: fmtEGP(stats.commissionPipeline), c: '#7C3AED' },
          { l: ar ? 'عمولات مُحقّقة (مكتملة)' : 'Commission Earned (Won)', v: fmtEGP(stats.commissionEarned), c: '#34D399' },
          {
            l: ar ? 'الصفقات' : 'Deals',
            v: `${deals.length} ${ar ? 'إجمالي' : 'total'} · ${stats.active.length} ${ar ? 'نشطة' : 'active'}`,
            c: '#E9C176',
          },
        ].map((k) => (
          <div
            key={k.l}
            style={{ background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 14px', borderTop: `3px solid ${k.c}` }}
          >
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: k.c, marginBottom: 4 }}>{k.v}</div>
            <div style={{ fontSize: 9, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-gold" onClick={() => setShowNewDeal(true)} title={ar ? 'إنشاء صفقة من عميل' : 'Create a deal from a CRM lead'}>
          + {ar ? 'صفقة جديدة' : 'New Deal'}
        </button>
        <button className="btn btn-ghost" onClick={fetchDeals} disabled={loading}>
          ⟳ {ar ? 'تحديث' : 'Refresh'}
        </button>
        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontSize: 9.5, color: 'var(--tx-f)' }}>
          {loading
            ? ar ? 'جارٍ تحميل الصفقات…' : 'Loading deals…'
            : lastSync
              ? `${ar ? 'تمت المزامنة' : 'synced'} ${lastSync.toLocaleTimeString(ar ? 'ar-EG' : 'en-GB')} · public.deals`
              : ''}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10,
            padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#FCA5A5',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          }}
        >
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', fontWeight: 700 }} aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* honest empty state — no demo deals, no invented pipeline value */}
      {!loading && deals.length === 0 && !error && (
        <div className="card" style={{ padding: '28px 18px', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 34, marginBottom: 8, opacity: 0.6 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--tx)', marginBottom: 4 }}>
            {ar ? 'لا توجد صفقات مسجلة' : 'No deals on file'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--tx-m)', maxWidth: 480, margin: '0 auto' }}>
            {ar
              ? 'اللوحة متصلة بجدول الصفقات الحقيقي. أنشئ أول صفقة من عميل في CRM عبر زر «صفقة جديدة».'
              : 'This board is live on the deals table. Create the first deal from a CRM lead with "+ New Deal" — Sierra never displays demo clients or fabricated pipeline value.'}
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban">
          {STAGES.map((st) => {
            const stageDeals = byStage.get(st.id) ?? [];
            return (
              <Droppable droppableId={st.id} key={st.id}>
                {(dropProvided, dropSnapshot) => (
                  <div
                    className="kb-col"
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    style={
                      {
                        '--kbc': st.c,
                        minHeight: 240,
                        background: dropSnapshot.isDraggingOver ? 'rgba(200,150,26,0.05)' : undefined,
                        outline: dropSnapshot.isDraggingOver ? `1.5px dashed ${st.c}66` : undefined,
                        outlineOffset: -4,
                        borderRadius: 14,
                      } as React.CSSProperties
                    }
                  >
                    <div className="kb-hd">
                      <span className="kb-name" style={{ background: `${st.c}1c`, color: st.c }}>
                        {st.icon} {ar ? st.ar : st.en}
                      </span>
                      <span className="kb-count">{stageDeals.length}</span>
                    </div>
                    {stageDeals.map((d, idx) => (
                      <Draggable draggableId={d.id} index={idx} key={d.id}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            className="kb-card"
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              opacity: dragSnapshot.isDragging ? 0.85 : 1,
                              borderLeft: `3px solid ${st.c}`,
                            }}
                            title={d.notes || undefined}
                          >
                            <DealCardBody deal={d} ar={ar} onMove={moveDeal} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {dropProvided.placeholder}
                    {stageDeals.length === 0 && (
                      <div style={{ padding: '22px 12px', textAlign: 'center', fontSize: 10.5, color: 'var(--tx-f)' }}>
                        {ar ? 'اسحب صفقة إلى هنا' : 'Drop a deal here'}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {showNewDeal && (
        <NewDealModal
          ar={ar}
          onClose={() => setShowNewDeal(false)}
          onCreated={() => {
            setShowNewDeal(false);
            fetchDeals();
          }}
        />
      )}
    </div>
  );
}

/* ── card body (kept separate so the draggable wrapper stays lean) ──────── */

function DealCardBody({ deal, ar, onMove }: { deal: DealCard; ar: boolean; onMove: (id: string, stage: string) => void }) {
  const clientName = deal.client?.name ?? (ar ? 'صفقة غير مرتبطة بعميل' : 'Unlinked deal');
  const listingLabel = deal.listing ? deal.listing.code || deal.listing.compound || deal.listing.title : null;
  const sourceChip = deal.client?.source ? SOURCE_CHIP[deal.client.source] : null;
  const stageIdx = STAGE_IDS.indexOf(deal.stage);
  const prob = Math.max(0, Math.min(100, deal.closingProbability ?? 0));

  const waOpen = () => {
    const phone = (deal.client?.phone || '').replace(/[^0-9]/g, '');
    if (!phone) return;
    const msg = encodeURIComponent(
      ar
        ? `مرحباً ${clientName}، مستشار سييرا العقاري معك بخصوص صفقة${listingLabel ? ` ${listingLabel}` : ''} (${fmtEGP(deal.dealValue)}).`
        : `Hello ${clientName}, your Sierra Estates advisor here regarding the deal${listingLabel ? ` on ${listingLabel}` : ''} (${fmtEGP(deal.dealValue)}).`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {clientName}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8.5, color: 'var(--gold)', flexShrink: 0 }}>
          {ar ? 'احتمالية' : 'prob'} {prob}%
        </span>
      </div>

      {listingLabel && (
        <div style={{ fontSize: 10.5, color: 'var(--tx-m)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🏠 {listingLabel}
          {deal.listing?.compound && deal.listing.code ? ` · ${deal.listing.compound}` : ''}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: 'var(--tx-s)' }}>{fmtEGP(deal.dealValue)}</span>
        {sourceChip ? (
          <span className={`chip ${sourceChip.cls}`} style={{ fontSize: 8, padding: '2px 5px' }}>{sourceChip.label}</span>
        ) : (
          deal.commissionAmount > 0 && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8.5, color: 'var(--tx-f)' }}>
              {ar ? 'عمولة' : 'comm.'} {fmtEGP(deal.commissionAmount)}
            </span>
          )
        )}
      </div>

      {/* probability bar */}
      <div className="progress-bar" style={{ marginBottom: 6, height: 4 }}>
        <div className="progress-fill" style={{ width: `${prob}%` }} />
      </div>

      <div style={{ fontSize: 9, color: 'var(--tx-f)', marginBottom: 8, fontFamily: 'JetBrains Mono' }}>
        {ar ? 'هدف الإغلاق' : 'Target close'}: {fmtDate(deal.targetClosingDate, ar)}
      </div>
      <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--bd)', paddingTop: 6, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '2px 6px', fontSize: 9 }}
            disabled={stageIdx <= 0}
            onClick={() => stageIdx > 0 && onMove(deal.id, STAGE_IDS[stageIdx - 1])}
            title={ar ? 'إلى المرحلة السابقة' : 'Move to previous stage'}
            aria-label={ar ? 'إلى المرحلة السابقة' : 'Move to previous stage'}
          >
            ◀
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '2px 6px', fontSize: 9, color: 'var(--gold)', borderColor: 'var(--bd-s)' }}
            disabled={stageIdx >= STAGE_IDS.length - 1}
            onClick={() => stageIdx < STAGE_IDS.length - 1 && onMove(deal.id, STAGE_IDS[stageIdx + 1])}
            title={ar ? 'إلى المرحلة التالية' : 'Advance to next stage'}
            aria-label={ar ? 'إلى المرحلة التالية' : 'Advance to next stage'}
          >
            {ar ? 'التالية ▶' : 'Next ▶'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '2px 6px', fontSize: 9 }}
            onClick={() => window.open(`/api/closer/contract?id=${deal.id}`, '_blank', 'noopener,noreferrer')}
            title={ar ? 'عقد الصفقة (PDF)' : 'Deal contract (PDF)'}
            aria-label={ar ? 'عقد الصفقة' : 'Deal contract'}
          >
            📄
          </button>
          <button
            className="btn btn-green"
            style={{ padding: '2px 6px', fontSize: 9 }}
            onClick={waOpen}
            disabled={!deal.client?.phone}
            title={deal.client?.phone ? `WhatsApp ${deal.client.phone}` : ar ? 'لا يوجد هاتف' : 'No phone on file'}
          >
            💬
          </button>
        </div>
      </div>
    </>
  );
}

/* ── New Deal modal — creates a real public.deals row from a CRM lead ──── */

interface LeadOption {
  id: string;
  name: string;
  phone: string;
  source: string | null;
  interest?: string;
}

interface ListingOption {
  id: string;
  code: string;
  cmp: string;
  type: string;
  price: number;
}

function NewDealModal({
  ar,
  onClose,
  onCreated,
}: {
  ar: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [optsLoading, setOptsLoading] = useState(true);
  const [leadId, setLeadId] = useState('');
  const [listingId, setListingId] = useState('');
  const [value, setValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      // order=recent: the picker must offer the FRESHEST CRM leads — a plain
      // 500-row window on a 556+ row table truncates the newest intake,
      // hiding exactly the lead a deal is being opened for.
      fetch('/api/admin/leads?limit=100&order=recent').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/listings?limit=300').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([leadData, listingData]) => {
        if (cancelled) return;
        setLeads(leadData?.leads ?? []);
        setListings(listingData?.listings ?? []);
      })
      .catch(() => setFormError(ar ? 'فشل تحميل قوائم العملاء/الوحدات' : 'Failed to load leads/listings'))
      .finally(() => !cancelled && setOptsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ar]);

  const submit = async () => {
    const dealValue = parseFloat(value.replace(/,/g, ''));
    if (!leadId) {
      setFormError(ar ? 'اختر عميلاً من CRM أولاً' : 'Pick a CRM lead first');
      return;
    }
    if (!Number.isFinite(dealValue) || dealValue <= 0) {
      setFormError(ar ? 'أدخل قيمة صفقة صحيحة (EGP)' : 'Enter a valid deal value (EGP)');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          listingId: listingId || undefined,
          dealValue,
          targetClosingDate: targetDate || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || `HTTP ${res.status}`);
      onCreated();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Network error');
      setSaving(false);
    }
  };

  const selectedLead = leads.find((l) => l.id === leadId);

  return (
    <div className="modal-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-hd">
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>
            {ar ? 'صفقة جديدة · من عميل CRM' : 'NEW DEAL · FROM CRM LEAD'}
          </span>
          <button onClick={onClose} title="Close modal" aria-label="Close modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-f)' }}>✕</button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {optsLoading ? (
            <div style={{ fontSize: 11.5, color: 'var(--tx-m)', textAlign: 'center', padding: '18px 0' }}>
              <span className="pulse-dot" style={{ color: 'var(--gold)' }}>●</span>{' '}
              {ar ? 'جارٍ تحميل العملاء والوحدات…' : 'Loading leads & listings…'}
            </div>
          ) : (
            <>
              <label style={{ fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'JetBrains Mono' }}>
                {ar ? 'العميل (من CRM)' : 'Client (from CRM)'}
                <select className="f-in" value={leadId} onChange={(e) => setLeadId(e.target.value)} style={{ marginTop: 6, width: '100%' }}>
                  <option value="">{ar ? '— اختر عميلاً —' : '— pick a lead —'}</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.phone ? `(${l.phone})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'JetBrains Mono' }}>
                {ar ? 'الوحدة (اختياري)' : 'Unit (optional)'}
                <select className="f-in" value={listingId} onChange={(e) => setListingId(e.target.value)} style={{ marginTop: 6, width: '100%' }}>
                  <option value="">{ar ? '— بدون ربط بوحدة —' : '— no unit linked —'}</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} · {l.cmp || '—'} · {l.type}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ flex: 1, fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'JetBrains Mono' }}>
                  {ar ? 'قيمة الصفقة (EGP)' : 'Deal value (EGP)'}
                  <input
                    className="f-in"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="5000000"
                    style={{ marginTop: 6, width: '100%' }}
                  />
                </label>
                <label style={{ flex: 1, fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'JetBrains Mono' }}>
                  {ar ? 'هدف الإغلاق' : 'Target close'}
                  <input
                    className="f-in"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    style={{ marginTop: 6, width: '100%' }}
                  />
                </label>
              </div>

              <label style={{ fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'JetBrains Mono' }}>
                {ar ? 'ملاحظات' : 'Notes'}
                <textarea
                  className="f-in"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  style={{ marginTop: 6, width: '100%', resize: 'vertical' }}
                />
              </label>

              {selectedLead?.phone && (
                <div style={{ fontSize: 10, color: 'var(--tx-f)', fontFamily: 'JetBrains Mono' }}>
                  {ar ? 'سيتم ربط الصفقة بـ' : 'Deal will link to'}: {selectedLead.name} · {selectedLead.phone}
                </div>
              )}

              {formError && (
                <div role="alert" style={{ fontSize: 11, color: '#FCA5A5', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '7px 10px' }}>
                  ⚠ {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" style={{ flex: 1 }} onClick={submit} disabled={saving}>
                  {saving ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : ar ? '✓ إنشاء الصفقة' : '✓ Create Deal'}
                </button>
                <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
