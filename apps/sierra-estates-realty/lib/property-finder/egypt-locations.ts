/**
 * Verified Egypt Property Finder Atlas `location.id` catalog & Public Profiles.
 *
 * Extracted directly from Sierra Estates' 311 live Property Finder Enterprise
 * listings (`GET /v1/listings`). Used as a deterministic fallback when Atlas
 * `GET /v1/locations` is unavailable, while preserving §21 anti-fabrication:
 * unknown locations return `null` and NEVER default to a guessed ID.
 */

export const SIERRA_PF_PROFILES = {
  company: 79509,      // Sierra Estates (active)
  hebaMohamed: 56571,  // Heba Mohamed (active)
  ahmedFawzy: 50193,   // Ahmed Fawzy (active, +201061399688)
  emanZaki: 56492,     // Eman Zaki (active)
} as const;

const EGYPT_COMPOUND_LOCATION_IDS: ReadonlyArray<readonly [string, number]> = [
  // Specific sub-phases & multi-word compounds first (matched longest-first)
  ['mountain view hyde park', 2763],
  ['ماونتن فيو هايد بارك', 2763],
  ['mountain view icity', 42292],
  ['mountain view i-city', 42292],
  ['ماونتن فيو اي سيتي', 42292],
  ['ماونتن فيو آي سيتي', 42292],
  ['palm hills new cairo', 2619],
  ['بالم هيلز القاهرة الجديدة', 2619],
  ['cairo festival city', 2572],
  ['كايرو فيستيفال سيتي', 2572],
  ['كايرو فستيفال سيتي', 2572],
  ['lake view residence', 2767],
  ['ليك فيو ريزيدنس', 2767],
  ['galleria moon valley', 2611],
  ['gallery moon valley', 2611],
  ['جاليريا مون فالي', 2611],
  ['porto new cairo', 2761],
  ['بورتو نيو كايرو', 2761],
  ['بورتو كايرو', 2761],
  ['the village gate', 2619],
  ['ذا فيليدج جيت', 2619],
  ['the address east', 40633],
  ['address east', 40633],
  ['ذا ادريس ايست', 40633],
  ['sodic villette', 2754],
  ['سوديك فيليت', 2754],
  ['v residence', 2754],
  ['sodic eastown', 2752],
  ['sodic east town', 40660],
  ['سوديك إيستاون', 40660],
  ['سوديك ايستاون', 40660],
  ['fifth square', 41671],
  ['فيفث سكوير', 41671],
  ['moon residence', 41663],
  ['مون ريزدنس', 41663],
  ['al marasem', 41671],
  ['el marassem', 41671],
  ['المراسم', 41671],
  ['the square', 2755],
  ['ذا سكوير', 2755],
  ['the waterway', 41881],
  ['ذا ووتر واي', 41881],
  ['water way', 41881],
  ['waterway', 41881],
  ['الووترواي', 41881],
  ['uptown cairo', 40489],
  ['up town cairo', 40489],
  ['أب تاون كايرو', 40489],
  ['اب تاون كايرو', 40489],
  ['the sierras', 40488],
  ['ذا سييراس', 40488],
  ['west arabella', 2734],
  ['غرب ارابيلا', 2734],
  ['غرب أرابيلا', 2734],
  ['stone residence', 42095],
  ['stone park', 42095],
  ['ستون ريزيدنس', 42095],
  ['ستون بارك', 42095],
  ['trio gardens', 42135],
  ['تريو جاردنز', 42135],
  ['north lotus', 2792],
  ['اللوتس الشمالية', 2792],
  ['beta greens', 20206],
  ['بيتا جرينز', 20206],
  ['el patio 5', 10395],
  ['patio 5', 10395],
  ['باتيو 5', 10395],
  ['el shorouk', 10401],
  ['الشروق', 10401],
  ['shorouk', 10401],
  ['sheikh zayed', 40892],
  ['al sheikh zayed', 40892],
  ['الشيخ زايد', 40892],
  ['al maqsad', 40872],
  ['المقصد', 40872],
  ['1st settlement', 2634],
  ['first settlement', 2634],
  ['التجمع الأول', 2634],
  ['التجمع الاول', 2634],
  ['5th settlement', 2735],
  ['fifth settlement', 2735],
  ['التجمع الخامس', 2735],
  ['al rehab 2', 2285],
  ['rehab 2', 2285],
  ['الرحاب 2', 2285],
  ['al rehab', 2284],
  ['rehab city', 2284],
  ['الرحاب', 2284],
  ['rehab', 2284],
  ['al andalus 2', 40631],
  ['الأندلس 2', 40631],
  ['al andalus', 2402],
  ['andalus', 2402],
  ['andalas', 40631],
  ['الأندلس', 2402],
  ['الاندلس', 2402],
  ['al narges', 2283],
  ['النرجس', 2283],
  ['narges', 2283],
  ['90 avenue', 2621],
  ['90 أفينيو', 2621],
  ['90 افينيو', 2621],
  ['the village', 2614],
  ['ذا فيليدج', 2614],
  ['palm hills', 2619],
  ['بالم هيلز', 2619],
  ['hyde park', 2790],
  ['هايد بارك', 2790],
  ['moon valley', 2611],
  ['مون فالي', 2611],
  ['lake view', 2767],
  ['ليك فيو', 2767],
  ['east town', 2752],
  ['eastown', 2752],
  ['إيستاون', 2752],
  ['ايستاون', 2752],
  ['villette', 2754],
  ['فيليت', 2754],
  ['madinaty', 42270],
  ['مدينتي', 42270],
  ['mivida', 2751],
  ['ميفيدا', 2751],
  ['ميڤيدا', 2751],
  ['oriana 4', 40848],
  ['oriana', 2732],
  ['أوريانا', 2732],
  ['اوريانا', 2732],
  ['uptown', 40489],
  ['levana', 40490],
  ['ليفانا', 40490],
  ['aurora', 40485],
  ['aliva', 40481],
  ['اليفا', 40481],
  ['midtown', 2617],
  ['ميدتاون', 2617],
  ['landmark', 41018],
  ['لاند مارك', 41018],
  ['arabella', 2788],
  ['ارابيلا', 2788],
  ['أرابيلا', 2788],
  ['azad', 40800],
  ['أزاد', 40800],
  ['ازاد', 40800],
  ['lotus', 2792],
  ['اللوتس', 2792],
  ['icity', 42292],
  ['mvhp', 2763],
  ['cfc', 2572],
  ['lvr', 2767],
  ['rimas', 2575],
  ['ريماس', 2575],
  ['cairo plaza', 11381],
  ['كايرو بلازا', 11381],
  ['new cairo', 2786],
  ['القاهرة الجديدة', 2786],
];

const SORTED_ENTRIES = [...EGYPT_COMPOUND_LOCATION_IDS].sort(
  (a, b) => b[0].length - a[0].length,
);

const EXACT_MAP = new Map<string, number>(EGYPT_COMPOUND_LOCATION_IDS);

function normalizeLookup(input: string): string {
  return input
    .toLowerCase()
    .replace(/[_/\\|()[\],.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a real Egypt Property Finder integer `location.id` from a compound
 * or area label, or returns `null` if unknown (§21: never guesses a fallback).
 */
export function resolveEgyptPfLocationId(compoundOrArea?: string | null): number | null {
  if (!compoundOrArea) return null;
  const norm = normalizeLookup(String(compoundOrArea));
  if (!norm || norm === 'general' || norm === 'unknown') return null;

  const exact = EXACT_MAP.get(norm);
  if (typeof exact === 'number') return exact;

  for (const [needle, locId] of SORTED_ENTRIES) {
    if (norm.includes(needle)) {
      return locId;
    }
  }
  return null;
}

export function listKnownEgyptPfLocations(): ReadonlyArray<{ key: string; locationId: number }> {
  return SORTED_ENTRIES.map(([key, locationId]) => ({ key, locationId }));
}
