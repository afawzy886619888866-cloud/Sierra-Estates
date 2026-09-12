import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { insertRecord } from '@sierra-estates/db';
import { toListingColumns } from '@/lib/server/listing-columns';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { logger } from '@/lib/logger';
import consolidatedRaw from '@/data/consolidated-master-inventory.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scanRequestSchema = z.object({
  rawText: z.string().min(10, 'Chat text must contain content to scan'),
  groupName: z.string().default('WhatsApp Mobile Owners Group'),
  groupType: z.enum(['owner', 'broker', 'mixed']).default('owner'),
  action: z.enum(['parse_only', 'ingest']).default('parse_only'),
});

export interface ParsedWhatsAppUnit {
  id: string;
  timestamp: string;
  sender: string;
  phone: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  beds: number;
  baths: number;
  area: number;
  price: number;
  finishing: string;
  sierraCode: string;
  rawText: string;
  isOwner: boolean;
  confidence: number;
  isDuplicate: boolean;
  duplicateOf?: string;
  summary: string;
}

/**
 * Parses raw WhatsApp exported chat log lines into structured message records.
 * Supports iOS, Android, and Desktop WhatsApp mobile export formats.
 */
function parseChatLines(rawContent: string, defaultGroupName: string) {
  const lines = rawContent.split(/\r?\n/);
  const messages: { timestamp: string; sender: string; text: string; groupName: string }[] = [];
  let currentMsg: { timestamp: string; sender: string; text: string; groupName: string } | null = null;

  // Regex patterns for WhatsApp timestamps
  // Pattern 1: [24/08/2026, 12:30:15 PM] Ahmed: ...
  // Pattern 2: 24/08/2026, 12:30 - Ahmed: ...
  // Pattern 3: 8/24/26, 12:30 PM - Ahmed: ...
  const timestampRegex = /^(?:\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,.]?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?)\s*[-:]?\s*([^:]+):\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(timestampRegex);
    if (match) {
      if (currentMsg && currentMsg.text.trim()) {
        messages.push(currentMsg);
      }
      currentMsg = {
        timestamp: match[1].trim(),
        sender: match[2].trim(),
        text: match[3].trim(),
        groupName: defaultGroupName,
      };
    } else if (currentMsg) {
      currentMsg.text += '\n' + line;
    }
  }

  if (currentMsg && currentMsg.text.trim()) {
    messages.push(currentMsg);
  }

  return messages;
}

/**
 * Filter for messages containing real estate intent.
 */
function hasRealEstateSignal(text: string): boolean {
  const lower = text.toLowerCase();
  const systemIgnore = [
    'end-to-end encrypted',
    'changed the subject',
    'security code changed',
    'left the group',
    'added you',
    'created this group',
    'joined using this group',
    'deleted this message',
    'omitted',
    '<media omitted>',
  ];

  if (systemIgnore.some((kw) => lower.includes(kw))) {
    return false;
  }

  const keywords = [
    'للبيع', 'للايجار', 'إيجار', 'ايجار', 'شقة', 'شقه', 'فيلا', 'توين', 'تاون', 'دوبلكس',
    'بنتهاوس', 'استلام', 'مطلوب', 'مساحة', 'مساحه', 'متر', 'م2', 'غرف', 'غرفة', 'حمام',
    'سعر', 'مليون', 'الف', 'ألف', 'مقدم', 'اقساط', 'أقساط', 'تشطيب', 'مدينتي', 'الرحاب',
    'ميفيدا', 'هايد بارك', 'سوديك', 'بالم هيلز', 'التجمع', 'sale', 'rent', 'villa',
    'apartment', 'duplex', 'penthouse', 'compound', 'finished', 'sqm', 'beds', 'cash'
  ];

  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Extracts phone numbers from text or sender name.
 */
function extractPhone(sender: string, text: string): string {
  const phoneRegex = /(?:\+?20|0)?1[0125]\d{8}/g;
  const inText = text.match(phoneRegex);
  if (inText && inText.length > 0) return inText[0];
  const inSender = sender.match(phoneRegex);
  if (inSender && inSender.length > 0) return inSender[0];
  return sender.replace(/[^\d+]/g, '') || '+201000000000';
}

/**
 * Heuristic parser converting real estate message text into structured listing specs.
 */
function parseListingMessage(
  msg: { timestamp: string; sender: string; text: string; groupName: string },
  groupType: 'owner' | 'broker' | 'mixed',
  existingInventory: any[]
): ParsedWhatsAppUnit {
  const lower = msg.text.toLowerCase();
  const phone = extractPhone(msg.sender, msg.text);

  // 1. Compound detection
  const compounds = [
    { name: 'Mivida', matches: ['mivida', 'ميفيدا'] },
    { name: 'Villette (SODIC)', matches: ['villette', 'فيليت', 'فيلييت', 'sodic villette'] },
    { name: 'Hyde Park', matches: ['hyde park', 'هايد بارك', 'هايدبارك'] },
    { name: 'Mountain View iCity', matches: ['mountain view', 'ماونتن فيو', 'ماونتن', 'icity', 'اي سيتي'] },
    { name: 'Palm Hills New Cairo', matches: ['palm hills', 'بالم هيلز', 'بالم'] },
    { name: 'Eastown', matches: ['eastown', 'ايست تاون', 'ايستاون'] },
    { name: 'Madinaty', matches: ['madinaty', 'مدينتي'] },
    { name: 'Al Rehab', matches: ['rehab', 'الرحاب', 'رحاب'] },
    { name: 'Uptown Cairo', matches: ['uptown', 'اب تاون', 'أب تاون'] },
    { name: 'Swan Lake', matches: ['swan lake', 'سوان ليك'] },
    { name: 'Fifth Square', matches: ['fifth square', 'فيفث سكوير'] },
    { name: 'Katameya Dunes', matches: ['katameya dunes', 'قطامية ديونز'] },
    { name: 'Katameya Heights', matches: ['katameya heights', 'قطامية هايتس'] },
    { name: 'New Cairo 5th Settlement', matches: ['التجمع الخامس', 'تجمع خامس', 'fifth settlement', 'new cairo'] },
  ];

  let detectedCompound = 'New Cairo (Fifth Settlement)';
  for (const c of compounds) {
    if (c.matches.some((m) => lower.includes(m))) {
      detectedCompound = c.name;
      break;
    }
  }

  // 2. Property Type
  let propertyType = 'Apartment';
  if (lower.includes('villa') || lower.includes('فيلا') || lower.includes('مستقلة')) {
    propertyType = 'Standalone Villa';
  } else if (lower.includes('townhouse') || lower.includes('تاون هاوس') || lower.includes('تاون')) {
    propertyType = 'Townhouse';
  } else if (lower.includes('twin') || lower.includes('توين')) {
    propertyType = 'Twin House';
  } else if (lower.includes('duplex') || lower.includes('دوبلكس')) {
    propertyType = 'Duplex';
  } else if (lower.includes('penthouse') || lower.includes('بنتهاوس') || lower.includes('روف')) {
    propertyType = 'Penthouse';
  } else if (lower.includes('office') || lower.includes('مكتب') || lower.includes('تجاري')) {
    propertyType = 'Commercial Office';
  }

  // 3. Mode (Sale vs Rent)
  const isRent = lower.includes('للايجار') || lower.includes('ايجار') || lower.includes('إيجار') || lower.includes('rent');
  const mode: 'sale' | 'rent' = isRent ? 'rent' : 'sale';

  // 4. Area (sqm)
  let area = 165;
  const areaMatch = msg.text.match(/(?:مساحة|مساحه|م2|متر|area|sqm)?\s*[:=\-]?\s*(\d{2,4})\s*(?:متر|م2|م|sqm)?/i);
  if (areaMatch && Number(areaMatch[1]) >= 40 && Number(areaMatch[1]) <= 2500) {
    area = Number(areaMatch[1]);
  }

  // 5. Bedrooms
  let beds = 3;
  const bedsMatch = msg.text.match(/(\d+)\s*(?:غرف|غرفة|نوم|beds|bedrooms)/i);
  if (bedsMatch) {
    beds = Math.min(Math.max(Number(bedsMatch[1]), 1), 10);
  }

  // 6. Bathrooms
  let baths = 2;
  const bathsMatch = msg.text.match(/(\d+)\s*(?:حمام|حمامات|baths|bathrooms)/i);
  if (bathsMatch) {
    baths = Math.min(Math.max(Number(bathsMatch[1]), 1), 8);
  }

  // 7. Price
  let price = mode === 'rent' ? 45000 : 12500000;
  // Millions pattern: 16.5M, 16.5 مليون, 16,500,000
  const millionMatch = msg.text.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|م|million|m)\b/i);
  const rawNumberMatch = msg.text.match(/(?:سعر|مطلوب|ب|total|price)?\s*[:=\-]?\s*(\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d{5,9})/i);

  if (millionMatch) {
    const val = parseFloat(millionMatch[1].replace(',', '.'));
    if (!isNaN(val)) price = Math.round(val * 1000000);
  } else if (rawNumberMatch) {
    const cleanNum = Number(rawNumberMatch[1].replace(/[, ]/g, ''));
    if (cleanNum >= 10000 && cleanNum <= 300000000) {
      price = cleanNum;
    }
  }

  // 8. Finishing
  let finishing = 'Semi-Finished';
  if (lower.includes('الترا سوبر لوكس') || lower.includes('ultra super lux') || lower.includes('مودرن')) {
    finishing = 'Ultra Super Lux';
  } else if (lower.includes('سوبر لوكس') || lower.includes('super lux') || lower.includes('تشطيب كامل') || lower.includes('fully finished')) {
    finishing = 'Fully Finished';
  } else if (lower.includes('محارة') || lower.includes('core and shell') || lower.includes('بدون تشطيب')) {
    finishing = 'Core & Shell';
  }

  // 9. Sierra SBR code
  const sbr = buildSierraCodeMetadata({
    compound: detectedCompound,
    rooms: beds,
    furnishingStatus: finishing,
    price,
  });

  // 10. Direct Owner check
  const isDirectOwnerGroup = groupType === 'owner' || msg.groupName.toLowerCase().includes('owner');
  const hasDirectOwnerSignal = lower.includes('من المالك') || lower.includes('مالك مباشر') || lower.includes('direct from owner');
  const isOwner = isDirectOwnerGroup || hasDirectOwnerSignal;

  // 11. Deduplication check
  let isDuplicate = false;
  let duplicateOf = undefined;

  const duplicateCandidate = existingInventory.find((inv: any) => {
    const invCompound = (inv.compound || inv.location || '').toLowerCase();
    const invPrice = Number(inv.price || 0);
    const invPhone = (inv.mobile || inv.phone || inv.sender || '').replace(/[^\d]/g, '');
    const currentCleanPhone = phone.replace(/[^\d]/g, '');

    const sameCompound = invCompound.includes(detectedCompound.toLowerCase().split(' ')[0]);
    const samePrice = invPrice > 0 && Math.abs(invPrice - price) / invPrice < 0.05;
    const samePhone = currentCleanPhone && invPhone && currentCleanPhone.length > 8 && invPhone.includes(currentCleanPhone.slice(-8));

    return (sameCompound && samePrice) || (samePhone && sameCompound);
  });

  if (duplicateCandidate) {
    isDuplicate = true;
    duplicateOf = duplicateCandidate.id || duplicateCandidate.sierraCode || 'Existing Record';
  }

  return {
    id: `WA-UNIT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: msg.timestamp,
    sender: msg.sender,
    phone,
    compound: detectedCompound,
    propertyType,
    mode,
    beds,
    baths,
    area,
    price,
    finishing,
    sierraCode: sbr.code,
    rawText: msg.text,
    isOwner,
    confidence: isOwner ? 95 : 82,
    isDuplicate,
    duplicateOf,
    summary: `${propertyType} in ${detectedCompound} · ${area} sqm · ${beds} BD · ${(price / 1000000).toFixed(1)}M EGP`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = scanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { rawText, groupName, groupType, action } = parseResult.data;

    // Step 1: Parse chat log
    const allMessages = parseChatLines(rawText, groupName);
    if (allMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recognizable WhatsApp messages found in the provided text. Ensure standard export timestamp formatting.' },
        { status: 400 }
      );
    }

    // Step 2: Filter real estate messages
    const realEstateMessages = allMessages.filter((m) => hasRealEstateSignal(m.text));

    // Step 3: Parse real estate listings
    const existingListings = Array.isArray(consolidatedRaw) ? consolidatedRaw : [];
    const parsedUnits: ParsedWhatsAppUnit[] = realEstateMessages.map((m) =>
      parseListingMessage(m, groupType, existingListings)
    );

    // Step 4: If action is "ingest", persist non-duplicate units to Supabase
    let ingestedCount = 0;
    if (action === 'ingest') {
      const unitsToIngest = parsedUnits.filter((u) => !u.isDuplicate);
      for (const unit of unitsToIngest) {
        try {
          const payload = {
            compound: unit.compound,
            propertyType: unit.propertyType,
            mode: unit.mode,
            beds: unit.beds,
            baths: unit.baths,
            area: unit.area,
            price: unit.price,
            finishing: unit.finishing,
            ownerName: unit.sender || 'Direct Owner (WhatsApp Intake)',
            ownerType: unit.isOwner ? 'Owner' : 'Broker Verified',
            mobile: unit.phone,
            comment: `Imported via WhatsApp Mobile Chat Scanner [${groupName}] at ${unit.timestamp}\nOriginal text: ${unit.rawText.slice(0, 300)}`,
            photos: [],
            images: [],
            status: 'available',
            verified: unit.isOwner,
            source: `WhatsApp: ${groupName}`,
          };

          const cols = toListingColumns(payload as Record<string, unknown>);

          await insertRecord('listings', cols);
          ingestedCount++;
        } catch (dbErr) {
          logger.warn(`Failed to insert scanned unit ${unit.id}:`, dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      groupName,
      groupType,
      stats: {
        totalChatMessages: allMessages.length,
        realEstateMessagesCount: realEstateMessages.length,
        extractedUnitsCount: parsedUnits.length,
        directOwnersCount: parsedUnits.filter((u) => u.isOwner).length,
        duplicatesCount: parsedUnits.filter((u) => u.isDuplicate).length,
        ingestedCount,
      },
      units: parsedUnits,
    });
  } catch (error: any) {
    logger.error('Error scanning WhatsApp chat log:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error processing WhatsApp chat' },
      { status: 500 }
    );
  }
}
