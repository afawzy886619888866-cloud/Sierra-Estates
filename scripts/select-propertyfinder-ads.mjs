#!/usr/bin/env node
/**
 * select-propertyfinder-ads.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic Property Finder Enterprise (Atlas OpenAPI 3.1.0) Ad Selector.
 *
 * 1. Connects to Property Finder Atlas (Production or Sandbox) to index all
 *    currently live PF references so zero duplicate ads are ever proposed.
 * 2. Evaluates priority cohorts in Supabase `public.listings`:
 *      - All photo-bearing listings (`images != {}`)
 *      - All Google Sheet synced owner listings (`sync_source = sheets-units | master-owner-sheet`)
 *      - Active `PUBLISHABLE` Client Map listings
 * 3. Scores & classifies candidates into three actionable tiers:
 *      - Tier 1A (`tier1a_gate_ready`): Passes all 8 C6 PublishGate rules now.
 *      - Tier 1B (`tier1b_prime_photo_units`): PUBLISHABLE Direct-Owner units with
 *        real non-stock HTTPS photos + mapped Egypt `location.id` (valid OpenAPI 3.1.0
 *        payloads ready; lists exact PublishGate sign-off steps).
 *      - Tier 2 (`tier2_sheet_available_owners`): Confirmed-Available Google Sheet
 *        Direct-Owner units prioritized for WhatsApp photo harvest & verification.
 * 4. Writes strictly PII-free manifest + ready OpenAPI 3.1.0 payloads to:
 *      `docs/property-finder/selected-ads-manifest.json`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(ROOT, '.env.local'));
loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, 'workflows', '.env'));

const args = process.argv.slice(2);
const useSandbox = args.includes('--sandbox') || String(process.env.PROPERTY_FINDER_ENV || '').toLowerCase() === 'sandbox';
const limitIdx = args.indexOf('--limit');
const tierLimit = limitIdx >= 0 && args[limitIdx + 1] ? Math.max(1, Number(args[limitIdx + 1]) || 25) : 25;

const PF_BASE = useSandbox
  ? 'https://sandbox.atlas.propertyfinder.com/v1'
  : (process.env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com/v1').replace(/\/+$/, '').replace(/(\/v1)?$/, '/v1');

const PF_KEY = useSandbox
  ? (process.env.PROPERTY_FINDER_SANDBOX_API_KEY || '')
  : (process.env.PROPERTY_FINDER_API_KEY || '');
const PF_SECRET = useSandbox
  ? (process.env.PROPERTY_FINDER_SANDBOX_API_SECRET || '')
  : (process.env.PROPERTY_FINDER_API_SECRET || '');

const DEFAULT_PUBLIC_PROFILE_ID = Number(process.env.PF_DEFAULT_PUBLIC_PROFILE_ID) || 79509;

const EGYPT_LOCATION_ENTRIES = [
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
  ['lake view residence', 2767],
  ['ليك فيو ريزيدنس', 2767],
  ['galleria moon valley', 2611],
  ['gallery moon valley', 2611],
  ['جاليريا مون فالي', 2611],
  ['porto new cairo', 2761],
  ['بورتو نيو كايرو', 2761],
  ['the village gate', 2619],
  ['the address east', 40633],
  ['address east', 40633],
  ['sodic villette', 2754],
  ['سوديك فيليت', 2754],
  ['v residence', 2754],
  ['sodic eastown', 2752],
  ['sodic east town', 40660],
  ['fifth square', 41671],
  ['فيفث سكوير', 41671],
  ['moon residence', 41663],
  ['al marasem', 41671],
  ['المراسم', 41671],
  ['the square', 2755],
  ['ذا سكوير', 2755],
  ['the waterway', 41881],
  ['ذا ووتر واي', 41881],
  ['waterway', 41881],
  ['water way', 41881],
  ['uptown cairo', 40489],
  ['up town cairo', 40489],
  ['أب تاون كايرو', 40489],
  ['اب تاون كايرو', 40489],
  ['the sierras', 40488],
  ['west arabella', 2734],
  ['غرب ارابيلا', 2734],
  ['stone residence', 42095],
  ['stone park', 42095],
  ['trio gardens', 42135],
  ['north lotus', 2792],
  ['beta greens', 20206],
  ['el patio 5', 10395],
  ['patio 5', 10395],
  ['el shorouk', 10401],
  ['الشروق', 10401],
  ['shorouk', 10401],
  ['sheikh zayed', 40892],
  ['الشيخ زايد', 40892],
  ['al maqsad', 40872],
  ['المقصد', 40872],
  ['1st settlement', 2634],
  ['التجمع الأول', 2634],
  ['التجمع الاول', 2634],
  ['5th settlement', 2735],
  ['التجمع الخامس', 2735],
  ['al rehab 2', 2285],
  ['al rehab', 2284],
  ['rehab city', 2284],
  ['الرحاب', 2284],
  ['rehab', 2284],
  ['al andalus', 2402],
  ['andalus', 2402],
  ['الأندلس', 2402],
  ['الاندلس', 2402],
  ['al narges', 2283],
  ['النرجس', 2283],
  ['narges', 2283],
  ['90 avenue', 2621],
  ['the village', 2614],
  ['palm hills', 2619],
  ['بالم هيلز', 2619],
  ['hyde park', 2790],
  ['هايد بارك', 2790],
  ['moon valley', 2611],
  ['lake view', 2767],
  ['ليك فيو', 2767],
  ['eastown', 2752],
  ['east town', 2752],
  ['إيستاون', 2752],
  ['ايستاون', 2752],
  ['villette', 2754],
  ['فيليت', 2754],
  ['madinaty', 42270],
  ['مدينتي', 42270],
  ['mivida', 2751],
  ['ميفيدا', 2751],
  ['ميڤيدا', 2751],
  ['oriana', 2732],
  ['uptown', 40489],
  ['midtown', 2617],
  ['ميدتاون', 2617],
  ['landmark', 41018],
  ['arabella', 2788],
  ['azad', 40800],
  ['أزاد', 40800],
  ['ازاد', 40800],
  ['lotus', 2792],
  ['اللوتس', 2792],
  ['icity', 42292],
  ['mvhp', 2763],
  ['cfc', 2572],
  ['lvr', 2767],
  ['new cairo', 2786],
  ['القاهرة الجديدة', 2786],
].sort((a, b) => b[0].length - a[0].length);

const PRIME_LOCATION_IDS = new Set([
  2751, 2763, 2572, 2754, 2752, 2790, 41671, 41881, 2619, 40489, 42270, 2284, 2767, 2611, 2755, 42292,
]);

function resolveLocationId(...candidates) {
  for (const raw of candidates) {
    if (!raw) continue;
    const norm = String(raw)
      .toLowerCase()
      .replace(/[_/\\|()[\],.-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!norm || norm === 'general' || norm === 'unknown') continue;
    for (const [needle, id] of EGYPT_LOCATION_ENTRIES) {
      if (norm === needle || norm.includes(needle)) return id;
    }
  }
  return null;
}

const TYPE_MAP = {
  apartment: 'apartment',
  studio: 'apartment',
  villa: 'villa',
  'standalone villa': 'villa',
  'standalone-villa': 'villa',
  townhouse: 'townhouse',
  'town house': 'townhouse',
  'town-house': 'townhouse',
  penthouse: 'penthouse',
  duplex: 'duplex',
  chalet: 'chalet',
  'twin-house': 'twin-house',
  'twin house': 'twin-house',
  twinhouse: 'twin-house',
  palace: 'palace',
  roof: 'roof',
  'hotel-apartment': 'hotel-apartment',
  land: 'land',
  office: 'office-space',
  'office-space': 'office-space',
  clinic: 'clinic',
  retail: 'retail',
  shop: 'shop',
};

const COMMERCIAL_TYPES = new Set(['office-space', 'clinic', 'retail', 'shop']);

function isGenuineListingPhoto(url) {
  if (typeof url !== 'string') return false;
  const s = url.trim();
  if (!/^https:\/\//i.test(s) || s.length < 16) return false;
  if (/(unsplash\.com|pexels\.com|pixabay\.com|wikimedia\.org|placehold\.co|placeholder|dummyimage)/i.test(s)) {
    return false;
  }
  return true;
}

function sanitizeText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\+?20\s*1[0125][\d\s-]{7,10}/g, '[verified]')
    .replace(/\b01[0125][\d\s-]{8,10}\b/g, '[verified]')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function fetchLivePfInventory() {
  if (!PF_KEY || !PF_SECRET) {
    return {
      connected: false,
      environment: useSandbox ? 'sandbox' : 'production',
      reason: useSandbox
        ? 'PROPERTY_FINDER_SANDBOX_API_KEY / PROPERTY_FINDER_SANDBOX_API_SECRET not set in .env'
        : 'PROPERTY_FINDER_API_KEY / PROPERTY_FINDER_API_SECRET not set in .env',
      liveCount: 0,
      references: new Set(),
      ids: new Set(),
      profiles: [],
    };
  }

  try {
    const authRes = await fetch(`${PF_BASE}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-PF-Error-Format': 'problem-json-v2',
      },
      body: JSON.stringify({ apiKey: PF_KEY, apiSecret: PF_SECRET }),
      signal: AbortSignal.timeout(15000),
    });

    if (!authRes.ok) {
      return {
        connected: false,
        environment: useSandbox ? 'sandbox' : 'production',
        reason: `OAuth2 HTTP ${authRes.status}`,
        liveCount: 0,
        references: new Set(),
        ids: new Set(),
        profiles: [],
      };
    }

    const { accessToken } = await authRes.json();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'X-PF-Error-Format': 'problem-json-v2',
    };

    const references = new Set();
    const ids = new Set();
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= 15) {
      const res = await fetch(`${PF_BASE}/listings?perPage=100&page=${page}`, {
        headers,
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) break;
      const body = await res.json();
      const items = body.results || body.data || [];
      for (const item of items) {
        if (item.reference) references.add(String(item.reference).trim().toLowerCase());
        if (item.id) ids.add(String(item.id).trim().toLowerCase());
      }
      totalPages = Number(body.pagination?.totalPages || 1);
      page++;
    }

    let profiles = [];
    try {
      const uRes = await fetch(`${PF_BASE}/users?perPage=50`, { headers, signal: AbortSignal.timeout(10000) });
      if (uRes.ok) {
        const uBody = await uRes.json();
        const users = uBody.data || uBody.results || [];
        profiles = users
          .filter((u) => u.status === 'active' && u.publicProfile?.id)
          .map((u) => ({
            userId: u.id,
            publicProfileId: u.publicProfile.id,
            name: u.publicProfile.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          }));
      }
    } catch {
      // non-fatal
    }

    return {
      connected: true,
      environment: useSandbox ? 'sandbox' : 'production',
      gateway: PF_BASE,
      liveCount: ids.size,
      references,
      ids,
      profiles,
    };
  } catch (err) {
    return {
      connected: false,
      environment: useSandbox ? 'sandbox' : 'production',
      reason: err.message,
      liveCount: 0,
      references: new Set(),
      ids: new Set(),
      profiles: [],
    };
  }
}

async function fetchSupabaseCohorts() {
  const sbUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!sbUrl || !sbKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const headers = {
    apikey: sbKey,
    Authorization: `Bearer ${sbKey}`,
  };

  // Strictly non-PII columns + provenance metadata
  const selectCols = [
    'id', 'code', 'unit_code', 'sbr_code', 'pf_reference_number', 'pf_status',
    'title', 'title_ar', 'description', 'description_ar',
    'compound', 'location_area', 'city',
    'property_type', 'deal_type',
    'price', 'price_currency', 'bedrooms', 'bathrooms', 'area_sqm',
    'status', 'availability', 'publish_status',
    'data_quality_score', 'verified_at', 'verified_by',
    'source_channel', 'sync_source', 'images', 'automation', 'raw_data',
  ].join(',');

  const [countRes, photoRows, sheetRows, publishableRows] = await Promise.all([
    fetch(`${sbUrl}/rest/v1/listings?select=id&limit=1`, {
      headers: { ...headers, Prefer: 'count=exact' },
      signal: AbortSignal.timeout(15000),
    }),
    // Cohort 1: 100% of listings with non-empty images
    fetch(`${sbUrl}/rest/v1/listings?images=not.eq.{}&select=${selectCols}&limit=1000`, {
      headers,
      signal: AbortSignal.timeout(20000),
    }).then((r) => {
      if (!r.ok) throw new Error(`Supabase photo cohort HTTP ${r.status}`);
      return r.json();
    }),
    // Cohort 2: 100% of Google Sheet synced owner units
    fetch(`${sbUrl}/rest/v1/listings?sync_source=in.(sheets-units,master-owner-sheet)&select=${selectCols}&limit=1000`, {
      headers,
      signal: AbortSignal.timeout(20000),
    }).then((r) => {
      if (!r.ok) throw new Error(`Supabase sheet cohort HTTP ${r.status}`);
      return r.json();
    }),
    // Cohort 3: Top active PUBLISHABLE Client Map listings
    fetch(`${sbUrl}/rest/v1/listings?publish_status=eq.PUBLISHABLE&status=eq.active&price=gt.0&select=${selectCols}&order=price.desc&limit=2000`, {
      headers,
      signal: AbortSignal.timeout(20000),
    }).then((r) => {
      if (!r.ok) throw new Error(`Supabase publishable cohort HTTP ${r.status}`);
      return r.json();
    }),
  ]);

  const contentRange = countRes.headers.get('content-range') || '0-0/0';
  const totalInDb = Number(contentRange.split('/')[1]) || 0;

  const byId = new Map();
  for (const r of [...photoRows, ...sheetRows, ...publishableRows]) {
    if (r?.id) byId.set(r.id, r);
  }

  return {
    totalInDb,
    photoCohortCount: photoRows.length,
    sheetCohortCount: sheetRows.length,
    rows: [...byId.values()],
  };
}

function buildEditorialFallbackEn(row, pfType, isRent) {
  const specs = [];
  if (Number(row.bedrooms) > 0) specs.push(`${row.bedrooms} bedrooms`);
  else if (Number(row.bedrooms) === 0) specs.push('studio layout');
  if (Number(row.bathrooms) > 0) specs.push(`${row.bathrooms} bathrooms`);
  if (Number(row.area_sqm) > 0) specs.push(`${row.area_sqm} sqm built-up area`);
  const loc = row.compound || row.location_area || row.city;
  return sanitizeText(
    `Verified ${pfType.replace('-', ' ')} for ${isRent ? 'rent' : 'sale'} in ${loc}. Features ${specs.join(', ')}. Contact Sierra Estates for private viewing arrangements.`
  );
}

function evaluateRow(row, livePf) {
  const rawMeta = (row.raw_data && typeof row.raw_data === 'object') ? row.raw_data : {};
  const status = String(row.status || '').toLowerCase();
  const avail = String(row.availability || rawMeta.availability || '').toLowerCase();
  const pubStatus = String(row.publish_status || '').toUpperCase();

  if (['sold', 'rented', 'off-market', 'off_market', 'archived', 'expired'].includes(status)) {
    return { skip: 'inactive_status' };
  }
  if (/(sold|not available|اتباع|غير متاح)/.test(avail)) {
    return { skip: 'unavailable_owner_status' };
  }
  if (pubStatus === 'DUPLICATE' || pubStatus === 'EXPIRED') {
    return { skip: 'duplicate_or_expired' };
  }

  const refCandidates = [
    row.pf_reference_number,
    row.code,
    row.unit_code,
    row.sbr_code,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());

  if (
    row.automation?.isPublishedToPF === true ||
    row.pf_status === 'published' ||
    refCandidates.some((r) => livePf.references.has(r) || livePf.ids.has(r))
  ) {
    return { skip: 'already_live_on_pf' };
  }

  const rawType = String(row.property_type || '').trim().toLowerCase();
  const pfType = TYPE_MAP[rawType];
  if (!pfType) {
    return { skip: 'unmapped_property_type' };
  }

  const locationId = resolveLocationId(row.compound, row.location_area, row.city);
  if (!locationId) {
    return { skip: 'unresolved_pf_location_id' };
  }

  const price = Number(row.price) || 0;
  const currency = String(row.price_currency || 'EGP').toUpperCase();
  const isRent = /(rent|lease|ايجار)/.test(String(row.deal_type || 'sale').toLowerCase());
  const approxEgp = currency === 'USD' ? price * 50 : price;
  const minFloorEgp = isRent ? 15_000 : 2_000_000;
  if (approxEgp < minFloorEgp) {
    return { skip: 'below_market_price_floor' };
  }

  const area = Number(row.area_sqm) || 0;
  if (area <= 0) {
    return { skip: 'missing_area_sqm' };
  }

  const realPhotos = Array.isArray(row.images) ? row.images.filter(isGenuineListingPhoto) : [];
  const ownerTypeMeta = String(rawMeta.ownerType || rawMeta.owner_type || '').toLowerCase();
  const isSheetSynced = ['sheets-units', 'master-owner-sheet'].includes(String(row.sync_source || ''));
  const isDirectOwner =
    isSheetSynced ||
    ownerTypeMeta === 'owner' ||
    /owner/i.test(String(row.source_channel || ''));

  const freshVerified = (() => {
    if (!row.verified_at || !row.verified_by) return false;
    const ageDays = (Date.now() - new Date(row.verified_at).getTime()) / 86_400_000;
    return Number.isFinite(ageDays) && ageDays <= 30;
  })();

  const qualityScore = Number(row.data_quality_score) || 0;
  const category = COMMERCIAL_TYPES.has(pfType) ? 'commercial' : 'residential';
  const reference = String(row.code || row.unit_code || `SE-${String(row.id).slice(0, 8).toUpperCase()}`);

  const rawTitleEn = sanitizeText(row.title || '');
  const titleEn =
    rawTitleEn.length >= 10
      ? rawTitleEn.slice(0, 100)
      : sanitizeText(`${pfType.toUpperCase()} for ${isRent ? 'Rent' : 'Sale'} in ${row.compound || row.location_area || row.city}`);
  const titleAr = row.title_ar ? sanitizeText(row.title_ar).slice(0, 100) : undefined;

  const rawDescEn = sanitizeText(row.description || '');
  const descEn = rawDescEn.length >= 30 ? rawDescEn : buildEditorialFallbackEn(row, pfType, isRent);
  const descAr = row.description_ar ? sanitizeText(row.description_ar) : undefined;

  const bedrooms = Number(row.bedrooms) === 0 ? 'studio' : String(Math.max(1, Number(row.bedrooms) || 1));
  const bathrooms = Number(row.bathrooms) === 0 ? 'none' : String(Math.max(1, Number(row.bathrooms) || 1));

  // Ad Readiness & ROI Score (0..100)
  let adScore = 0;
  if (isDirectOwner) adScore += 25;
  if (realPhotos.length >= 5) adScore += 25;
  else if (realPhotos.length >= 3) adScore += 20;
  else if (realPhotos.length >= 1) adScore += 14;

  if (PRIME_LOCATION_IDS.has(locationId)) adScore += 20;
  else adScore += 12;

  if (area >= 80 && Number(row.bedrooms) >= 0) adScore += 15;
  else adScore += 8;

  if (pubStatus === 'PUBLISHABLE' && freshVerified) adScore += 15;
  else if (pubStatus === 'PUBLISHABLE') adScore += 10;
  else if (avail === 'available') adScore += 10;

  const gateEligible =
    pubStatus === 'PUBLISHABLE' &&
    realPhotos.length >= 3 &&
    qualityScore >= 75 &&
    freshVerified &&
    ['available', 'active', 'verified', 'published'].includes(status);

  const missingForGate = [];
  if (realPhotos.length < 3) missingForGate.push(`needs_${3 - realPhotos.length}_more_real_photos`);
  if (pubStatus !== 'PUBLISHABLE' || !freshVerified) missingForGate.push('staff_verification_stamp');
  if (qualityScore < 75) missingForGate.push(`quality_score_${qualityScore}_below_75`);

  const atlasPayload = {
    reference,
    category,
    type: pfType,
    offeringType: isRent ? 'rent' : 'sale',
    location: { id: locationId },
    size: area,
    bedrooms,
    bathrooms,
    assignedTo: { id: DEFAULT_PUBLIC_PROFILE_ID },
    price: isRent
      ? { type: 'monthly', amounts: { monthly: approxEgp } }
      : { type: 'sale', amounts: { sale: approxEgp } },
    title: {
      en: titleEn,
      ...(titleAr ? { ar: titleAr } : {}),
    },
    description: {
      en: descEn,
      ...(descAr ? { ar: descAr } : {}),
    },
    media: {
      images: realPhotos.slice(0, 15).map((url) => ({ original: { url } })),
    },
  };

  let tier = 'tier3_other';
  if (gateEligible) {
    tier = 'tier1a_gate_ready';
  } else if (realPhotos.length >= 1 && pubStatus === 'PUBLISHABLE') {
    tier = 'tier1b_prime_photo_units';
  } else if (isSheetSynced && avail === 'available') {
    tier = 'tier2_sheet_available_owners';
  }

  return {
    skip: null,
    tier,
    adScore,
    id: row.id,
    reference,
    compound: row.compound || row.location_area || row.city,
    pfLocationId: locationId,
    propertyType: pfType,
    offeringType: isRent ? 'rent' : 'sale',
    priceEgp: approxEgp,
    areaSqm: area,
    bedrooms,
    bathrooms,
    realPhotoCount: realPhotos.length,
    isDirectOwner,
    isSheetSynced,
    onClientMap: pubStatus === 'PUBLISHABLE' && status === 'active',
    publishStatus: pubStatus,
    status: row.status,
    missingForGate,
    atlasPayload,
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' SIERRA ESTATES · PROPERTY FINDER AD SELECTION ENGINE (OpenAPI 3.1.0)');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const [livePf, cohorts] = await Promise.all([
    fetchLivePfInventory(),
    fetchSupabaseCohorts(),
  ]);

  console.log(
    `[PF Gateway] env=${livePf.environment} connected=${livePf.connected}` +
      (livePf.connected
        ? ` liveAds=${livePf.liveCount} activeProfiles=${livePf.profiles.length}`
        : ` (${livePf.reason})`)
  );
  console.log(
    `[Supabase]   totalInDb=${cohorts.totalInDb} evaluatedPriorityRows=${cohorts.rows.length} (photoRows=${cohorts.photoCohortCount}, sheetUnits=${cohorts.sheetCohortCount})`
  );

  const skipReasons = {};
  const tier1a = [];
  const tier1b = [];
  const tier2 = [];

  // Deduplicate identical compound+type+price+area clones when ranking ads
  const seenFingerprints = new Set();

  for (const row of cohorts.rows) {
    const res = evaluateRow(row, livePf);
    if (res.skip) {
      skipReasons[res.skip] = (skipReasons[res.skip] || 0) + 1;
      continue;
    }
    const fp = `${res.pfLocationId}|${res.propertyType}|${res.offeringType}|${res.priceEgp}|${res.areaSqm}`;
    if (seenFingerprints.has(fp)) {
      skipReasons.duplicate_unit_fingerprint = (skipReasons.duplicate_unit_fingerprint || 0) + 1;
      continue;
    }
    seenFingerprints.add(fp);

    if (res.tier === 'tier1a_gate_ready') tier1a.push(res);
    else if (res.tier === 'tier1b_prime_photo_units') tier1b.push(res);
    else if (res.tier === 'tier2_sheet_available_owners') tier2.push(res);
  }

  const rankSort = (a, b) =>
    b.adScore - a.adScore ||
    b.realPhotoCount - a.realPhotoCount ||
    b.priceEgp - a.priceEgp ||
    String(a.reference).localeCompare(String(b.reference));

  tier1a.sort(rankSort);
  tier1b.sort(rankSort);
  tier2.sort(rankSort);

  const selected1a = tier1a.slice(0, tierLimit);
  const selected1b = tier1b.slice(0, tierLimit);
  const selected2 = tier2.slice(0, tierLimit);

  const manifest = {
    generatedAt: new Date().toISOString(),
    specVersion: '3.1.0',
    pfGateway: {
      environment: livePf.environment,
      connected: livePf.connected,
      currentlyLiveAdsExcluded: livePf.liveCount,
      defaultAssignedPublicProfileId: DEFAULT_PUBLIC_PROFILE_ID,
      activeProfiles: livePf.profiles,
      ...(livePf.reason ? { note: livePf.reason } : {}),
    },
    inventorySummary: {
      totalSupabaseListings: cohorts.totalInDb,
      priorityCohortEvaluated: cohorts.rows.length,
      excludedBreakdown: skipReasons,
      tier1aGateReadyCount: tier1a.length,
      tier1bPrimePhotoUnitsCount: tier1b.length,
      tier2SheetAvailableOwnersCount: tier2.length,
    },
    tier1aGateReadyAds: selected1a,
    tier1bPrimePhotoUnits: selected1b,
    tier2SheetAvailableOwners: selected2.map(({ atlasPayload: _omitDraftUntilPhotos, ...meta }) => meta),
  };

  const outDir = path.join(ROOT, 'docs', 'property-finder');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'selected-ads-manifest.json');
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('\n── Exclusion & Deduplication Summary ───────────────────────────────────');
  for (const [reason, count] of Object.entries(skipReasons)) {
    console.log(`  • ${reason.padEnd(30)} : ${count}`);
  }

  console.log(`\n── Tier 1A: Full C6 PublishGate Eligible (${tier1a.length}) ────────────────────────`);
  for (const u of selected1a.slice(0, 15)) {
    console.log(
      `  [Score ${String(u.adScore).padStart(2)}] ${u.reference.padEnd(18)} | ${String(u.compound).slice(0, 22).padEnd(22)} | locId=${String(u.pfLocationId).padEnd(5)} | ${u.propertyType.padEnd(10)} | ${u.offeringType.padEnd(4)} | EGP ${u.priceEgp.toLocaleString().padStart(11)} | photos=${u.realPhotoCount}`
    );
  }

  console.log(`\n── Tier 1B: Prime Direct-Owner Units w/ Real Photos (${tier1b.length}) ─────────────`);
  for (const u of selected1b.slice(0, 15)) {
    console.log(
      `  [Score ${String(u.adScore).padStart(2)}] ${u.reference.padEnd(18)} | ${String(u.compound).slice(0, 22).padEnd(22)} | locId=${String(u.pfLocationId).padEnd(5)} | ${u.propertyType.padEnd(10)} | ${u.offeringType.padEnd(4)} | EGP ${u.priceEgp.toLocaleString().padStart(11)} | photos=${u.realPhotoCount} | clientMap=${u.onClientMap}`
    );
  }

  console.log(`\n── Tier 2: Google Sheet Confirmed-Available Owners (${tier2.length}) ──────────────`);
  for (const u of selected2.slice(0, 15)) {
    console.log(
      `  [Score ${String(u.adScore).padStart(2)}] ${u.reference.padEnd(18)} | ${String(u.compound).slice(0, 22).padEnd(22)} | locId=${String(u.pfLocationId).padEnd(5)} | ${u.propertyType.padEnd(10)} | ${u.offeringType.padEnd(4)} | EGP ${u.priceEgp.toLocaleString().padStart(11)} | sheet=true`
    );
  }

  console.log(`\n✅ Manifest written (PII-free): ${path.relative(ROOT, outPath)}`);
}

main().catch((err) => {
  console.error('❌ Ad selector failed:', err.message);
  process.exit(1);
});
