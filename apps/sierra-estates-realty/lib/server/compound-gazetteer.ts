import 'server-only';
import { NEW_CAIRO_COMPOUNDS } from '@/components/Maps/compounds-data';

/**
 * SIERRA ESTATES 3.0 — MAP-PIN GAZETTEER (Phase 2.4 extension)
 *
 * Server-side coordinate gazetteer for interactive map pins. The single
 * source of truth is the curated, GPS-flagged compound list already shipped
 * in components/Maps/compounds-data.ts (33 GPS-verified compounds + 2
 * district-level fallback centroids). This module makes that data reachable
 * from server code — listing syndication resolves every unit's map pin
 * without a database round trip, and scripts/sync-compound-gazetteer.ts
 * pushes the same entries into public.compounds.
 *
 * Matching contract (deterministic, honest):
 *  1. exact English name (case-insensitive);
 *  2. exact Arabic name (case-insensitive);
 *  3. forward containment — a LONGER query containing a compound name
 *     ('hyde park new cairo phase 2' → Hyde Park);
 *  4. district-level fallback — a VAGUE query that is a substring of one of
 *     the two explicitly unverified district entries ('new cairo' → the
 *     General New Cairo Area centroid). Reverse containment is NEVER applied
 *     to verified compounds: 'new cairo' ⊂ 'Palm Hills New Cairo' does NOT
 *     mean the unit is in Palm Hills, so that match is forbidden here.
 *
 * Unknown compounds resolve to null — the caller reports the pin as
 * unresolved (§21: no invented coordinates, ever).
 */

export interface GazetteerMatch {
  code: string;
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
  /** False for the two district-level approximate centroids. */
  verified: boolean;
}

interface GazetteerEntry {
  code: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  isGpsVerified: boolean;
}

const ENTRIES: GazetteerEntry[] = NEW_CAIRO_COMPOUNDS.map((c) => ({
  code: c.code,
  nameEn: c.nameEn,
  nameAr: c.nameAr,
  lat: c.lat,
  lng: c.lng,
  isGpsVerified: c.isGpsVerified,
}));

const VERIFIED = ENTRIES.filter((e) => e.isGpsVerified);
const DISTRICT_LEVEL = ENTRIES.filter((e) => !e.isGpsVerified);

function norm(value: string | undefined | null): string {
  return String(value ?? '').trim().toLowerCase();
}

function normAlias(value: string | undefined | null): string {
  return norm(value)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

/**
 * Curated Arabic / English compound aliases that differ by spelling/transliteration
 * (never reverse district containment). Keys are normalized via `normAlias`.
 */
export const COMPOUND_ALIASES: Record<string, string> = {
  'ميفيدا التجمع': 'Mivida',
  'ميفيدا التجمع الخامس': 'Mivida',
  'ميفيدا القاهره الجديده': 'Mivida',
  'هاي سيلو': 'Hyde Park',
  'هايد بارك التجمع': 'Hyde Park',
  'هايد بارك القاهره الجديده': 'Hyde Park',
  'ماونتن فيو اي سيتي': 'Mountain View iCity',
  'ماونتن فيو آي سيتي': 'Mountain View iCity',
  'mv icity': 'Mountain View iCity',
  'بالم هيلز': 'Palm Hills New Cairo',
  'بالم هيلز التجمع': 'Palm Hills New Cairo',
  'بالم هيلز القاهره الجديده': 'Palm Hills New Cairo',
  'سوديك ايست': 'Villette',
  'فيليت سوديك': 'Villette',
  'سوديك فيليت': 'Villette',
  'زيد ايست': 'ZED East',
  'تاج سلطان': 'Taj City',
  'كمبوند سراي': 'Sarai',
  'البوسكو': 'Il Bosco City',
  'البوسكو سيتي': 'Il Bosco City',
  'ايست تاون': 'Eastown',
  'فيفث سكوير': 'Fifth Square',
  'واتر واي': 'The Waterway',
  'ذا واتر واي': 'The Waterway',
};

/** Forward containment: the entry name appears inside the query. */
function queryContainsEntry(query: string, entryName: string): boolean {
  const name = norm(entryName);
  // Short names would match far too broadly ('90 avenue' is fine at 10 chars;
  // a 3-char fragment is not).
  if (name.length < 5) return false;
  return query.includes(name);
}

/** Reverse containment against a district-level entry only (see header). */
function districtEntryContainsQuery(query: string, entryName: string): boolean {
  const name = norm(entryName);
  if (query.length < 4) return false;
  return name.includes(query);
}

/**
 * Resolve a compound name to its gazetteer coordinates (or null when
 * unknown). Never fabricates: district-level hits carry verified: false so
 * callers can label the pin as an approximate centroid.
 */
export function lookupCompoundCoordinate(
  compound: string | undefined | null,
): GazetteerMatch | null {
  const query = norm(compound);
  if (!query) return null;
  const normalizedQuery = normAlias(query);

  // 1–2: exact English / Arabic name against the verified compounds.
  for (const entry of VERIFIED) {
    if (query === norm(entry.nameEn) || normalizedQuery === normAlias(entry.nameAr)) {
      return { ...entry, name: entry.nameEn, verified: true };
    }
  }

  // 2b: explicit curated Arabic/English aliases.
  const aliasTarget = COMPOUND_ALIASES[normalizedQuery];
  if (aliasTarget) {
    const targetEntry = VERIFIED.find((e) => norm(e.nameEn) === norm(aliasTarget));
    if (targetEntry) {
      return { ...targetEntry, name: targetEntry.nameEn, verified: true };
    }
  }

  // 3: forward containment against the verified compounds.
  for (const entry of VERIFIED) {
    if (queryContainsEntry(query, entry.nameEn) || queryContainsEntry(normalizedQuery, normAlias(entry.nameAr))) {
      return { ...entry, name: entry.nameEn, verified: true };
    }
  }

  // 4: district-level approximate centroids (explicitly unverified).
  for (const entry of DISTRICT_LEVEL) {
    if (
      query === norm(entry.nameEn) ||
      normalizedQuery === normAlias(entry.nameAr) ||
      districtEntryContainsQuery(query, entry.nameEn) ||
      districtEntryContainsQuery(normalizedQuery, normAlias(entry.nameAr))
    ) {
      return { ...entry, name: entry.nameEn, verified: false };
    }
  }

  return null;
}

/** Jaro-Winkler string similarity in [0, 1]. */
export function jaroWinklerSimilarity(rawA: string, rawB: string): number {
  const a = normAlias(rawA);
  const b = normAlias(rawB);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxDist = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(b.length - 1, i + maxDist);
    for (let j = start; j <= end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return Number((jaro + prefix * 0.1 * (1 - jaro)).toFixed(4));
}

/**
 * Fuzzy compound resolver using strict lookup first, then Jaro-Winkler >= 0.82
 * against verified compounds & curated Arabic/English aliases.
 */
export function resolveCanonicalCompoundFuzzy(
  compound: string | undefined | null,
  threshold = 0.82,
): GazetteerMatch | null {
  const strict = lookupCompoundCoordinate(compound);
  if (strict) return strict;

  const normalizedQuery = normAlias(compound);
  if (normalizedQuery.length < 4) return null;

  let bestEntry: GazetteerEntry | null = null;
  let bestScore = 0;

  for (const entry of VERIFIED) {
    for (const candidate of [entry.nameEn, entry.nameAr]) {
      const score = jaroWinklerSimilarity(normalizedQuery, candidate);
      if (score >= threshold && score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }
  }

  for (const [aliasKey, targetName] of Object.entries(COMPOUND_ALIASES)) {
    const score = jaroWinklerSimilarity(normalizedQuery, aliasKey);
    if (score >= threshold && score > bestScore) {
      const entry = VERIFIED.find((e) => norm(e.nameEn) === norm(targetName));
      if (entry) {
        bestScore = score;
        bestEntry = entry;
      }
    }
  }

  return bestEntry ? { ...bestEntry, name: bestEntry.nameEn, verified: true } : null;
}

/** Number of gazetteer entries (verified + district-level). */
export function gazetteerEntryCount(): { verified: number; districtLevel: number } {
  return { verified: VERIFIED.length, districtLevel: DISTRICT_LEVEL.length };
}

/**
 * All verified entries — consumed by scripts/sync-compound-gazetteer.ts to
 * arm public.compounds with real map pins.
 */
export function verifiedGazetteerEntries(): GazetteerEntry[] {
  return VERIFIED.map((entry) => ({ ...entry }));
}
