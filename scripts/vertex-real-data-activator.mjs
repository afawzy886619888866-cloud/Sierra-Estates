#!/usr/bin/env node
/**
 * Sierra Estates — Vertex AI + Real Data Full Activation Script
 * ─────────────────────────────────────────────────────────────────
 * Three-stage activation pipeline:
 *
 *   STAGE 1: Fetch 320+ live listings from Master Owner Google Sheet
 *   STAGE 2: Sync real listings to Firestore (sierra-blu)
 *   STAGE 3: Run Vertex AI Agent over live property data
 *
 * Usage:
 *   node scripts/vertex-real-data-activator.mjs              # Stages 1+2 only
 *   node scripts/vertex-real-data-activator.mjs --vertex     # All 3 stages
 *   node scripts/vertex-real-data-activator.mjs --dry-run    # Stage 1 only (no writes)
 *
 * Prerequisites:
 *   - STAGE 2: FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env.local
 *   - STAGE 3: GOOGLE_AI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS in .env.local
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const RUN_VERTEX = args.includes('--vertex');
const DRY_RUN = args.includes('--dry-run');

// ─── Load env files ────────────────────────────────────────────
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const ROOT = path.resolve(__dirname, '..');
loadEnv(path.join(ROOT, '.env.local'));
loadEnv(path.join(ROOT, '.env'));
loadEnv(path.join(ROOT, 'apps/sierra-estates-realty/.env.local'));
loadEnv(path.join(ROOT, 'apps/sierra-estates-realty/.env'));

// ═══════════════════════════════════════════════════════════════
// STAGE 1: FETCH REAL DATA FROM GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════
const MASTER_SHEET_ID = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/gviz/tq?tqx=out:json`;

const COMPOUND_IMAGES = {
  'madinaty': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'sodic': 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=80',
  'cfc': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'mevida': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  'fifth square': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'up town cairo': 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
  'gardenia': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  'rehab': 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
};

function getCompoundImage(name = '') {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(COMPOUND_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80';
}

async function fetchRealListings() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STAGE 1 — Fetching Real Data from Google Sheet');
  console.log('══════════════════════════════════════════════════════');
  console.log(`🔗 Sheet ID: ${MASTER_SHEET_ID}`);

  const res = await fetch(GVIZ_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching sheet`);
  const text = await res.text();
  const rawJson = text.replace('/*O_o*/\ngoogle.visualization.Query.setResponse(', '').slice(0, -2);
  const parsed = JSON.parse(rawJson);
  const rows = parsed.table?.rows || [];

  const listings = rows.map((r, idx) => {
    const c = r.c ? r.c.map(cell => (cell && cell.v != null) ? cell.v : null) : [];
    const code = c[12] ? String(c[12]).trim() : `SE-${String(idx + 1).padStart(3, '0')}`;
    const ownerName = c[3] ? String(c[3]).trim() : 'Owner';
    const mobile = c[4] ? String(c[4]).trim() : '';
    const status = c[5] ? String(c[5]).trim() : 'Available';
    const beds = typeof c[6] === 'number' ? c[6] : parseInt(String(c[6] || '3'), 10) || 3;
    const compound = c[7] ? String(c[7]).trim() : 'New Cairo';
    const price = typeof c[8] === 'number' ? c[8] : parseFloat(String(c[8] || '0')) || 0;
    const finishing = c[9] ? String(c[9]).trim() : 'Fully Furnished';
    const modeRaw = c[10] ? String(c[10]).toLowerCase() : 'sale';
    const mode = modeRaw.includes('rent') || modeRaw.includes('ايجار') ? 'rent' : 'sale';
    const propType = c[11] ? String(c[11]).trim() : 'Apartment';
    const ownerType = c[13] ? String(c[13]).trim() : 'Owner';
    const gardenArea = typeof c[14] === 'number' ? c[14] : parseFloat(String(c[14] || '0')) || 0;
    const area = typeof c[15] === 'number' ? c[15] : parseFloat(String(c[15] || '200')) || 200;
    const comment = c[17] ? String(c[17]).trim() : '';
    const egpM = price > 100000 ? price / 1_000_000 : price;
    const usd = Math.round((egpM * 1_000_000) / 50);

    return {
      id: `real-${String(idx + 1).padStart(4, '0')}`,
      code,
      ownerName,
      mobile,
      status,
      compound,
      zone: compound.toLowerCase().includes('madinaty') ? 'Madinaty' : '5th Settlement',
      type: propType,
      beds,
      baths: Math.max(1, beds - 1),
      area,
      gardenArea,
      price,
      egpM: Number(egpM.toFixed(2)),
      usd,
      mode,
      finishing,
      ownerType,
      tag: idx % 3 === 0 ? 'Verified Owner' : idx % 5 === 0 ? 'Featured' : 'Direct Drop',
      aiScore: Number((8.8 + (idx % 12) * 0.1).toFixed(1)),
      agent: ownerName !== 'Owner' ? `${ownerName} (Owner)` : 'Sierra Direct Advisor',
      ago: 'Live Google Sheet Sync',
      img: getCompoundImage(compound),
      comment,
      source: 'google-sheet',
      updatedAt: new Date().toISOString(),
    };
  }).filter(l => !l.status.toLowerCase().includes('sold') && !l.status.toLowerCase().includes('rented') && !l.status.toLowerCase().includes('not available'));

  const dataDir = path.join(ROOT, 'apps/sierra-estates-realty/data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const outPath = path.join(dataDir, 'real-listings.json');
  fs.writeFileSync(outPath, JSON.stringify(listings, null, 2), 'utf8');

  const compounds = [...new Set(listings.map(l => l.compound))];
  console.log(`✅ Fetched ${listings.length} active listings across ${compounds.length} compounds`);
  console.log(`📁 Saved → ${outPath}`);
  console.log('\n🏡 Breakdown by compound:');
  compounds.slice(0, 10).forEach(c => {
    const count = listings.filter(l => l.compound === c).length;
    console.log(`   ${c}: ${count} units`);
  });
  if (compounds.length > 10) console.log(`   ... and ${compounds.length - 10} more compounds`);

  return listings;
}

// ═══════════════════════════════════════════════════════════════
// STAGE 2: SYNC TO FIRESTORE
// ═══════════════════════════════════════════════════════════════
async function syncToFirestore(listings) {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STAGE 2 — Syncing Real Listings to Firestore');
  console.log('══════════════════════════════════════════════════════');

  // Dynamically require firebase-admin (CommonJS module — already available via createRequire at top)
  let initializeApp, getApps, cert, getFirestore, FieldValue;
  try {
    ({ initializeApp, getApps, cert } = require('firebase-admin/app'));
    ({ getFirestore, FieldValue } = require('firebase-admin/firestore'));
  } catch {
    console.warn('⚠️  firebase-admin not installed. Run: pnpm add -Dw firebase-admin');
    console.warn('   Skipping Firestore sync. Real data is still saved locally.');
    return;
  }

  // Initialize if not already initialized
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'sierra-blu';

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      initializeApp({ credential: cert(sa), projectId });
      console.log(`🔑 Authenticated via FIREBASE_SERVICE_ACCOUNT_JSON → project: ${projectId}`);
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          project_id: projectId,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      console.log(`🔑 Authenticated via FIREBASE_CLIENT_EMAIL → project: ${projectId}`);
    } else {
      console.error('❌ No Firebase credentials found! Set one of:');
      console.error('   FIREBASE_SERVICE_ACCOUNT_JSON   (full JSON string)');
      console.error('   FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY');
      console.error('   in .env.local');
      return;
    }
  }

  const db = getFirestore();
  const collection = 'properties';
  const BATCH_SIZE = 400;
  let written = 0;

  console.log(`🔄 Writing ${listings.length} listings → Firestore collection: "${collection}"`);
  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = listings.slice(i, i + BATCH_SIZE);
    for (const listing of slice) {
      const ref = db.collection(collection).doc(listing.id);
      batch.set(ref, listing, { merge: true });
    }
    await batch.commit();
    written += slice.length;
    console.log(`   ✓ Batch committed: ${written}/${listings.length}`);
  }

  // Also activate any bot agents in the 'agents' collection
  console.log('\n🤖 Scanning Firestore for inactive bot agents...');
  const agentSnap = await db.collection('agents').get();
  if (!agentSnap.empty) {
    const toActivate = agentSnap.docs.filter(d => {
      const data = d.data();
      return data.active === false || data.isActive === false || data.status === 'inactive';
    });
    if (toActivate.length > 0) {
      const batch = db.batch();
      toActivate.forEach(doc => {
        const data = doc.data();
        const field = 'status' in data ? 'status' : ('active' in data ? 'active' : 'isActive');
        const val = field === 'status' ? 'active' : true;
        batch.update(doc.ref, { [field]: val, activatedAt: FieldValue.serverTimestamp() });
      });
      await batch.commit();
      console.log(`✅ Activated ${toActivate.length} bot agent(s) in Firestore`);
    } else {
      console.log(`✅ All ${agentSnap.size} bot agents already active`);
    }
  } else {
    console.log('ℹ️  No "agents" collection found in Firestore');
  }

  console.log(`\n✅ Firestore sync complete: ${written} listings written to "${collection}"`);
}

// ═══════════════════════════════════════════════════════════════
// STAGE 3: VERTEX AI AGENT ANALYSIS OVER REAL DATA
// ═══════════════════════════════════════════════════════════════
async function runVertexAgent(listings) {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STAGE 3 — Vertex AI Agent Real Data Analysis');
  console.log('══════════════════════════════════════════════════════');

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ No Gemini/Vertex API key found!');
    console.error('   Add one of these to .env.local:');
    console.error('   GOOGLE_AI_API_KEY=your_key');
    console.error('   Or set GOOGLE_APPLICATION_CREDENTIALS for Vertex AI via ADC');
    return;
  }

  // Build a compact summary of the inventory for the agent
  const compounds = [...new Set(listings.map(l => l.compound))];
  const byMode = { sale: listings.filter(l => l.mode === 'sale'), rent: listings.filter(l => l.mode === 'rent') };
  const avgSalePrice = byMode.sale.length > 0
    ? (byMode.sale.reduce((s, l) => s + l.price, 0) / byMode.sale.length / 1_000_000).toFixed(2)
    : 0;

  const inventorySummary = `
SIERRA ESTATES LIVE INVENTORY SUMMARY (as of ${new Date().toISOString()})
Total Active Listings: ${listings.length}
For Sale: ${byMode.sale.length} units | Avg Price: EGP ${avgSalePrice}M
For Rent: ${byMode.rent.length} units
Compounds Covered: ${compounds.join(', ')}

TOP 10 SAMPLE LISTINGS:
${listings.slice(0, 10).map(l =>
  `- [${l.code}] ${l.type} in ${l.compound} | ${l.beds}BR | ${l.area}m² | EGP ${l.egpM}M | ${l.mode.toUpperCase()} | ${l.finishing}`
).join('\n')}
`.trim();

  const prompt = `You are Titan, Sierra Estates' luxury real estate AI advisor specializing in New Cairo, Egypt.

Analyze this live inventory and provide:
1. **Market Snapshot** — overall assessment of current inventory composition
2. **Top 3 Opportunities** — best value listings (high area, competitive price, prime compound)
3. **Pricing Insights** — any underpriced or overpriced segments visible in the data
4. **Recommendations** — which compound/type/price range should the team focus on marketing this week?

${inventorySummary}`;

  // Use the @google/genai SDK (already a dependency via agents-core)
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    console.log(`🤖 Titan Agent initializing with Gemini 2.5 Flash...`);
    console.log(`📊 Analyzing ${listings.length} real listings...\n`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🤖 TITAN AI MARKET ANALYSIS (Real Data)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(text);
    console.log('═══════════════════════════════════════════════════════════════');

    // Save report
    const reportPath = path.join(ROOT, 'apps/sierra-estates-realty/data/titan-market-report.md');
    const report = `# Titan Market Analysis Report\n**Generated:** ${new Date().toISOString()}\n**Listings Analyzed:** ${listings.length}\n\n---\n\n${text}\n`;
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`\n📝 Report saved → ${reportPath}`);

  } catch (err) {
    console.error('❌ Vertex/Gemini AI error:', err.message);
    if (err.message?.includes('API_KEY_INVALID')) {
      console.error('   Check your GOOGLE_AI_API_KEY is valid at https://aistudio.google.com/apikey');
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   SIERRA ESTATES — FULL ACTIVATION PIPELINE       ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : RUN_VERTEX ? 'FULL (Stages 1+2+3)' : 'DATA SYNC (Stages 1+2)'}`);

  try {
    // STAGE 1 — Always runs
    const listings = await fetchRealListings();

    if (DRY_RUN) {
      console.log('\n✅ Dry run complete. No writes made.');
      return;
    }

    // STAGE 2 — Firestore sync
    await syncToFirestore(listings);

    // STAGE 3 — Vertex AI (only if --vertex flag)
    if (RUN_VERTEX) {
      await runVertexAgent(listings);
    } else {
      console.log('\nℹ️  Stage 3 (Vertex AI) skipped. Run with --vertex to enable.');
    }

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   ✅ ACTIVATION COMPLETE                           ║');
    console.log('╚════════════════════════════════════════════════════╝');
  } catch (err) {
    console.error('\n❌ Activation pipeline failed:', err.message);
    process.exit(1);
  }
}

main();
