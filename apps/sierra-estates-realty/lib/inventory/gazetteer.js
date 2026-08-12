/**
 * Inventory gazetteer — maps the free-text "Location" values used in the owner
 * CRM sheet to New-Cairo-area coordinates + a canonical label/zone, so every
 * unit can be plotted on the Leaflet map.
 *
 * Coordinates are approximate compound/area centroids (good enough for a city
 * overview map). Units that share a centroid are spread out client-side by the
 * map component, so exact per-unit accuracy is not required here.
 *
 * This is a plain .js module (JSDoc-typed) on purpose: it is the single source
 * of truth shared by the Next.js runtime (lib/inventory + /api/inventory) and
 * the snapshot generator (scripts/build-inventory-snapshot.mjs).
 *
 * @typedef {Object} GazetteerEntry
 * @property {number} lat
 * @property {number} lng
 * @property {string} label  Canonical, display-ready location name.
 * @property {string} zone   Broad New Cairo zone bucket.
 */

/** New Cairo centroid — fallback for locations we can't resolve. */
export const NEW_CAIRO_CENTER = { lat: 30.03, lng: 31.47, label: 'New Cairo', zone: 'New Cairo' };

/**
 * Alias (already normalized via `normalizeKey`) → GazetteerEntry.
 * @type {Record<string, GazetteerEntry>}
 */
export const GAZETTEER = {
  madinaty: { lat: 30.101, lng: 31.664, label: 'Madinaty', zone: 'Madinaty' },
  'new cairo': { lat: 30.03, lng: 31.47, label: 'New Cairo', zone: 'New Cairo' },
  rehab: { lat: 30.058, lng: 31.514, label: 'Al Rehab', zone: 'Al Rehab' },
  'al rehab': { lat: 30.058, lng: 31.514, label: 'Al Rehab', zone: 'Al Rehab' },
  'up town cairo': { lat: 30.011, lng: 31.297, label: 'Uptown Cairo', zone: 'Mokattam' },
  'uptown cairo': { lat: 30.011, lng: 31.297, label: 'Uptown Cairo', zone: 'Mokattam' },
  uptown: { lat: 30.011, lng: 31.297, label: 'Uptown Cairo', zone: 'Mokattam' },
  'fifth square': { lat: 30.025, lng: 31.578, label: 'Fifth Square', zone: '5th Settlement' },
  '5th square': { lat: 30.025, lng: 31.578, label: 'Fifth Square', zone: '5th Settlement' },
  mevida: { lat: 30.007, lng: 31.589, label: 'Mivida', zone: '5th Settlement' },
  mivida: { lat: 30.007, lng: 31.589, label: 'Mivida', zone: '5th Settlement' },
  cfc: { lat: 30.028, lng: 31.407, label: 'Cairo Festival City', zone: 'New Cairo' },
  'cairo festival city': { lat: 30.028, lng: 31.407, label: 'Cairo Festival City', zone: 'New Cairo' },
  'new-capital': { lat: 30.005, lng: 31.74, label: 'New Capital', zone: 'New Capital' },
  'new capital': { lat: 30.005, lng: 31.74, label: 'New Capital', zone: 'New Capital' },
  'administrative capital': { lat: 30.005, lng: 31.74, label: 'New Capital', zone: 'New Capital' },
  sodic: { lat: 30.018, lng: 31.587, label: 'SODIC East', zone: '5th Settlement' },
  'hyde park': { lat: 30.008, lng: 31.645, label: 'Hyde Park', zone: '5th Settlement' },
  'lake view residence': { lat: 30.022, lng: 31.532, label: 'Lake View Residence', zone: 'New Cairo' },
  'lake view': { lat: 30.022, lng: 31.532, label: 'Lake View Residence', zone: 'New Cairo' },
  narges: { lat: 30.052, lng: 31.47, label: 'El Narges', zone: 'New Cairo' },
  'east town': { lat: 30.018, lng: 31.587, label: 'Eastown', zone: '5th Settlement' },
  eastown: { lat: 30.018, lng: 31.587, label: 'Eastown', zone: '5th Settlement' },
  'el shorouk city': { lat: 30.121, lng: 31.616, label: 'El Shorouk', zone: 'El Shorouk' },
  shorouk: { lat: 30.121, lng: 31.616, label: 'El Shorouk', zone: 'El Shorouk' },
  oriana: { lat: 30.033, lng: 31.492, label: 'Oriana', zone: 'New Cairo' },
  'galleria moon valley': { lat: 30.02, lng: 31.55, label: 'Galleria Moon Valley', zone: 'New Cairo' },
  galleria: { lat: 30.02, lng: 31.55, label: 'Galleria Moon Valley', zone: 'New Cairo' },
  waterway: { lat: 30.028, lng: 31.612, label: 'The Waterway', zone: '5th Settlement' },
  'the waterway': { lat: 30.028, lng: 31.612, label: 'The Waterway', zone: '5th Settlement' },
  'south academy': { lat: 30.005, lng: 31.44, label: 'South Academy', zone: 'New Cairo' },
  'south academ': { lat: 30.005, lng: 31.44, label: 'South Academy', zone: 'New Cairo' },
  'north 90': { lat: 30.03, lng: 31.47, label: 'North 90th', zone: 'New Cairo' },
  'north 90th': { lat: 30.03, lng: 31.47, label: 'North 90th', zone: 'New Cairo' },
  'palm-hills': { lat: 30.018, lng: 31.62, label: 'Palm Hills', zone: '5th Settlement' },
  'palm hills': { lat: 30.018, lng: 31.62, label: 'Palm Hills', zone: '5th Settlement' },
  andlos: { lat: 30.052, lng: 31.49, label: 'El Andalus', zone: 'New Cairo' },
  andalus: { lat: 30.052, lng: 31.49, label: 'El Andalus', zone: 'New Cairo' },
  'mountain view': { lat: 30.014, lng: 31.618, label: 'Mountain View', zone: '5th Settlement' },
  katameya: { lat: 29.99, lng: 31.48, label: 'Katameya', zone: 'Katameya' },
};

/**
 * Normalize a raw location string into a gazetteer lookup key:
 * lowercase, strip Arabic diacritics + bidi/zero-width marks, collapse
 * whitespace.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeKey(raw) {
  return String(raw || '')
    // strip zero-width / bidi control marks that leak in from the sheet
    .replace(/[\u200B-\u200F\u061C\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve a raw location string to coordinates + canonical label/zone.
 * Unknown / blank / junk values fall back to the New Cairo centroid and are
 * flagged `approx: true` so callers can treat them as low-confidence.
 * @param {string} raw
 * @returns {GazetteerEntry & { approx: boolean }}
 */
export function resolveLocation(raw) {
  const key = normalizeKey(raw);
  if (key) {
    // exact alias, then with a trailing " city" dropped (e.g. "El Shorouk City").
    const hit = GAZETTEER[key] || GAZETTEER[key.replace(/\s*city$/, '').trim()];
    if (hit) return { ...hit, approx: false };
  }
  return { ...NEW_CAIRO_CENTER, approx: true };
}
