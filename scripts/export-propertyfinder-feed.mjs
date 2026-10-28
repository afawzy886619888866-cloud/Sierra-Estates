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

function loadCompoundPhotoPool() {
  const poolPath = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'compound-real-photos.json');
  if (!fs.existsSync(poolPath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
    return parsed && typeof parsed.compounds === 'object' ? parsed.compounds : {};
  } catch {
    return {};
  }
}

function mapOfferingType(dealType) {
  const d = String(dealType || '').toLowerCase();
  if (d.includes('rent') || d.includes('ايجار')) return 'RR';
  return 'RS';
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
  return 'AP';
}

function sanitizeFeedImages(raw) {
  const entries = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.trim()
      ? (() => {
          try {
            const v = JSON.parse(raw);
            return Array.isArray(v) ? v : [raw];
          } catch {
            return [raw];
          }
        })()
      : [];
  const urls = [];
  for (const e of entries) {
    if (typeof e !== 'string') continue;
    for (const m of e.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
      const u = m[0].replace(/[),.;]+$/, '').replace(/&amp;/g, '&');
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

function buildPropertyBlock(item, compoundPool, agentPhone, agentEmail) {
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

  let images = sanitizeFeedImages(item.images);
  if (images.length === 0 && subCommunity && Array.isArray(compoundPool[subCommunity])) {
    images = compoundPool[subCommunity].slice(0, 5);
  }

  let block = `  <property last_update="${new Date(item.updated_at || Date.now()).toISOString().replace('T', ' ').slice(0, 19)}">\n`;
  block += `    <reference_number>${escapeXml(ref)}</reference_number>\n`;
  block += `    <offering_type>${offeringType}</offering_type>\n`;
  block += `    <property_type>${propType}</property_type>\n`;
  block += `    <price_on_application>${price > 0 ? '0' : '1'}</price_on_application>\n`;
  block += `    <price>${price}</price>\n`;
  if (offeringType === 'RR') {
    block += `    <rental_period>M</rental_period>\n`;
  }
  block += `    <currency>${escapeXml(item.price_currency || 'EGP')}</currency>\n`;
  block += `    <city>${escapeXml(city)}</city>\n`;
  block += `    <community>${escapeXml(community)}</community>\n`;
  if (subCommunity) {
    block += `    <sub_community>${escapeXml(subCommunity)}</sub_community>\n`;
  }
  block += `    <title_en><![CDATA[${titleEn}]]></title_en>\n`;
  if (item.title_ar) {
    block += `    <title_ar><![CDATA[${item.title_ar}]]></title_ar>\n`;
  }
  block += `    <description_en><![CDATA[${descEn}]]></description_en>\n`;
  if (item.description_ar) {
    block += `    <description_ar><![CDATA[${item.description_ar}]]></description_ar>\n`;
  }
  if (size > 0) block += `    <size>${size}</size>\n`;
  if (beds > 0) block += `    <bedroom>${beds}</bedroom>\n`;
  if (baths > 0) block += `    <bathroom>${baths}</bathroom>\n`;
  block += `    <agent>\n`;
  block += `      <name>${escapeXml(item.agent_name || 'Sierra Estates Advisory')}</name>\n`;
  block += `      <email>${escapeXml(agentEmail)}</email>\n`;
  block += `      <phone>${escapeXml(agentPhone)}</phone>\n`;
  block += `    </agent>\n`;

  if (images.length > 0) {
    block += `    <photo>\n`;
    for (const imgUrl of images.slice(0, 15)) {
      block += `      <url>${escapeXml(imgUrl)}</url>\n`;
    }
    block += `    </photo>\n`;
  }
  block += `  </property>\n`;
  return { block, hasDirectPhotos: sanitizeFeedImages(item.images).length > 0 };
}

async function exportPropertyFinderFeed() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials missing.');
  }

  const agentPhone = process.env.PF_AGENT_PHONE || process.env.SIERRA_AGENT_PHONE || '+201092048333';
  const agentEmail = process.env.PF_AGENT_EMAIL || 'info@sierra-estates.net';
  const compoundPool = loadCompoundPhotoPool();

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log('Fetching publish-gated active listings from Supabase for Property Finder syndication (paginated)...');

  const PAGE_SIZE = 1000;
  const listings = [];
  for (let from = 0; from < 25000; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('listings')
      .select(
        'id, ref_id, code, pf_reference_number, title, title_ar, compound, location_area, city, property_type, deal_type, price, price_currency, bedrooms, bathrooms, area_sqm, description, description_ar, images, updated_at, agent_name'
      )
      .eq('publish_status', 'PUBLISHABLE')
      .in('status', ['available', 'active', 'published'])
      .gt('price', 0)
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Supabase query failed at offset ${from}: ${error.message}`);
    const batch = data || [];
    listings.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`Found ${listings.length} PUBLISHABLE priced listings for Property Finder syndication.`);

  const outputDir = path.join(ROOT, 'docs', 'drafts', 'propertyfinder');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const nowIso = new Date().toISOString();
  const fullBlocks = [];
  const compactBlocks = [];
  const COMPACT_LIMIT = 1000;

  // Prioritize units with direct photos for the tracked compact feed (<5 MB git policy)
  const sortedForCompact = [...listings].sort((a, b) => {
    const aPhotos = sanitizeFeedImages(a.images).length;
    const bPhotos = sanitizeFeedImages(b.images).length;
    return bPhotos - aPhotos;
  });

  for (const item of listings) {
    const { block } = buildPropertyBlock(item, compoundPool, agentPhone, agentEmail);
    fullBlocks.push(block);
  }

  for (const item of sortedForCompact.slice(0, COMPACT_LIMIT)) {
    const { block } = buildPropertyBlock(item, compoundPool, agentPhone, agentEmail);
    compactBlocks.push(block);
  }

  const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n<list last_update="${nowIso}">\n${fullBlocks.join('')}</list>\n`;
  const compactXml = `<?xml version="1.0" encoding="UTF-8"?>\n<list last_update="${nowIso}">\n${compactBlocks.join('')}</list>\n`;

  const allXmlPath = path.join(outputDir, 'propertyfinder-all-units.xml');
  const feedXmlPath = path.join(outputDir, 'propertyfinder-feed.xml');
  fs.writeFileSync(allXmlPath, fullXml, 'utf8');
  fs.writeFileSync(feedXmlPath, compactXml, 'utf8');

  console.log(`[✓] Wrote Full Property Finder XML (${listings.length} ads, ${(fullXml.length / 1024 / 1024).toFixed(2)} MB) → ${allXmlPath}`);
  console.log(`[✓] Wrote Tracked Compact XML (${compactBlocks.length} top photo-verified ads, ${(compactXml.length / 1024 / 1024).toFixed(2)} MB) → ${feedXmlPath}`);

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
    'Title (AR)',
    'Description (EN)',
    'Description (AR)',
  ];

  const csvRows = [csvHeaders.join(',')];
  const cleanStr = (s) => `"${String(s || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  for (const item of listings) {
    const ref = item.pf_reference_number || item.code || item.ref_id || `SE-${item.id.slice(0, 8).toUpperCase()}`;
    const offering = mapOfferingType(item.deal_type);
    csvRows.push([
      cleanStr(ref),
      cleanStr(offering),
      cleanStr(mapPropertyType(item.property_type)),
      item.price || 0,
      offering === 'RR' ? 'Monthly' : '',
      cleanStr(item.city || 'Cairo'),
      cleanStr(item.location_area || 'New Cairo'),
      cleanStr(item.compound || ''),
      item.bedrooms || 0,
      item.bathrooms || 0,
      item.area_sqm || 0,
      cleanStr(item.title || `${item.property_type || 'Property'} in ${item.compound || 'New Cairo'}`),
      cleanStr(item.title_ar || ''),
      cleanStr(item.description || item.title || ''),
      cleanStr(item.description_ar || ''),
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
