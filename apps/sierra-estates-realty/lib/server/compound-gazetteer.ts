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

  // 1–2: exact English / Arabic name against the verified compounds.
  for (const entry of VERIFIED) {
    if (query === norm(entry.nameEn) || query === norm(entry.nameAr)) {
      return { ...entry, name: entry.nameEn, verified: true };
    }
  }

  // 3: forward containment against the verified compounds.
  for (const entry of VERIFIED) {
    if (queryContainsEntry(query, entry.nameEn) || queryContainsEntry(query, entry.nameAr)) {
      return { ...entry, name: entry.nameEn, verified: true };
    }
  }

  // 4: district-level approximate centroids (explicitly unverified).
  for (const entry of DISTRICT_LEVEL) {
    if (
      query === norm(entry.nameEn) ||
      query === norm(entry.nameAr) ||
      districtEntryContainsQuery(query, entry.nameEn) ||
      districtEntryContainsQuery(query, entry.nameAr)
    ) {
      return { ...entry, name: entry.nameEn, verified: false };
    }
  }

  return null;
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
