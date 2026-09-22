'use client';
/**
 * Inventory OS — unit drawer: full specs, payment plans with the interactive
 * Egyptian installment calculator, price history with reason-tracked repricing,
 * status timeline and guarded lifecycle transitions.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  STAGE_META, TYPE_LABEL, FINISH_LABEL, FREQ_LABEL, calcPlan, norm, daysLeft, fmtEgp, fmtM,
  type Stage, type PlanInputs,
} from './shared';

type UnitRow = Record<string, any>;

/* ── Guarded per-stage actions (persisted via /api/admin/inventory-os) ── */
export function StageActions({ stage, busy, note, docRef, onNote, onDocRef, onTransition, t }: {
  stage: string; busy: boolean; note: string; docRef: string;
  onNote: (v: string) => void; onDocRef: (v: string) => void;
  onTransition: (to: Stage, note?: string, docRef?: string) => void;
  t: (en: string, ar: string) => string;
}) {
  const btn = (label: string, target: Stage, color: string, needsNote?: boolean, doc = false) => (
    <div key={target} style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      {doc && (
        <input
          value={docRef} onChange={(e) => onDocRef(e.target.value)}
          placeholder={t('Doc ref…', 'مرجع المستند…')}
          style={{
            fontSize: 10.5, padding: '4px 8px', borderRadius: 7, width: 120,
            border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx)', outline: 'none',
          }}
        />
      )}
      <button
        disabled={busy}
        onClick={() => onTransition(target, needsNote ? (note || undefined) : undefined, doc ? docRef || undefined : undefined)}
        style={{
          fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
          border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
          color, background: `color-mix(in srgb, ${color} 12%, transparent)`,
          opacity: busy ? 0.45 : 1,
        }}
      >{label}</button>
    </div>
  );

  switch (stage) {
    case 'draft':
      return <Row>{btn(`→ ${t('Send to Review', 'إرسال للمراجعة')}`, 'pending_verification', 'var(--amber,#f59e0b)')}</Row>;
    case 'pending_verification':
      return (
        <Row docHint>
          {btn(`✓ ${t('Verify', 'توثيق')}`, 'verified', 'var(--gold-lt,#E9C176)', false, true)}
          {btn(t('Reject', 'رفض'), 'draft', 'var(--tx-m,#94a3b8)')}
        </Row>
      );
    case 'verified':
      return <Row>{btn(`🚀 ${t('Publish', 'نشر')}`, 'published', 'var(--emerald,#34D399)')}</Row>;
    case 'published':
      return (
        <Row>
          {btn(`🔒 ${t('Reserve (14d)', 'حجز (14 يوم)')}`, 'reserved', 'var(--gold-champagne,#F5D76E)', true)}
          {btn(t('Off Market', 'إيقاف العرض'), 'off_market', '#64748B', true)}
        </Row>
      );
    case 'reserved':
      return (
        <Row>
          {btn(`✓ ${t('Mark Sold', 'تم البيع')}`, 'sold', 'var(--red,#E63946)', true)}
          {btn(t('Release', 'تحرير'), 'published', 'var(--emerald,#34D399)', true)}
        </Row>
      );
    case 'expired':
      return <Row>{btn(t('Re-verify', 'إعادة توثيق'), 'pending_verification', 'var(--amber,#f59e0b)')}</Row>;
    case 'rented':
      return <Row>{btn(t('Relist', 'إعادة عرض'), 'published', 'var(--emerald,#34D399)')}</Row>;
    case 'off_market':
      return <Row>{btn(t('Republish', 'إعادة نشر'), 'published', 'var(--emerald,#34D399)')}</Row>;
    default:
      return <Row><span style={{ opacity: 0.4, fontSize: 11 }}>{t('Terminal state', 'حالة نهائية')}</span></Row>;
  }

  function Row({ children, docHint }: { children: React.ReactNode; docHint?: boolean }) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 6, alignItems: 'center' }}>
          <input
            value={note} onChange={(e) => onNote(e.target.value)}
            placeholder={t('Audit note (escrow ref / contract no. / reason)', 'ملاحظة تدقيق (مرجع الضمان / رقم العقد / السبب)')}
            style={{
              flex: 1, fontSize: 10.5, padding: '4px 8px', borderRadius: 7, minWidth: 150,
              border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx)', outline: 'none',
            }}
          />
          {docHint && <span style={{ fontSize: 9.5, color: 'var(--tx-f)' }}>{t('doc required', 'مستند مطلوب')}</span>}
        </div>
      </div>
    );
  }
}

/* ── The drawer ── */
export function OsDrawer({ unitId, isAr, t, onClose, onChanged, notify }: {
  unitId: string;
  isAr: boolean;
  t: (en: string, ar: string) => string;
  onClose: () => void;
  onChanged: () => void;
  notify: (msg: string, ok?: boolean) => void;
}) {
  const [unit, setUnit] = useState<UnitRow | null>(null);
  const [plans, setPlans] = useState<UnitRow[]>([]);
  const [priceHistory, setPriceHistory] = useState<UnitRow[]>([]);
  const [statusHistory, setStatusHistory] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [docRef, setDocRef] = useState('');
  const [section, setSection] = useState<'plans' | 'history' | 'timeline'>('plans');

  // calculator state
  const price0 = useMemo(() => Number(unit?.price ?? 0), [unit]);
  const [calc, setCalc] = useState<PlanInputs>({
    price: 0, downPaymentPercent: 10, installmentYears: 8, frequency: 'quarterly',
    deliveryPaymentPercent: 5, maintenanceFeePerSqm: 0, areaSqm: 0,
  });
  const [calcTouched, setCalcTouched] = useState(false);

  // reprice form
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('price_cut');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory-os?id=${encodeURIComponent(unitId)}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setUnit(json.unit);
        setPlans(json.plans ?? []);
        setPriceHistory(json.priceHistory ?? []);
        setStatusHistory(json.statusHistory ?? []);
        const def = (json.plans ?? []).find((p: UnitRow) => p.isDefault) ?? (json.plans ?? [])[0];
        if (!calcTouched) {
          setCalc({
            price: Number(json.unit?.price ?? 0),
            downPaymentPercent: def ? Number(def.downPaymentPercent ?? 10) : 10,
            installmentYears: def ? Number(def.installmentYears ?? 8) : 8,
            frequency: (def?.installmentFrequency ?? 'quarterly') as PlanInputs['frequency'],
            deliveryPaymentPercent: def ? Number(def.deliveryPaymentPercent ?? 0) : 0,
            maintenanceFeePerSqm: Number(json.unit?.maintenanceFeePerSqm ?? 0),
            areaSqm: Number(json.unit?.areaSqm ?? 0),
          });
        }
      } else notify(json.error ?? 'Load failed', false);
    } catch { notify(t('Network error', 'خطأ في الشبكة'), false) }
    finally { setLoading(false) }
  }, [unitId, notify, t, calcTouched]);

  useEffect(() => { setCalcTouched(false); load() }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const transition = async (to: Stage, n?: string, doc?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/inventory-os', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', id: unitId, to, note: n, ownershipDocRef: doc, actor: 'admin-portal' }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`${t('Transitioned to', 'تم النقل إلى')} ${STAGE_META[to]?.[isAr ? 'ar' : 'en'] ?? to} — ${t('audit recorded', 'سُجّل التدقيق')}`);
        setNote(''); setDocRef('');
        await load(); onChanged();
      } else notify(json.error ?? t('Transition rejected', 'رفض الانتقال'), false);
    } catch { notify(t('Network error', 'خطأ في الشبكة'), false) }
    finally { setBusy(false) }
  };

  const reprice = async () => {
    const p = Number(newPrice);
    if (!p || p <= 0) { notify(t('Enter a valid price', 'أدخل سعرًا صحيحًا'), false); return }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/inventory-os', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'price', id: unitId, priceEgp: p, reason, actor: 'admin-portal' }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`${t('Repriced', 'تم تسعير')}: ${fmtM(json.from)} → ${fmtM(json.to)} (${json.pct > 0 ? '+' : ''}${json.pct}%) — ${t('history recorded', 'سُجل في السجل')}`);
        setNewPrice('');
        await load(); onChanged();
      } else notify(json.error ?? 'Reprice rejected', false);
    } catch { notify(t('Network error', 'خطأ في الشبكة'), false) }
    finally { setBusy(false) }
  };

  const r = calcPlan(calc);
  const st = norm(unit?.status);
  const meta = STAGE_META[st] ?? STAGE_META.draft;
  const dl = daysLeft(unit?.reservedUntil);

  const Spec = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--surf2)', padding: '7px 10px' }}>
      <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-f)' }}>{l}</div>
      <div style={{ marginTop: 2, fontSize: 12.5, fontWeight: 700, color: 'var(--tx-s)', fontVariantNumeric: 'tabular-nums' }}>{v ?? '—'}</div>
    </div>
  );

  const num = (v: unknown, d = 0) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d }));

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end',
        background: 'rgba(2, 8, 16, 0.62)', backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="custom-scroll"
        style={{
          width: 'min(560px, 96vw)', height: '100%', overflowY: 'auto',
          background: 'var(--bg-s,#0B1A2E)', borderInlineStart: '1px solid var(--bd-s)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.5)',
          animation: 'invos-slide 260ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {loading && !unit ? (
          <div style={{ padding: 60, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>{t('Loading unit…', 'جارٍ تحميل الوحدة…')}</div>
        ) : unit ? (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 15, color: 'var(--gold-champagne,#F5D76E)' }}>
                    {unit.unitCode || unit.code || unit.id.slice(0, 8)}
                  </span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 99, color: meta.color,
                    border: `1px solid color-mix(in srgb, ${meta.color} 45%, transparent)`,
                    background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                  }}>{isAr ? meta.ar : meta.en}</span>
                  {st === 'reserved' && dl !== null && (
                    <span style={{ fontSize: 10.5, fontWeight: 900, color: dl <= 5 ? 'var(--red)' : 'var(--gold-champagne)' }}>
                      ⏳ {dl}d {t('window left', 'متبقٍ في النافذة')}
                    </span>
                  )}
                  {unit.reservationRef && (
                    <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', opacity: 0.65 }}>{unit.reservationRef}</span>
                  )}
                </div>
                <div style={{ marginTop: 3, fontSize: 13.5, fontWeight: 800 }}>
                  {unit.projectName || unit.compound} {unit.zone ? `· ${unit.zone}` : ''}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.6 }}>
                  {unit.developerName || unit.developer} {unit.developerTier ? `· Tier ${unit.developerTier}` : ''}
                  {unit.title ? ` · ${unit.title}` : ''}
                </div>
              </div>
              <button onClick={onClose} style={{ border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx-m)', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>

            {/* price banner */}
            <div style={{
              borderRadius: 'var(--clay-rad-md)', padding: '12px 14px',
              background: 'linear-gradient(145deg, color-mix(in srgb, var(--gold-luxury) 14%, transparent), transparent)',
              border: '1px solid color-mix(in srgb, var(--gold-luxury) 35%, transparent)',
              display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'baseline',
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold-champagne)', fontVariantNumeric: 'tabular-nums' }}>
                {unit.offerType === 'rent' ? `${fmtM(unit.price)}/${unit.priceCurrency === 'USD' ? 'yr' : t('mo', 'ش')}` : fmtEgp(unit.price)}
              </span>
              {unit.pricePerSqm ? <span style={{ fontSize: 12, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{Math.round(Number(unit.pricePerSqm)).toLocaleString()} EGP/m²</span> : null}
              {unit.defaultPlanName ? <span style={{ fontSize: 11.5, opacity: 0.75 }}>· {unit.defaultPlanName}</span> : null}
              <span style={{ marginInlineStart: 'auto', fontSize: 10.5, opacity: 0.6 }}>
                DQ {Math.round(Number(unit.dqComputed ?? unit.dataQualityScore ?? 0))}/100 · {unit.daysOnMarket ?? 0}d {t('live', 'معروض')}
              </span>
            </div>

            {/* actions */}
            <div style={{ borderRadius: 'var(--clay-rad-md)', border: '1px solid var(--bd)', background: 'var(--clay-bg-card)', padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx-f)', marginBottom: 8 }}>
                🛡️ {t('Guarded lifecycle actions', 'إجراءات الدورة الحياتية')} — {meta.hint}
              </div>
              <StageActions
                stage={st} busy={busy} note={note} docRef={docRef}
                onNote={setNote} onDocRef={setDocRef}
                onTransition={transition} t={t}
              />
            </div>

            {/* specs */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx-f)', margin: '4px 0 8px' }}>
                📐 {t('Specifications', 'المواصفات')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 7 }}>
                <Spec l={t('Type', 'النوع')} v={isAr ? (TYPE_LABEL[unit.propertyType]?.ar ?? unit.propertyType) : (TYPE_LABEL[unit.propertyType]?.en ?? unit.propertyType)} />
                <Spec l={t('Bedrooms', 'غرف')} v={unit.bedrooms ?? '—'} />
                <Spec l={t('Bathrooms', 'حمامات')} v={unit.bathrooms ?? '—'} />
                <Spec l={t('BUA m²', 'مساحة البناء')} v={num(unit.areaSqm, 1)} />
                {Number(unit.gardenSqm) > 0 && <Spec l={t('Garden m²', 'حديقة')} v={num(unit.gardenSqm, 1)} />}
                {Number(unit.roofSqm) > 0 && <Spec l={t('Roof m²', 'روف')} v={num(unit.roofSqm, 1)} />}
                {Number(unit.plotSqm) > 0 && <Spec l={t('Plot m²', 'قطعة الأرض')} v={num(unit.plotSqm, 1)} />}
                {unit.floorNumber !== null && unit.floorNumber !== undefined && <Spec l={t('Floor', 'الدور')} v={unit.floorNumber} />}
                {unit.unitView && <Spec l={t('View', 'الإطلالة')} v={String(unit.unitView).replace(/_/g, ' ')} />}
                <Spec l={t('Finishing', 'التشطيب')} v={isAr ? (FINISH_LABEL[unit.finishingType]?.ar ?? (unit.finishingType ? String(unit.finishingType).replace(/_/g, ' ') : '—')) : (FINISH_LABEL[unit.finishingType]?.en ?? (unit.finishingType ? String(unit.finishingType).replace(/_/g, ' ') : '—'))} />
                {unit.deliveryYear && <Spec l={t('Delivery', 'التسليم')} v={`${unit.deliveryYear}${unit.deliveryQuarter ? ` ${unit.deliveryQuarter}` : ''}`} />}
                {Number(unit.maintenanceFeePerSqm) > 0 && <Spec l={t('Maint. EGP/m²', 'صيانة/م²')} v={num(unit.maintenanceFeePerSqm)} />}
                <Spec l={t('Offer', 'العرض')} v={unit.offerType === 'rent' ? t('Rent', 'إيجار') : t('Sale', 'بيع')} />
                <Spec l={t('Listing', 'النوع')} v={unit.listingType === 'resale' ? t('Resale', 'ريسيل') : t('Primary', 'ابتدائي')} />
              </div>
            </div>

            {/* section tabs */}
            <div className="wfs-tabs" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bd)' }}>
              {([['plans', `💳 ${t('Plans & Calculator', 'الخطط والحاسبة')}`], ['history', `📈 ${t('Price History', 'سجل الأسعار')} (${priceHistory.length})`], ['timeline', `🕰️ ${t('Status Timeline', 'الخط الزمني')} (${statusHistory.length})`]] as const).map(([k, l]) => (
                <button key={k} className={`wfs-tab${section === k ? ' wfs-tab-on' : ''}`} onClick={() => setSection(k)} style={{ fontSize: 10.5 }}>{l}</button>
              ))}
            </div>

            {section === 'plans' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* saved plans */}
                {plans.length > 0 && (
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {plans.map((p) => (
                      <button key={p.id} className="chip" style={{
                        cursor: 'pointer', fontSize: 10.5, fontWeight: 700, padding: '6px 10px', borderRadius: 10,
                        borderColor: p.isDefault ? 'color-mix(in srgb, var(--gold-luxury) 55%, transparent)' : 'var(--bd)',
                        color: p.isDefault ? 'var(--gold-champagne)' : 'var(--tx-m)',
                      }}
                        onClick={() => {
                          setCalcTouched(true);
                          setCalc((c) => ({
                            ...c,
                            price: Number(unit.price ?? c.price),
                            downPaymentPercent: Number(p.downPaymentPercent ?? 10),
                            installmentYears: Number(p.installmentYears ?? 8),
                            frequency: (p.installmentFrequency ?? 'quarterly') as PlanInputs['frequency'],
                            deliveryPaymentPercent: Number(p.deliveryPaymentPercent ?? 0),
                          }));
                        }}
                        title={t('Load into calculator', 'تحميل في الحاسبة')}
                      >
                        {p.isDefault ? '★ ' : ''}{p.name ?? `${p.downPaymentPercent}% DP`}
                      </button>
                    ))}
                  </div>
                )}

                {/* interactive calculator */}
                <div style={{ borderRadius: 'var(--clay-rad-md)', border: '1px solid var(--bd)', background: 'var(--clay-bg-card)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx-f)' }}>
                    🧮 {t('Installment calculator', 'حاسبة التقسيط')} — {t('adjust any input', 'عدّل أي قيمة')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                    {([
                      { k: 'price', l: t('Price (EGP)', 'السعر (ج.م)'), step: 100000, min: 0 },
                      { k: 'downPaymentPercent', l: t('Down payment %', 'المقدم %'), step: 1, min: 0, max: 100 },
                      { k: 'installmentYears', l: t('Tenure (years)', 'المدة (سنة)'), step: 0.5, min: 0, max: 12 },
                      { k: 'deliveryPaymentPercent', l: t('Delivery balloon %', 'دفعة الاستلام %'), step: 1, min: 0, max: 100 },
                    ] as const).map((f) => (
                      <label key={f.k} style={{ display: 'block' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--tx-f)', display: 'block', marginBottom: 3 }}>{f.l}</span>
                        <input
                          type="number" step={f.step} min={f.min} max={'max' in f ? f.max : undefined}
                          value={calc[f.k]} onChange={(e) => { setCalcTouched(true); setCalc((c) => ({ ...c, [f.k]: Number(e.target.value) || 0 })) }}
                          style={{
                            width: '100%', fontSize: 12, padding: '6px 9px', borderRadius: 8,
                            border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx)', outline: 'none',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        />
                      </label>
                    ))}
                    <label style={{ display: 'block' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--tx-f)', display: 'block', marginBottom: 3 }}>{t('Frequency', 'دورية القسط')}</span>
                      <select
                        value={calc.frequency}
                        onChange={(e) => { setCalcTouched(true); setCalc((c) => ({ ...c, frequency: e.target.value as PlanInputs['frequency'] })) }}
                        style={{
                          width: '100%', fontSize: 12, padding: '6px 9px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx)', outline: 'none',
                        }}
                      >
                        {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k} style={{ background: 'var(--bg-s)' }}>{isAr ? v.ar : v.en}</option>)}
                      </select>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 7 }}>
                    <Spec l={t('Down payment', 'الدفعة المقدمة')} v={fmtEgp(r.downPayment)} />
                    <Spec l={`${t('Per installment', 'القسط')} (${isAr ? FREQ_LABEL[calc.frequency].ar : FREQ_LABEL[calc.frequency].en})`} v={fmtEgp(r.perInstallment)} />
                    <Spec l={t('Installments', 'عدد الأقساط')} v={`${r.installmentCount} ×`} />
                    <Spec l={t('Delivery balloon', 'دفعة الاستلام')} v={r.balloon ? fmtEgp(r.balloon) : '—'} />
                    <Spec l={t('Financed', 'المموّل')} v={fmtEgp(r.financed)} />
                    <Spec l={t('Maintenance / yr', 'الصيانة سنويًا')} v={r.maintenanceAnnual ? fmtEgp(r.maintenanceAnnual) : '—'} />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--tx-f)' }}>
                    {t('Total outlay', 'إجمالي المدفوع')}: <strong style={{ color: 'var(--tx-s)' }}>{fmtEgp(r.totalOutlay)}</strong>
                    {r.months > 0 && <> · {t('over', 'على')} {calc.installmentYears} {t('years', 'سنة')} ({r.months} {t('months', 'شهر')})</>}
                    {price0 > 0 && calc.price !== price0 && <> · <span style={{ color: 'var(--amber)' }}>{t('custom price', 'سعر مخصص')} ({fmtM(calc.price)})</span></>}
                  </div>
                </div>
              </div>
            )}

            {section === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {priceHistory.length === 0 ? (
                  <Empty text={t('No price history yet — migration 011 unlocks tracking.', 'لا يوجد سجل أسعار بعد — الترحيل 011 يتيح التتبع.')} />
                ) : priceHistory.slice(0, 8).map((h, i, arr) => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--surf2)', padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--tx-f)', minWidth: 62 }}>
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </span>
                    <strong style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtEgp(h.priceEgp ?? h.price)}</strong>
                    {i < arr.length - 1 && Number(arr[i + 1].priceEgp) > 0 && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 800,
                        color: Number(h.priceEgp) > Number(arr[i + 1].priceEgp) ? 'var(--red)' : 'var(--emerald)',
                      }}>
                        {Number(h.priceEgp) > Number(arr[i + 1].priceEgp) ? '▲' : '▼'}
                        {Math.abs(Math.round(((Number(h.priceEgp) - Number(arr[i + 1].priceEgp)) / Number(arr[i + 1].priceEgp)) * 1000) / 10)}%
                      </span>
                    )}
                    <span style={{ marginInlineStart: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--tx-m)' }}>
                      {String(h.reason ?? '').replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {/* reprice form */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--gold-luxury) 30%, transparent)', background: 'color-mix(in srgb, var(--gold-luxury) 6%, transparent)', padding: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>📈 {t('Reprice', 'إعادة تسعير')}:</span>
                  <input
                    type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                    placeholder={String(Math.round(Number(unit.price ?? 0)))}
                    style={{ width: 130, fontSize: 11.5, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx)', outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                  />
                  <select value={reason} onChange={(e) => setReason(e.target.value)}
                    style={{ fontSize: 11, padding: '5px 7px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx)', cursor: 'pointer' }}>
                    <option value="price_cut">{t('Price cut', 'خفض السعر')}</option>
                    <option value="price_increase">{t('Price increase', 'رفع السعر')}</option>
                    <option value="relist">{t('Relist', 'إعادة عرض')}</option>
                    <option value="avm_adjustment">{t('AVM adjustment', 'تعديل التقييم')}</option>
                  </select>
                  <button onClick={reprice} disabled={busy || !newPrice} className="chip" style={{
                    cursor: 'pointer', fontWeight: 800, fontSize: 11,
                    borderColor: 'color-mix(in srgb, var(--gold-luxury) 50%, transparent)', color: 'var(--gold-champagne)',
                    opacity: busy || !newPrice ? 0.45 : 1,
                  }}>💾 {t('Apply + record', 'تطبيق وتسجيل')}</button>
                </div>
              </div>
            )}

            {section === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {statusHistory.length === 0 ? (
                  <Empty text={t('No status events yet — the trigger writes them on every transition.', 'لا أحداث بعد — التريغر يسجلها مع كل انتقال.')} />
                ) : statusHistory.slice(0, 12).map((h) => {
                  const m = STAGE_META[norm(h.toStatus)] ?? STAGE_META.draft;
                  return (
                    <div key={h.id} style={{ display: 'flex', gap: 10, position: 'relative', padding: '0 0 14px 4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 99, background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                        <span style={{ flex: 1, width: 2, background: 'var(--bd)' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                          {h.fromStatus ? `${STAGE_META[norm(h.fromStatus)]?.[isAr ? 'ar' : 'en'] ?? h.fromStatus} → ` : '⊕ '}
                          <span style={{ color: m.color }}>{isAr ? m.ar : m.en}</span>
                        </div>
                        <div style={{ fontSize: 10.5, opacity: 0.6 }}>
                          {h.createdAt ? new Date(h.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          {' · '}{h.actor ?? 'system'}
                          {h.note ? ` · ${h.note}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* verification footer */}
            {unit.verified ? (
              <div style={{ fontSize: 11, color: 'var(--emerald)', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--emerald) 35%, transparent)', padding: '8px 12px' }}>
                ✓ {t('Ownership verified', 'تم توثيق الملكية')}
                {unit.verifiedAt ? ` · ${new Date(unit.verifiedAt).toLocaleDateString('en-GB')}` : ''}
                {unit.ownershipDocRef ? ` · ${unit.ownershipDocRef}` : ''}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--amber)', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--amber) 35%, transparent)', padding: '8px 12px' }}>
                ⚠ {t('Ownership not verified — Egypt 2023 listing transparency rule', 'الملكية غير موثقة — قاعدة الشفافية المصرية 2023')}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 60, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>{t('Unit not found', 'الوحدة غير موجودة')}</div>
        )}
      </div>
      <style>{`@keyframes invos-slide { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 18, textAlign: 'center', fontSize: 12, color: 'var(--tx-f)' }}>{text}</div>;
}
