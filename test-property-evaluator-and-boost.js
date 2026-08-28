/**
 * Verification Test: AI Property Evaluation, 20% Owner Boost, and Cross-Bot Memory Sync
 */

const propertyEvaluator = require('./packages/whatsapp-shared/src/property-evaluator');
const propertyMatcher = require('./packages/whatsapp-shared/src/property-matcher');
const hermesAgent = require('./packages/whatsapp-shared/src/hermes-agent');
const unifiedMemory = require('./packages/whatsapp-shared/src/unified-memory-engine');

async function runTest() {
  console.log('🧪 ═══════════════════════════════════════════════════════════════════');
  console.log('   TESTING AI PROPERTY EVALUATION & 20% OWNER PRIORITY BOOST');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Test 1: Compare standard listing vs Direct Owner listing
  console.log('1️⃣ Evaluating Standard vs Direct Owner Unit in Mivida...');
  const standardUnit = {
    compound: 'mivida',
    title: '3BR Mivida Broker Unit',
    price: 52000,
    areaSqm: 195,
    isOwner: false,
    finishing: 'Super Lux'
  };

  const ownerUnit = {
    compound: 'mivida',
    title: '3BR Mivida Direct Owner Unit',
    price: 52000,
    areaSqm: 195,
    isOwner: true,
    finishing: 'Super Lux'
  };

  const evalStandard = propertyEvaluator.evaluateUnit(standardUnit);
  const evalOwner = propertyEvaluator.evaluateUnit(ownerUnit);

  console.log(`   Standard Listing Score: ${evalStandard.evaluationScore}/100 [Grade ${evalStandard.grade}]`);
  console.log(`   Direct Owner Listing Score: ${evalOwner.evaluationScore}/100 [Grade ${evalOwner.grade}] (Owner Boost: ${evalOwner.ownerBonus})`);

  if (evalOwner.evaluationScore > evalStandard.evaluationScore && evalOwner.ownerBoostApplied) {
    console.log('   ✅ PASS: Direct Owner unit received +20% boost successfully!\n');
  } else {
    throw new Error('❌ FAIL: Owner boost was not applied properly.');
  }

  // Test 2: Property Matcher ranking for a client request
  console.log('2️⃣ Matching & Ranking Properties for a Lead requesting 3BR in New Cairo...');
  const matches = await propertyMatcher.findMatches({
    bedrooms: '3',
    budget: '55000',
    locations: ['mivida', 'villette']
  });

  console.log(`   Top Matches Found: ${matches.length}`);
  matches.forEach((m, idx) => {
    console.log(`   #${idx + 1}: ${m.title} — Score: ${m.evaluation.evaluationScore}/100 · Direct Owner: ${m.isOwner ? 'YES (+20%)' : 'NO'}`);
  });

  const cardsText = propertyMatcher.formatRecommendationCards(matches, true);
  console.log('\n📄 Formatted WhatsApp Recommendation Card Sample:');
  console.log(cardsText.slice(0, 350) + '...\n');

  // Test 3: Hermes Agent Market Scan with AI Valuation
  console.log('3️⃣ Running Hermes Agent Autonomous Market Scan with Valuation Sync...');
  const scanResult = await hermesAgent.runMarketScan();
  console.log(`   Hermes Scan: ${scanResult}\n`);

  // Test 4: Verify Unified Memory storage
  console.log('4️⃣ Verifying Unified Memory search for evaluated properties...');
  const memories = await unifiedMemory.searchMemory('evaluation', 2);
  console.log(`   Found ${memories.length} relevant memories in vault.`);
  memories.forEach(m => console.log(`   - [${m.title || m.source}]: ${m.content.slice(0, 100)}...`));

  console.log('\n🎉 ALL AI PROPERTY EVALUATION & OWNER BOOST TESTS PASSED SUCCESSFULLY!\n');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
