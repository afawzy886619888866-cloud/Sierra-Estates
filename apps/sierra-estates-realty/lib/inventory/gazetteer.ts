/**
 * Inventory gazetteer — maps the free-text "Location" values used in the owner
 * CRM sheet to New-Cairo-area coordinates + a canonical label/zone, so every
 * unit can be plotted on the Leaflet map.
 *
 * Coordinates are approximate compound/area centroids (good enough for a city
 * overview map). Units that share a centroid are spread out client-side by the
 * map component, so exact per-unit accuracy is not required here.
 */

export interface GazetteerEntry {
  lat: number;
  lng: number;
  label: string;
  zone: string;
}

export interface ResolvedLocation extends GazetteerEntry {
  approx: boolean;
}

/** New Cairo centroid — fallback for locations we can't resolve. */
export const NEW_CAIRO_CENTER: GazetteerEntry = { lat: 30.03, lng: 31.47, label: 'New Cairo', zone: 'New Cairo' };

/**
 * Alias (already normalized via `normalizeKey`) → GazetteerEntry.
 */
export const GAZETTEER: Record<string, GazetteerEntry> = {
  madinaty: { lat: 30.101, lng: 31.664, label: 'Madinaty', zone: 'Madinaty' },
  'new cairo': { lat: 30.03, lng: 31.47, label: 'New Cairo', zone: 'New Cairo' },
  'new cairo prime': { lat: 30.03, lng: 31.47, label: 'New Cairo', zone: 'New Cairo' },
  '5th settlement': { lat: 30.02, lng: 31.52, label: '5th Settlement', zone: '5th Settlement' },
  'fifth settlement': { lat: 30.02, lng: 31.52, label: '5th Settlement', zone: '5th Settlement' },
  rehab: { lat: 30.058, lng: 31.514, label: 'Al Rehab', zone: 'Al Rehab' },
  'al rehab': { lat: 30.058, lng: 31.514, label: 'Al Rehab', zone: 'Al Rehab' },
  'up town cairo': { lat: 30.011, lng: 31.297, label: 'Uptown Cairo', zone: 'Mokattam' },
  'uptown cairo': { lat: 30.011, lng: 31.297, label: 'Uptown Cairo', zone: 'Mokattam' },
  uptown: { lat: 30.011, lng: 31.297, label: 'Uptown Cairo', zone: 'Mokattam' },
  'fifth square': { lat: 30.025, lng: 31.578, label: 'Fifth Square', zone: '5th Settlement' },
  '5th square': { lat: 30.025, lng: 31.578, label: 'Fifth Square', zone: '5th Settlement' },
  'fifth square (al marasem)': { lat: 30.025, lng: 31.578, label: 'Fifth Square', zone: '5th Settlement' },
  'fifth square boulevard': { lat: 30.027, lng: 31.582, label: 'Fifth Square Boulevard', zone: '5th Settlement' },
  mevida: { lat: 30.007, lng: 31.589, label: 'Mivida', zone: '5th Settlement' },
  mivida: { lat: 30.007, lng: 31.589, label: 'Mivida', zone: '5th Settlement' },
  'mivida parks': { lat: 30.003, lng: 31.595, label: 'Mivida Parks', zone: '5th Settlement' },
  cfc: { lat: 30.028, lng: 31.407, label: 'Cairo Festival City', zone: 'New Cairo' },
  'cairo festival city': { lat: 30.028, lng: 31.407, label: 'Cairo Festival City', zone: 'New Cairo' },
  'cairo festival city residences': { lat: 30.016, lng: 31.469, label: 'Cairo Festival City', zone: 'New Cairo' },
  'new-capital': { lat: 30.005, lng: 31.74, label: 'New Capital', zone: 'New Capital' },
  'new capital': { lat: 30.005, lng: 31.74, label: 'New Capital', zone: 'New Capital' },
  'administrative capital': { lat: 30.005, lng: 31.74, label: 'New Capital', zone: 'New Capital' },
  sodic: { lat: 30.018, lng: 31.587, label: 'SODIC East', zone: '5th Settlement' },
  'sodic east': { lat: 30.018, lng: 31.587, label: 'SODIC East', zone: '5th Settlement' },
  'hyde park': { lat: 30.008, lng: 31.645, label: 'Hyde Park', zone: '5th Settlement' },
  'hyde park new cairo': { lat: 30.008, lng: 31.645, label: 'Hyde Park', zone: '5th Settlement' },
  'hyde park phase 2': { lat: 30.012, lng: 31.652, label: 'Hyde Park Phase 2', zone: '5th Settlement' },
  'lake view residence': { lat: 30.022, lng: 31.532, label: 'Lake View Residence', zone: 'New Cairo' },
  'lake view': { lat: 30.022, lng: 31.532, label: 'Lake View Residence', zone: 'New Cairo' },
  narges: { lat: 30.052, lng: 31.47, label: 'El Narges', zone: 'New Cairo' },
  'el narges': { lat: 30.052, lng: 31.47, label: 'El Narges', zone: 'New Cairo' },
  'narges villas': { lat: 30.052, lng: 31.47, label: 'El Narges', zone: 'New Cairo' },
  'east town': { lat: 30.018, lng: 31.587, label: 'Eastown', zone: '5th Settlement' },
  eastown: { lat: 30.018, lng: 31.587, label: 'Eastown', zone: '5th Settlement' },
  'eastown (sodic)': { lat: 30.018, lng: 31.587, label: 'Eastown', zone: '5th Settlement' },
  villette: { lat: 30.053, lng: 31.598, label: 'Villette', zone: '5th Settlement' },
  'villette (sodic)': { lat: 30.053, lng: 31.598, label: 'Villette', zone: '5th Settlement' },
  'swan lake': { lat: 30.045, lng: 31.635, label: 'Swan Lake Residence', zone: '5th Settlement' },
  'swan lake residence': { lat: 30.045, lng: 31.635, label: 'Swan Lake Residence', zone: '5th Settlement' },
  '90 avenue': { lat: 30.028, lng: 31.572, label: '90 Avenue', zone: '5th Settlement' },
  '90 avenue (tabarak)': { lat: 30.028, lng: 31.572, label: '90 Avenue', zone: '5th Settlement' },
  'katameya dunes': { lat: 29.985, lng: 31.492, label: 'Katameya Dunes', zone: 'Katameya' },
  'katameya heights': { lat: 29.99, lng: 31.48, label: 'Katameya Heights', zone: 'Katameya' },
  'katameya gardens': { lat: 29.992, lng: 31.488, label: 'Katameya Gardens', zone: 'Katameya' },
  'village gardens katameya': { lat: 29.988, lng: 31.484, label: 'Village Gardens Katameya', zone: 'Katameya' },
  katameya: { lat: 29.99, lng: 31.48, label: 'Katameya', zone: 'Katameya' },
  'district 5': { lat: 30.012, lng: 31.5, label: 'District 5', zone: 'New Cairo' },
  'district 5 (marakez)': { lat: 30.012, lng: 31.5, label: 'District 5', zone: 'New Cairo' },
  'stone residence': { lat: 30.028, lng: 31.557, label: 'Stone Residence', zone: 'New Cairo' },
  'stone residence (rooya)': { lat: 30.028, lng: 31.557, label: 'Stone Residence', zone: 'New Cairo' },
  'the square': { lat: 30.033, lng: 31.542, label: 'The Square', zone: 'New Cairo' },
  'the square (al ahly sabbour)': { lat: 30.033, lng: 31.542, label: 'The Square', zone: 'New Cairo' },
  'el patio oro': { lat: 30.029, lng: 31.56, label: 'El Patio Oro', zone: 'New Cairo' },
  'el patio oro (la vista)': { lat: 30.029, lng: 31.56, label: 'El Patio Oro', zone: 'New Cairo' },
  'el patio 7': { lat: 30.035, lng: 31.565, label: 'El Patio 7', zone: 'New Cairo' },
  'el patio 7 (la vista)': { lat: 30.035, lng: 31.565, label: 'El Patio 7', zone: 'New Cairo' },
  'el patio 5 east': { lat: 30.14, lng: 31.6, label: 'El Patio 5 East', zone: 'Shorouk' },
  'el patio 5 east (la vista)': { lat: 30.14, lng: 31.6, label: 'El Patio 5 East', zone: 'Shorouk' },
  'azzar new cairo': { lat: 30.022, lng: 31.568, label: 'Azzar New Cairo', zone: 'New Cairo' },
  azzar: { lat: 30.022, lng: 31.568, label: 'Azzar New Cairo', zone: 'New Cairo' },
  'the brooks': { lat: 30.07, lng: 31.57, label: 'The Brooks', zone: 'Mostakbal' },
  'the brooks (pre)': { lat: 30.07, lng: 31.57, label: 'The Brooks', zone: 'Mostakbal' },
  stei8ht: { lat: 30.075, lng: 31.575, label: 'STEI8HT', zone: 'Mostakbal' },
  'stei8ht (lmd)': { lat: 30.075, lng: 31.575, label: 'STEI8HT', zone: 'Mostakbal' },
  'the crest': { lat: 30.068, lng: 31.562, label: 'The Crest', zone: 'Mostakbal' },
  'the crest (il cazar)': { lat: 30.068, lng: 31.562, label: 'The Crest', zone: 'Mostakbal' },
  'azad & azad views': { lat: 30.078, lng: 31.558, label: 'Azad & Azad Views', zone: 'Mostakbal' },
  azad: { lat: 30.078, lng: 31.558, label: 'Azad', zone: 'Mostakbal' },
  sarai: { lat: 30.005, lng: 31.66, label: 'Sarai', zone: 'Mostakbal' },
  'sarai (mnhd)': { lat: 30.005, lng: 31.66, label: 'Sarai', zone: 'Mostakbal' },
  bloomfields: { lat: 30.06, lng: 31.67, label: 'Bloomfields', zone: 'Mostakbal' },
  'bloomfields (tatweer misr)': { lat: 30.06, lng: 31.67, label: 'Bloomfields', zone: 'Mostakbal' },
  'taj city': { lat: 30.065, lng: 31.531, label: 'Taj City', zone: 'New Cairo' },
  'taj sultan': { lat: 30.062, lng: 31.535, label: 'Taj Sultan', zone: 'New Cairo' },
  'la mirada': { lat: 30.058, lng: 31.685, label: 'La Mirada', zone: 'Mostakbal' },
  'la mirada (inertia)': { lat: 30.058, lng: 31.685, label: 'La Mirada', zone: 'Mostakbal' },
  aeon: { lat: 30.03, lng: 31.58, label: 'Aeon', zone: '5th Settlement' },
  'aeon (tabarak)': { lat: 30.03, lng: 31.58, label: 'Aeon', zone: '5th Settlement' },
  'al burouj': { lat: 30.155, lng: 31.63, label: 'Al Burouj', zone: 'Shorouk' },
  'al burouj (capital group)': { lat: 30.155, lng: 31.63, label: 'Al Burouj', zone: 'Shorouk' },
  'dar misr el shorouk': { lat: 30.132, lng: 31.635, label: 'Dar Misr El Shorouk', zone: 'Shorouk' },
  'green square': { lat: 30.148, lng: 31.61, label: 'Green Square', zone: 'Shorouk' },
  'green square (sabbour)': { lat: 30.148, lng: 31.61, label: 'Green Square', zone: 'Shorouk' },
  'layan residence': { lat: 30.01, lng: 31.655, label: 'Layan Residence', zone: 'Mostakbal' },
  'layan residence (mnhd)': { lat: 30.01, lng: 31.655, label: 'Layan Residence', zone: 'Mostakbal' },
  jayd: { lat: 30.045, lng: 31.665, label: 'Jayd', zone: 'Mostakbal' },
  'jayd (iwan)': { lat: 30.045, lng: 31.665, label: 'Jayd', zone: 'Mostakbal' },
  'mountain view': { lat: 30.014, lng: 31.618, label: 'Mountain View', zone: '5th Settlement' },
  'mountain view icity': { lat: 30.014, lng: 31.618, label: 'Mountain View iCity', zone: '5th Settlement' },
  'mountain view executive': { lat: 30.018, lng: 31.61, label: 'Mountain View Executive', zone: '5th Settlement' },
  'zed east': { lat: 30.095, lng: 31.61, label: 'Zed East', zone: 'New Cairo' },
  'zed east (ora)': { lat: 30.095, lng: 31.61, label: 'Zed East', zone: 'New Cairo' },
  'the waterway': { lat: 30.028, lng: 31.612, label: 'The Waterway', zone: '5th Settlement' },
  waterway: { lat: 30.028, lng: 31.612, label: 'The Waterway', zone: '5th Settlement' },
  'palm-hills': { lat: 30.018, lng: 31.62, label: 'Palm Hills', zone: '5th Settlement' },
  'palm hills': { lat: 30.018, lng: 31.62, label: 'Palm Hills', zone: '5th Settlement' },
  'palm hills new cairo': { lat: 30.002, lng: 31.608, label: 'Palm Hills New Cairo', zone: '5th Settlement' },
  'el shorouk city': { lat: 30.121, lng: 31.616, label: 'El Shorouk', zone: 'El Shorouk' },
  'el shorouk': { lat: 30.121, lng: 31.616, label: 'El Shorouk', zone: 'El Shorouk' },
  shorouk: { lat: 30.121, lng: 31.616, label: 'El Shorouk', zone: 'El Shorouk' },
  'el shorouk springs': { lat: 30.135, lng: 31.615, label: 'El Shorouk Springs', zone: 'Shorouk' },
  oriana: { lat: 30.033, lng: 31.492, label: 'Oriana', zone: 'New Cairo' },
  'galleria moon valley': { lat: 30.02, lng: 31.55, label: 'Galleria Moon Valley', zone: 'New Cairo' },
  galleria: { lat: 30.02, lng: 31.55, label: 'Galleria Moon Valley', zone: 'New Cairo' },
  'south academy': { lat: 30.005, lng: 31.44, label: 'South Academy', zone: 'New Cairo' },
  'south academ': { lat: 30.005, lng: 31.44, label: 'South Academy', zone: 'New Cairo' },
  'north 90': { lat: 30.03, lng: 31.47, label: 'North 90th', zone: 'New Cairo' },
  'north 90th': { lat: 30.03, lng: 31.47, label: 'North 90th', zone: 'New Cairo' },
  andlos: { lat: 30.052, lng: 31.49, label: 'El Andalus', zone: 'New Cairo' },
  andalus: { lat: 30.052, lng: 31.49, label: 'El Andalus', zone: 'New Cairo' },
  'el andalus': { lat: 30.052, lng: 31.49, label: 'El Andalus', zone: 'New Cairo' },
  midtown: { lat: 30.015, lng: 31.515, label: 'Midtown', zone: '5th Settlement' },
  'mostakbal city': { lat: 30.05, lng: 31.65, label: 'Mostakbal City', zone: 'Mostakbal' },
  mostakbal: { lat: 30.05, lng: 31.65, label: 'Mostakbal City', zone: 'Mostakbal' },
  badya: { lat: 29.93, lng: 30.95, label: 'Badya', zone: '6th of October' },
  'sheikh zayed': { lat: 30.06, lng: 30.98, label: 'Sheikh Zayed', zone: 'Sheikh Zayed' },
  zayed: { lat: 30.06, lng: 30.98, label: 'Sheikh Zayed', zone: 'Sheikh Zayed' },
  '6th of october': { lat: 29.97, lng: 30.94, label: '6th of October', zone: '6th of October' },
  october: { lat: 29.97, lng: 30.94, label: '6th of October', zone: '6th of October' },
  'north coast': { lat: 30.92, lng: 28.85, label: 'North Coast', zone: 'North Coast' },
  sahel: { lat: 30.92, lng: 28.85, label: 'North Coast', zone: 'North Coast' },
  banafseg: { lat: 30.045, lng: 31.485, label: 'El Banafseg', zone: 'New Cairo' },
  'el banafseg': { lat: 30.045, lng: 31.485, label: 'El Banafseg', zone: 'New Cairo' },
  yasmine: { lat: 30.048, lng: 31.478, label: 'El Yasmine', zone: 'New Cairo' },
  'el yasmine': { lat: 30.048, lng: 31.478, label: 'El Yasmine', zone: 'New Cairo' },
  choueifat: { lat: 30.015, lng: 31.425, label: 'El Choueifat', zone: '5th Settlement' },
  'el choueifat': { lat: 30.015, lng: 31.425, label: 'El Choueifat', zone: '5th Settlement' },
  lotus: { lat: 30.038, lng: 31.512, label: 'El Lotus', zone: '5th Settlement' },
  'el lotus': { lat: 30.038, lng: 31.512, label: 'El Lotus', zone: '5th Settlement' },
  koronfel: { lat: 30.065, lng: 31.495, label: 'El Koronfel', zone: 'New Cairo' },
  'el koronfel': { lat: 30.065, lng: 31.495, label: 'El Koronfel', zone: 'New Cairo' },
  'madinaty district 1': { lat: 30.108, lng: 31.62, label: 'Madinaty District 1', zone: 'Madinaty' },
  'madinaty district 3': { lat: 30.098, lng: 31.63, label: 'Madinaty District 3', zone: 'Madinaty' },
  'madinaty district 7': { lat: 30.09, lng: 31.64, label: 'Madinaty District 7', zone: 'Madinaty' },
  'madinaty district 8': { lat: 30.102, lng: 31.648, label: 'Madinaty District 8', zone: 'Madinaty' },
  'madinaty executive villas': { lat: 30.115, lng: 31.635, label: 'Madinaty Executive Villas', zone: 'Madinaty' },
  'madinaty lake park': { lat: 30.088, lng: 31.655, label: 'Madinaty Lake Park', zone: 'Madinaty' },
};

/**
 * Normalize a raw location string into a gazetteer lookup key:
 * lowercase, strip Arabic diacritics + bidi/zero-width marks, collapse
 * whitespace.
 */
export function normalizeKey(raw: string): string {
  return String(raw || '')
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
 */
export function resolveLocation(raw: string): ResolvedLocation {
  const key = normalizeKey(raw);
  if (key) {
    if (GAZETTEER[key]) return { ...GAZETTEER[key], approx: false };
    const noCity = key.replace(/\s*city$/, '').trim();
    if (GAZETTEER[noCity]) return { ...GAZETTEER[noCity], approx: false };

    // Substring alias match
    for (const [k, v] of Object.entries(GAZETTEER)) {
      if (k.length >= 4 && (key.includes(k) || k.includes(key))) {
        return { ...v, approx: false };
      }
    }
  }
  return { ...NEW_CAIRO_CENTER, approx: true };
}
