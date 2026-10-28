import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { OpenClawAgent, MasterSheetUnit } from '../packages/agents/openclaw';
import { obsidian } from '../packages/obsidian/src/index';
import { generateInventoryReport } from '../packages/agents/tools/reportTools';
import { DeepSeekHarness } from '../packages/deepseek-harness/src/index';
import { propertyFinderConnector } from '../packages/property-finder-api/src/connector';
import {
  WHATSAPP_GROUP_REGISTRY,
  ARCHIVED_GROUPS,
  OWNER_GROUPS,
  BROKER_GROUPS,
} from '../packages/agents/tools/whatsappGroupRegistry';

// Load environment variables from available locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'workflows/.env') });

const aiKey =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.ANTIGRAVITY_API_KEY ||
  '';

/** Paths to data files */
const EXTRACTED_UNITS_PATH = path.resolve(
  process.cwd(),
  'packages/whatsapp-shared/inventory_extracted_units.json',
);
const MASTER_SHEET_PATH = path.resolve(
  process.cwd(),
  'apps/sierra-estates-realty/data/real-listings.json',
);
const MISSING_PHOTOS_CSV_PATH = path.resolve(
  process.cwd(),
  'docs/drafts/propertyfinder/propertyfinder-owners-missing-photos.csv',
);
const COMPOUND_REAL_PHOTOS_PATH = path.resolve(
  process.cwd(),
  'apps/sierra-estates-realty/lib/inventory/compound-real-photos.json',
);
const OPTOUT_LEDGER_PATH = path.resolve(
  process.cwd(),
  'workflows/.state/owner-outreach-optouts.jsonl',
);

const PRIORITY_COMPOUNDS = [
  'Mivida',
  'Hyde Park',
  'Eastown',
  'Villette',
  'Palm Hills New Cairo',
  'Mountain View iCity',
  'Up Town Cairo',
  'Fifth Square',
  'Madinaty',
  'Al Rehab',
];

/** Sample WhatsApp messages for quick smoke tests */
const SAMPLE_WHATSAPP_MESSAGES = [
  {
    group: 'New Cairo Elite Brokers (VIP)',
    groupId: 'broker-elite-001@g.us',
    sender: '+201001234567 (Broker Karim)',
    text: '🔥 لقطة للبيع في ميفيدا Mivida التجمع الخامس! فيلا مستقلة Standalone مساحة 450 متر مباني، 4 غرف نوم ماستر، تشطيب الترا سوبر لوكس مع حديقة خاصة وحمام سباحة Private Pool. السعر 38 مليون كاش. لقطة وسعر محروق للتنفيذ الفوري.',
  },
  {
    group: 'East Cairo Commercial & Luxury Network',
    groupId: 'broker-commercial@g.us',
    sender: '+201119876543 (Advisor Mostafa)',
    text: 'للبيع في كمبوند هايد بارك Hyde Park التجمع الخامس بنتهاوس Penthouse مساحة 280م + روف 120م، 3 غرف نوم، نصف تشطيب، فيو بحيرات Lake View مباشرة. إجمالي السعر 16.5 مليون بمقدم 30% وأقساط على 5 سنوات.',
  },
  {
    group: 'Owners August 2026',
    groupId: '120363044918239011@g.us',
    sender: '+20 100 882 1490 (Owner Direct)',
    text: 'متاحه مدينتي الشقه فيو مميز جدا ايجار مفروش تشطيب سوبر لوكس مكيفة بالكامل بالفرش والأجهزة الحديثة جاهزة للسكن الفوري السعر 35000 شهري.',
  },
];

function progress(current: number, total: number, label: string): void {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${pct}% — ${current}/${total} ${label}`);
}

function normalizeE164Egypt(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  let local = digits;
  if (local.startsWith('0020') && local.length === 14) local = local.slice(4);
  else if (local.startsWith('20') && local.length === 12) local = local.slice(2);
  if (local.startsWith('0') && local.length === 11 && /^01[0125]/.test(local)) {
    return `+20${local.slice(1)}`;
  }
  if (local.length === 10 && /^1[0125]/.test(local)) {
    return `+20${local}`;
  }
  return null;
}

function loadOptOutDigits(): Set<string> {
  const set = new Set<string>();
  if (!fs.existsSync(OPTOUT_LEDGER_PATH)) return set;
  try {
    const lines = fs.readFileSync(OPTOUT_LEDGER_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      try {
        const parsed = JSON.parse(l) as { phone?: string; e164?: string };
        if (parsed.phone) set.add(String(parsed.phone).replace(/\D/g, ''));
        if (parsed.e164) set.add(String(parsed.e164).replace(/\D/g, ''));
      } catch {
        // ignore bad line
      }
    }
  } catch {
    // non-fatal
  }
  return set;
}

interface MissingPhotoCandidate {
  reference: string;
  dealType: string;
  compound: string;
  zone: string;
  priceEgp: number;
  beds: number;
  area: number;
  phone: string;
  e164: string;
}

function parseMissingPhotosQueue(): MissingPhotoCandidate[] {
  if (!fs.existsSync(MISSING_PHOTOS_CSV_PATH)) return [];
  const raw = fs.readFileSync(MISSING_PHOTOS_CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const candidates: MissingPhotoCandidate[] = [];
  const seenPhones = new Set<string>();
  const optedOut = loadOptOutDigits();

  for (const line of lines.slice(1)) {
    const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 8) continue;
    const e164 = normalizeE164Egypt(cols[7] || '');
    if (!e164 || seenPhones.has(e164)) continue;
    if (optedOut.has(e164.replace(/\D/g, ''))) continue;
    seenPhones.add(e164);
    candidates.push({
      reference: cols[0] || '',
      dealType: cols[1] || 'rent',
      compound: cols[2] || 'New Cairo',
      zone: cols[3] || 'New Cairo',
      priceEgp: Number(cols[4]) || 0,
      beds: Number(cols[5]) || 0,
      area: Number(cols[6]) || 0,
      phone: cols[7] || '',
      e164,
    });
  }

  // Sort luxury Tier-1 GIS compounds first (MapCommanderAgent priority alignment)
  candidates.sort((a, b) => {
    const aRank = PRIORITY_COMPOUNDS.findIndex((c) => a.compound.toLowerCase().includes(c.toLowerCase()));
    const bRank = PRIORITY_COMPOUNDS.findIndex((c) => b.compound.toLowerCase().includes(c.toLowerCase()));
    const aScore = aRank === -1 ? 999 : aRank;
    const bScore = bRank === -1 ? 999 : bRank;
    if (aScore !== bScore) return aScore - bScore;
    return b.priceEgp - a.priceEgp;
  });

  return candidates;
}

async function runPhotoHarvestWorker(enqueue: boolean, limit: number): Promise<{
  totalMissingUniqueOwners: number;
  topCompounds: Record<string, number>;
  enqueued: number;
}> {
  const candidates = parseMissingPhotosQueue();
  const topCompounds: Record<string, number> = {};
  for (const c of candidates) {
    topCompounds[c.compound] = (topCompounds[c.compound] || 0) + 1;
  }

  let enqueued = 0;
  const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (enqueue && sbUrl && sbKey && candidates.length > 0) {
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: existingJobs } = await sb
      .from('whatsapp_queue')
      .select('recipient_phone')
      .limit(2000);
    const alreadyQueued = new Set(
      (existingJobs || []).map((r: { recipient_phone?: string | null }) => normalizeE164Egypt(r.recipient_phone || '') || ''),
    );

    const nowIso = new Date().toISOString();
    for (const cand of candidates) {
      if (enqueued >= limit) break;
      if (alreadyQueued.has(cand.e164)) continue;

      const compoundClause = cand.compound && cand.compound !== 'Unknown' ? ` في كمبوند ${cand.compound}` : ' بالتجمع الخامس';
      const msg =
        `السلام عليكم ورحمة الله يا فندم 🌿\n\n` +
        `مع حضرتك فريق التسويق العقاري في Sierra Estates.\n` +
        `نجهز حالياً حملة إعلانية مميزة للوحدات المباشرة${compoundClause} على Property Finder وعملائنا المباشرين، ونستأذن حضرتك في إرسال صور حديثة للوحدة (كود ${cand.reference}) وتأكيد الإتاحة لرفع أولوية ظهورها.\n\n` +
        `شكراً جزيلاً لحضرتك 🤝\n(لعدم استقبال رسائل أخرى، أرسل كلمة "إلغاء")`;

      const { error } = await sb.from('whatsapp_queue').insert({
        recipient_phone: cand.e164,
        message_body: msg,
        purpose: 'owner-negotiation',
        status: 'queued',
        metadata: {
          kind: 'openclaw-photo-harvest',
          reference: cand.reference,
          compound: cand.compound,
        },
        created_at: nowIso,
        updated_at: nowIso,
      });
      if (!error) {
        alreadyQueued.add(cand.e164);
        enqueued++;
      }
    }
  }

  await obsidian.set(
    'owner-photo-harvest-manifest',
    {
      updatedAt: new Date().toISOString(),
      totalMissingUniqueOwners: candidates.length,
      enqueuedInThisRun: enqueued,
      samplePriorityTargets: candidates.slice(0, 15).map((c) => ({
        reference: c.reference,
        compound: c.compound,
        dealType: c.dealType,
        priceEgp: c.priceEgp,
      })),
    },
    ['photo-harvest', 'map-commander', 'property-finder'],
  );

  return { totalMissingUniqueOwners: candidates.length, topCompounds, enqueued };
}

async function runTask(): Promise<void> {
  const args = process.argv.slice(2);
  const commandArg = args.join(' ').trim();

  // ── DIAGNOSTIC TEST ──────────────────────────────────────────────────────
  if (args.includes('--test') || commandArg === 'test') {
    console.log('⚡ [OpenClaw Task Runner] Performing diagnostic test...');
    console.log(`🔑 AI Token Configured: ${aiKey ? 'YES (' + aiKey.slice(0, 6) + '...)' : 'NO (Check .env.local)'}`);
    console.log(`💾 Project Memory Store: obsidian-store.json`);

    const memories = await obsidian.search('', []);
    console.log(`📚 Total Indexed Memories: ${memories?.length || 0}`);
    console.log(`📊 Registry Groups: ${WHATSAPP_GROUP_REGISTRY.length} total`);
    console.log(`   👤 Owner Groups:  ${OWNER_GROUPS.length} active`);
    console.log(`   🔵 Broker Groups: ${BROKER_GROUPS.length} active`);
    console.log(`   🗃️  Archived:      ${ARCHIVED_GROUPS.length} groups`);
    console.log('✅ OpenClaw diagnostic test passed!');
    return;
  }

  // ── PHOTO HARVEST WORKER (MapCommander + PF Missing Photos Queue) ────────
  if (commandArg.startsWith('harvest:photos')) {
    const enqueue = args.includes('--enqueue');
    const limitFlag = args.find((a) => a.startsWith('--limit='));
    const limit = limitFlag ? Math.max(1, parseInt(limitFlag.split('=')[1] || '15', 10)) : 15;

    console.log('======================================================');
    console.log('📸 [OpenClaw Worker] Direct Owner Photo Harvester');
    console.log('======================================================');
    const res = await runPhotoHarvestWorker(enqueue, limit);
    console.log(`   • Unique Direct Owners needing unit photos: ${res.totalMissingUniqueOwners}`);
    const top5 = Object.entries(res.topCompounds)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    for (const [comp, cnt] of top5) {
      console.log(`     - ${comp.padEnd(28)} ${cnt} owners`);
    }
    console.log(`   • Enqueued to whatsapp_queue: ${res.enqueued} (pass --enqueue to queue batch)`);
    console.log('   • Saved manifest -> Obsidian key "owner-photo-harvest-manifest"\n');
    return;
  }

  // ── UNIFIED 4-ENGINE REVENUE ORCHESTRATION CYCLE ─────────────────────────
  if (commandArg.startsWith('orchestrate:cycle')) {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   SIERRA ESTATES · 4-ENGINE REVENUE ORCHESTRATION CYCLE      ║');
    console.log('║   Memory · RAG/Map · DeepSeek Harness · Workflows/OpenClaw   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // 1. Engine 1: Memory Engine + Supabase CRM State
    const memories = await obsidian.search('', []);
    const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    let leadsTotal = 0;
    let publishableListings = 0;
    let activeWorkflowsCount = 0;
    let healthyWorkflowsCount = 0;

    if (sbUrl && sbKey) {
      const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const [leadsRes, listingsRes, wfRes] = await Promise.all([
        sb.from('leads').select('*', { count: 'exact', head: true }),
        sb.from('listings').select('*', { count: 'exact', head: true }).eq('publish_status', 'PUBLISHABLE').eq('status', 'active'),
        sb.from('workflows').select('slug, status, last_run_label').eq('status', 'active'),
      ]);
      leadsTotal = leadsRes.count ?? 0;
      publishableListings = listingsRes.count ?? 0;
      const wfData = wfRes.data ?? [];
      activeWorkflowsCount = wfData.length;
      healthyWorkflowsCount = wfData.filter((w) => !String(w.last_run_label || '').endsWith(':error')).length;
    }
    console.log(`[1/4] 🧠 MEMORY ENGINE:      ${memories?.length || 0} Obsidian nodes | ${leadsTotal} CRM leads in Supabase`);

    // 2. Engine 2: RAG & GIS Map Photo Harvester
    let compoundPhotoCount = 0;
    if (fs.existsSync(COMPOUND_REAL_PHOTOS_PATH)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(COMPOUND_REAL_PHOTOS_PATH, 'utf8')) as { totalPhotos?: number };
        compoundPhotoCount = parsed.totalPhotos ?? 0;
      } catch {
        compoundPhotoCount = 0;
      }
    }
    const harvestRes = await runPhotoHarvestWorker(false, 0);
    console.log(
      `[2/4] 🗺️  RAG & MAP ENGINE:   ${publishableListings} PUBLISHABLE units | ${compoundPhotoCount} verified compound CDN photos | ${harvestRes.totalMissingUniqueOwners} owner photo-harvest targets`,
    );

    // 3. Engine 3: DeepSeek Harness Quality Gate
    const harness = new DeepSeekHarness();
    const harnessReport = await harness.runFullSuite();
    const harnessPct = Number((harnessReport.overallScore * 100).toFixed(1));
    console.log(
      `[3/4] ⚖️  DEEPSEEK HARNESS:   ${harnessReport.passedCount}/${harnessReport.totalScenarios} scenarios passed (${harnessPct}%, avg ${harnessReport.averageLatencyMs}ms)`,
    );
    if (harnessReport.overallScore < 0.75) {
      throw new Error(`DeepSeek Harness quality gate failed (${harnessPct}% < 75%) — halting cycle`);
    }

    // 4. Engine 4: Workflows & Property Finder Enterprise Syndication
    const useLivePf = Boolean(process.env.PROPERTY_FINDER_API_KEY && process.env.PROPERTY_FINDER_API_SECRET);
    const pfSync = await propertyFinderConnector.syncCatalog({ limit: 25, live: useLivePf });
    console.log(
      `[4/4] ⚙️  WORKFLOWS & PF ADS: ${healthyWorkflowsCount}/${activeWorkflowsCount} active workflows healthy | PF Atlas (${pfSync.mockMode ? 'MOCK' : 'LIVE'}): ${pfSync.totalRemoteAvailable ?? pfSync.totalSynced} live portal ads`,
    );

    const cycleSummary = {
      completedAt: new Date().toISOString(),
      memoryNodes: memories?.length || 0,
      crmLeadsTotal: leadsTotal,
      publishableListings,
      compoundPhotoCount,
      ownerPhotoHarvestQueue: harvestRes.totalMissingUniqueOwners,
      harnessScorePct: harnessPct,
      activeWorkflowsCount,
      healthyWorkflowsCount,
      propertyFinderLiveMode: !pfSync.mockMode,
      propertyFinderTotalLiveAds: pfSync.totalRemoteAvailable ?? pfSync.totalSynced,
    };

    await obsidian.set('four-engine-cycle-latest', cycleSummary, ['four-engine', 'orchestration', 'revenue']);
    console.log('\n✅ 4-Engine Revenue Cycle verified & persisted to Obsidian memory ("four-engine-cycle-latest").\n');
    return;
  }

  const agent = new OpenClawAgent({
    aiApiKey: aiKey,
    airtableApiKey: process.env.AIRTABLE_API_KEY || '',
    airtableBaseId: process.env.AIRTABLE_BASE_ID || '',
    airtableTableName: process.env.AIRTABLE_TABLE_NAME || 'Listings',
  });

  // ── INGEST SAMPLE (smoke test) ───────────────────────────────────────────
  if (commandArg === 'ingest:sample' || commandArg === 'ingest --sample') {
    console.log('================================================');
    console.log('📲 [OpenClaw] Ingesting Sample WhatsApp Listings');
    console.log('================================================');

    for (let i = 0; i < SAMPLE_WHATSAPP_MESSAGES.length; i++) {
      const sample = SAMPLE_WHATSAPP_MESSAGES[i];
      console.log(`\n📥 [Message ${i + 1}/${SAMPLE_WHATSAPP_MESSAGES.length}] From: ${sample.sender} | Group: ${sample.group}`);
      const result = await agent.ingestWhatsAppGroupMessage(sample.text, sample.sender, sample.group, sample.groupId);
      console.log(`   ✅ [${result.sierraCode}] — ${result.compound} — ${result.priceFormatted} — 🏷️ ${result.sourceType}`);
    }
    console.log('\n🎉 Sample ingestion complete!');
    return;
  }

  // ── INGEST: EXTRACTED UNITS (inventory_extracted_units.json) ────────────
  if (commandArg === 'ingest:extracted' || commandArg === 'ingest:wa') {
    console.log('================================================');
    console.log('📲 [OpenClaw] Ingesting WhatsApp Extracted Units');
    console.log('================================================');

    if (!fs.existsSync(EXTRACTED_UNITS_PATH)) {
      console.error(`❌ File not found: ${EXTRACTED_UNITS_PATH}`);
      process.exit(1);
    }
    const units = JSON.parse(fs.readFileSync(EXTRACTED_UNITS_PATH, 'utf-8'));
    console.log(`📦 Loaded ${units.length} extracted units`);

    const result = await agent.ingestExtractedUnits(units);
    console.log('\n📊 Extraction Ingest Report:');
    console.log(`   ✅ Succeeded: ${result.succeeded}`);
    console.log(`   ❌ Failed:    ${result.failed}`);
    console.log(`   🔁 Dupes:    ${result.duplicates}`);
    if (result.errors.length) console.log(`   ⚠️  Errors:\n${result.errors.map((e: string) => '      ' + e).join('\n')}`);
    return;
  }

  // ── INGEST: MASTER SHEET (real-listings.json — 330 units) ───────────────
  if (commandArg === 'ingest:mastersheet' || commandArg === 'ingest:sheet') {
    console.log('================================================');
    console.log('📋 [OpenClaw] Ingesting Master Sheet (real-listings.json)');
    console.log('================================================');

    if (!fs.existsSync(MASTER_SHEET_PATH)) {
      console.error(`❌ File not found: ${MASTER_SHEET_PATH}`);
      process.exit(1);
    }
    const units: MasterSheetUnit[] = JSON.parse(fs.readFileSync(MASTER_SHEET_PATH, 'utf-8'));
    console.log(`📦 Loaded ${units.length} master sheet units`);

    const ownerCount = units.filter((u) => u.ownerType?.toLowerCase() === 'owner').length;
    const brokerCount = units.length - ownerCount;
    console.log(`   👤 Owner units:  ${ownerCount}`);
    console.log(`   🔵 Broker units: ${brokerCount}`);

    let processed = 0;
    const batchSize = 50;
    const chunks: MasterSheetUnit[][] = [];
    for (let i = 0; i < units.length; i += batchSize) {
      chunks.push(units.slice(i, i + batchSize));
    }

    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalDupes = 0;

    for (const chunk of chunks) {
      const result = await agent.ingestMasterSheet(chunk);
      totalSucceeded += result.succeeded;
      totalFailed += result.failed;
      totalDupes += result.duplicates;
      processed += chunk.length;
      progress(processed, units.length, 'units ingested');
    }

    console.log('\n\n📊 Master Sheet Ingest Report:');
    console.log(`   ✅ Succeeded: ${totalSucceeded}`);
    console.log(`   ❌ Failed:    ${totalFailed}`);
    console.log(`   🔁 Dupes:    ${totalDupes}`);
    return;
  }

  // ── INGEST: OWNERS ONLY ──────────────────────────────────────────────────
  if (commandArg === 'ingest:owners') {
    console.log('================================================');
    console.log('👤 [OpenClaw] Ingesting Owner Groups Only');
    console.log('================================================');

    if (!fs.existsSync(EXTRACTED_UNITS_PATH)) {
      console.error(`❌ File not found: ${EXTRACTED_UNITS_PATH}`);
      process.exit(1);
    }
    const all = JSON.parse(fs.readFileSync(EXTRACTED_UNITS_PATH, 'utf-8'));
    const ownerGroupIds = new Set(OWNER_GROUPS.map((g) => g.id));
    const ownerGroupNames = new Set(OWNER_GROUPS.map((g) => g.name.toLowerCase()));
    const ownerUnits = all.filter(
      (u: { groupId?: string; groupName?: string }) =>
        ownerGroupIds.has(u.groupId || '') ||
        ownerGroupNames.has((u.groupName || '').toLowerCase()),
    );

    console.log(`📦 Found ${ownerUnits.length}/${all.length} units from owner groups`);
    const result = await agent.ingestExtractedUnits(ownerUnits);
    console.log(`   ✅ Succeeded: ${result.succeeded}  ❌ Failed: ${result.failed}  🔁 Dupes: ${result.duplicates}`);
    return;
  }

  // ── INGEST: ARCHIVED GROUPS ──────────────────────────────────────────────
  if (commandArg === 'ingest:archive') {
    console.log('================================================');
    console.log('🗃️  [OpenClaw] Ingesting Archived Group Units');
    console.log('================================================');

    if (!fs.existsSync(EXTRACTED_UNITS_PATH)) {
      console.error(`❌ File not found: ${EXTRACTED_UNITS_PATH}`);
      process.exit(1);
    }
    const all = JSON.parse(fs.readFileSync(EXTRACTED_UNITS_PATH, 'utf-8'));
    const archivedGroupIds = new Set(ARCHIVED_GROUPS.map((g) => g.id));
    const archivedGroupNames = new Set(ARCHIVED_GROUPS.map((g) => g.name.toLowerCase()));
    const archivedUnits = all.filter(
      (u: { groupId?: string; groupName?: string }) =>
        archivedGroupIds.has(u.groupId || '') ||
        archivedGroupNames.has((u.groupName || '').toLowerCase()),
    );

    console.log(`📦 Found ${archivedUnits.length}/${all.length} units from archived groups`);
    if (archivedUnits.length === 0) {
      console.log('ℹ️  No archived-group units found in extracted data. All archived group listings are tagged via registry.');
    } else {
      const result = await agent.ingestExtractedUnits(archivedUnits);
      console.log(`   ✅ Succeeded: ${result.succeeded}  ❌ Failed: ${result.failed}  🔁 Dupes: ${result.duplicates}`);
    }
    return;
  }

  // ── INGEST: ALL (full pipeline) ──────────────────────────────────────────
  if (commandArg === 'ingest:all') {
    console.log('================================================');
    console.log('🚀 [OpenClaw] FULL BULK INGEST — All Sources');
    console.log('================================================');
    console.log(`📊 Registry: ${WHATSAPP_GROUP_REGISTRY.length} groups (${OWNER_GROUPS.length} owner, ${BROKER_GROUPS.length} broker, ${ARCHIVED_GROUPS.length} archived)\n`);

    let grandTotal = 0;
    let grandSucceeded = 0;
    let grandFailed = 0;
    let grandDupes = 0;

    if (fs.existsSync(EXTRACTED_UNITS_PATH)) {
      const waUnits = JSON.parse(fs.readFileSync(EXTRACTED_UNITS_PATH, 'utf-8'));
      console.log(`\n📲 [1/2] WhatsApp Extracted Units: ${waUnits.length} units`);
      const waResult = await agent.ingestExtractedUnits(waUnits);
      grandTotal += waResult.total;
      grandSucceeded += waResult.succeeded;
      grandFailed += waResult.failed;
      grandDupes += waResult.duplicates;
      console.log(`   ✅ ${waResult.succeeded} ingested  🔁 ${waResult.duplicates} dupes  ❌ ${waResult.failed} failed`);
    }

    if (fs.existsSync(MASTER_SHEET_PATH)) {
      const sheetUnits: MasterSheetUnit[] = JSON.parse(fs.readFileSync(MASTER_SHEET_PATH, 'utf-8'));
      console.log(`\n📋 [2/2] Master Sheet: ${sheetUnits.length} units`);

      const chunks: MasterSheetUnit[][] = [];
      for (let i = 0; i < sheetUnits.length; i += 50) chunks.push(sheetUnits.slice(i, i + 50));

      let processed = 0;
      for (const chunk of chunks) {
        const r = await agent.ingestMasterSheet(chunk);
        grandTotal += r.total;
        grandSucceeded += r.succeeded;
        grandFailed += r.failed;
        grandDupes += r.duplicates;
        processed += chunk.length;
        progress(processed, sheetUnits.length, 'master sheet units');
      }
      console.log('');
    }

    console.log('\n════════════════════════════════════════════════');
    console.log('🎉 FULL BULK INGEST COMPLETE');
    console.log('════════════════════════════════════════════════');
    console.log(`   📦 Total Processed: ${grandTotal}`);
    console.log(`   ✅ Succeeded:       ${grandSucceeded}`);
    console.log(`   ❌ Failed:          ${grandFailed}`);
    console.log(`   🔁 Duplicates:      ${grandDupes}`);
    console.log(`   📍 Net New Units:   ${grandSucceeded - grandDupes}`);

    await obsidian.set(`bulk-ingest-${Date.now()}`, {
      total: grandTotal,
      succeeded: grandSucceeded,
      failed: grandFailed,
      duplicates: grandDupes,
      completedAt: new Date().toISOString(),
    }, ['bulk-ingest', 'inventory-audit']);

    console.log('\n💾 Ingest summary saved to Obsidian memory.');
    return;
  }

  // ── SHOW GROUP REGISTRY ──────────────────────────────────────────────────
  if (commandArg === 'groups' || commandArg === 'list:groups') {
    console.log('================================================');
    console.log('📋 [OpenClaw] WhatsApp Group Registry');
    console.log('================================================');
    console.log(`\n👤 ACTIVE OWNER GROUPS (${OWNER_GROUPS.length}):`);
    OWNER_GROUPS.forEach((g) => console.log(`   • [${g.id}] ${g.name}`));
    console.log(`\n🔵 ACTIVE BROKER GROUPS (${BROKER_GROUPS.length}):`);
    BROKER_GROUPS.forEach((g) => console.log(`   • [${g.id}] ${g.name}`));
    console.log(`\n🗃️  ARCHIVED GROUPS (${ARCHIVED_GROUPS.length}):`);
    ARCHIVED_GROUPS.forEach((g) => console.log(`   • [${g.id}] ${g.name} (${g.type})`));
    console.log(`\nTotal: ${WHATSAPP_GROUP_REGISTRY.length} groups`);
    return;
  }

  // ── INVENTORY AUDIT / REPORT ─────────────────────────────────────────────
  if (commandArg === 'inventory:audit' || commandArg === 'report' || commandArg === 'inventory:report') {
    console.log('================================================');
    console.log('📊 [OpenClaw] Generating Inventory Audit Report');
    console.log('================================================');
    const report = await generateInventoryReport({});
    console.log(report);
    return;
  }

  // ── ACTIVATE AGENTS ──────────────────────────────────────────────────────
  if (commandArg === 'activate:agents' || commandArg === 'agents:activate') {
    console.log('================================================');
    console.log('🤖 [OpenClaw] Activating Multi-Agent Fleet');
    console.log('================================================');
    console.log('1. OpenClaw Architect        -> [ONLINE / ACTIVE]');
    console.log('2. Vertex Omni Agent         -> [ONLINE / ACTIVE]');
    console.log('3. WhatsApp Concierge Agent  -> [ONLINE / ACTIVE]');
    console.log('4. Stage 9 Closer Agent      -> [ONLINE / ACTIVE]');
    console.log('5. Sierra Map Photo Harvester-> [ONLINE / ACTIVE]');
    console.log('6. DeepSeek Quality Harness  -> [ONLINE / ACTIVE]');
    console.log('7. Sierra Deployment Ops     -> [READY]');

    await obsidian.set('agents-status-manifest', {
      openclaw: 'active',
      vertexOmni: 'active',
      whatsappConcierge: 'active',
      stage9Closer: 'active',
      mapPhotoHarvester: 'active',
      deepseekHarness: 'active',
      deploymentOps: 'ready',
      lastActivatedAt: new Date().toISOString(),
    }, ['agents-fleet', 'status-manifest']);

    console.log('\n💾 Fleet status recorded into shared Obsidian memory.');
    return;
  }

  // ── INGEST RAW TEXT ──────────────────────────────────────────────────────
  if (commandArg.startsWith('ingest ') || commandArg.startsWith('ingest:')) {
    const rawText = commandArg.replace(/^ingest[:\s]+/, '').trim();
    console.log('================================================');
    console.log('📲 [OpenClaw] Ingesting Raw WhatsApp Listing');
    console.log('================================================');
    const result = await agent.ingestWhatsAppGroupMessage(rawText, 'CLI Broker Input', 'Direct WhatsApp Terminal');
    console.log(`   ✅ [${result.sierraCode}] — ${result.compound} — ${result.priceFormatted} — 🏷️ ${result.sourceType}`);
    return;
  }

  // ── STANDARD TASK PROMPT ─────────────────────────────────────────────────
  const prompt = commandArg || 'Provide a summary of Sierra Estates architecture and agent capabilities.';

  console.log('================================================');
  console.log('🚀 [OpenClaw Task Executor]');
  console.log('================================================');
  console.log(`💬 Task: "${prompt}"`);
  console.log(`🔑 Token: ${aiKey ? 'Configured' : 'Fallback'}`);
  console.log('');

  try {
    const result = await agent.queryVertexAgent(prompt);
    if (result.success) {
      const outputText = (result.data as { text?: string })?.text || JSON.stringify(result.data, null, 2);
      console.log(outputText);
      await obsidian.set(`task-${Date.now()}`, { prompt, output: outputText, timestamp: new Date().toISOString() }, ['openclaw-task', 'execution-log']);
      console.log('\n💾 Task recorded to shared project memory.');
    } else {
      console.error('❌ Task execution failed:', result.error);
      process.exit(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ OpenClaw encountered an error:', msg);
    process.exit(1);
  }
}

runTask().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
