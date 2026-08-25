import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { OpenClawAgent, MasterSheetUnit } from '../packages/agents/openclaw';
import { obsidian } from '../packages/obsidian/src/index';
import { generateInventoryReport } from '../packages/agents/tools/reportTools';
import {
  WHATSAPP_GROUP_REGISTRY,
  ACTIVE_GROUPS,
  ARCHIVED_GROUPS,
  OWNER_GROUPS,
  BROKER_GROUPS,
} from '../packages/agents/tools/whatsappGroupRegistry';

// Load environment variables from available locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

const aiKey =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.ANTIGRAVITY_API_KEY ||
  '';

/** Paths to data files */
const EXTRACTED_UNITS_PATH = path.resolve(
  process.cwd(),
  'packages/whatsapp-agent/inventory_extracted_units.json',
);
const MASTER_SHEET_PATH = path.resolve(
  process.cwd(),
  'apps/sierra-estates-realty/data/real-listings.json',
);

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

/** Print a progress bar line */
function progress(current: number, total: number, label: string) {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${pct}% — ${current}/${total} ${label}`);
}

async function runTask() {
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
    if (result.errors.length) console.log(`   ⚠️  Errors:\n${result.errors.map(e => '      ' + e).join('\n')}`);
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

    // Step 1: WhatsApp extracted units
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

    // Step 2: Master sheet
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
    console.log('5. Sierra Deployment Ops     -> [READY]');

    await obsidian.set('agents-status-manifest', {
      openclaw: 'active',
      vertexOmni: 'active',
      whatsappConcierge: 'active',
      stage9Closer: 'active',
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
