'use client';

/**
 * Inventory Payment Lab — unit detail drawer + Egyptian payment-plan studio.
 *
 * Models the standard Egyptian developer plan: a down payment (5–30%)
 * followed by equal installments over 1–10 years, most commonly paid
 * quarterly (matching schema.sql: down_payment / installment_years /
 * monthly_installment). Renders a schedule preview and a cumulative
 * progress bar so agents can quote plans instantly while on a call.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { X, Calculator, BedDouble, Bath, Ruler, Building2, Tag, ImageOff, Camera } from 'lucide-react';

/* ── Egyptian plan math ─────────────────────────────────────────────── */

export type InstallmentFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'yearly';

const PERIODS_PER_YEAR: Record<InstallmentFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  'semi-annual': 2,
  yearly: 1,
};

export interface PaymentPlanInput {
  price: number;
  downPaymentPct: number; // 0–100
  years: number; // 1–10
  frequency: InstallmentFrequency;
}

export interface PaymentPlanResult {
  downPaymentAmount: number;
  financedAmount: number;
  installmentsCount: number;
  perInstallment: number;
  perMonthEquivalent: number;
  totalPayable: number;
  firstPaymentDate: Date;
  schedule: Array<{ index: number; amount: number; dueLabel: string; cumulative: number }>;
}

export function computePaymentPlan(input: PaymentPlanInput): PaymentPlanResult {
  const { price, downPaymentPct, years, frequency } = input;
  const ppy = PERIODS_PER_YEAR[frequency];
  const downPaymentAmount = Math.round((price * downPaymentPct) / 100);
  const financedAmount = price - downPaymentAmount;
  const installmentsCount = Math.max(1, Math.round(years * ppy));
  const perInstallment = Math.round(financedAmount / installmentsCount);
  const perMonthEquivalent = Math.round(perInstallment / (12 / ppy));

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const schedule: PaymentPlanResult['schedule'] = [];
  let cumulative = downPaymentAmount;
  schedule.push({ index: 0, amount: downPaymentAmount, dueLabel: 'Down payment', cumulative });
  const stepMonths = 12 / ppy;
  for (let i = 1; i <= installmentsCount; i++) {
    const due = new Date(first.getFullYear(), first.getMonth() + (i - 1) * stepMonths, 1);
    const isLast = i === installmentsCount;
    const amount = isLast ? financedAmount - perInstallment * (installmentsCount - 1) : perInstallment;
    cumulative += amount;
    schedule.push({
      index: i,
      amount,
      dueLabel: due.toLocaleDateString('en-EG', { month: 'short', year: 'numeric' }),
      cumulative,
    });
  }

  return {
    downPaymentAmount,
    financedAmount,
    installmentsCount,
    perInstallment,
    perMonthEquivalent,
    totalPayable: price,
    firstPaymentDate: first,
    schedule,
  };
}

export function formatEGP(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1_000_000_000) return `EGP ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `EGP ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `EGP ${(value / 1_000).toFixed(0)}K`;
  return `EGP ${Math.round(value).toLocaleString('en-EG')}`;
}

export function formatEGPFull(value: number): string {
  return `EGP ${Math.round(value).toLocaleString('en-EG')}`;
}

/* ── Presets tuned to the Egyptian market ───────────────────────────── */

const PLAN_PRESETS: Array<{ label: string; plan: Omit<PaymentPlanInput, 'price'> }> = [
  { label: 'Cash', plan: { downPaymentPct: 100, years: 1, frequency: 'yearly' } },
  { label: '10% · 8 yrs · quarterly', plan: { downPaymentPct: 10, years: 8, frequency: 'quarterly' } },
  { label: '15% · 7 yrs · quarterly', plan: { downPaymentPct: 15, years: 7, frequency: 'quarterly' } },
  { label: '20% · 5 yrs · quarterly', plan: { downPaymentPct: 20, years: 5, frequency: 'quarterly' } },
  { label: '25% · 3 yrs · monthly', plan: { downPaymentPct: 25, years: 3, frequency: 'monthly' } },
];

/* ── Calculator card ────────────────────────────────────────────────── */

export function PaymentPlanCalculator({ price, isAr = false }: { price: number; isAr?: boolean }) {
  const [downPct, setDownPct] = useState(10);
  const [years, setYears] = useState(7);
  const [frequency, setFrequency] = useState<InstallmentFrequency>('quarterly');

  const plan = useMemo(
    () => computePaymentPlan({ price, downPaymentPct: downPct, years, frequency }),
    [price, downPct, years, frequency]
  );

  const downShare = price > 0 ? (plan.downPaymentAmount / price) * 100 : 0;

  const label = {
    title: isAr ? 'حاسبة خطة السداد' : 'Payment Plan Studio',
    subtitle: isAr
      ? 'محاكاة خطط المطورين المصرية — دفعة مقدمة وأقساط حتى 10 سنوات'
      : 'Egyptian developer plans — down payment plus installments up to 10 years',
    down: isAr ? 'الدفعة المقدمة' : 'Down Payment',
    years: isAr ? 'سنوات التقسيط' : 'Installment Years',
    freq: isAr ? 'دورية القسط' : 'Frequency',
    perInst: isAr ? 'قيمة القسط' : 'Per Installment',
    perMonth: isAr ? 'المعادل الشهري' : 'Monthly Equivalent',
    count: isAr ? 'عدد الأقساط' : 'Installments',
    financed: isAr ? 'المبلغ المقسط' : 'Financed',
    first: isAr ? 'أول قسط' : 'First Installment',
    schedule: isAr ? 'جدول السداد (مختصر)' : 'Schedule (condensed)',
    presets: isAr ? 'خطط جاهزة' : 'Market Presets',
    cash: isAr ? 'نقدي' : 'Cash',
    monthly: isAr ? 'شهري' : 'Monthly',
    quarterly: isAr ? 'ربع سنوي' : 'Quarterly',
    semi: isAr ? 'نصف سنوي' : 'Semi-Annual',
    yearly: isAr ? 'سنوي' : 'Yearly',
    more: isAr ? 'قسط آخر…' : 'more installments…',
  };

  return (
    <div className="rounded-2xl border border-[#C8961A]/25 bg-[#0d1a2c]/70 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="w-4 h-4 text-[#E9C176]" />
        <h3 className="text-sm font-bold text-white">{label.title}</h3>
      </div>
      <p className="text-[11px] text-slate-400 mb-4">{label.subtitle}</p>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {PLAN_PRESETS.map((p) => {
          const active = p.plan.downPaymentPct === downPct && p.plan.years === years && p.plan.frequency === frequency;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setDownPct(p.plan.downPaymentPct);
                setYears(p.plan.years);
                setFrequency(p.plan.frequency);
              }}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                active
                  ? 'bg-[#E9C176] text-[#0d0d0f] border-[#E9C176]'
                  : 'bg-[#211A0D]/60 text-[#E9C176] border-[#C8961A]/30 hover:border-[#E9C176]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Down payment slider */}
      <div className="mb-3">
        <div className="flex justify-between text-[10.5px] mb-1.5">
          <span className="text-slate-300 font-semibold">{label.down}</span>
          <span className="font-mono font-bold text-[#E9C176]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {downPct}% · {formatEGP(plan.downPaymentAmount)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={downPct}
          onChange={(e) => setDownPct(Number(e.target.value))}
          className="w-full accent-[#C8961A] cursor-pointer"
        />
      </div>

      {/* Years slider */}
      <div className="mb-3">
        <div className="flex justify-between text-[10.5px] mb-1.5">
          <span className="text-slate-300 font-semibold">{label.years}</span>
          <span className="font-mono font-bold text-[#E9C176]">{years} {isAr ? 'سنة' : 'yrs'}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
          className="w-full accent-[#C8961A] cursor-pointer"
        />
      </div>

      {/* Frequency */}
      <div className="mb-4">
        <div className="text-[10.5px] text-slate-300 font-semibold mb-1.5">{label.freq}</div>
        <div className="grid grid-cols-4 gap-1.5">
          {(['monthly', 'quarterly', 'semi-annual', 'yearly'] as InstallmentFrequency[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
                frequency === f
                  ? 'bg-[#C8961A] text-[#0d0d0f] border-[#C8961A]'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-[#E9C176]/50'
              }`}
            >
              {f === 'monthly' ? label.monthly : f === 'quarterly' ? label.quarterly : f === 'semi-annual' ? label.semi : label.yearly}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat label={label.perInst} value={formatEGP(plan.perInstallment)} accent />
        <Stat label={label.perMonth} value={formatEGP(plan.perMonthEquivalent)} />
        <Stat label={label.count} value={`${plan.installmentsCount}`} />
        <Stat label={label.financed} value={formatEGP(plan.financedAmount)} />
      </div>

      {/* Down vs financed bar */}
      <div className="mb-4">
        <div className="h-3 rounded-full overflow-hidden flex bg-[#0a1424] border border-white/10">
          <div
            className="h-full"
            style={{ width: `${downShare}%`, background: 'linear-gradient(90deg, #F5D78E, #C8961A)' }}
            title={`${label.down} ${formatEGP(plan.downPaymentAmount)}`}
          />
          <div
            className="h-full"
            style={{ width: `${100 - downShare}%`, background: 'linear-gradient(90deg, #1e3a5f, #2b4a75)' }}
            title={`${label.financed} ${formatEGP(plan.financedAmount)}`}
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-mono">
          <span>{label.down} {Math.round(downShare)}%</span>
          <span>{label.financed} {Math.round(100 - downShare)}%</span>
        </div>
      </div>

      {/* Condensed schedule */}
      <div>
        <div className="text-[10px] font-mono font-bold text-[#E9C176] uppercase tracking-widest mb-2">{label.schedule}</div>
        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {plan.schedule.slice(0, 4).map((row) => (
            <div
              key={row.index}
              className="flex justify-between items-center px-3 py-1.5 text-[10.5px] odd:bg-white/[0.03]"
            >
              <span className="text-slate-300 font-mono">
                {row.index === 0 ? '■' : `#${row.index}`} {row.dueLabel}
              </span>
              <span className="font-mono font-bold text-white">{formatEGPFull(row.amount)}</span>
            </div>
          ))}
          {plan.schedule.length > 5 && (
            <div className="px-3 py-1.5 text-[10px] text-slate-500 text-center font-mono">
              … {plan.schedule.length - 5} {label.more}
            </div>
          )}
          <div className="flex justify-between items-center px-3 py-1.5 text-[10.5px] bg-[#211A0D]">
            <span className="text-[#E9C176] font-bold font-mono">Σ {label.count} {plan.installmentsCount}</span>
            <span className="font-mono font-bold text-[#F5D78E]">{formatEGPFull(plan.totalPayable)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-[#0a1424] border border-white/10 px-3 py-2">
      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">{label}</div>
      <div className={`text-sm font-bold font-mono ${accent ? 'text-[#E9C176]' : 'text-white'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

/* ── Unit detail drawer ─────────────────────────────────────────────── */

export interface DrawerUnit {
  id: string;
  code: string;
  compound: string;
  developer?: string;
  zone?: string;
  type: string;
  operation: string;
  beds?: number | null;
  baths?: number | null;
  area?: number | null;
  price: number;
  status: string;
  photos?: string[];
  img?: string;
  finishing?: string;
  aiScore?: number;
  source?: string;
  tag?: string;
}

export function UnitDetailDrawer({
  unit,
  onClose,
  onStatusChange,
  isAr = false,
}: {
  unit: DrawerUnit | null;
  onClose: () => void;
  onStatusChange?: (unitId: string, nextStatus: string) => void;
  isAr?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (unit) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unit, onClose]);

  if (!unit) return null;

  const photo = unit.photos?.[0] || unit.img;
  const pricePerSqm = unit.area && unit.area > 0 ? unit.price / unit.area : null;
  const t = {
    unit: isAr ? 'الوحدة' : 'Unit Detail',
    compound: isAr ? 'الكمباند' : 'Compound',
    developer: isAr ? 'المطور' : 'Developer',
    type: isAr ? 'النوع' : 'Type',
    operation: isAr ? 'الغرض' : 'Operation',
    finishing: isAr ? 'التشطيب' : 'Finishing',
    source: isAr ? 'المصدر' : 'Source',
    status: isAr ? 'الحالة' : 'Status',
    perSqm: isAr ? 'سعر المتر' : 'Price / m²',
    photos: isAr ? 'الصور' : 'Photos',
    noPhotos: isAr ? 'لا توجد صور' : 'No photos yet',
    aiScore: 'AI Score',
  };

  const STATUS_OPTIONS = ['Available', 'Reserved', 'Sold', 'Rented', 'Hold', 'Archived'];

  return (
    <div className="fixed inset-0 z-[1200] flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="w-full max-w-md bg-[#0b1a2e] border-l border-[#C8961A]/25 overflow-y-auto"
        style={{ boxShadow: '-24px 0 60px rgba(0,0,0,0.55)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[#0b1a2e]/95 backdrop-blur border-b border-white/10">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-[#E9C176] uppercase">{t.unit}</div>
            <div className="text-base font-extrabold text-white">{unit.code}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Photo */}
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo}
              alt={unit.code}
              className="w-full h-44 object-cover rounded-2xl border border-white/10"
            />
          ) : (
            <div className="w-full h-44 rounded-2xl border border-dashed border-white/15 bg-[#0a1424] flex flex-col items-center justify-center text-slate-500 gap-2">
              <ImageOff className="w-8 h-8" />
              <span className="text-xs font-semibold">{t.noPhotos}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#211A0D] text-[#F5D78E] border border-[#C8961A]/40 flex items-center gap-1">
                <Camera className="w-3 h-3" /> Photo Hunter Radar
              </span>
            </div>
          )}

          {/* Price + status row */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold text-[#E9C176] font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatEGP(unit.price)}
              </div>
              {pricePerSqm && (
                <div className="text-[11px] text-slate-400 font-mono">
                  {t.perSqm}: {Math.round(pricePerSqm).toLocaleString('en-EG')} EGP
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono">{t.status}</span>
              <select
                value={unit.status}
                onChange={(e) => onStatusChange?.(unit.id, e.target.value)}
                className="bg-[#211A0D] border border-[#C8961A]/40 text-[#E9C176] text-xs font-bold rounded-lg px-2.5 py-1.5 cursor-pointer outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-[#0b1a2e]">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-2">
            <Spec icon={<Building2 className="w-3.5 h-3.5" />} label={t.compound} value={unit.compound || '—'} />
            <Spec icon={<Tag className="w-3.5 h-3.5" />} label={t.developer} value={unit.developer || '—'} />
            <Spec icon={<Tag className="w-3.5 h-3.5" />} label={t.type} value={unit.type || '—'} />
            <Spec
              icon={<Tag className="w-3.5 h-3.5" />}
              label={t.operation}
              value={unit.operation === 'Rent' ? (isAr ? 'إيجار' : 'Rent') : isAr ? 'بيع' : 'Sale'}
            />
            <Spec icon={<BedDouble className="w-3.5 h-3.5" />} label="Beds" value={unit.beds != null ? String(unit.beds) : '—'} />
            <Spec icon={<Bath className="w-3.5 h-3.5" />} label="Baths" value={unit.baths != null ? String(unit.baths) : '—'} />
            <Spec icon={<Ruler className="w-3.5 h-3.5" />} label="Area" value={unit.area ? `${unit.area} m²` : '—'} />
            <Spec icon={<Tag className="w-3.5 h-3.5" />} label={t.finishing} value={unit.finishing || '—'} />
          </div>

          {unit.aiScore != null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">{t.aiScore}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#0a1424] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (unit.aiScore / 10) * 100)}%`, background: 'linear-gradient(90deg, #C8961A, #F5D78E)' }}
                />
              </div>
              <span className="font-mono font-bold text-[#E9C176]">{unit.aiScore.toFixed(1)}</span>
            </div>
          )}

          {/* Payment studio */}
          <PaymentPlanCalculator price={unit.price} isAr={isAr} />
        </div>
      </aside>
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#0a1424] border border-white/10 px-3 py-2.5 flex items-center gap-2.5">
      <span className="text-[#E9C176] shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">{label}</div>
        <div className="text-xs font-bold text-white truncate">{value}</div>
      </div>
    </div>
  );
}
