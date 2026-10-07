import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { obsidian } from '@sierra-estates/obsidian';
import { OpenClawAgent } from '../openclaw';

const logger = pino({ name: 'sierra-listing-pipeline-agent' });

export interface RawGroupListing {
  rawMessage: string;
  sender: string;
  groupName: string;
  groupId: string;
  timestamp?: string;
  mediaPaths?: string[];
  mediaUrls?: string[];
}

export interface CalibratedUnit {
  code: string;
  titleEn: string;
  titleAr: string;
  compound: string;
  zone: string;
  dealType: 'Rent' | 'Resale';
  propertyType: string;
  price: number;
  priceDisplay: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  finishing: string;
  ownerPhone: string;
  ownerName: string;
  photoUrls: string[];
  status: 'Ready' | 'Needs Revision';
  missingFields: string[];
  pfReady: boolean;
  description: string;
  sourceGroup: string;
}

export class SierraListingPipelineAgent {
  private openclaw: OpenClawAgent;
  private ai?: GoogleGenAI;
  private usdRate = 50;

  constructor(options?: { aiApiKey?: string }) {
    const key = options?.aiApiKey || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';
    this.openclaw = new OpenClawAgent({ aiApiKey: key });
    if (key) {
      try {
        this.ai = new GoogleGenAI({ apiKey: key });
      } catch (_) {}
    }
  }

  /**
   * 1. Calibrate price according to Sierra Estates business rules
   *    - Rent: 7,000 to 300,000 EGP/mo. USD converted at 50 EGP/$
   *    - Resale: Floor at 1,000,000 EGP
   */
  public calibratePrice(rawPrice: number, dealType: 'Rent' | 'Resale', desc: string = ''): { price: number; deal: 'Rent' | 'Resale'; display: string } {
    let price = Number(rawPrice) || 0;
    let deal = dealType;

    // Detect USD pricing
    const isUsd = (price >= 400 && price <= 6000) || desc.includes('$') || desc.toLowerCase().includes('usd');
    if (isUsd && price > 0 && price <= 6000) {
      price = Math.round(price * this.usdRate);
    }

    // Cross-category correction
    if (deal === 'Rent' && price >= 1_000_000) {
      deal = 'Resale';
    } else if (deal === 'Resale' && price >= 7_000 && price <= 300_000) {
      deal = 'Rent';
    }

    // Enforce limits
    if (deal === 'Rent') {
      if (price > 300_000) {
        deal = 'Resale';
      } else if (price > 0 && price < 7_000) {
        price = 7_000;
      }
    } else {
      if (price > 0 && price < 500_000) {
        price = 0; // Price on Request
      } else if (price >= 500_000 && price < 1_000_000) {
        price = 1_000_000;
      }
    }

    // Formatted display
    let display = 'Price on Request';
    if (price > 0) {
      if (deal === 'Rent') {
        display = `${price.toLocaleString('en-US')} EGP / mo`;
      } else if (price >= 1_000_000) {
        const millions = (price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 2);
        display = `${price.toLocaleString('en-US')} EGP (${millions}M)`;
      } else {
        display = `${price.toLocaleString('en-US')} EGP`;
      }
    }

    return { price, deal, display };
  }

  /**
   * 2. Heuristic and AI NLP extraction of real estate listing from group text
   */
  public parseListingText(text: string, sender: string): Partial<CalibratedUnit> {
    const raw = text.replace(/[\u200e\u200f\xa0]/g, ' ').trim();

    // Phone
    const phoneMatch = raw.match(/(?<!\d)(?:\+?20[\s\-.]?)?0?1[0125](?:[\s\-.]?\d){8}(?!\d)/);
    let ownerPhone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : sender.replace(/\D/g, '');
    if (ownerPhone.startsWith('20') && ownerPhone.length >= 12) ownerPhone = ownerPhone.slice(2);
    if (ownerPhone.length === 10 && ownerPhone.startsWith('1')) ownerPhone = '0' + ownerPhone;

    // Compound extraction
    const compounds: Record<string, RegExp> = {
      'Madinaty': /مدينت[يى]|madinat/i,
      'Al Rehab': /الرحاب|rehab/i,
      'Mivida': /ميفيدا|mivida/i,
      'Hyde Park': /هايد\s*بارك|hyde\s*park/i,
      'Eastown': /ايست\s*تاون|eastown/i,
      'Mountain View': /ماونتن\s*فيو|mountain\s*view/i,
      'Villette': /فيليت|villette/i,
      'Palm Hills': /بالم\s*هيلز|palm\s*hills/i,
      'Swan Lake': /سوان\s*ليك|swan\s*lake/i,
      'Katameya Dunes': /ديونز|dunes/i,
      'Fifth Square': /فيفت\s*سكوير|fifth\s*square/i,
      'Beit El Watan': /بيت\s*الوطن|beit\s*el\s*watan/i,
    };

    // §21 no-fabrication: no compound matched → '' (unknown). Never
    // default to 'New Cairo' — downstream missingFields logic treats '' the
    // same as a legacy 'New Cairo' placeholder and prompts the sender.
    let compound = '';
    for (const [name, regex] of Object.entries(compounds)) {
      if (regex.test(raw)) {
        compound = name;
        break;
      }
    }

    // Property Type
    // §21 no-fabrication: unmatched property type stays '' (unknown),
    // never 'Apartment'.
    let propertyType = '';
    if (/فيلا|standalone|villa/i.test(raw)) propertyType = 'Standalone Villa';
    else if (/توين|twin\s*house/i.test(raw)) propertyType = 'Twin House';
    else if (/تاون|town\s*house/i.test(raw)) propertyType = 'Townhouse';
    else if (/دوبلكس|duplex/i.test(raw)) propertyType = 'Duplex';
    else if (/بنتهاوس|روف|penthouse/i.test(raw)) propertyType = 'Penthouse';
    else if (/شاليه|chalet/i.test(raw)) propertyType = 'Chalet';

    // Deal Type
    let initialDeal: 'Rent' | 'Resale' = 'Resale';
    if (/ايجار|إيجار|rent|شهري|مفروش/i.test(raw)) initialDeal = 'Rent';

    // Price
    let rawPrice = 0;
    const priceMillionMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:مليون|ملون|million)/i);
    if (priceMillionMatch) {
      rawPrice = parseFloat(priceMillionMatch[1]) * 1_000_000;
    } else {
      const priceThousandMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:الف|ألف|k\b)/i);
      if (priceThousandMatch) {
        rawPrice = parseFloat(priceThousandMatch[1]) * 1_000;
      } else {
        const generalPrice = raw.match(/(?:سعر|ب|مطلوب|الايجار|الإيجار)?\s*(\d[\d,]{3,9})/);
        if (generalPrice) {
          rawPrice = Number(generalPrice[1].replace(/,/g, ''));
        }
      }
    }

    // Bedrooms & Bathrooms & Area
    const bedsMatch = raw.match(/(\d)\s*(?:غرف|غرفة|نوم|beds?|bedrooms?)/i);
    const bathsMatch = raw.match(/(\d)\s*(?:حمام|حمامات|baths?|bathrooms?)/i);
    const areaMatch = raw.match(/(\d{2,4})\s*(?:متر|م²|m2|sqm)/i);

    // §21 no-fabrication: unparsed beds/baths/area surface as 0 (unknown),
    // never 3/2/150 defaults.
    const beds = bedsMatch ? Number(bedsMatch[1]) : 0;
    const baths = bathsMatch ? Number(bathsMatch[1]) : 0;
    const area = areaMatch ? Number(areaMatch[1]) : 0;

    const calibrated = this.calibratePrice(rawPrice, initialDeal, raw);

    return {
      compound,
      // §21: zone is only claimed when the message actually carries one —
      // '5th Settlement' is never assumed.
      zone: '',
      dealType: calibrated.deal,
      propertyType,
      price: calibrated.price,
      priceDisplay: calibrated.display,
      bedrooms: beds,
      bathrooms: baths,
      areaSqm: area,
      ownerPhone,
      description: raw,
    };
  }

  /**
   * 3. End-to-End Processing of Group Drop
   */
  public async processGroupDrop(input: RawGroupListing): Promise<{
    unit: CalibratedUnit;
    action: 'published_with_photos' | 'saved_needs_photos' | 'missing_fields_prompt';
    replyPrompt?: string;
  }> {
    const parsed = this.parseListingText(input.rawMessage, input.sender);
    const listingCode = `SE-WA-${Date.now().toString().slice(-6)}`;

    const missingFields: string[] = [];
    if (!parsed.compound || parsed.compound === 'New Cairo') missingFields.push('الكومباوند');
    if (!parsed.price || parsed.price <= 0) missingFields.push('السعر المطلوب');
    if (!parsed.ownerPhone) missingFields.push('رقم الهاتف');
    // §21 no-fabrication: the bot ASKS for descriptive fields it cannot
    // extract — it never invents 'Apartment'/3 beds/150 sqm.
    if (!parsed.propertyType) missingFields.push('نوع الوحدة');
    if (!parsed.bedrooms) missingFields.push('عدد الغرف');
    if (!parsed.areaSqm) missingFields.push('المساحة');

    const photoUrls = input.mediaUrls || [];
    const hasPhotos = photoUrls.length > 0;
    const pfReady = hasPhotos && parsed.price! > 0;

    // §21 no-fabrication: titles are built only from extracted facts; when
    // neither type nor compound is known the title says so honestly.
    const titleCoreEn = [parsed.propertyType, parsed.compound].filter(Boolean).join(' in ');
    const titleCoreAr = [parsed.propertyType, parsed.compound].filter(Boolean).join(' في ');

    const unit: CalibratedUnit = {
      code: listingCode,
      titleEn: titleCoreEn || 'Unverified WhatsApp listing',
      titleAr: titleCoreAr || 'إعلان واتساب قيد المراجعة',
      // §21: unknown fields surface as empty/0 — never 'New Cairo'/'5th
      // Settlement'/'Apartment'/3/2/150/'Super Lux'.
      compound: parsed.compound || '',
      zone: parsed.zone || '',
      dealType: parsed.dealType || 'Resale',
      propertyType: parsed.propertyType || '',
      price: parsed.price || 0,
      priceDisplay: parsed.priceDisplay || 'Price on Request',
      bedrooms: parsed.bedrooms || 0,
      bathrooms: parsed.bathrooms || 0,
      areaSqm: parsed.areaSqm || 0,
      finishing: parsed.finishing || '',
      ownerPhone: parsed.ownerPhone || input.sender,
      ownerName: input.sender,
      photoUrls,
      status: pfReady ? 'Ready' : 'Needs Revision',
      missingFields,
      pfReady,
      description: input.rawMessage,
      sourceGroup: input.groupName || input.groupId,
    };

    // Auto-prompt if missing critical fields
    if (missingFields.length > 0 || !hasPhotos) {
      let prompt = `⚠️ *سيراليون بوت | مطلوب استكمال بيانات الوحدة*\n\n`;
      prompt += `تم استلام تفاصيل الوحدة في *${unit.compound}* بنجاح.\n`;
      if (!hasPhotos) prompt += ` • 📸 *صور الوحدة*: برجاء إرسال صور لإدراج الإعلان فوراً على Property Finder.\n`;
      if (missingFields.length > 0) {
        prompt += ` • 📝 *بيانات ناقصة*: ${missingFields.join('، ')}.\n`;
      }
      prompt += `\n💬 برجاء الرد لتسجيل الوحدة وتفعيل الإعلان آلياً.`;

      // Log to Obsidian memory
      await obsidian.set(
        `unit-${listingCode}`,
        {
          title: `Pending Intake: ${unit.compound} (${unit.dealType})`,
          content: `Missing: ${missingFields.join(', ')}. Photos: ${hasPhotos ? 'Yes' : 'No'}. Raw: ${unit.description}`,
          code: listingCode,
          phone: unit.ownerPhone,
        },
        ['whatsapp-intake', 'pending-info', unit.dealType.toLowerCase()]
      );

      return {
        unit,
        action: missingFields.length > 0 ? 'missing_fields_prompt' : 'saved_needs_photos',
        replyPrompt: prompt,
      };
    }

    // Persist to Supabase Database
    try {
      await insertRecord('listings', {
        code: listingCode,
        title: unit.titleEn,
        compound: unit.compound,
        propertyType: unit.propertyType,
        dealType: unit.dealType.toLowerCase(),
        price: unit.price,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        areaSqm: unit.areaSqm,
        ownerPhone: unit.ownerPhone,
        status: 'available',
        verified: true,
        sourceChannel: unit.sourceGroup,
        description: unit.description,
        images: unit.photoUrls,
        createdAt: new Date().toISOString(),
      });
      logger.info({ code: listingCode }, '✅ Persisted to Supabase listings');
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Supabase write fallback');
    }

    // Log complete intake to Obsidian Memory
    await obsidian.set(
      `unit-${listingCode}`,
      {
        title: `Ingested Listing: ${unit.titleEn}`,
        content: `Compound: ${unit.compound} | Price: ${unit.priceDisplay} | Beds: ${unit.bedrooms} | Area: ${unit.areaSqm}m²\nOwner: ${unit.ownerPhone}\nPhotos: ${unit.photoUrls.join(', ')}`,
        code: listingCode,
        price: unit.price,
        pfReady: true,
      },
      ['openclaw-execution', 'verified-listing', unit.dealType.toLowerCase()]
    );

    return {
      unit,
      action: 'published_with_photos',
    };
  }
}
