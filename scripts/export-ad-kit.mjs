#!/usr/bin/env node
/**
 * SIERRA ESTATES — AD KIT EXTRACTOR
 * =================================
 * One command → ready-to-use ad packages for Property Finder + the website.
 *
 * For every unit that HAS photos it creates a folder:
 *   <out>/<unit-code>/
 *     photos/            downloaded photo files (with --download)
 *     propertyfinder.xml single-property PF feed entry (same schema as
 *                        scripts/export-propertyfinder-feed.mjs)
 *     website.json       normalized payload for the website
 *     ad-copy.md         bilingual (EN/AR) ad copy, filled from real data only
 * plus manifest.csv at the batch root.
 *
 * USAGE (from repo root):
 *   node scripts/export-ad-kit.mjs                          # active units w/ photos → XML+CSV+copy
 *   node scripts/export-ad-kit.mjs --limit 10 --download    # + download photos
 *   node scripts/export-ad-kit.mjs --status archived        # the resale catalog
 *   node scripts/export-ad-kit.mjs --code SE-REAL-299       # one specific unit
 *   node scripts/export-ad-kit.mjs --out /tmp/adkit --limit 5
 *
 * Credentials: reads .env.local / .env (NEXT_PUBLIC_SUPABASE_URL | SUPABASE_URL
 * and SUPABASE_SERVICE_ROLE_KEY). Service role is required for archived units.
 * No dependencies — plain Node >= 18 (global fetch).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ---------- env ---------- */
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

/* ---------- args ---------- */
const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
}
const flag = (name) => args.includes(name);
const STATUSES = (arg('--status', 'active')).split(',').map(s => s.trim()).filter(Boolean);
const ONLY_CODE = arg('--code', null);
const LIMIT = Number(arg('--limit', 0)) || 0;      // 0 = no limit
const DOWNLOAD = flag('--download');
const OUT = path.resolve(arg('--out', path.join(ROOT, 'ad-kit-out')));

/* ---------- PF mappings (identical to existing export script) ---------- */
const mapOfferingType = (d) => /rent|ايجار/i.test(String(d || '')) ? 'RR' : 'RS';
function mapPropertyType(t) {
  const s = String(t || '').toLowerCase();
  if (/villa|فيلا|standalone/.test(s)) return 'VH';
  if (/townhouse|town/.test(s)) return 'TH';
  if (/twinhouse|twin/.test(s)) return 'TW';
  if (/penthouse|roof/.test(s)) return 'PH';
  if (/duplex/.test(s)) return 'DU';
  if (/chalet|شاليه/.test(s)) return 'CH';
  if (/commercial|retail|shop/.test(s)) return 'RE';
  if (/office|مكتب/.test(s)) return 'OF';
  return 'AP';
}
const AR_TYPE = { villa: 'فيلا', apartment: 'شقة', townhouse: 'تاون هاوس', twinhouse: 'توين هاوس', chalet: 'شاليه', duplex: 'دوبلكس', penthouse: 'بنتهاوس', roof: 'روف', office: 'مكتب', retail: 'محل تجاري', commercial: 'محل تجاري', studio: 'استوديو', clinic: 'عيادة' };
const arType = (t) => AR_TYPE[String(t || '').toLowerCase()] || String(t || '');
const escapeXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/* ---------- supabase REST (paged) ---------- */
async function rest(pathname, key, extra = {}) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const res = await fetch(`${base}/rest/v1/${pathname}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(extra.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}
async function fetchListings(key) {
  const sel = 'id,code,pf_reference_number,ref_id,title,title_ar,compound,location_area,city,property_type,deal_type,price,price_currency,bedrooms,bathrooms,area_sqm,finishing_type,description,description_ar,images,agent_name,updated_at';
  const rows = [];
  for (const status of STATUSES) {
    let offset = 0;
    for (;;) {
      const f = `listings?select=${sel}&status=eq.${encodeURIComponent(status)}&order=updated_at.desc&limit=1000&offset=${offset}`;
      const res = await rest(f, key);
      const page = await res.json();
      rows.push(...page);
      if (page.length < 1000) break;
      offset += 1000;
    }
  }
  for (const r of rows) r.images = sanitizeImages(r.images);   // normalize every row
  const withPhotos = rows.filter((r) => r.images.length > 0);
  if (ONLY_CODE) return withPhotos.filter((r) => r.code === ONLY_CODE || (r.pf_reference_number || '') === ONLY_CODE);
  return LIMIT ? withPhotos.slice(0, LIMIT) : withPhotos;
}

/* ---------- photos ---------- */
/** The OWNERS-AUG26 ingest glued a relative path onto a full URL with a space
 *  ("/manus-storage/IMG-20 https://host/manus-storage/IMG-...WA.jpg").
 *  Extract every clean http(s) URL from a possibly-polluted entry. */
function sanitizeImages(raw) {
  const entries = Array.isArray(raw) ? raw
    : typeof raw === 'string' && raw.trim() ? (raw.trim().startsWith('[') ? safeParse(raw) : [raw]) : [];
  const urls = [];
  for (const e of entries) {
    if (typeof e !== 'string') continue;
    for (const m of e.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
      const u = m[0].replace(/[),.;]+$/, '').replace(/&amp;/g, '&'); // decode HTML-entity & from legacy ingest
      if (u && !urls.includes(u)) urls.push(u);
    }
  }
  return urls;
}
function safeParse(s) { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; } }

async function downloadPhotos(dir, urls) {
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  let failed = 0;
  const queue = urls.slice(0, 12); // ads rarely need more than 12
  let i = 0;
  const worker = async () => {
    while (i < queue.length) {
      const idx = i++;
      const u = queue[idx];
      try {
        const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', Referer: 'https://sierra-estates.net/' } });
        if (!res.ok) { failed++; continue; }
        const ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
        const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
        const name = `${String(idx + 1).padStart(2, '0')}.${ext}`;
        fs.writeFileSync(path.join(dir, name), Buffer.from(await res.arrayBuffer()));
        files.push(name);
      } catch { failed++; /* skip broken URL, keep going */ }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (failed) fs.writeFileSync(path.join(dir, 'photos-FAILED.txt'),
    `${failed} of ${urls.length} image URLs failed to download (dead host / 403 / malformed entry).\nThe full URL list is still in website.json + propertyfinder.xml.\n`);
  return files;
}

/* ---------- artifacts ---------- */
function pfXml(r, ref) {
  const offering = mapOfferingType(r.deal_type);
  const price = Number(r.price) || 0;
  const x = [];
  x.push('<?xml version="1.0" encoding="UTF-8"?>');
  x.push('<list>');
  x.push(`  <property last_update="${new Date(r.updated_at || Date.now()).toISOString().replace('T', ' ').slice(0, 19)}">`);
  x.push(`    <reference_number>${escapeXml(ref)}</reference_number>`);
  x.push(`    <offering_type>${offering}</offering_type>`);
  x.push(`    <property_type>${mapPropertyType(r.property_type)}</property_type>`);
  x.push(`    <price_on_application>${price > 0 ? '0' : '1'}</price_on_application>`);
  x.push(`    <price>${price}</price>`);
  if (offering === 'RR') x.push('    <rental_period>M</rental_period>');
  x.push('    <currency>EGP</currency>');
  x.push(`    <city>${escapeXml(r.city || 'Cairo')}</city>`);
  x.push(`    <community>${escapeXml(r.location_area || 'New Cairo')}</community>`);
  if (r.compound) x.push(`    <sub_community>${escapeXml(r.compound)}</sub_community>`);
  x.push(`    <title_en><![CDATA[${r.title || `${r.property_type} in ${r.compound || r.location_area || 'New Cairo'}`}]]></title_en>`);
  if (r.title_ar) x.push(`    <title_ar><![CDATA[${r.title_ar}]]></title_ar>`);
  const desc = r.description || r.title || `${r.property_type} in ${r.compound || 'New Cairo'}`;
  x.push(`    <description_en><![CDATA[${desc}]]></description_en>`);
  if (r.description_ar) x.push(`    <description_ar><![CDATA[${r.description_ar}]]></description_ar>`);
  if (Number(r.area_sqm) > 0) x.push(`    <size>${Number(r.area_sqm)}</size>`);
  if (Number(r.bedrooms) > 0) x.push(`    <bedroom>${Number(r.bedrooms)}</bedroom>`);
  if (Number(r.bathrooms) > 0) x.push(`    <bathroom>${Number(r.bathrooms)}</bathroom>`);
  x.push('    <agent>');
  x.push(`      <name>${escapeXml(r.agent_name || 'Sierra Estates Team')}</name>`);
  x.push('      <email>info@sierra-estates.net</email>');
  x.push('      <phone>+201000000000</phone>');
  x.push('    </agent>');
  x.push('    <photo>');
  for (const u of r.images) if (typeof u === 'string' && u.startsWith('http')) x.push(`      <url>${escapeXml(u)}</url>`);
  x.push('    </photo>');
  x.push('  </property>');
  x.push('</list>');
  return x.join('\n');
}

function adCopy(r, ref, photoFiles) {
  const isRent = mapOfferingType(r.deal_type) === 'RR';
  const price = Number(r.price) || 0;
  const priceEn = price > 0 ? `${price.toLocaleString('en-EG')} EGP${isRent ? ' / month' : ''}` : 'Price on application';
  const priceAr = price > 0 ? `${price.toLocaleString('en-EG')} جنيه${isRent ? ' / شهريًا' : ''}` : 'السعر عند الطلب';
  const specs = [];
  if (Number(r.bedrooms) > 0) specs.push(['Bedrooms', String(r.bedrooms), 'غرف النوم']);
  if (Number(r.bathrooms) > 0) specs.push(['Bathrooms', String(r.bathrooms), 'الحمامات']);
  if (Number(r.area_sqm) > 0) specs.push(['Area', `${Number(r.area_sqm)} sqm`, 'المساحة']);
  if (r.finishing_type) specs.push(['Finishing', String(r.finishing_type), 'التشطيب']);
  const L = [];
  L.push(`# ${r.title || `${r.property_type} in ${r.compound || 'New Cairo'}`}`);
  L.push('');
  L.push(`**Ref:** ${ref} · **Compound:** ${r.compound || '—'} · **Area:** ${r.location_area || '—'}, ${r.city || 'Cairo'}`);
  L.push('');
  L.push('## English');
  L.push('');
  L.push(`${r.property_type} ${isRent ? 'for rent' : 'for sale'} in ${r.compound || r.location_area || 'New Cairo'}${r.location_area ? `, ${r.location_area}` : ''}.`);
  if (r.description) { L.push(''); L.push(r.description); }
  L.push('');
  L.push('| Feature | Detail |');
  L.push('|---|---|');
  for (const [a, b] of specs) L.push(`| ${a} | ${b} |`);
  L.push(`| Price | ${priceEn} |`);
  L.push('');
  L.push(`Photos available: ${photoFiles.length || r.images.length}. Contact Sierra Estates — info@sierra-estates.net — for a private viewing.`);
  L.push('');
  L.push('## العربية');
  L.push('');
  L.push(`${arType(r.property_type)} ${isRent ? 'للإيجار' : 'للبيع'} في ${r.compound || r.location_area || 'التجمع الخامس'}${r.location_area ? `، ${r.location_area}` : ''}.`);
  if (r.description_ar) { L.push(''); L.push(r.description_ar); }
  L.push('');
  for (const [, b, c] of specs) L.push(`- ${c}: ${b}`);
  L.push(`- السعر: ${priceAr}`);
  L.push('');
  L.push('للتواصل وحجز معاينة خاصة: سييرا إستيتس — info@sierra-estates.net');
  L.push('');
  return L.join('\n');
}

/* ---------- main ---------- */
loadEnv();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!key || !(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)) {
  console.error('Missing Supabase credentials (.env.local / .env).');
  process.exit(1);
}

console.log(`Ad-kit: statuses=[${STATUSES.join(',')}]${ONLY_CODE ? ` code=${ONLY_CODE}` : ''}${LIMIT ? ` limit=${LIMIT}` : ' (no limit)'}${DOWNLOAD ? ' --download' : ''}`);
const listings = await fetchListings(key);
console.log(`Units with photos: ${listings.length}`);
if (!listings.length) process.exit(0);

fs.mkdirSync(OUT, { recursive: true });
const manifest = [['ref', 'code', 'compound', 'community', 'city', 'property_type', 'deal_type', 'price_egp', 'bedrooms', 'bathrooms', 'area_sqm', 'photo_urls', 'photos_downloaded', 'folder', 'website_url']];
let done = 0;
for (const r of listings) {
  const ref = r.pf_reference_number || r.code || r.ref_id || `SE-${r.id.slice(0, 8).toUpperCase()}`;
  const folder = String(ref).replace(/[^A-Za-z0-9._-]+/g, '-');
  const dir = path.join(OUT, folder);
  fs.mkdirSync(dir, { recursive: true });

  const urls = r.images.filter((u) => typeof u === 'string' && u.startsWith('http'));
  let files = [];
  if (DOWNLOAD) files = await downloadPhotos(path.join(dir, 'photos'), urls);

  fs.writeFileSync(path.join(dir, 'propertyfinder.xml'), pfXml(r, ref), 'utf8');
  fs.writeFileSync(path.join(dir, 'website.json'), JSON.stringify({
    ref, code: r.code, title: r.title, title_ar: r.title_ar,
    compound: r.compound, area: r.location_area, city: r.city,
    property_type: r.property_type, deal_type: r.deal_type,
    price: r.price, currency: r.price_currency || 'EGP',
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, area_sqm: r.area_sqm,
    finishing: r.finishing_type,
    description: r.description, description_ar: r.description_ar,
    images: urls, updated_at: r.updated_at,
    website_url: `https://sierra-estates.net/explore?ref=${encodeURIComponent(r.code || ref)}`,
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(dir, 'ad-copy.md'), adCopy(r, ref, files), 'utf8');

  manifest.push([ref, r.code || '', r.compound || '', r.location_area || '', r.city || '',
    r.property_type || '', r.deal_type || '', r.price || 0, r.bedrooms || 0, r.bathrooms || 0,
    r.area_sqm || 0, urls.join(' | '), files.length, folder,
    `https://sierra-estates.net/explore?ref=${encodeURIComponent(r.code || ref)}`]);
  done++;
  if (done % 25 === 0 || done === listings.length) console.log(`  ${done}/${listings.length}`);
}

const csv = manifest.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync(path.join(OUT, 'manifest.csv'), '\uFEFF' + csv, 'utf8');
console.log(`\n[✓] ${done} ad-kit folders → ${OUT}`);
console.log(DOWNLOAD ? '    photos downloaded per folder (photos/)' : '    hint: add --download to also fetch photo files');
