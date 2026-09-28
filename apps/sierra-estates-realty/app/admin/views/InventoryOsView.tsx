'use client';
/**
 * Inventory OS v2 — the merged inventory workspace (Admin 2.0)
 * ═══════════════════════════════════════════════════════════════════════
 * One intelligent surface for the whole estate:
 *   • KPI command header (portfolio value, live/reserved, DQ, freshness)
 *   • Smart Next-Best-Actions strip (expiring escrows, verification queue,
 *     stale SLA breaches) with one-click CTAs
 *   • Pipeline board — guarded lifecycle with audit trail
 *   • Inventory grid — search / filters / sort / CSV, rows open the drawer
 *   • Unit drawer — specs, payment plans + Egyptian installment calculator,
 *     reason-tracked repricing, status timeline
 *   • Analytics — compound matrix, DQ distribution, mix, delivery pipeline
 *
 * Every mutation persists through /api/admin/inventory-os (migration 011
 * guarded trigger + 012 studio). Bilingual EN/AR, clay token styling.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { STAGE_META, FLOW_STAGES, norm, daysLeft, fmtM, type Stage } from './inventory-os/shared';
import { OsGrid } from './inventory-os/OsGrid';
import { OsDrawer } from './inventory-os/OsDrawer';
import { OsAnalytics } from './inventory-os/OsAnalytics';

type UnitRow = Record<string, any>;
type Tab = 'pipeline' | 'grid' | 'analytics';

export default function InventoryOsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const t = useCallback((en: string, ar: string) => (isAr ? ar : en), [isAr]);


  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pipeline');
  const [focusStage, setFocusStage] = useState<Stage>('pending_verification');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const notify = useCallback((msg: string, ok = true) => setToast({ ok, msg }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory-os?limit=1000', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setUnits(json.units ?? []);
      else notify(json.error ?? 'Load failed', false);
    } catch { notify(t('Network error — retrying later', 'خطأ في الشبكة'), false); }
    finally { setLoading(false) }
  }, [notify, t]);

  useEffect(() => { load() }, [load]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  /* ── Derived: stage map + KPIs + smart insights ── */
  const byStage = useMemo(() => {
    const m: Record<string, UnitRow[]> = {};
    for (const u of units) (m[norm(u.status)] ??= []).push(u);
    return m;
  }, [units]);

  const kpi = useMemo(() => {
    let portfolio = 0, liveValue = 0, perSqm = 0, perSqmN = 0, dq = 0;
    for (const u of units) {
      portfolio += Number(u.price ?? 0);
      if (norm(u.status) === 'published') liveValue += Number(u.price ?? 0);
      if (Number(u.pricePerSqm) > 0) { perSqm += Number(u.pricePerSqm); perSqmN += 1 }
      dq += Number(u.dqComputed ?? u.dataQualityScore ?? 0);
    }
    return {
      portfolio,
      live: byStage.published?.length ?? 0,
      liveValue,
      reserved: byStage.reserved?.length ?? 0,
      pending: byStage.pending_verification?.length ?? 0,
      avgPerSqm: perSqmN ? Math.round(perSqm / perSqmN) : 0,
      avgDq: units.length ? Math.round(dq / units.length) : 0,
    };
  }, [units, byStage]);

  const insights = useMemo(() => {
    const out: { color: string; icon: string; text: string; cta: () => void }[] = [];
    const expiring = units.filter((u) => norm(u.status) === 'reserved' && (daysLeft(u.reservedUntil) ?? 99) <= 5);
    if (expiring.length) out.push({
      color: 'var(--red,#E63946)', icon: '⏳',
      text: t(`${expiring.length} reservation${expiring.length > 1 ? 's' : ''} expiring ≤ 5 days — convert or release`, `${expiring.length} حجز${expiring.length > 1 ? '' : ''} ينتهي خلال 5 أيام — حوّل أو حرّر`),
      cta: () => { setFocusStage('reserved'); setTab('pipeline') },
    });
    if (kpi.pending > 0) out.push({
      color: 'var(--amber,#F59E0B)', icon: '🛡️',
      text: t(`${kpi.pending} units awaiting ownership verification (Egypt 2023 rule)`, `${kpi.pending} وحدة بانتظار توثيق الملكية (قاعدة 2023)`),
      cta: () => { setFocusStage('pending_verification'); setTab('pipeline') },
    });
    const stale = units.filter((u) => u.stale || (norm(u.status) === 'published' && Number(u.daysOnMarket ?? 0) > 90));
    if (stale.length) out.push({
      color: 'var(--gold-lt,#E9C176)', icon: '⚠',
      text: t(`${stale.length} listings breached the 30-day freshness SLA / 90-day DOM — reprice or re-verify`, `${stale.length} إعلانًا تجاوز مهلة التحديث أو 90 يومًا — أعد التسعير أو التوثيق`),
      cta: () => { setTab('grid') },
    });
    return out;
  }, [units, kpi.pending, t]);

  const openUnit = (id: string) => setDrawerId(id);
  const migrationMissing = units.length > 0 && !('dqComputed' in (units[0] ?? {}));

  const kpiChip = (label: string, value: React.ReactNode, color: string, sub?: string) => (
    <div style={{
      flex: '1 1 130px', minWidth: 118, borderRadius: 'var(--clay-rad-md)', border: '1px solid var(--bd)',
      background: 'var(--clay-bg-card)', padding: '10px 12px',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx-f)' }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 17, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.55, marginTop: 1 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Command header ── */}
      <div className="card fade-up" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
              🏛️ {t('Inventory OS — Command Deck', 'نظام المخزون — غرفة القيادة')}
              <span className="chip" style={{ marginLeft: 10, background: 'var(--gold-luxury,#D4AF37)', color: '#07111E', fontWeight: 900, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>v2</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, opacity: 0.65 }}>
              {t(
                'Canonical lifecycle · guarded transitions · payment plans · escrow reservations · full audit trail — every action persists.',
                'دورة حياة موحّدة · انتقالات محروسة · خطط سداد · حجوزات ضمان · سجل تدقيق كامل — كل إجراء يُحفظ.'
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={load} disabled={loading} style={{ fontWeight: 800 }}>
              ⟳ {loading ? t('Loading…', 'جارٍ التحميل…') : t('Refresh', 'تحديث')}
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {kpiChip(t('Portfolio Value', 'قيمة المحفظة'), `${fmtM(kpi.portfolio)} ${t('EGP', 'ج.م')}`, 'var(--gold-champagne,#F5D76E)', `${units.length} ${t('units', 'وحدة')}`)}
          {kpiChip(t('Live on Portal', 'معروض'), kpi.live, 'var(--emerald,#34D399)', fmtM(kpi.liveValue))}
          {kpiChip(t('Reserved (escrow)', 'محجوز (ضمان)'), kpi.reserved, 'var(--gold-luxury,#D4AF37)', t('14-day window', 'نافذة 14 يومًا'))}
          {kpiChip(t('Pending Review', 'بانتظار المراجعة'), kpi.pending, kpi.pending > 0 ? 'var(--amber,#F59E0B)' : 'var(--tx-m)', t('Egypt 2023 rule', 'قاعدة 2023'))}
          {kpiChip(t('Avg EGP / m²', 'متوسط السعر/م²'), kpi.avgPerSqm.toLocaleString(), 'var(--gold-lt,#E9C176)', t('sale units', 'وحدات البيع'))}
          {kpiChip(t('Avg Data Quality', 'متوسط جودة البيانات'), `${kpi.avgDq}/100`, kpi.avgDq >= 70 ? 'var(--emerald,#34D399)' : 'var(--amber,#F59E0B)', t('DQ-aware ranking', 'ترتيب واعٍ بالجودة'))}
        </div>

        {/* smart insights strip */}
        {insights.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {insights.map((ins, i) => (
              <button key={i} onClick={ins.cta}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'start',
                  fontSize: 11.5, fontWeight: 700, padding: '7px 12px', borderRadius: 10,
                  border: `1px solid color-mix(in srgb, ${ins.color} 40%, transparent)`,
                  background: `color-mix(in srgb, ${ins.color} 9%, transparent)`,
                  color: 'var(--tx)', flex: '1 1 300px',
                }}>
                <span style={{ fontSize: 14 }}>{ins.icon}</span>
                <span style={{ flex: 1 }}>{ins.text}</span>
                <span style={{ color: ins.color, fontWeight: 900 }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="wfs-tabs" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--bd)', background: 'var(--clay-bg-card)' }}>
        {([
          ['pipeline', `🧭 ${t('Lifecycle Pipeline', 'خط الدورة الحياتية')}`],
          ['grid', `🗂️ ${t('Inventory Grid', 'شبكة المخزون')} · ${units.length}`],
          ['analytics', `📊 ${t('Analytics', 'التحليلات')}`],
        ] as const).map(([k, l]) => (
          <button key={k} className={`wfs-tab${tab === k ? ' wfs-tab-on' : ''}`} onClick={() => setTab(k)} style={{ padding: '12px 14px', fontSize: 12 }}>{l}</button>
        ))}
      </div>

      {/* ── Pipeline board ── */}
      {tab === 'pipeline' && (
        <>
          <div className="card fade-up" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
              {FLOW_STAGES.map((s, i) => {
                const count = byStage[s]?.length ?? 0;
                const m = STAGE_META[s];
                const active = focusStage === s;
                return (
                  <React.Fragment key={s}>
                    {i > 0 && <div style={{ alignSelf: 'center', opacity: 0.35, fontSize: 16 }}>→</div>}
                    <button
                      onClick={() => setFocusStage(s)}
                      className="chip"
                      style={{
                        cursor: 'pointer', textAlign: 'start', padding: '8px 12px', borderRadius: 10,
                        border: `1px solid ${active ? m.color : 'var(--bd)'}`,
                        background: active ? `color-mix(in srgb, ${m.color} 12%, transparent)` : 'transparent',
                        color: 'inherit', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 118,
                      }}
                      title={m.hint}
                    >
                      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: m.color }}>{isAr ? m.ar : m.en}</span>
                      <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{count}</span>
                      <span style={{ fontSize: 9.5, opacity: 0.5 }}>{t('units', 'وحدة')}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
              {(['rented', 'off_market', 'expired', 'archived'] as Stage[]).map((s) => {
                const count = byStage[s]?.length ?? 0;
                if (!count) return null;
                const m = STAGE_META[s];
                return (
                  <button key={s} onClick={() => setFocusStage(s)} className="chip" style={{ cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: m.color, border: `1px solid color-mix(in srgb, ${m.color} 30%, transparent)`, background: 'transparent', borderRadius: 999, padding: '3px 10px' }}>
                    {isAr ? m.ar : m.en} · {count}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13.5 }}>
                {STAGE_META[focusStage]?.[isAr ? 'ar' : 'en']} — {(byStage[focusStage] ?? []).length} {t('units', 'وحدة')}
              </strong>
              <span style={{ fontSize: 11, opacity: 0.55 }}>{STAGE_META[focusStage]?.hint}</span>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>{t('Loading inventory…', 'جارٍ تحميل المخزون…')}</div>
            ) : (byStage[focusStage] ?? []).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>{t('No units in this stage. 🎉', 'لا توجد وحدات في هذه المرحلة. 🎉')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 900 }}>
                  <thead>
                    <tr style={{ textAlign: 'start', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.5 }}>
                      <th style={{ padding: '9px 12px' }}>{t('Unit', 'الوحدة')}</th>
                      <th style={{ padding: '9px 12px' }}>{t('Compound', 'الكمبوند')}</th>
                      <th style={{ padding: '9px 12px' }}>{t('Specs', 'المواصفات')}</th>
                      <th style={{ padding: '9px 12px' }}>{t('Price', 'السعر')}</th>
                      <th style={{ padding: '9px 12px' }}>{t('Window', 'النافذة')}</th>
                      <th style={{ padding: '9px 12px' }}>{t('Open', 'فتح')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(byStage[focusStage] ?? []).slice(0, 40).map((u) => {
                      const id = String(u.id);
                      const code = u.unitCode || u.code || id.slice(0, 8);
                      const st = norm(u.status);
                      const dl = daysLeft(u.reservedUntil);
                      return (
                        <tr key={id} style={{ borderTop: '1px solid var(--bd)', cursor: 'pointer' }} onClick={() => openUnit(id)}>
                          <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--gold-champagne,#F5D76E)' }}>
                            {code}
                            {u.stale ? <span title={t('Freshness SLA breached', 'تجاوز المهلة')} style={{ marginInlineStart: 6, color: 'var(--amber)', fontSize: 10 }}>⚠</span> : null}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700 }}>{u.projectName || u.compound || '—'}</div>
                            <div style={{ fontSize: 10.5, opacity: 0.5 }}>{u.developerName || u.developer || ''}</div>
                          </td>
                          <td style={{ padding: '10px 12px', opacity: 0.85 }}>
                            {u.propertyType || u.type || '—'} · {u.bedrooms ?? 0}BR · {Math.round(Number(u.areaSqm ?? u.area ?? 0))}m²
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtM(u.price ?? u.lastPrice)}
                            {u.pricePerSqm ? <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 400 }}> ({Math.round(Number(u.pricePerSqm)).toLocaleString()}/m²)</span> : null}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {st === 'reserved' && dl !== null ? (
                              <span style={{ fontWeight: 800, color: dl <= 5 ? 'var(--red,#E63946)' : 'var(--gold-champagne,#F5D76E)' }}>{dl}d {t('left', 'متبقية')}</span>
                            ) : st === 'published' ? (
                              <span style={{ opacity: 0.5 }}>{u.daysOnMarket ?? 0}d {t('live', 'معروض')}</span>
                            ) : (
                              <span style={{ opacity: 0.35 }}>—</span>
                            )}
                            {u.reservationRef ? <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', opacity: 0.6 }}>{u.reservationRef}</div> : null}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openUnit(id) }}
                              className="chip" style={{ cursor: 'pointer', fontSize: 10.5, fontWeight: 800, color: 'var(--gold-champagne,#F5D76E)', borderColor: 'color-mix(in srgb, var(--gold-luxury) 45%, transparent)' }}
                            >
                              ⤢ {t('Open', 'فتح')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Grid tab ── */}
      {tab === 'grid' && <OsGrid units={units} isAr={isAr} t={t} onOpen={openUnit} loading={loading} />}

      {/* ── Analytics tab ── */}
      {tab === 'analytics' && <OsAnalytics units={units} isAr={isAr} t={t} onOpen={openUnit} />}

      {/* ── Migration hint ── */}
      {migrationMissing && (
        <div className="card fade-up" style={{ padding: '12px 16px', borderInlineStart: '3px solid var(--amber,#f59e0b)', fontSize: 12.5, opacity: 0.85 }}>
          ⚠ {t(
            'Inventory OS v2 migration not detected on this database. Run supabase/migrations/011_inventory_os_v2.sql + 012_workflow_studio.sql (idempotent, additive) to unlock payment plans, price history, DQ scoring and the guarded trigger.',
            'لم يتم اكتشاف ترحيل النظام على قاعدة البيانات. شغّل الترحيلين 011 و012 لفتح خطط السداد وسجل الأسعار والحراسة.'
          )}
        </div>
      )}

      {/* ── Drawer + toast ── */}
      {drawerId && (
        <OsDrawer
          unitId={drawerId} isAr={isAr} t={t}
          onClose={() => setDrawerId(null)}
          onChanged={load}
          notify={notify}
        />
      )}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
          padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: 'var(--bg-e,#0F2035)', border: `1px solid ${toast.ok ? 'var(--emerald,#34D399)' : 'var(--red,#E63946)'}55`,
          color: toast.ok ? 'var(--emerald,#34D399)' : 'var(--red,#E63946)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
    </div>
  );
}
