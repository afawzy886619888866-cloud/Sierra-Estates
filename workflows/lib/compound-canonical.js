'use strict';

/**
 * compound-canonical.js — Canonical Compound Name Mapper (shared, plain JS).
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for compound-name canonicalization inside the
 * workflows runtime (Node, no build step). Ports the Apps Script
 * COMPOUND_GAZETTEER (scripts/GoogleAppsScript_SierraEstates_Engine.gs) 1:1
 * and adds the Mission-3 alias families (cfc / mvd / هايد بارك / اب تاون …).
 *
 * Used by:
 *   · workflows/12-telegram-intake/bot.js  (canonical compound on intake)
 *   · workflows/lib/dedup-index.js         (canonical compound in the key)
 *   · workflows/13-paced-outreach/         (segment targeting)
 *   · workflows/14-sheets-supabase-sync/   (two-way canonical writes)
 *
 * Resolution order (mirrors resolveFamousCompoundName in the .gs):
 *   1. exact alias hit (case/space-insensitive)
 *   2. substring alias hit (longest alias first — "hyde park business
 *      district" must not be stolen by a shorter "hyde park" entry)
 *   3. word-capitalized fallback (unknown compounds pass through, titled)
 */

// ── gazetteer (alias → canonical) ──────────────────────────────────────────
const COMPOUND_GAZETTEER = {
  // Cairo Festival City
  'cfc': 'Cairo Festival City',
  'cairo festival city': 'Cairo Festival City',
  'cairo festival': 'Cairo Festival City',
  'كايرو فيستيفال': 'Cairo Festival City',
  'كايرو فيستيفال سيتي': 'Cairo Festival City',
  'festival city': 'Cairo Festival City',
  'oriana': 'Oriana (Festival City)',
  'oriana 2': 'Oriana (Festival City)',
  'اوريانا': 'Oriana (Festival City)',

  // Madinaty
  'madinaty': 'Madinaty',
  'مدينتي': 'Madinaty',

  // Al Rehab
  'rehab': 'Al Rehab',
  'al rehab': 'Al Rehab',
  'الرحاب': 'Al Rehab',

  // Mivida
  'mivida': 'Mivida',
  'mevida': 'Mivida',
  'mvd': 'Mivida',
  'ميفيدا': 'Mivida',

  // Eastown
  'eastown': 'Eastown',
  'east town': 'Eastown',
  'ايست تاون': 'Eastown',

  // Hyde Park
  'hyde park': 'Hyde Park',
  'haid bark': 'Hyde Park',
  'hayd park': 'Hyde Park',
  'هايد بارك': 'Hyde Park',
  'هايد بارك ٦ اكتوبر': 'Hyde Park',
  'hyde park business district': 'Hyde Park',

  // Fifth Square
  'fifth square': 'Fifth Square',
  'فيفث سكوير': 'Fifth Square',
  'المراسم': 'Fifth Square',
  'al marasem': 'Fifth Square',

  // Lake View Residence
  'lake view residence': 'Lake View Residence',
  'lake view': 'Lake View Residence',
  'lakeview': 'Lake View Residence',
  'ليك فيو': 'Lake View Residence',

  // Villette
  'villette': 'Villette',
  'فيليت': 'Villette',
  'villette sodic': 'Villette',

  // Uptown Cairo
  'uptown cairo': 'Uptown Cairo',
  'up town cairo': 'Uptown Cairo',
  'uptown': 'Uptown Cairo',
  'اب تاون': 'Uptown Cairo',
  'أب تاون': 'Uptown Cairo',
  'اب تاون كايرو': 'Uptown Cairo',
  'أبتاون كايرو': 'Uptown Cairo',

  // Mountain View
  'mountain view': 'Mountain View iCity',
  'mountain view icity': 'Mountain View iCity',
  'mv icity': 'Mountain View iCity',
  'ماونتن فيو': 'Mountain View iCity',
  'ماونتن فيو اي سيتي': 'Mountain View iCity',
  'ماونتن فيو إي سيتي': 'Mountain View iCity',

  // SODIC
  'sodic': 'SODIC East',
  'sodic east': 'SODIC East',
  'سوديك': 'SODIC East',

  // The Waterway
  'waterway': 'The Waterway',
  'the waterway': 'The Waterway',
  'الوترواي': 'The Waterway',
  'الووترواي': 'The Waterway',
  'capital way by water way': 'The Capitalway',

  // Galleria
  'galleria moon valley': 'Galleria Moon Valley',
  'جاليريا مون فالي': 'Galleria Moon Valley',
  'galleria': 'Galleria Moon Valley',

  // Katameya
  'katameya dunes': 'Katameya Dunes',
  'قطامية ديونز': 'Katameya Dunes',
  'katameya': 'Katameya Heights',
  'قطامية هايتس': 'Katameya Heights',

  // Swan Lake
  'swan lake': 'Swan Lake',
  'swan lake north coast': 'Swan Lake North Coast',
  'سوان ليك': 'Swan Lake',

  // 90 Avenue
  '90 avenue': '90 Avenue',
  'تسعين افينيو': '90 Avenue',

  // Palm Hills
  'palm hills': 'Palm Hills New Cairo',
  'بالم هيلز': 'Palm Hills New Cairo',
  'badya': 'Badya (Palm Hills)',
  'بادية': 'Badya (Palm Hills)',

  // New Cairo (general / districts)
  'new cairo': 'New Cairo (General)',
  'new-cairo': 'New Cairo (General)',
  '5th settlement': 'New Cairo (General)',
  'fifth settlement': 'New Cairo (General)',
  'التجمع الخامس': 'New Cairo (General)',
  'القاهرة الجديدة': 'New Cairo (General)',
  'north 90': 'North 90 (New Cairo)',
  'south academ': 'South Academy (New Cairo)',
  'narges': 'Al Narges (New Cairo)',
  'andlos': 'Al Andalus (New Cairo)',
  'gardina city': 'Gardenia City',
};

// Longest-alias-first list for substring resolution.
const SUBSTRING_ALIASES = Object.keys(COMPOUND_GAZETTEER)
  .filter((a) => a.length >= 3)
  .sort((a, b) => b.length - a.length);

/** Normalize a raw compound string for lookup (digits to western, trimmed,
 *  lower-cased, collapsed whitespace). */
function normalizeForLookup(raw) {
  return String(raw || '')
    .replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) & 0xf))
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Resolve any compound alias to its famous canonical name.
 * Mirrors resolveFamousCompoundName() from the Apps Script Engine.
 * @param {string} raw
 * @returns {string} canonical name (never empty; unknown → title-cased input)
 */
function resolveCanonicalCompound(raw) {
  const input = String(raw || '').trim();
  if (!input || input === '0' || input.toLowerCase() === 'null') {
    return 'New Cairo (General)';
  }
  const low = normalizeForLookup(input);
  if (COMPOUND_GAZETTEER[low]) return COMPOUND_GAZETTEER[low];
  for (const alias of SUBSTRING_ALIASES) {
    if (low.includes(alias)) return COMPOUND_GAZETTEER[alias];
  }
  return input.replace(/\b\w/g, (l) => l.toUpperCase());
}

/** True when the value carries a known canonical form. */
function isKnownCompound(raw) {
  const low = normalizeForLookup(raw);
  if (!low) return false;
  if (COMPOUND_GAZETTEER[low]) return true;
  return SUBSTRING_ALIASES.some((alias) => low.includes(alias));
}

/** Canonical list for dropdown validation (sorted, deduped). */
function canonicalCompoundList() {
  return [...new Set(Object.values(COMPOUND_GAZETTEER))].sort();
}

module.exports = {
  COMPOUND_GAZETTEER,
  resolveCanonicalCompound,
  isKnownCompound,
  canonicalCompoundList,
  normalizeForLookup,
};
