import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { z } from 'zod';
import { insertRecord } from '@sierra-estates/db';
import { toListingColumns } from '@/lib/server/listing-columns';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { extractAttachedPhotos } from '@/lib/services/listing-normalize';
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
  phone: string | null;
  compound: string | null;
  propertyType: string | null;
  mode: 'sale' | 'rent' | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  price: number | null;
  finishing: string | null;
  sierraCode: string | null;
  rawText: string;
  /** Source classification signal — NEVER a human verification. */
  isOwner: boolean;
  /** Honest signal label replacing the old fabricated 95/82 confidence. */
  sourceClass: 'owner_group' | 'owner_signal' | 'broker';
  isDuplicate: boolean;
  duplicateOf?: string;
  summary: string;
  photoUrl?: string;
  images?: string[];
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
 * §21 no-fabrication: the old fallback invented '+201000000000' — a fake
 * contact number that could end up on listing records. Unknown stays null.
 */
function extractPhone(sender: string, text: string): string | null {
  const phoneRegex = /(?:\+?20|0)?1[0125]\d{8}/g;
  const inText = text.match(phoneRegex);
  if (inText && inText.length > 0) return inText[0];
  const inSender = sender.match(phoneRegex);
  if (inSender && inSender.length > 0) return inSender[0];
  const senderDigits = sender.replace(/[^\d+]/g, '');
  return senderDigits.length >= 8 ? senderDigits : null;
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

  // 1. Compound detection — §21: undetected stays null (was defaulted to
  // 'New Cairo (Fifth Settlement)', mislabelling every unmatched message).
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
  let detectedCompound: string | null = null;
  for (const c of compounds) {
    if (c.matches.some((m) => lower.includes(m))) {
      detectedCompound = c.name;
      break;
    }
  }

  // 2. Property Type — §21: undetected stays null (was defaulted 'Apartment').
  let propertyType: string | null = null;
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
  } else if (lower.includes('شقة') || lower.includes('apartment')) {
    propertyType = 'Apartment';
  } else if (lower.includes('office') || lower.includes('مكتب') || lower.includes('تجاري')) {
    propertyType = 'Commercial Office';
  }

  // 3. Mode (Sale vs Rent) — §21: undetected stays null (was defaulted 'sale').
  const isRent = lower.includes('للايجار') || lower.includes('ايجار') || lower.includes('إيجار') || lower.includes('rent');
  const isSale = lower.includes('للبيع') || lower.includes('بيع') || lower.includes('sale');
  const mode: 'sale' | 'rent' | null = isRent ? 'rent' : isSale ? 'sale' : null;

  // 4. Area (sqm) — §21: undetected stays null (was defaulted 165).
  let area: number | null = null;
  const areaMatch = msg.text.match(/(?:مساحة|مساحه|م2|متر|area|sqm)?\s*[:=\-]?\s*(\d{2,4})\s*(?:متر|م2|م|sqm)?/i);
  if (areaMatch && Number(areaMatch[1]) >= 40 && Number(areaMatch[1]) <= 2500) {
    area = Number(areaMatch[1]);
  }

  // 5. Bedrooms — §21: undetected stays null (was defaulted 3).
  let beds: number | null = null;
  const bedsMatch = msg.text.match(/(\d+)\s*(?:غرف|غرفة|نوم|beds|bedrooms)/i);
  if (bedsMatch) {
    beds = Math.min(Math.max(Number(bedsMatch[1]), 1), 10);
  }

  // 6. Bathrooms — §21: undetected stays null (was defaulted 2).
  let baths: number | null = null;
  const bathsMatch = msg.text.match(/(\d+)\s*(?:حمام|حمامات|baths|bathrooms)/i);
  if (bathsMatch) {
    baths = Math.min(Math.max(Number(bathsMatch[1]), 1), 8);
  }

  // 7. Price — §21: undetected stays null (was defaulted 45000/12500000 —
  // fabricated prices on unverified records are the worst kind of invention).
  let price: number | null = null;
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

  // 8. Finishing — §21: undetected stays null (was defaulted 'Semi-Finished').
  let finishing: string | null = null;
  if (lower.includes('الترا سوبر لوكس') || lower.includes('ultra super lux') || lower.includes('مودرن')) {
    finishing = 'Ultra Super Lux';
  } else if (lower.includes('سوبر لوكس') || lower.includes('super lux') || lower.includes('تشطيب كامل') || lower.includes('fully finished')) {
    finishing = 'Fully Finished';
  } else if (lower.includes('محارة') || lower.includes('core and shell') || lower.includes('بدون تشطيب')) {
    finishing = 'Core & Shell';
  }

  // 9. Sierra SBR code — Phase 3: a code is derived ONLY when the required
  // inputs exist. Missing inputs → null code + the record is staged
  // NEEDS_CODE (private, queued for staff resolution) instead of a guessed code.
  const sbr = detectedCompound && beds != null && price != null
    ? buildSierraCodeMetadata({
        compound: detectedCompound,
        rooms: beds,
        furnishingStatus: finishing ?? undefined,
        price,
      })
    : null;

  // 10. Direct Owner check — PHASE 5 FIX: this is a SOURCE CLASSIFICATION
  // signal only. Group membership and Arabic keywords are NOT human
  // verification; nothing derived here may set a verified flag.
  const isDirectOwnerGroup = groupType === 'owner' || msg.groupName.toLowerCase().includes('owner');
  const hasDirectOwnerSignal = lower.includes('من المالك') || lower.includes('مالك مباشر') || lower.includes('direct from owner');
  const isOwner = isDirectOwnerGroup || hasDirectOwnerSignal;
  const sourceClass: 'owner_group' | 'owner_signal' | 'broker' = isDirectOwnerGroup
    ? 'owner_group'
    : hasDirectOwnerSignal
      ? 'owner_signal'
      : 'broker';

  // 11. Deduplication check — duplicated input must reuse or link the
  // existing unit, never create a second one.
  let isDuplicate = false;
  let duplicateOf = undefined;

  const duplicateCandidate = existingInventory.find((inv: any) => {
    if (!detectedCompound) return false;
    const invCompound = (inv.compound || inv.location || '').toLowerCase();
    const invPrice = Number(inv.price || 0);
    const invPhone = (inv.mobile || inv.phone || inv.sender || '').replace(/[^\d]/g, '');
    const currentCleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';

    const invCompoundToken = detectedCompound.toLowerCase().split(' ')[0];
    if (!invCompoundToken) return false;
    const sameCompound = invCompound.includes(invCompoundToken);
    const samePrice = invPrice > 0 && price != null && Math.abs(invPrice - price) / invPrice < 0.05;
    const samePhone = currentCleanPhone && invPhone && currentCleanPhone.length > 8 && invPhone.includes(currentCleanPhone.slice(-8));

    return (sameCompound && samePrice) || (samePhone && sameCompound);
  });

  if (duplicateCandidate) {
    isDuplicate = true;
    duplicateOf = duplicateCandidate.id || duplicateCandidate.sierraCode || 'Existing Record';
  }

  // 12. Attached photos extraction
  const attachedPhotos = extractAttachedPhotos(msg.text);
  const primaryPhoto = attachedPhotos[0] || undefined;

  // Honest summary: '?' for unknown values — never the old fabricated defaults.
  const unknown = '?';
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
    sierraCode: sbr?.code ?? null,
    rawText: msg.text,
    isOwner,
    sourceClass,
    isDuplicate,
    duplicateOf,
    summary: `${propertyType ?? unknown} in ${detectedCompound ?? unknown} · ${area ?? unknown} sqm · ${beds ?? unknown} BD · ${price != null ? `${(price / 1000000).toFixed(1)}M EGP` : unknown}`,
    photoUrl: primaryPhoto,
    images: attachedPhotos.length > 0 ? attachedPhotos : undefined,
  };
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // Step 4: If action is "ingest", persist non-duplicate units to Supabase.
    // PHASE 5 FIX: every scanned unit enters the common review queue as
    // REVIEW_REQUIRED — the source classification (owner group / owner
    // signal / broker) is recorded as a SIGNAL, never as `verified`, and
    // `ownerType` no longer stamps brokers as "Broker Verified". The local
    // JSON snapshot staging was REMOVED: a serverless filesystem is not a
    // canonical store, and the Supabase row (plus the admin review queue)
    // is the single source of truth. Duplicated input links to the existing
    // unit instead of creating a second one.
    let ingestedCount = 0;
    let needsCodeCount = 0;
    if (action === 'ingest') {
      const unitsToIngest = parsedUnits.filter((u) => !u.isDuplicate);
      for (const unit of unitsToIngest) {
        try {
          const payload = {
            compound: unit.compound ?? undefined,
            propertyType: unit.propertyType ?? undefined,
            mode: unit.mode ?? undefined,
            beds: unit.beds ?? undefined,
            baths: unit.baths ?? undefined,
            area: unit.area ?? undefined,
            price: unit.price ?? undefined,
            finishing: unit.finishing ?? undefined,
            ownerName: unit.sender || 'Direct Owner (WhatsApp Intake)',
            // Honest relationship label — no "Verified" claim from a scan.
            ownerType: unit.isOwner ? 'Owner' : 'Broker',
            mobile: unit.phone ?? undefined,
            comment: `Imported via WhatsApp Mobile Chat Scanner [${groupName}] at ${unit.timestamp}\nSource classification: ${unit.sourceClass} (signal, not verification)\nOriginal text: ${unit.rawText.slice(0, 300)}`,
            photos: unit.images || (unit.photoUrl ? [unit.photoUrl] : []),
            images: unit.images || (unit.photoUrl ? [unit.photoUrl] : []),
            featured_image: unit.photoUrl || null,
            status: 'available',
            // PHASE 5: scanned units are PRIVATE until staff review — the
            // old payload had no publishStatus and even set a `verified`
            // boolean from group membership.
            publishStatus: 'REVIEW_REQUIRED',
            // Phase 3: no safe code derivable → NEEDS_CODE staging, private.
            code: unit.sierraCode ?? undefined,
            rawData: {
              scannedUnitId: unit.id,
              sourceClass: unit.sourceClass,
              needsCode: unit.sierraCode == null,
              whatsappGroupName: groupName,
            },
            source: `WhatsApp: ${groupName}`,
          };

          const cols = toListingColumns(payload as Record<string, unknown>);

          await insertRecord('listings', cols);
          ingestedCount++;
          if (unit.sierraCode == null) needsCodeCount++;
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
        needsCodeCount,
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
