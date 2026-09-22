#!/usr/bin/env node
/**
 * Generate lib/inventory/snapshot.json — the committed offline fallback the
 * public inventory map serves when every live source (Supabase, domain
 * service, owner sheet) is unavailable. Four routes import that file
 * statically, so it must exist for `tsc --noEmit` / `next build` to pass at
 * all; before this script the file was simply missing from the repo and the
 * build relied on a stale local copy nobody remembered to commit.
 *
 * Sources, in order:
 *   1. Supabase `listings` (active/available, public columns only — PII such
 *      as owner_phone is never selected, so the snapshot is public-safe by
 *      construction), geocoded against `compounds` exactly like
 *      /api/inventory does.
 *   2. Whatever snapshot is already on disk (kept untouched, just re-logged).
 *
 * The script ALWAYS exits 0: it runs as part of `npm run build`
 * (`prebuild`) and a missing env / unreachable database must never break a
 * deploy — the committed seed snapshot guarantees the import resolves.
 *
 * Usage:
 *   node scripts/generate-inventory-snapshot.mjs           # generate or keep
 *   node scripts/generate-inventory-snapshot.mjs --force   # fail loudly instead of keeping the old file
 */
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.resolve(__dirname, '../lib/inventory/snapshot.json');
const FORCE = process.argv.includes('--force');

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

function log(level, msg) {
  console[level === 'warn' ? 'warn' : 'log'](`[inventory-snapshot] ${msg}`);
}

/** Minimal gazetteer centroid table (mirrors lib/inventory/gazetteer.ts) —
 *  used when a listing's compound has no row in public.compounds. */
const CENTROIDS = {
  'new cairo': { lat: 30.03, lng: 31.47, zone: 'New Cairo' },
  '5th settlement': { lat: 30.02, lng: 31.52, zone: '5th Settlement' },
  mivida: { lat: 30.007, lng: 31.589, zone: '5th Settlement' },
  'hyde park': { lat: 30.008, lng: 31.645, zone: '5th Settlement' },
  madinaty: { lat: 30.101, lng: 31.664, zone: 'Madinaty' },
  'katameya dunes': { lat: 29.985, lng: 31.492, zone: 'Katameya' },
  sarai: { lat: 30.005, lng: 31.66, zone: 'Mostakbal' },
  'taj city': { lat: 30.065, lng: 31.531, zone: 'New Cairo' },
  'fifth square': { lat: 30.025, lng: 31.578, zone: '5th Settlement' },
  'al rehab': { lat: 30.058, lng: 31.514, zone: 'Al Rehab' },
  'uptown cairo': { lat: 30.011, lng: 31.297, zone: 'Mokattam' },
  'new capital': { lat: 30.005, lng: 31.74, zone: 'New Capital' },
  'sheikh zayed': { lat: 30.06, lng: 30.98, zone: 'Sheikh Zayed' },
  'north coast': { lat: 30.92, lng: 28.85, zone: 'North Coast' },
  'ain sokhna': { lat: 29.6, lng: 32.31, zone: 'Ain Sokhna' },
};

function resolveLocation(raw) {
  const key = String(raw || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
    .trim();
  return (
    CENTROIDS[key] ||
    Object.entries(CENTROIDS).find(([name]) => key.includes(name))?.[1] ||
    CENTROIDS['new cairo']
  );
}

function priceLabel(price, mode) {
  if (!price) return 'Price on request';
  if (mode === 'rent') return `EGP ${price.toLocaleString('en-US')} / mo`;
  return price >= 1_000_000
    ? `${(price / 1_000_000).toFixed(1)}M EGP`
    : `EGP ${price.toLocaleString('en-US')}`;
}

/** Map a PostgREST listings row to the public InventoryUnit shape. */
function toMapUnit(listing, compoundGeo) {
  const locationLabel = listing.location_area || listing.compound || 'New Cairo';
  const matched =
    (listing.compound && compoundGeo.get(listing.compound.trim().toLowerCase())) || null;
  const resolved = matched || resolveLocation(locationLabel);
  const price = Number(listing.price) || 0;
  const mode =
    listing.deal_type === 'rent' || (price > 0 && price < 1_000_000) ? 'rent' : 'sale';
  const photos = Array.isArray(listing.photos)
    ? listing.photos
    : Array.isArray(listing.images)
      ? listing.images
      : [];
  return {
    id: listing.id,
    code: listing.code || listing.ref_id || listing.id,
    compound: listing.compound || locationLabel,
    mode,
    status: 'available',
    statusLabel: 'Available',
    location: listing.compound || locationLabel,
    rawLocation: locationLabel,
    zone: resolved.zone,
    lat: resolved.lat,
    lng: resolved.lng,
    approxLocation: !matched,
    propertyType: listing.property_type || 'Apartment',
    type: listing.property_type || 'Apartment',
    beds: listing.bedrooms ?? null,
    baths: listing.bathrooms ?? null,
    area: Number(listing.area_sqm) || null,
    price,
    priceLabel: priceLabel(price, mode),
    img: listing.img || photos[0] || null,
    description: listing.description || null,
    updatedAt: listing.updated_at || null,
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function generateFromSupabase() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Supabase env (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) not set');
  }
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

  // Public columns ONLY — owner phones/names never enter the snapshot.
  const listings = await fetchJson(
    `${base}/listings?select=id,ref_id,code,compound,location_area,property_type,deal_type,` +
      `price,bedrooms,bathrooms,area_sqm,status,description,updated_at,img,photos,images` +
      `&status=in.(active,available,published)&order=updated_at.desc&limit=1000`
  );
  if (!Array.isArray(listings) || listings.length === 0) {
    throw new Error('Supabase reachable but zero active/available listings');
  }

  const compounds = await fetchJson(
    `${base}/compounds?select=name,lat,lng,zone&limit=1000`
  ).catch(() => []);
  const compoundGeo = new Map(
    (Array.isArray(compounds) ? compounds : [])
      .filter((c) => c.name && c.lat && c.lng)
      .map((c) => [c.name.trim().toLowerCase(), { lat: c.lat, lng: c.lng, zone: c.zone }])
  );

  const units = listings.map((l) => toMapUnit(l, compoundGeo));
  return { generatedAt: new Date().toISOString(), source: 'supabase', count: units.length, units };
}

async function keepExisting(reason) {
  try {
    const existing = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf-8'));
    log(
      'warn',
      `${reason} — keeping existing snapshot (${existing.count ?? '?'} units, ` +
        `generated ${existing.generatedAt ?? 'unknown'})`
    );
    return existing;
  } catch {
    if (FORCE) {
      throw new Error(`${reason} — and no existing snapshot to keep (run with --force to see this error)`);
    }
    log('warn', `${reason} — and no existing snapshot on disk. The committed seed snapshot must stay in the repo.`);
    return null;
  }
}

async function main() {
  try {
    const payload = await generateFromSupabase();
    await writeFile(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
    log('log', `Wrote snapshot: ${payload.count} units from Supabase → ${path.relative(process.cwd(), SNAPSHOT_PATH)}`);
  } catch (err) {
    const kept = await keepExisting(err.message);
    if (!kept && FORCE) process.exit(1);
  }
}

main();
