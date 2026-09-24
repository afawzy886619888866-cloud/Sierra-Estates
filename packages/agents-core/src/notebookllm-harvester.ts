/**
 * NotebookLM Multi-Platform Real Estate Harvester
 * 
 * Ingests, verifies, and values direct-owner listings in New Cairo across:
 *  - WhatsApp Groups (e.g. Owners August 2026, New Cairo Owners)
 *  - AqarMap (عقارماب) direct-owner feeds
 *  - Dubizzle / OLX (دوبيزل مصر) owner listings
 *  - Facebook Real Estate Groups (جروبات ملاك القاهرة الجديدة والتجمع الخامس)
 * 
 * Powered by Google NotebookLM Grounding Engine + Sierra Shared Memory RAG
 */

import { NotebookLMEngine } from './notebookllm-engine';
import { sharedMemory } from '@sierra-estates/memory-engine';

export type ListingPlatform = 'whatsapp' | 'aqarmap' | 'dubizzle' | 'facebook_groups' | 'direct_portal';

export interface RawScrapedListing {
  id?: string;
  platform: ListingPlatform;
  sourceName: string; // Group name, URL, or feed title
  rawText: string;
  senderPhone?: string;
  senderName?: string;
  postedAt?: string;
  url?: string;
}

export interface GroundedOwnerUnit {
  id: string;
  sierraCode: string;
  platform: ListingPlatform;
  sourceName: string;
  sourceUrl?: string;
  isDirectOwner: boolean;
  ownerConfidenceScore: number; // 0 - 100
  ownerVerificationReason: string;
  
  // Real Estate Specs
  compound: string;
  locationArea: string; // Golden Square, 5th Settlement, Mostakbal City, Beit El Watan, etc.
  propertyType: string; // Apartment, Duplex, Penthouse, Townhouse, Standalone Villa
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  finishing: string;
  
  // Pricing & Arbitrage
  priceEgp: number;
  priceFormatted: string;
  pricePerSqmEgp: number | null;
  compoundMedianPricePerSqm?: number;
  arbitrageStatus: 'UNDERPRICED_GOLDEN_DEAL' | 'FAIR_MARKET_VALUE' | 'OVERPRICED' | 'UNVERIFIED';
  arbitrageDeltaPct?: number; // e.g. -14% (meaning 14% underpriced)
  
  // Contacts & Outreach
  contactPhone: string;
  contactName: string;
  listedAt: string;
  status: 'Available' | 'Under_Verification' | 'Missing_Details';
  missingFields: string[];
  suggestedOwnerOutreachArabic?: string;
}

export class NotebookLMHarvester {
  private notebookEngine: NotebookLMEngine;

  // New Cairo Master Compound Lexicon & Price/sqm Benchmark (2026 Q1/Q2 Market Standards)
  private static readonly COMPOUND_BENCHMARKS: Record<string, { medianPricePerSqm: number; area: string; aliases: string[] }> = {
    'Mivida': {
      medianPricePerSqm: 110000,
      area: 'Golden Square, 5th Settlement',
      aliases: ['ميفيدا', 'مفيدا', 'mivida', 'mivida emaar', 'اعمار ميفيدا'],
    },
    'Hyde Park': {
      medianPricePerSqm: 72000,
      area: 'Main 90th Street, New Cairo',
      aliases: ['هايد بارك', 'هيد بارك', 'hyde park', 'hyde park new cairo'],
    },
    'Mountain View iCity': {
      medianPricePerSqm: 75000,
      area: 'North 90th Street, New Cairo',
      aliases: ['ماونتن فيو اي سيتي', 'ماونتن فيو اى سيتى', 'ماونتن فيو icity', 'mountain view icity', 'mv icity'],
    },
    'Mountain View Hyde Park': {
      medianPricePerSqm: 82000,
      area: 'Golden Square, New Cairo',
      aliases: ['ماونتن فيو هايد بارك', 'mv hyde park', 'mountain view hp'],
    },
    'Palm Hills New Cairo': {
      medianPricePerSqm: 98000,
      area: 'Middle Ring Road / 5th Settlement',
      aliases: ['بالم هيلز نيو كايرو', 'بالم هيلز التجمع', 'palm hills new cairo', 'palm hills قطامية'],
    },
    'Villette SODIC': {
      medianPricePerSqm: 105000,
      area: 'Golden Square, 5th Settlement',
      aliases: ['فيليت', 'فيليت سوديك', 'villette', 'villette sodic'],
    },
    'Eastown SODIC': {
      medianPricePerSqm: 92000,
      area: 'South 90th Street (Next to AUC)',
      aliases: ['ايست تاون', 'ايستاون', 'eastown', 'eastown sodic'],
    },
    'Madinaty': {
      medianPricePerSqm: 52000,
      area: 'New Cairo / Suez Road',
      aliases: ['مدينتي', 'مدينتى', 'madinaty', 'madinty'],
    },
    'Rehab City': {
      medianPricePerSqm: 58000,
      area: 'New Cairo / Suez Road',
      aliases: ['الرحاب', 'مدينة الرحاب', 'rehab', 'al rehab', 'rehab city'],
    },
    'Swan Lake Residences': {
      medianPricePerSqm: 135000,
      area: 'First Settlement / New Cairo',
      aliases: ['سوان ليك', 'سوان ليك حسن علام', 'swan lake', 'swan lake residences'],
    },
    'Azzar': {
      medianPricePerSqm: 88000,
      area: 'Golden Square, New Cairo',
      aliases: ['ازار', 'آزار', 'azzar', 'azzar golden square'],
    },
    'Fifth Square Al Marasem': {
      medianPricePerSqm: 78000,
      area: 'North 90th Street',
      aliases: ['فيفث سكوير', 'المراسم', 'fifth square', 'al marasem'],
    },
    'Beit El Watan': {
      medianPricePerSqm: 38000,
      area: 'Beit El Watan, New Cairo',
      aliases: ['بيت الوطن', 'بيت الوطن التجمع', 'beit el watan', 'bayt al watan'],
    },
    'South Academy': {
      medianPricePerSqm: 42000,
      area: 'South Academy, 5th Settlement',
      aliases: ['جنوب الاكاديمية', 'جنوب الأكاديمية', 'south academy'],
    },
    'Choueifat': {
      medianPricePerSqm: 48000,
      area: 'Choueifat District, 5th Settlement',
      aliases: ['الشويفات', 'شويفات التجمع', 'choueifat'],
    },
    'Narges & Narges Extension': {
      medianPricePerSqm: 41000,
      area: 'Narges, 5th Settlement',
      aliases: ['النرجس', 'امتداد النرجس', 'نرجس عمارات', 'narges'],
    },
    'Banafseg': {
      medianPricePerSqm: 39000,
      area: 'Banafseg Villas & Buildings',
      aliases: ['البنفسج', 'بنفسج عمارات', 'بنفسج فيلات', 'banafseg'],
    },
  };

  constructor(apiKey?: string) {
    this.notebookEngine = new NotebookLMEngine(apiKey);
  }

  /**
   * Identifies compound and benchmarks from raw Arabic/English text
   */
  public matchCompound(text: string): { name: string; medianPricePerSqm: number; area: string } | null {
    const lower = text.toLowerCase();
    for (const [name, info] of Object.entries(NotebookLMHarvester.COMPOUND_BENCHMARKS)) {
      if (lower.includes(name.toLowerCase())) {
        return { name, medianPricePerSqm: info.medianPricePerSqm, area: info.area };
      }
      for (const alias of info.aliases) {
        if (lower.includes(alias.toLowerCase())) {
          return { name, medianPricePerSqm: info.medianPricePerSqm, area: info.area };
        }
      }
    }
    // Generic New Cairo check if no specific compound named
    if (/(التجمع الخامس|القاهرة الجديدة|التجمع|new cairo|5th settlement)/i.test(text)) {
      return { name: 'New Cairo (General)', medianPricePerSqm: 45000, area: 'Fifth Settlement, New Cairo' };
    }
    return null;
  }

  /**
   * Deterministic Direct Owner Linguistic Classifier
   * Distinguishes authentic direct owners from brokers and marketing companies
   */
  public verifyDirectOwner(text: string): { isDirectOwner: boolean; confidenceScore: number; reason: string } {
    let score = 50; // Neutral baseline
    const reasons: string[] = [];

    // Strong Owner Indicators (+20 to +30 each)
    const ownerPatterns = [
      { regex: /(أنا المالك|انا المالك|مني أنا شخصياً|من المالك شخصياً)/i, weight: 35, desc: 'Direct owner statement ("أنا المالك")' },
      { regex: /(من المالك مباشرة|من المالك مباشره|مباشر من المالك)/i, weight: 30, desc: 'Direct from owner without middleman' },
      { regex: /(بدون وسيط|يمتنع الوسطاء|يمتنع المكاتب|لا للوسطاء)/i, weight: 30, desc: 'Explicitly excludes brokers' },
      { regex: /(بدون عمولة|بدون عموله|صفر عمولة)/i, weight: 25, desc: 'Zero commission claim' },
      { regex: /(شقتي للبيع|فيلتي للبيع|شقتنا للبيع|وحدتي للبيع)/i, weight: 25, desc: 'First-person ownership claim' },
      { regex: /(مالك أول|مالك أصيل|عقد خالص من الشركة)/i, weight: 20, desc: 'Original contract holder' },
    ];

    // Broker Indicators (-25 to -35 each)
    const brokerPatterns = [
      { regex: /(لدينا وحدات|يوجد لدينا أكثر من وحدة|لدينا مكاتب)/i, weight: -35, desc: 'Broker inventory terminology ("لدينا وحدات")' },
      { regex: /(شركة تسويق|شركة عقارية|بروكير|ريل استيت)/i, weight: -35, desc: 'Agency or brokerage identity' },
      { regex: /(عمولة 2\.5%|عمولة الشركة|عموله)/i, weight: -30, desc: 'Demands commission' },
      { regex: /(للتواصل مع إدارة المبيعات|فريق المبيعات)/i, weight: -30, desc: 'Corporate sales team' },
      { regex: /(متاح وحدات أخرى|كلمني واختار شقتك)/i, weight: -20, desc: 'Multi-unit broker pitch' },
    ];

    for (const pat of ownerPatterns) {
      if (pat.regex.test(text)) {
        score += pat.weight;
        reasons.push(`+ ${pat.desc}`);
      }
    }

    for (const pat of brokerPatterns) {
      if (pat.regex.test(text)) {
        score += pat.weight;
        reasons.push(`- ${pat.desc}`);
      }
    }

    const clampedScore = Math.max(0, Math.min(100, score));
    const isDirectOwner = clampedScore >= 60;

    return {
      isDirectOwner,
      confidenceScore: clampedScore,
      reason: reasons.length > 0 ? reasons.join('; ') : 'Neutral linguistic pattern',
    };
  }

  /**
   * Extracts property specs: Area, Bedrooms, Price, Phone
   */
  public extractSpecs(text: string): {
    areaSqm: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    priceEgp: number;
    propertyType: string;
    finishing: string;
    phone: string;
  } {
    // 1. Phone extraction (01[0125]xxxxxxxx or with +20)
    let phone = '';
    const phoneMatch = text.match(/(?:\+?20|0)?(1[0125]\d{8})/);
    if (phoneMatch) {
      phone = `0${phoneMatch[1]}`;
    }

    // 2. Price extraction
    let priceEgp = 0;
    const priceMatch = text.match(/(?:سعر|بمبلغ|كاش|مطلوب|اجمالي|إجمالي)\s*[:=]?\s*([0-9,.\s]{5,14})(?:\s*(?:جنيه|الف|ألف|مليون|ج\.م|egp|m))?/i)
      || text.match(/([0-9]{1,3}(?:[,.][0-9]{3})+)\s*(?:جنيه|ج\.م|egp)/i)
      || text.match(/([0-9]{1,2}(?:\.[0-9]{1,3})?)\s*(?:مليون|million)/i);

    if (priceMatch) {
      const rawVal = priceMatch[1].replace(/[, ]/g, '');
      let num = parseFloat(rawVal);
      if (text.includes('مليون') || text.includes('million') || num < 200) {
        if (num < 200) num = num * 1000000;
      }
      priceEgp = Math.round(num);
    }

    // 3. Area sqm
    let areaSqm: number | null = null;
    const areaMatch = text.match(/(?:مساحة|مساحه|مساحتها)\s*[:=]?\s*(\d{2,4})\s*(?:متر|م²|م2|م|sqm)?/i)
      || text.match(/(\d{2,4})\s*(?:متر|م²|م2|م|sqm)(?:\s|$|[^\u0600-\u06FF])/i)
      || text.match(/(\d{2,4})\s*م(?:\s|$|[^\u0600-\u06FF])/);
    if (areaMatch) {
      areaSqm = parseInt(areaMatch[1], 10);
    }

    // 4. Bedrooms
    let bedrooms: number | null = null;
    const bedMatch = text.match(/(\d)\s*(?:غرف|نوم|غرفه|غرفة|rooms|bedrooms)/i)
      || text.match(/(?:غرفتين|غرفتان)/i);
    if (bedMatch) {
      bedrooms = bedMatch[0].includes('غرفتين') ? 2 : parseInt(bedMatch[1] || '3', 10);
    }

    // 5. Property Type
    let propertyType = 'Apartment';
    if (/(فيلا منفصلة|فيلا ستاندالون|standalone|فيلا مستقلة)/i.test(text)) propertyType = 'Standalone Villa';
    else if (/(تاون هاوس|townhouse|تاونهاوس)/i.test(text)) propertyType = 'Townhouse';
    else if (/(توين هاوس|twin house|توينهاوس)/i.test(text)) propertyType = 'Twin House';
    else if (/(اي فيلا|آي فيلا|ivilla)/i.test(text)) propertyType = 'iVilla';
    else if (/(دوبلكس|duplex)/i.test(text)) propertyType = 'Duplex';
    else if (/(بنتهاوس|penthouse|روف)/i.test(text)) propertyType = 'Penthouse';
    else if (/(ستوديو|studio)/i.test(text)) propertyType = 'Studio';

    // 6. Finishing
    let finishing = 'Semi-Finished';
    if (/(الترا سوبر لوكس|الترا لوكس|ultra lux|تشطيب فندقي)/i.test(text)) finishing = 'Ultra Super Lux';
    else if (/(سوبر لوكس|تشطيب كامل|fully finished|سوبرلوكس)/i.test(text)) finishing = 'Super Lux';
    else if (/(محارة وحلوق|طوب احمر|طوب أحمر|core & shell)/i.test(text)) finishing = 'Core & Shell';
    else if (/(مفروش بالكامل|مفروشة|furnished)/i.test(text)) finishing = 'Furnished';

    return { areaSqm, bedrooms, bathrooms: bedrooms ? Math.max(1, bedrooms - 1) : 2, priceEgp, propertyType, finishing, phone };
  }

  /**
   * Full Grounding & Analysis Pipeline for any Inbound Listing
   */
  public async processListing(raw: RawScrapedListing): Promise<GroundedOwnerUnit | null> {
    const compoundData = this.matchCompound(raw.rawText);
    if (!compoundData) {
      // Not a New Cairo listing or unrecognized area
      return null;
    }

    const ownerVerdict = this.verifyDirectOwner(raw.rawText);
    const specs = this.extractSpecs(raw.rawText);

    // If phone missing, check raw.senderPhone
    const finalPhone = specs.phone || (raw.senderPhone ? String(raw.senderPhone).replace(/[^\d]/g, '') : '');
    const priceFormatted = specs.priceEgp > 0 ? `${specs.priceEgp.toLocaleString()} EGP` : 'Price on Inquiry';

    // Compute price/sqm & Arbitrage
    let pricePerSqm: number | null = null;
    let arbitrageStatus: GroundedOwnerUnit['arbitrageStatus'] = 'UNVERIFIED';
    let arbitrageDeltaPct: number | undefined = undefined;

    if (specs.priceEgp > 0 && specs.areaSqm && specs.areaSqm > 0) {
      pricePerSqm = Math.round(specs.priceEgp / specs.areaSqm);
      const median = compoundData.medianPricePerSqm;
      arbitrageDeltaPct = Math.round(((pricePerSqm - median) / median) * 100);

      if (arbitrageDeltaPct <= -12) {
        arbitrageStatus = 'UNDERPRICED_GOLDEN_DEAL';
      } else if (arbitrageDeltaPct <= 10) {
        arbitrageStatus = 'FAIR_MARKET_VALUE';
      } else {
        arbitrageStatus = 'OVERPRICED';
      }
    }

    // Determine missing fields
    const missingFields: string[] = [];
    if (!specs.priceEgp || specs.priceEgp <= 0) missingFields.push('price');
    if (!specs.areaSqm) missingFields.push('area');
    if (!specs.bedrooms) missingFields.push('bedrooms');
    if (!finalPhone) missingFields.push('contact_phone');

    const status: GroundedOwnerUnit['status'] =
      missingFields.length === 0 ? 'Available' : 'Missing_Details';

    const unitCode = `SE-OWNER-${Date.now().toString().slice(-5)}`;

    const suggestedOutreach = missingFields.length > 0 && finalPhone
      ? `السلام عليكم يا فندم بخصوص وحدتكم المعروضة في ${compoundData.name}، نتشرف بالتواصل مع حضرتك من سييرا إستيتس. هل متاح السعر النهائي والمساحة والصور لعرضها على المشترين الجاهزين للكاش؟ شكراً لحضرتك.`
      : undefined;

    const groundedUnit: GroundedOwnerUnit = {
      id: raw.id || `unit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sierraCode: unitCode,
      platform: raw.platform,
      sourceName: raw.sourceName,
      sourceUrl: raw.url,
      isDirectOwner: ownerVerdict.isDirectOwner,
      ownerConfidenceScore: ownerVerdict.confidenceScore,
      ownerVerificationReason: ownerVerdict.reason,
      compound: compoundData.name,
      locationArea: compoundData.area,
      propertyType: specs.propertyType,
      areaSqm: specs.areaSqm,
      bedrooms: specs.bedrooms,
      bathrooms: specs.bathrooms,
      finishing: specs.finishing,
      priceEgp: specs.priceEgp,
      priceFormatted,
      pricePerSqmEgp: pricePerSqm,
      compoundMedianPricePerSqm: compoundData.medianPricePerSqm,
      arbitrageStatus,
      arbitrageDeltaPct,
      contactPhone: finalPhone,
      contactName: raw.senderName || 'Direct Owner',
      listedAt: raw.postedAt || new Date().toISOString(),
      status,
      missingFields,
      suggestedOwnerOutreachArabic: suggestedOutreach,
    };

    // Broadcast to Sierra Shared Memory RAG Bus
    try {
      await sharedMemory.write(
        `owner_unit:${unitCode}`,
        groundedUnit,
        {
          author: 'openclaw',
          tags: [
            'owner_unit',
            'rag_grounded',
            groundedUnit.compound.toLowerCase().replace(/\s+/g, '_'),
            groundedUnit.platform,
            groundedUnit.arbitrageStatus.toLowerCase(),
          ],
        }
      );
    } catch (err) {
      console.warn('[NotebookLMHarvester] Error writing to sharedMemory:', (err as Error).message);
    }

    return groundedUnit;
  }

  /**
   * Batch process multi-platform scraped listings
   */
  public async processBatch(listings: RawScrapedListing[]): Promise<{
    totalProcessed: number;
    ownerUnitsFound: GroundedOwnerUnit[];
    goldenDeals: GroundedOwnerUnit[];
    brokerUnitsFiltered: number;
  }> {
    const ownerUnitsFound: GroundedOwnerUnit[] = [];
    const goldenDeals: GroundedOwnerUnit[] = [];
    let brokerUnitsFiltered = 0;

    for (const listing of listings) {
      const processed = await this.processListing(listing);
      if (!processed) continue;

      if (processed.isDirectOwner) {
        ownerUnitsFound.push(processed);
        if (processed.arbitrageStatus === 'UNDERPRICED_GOLDEN_DEAL') {
          goldenDeals.push(processed);
        }
      } else {
        brokerUnitsFiltered++;
      }
    }

    return {
      totalProcessed: listings.length,
      ownerUnitsFound,
      goldenDeals,
      brokerUnitsFiltered,
    };
  }
}
