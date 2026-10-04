import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

function mapOfferingType(dealType) {
  const d = String(dealType || '').toLowerCase();
  if (d.includes('rent') || d.includes('ايجار')) return 'RR'; // Residential Rent
  return 'RS'; // Residential Sale
}

function mapPropertyType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('villa') || t.includes('فيلا') || t.includes('standalone')) return 'VH';
  if (t.includes('townhouse') || t.includes('town')) return 'TH';
  if (t.includes('twinhouse') || t.includes('twin')) return 'TW';
  if (t.includes('penthouse') || t.includes('roof')) return 'PH';
  if (t.includes('duplex')) return 'DU';
  if (t.includes('chalet') || t.includes('شاليه')) return 'CH';
  if (t.includes('commercial') || t.includes('retail') || t.includes('shop')) return 'RE';
  if (t.includes('office') || t.includes('مكتب')) return 'OF';
  return 'AP'; // Apartment
}

/** The AUG26 WhatsApp ingest glued image entries ("/manus-storage/IMG-20 https://real.jpg",
 *  "https://a.jpg https://b.jpg"). Extract every clean http(s) URL so the feed
 *  never carries malformed or relative junk, and URLs trapped inside glued
 *  entries are not silently lost. Mirrors scripts/export-ad-kit.mjs sanitizeImages. */
function sanitizeFeedImages(raw) {
  const entries = Array.isArray(raw) ? raw
    : typeof raw === 'string' && raw.trim() ? (() => {
        try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [raw]; }
        catch { return [raw]; }
      })()
    : [];
  const urls = [];
  for (const e of entries) {
    if (typeof e !== 'string') continue;
    for (const m of e.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
      const u = m[0].replace(/[),.;]+$/, '');
      if (u && !urls.includes(u)) urls.push(u);
    }
  }
  return urls;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function exportPropertyFinderFeed() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials missing.');
  }

  const supabase = createClient(url, key);
  console.log('Fetching active listings from Supabase for Property Finder feed...');

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, ref_id, code, pf_reference_number, title, title_ar, compound, location_area, city, property_type, deal_type, price, price_currency, bedrooms, bathrooms, area_sqm, finishing_type, description, description_ar, images, updated_at, agent_name')
    .in('status', ['available', 'active', 'published'])
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  console.log(`Found ${listings.length} active listings for Property Finder syndication.`);

  const outputDir = path.join(ROOT, 'apps', 'sierra-estates-realty', 'public', 'feeds');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Build Canonical Property Finder XML Feed
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<list last_update="${new Date().toISOString()}">\n`;

  for (const item of listings) {
    const ref = item.pf_reference_number || item.code || item.ref_id || `SE-${item.id.slice(0, 8).toUpperCase()}`;
    const offeringType = mapOfferingType(item.deal_type);
    const propType = mapPropertyType(item.property_type);
    const city = item.city || 'Cairo';
    const community = item.location_area || 'New Cairo';
    const subCommunity = item.compound || '';
    const titleEn = item.title || `${item.property_type || 'Property'} in ${item.compound || 'New Cairo'}`;
    const descEn = item.description || titleEn;
    const price = Number(item.price) || 0;
    const size = Number(item.area_sqm) || 0;
    const beds = Number(item.bedrooms) || 0;
    const baths = Number(item.bathrooms) || 0;

    // sanitized: only clean http(s) URLs survive (glued/relative junk dropped)
    const images = sanitizeFeedImages(item.images);

    xml += `  <property last_update="${new Date(item.updated_at || Date.now()).toISOString().replace('T', ' ').slice(0, 19)}">\n`;
    xml += `    <reference_number>${escapeXml(ref)}</reference_number>\n`;
    xml += `    <offering_type>${offeringType}</offering_type>\n`;
    xml += `    <property_type>${propType}</property_type>\n`;
    xml += `    <price_on_application>${price > 0 ? '0' : '1'}</price_on_application>\n`;
    xml += `    <price>${price}</price>\n`;
    if (offeringType === 'RR') {
      xml += `    <rental_period>M</rental_period>\n`;
    }
    xml += `    <currency>EGP</currency>\n`;
    xml += `    <city>${escapeXml(city)}</city>\n`;
    xml += `    <community>${escapeXml(community)}</community>\n`;
    if (subCommunity) {
      xml += `    <sub_community>${escapeXml(subCommunity)}</sub_community>\n`;
    }
    xml += `    <title_en><![CDATA[${titleEn}]]></title_en>\n`;
    if (item.title_ar) {
      xml += `    <title_ar><![CDATA[${item.title_ar}]]></title_ar>\n`;
    }
    xml += `    <description_en><![CDATA[${descEn}]]></description_en>\n`;
    if (item.description_ar) {
      xml += `    <description_ar><![CDATA[${item.description_ar}]]></description_ar>\n`;
    }
    if (size > 0) xml += `    <size>${size}</size>\n`;
    if (beds > 0) xml += `    <bedroom>${beds}</bedroom>\n`;
    if (baths > 0) xml += `    <bathroom>${baths}</bathroom>\n`;
    xml += `    <agent>\n`;
    xml += `      <name>${escapeXml(item.agent_name || 'Sierra Estates Team')}</name>\n`;
    xml += `      <email>info@sierra-estates.net</email>\n`;
    xml += `      <phone>+201000000000</phone>\n`;
    xml += `    </agent>\n`;

    if (images.length > 0) {
      xml += `    <photo>\n`;
      for (const imgUrl of images) {
        xml += `      <url>${escapeXml(imgUrl)}</url>\n`;
      }
      xml += `    </photo>\n`;
    }
    xml += `  </property>\n`;
  }

  xml += `</list>\n`;

  const xmlPath = path.join(outputDir, 'propertyfinder-feed.xml');
  fs.writeFileSync(xmlPath, xml, 'utf8');
  console.log(`[✓] Wrote Property Finder XML Feed (${listings.length} ads) → ${xmlPath}`);

  // 2. Build Property Finder CSV for Direct Portal Upload
  const csvHeaders = [
    'Reference',
    'Offering Type',
    'Property Type',
    'Price (EGP)',
    'Rental Period',
    'City',
    'Community',
    'Sub Community / Compound',
    'Bedrooms',
    'Bathrooms',
    'Area (sqm)',
    'Title (EN)',
    'Description (EN)',
  ];

  const csvRows = [csvHeaders.join(',')];
  for (const item of listings) {
    const ref = item.pf_reference_number || item.code || item.ref_id || `SE-${item.id.slice(0, 8).toUpperCase()}`;
    const cleanStr = (s) => `"${String(s || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    csvRows.push([
      cleanStr(ref),
      cleanStr(mapOfferingType(item.deal_type)),
      cleanStr(mapPropertyType(item.property_type)),
      item.price || 0,
      mapOfferingType(item.deal_type) === 'RR' ? 'Monthly' : '',
      cleanStr(item.city || 'Cairo'),
      cleanStr(item.location_area || 'New Cairo'),
      cleanStr(item.compound || ''),
      item.bedrooms || 0,
      item.bathrooms || 0,
      item.area_sqm || 0,
      cleanStr(item.title || `${item.property_type} in ${item.compound}`),
      cleanStr(item.description || item.title || ''),
    ].join(','));
  }

  const csvPath = path.join(outputDir, 'propertyfinder-portal-upload.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n'), 'utf8');
  console.log(`[✓] Wrote Property Finder Portal CSV (${listings.length} ads) → ${csvPath}`);
}

exportPropertyFinderFeed().catch((err) => {
  console.error('Property Finder feed export failed:', err);
  process.exit(1);
});
