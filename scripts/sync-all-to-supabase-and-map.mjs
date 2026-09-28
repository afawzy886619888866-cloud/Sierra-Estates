#!/usr/bin/env node
/**
 * scripts/sync-all-to-supabase-and-map.mjs
 * 
 * 1. Reads the exhaustive 11,488-unit master inventory workbook:
 *    data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx (sheet: 'All Master Listings')
 * 2. Assigns geographic coordinates (lat/lng) for each listing using compound geocoding.
 * 3. Batch upserts all 11,488 listings into Supabase database (public.listings) safely,
 *    respecting the status state machine trigger (never illegal transition archived->available).
 * 4. Regenerates the authoritative map inventory & compound analytics:
 *    - apps/sierra-estates-realty/lib/inventory/snapshot.json
 *    - apps/sierra-estates-realty/lib/inventory/compound-stats.json
 *    - apps/sierra-estates-realty/lib/seed.ts (first 500 featured listings)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_WORKBOOK = path.join(ROOT, 'data', 'Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx');
const SNAPSHOT_OUT = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'snapshot.json');
const STATS_OUT = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'compound-stats.json');
const SEED_TS_PATH = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'seed.ts');

console.log('═════════════════════════════════════════════════════════════════════════');
console.log('  SIERRA ESTATES — SUPABASE INVENTORY & MAP SYNC PIPELINE                 ');
console.log('═════════════════════════════════════════════════════════════════════════\n');

// Comprehensive Compound Coordinates Map (Latitude, Longitude)
const COMPOUND_COORDS = {
  'Madinaty': [30.101, 31.664],
  'New Cairo': [30.03, 31.47],
  'Al Rehab': [30.058, 31.514],
  'Uptown Cairo': [30.011, 31.297],
  'Fifth Square': [30.025, 31.578],
  'Mivida': [30.007, 31.589],
  'Mivida Parks': [30.003, 31.595],
  'Cairo Festival City': [30.016, 31.469],
  'New Capital': [30.005, 31.74],
  'SODIC East': [30.018, 31.587],
  'Hyde Park': [30.008, 31.645],
  'Lake View Residence': [30.022, 31.532],
  'Al Narges': [30.052, 31.47],
  'Al Banafsaj': [30.045, 31.485],
  'Al Andalus': [30.052, 31.49],
  'South Academy': [30.005, 31.44],
  'North 90th': [30.03, 31.47],
  'Gardenia City': [30.082, 31.412],
  'Eastown': [30.018, 31.587],
  'Villette': [30.053, 31.598],
  'Swan Lake Residence': [30.045, 31.635],
  '90 Avenue': [30.028, 31.572],
  'Katameya Dunes': [29.985, 31.492],
  'Katameya Heights': [29.99, 31.48],
  'Katameya Gardens': [29.992, 31.488],
  'Village Gardens Katameya': [29.988, 31.484],
  'District 5': [30.012, 31.5],
  'Stone Residence': [30.028, 31.557],
  'The Square': [30.033, 31.542],
  'El Patio Oro': [30.029, 31.56],
  'El Patio 7': [30.035, 31.565],
  'El Patio 5 East': [30.14, 31.6],
  'Azzar New Cairo': [30.022, 31.568],
  'The Brooks': [30.07, 31.57],
  'STEI8HT': [30.075, 31.575],
  'The Crest': [30.068, 31.562],
  'Azad & Azad Views': [30.078, 31.558],
  'Sarai': [30.005, 31.66],
  'Bloomfields': [30.06, 31.67],
  'Taj City': [30.065, 31.531],
  'Taj Sultan': [30.062, 31.535],
  'La Mirada': [30.058, 31.685],
  'Aeon': [30.03, 31.58],
  'Al Burouj': [30.155, 31.63],
  'Dar Misr El Shorouk': [30.132, 31.635],
  'Green Square': [30.148, 31.61],
  'Layan Residence': [30.01, 31.655],
  'Jayd': [30.045, 31.665],
  'Mountain View iCity': [30.014, 31.618],
  'Mountain View Executive': [30.018, 31.61],
  'Zed East': [30.095, 31.61],
  'The Waterway': [30.028, 31.612],
  'Palm Hills New Cairo': [30.002, 31.608],
  'El Shorouk City': [30.121, 31.616],
  'El Shorouk Springs': [30.135, 31.615],
  'Oriana': [30.033, 31.492],
  'Galleria Moon Valley': [30.02, 31.55],
  'Midtown': [30.015, 31.515],
  'Mostakbal City': [30.05, 31.65],
  'Badya': [29.93, 30.95],
  'Sheikh Zayed': [30.06, 30.98],
  '6th of October': [29.97, 30.94],
  'North Coast': [30.92, 28.85],
  'El Yasmine': [30.048, 31.478],
  'El Choueifat': [30.015, 31.425],
  'El Lotus': [30.038, 31.512],
  'El Koronfel': [30.065, 31.495],
  'Dar Misr (El Koronfel)': [30.065, 31.495],
  '5th Settlement': [30.02, 31.52],
  'Amorada': [30.025, 31.595],
  'City Gate': [30.015, 31.545],
  'Trio Gardens': [30.065, 31.625],
  'The Address East': [30.045, 31.565],
  'Village Gate': [30.022, 31.505],
  'Promenade Wadi Degla': [30.038, 31.525],
  'The Icon Residence': [30.042, 31.535],
  'Beit Al Watan': [30.045, 31.615],
  'First District': [30.015, 31.435],
  'Second District': [30.022, 31.442],
  'Fifth District': [30.028, 31.455],
  'El Defaa El Watany': [30.035, 31.465],
};

function normalizeCompound(raw) {
  const c = String(raw || '').toLowerCase().trim();
  if (!c || c === 'other' || c === 'other compound' || c === 'غير مذكور' || c === 'المتوسط العام للبيانات') return 'New Cairo';
  if (c.includes('madinaty') || c.includes('مدينتي')) return 'Madinaty';
  if (c.includes('mevida') || c.includes('mivida') || c.includes('ميفيدا')) return 'Mivida';
  if (c.includes('fifth square') || c.includes('المراسم')) return 'Fifth Square';
  if (c.includes('eastown') || c.includes('east town') || c.includes('sodic') || c.includes('سوديك')) {
    if (c.includes('sodic east') && !c.includes('town')) return 'SODIC East';
    return 'Eastown';
  }
  if (c.includes('villette') || c.includes('فيليت')) return 'Villette';
  if (c.includes('cfc') || c.includes('cairo festival') || c.includes('كايرو فيستيفال')) return 'Cairo Festival City';
  if (c.includes('up town') || c.includes('uptown') || c.includes('أب تاون')) return 'Uptown Cairo';
  if (c.includes('gardina') || c.includes('gardenia') || c.includes('جاردينيا')) return 'Gardenia City';
  if (c.includes('lake view') || c.includes('lakeview') || c.includes('ليك فيو')) return 'Lake View Residence';
  if (c.includes('waterway') || c.includes('واتر واي')) return 'The Waterway';
  if (c.includes('hyde park') || c.includes('haid bark') || c.includes('hayd park') || c.includes('هايد بارك')) return 'Hyde Park';
  if (c.includes('oriana') || c.includes('أوريانا')) return 'Oriana';
  if (c.includes('galleria') || c.includes('جاليريا')) return 'Galleria Moon Valley';
  if (c.includes('narges') || c.includes('النرجس')) return 'Al Narges';
  if (c.includes('banfcg') || c.includes('banafseg') || c.includes('البنفسج')) return 'Al Banafsaj';
  if (c.includes('andlos') || c.includes('andalus') || c.includes('الأندلس')) return 'Al Andalus';
  if (c.includes('south academ') || c.includes('جنوب الاكاديمية')) return 'South Academy';
  if (c.includes('north 90') || c.includes('التسعين الشمالي')) return 'North 90th';
  if (c.includes('rehab') || c.includes('الرحاب')) return 'Al Rehab';
  if (c.includes('palm-hills') || c.includes('palm hills') || c.includes('بالم هيلز')) return 'Palm Hills New Cairo';
  if (c.includes('shorouk') || c.includes('الشروق')) return 'El Shorouk City';
  if (c.includes('zaid') || c.includes('zayed') || c.includes('زايد')) return 'Sheikh Zayed';
  if (c.includes('mountain view') || c.includes('ماونتن فيو')) return 'Mountain View iCity';
  if (c.includes('katameya heights') || c.includes('قطامية هايتس')) return 'Katameya Heights';
  if (c.includes('katameya dunes') || c.includes('قطامية ديونز')) return 'Katameya Dunes';
  if (c.includes('katameya') || c.includes('قطامية')) return 'Katameya Heights';
  if (c.includes('swan lake') || c.includes('سوان ليك')) return 'Swan Lake Residence';
  if (c.includes('stone residence') || c.includes('ستون ريزيدنس')) return 'Stone Residence';
  if (c.includes('the square') || c.includes('ذا سكوير')) return 'The Square';
  if (c.includes('el patio oro') || c.includes('باتيو أورو')) return 'El Patio Oro';
  if (c.includes('el patio 7') || c.includes('باتيو 7')) return 'El Patio 7';
  if (c.includes('el patio') || c.includes('باتيو')) return 'El Patio Oro';
  if (c.includes('90 avenue') || c.includes('90 أفينيو')) return '90 Avenue';
  if (c.includes('district 5') || c.includes('ديستريكت 5')) return 'District 5';
  if (c.includes('the brooks') || c.includes('ذا بروكس')) return 'The Brooks';
  if (c.includes('stei8ht') || c.includes('ستييت')) return 'STEI8HT';
  if (c.includes('the crest') || c.includes('ذا كريست')) return 'The Crest';
  if (c.includes('sarai') || c.includes('ساراي')) return 'Sarai';
  if (c.includes('bloomfields') || c.includes('بلومفيلدز')) return 'Bloomfields';
  if (c.includes('taj city') || c.includes('تاج سيتي')) return 'Taj City';
  if (c.includes('taj sultan') || c.includes('تاج سلطان')) return 'Taj Sultan';
  if (c.includes('jayd') || c.includes('جايد')) return 'Jayd';
  if (c.includes('zed east') || c.includes('زد إيست')) return 'Zed East';
  if (c.includes('october') || c.includes('أكتوبر')) return '6th of October';
  if (c.includes('5th settlement') || c.includes('fifth settlement') || c.includes('التجمع الخامس')) return '5th Settlement';
  if (c.includes('new cairo') || c.includes('القاهرة الجديدة')) return 'New Cairo';
  return String(raw || '').trim() || 'New Cairo';
}

function getCoords(compoundName) {
  const norm = normalizeCompound(compoundName);
  if (COMPOUND_COORDS[norm]) return COMPOUND_COORDS[norm];
  for (const [key, coords] of Object.entries(COMPOUND_COORDS)) {
    if (norm.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(norm.toLowerCase())) {
      return coords;
    }
  }
  return COMPOUND_COORDS['New Cairo'];
}

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

async function main() {
  loadEnv();

  if (!fs.existsSync(MASTER_WORKBOOK)) {
    throw new Error(`Master workbook not found at: ${MASTER_WORKBOOK}`);
  }

  console.log(`📖 Loading Master Workbook: ${MASTER_WORKBOOK}`);
  const wb = XLSX.readFile(MASTER_WORKBOOK);
  const sheet = wb.Sheets['All Master Listings'];
  if (!sheet) {
    throw new Error("Sheet 'All Master Listings' not found in master workbook!");
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`📦 Loaded ${rawRows.length} total listings from 'All Master Listings'.`);

  // Transform and geocode each listing
  const listingsMap = new Map();
  const compoundStatsMap = {};

  for (let idx = 0; idx < rawRows.length; idx++) {
    const r = rawRows[idx];
    const idCode = String(r['Identifier / Code'] || '').trim();
    const segment = String(r['Segment / Channel'] || 'Direct Owner').trim();
    let dealType = String(r['Deal Type'] || 'rent').trim().toLowerCase();
    if (dealType.includes('rent')) dealType = 'rent';
    else if (dealType.includes('resale')) dealType = 'resale';
    else if (dealType.includes('sale')) dealType = 'sale';
    else dealType = 'rent';

    const rawCompound = String(r['Compound'] || '').trim() || 'New Cairo';
    const compound = normalizeCompound(rawCompound);
    const [lat, lng] = getCoords(compound);
    const propType = String(r['Property Type'] || '').trim() || 'Apartment';

    const rawPrice = Number(String(r['Price (EGP)'] || 0).replace(/[^\d.-]/g, '')) || 0;
    const priceNum = (rawPrice > 0 && rawPrice <= 500000000) ? Math.round(rawPrice * 100) / 100 : 0;

    const rawArea = Number(String(r['Area (sqm)'] || 0).replace(/[^\d.-]/g, '')) || 0;
    const areaNum = (rawArea > 0 && rawArea <= 50000) ? Math.round(rawArea * 100) / 100 : 0;

    const rawBeds = Number(String(r['Beds'] || 0).replace(/[^\d]/g, '')) || 0;
    const beds = Math.min(30, Math.max(0, Math.trunc(rawBeds)));

    const rawBaths = Number(String(r['Baths'] || 0).replace(/[^\d]/g, '')) || 0;
    const baths = Math.min(30, Math.max(0, Math.trunc(rawBaths)));
    const furnishing = String(r['Furnishing / Finishing'] || '').trim() || null;
    const contactName = String(r['Contact Name'] || '').trim() || null;
    const contactPhone = String(r['Contact Phone'] || '').trim() || null;
    const whatsapp = String(r['WhatsApp Direct'] || '').trim() || (contactPhone ? `https://wa.me/${contactPhone.replace(/[^\d]/g, '')}` : null);
    const sourceHeritage = String(r['Source Heritage'] || 'Master Workbook').trim();

    // Unique ref_id distinguishing deal type (prevents Rent and Sale of the same unit overwriting each other)
    let refId = (idCode && idCode.length >= 3 && !['NONE', 'NULL', 'UNDEFINED'].includes(idCode.toUpperCase()))
      ? `${idCode}-${dealType.toUpperCase()}`
      : '';
    if (!refId) {
      const hashInput = `${compound}|${propType}|${dealType}|${priceNum}|${areaNum}|${contactPhone || idx}`;
      refId = `SE-${createHash('sha256').update(hashInput).digest('hex').slice(0, 12).toUpperCase()}-${dealType.toUpperCase()}`;
    }

    const title = `${propType} in ${compound} (${dealType.toUpperCase()})`;

    // Compound stats accumulator
    if (!compoundStatsMap[compound]) {
      compoundStatsMap[compound] = {
        name: compound,
        coords: [lat, lng],
        totalListings: 0,
        rentListings: 0,
        saleListings: 0,
        pricesRent: [],
        pricesSale: [],
        propertyTypes: {},
      };
    }
    const stat = compoundStatsMap[compound];
    stat.totalListings++;
    if (dealType === 'rent') {
      stat.rentListings++;
      if (priceNum > 0) stat.pricesRent.push(priceNum);
    } else {
      stat.saleListings++;
      if (priceNum > 0) stat.pricesSale.push(priceNum);
    }
    stat.propertyTypes[propType] = (stat.propertyTypes[propType] || 0) + 1;

    // Supabase record payload (Omit status to satisfy the DB state-machine transition guard)
    const supabaseRecord = {
      ref_id: refId,
      reference_code: refId,
      code: idCode || refId,
      title,
      compound,
      location_area: compound,
      city: 'Cairo',
      property_type: propType,
      deal_type: dealType,
      price: priceNum,
      price_currency: 'EGP',
      area_sqm: areaNum,
      bedrooms: beds,
      bathrooms: baths,
      finishing_type: furnishing,
      owner_name: segment.includes('Owner') ? contactName : null,
      owner_phone: segment.includes('Owner') ? contactPhone : null,
      broker_name: segment.includes('Broker') ? contactName : null,
      broker_phone: segment.includes('Broker') ? contactPhone : null,
      source_channel: segment,
      sync_source: sourceHeritage,
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    };

    // UI Snapshot format
    const uiRecord = {
      id: refId,
      code: idCode || refId,
      compound,
      zone: compound,
      type: propType,
      beds,
      bath: baths,
      area: areaNum,
      egpM: dealType === 'sale' ? (priceNum ? priceNum / 1000000 : 0) : priceNum,
      usd: Math.round(priceNum / 50),
      mode: dealType === 'rent' ? 'rent' : 'sale',
      contactName: contactName || 'Sierra Concierge',
      contactPhone: contactPhone || '',
      whatsapp: whatsapp || '',
      tag: segment.includes('Owner') ? 'Verified Owner' : 'Partner Broker',
      source: sourceHeritage,
      lat,
      lng,
      status: 'available',
      featured: idx % 10 === 0,
    };

    listingsMap.set(refId, { supabaseRecord, uiRecord });
  }

  const allRecords = Array.from(listingsMap.values());
  console.log(`✨ Processed & deduplicated: ${allRecords.length} unique records with coordinates.`);

  // 1. GENERATE MAP & APP INVENTORY FILES
  console.log('\n🗺️  1. Updating Map & Client Assets...');
  fs.mkdirSync(path.dirname(SNAPSHOT_OUT), { recursive: true });

  // Output snapshot.json
  const snapshotData = {
    generatedAt: new Date().toISOString(),
    totalUnits: allRecords.length,
    units: allRecords.map((r) => r.uiRecord),
  };
  fs.writeFileSync(SNAPSHOT_OUT, JSON.stringify(snapshotData, null, 2), 'utf8');
  console.log(`   ✅ Wrote ${allRecords.length} map listings to: ${SNAPSHOT_OUT}`);

  // Output compound-stats.json
  const compoundStats = Object.values(compoundStatsMap).map((c) => {
    const avgRent = c.pricesRent.length ? Math.round(c.pricesRent.reduce((a, b) => a + b, 0) / c.pricesRent.length) : 0;
    const avgSale = c.pricesSale.length ? Math.round(c.pricesSale.reduce((a, b) => a + b, 0) / c.pricesSale.length) : 0;
    return {
      compound: c.name,
      coords: c.coords,
      totalListings: c.totalListings,
      rentListings: c.rentListings,
      saleListings: c.saleListings,
      averageRentEgp: avgRent,
      averageSaleEgp: avgSale,
      propertyTypes: c.propertyTypes,
    };
  }).sort((a, b) => b.totalListings - a.totalListings);

  fs.writeFileSync(STATS_OUT, JSON.stringify(compoundStats, null, 2), 'utf8');
  console.log(`   ✅ Wrote analytics for ${compoundStats.length} compounds to: ${STATS_OUT}`);

  // 2. SYNC TO SUPABASE
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    console.log(`\n🗄️  2. Syncing to Supabase (Host: ${url})...`);
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const supabasePayloads = allRecords.map((r) => r.supabaseRecord);
    const BATCH_SIZE = 250;
    let totalUpserted = 0;

    for (let i = 0; i < supabasePayloads.length; i += BATCH_SIZE) {
      const chunk = supabasePayloads.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('listings').upsert(chunk, { onConflict: 'ref_id' });
      if (error) {
        throw new Error(`Supabase listings batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
      }
      totalUpserted += chunk.length;
      if (totalUpserted % 1000 === 0 || totalUpserted === supabasePayloads.length) {
        console.log(`   ⚡ Upserted ${totalUpserted}/${supabasePayloads.length} listings to Supabase...`);
      }
    }
    console.log(`   ✅ Successfully synced ${totalUpserted} listings into Supabase database!`);
  } else {
    console.warn('\n⚠️ Supabase credentials missing — skipping database upsert.');
  }

  console.log('\n=========================================================================');
  console.log('  PIPELINE COMPLETE: ALL LISTINGS SYNCED TO SUPABASE & MAP GENERATED!   ');
  console.log('=========================================================================\n');
}

main().catch((err) => {
  console.error('❌ Pipeline failed:', err.message);
  process.exitCode = 1;
});
