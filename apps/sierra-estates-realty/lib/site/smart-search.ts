/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SMART SEARCH — single source of truth for client search vocabulary.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Organizes what used to be scattered/duplicated ("nesty") filter data:
 *    1. Compound SHORT display names (lowercase map-pill labels) — one curated
 *       registry instead of per-component ad-hoc truncation.
 *    2. Condition (finishing) normalization — Arabic/English free text from
 *       inventory rows → stable enum keys used by every filter surface.
 *    3. Budget ladders — aligned EXACTLY with /properties and /net presets so
 *       hero → /properties links actually filter (they silently didn't before).
 *    4. Unit-type / room option lists shared by SmartFilterBar consumers.
 */

/* ═══════════════ 1. Compound short display names (lowercase) ═══════════════ */

/**
 * Curated map-pill labels. Keys are the canonical English compound names as
 * used by lib/site/data.ts (HZDATA) and components/Maps/compounds-data.ts.
 * Values are deliberately lowercase + compact so Leaflet pills never crowd
 * the masterplan map (owner request: "short name in small letters").
 */
const SHORT_NAMES: Record<string, string> = {
  // Golden Square / 5th Settlement
  'cairo plaza': 'cairo plaza',
  'mivida': 'mivida',
  'mivida parks': 'mivida parks',
  'hyde park': 'hyde park',
  'hyde park new cairo': 'hyde park',
  'hyde park phase 2': 'hyde park p2',
  'mountain view icity': 'mv icity',
  'mountain view executive': 'mv exec',
  'eastown': 'eastown',
  'villette': 'villette',
  'palm hills new cairo': 'palm hills',
  'fifth square': 'fifth sq',
  'fifth square boulevard': 'fs blvd',
  '90 avenue': '90 ave',
  'aeon': 'aeon',
  'the waterway': 'waterway',
  'swan lake residence': 'swan lake',
  'lake view residence': 'lake view',
  'stone residence': 'stone res',
  'the square': 'the square',
  'el patio oro': 'patio oro',
  'el patio 7': 'patio 7',
  'district 5': 'd5',
  'galleria moon valley': 'gmv',
  'azzar new cairo': 'azzar',
  'zed east': 'zed east',
  // Katameya
  'katameya heights': 'katameya hts',
  'katameya dunes': 'katameya dunes',
  'katameya gardens': 'katameya gdns',
  'village gardens katameya': 'vg katameya',
  // New Cairo corridors
  'al narges': 'narges',
  'al banafsaj': 'banafsaj',
  'al andalus': 'andalus',
  'south academy': 's academy',
  'north 90th': 'n 90th',
  'gardenia city': 'gardenia',
  'cairo festival city': 'cfc',
  'cairo festival city residences': 'cfc res',
  // East / Mostakbal
  'taj city': 'taj city',
  'taj sultan': 'taj sultan',
  'the brooks': 'brooks',
  'stei8ht': 'stei8ht',
  'the crest': 'crest',
  'azad & azad views': 'azad',
  'sarai': 'sarai',
  'bloomfields': 'bloomfields',
  'la mirada': 'la mirada',
  'layan residence': 'layan',
  'jayd': 'jayd',
  // Madinaty / Rehab / Shorouk
  'madinaty': 'madinaty',
  'madinaty district 1': 'madinaty d1',
  'madinaty district 3': 'madinaty d3',
  'madinaty district 7': 'madinaty d7',
  'madinaty district 8': 'madinaty d8',
  'madinaty executive villas': 'madinaty exec',
  'madinaty lake park': 'madinaty lake',
  'al rehab': 'rehab',
  'uptown cairo': 'uptown',
  'el shorouk city': 'shorouk',
  'el shorouk springs': 'shorouk spr',
  'al burouj': 'burouj',
  'el patio 5 east': 'patio 5 e',
  'dar misr el shorouk': 'dar misr',
  'green square': 'green sq',
  // compounds-data.ts extras / area gazetteers
  'badya': 'badya',
  'el narges & choueifat area': 'narges choueifat',
  'general new cairo area (unspecified sector)': 'new cairo area',
};

/**
 * Lowercase compact label for map pills. Curated table first, then a
 * deterministic fallback (strip parentheticals + city noise, truncate at a
 * word boundary) so NEW compounds get a sane short label automatically.
 */
export function compoundShortName(name?: string | null): string {
  if (!name) return '';
  const raw = String(name).trim();
  if (!raw) return '';
  const direct = SHORT_NAMES[raw] || SHORT_NAMES[raw.toLowerCase()];
  if (direct) return direct;
  let s = raw
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bnew cairo\b/g, ' ')
    .replace(/\bcompound\b/g, ' ')
    .replace(/\bresidences\b/g, 'res')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > 16) {
    const cut = s.slice(0, 16);
    const sp = cut.lastIndexOf(' ');
    s = (sp > 6 ? cut.slice(0, sp) : cut).trim();
  }
  return s || raw.toLowerCase();
}

/* ═══════════════ 2. Condition (finishing) normalization ═══════════════ */

export type ConditionKey = '' | 'fully' | 'semi' | 'core' | 'furnished' | 'new';
export type ResolvedCondition = Exclude<ConditionKey, ''> | 'unknown';

export interface ConditionLike {
  finishing?: string | null;
  finishingQuality?: string | null;
  furnishing?: string | null;
  furnished?: string | boolean | null;
}

/** Collapse mixed AR/EN finishing free-text into one stable key. */
export function unitConditionKey(unit: ConditionLike): ResolvedCondition {
  const parts = [
    unit.finishing,
    unit.finishingQuality,
    unit.furnishing,
    typeof unit.furnished === 'boolean' ? (unit.furnished ? 'furnished' : '') : unit.furnished,
  ];
  const s = parts.filter(Boolean).join(' ').toLowerCase();
  if (!s.trim()) return 'unknown';

  // Furnished wins over finishing level (a furnished unit is market-ready).
  if (/furnished|مفروش/.test(s) && !/unfurnished|غير مفروش/.test(s)) return 'furnished';
  // Company/developer finishing ≈ fully finished in the Egyptian market.
  if (/(fully|full[\s-]?finish|سوبر|super lux|لوكس|تشطيب كامل|تشطيبات شرك|تشطيب شرك|developer finish|company finish)/.test(s)) return 'fully';
  if (/(semi|نصف تشطيب|نصف\/|half[\s-]?finish|نصف)/.test(s)) return 'semi';
  if (/(core|shell|على الطوب|طوب أحمر|red brick|بدون تشطيب)/.test(s)) return 'core';
  if (/(brand[\s-]?new|never[\s-]?lived|لم يسكن|جديد تماما|جديد تمام|all new|new unit)/.test(s)) return 'new';
  return 'unknown';
}

/** Strict filter: unknown data only matches when no condition selected. */
export function unitMatchesCondition(unit: ConditionLike, selected: ConditionKey | string): boolean {
  if (!selected) return true;
  return unitConditionKey(unit) === selected;
}

export const CONDITION_OPTIONS: { val: ConditionKey; en: string; ar: string }[] = [
  { val: '', en: 'Any Condition', ar: 'أي حالة' },
  { val: 'fully', en: 'Fully Finished', ar: 'تشطيب كامل' },
  { val: 'semi', en: 'Semi Finished', ar: 'نصف تشطيب' },
  { val: 'core', en: 'Core & Shell', ar: 'على الطوب' },
  { val: 'furnished', en: 'Furnished', ar: 'مفروش' },
  { val: 'new', en: 'Brand New', ar: 'جديد تماماً' },
];

/* ═══════════════ 3. Budget ladders (aligned with /properties + /net) ═══════════════ */

export interface BudgetOption {
  val: string;
  en: string;
  ar: string;
  /** Inclusive price bounds in EGP (absolute). rent bounds are monthly EGP. */
  min?: number;
  max?: number;
}

export const SALE_BUDGET_LADDER: BudgetOption[] = [
  { val: '', en: 'Any Budget', ar: 'أي ميزانية' },
  { val: 'under10m', en: 'Under 10M EGP', ar: 'أقل من 10 مليون', max: 10_000_000 },
  { val: '10m-20m', en: '10M – 20M EGP', ar: '10 - 20 مليون', min: 10_000_000, max: 20_000_000 },
  { val: '20m-35m', en: '20M – 35M EGP', ar: '20 - 35 مليون', min: 20_000_000, max: 35_000_000 },
  { val: '35m-50m', en: '35M – 50M EGP', ar: '35 - 50 مليون', min: 35_000_000, max: 50_000_000 },
  { val: 'above50m', en: '50M+ EGP', ar: 'أكثر من 50 مليون', min: 50_000_000 },
];

export const RENT_BUDGET_LADDER: BudgetOption[] = [
  { val: '', en: 'Any Rent', ar: 'أي إيجار' },
  { val: 'under35k', en: 'Under 35k EGP/mo', ar: 'أقل من 35 ألف', max: 35_000 },
  { val: '35k-60k', en: '35k – 60k EGP/mo', ar: '35 - 60 ألف', min: 35_000, max: 60_000 },
  { val: '60k-100k', en: '60k – 100k EGP/mo', ar: '60 - 100 ألف', min: 60_000, max: 100_000 },
  { val: 'above100k', en: '100k+ EGP/mo', ar: 'أكثر من 100 ألف', min: 100_000 },
];

/** Resolve a budget preset to numeric bounds (works for custom ladders too). */
export function budgetBounds(
  val: string,
  ladder: BudgetOption[]
): { min?: number; max?: number } {
  const hit = ladder.find((o) => o.val === val);
  if (!hit) return {};
  return { min: hit.min, max: hit.max };
}

/** Unit price in absolute EGP regardless of rent/sale representation. */
export function unitPriceEgp(unit: { mode?: string; price?: number; egpM?: number }): number {
  if (typeof unit.price === 'number' && unit.price > 0) return unit.price;
  const m = typeof unit.egpM === 'number' ? unit.egpM : 0;
  if (unit.mode === 'rent') return m > 0 && m < 10_000 ? m * 1000 : 0; // rent egpM is stored in k EGP
  return m * 1_000_000;
}

/* ═══════════════ 4. Shared option lists + smart filter state ═══════════════ */

export const UNIT_TYPE_OPTIONS: { val: string; en: string; ar: string }[] = [
  { val: '', en: 'Any Type', ar: 'أي نوع' },
  { val: 'Apartment', en: 'Apartment', ar: 'شقة' },
  { val: 'Villa', en: 'Villa', ar: 'فيلا' },
  { val: 'Townhouse', en: 'Townhouse', ar: 'تاون هاوس' },
  { val: 'Twin House', en: 'Twin House', ar: 'توين هاوس' },
  { val: 'Duplex', en: 'Duplex', ar: 'دوبلكس' },
  { val: 'Penthouse', en: 'Penthouse', ar: 'بنتهاوس' },
  { val: 'Studio', en: 'Studio', ar: 'استوديو' },
  { val: 'Chalet', en: 'Chalet', ar: 'شاليه' },
];

/** rooms === '' → any · '1'…'5' → N+ bedrooms (Studio lives in unit type). */
export const ROOM_OPTIONS: { val: string; label: string; labelAr: string }[] = [
  { val: '', label: 'Any', labelAr: 'الكل' },
  { val: '1', label: '1+', labelAr: '1+' },
  { val: '2', label: '2+', labelAr: '2+' },
  { val: '3', label: '3+', labelAr: '3+' },
  { val: '4', label: '4+', labelAr: '4+' },
  { val: '5', label: '5+', labelAr: '5+' },
];

export interface SmartFilterValue {
  /** 'sale' = resale/buy · 'rent' = rental */
  purpose: 'sale' | 'rent';
  /** Canonical compound name or area keyword · '' = anywhere */
  compound: string;
  /** '' = any · '1'…'5' = N+ rooms */
  rooms: string;
  /** Budget preset val aligned with /properties + /net ladders */
  budget: string;
  /** Canonical unit type · '' = any */
  unitType: string;
  /** ConditionKey · '' = any */
  condition: string;
}

export const EMPTY_SMART_FILTER: SmartFilterValue = {
  purpose: 'sale',
  compound: '',
  rooms: '',
  budget: '',
  unitType: '',
  condition: '',
};

/** True when at least one facet of the smart filter is active. */
export function hasSmartFilterValue(v: SmartFilterValue): boolean {
  return Boolean(v.compound || v.rooms || v.budget || v.unitType || v.condition);
}

/** Count of active facets (for filter badges). */
export function smartFilterActiveCount(v: SmartFilterValue): number {
  return [v.compound, v.rooms, v.budget, v.unitType, v.condition].filter(Boolean).length;
}
