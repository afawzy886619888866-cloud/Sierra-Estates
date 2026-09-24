import { NextRequest, NextResponse } from 'next/server';
import { NotebookLMHarvester, type RawScrapedListing } from '@sierra-estates/agents-core';
import { onlineIntelligence, sharedMemory } from '@sierra-estates/memory-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // 3 min timeout

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customListings: RawScrapedListing[] = body.listings || [];

    const harvester = new NotebookLMHarvester();

    const sampleMultiPlatformFeed: RawScrapedListing[] = customListings.length > 0 ? customListings : [
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
    ];

    const report = await harvester.processBatch(sampleMultiPlatformFeed);

    // Refresh online market intelligence & website directives
    const marketReport = await onlineIntelligence.refreshMarketIntelligence();
    const websiteEnhancements = await onlineIntelligence.getWebsiteEnhancements();
    const leadVectors = await onlineIntelligence.getLeadGenerationVectors();

    return NextResponse.json({
      success: true,
      message: 'NotebookLM Multi-Platform Harvester completed successfully',
      report: {
        totalProcessed: report.totalProcessed,
        ownerUnitsFoundCount: report.ownerUnitsFound.length,
        goldenDealsCount: report.goldenDeals.length,
        brokerUnitsFiltered: report.brokerUnitsFiltered,
        ownerUnits: report.ownerUnitsFound,
        goldenDeals: report.goldenDeals,
      },
      marketIntelligence: {
        topic: marketReport.topic,
        yieldComparison: marketReport.yieldComparison,
        insightsCount: marketReport.keyInsights.length,
      },
      websiteEnhancementsCount: websiteEnhancements.length,
      leadVectorsCount: leadVectors.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Error executing NotebookLM multiplatform scan',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const ownerMemories = await sharedMemory.search('', ['owner_unit']);
    const intelligenceMemories = await sharedMemory.search('', ['intelligence']);

    return NextResponse.json({
      status: 'active',
      engine: 'NotebookLM Multi-Platform Real Estate Harvester',
      supportedPlatforms: ['aqarmap', 'dubizzle', 'facebook_groups', 'whatsapp', 'direct_portal'],
      targetGeography: 'New Cairo (Golden Square, 5th Settlement, Mostakbal City, Beit El Watan)',
      totalHarvestedOwnerUnitsInMemory: ownerMemories.length,
      totalIntelligenceDirectivesInMemory: intelligenceMemories.length,
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
