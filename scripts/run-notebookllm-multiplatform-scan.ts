import { NotebookLMHarvester, type RawScrapedListing } from '../packages/agents-core/src/notebookllm-harvester.js';
import { onlineIntelligence, sharedMemory, memoryBrain } from '../packages/memory-engine/src/index.js';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   🤖 SIERRA ESTATES — NOTEBOOKLLM MULTI-PLATFORM OWNER HARVESTER & BRAIN RAG    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

  // 1. Initialize Harvester
  const harvester = new NotebookLMHarvester();

  // Multi-platform listing batch across AqarMap, Dubizzle, Facebook Groups, and WhatsApp
  const inboundListings: RawScrapedListing[] = [
    {
      platform: 'aqarmap',
      sourceName: 'AqarMap Direct Owner Feed - New Cairo',
      rawText: 'من المالك مباشرة شقة 200م في هايد بارك التجمع الخامس 3 نوم تشطيب الترا سوبر لوكس إطلالة على الحديقة المركزية بسعر 12 مليون كاش يمتنع الوسطاء للتواصل 01011223344',
      senderPhone: '01011223344',
      senderName: 'مهندس أحمد',
      postedAt: new Date().toISOString(),
      url: 'https://aqarmap.com.eg/ar/listing/new-cairo-hyde-park-owner',
    },
    {
      platform: 'dubizzle',
      sourceName: 'Dubizzle (OLX Egypt) - New Cairo Apartments',
      rawText: 'شقة للبيع من المالك شخصياً في ميفيدا التجمع الخامس 175م 3 غرف فيو بحيرات بدون عمولة كاش 16.5 مليون ت: 01022334455',
      senderPhone: '01022334455',
      senderName: 'دكتور كريم',
      postedAt: new Date().toISOString(),
      url: 'https://www.dubizzle.com.eg/ad/mivida-owner-deal',
    },
    {
      platform: 'facebook_groups',
      sourceName: 'Facebook Group: ملاك كمبوندات التجمع الخامس والقاهرة الجديدة',
      rawText: 'أنا المالك مباشرة بدون وسيط شقة في ماونتن فيو اي سيتي التجمع 150م بـ 8.5 مليون كاش لسرعة السفر استلام فوري ت: 01133445566',
      senderPhone: '01133445566',
      senderName: 'أ / هاني فوزي',
      postedAt: new Date().toISOString(),
      url: 'https://facebook.com/groups/newcairoowners/posts/10293847',
    },
    {
      platform: 'whatsapp',
      sourceName: 'WhatsApp Group: Owners August 2026',
      rawText: 'شقتي للبيع بالتجمع الخامس النرجس عمارات 210م من المالك عقد خالص 6.8 مليون كاش للتواصل 01244556677',
      senderPhone: '01244556677',
      senderName: 'م / طارق',
      postedAt: new Date().toISOString(),
    },
    {
      platform: 'facebook_groups',
      sourceName: 'Facebook Real Estate Spammer',
      rawText: 'شركة الفرسان للاستثمار العقاري لدينا وحدات بجميع كمبوندات التجمع الخامس عمولة 2.5% تواصل معنا 01099887766',
      senderPhone: '01099887766',
      senderName: 'الفرسان بروكر',
      postedAt: new Date().toISOString(),
    },
  ];

  console.log(`📡 [1/3] Ingesting & Grounding ${inboundListings.length} Multi-Platform Listings via NotebookLM...`);
  const batchReport = await harvester.processBatch(inboundListings);

  console.log(`\n📋 HARVESTER VERIFICATION REPORT:`);
  console.log(`   - Total Scraped Processed : ${batchReport.totalProcessed}`);
  console.log(`   - Authentic Direct Owners : ${batchReport.ownerUnitsFound.length}`);
  console.log(`   - Broker Ads Filtered Out : ${batchReport.brokerUnitsFiltered}`);
  console.log(`   - Golden Deals Identified : ${batchReport.goldenDeals.length}\n`);

  for (const unit of batchReport.ownerUnitsFound) {
    console.log(`   🌟 [${unit.platform.toUpperCase()}] ${unit.sierraCode} in ${unit.compound}`);
    console.log(`      • Specs      : ${unit.areaSqm} sqm | ${unit.bedrooms} Beds | ${unit.finishing}`);
    console.log(`      • Price      : ${unit.priceFormatted} (${unit.pricePerSqmEgp?.toLocaleString()} EGP/sqm)`);
    console.log(`      • AVM Status : ${unit.arbitrageStatus} (${unit.arbitrageDeltaPct}% vs compound median)`);
    console.log(`      • Owner Conf : ${unit.ownerConfidenceScore}% (${unit.ownerVerificationReason})`);
    console.log(`      • Phone      : ${unit.contactPhone} (${unit.contactName})\n`);
  }

  // 2. Autonomous Online Market & Lead Intelligence
  console.log('🌐 [2/3] Running Autonomous Online Intelligence & Lead Generator...');
  const marketReport = await onlineIntelligence.refreshMarketIntelligence();
  const webDirectives = await onlineIntelligence.getWebsiteEnhancements();
  const leadVectors = await onlineIntelligence.getLeadGenerationVectors();

  console.log(`   ✅ Market Intelligence Updated: ${marketReport.topic}`);
  console.log(`   ✅ Website Enhancement Recommendations Generated: ${webDirectives.length} active directives`);
  console.log(`   ✅ High-Converting Lead Generation Vectors Created: ${leadVectors.length} target campaigns\n`);

  // 3. Verify Memory Brain Grounding & RAG Synthesis
  console.log('🧠 [3/3] Testing Central Memory Brain RAG Synthesis...');
  memoryBrain.scanVault(true); // force scan newly generated notes
  const ragDirectives = memoryBrain.queryBrainRAG(
    'What are the best direct owner golden deals in Hyde Park and Mivida?',
    { compound: 'Hyde Park New Cairo' }
  );

  console.log(`   ✅ Brain Directive Generated for Fleet Agents:`);
  console.log(`   - Vault Notes Grounded : ${ragDirectives.vaultNotes.length}`);
  console.log(`   - Top Vault Source     : ${ragDirectives.vaultNotes[0]?.title || 'None'}`);
  console.log(`   - Directive Preview    :\n`);
  console.log(ragDirectives.formattedDirective.split('\n').slice(0, 15).join('\n'));

  console.log('\n══════════════════════════════════════════════════════════════════════════════════');
  console.log('🎉 NOTEBOOKLLM HARVESTER & BRAIN MEMORY RAG ENGINE ARE FULLY OPERATIONAL!');
  console.log('══════════════════════════════════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Multi-platform scan failed:', err);
  process.exit(1);
});
