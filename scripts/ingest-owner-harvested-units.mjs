/**
 * Ingest owner units from harvested_units.jsonl into /api/listings/add
 * Uses admin API key so listings are auto-approved as PUBLISHABLE
 * Run: node scripts/ingest-owner-harvested-units.mjs [--dry-run]
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://sierra-estates.net';
const ADMIN_API_KEY = 'ba5eb17b8cd715e93d87d4d55b8fc021b4817c155c465a082cb24600b27bb25c';

// --- Phone normalizer (matches lib/utils/phone.ts) ---
function normalizeEgyptianPhone(raw) {
  if (!raw) return null;
  // Convert Arabic-Indic digits
  let s = String(raw).replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => d.charCodeAt(0) - 1632);
  s = s.replace(/\D/g, '');
  if (s.startsWith('2010') || s.startsWith('2011') || s.startsWith('2012') || s.startsWith('2015')) {
    s = '0' + s.slice(2); // 201xxxxxxx → 01xxxxxxx
  }
  if (s.startsWith('20')) s = '0' + s.slice(2);
  if (s.startsWith('+20')) s = '0' + s.slice(3);
  if (!s.startsWith('01') || s.length !== 11) return null;
  return s;
}

// --- Category mapper ---
function mapCategory(unitType) {
  if (!unitType) return 'Apartment';
  const t = unitType.toLowerCase();
  if (t.includes('villa') || t.includes('standalone')) return 'Villa';
  if (t.includes('twin')) return 'Twin House';
  if (t.includes('townhouse') || t.includes('town house')) return 'Townhouse';
  if (t.includes('duplex')) return 'Duplex';
  if (t.includes('penthouse')) return 'Penthouse';
  if (t.includes('commercial') || t.includes('admin') || t.includes('office')) return 'Commercial';
  if (t.includes('studio')) return 'Apartment';
  return 'Apartment';
}

// --- Finishing mapper ---
function mapFinishing(raw) {
  if (!raw) return 'Semi-Finished';
  const t = String(raw).toLowerCase();
  if (t.includes('furnished') || t.includes('مفروش')) return 'Furnished';
  if (t.includes('fully') || t.includes('تشطيب') || t.includes('متشطب')) return 'Fully Finished';
  if (t.includes('core') || t.includes('shell') || t.includes('عظم')) return 'Core & Shell';
  return 'Semi-Finished';
}

// --- Compound normalizer (basic) ---
function normalizeCompound(raw) {
  if (!raw) return 'New Cairo';
  const c = String(raw).trim();
  // Map common aliases
  const aliases = {
    'ميفيدا': 'Mivida', 'mivida': 'Mivida',
    'هايد بارك': 'Hyde Park', 'hyde park': 'Hyde Park',
    'ماونتن فيو': 'Mountain View', 'mountain view': 'Mountain View',
    'مدينتي': 'Madinaty', 'madinaty': 'Madinaty',
    'بالم هيلز': 'Palm Hills New Cairo', 'palm hills': 'Palm Hills New Cairo',
    'al narges': 'Al Narges', 'النرجس': 'Al Narges',
  };
  const lower = c.toLowerCase();
  for (const [k, v] of Object.entries(aliases)) {
    if (lower.includes(k)) return v;
  }
  return c;
}

// --- Load and filter harvested units ---
const harvestedPath = join('H:\\Sierra Estates', 'apps', 'agents', 'whatsapp-multi-session', 'whatsapp-auth', 'harvested_units.jsonl');
const lines = readFileSync(harvestedPath, 'utf8').split('\n').filter(Boolean);

const allUnits = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const ownerUnits = allUnits.filter(u => {
  const isOwner = u.advertiserType === 'Direct Owner' || u.sourceType === 'owner';
  const phone = u.phone || u.ownerPhone || u.brokerPhone;
  return isOwner && phone;
});

// Deduplicate by (phone + compound + unitType + dealType)
const seen = new Set();
const dedupedUnits = ownerUnits.filter(u => {
  const phone = u.phone || u.ownerPhone || u.brokerPhone;
  const key = `${normalizeEgyptianPhone(phone)}|${u.compound}|${u.unitType}|${u.dealType}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`\n📦 Total harvested: ${allUnits.length}`);
console.log(`👤 Owner units with phone: ${ownerUnits.length}`);
console.log(`✅ After dedup: ${dedupedUnits.length}`);
console.log(`🚦 Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

// --- Build API payloads ---
function buildPayload(u) {
  const rawPhone = u.phone || u.ownerPhone || u.brokerPhone;
  const phone = normalizeEgyptianPhone(rawPhone);
  if (!phone) return null;

  const transaction = u.dealType === 'Rent' ? 'Rent' : 'Sale';
  const category = mapCategory(u.unitType);
  const compound = normalizeCompound(u.compound);
  const areaSqm = u.areaSqm || u.area || 50;
  const priceEgp = u.priceEgp || u.price || 0;

  // Skip units with 0 price AND 0 area
  if (priceEgp === 0 && areaSqm === 50) return null;

  return {
    submitterRole: 'Direct Owner',
    contactName: u.name || u.ownerName || u.brokerName || 'Owner',
    phone,
    transaction,
    category,
    compound,
    zone: u.zone || compound,
    areaSqm: Number(areaSqm) || 50,
    bedrooms: Number(u.bedrooms) || 0,
    bathrooms: Number(u.bathrooms) || 0,
    finishing: mapFinishing(u.finishing),
    priceEgp: Number(priceEgp),
    floor: u.floor || null,
    notes: u.rawText ? String(u.rawText).slice(0, 2000) : null,
    source: 'whatsapp-owner-harvest',
  };
}

const payloads = dedupedUnits.map(buildPayload).filter(Boolean);
console.log(`📝 Valid payloads to submit: ${payloads.length}\n`);

if (DRY_RUN) {
  console.log('--- DRY RUN PAYLOADS ---');
  payloads.forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.contactName} | ${p.compound} | ${p.transaction} ${p.category} | ${p.areaSqm}m² | ${p.priceEgp.toLocaleString()} EGP | ${p.phone}`);
    console.log(`     finishing: ${p.finishing} | beds: ${p.bedrooms} | baths: ${p.bathrooms}`);
  });
  console.log('\n✅ Dry run complete. Run without --dry-run to submit.');
  process.exit(0);
}

// --- Submit to production API ---
let successCount = 0;
let failCount = 0;
const results = [];

for (let i = 0; i < payloads.length; i++) {
  const payload = payloads[i];
  console.log(`[${i + 1}/${payloads.length}] Submitting: ${payload.contactName} | ${payload.compound} | ${payload.transaction} ${payload.category} | ${payload.priceEgp.toLocaleString()} EGP`);
  
  try {
    const res = await fetch(`${BASE_URL}/api/listings/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-api-key': ADMIN_API_KEY,
        'x-internal-request': 'true',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({ error: 'No JSON body', status: res.status }));
    
    if (res.ok) {
      successCount++;
      const code = json.unitCode || json.listingCode || json.id || 'N/A';
      console.log(`  ✅ OK — Unit code: ${code} | Status: ${json.status || json.reviewStatus || 'created'}`);
      results.push({ status: 'success', payload, response: json });
    } else {
      failCount++;
      console.log(`  ❌ FAIL ${res.status} — ${JSON.stringify(json).slice(0, 200)}`);
      results.push({ status: 'fail', payload, response: json, httpStatus: res.status });
    }
  } catch (err) {
    failCount++;
    console.log(`  💥 ERROR — ${err.message}`);
    results.push({ status: 'error', payload, error: err.message });
  }

  // Rate limit: 500ms between requests
  if (i < payloads.length - 1) await new Promise(r => setTimeout(r, 500));
}

// --- Summary ---
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 INGESTION COMPLETE`);
console.log(`  ✅ Success: ${successCount}`);
console.log(`  ❌ Failed:  ${failCount}`);
console.log(`  📦 Total:   ${payloads.length}`);
console.log('='.repeat(60));

// Save results log
import { writeFileSync } from 'fs';
const logPath = join('H:\\Sierra Estates', 'workflows', '.state', `owner-ingest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), successCount, failCount, results }, null, 2));
console.log(`\n💾 Results saved to: ${logPath}`);
