'use client';
/**
 * Inventory OS — shared stage metadata, normalizers, formatters and the
 * Egyptian payment-plan calculator (DP + installments + balloon + maintenance).
 * Used by the pipeline board, grid, drawer and analytics.
 */

export type Stage =
  | 'draft' | 'pending_verification' | 'verified' | 'published'
  | 'reserved' | 'sold' | 'rented' | 'off_market' | 'expired' | 'archived';

export const STAGE_META: Record<string, { en: string; ar: string; color: string; hint: string }> = {
  draft: { en: 'Draft', ar: 'مسودة', color: 'var(--tx-m,#94a3b8)', hint: 'Raw ingestion — needs review intake' },
  pending_verification: { en: 'Pending Review', ar: 'بانتظار المراجعة', color: 'var(--amber,#f59e0b)', hint: 'Egypt 2023 transparency queue — verify ownership docs' },
  verified: { en: 'Verified', ar: 'موثّق', color: 'var(--gold-lt,#5FC9FF)', hint: 'Document-backed — ready to publish' },
  published: { en: 'Live', ar: 'معروض', color: 'var(--emerald,#34D399)', hint: 'Syndicated to portal + PropertyFinder' },
  reserved: { en: 'Reserved', ar: 'محجوز', color: 'var(--gold-champagne,#F5D76E)', hint: 'Escrow-locked — 14-day window' },
  sold: { en: 'Sold', ar: 'تم البيع', color: 'var(--red,#E63946)', hint: 'Terminal — contract closed' },
  rented: { en: 'Rented', ar: 'تم الإيجار', color: 'var(--purple,#A78BFA)', hint: 'Tenant contracted (can relist)' },
  off_market: { en: 'Off Market', ar: 'غير معروض', color: '#64748B', hint: 'Owner hold — seasonal or strategic' },
  expired: { en: 'Expired', ar: 'منتهي', color: '#FB7185', hint: 'Freshness SLA breached — re-verify to relist' },
  archived: { en: 'Archived', ar: 'مؤرشف', color: '#475569', hint: 'Terminal — out of active rotation' },
};

export const FLOW_STAGES: Stage[] = ['draft', 'pending_verification', 'verified', 'published', 'reserved', 'sold'];

/** Normalize any legacy status vocabulary to the canonical machine. */
export const norm = (s: unknown): string => {
  const v = String(s ?? '').toLowerCase().trim();
  if (['available', 'active', 'verified', 'new'].includes(v)) return 'published';
  if (['pending', 'pending review', 'pending_review', 'review'].includes(v)) return 'pending_verification';
  if (v === 'off-market' || v === 'off market') return 'off_market';
  return v || 'draft';
};

export const daysLeft = (iso?: string | null) =>
  iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)) : null;

export const fmtM = (n: unknown) => {
  const v = Number(n ?? 0);
  if (!v) return '—';
  return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v);
};

export const fmtEgp = (n: unknown) => `${Number(n ?? 0).toLocaleString('en-EG')} EGP`;

/* ─── Egyptian payment-plan calculator ──────────────────────────────── */
export type PlanInputs = {
  price: number;
  downPaymentPercent: number;   // e.g. 5
  installmentYears: number;     // e.g. 8
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  deliveryPaymentPercent: number; // balloon at delivery
  maintenanceFeePerSqm: number;
  areaSqm: number;
};

export type PlanResult = {
  downPayment: number;
  financed: number;
  installmentCount: number;
  perInstallment: number;
  balloon: number;
  maintenanceAnnual: number;
  totalOutlay: number;
  months: number;
};

const FREQ_PER_YEAR: Record<PlanInputs['frequency'], number> = {
  monthly: 12, quarterly: 4, semi_annual: 2, annual: 1,
};

export const FREQ_LABEL: Record<string, { en: string; ar: string }> = {
  monthly: { en: 'Monthly', ar: 'شهري' },
  quarterly: { en: 'Quarterly', ar: 'ربع سنوي' },
  semi_annual: { en: 'Semi-Annual', ar: 'نصف سنوي' },
  annual: { en: 'Annual', ar: 'سنوي' },
};

/**
 * Standard Egyptian developer plan math:
 *   down = price × dp%
 *   balloon = price × delivery% (payable at handover)
 *   financed = price − down − balloon, spread over tenure at the frequency
 *   maintenance is annual EGP/m² (quoted per meter of BUA), paid with service
 */
export function calcPlan(i: PlanInputs): PlanResult {
  const downPayment = Math.round((i.price * i.downPaymentPercent) / 100);
  const balloon = Math.round((i.price * i.deliveryPaymentPercent) / 100);
  const financed = Math.max(0, i.price - downPayment - balloon);
  const perYear = FREQ_PER_YEAR[i.frequency] ?? 4;
  const installmentCount = Math.round(i.installmentYears * perYear);
  const perInstallment = installmentCount > 0 ? Math.round(financed / installmentCount) : 0;
  const maintenanceAnnual = Math.round(i.maintenanceFeePerSqm * i.areaSqm);
  return {
    downPayment, financed, installmentCount, perInstallment, balloon, maintenanceAnnual,
    months: Math.round(i.installmentYears * 12),
    totalOutlay: downPayment + balloon + financed,
  };
}

/* ─── Type / finishing labels ───────────────────────────────────────── */
export const TYPE_LABEL: Record<string, { en: string; ar: string }> = {
  apartment: { en: 'Apartment', ar: 'شقة' },
  townhouse: { en: 'Townhouse', ar: 'تاون هاوس' },
  twin_house: { en: 'Twin House', ar: 'توين هاوس' },
  standalone_villa: { en: 'Standalone Villa', ar: 'فيلا مستقلة' },
  penthouse: { en: 'Penthouse', ar: 'بنتهاوس' },
  duplex: { en: 'Duplex', ar: 'دوبلكس' },
  studio: { en: 'Studio', ar: 'استوديو' },
  office: { en: 'Office', ar: 'مكتب' },
  retail: { en: 'Retail', ar: 'تجاري' },
  chalet: { en: 'Chalet', ar: 'شاليه' },
};

export const FINISH_LABEL: Record<string, { en: string; ar: string }> = {
  core_shell: { en: 'Core & Shell', ar: 'على الطوب' },
  semi_finished: { en: 'Semi-Finished', ar: 'نصف تشطيب' },
  fully_finished: { en: 'Fully Finished', ar: 'تشطيب كامل' },
  ultra_lux: { en: 'Ultra Lux', ar: 'ألترا لوكس' },
  furnished: { en: 'Furnished', ar: 'مفروش' },
};
