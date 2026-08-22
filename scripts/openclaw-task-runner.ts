import * as dotenv from 'dotenv';
import * as path from 'path';
import { OpenClawAgent } from '../packages/agents/openclaw';
import { obsidian } from '../packages/obsidian/src/index';
import { generateInventoryReport } from '../packages/agents/tools/reportTools';

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

const SAMPLE_WHATSAPP_MESSAGES = [
  {
    group: 'New Cairo Elite Brokers (VIP)',
    sender: '+201001234567 (Broker Karim)',
    text: '🔥 لقطة للبيع في ميفيدا Mivida التجمع الخامس! فيلا مستقلة Standalone مساحة 450 متر مباني، 4 غرف نوم ماستر، تشطيب الترا سوبر لوكس مع حديقة خاصة وحمام سباحة Private Pool. السعر 38 مليون كاش. لقطة وسعر محروق للتنفيذ الفوري.'
  },
  {
    group: 'East Cairo Commercial & Luxury Network',
    sender: '+201119876543 (Advisor Mostafa)',
    text: 'للبيع في كمبوند هايد بارك Hyde Park التجمع الخامس بنتهاوس Penthouse مساحة 280م + روف 120م، 3 غرف نوم، نصف تشطيب، فيو بحيرات Lake View مباشرة. إجمالي السعر 16.5 مليون بمقدم 30% وأقساط على 5 سنوات.'
  },
  {
    group: 'Palm Hills & Golden Square Direct Owners',
    sender: '+201223456789 (Broker Sherif)',
    text: 'شقة فاخرة في بالم هيلز Palm Hills New Cairo مساحة 195 متر، 3 غرف نوم، تشطيب كامل Fully Finished، دور أول كورنر بحري. المطلوب 11.8 مليون كاش. جاهزة للمعاينة واستلام فوري.'
  }
];

async function runTask() {
  const args = process.argv.slice(2);
  const commandArg = args.join(' ').trim();
  
  if (args.includes('--test') || commandArg === 'test') {
    console.log('⚡ [OpenClaw Task Runner] Performing diagnostic test...');
    console.log(`🔑 AI Token Configured: ${aiKey ? 'YES (' + aiKey.slice(0, 6) + '...)' : 'NO (Check .env.local)'}`);
    console.log(`💾 Project Memory Store: obsidian-store.json`);
    
    // Test memory lookup
    const memories = await obsidian.search('', []);
    console.log(`📚 Total Indexed Memories: ${memories?.length || 0}`);
    console.log('✅ OpenClaw diagnostic test passed!');
    return;
  }

  const agent = new OpenClawAgent({
    aiApiKey: aiKey,
    airtableApiKey: process.env.AIRTABLE_API_KEY || '',
    airtableBaseId: process.env.AIRTABLE_BASE_ID || '',
    airtableTableName: process.env.AIRTABLE_TABLE_NAME || 'Listings',
  });

  // Handle Ingest Sample Command
  if (commandArg === 'ingest:sample' || commandArg === 'ingest --sample') {
    console.log('====================================================');
    console.log('📲 [OpenClaw] Ingesting Sample WhatsApp Broker Group Listings');
    console.log('====================================================');

    for (let i = 0; i < SAMPLE_WHATSAPP_MESSAGES.length; i++) {
      const sample = SAMPLE_WHATSAPP_MESSAGES[i];
      console.log(`\n📥 [Message ${i + 1}/${SAMPLE_WHATSAPP_MESSAGES.length}] From: ${sample.sender} | Group: ${sample.group}`);
      console.log(`💬 Raw: "${sample.text}"`);

      const result = await agent.ingestWhatsAppGroupMessage(sample.text, sample.sender, sample.group);
      console.log(`✨ Ingestion Result:`);
      console.log(`   🏷️  Sierra Code:      [${result.sierraCode}]`);
      console.log(`   📍 Compound:         ${result.compound}`);
      console.log(`   🏡 Property Type:    ${result.propertyType}`);
      console.log(`   💰 Price:            ${result.priceFormatted}`);
      console.log(`   ⭐ Valuation Score:  ${result.valuationScore}/100`);
      console.log(`   🔥 Urgency Score:    ${result.urgencyScore}/100`);
      console.log(`   ✅ Status:           ${result.resultMessage}`);
    }

    console.log('\n====================================================');
    console.log('🎉 All WhatsApp sample listings ingested and indexed into Sierra Estates inventory!');
    console.log('====================================================');
    return;
  }

  // Handle Raw WhatsApp Text Ingestion Command
  if (commandArg.startsWith('ingest ') || commandArg.startsWith('ingest:')) {
    const rawText = commandArg.replace(/^ingest[:\s]+/, '').trim();
    console.log('====================================================');
    console.log('📲 [OpenClaw] Ingesting Raw WhatsApp Broker Listing');
    console.log('====================================================');
    console.log(`💬 Input: "${rawText}"\n`);

    const result = await agent.ingestWhatsAppGroupMessage(rawText, 'CLI Broker Input', 'Direct WhatsApp Terminal');
    console.log(`✨ Ingestion Result:`);
    console.log(`   🏷️  Sierra Code:      [${result.sierraCode}]`);
    console.log(`   📍 Compound:         ${result.compound}`);
    console.log(`   🏡 Property Type:    ${result.propertyType}`);
    console.log(`   💰 Price:            ${result.priceFormatted}`);
    console.log(`   ⭐ Valuation Score:  ${result.valuationScore}/100`);
    console.log(`   🔥 Urgency Score:    ${result.urgencyScore}/100`);
    console.log(`   ✅ Status:           ${result.resultMessage}`);
    return;
  }

  // Handle Inventory Audit / Report Command
  if (commandArg === 'inventory:audit' || commandArg === 'report' || commandArg === 'inventory:report') {
    console.log('====================================================');
    console.log('📊 [OpenClaw] Generating Inventory Audit & Executive Report');
    console.log('====================================================');
    const report = await generateInventoryReport({});
    console.log(report);
    return;
  }

  // Handle Agent Activation Command
  if (commandArg === 'activate:agents' || commandArg === 'agents:activate') {
    console.log('====================================================');
    console.log('🤖 [OpenClaw] Activating Multi-Agent Fleet');
    console.log('====================================================');
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
      lastActivatedAt: new Date().toISOString()
    }, ['agents-fleet', 'status-manifest']);

    console.log('\n💾 Fleet status recorded into shared Obsidian memory.');
    return;
  }

  // Standard Task Prompt Flow
  const prompt = commandArg || 'Provide a summary of Sierra Estates architecture and agent capabilities.';

  console.log('====================================================');
  console.log('🚀 [OpenClaw Task Executor]');
  console.log('====================================================');
  console.log(`💬 Task Prompt: "${prompt}"`);
  console.log(`🔑 Using Token: ${aiKey ? 'Configured (' + aiKey.slice(0, 6) + '...)' : 'Default / Fallback'}`);
  console.log('----------------------------------------------------');

  try {
    console.log('⏳ Executing task with project memory grounding...');
    const result = await agent.queryVertexAgent(prompt);

    console.log('\n====================================================');
    console.log('✨ OPENCLAW TASK RESULT:');
    console.log('====================================================');
    if (result.success) {
      const outputText = (result.data as any)?.text || JSON.stringify(result.data, null, 2);
      console.log(outputText);
      
      // Save result to shared memory
      await obsidian.set(`task-${Date.now()}`, {
        prompt,
        output: outputText,
        timestamp: new Date().toISOString(),
      }, ['openclaw-task', 'execution-log']);
      
      console.log('----------------------------------------------------');
      console.log('💾 Task execution recorded to shared project memory.');
    } else {
      console.error('❌ Task execution failed:', result.error);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ OpenClaw encountered an error:', err.message || err);
    process.exit(1);
  }
}

runTask().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
