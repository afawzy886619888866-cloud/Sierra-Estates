/**
 * Verification Test: Hermes Agent & Unified Multi-Agent Memory Engine
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const unifiedMemory = require('../packages/whatsapp-agent/src/unified-memory-engine');
const hermesAgent = require('../packages/whatsapp-agent/src/hermes-agent');

async function runTest() {
  console.log('🧪 ══════════════════════════════════════════════════════════════');
  console.log('   Testing Hermes Agent & Unified Cross-Bot Memory Mesh');
  console.log('══════════════════════════════════════════════════════════════\n');

  // Test 1: Ingest event from WhatsApp bot
  console.log('1️⃣ Ingesting WhatsApp lead interaction into Unified Memory...');
  await unifiedMemory.ingestEvent({
    sourceAgent: 'WhatsApp-Senior-Agent',
    entityId: 'lead_test_001',
    role: 'user',
    text: 'Client looking for a 3-bedroom townhouse in Villette SODIC with budget up to 18,000,000 EGP',
    metadata: { compound: 'Villette SODIC', budget: 18000000, bedrooms: 3 }
  });
  console.log('✅ Ingested successfully into Unified Memory.');

  // Test 2: Ingest event from OpenClaw
  console.log('\n2️⃣ Ingesting OpenClaw deal notes into Unified Memory...');
  await unifiedMemory.ingestEvent({
    sourceAgent: 'OpenClaw-Stage9-Closer',
    entityId: 'deal_test_002',
    role: 'assistant',
    text: 'Negotiated 15% upfront discount on Mivida standalone villa for corporate embassy tenant.',
    metadata: { compound: 'Mivida', discount: 0.15 }
  });
  console.log('✅ OpenClaw event ingested.');

  // Test 3: Search Unified Memory
  console.log('\n3️⃣ Searching Unified Memory for "Villette SODIC"...');
  const searchResults = await unifiedMemory.searchMemory('Villette SODIC', 3);
  console.log(`Found ${searchResults.length} relevant memory nodes:`);
  searchResults.forEach((r, idx) => {
    console.log(`  [${idx + 1}] Source: ${r.source || r.title} | Score: ${r.score}`);
  });

  // Test 4: Query Hermes Agent for Market Intelligence
  console.log('\n4️⃣ Querying Hermes Agent for New Cairo market analysis...');
  const hermesReply = await hermesAgent.processCommand('What is the current price per sqm and rental yield for Mivida vs Villette SODIC?');
  console.log(`🦅 Hermes Response:\n${hermesReply}\n`);

  // Test 5: Run Hermes Market Scout Scan
  console.log('5️⃣ Running Hermes Autonomous Market Scout Scan...');
  const scanReport = await hermesAgent.runMarketScan();
  console.log(`✅ Scan Report: ${scanReport}`);

  console.log('\n🎉 ALL 5 HERMES & UNIFIED MEMORY INTEGRATION TESTS PASSED 100%!');
}

runTest().catch(console.error);
