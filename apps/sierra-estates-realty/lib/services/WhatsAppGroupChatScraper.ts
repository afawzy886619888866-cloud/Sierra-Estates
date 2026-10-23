/**
 * WhatsAppGroupChatScraper.ts
 *
 * Ingests WhatsApp Group Chat exports (.txt) directly from mobile.
 *
 * HOW TO EXPORT FROM MOBILE:
 *   WhatsApp → Open Group → ⋮ Menu → More → Export chat → Without media → Share .txt file
 *   Upload the .txt to /api/ingest/whatsapp-group-chat (multipart/form-data)
 *
 * FLOW:
 *   1. Parse raw .txt → individual messages with sender + timestamp
 *   2. For each message: Gemini NLP determines if it's a property listing
 *   3. If listing → parse fields (compound, price, area, bedrooms, phone, photos needed)
 *   4. Deduplicate by phone+compound+price
 *   5. Upsert into Supabase `units` table
 *   6. Push to Airtable if AIRTABLE_API_KEY configured
 *   7. Return structured ingestion report
 *
 * MISSING INFO DETECTION:
 *   Required fields for a "complete" listing:
 *     compound, price, area, unitType, phone
 *   Missing fields are flagged in the `missingFields` array per unit.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { upsertRecord, listRecords } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || ''
);

/* ──────────────────────────────────────── types ─── */

export interface ParsedMessage {
  timestamp: string;
  sender: string;
  text: string;
  lineIndex: number;
}

export interface ScrapedListing {
  /** Sierra parsing quality */
  isListing: boolean;
  compound: string | null;
  price: number | null;
  priceType: 'sale' | 'rent' | 'unknown';
  currency: 'EGP' | 'USD';
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  unitType: 'apartment' | 'villa' | 'townhouse' | 'duplex' | 'penthouse' | 'studio' | 'chalet' | null;
  finishing: 'core_and_shell' | 'semi_finished' | 'fully_finished' | null;
  deliveryDate: string | null;
  ownerPhone: string | null;
  senderPhone: string | null;
  senderName: string;
  rawText: string;
  timestamp: string;
  missingFields: string[];
  notes: string;
  hasPhoto: false; // group text exports don't include photos — flagged for follow-up
  valuationScore: number;
  urgencyScore: number;
  sierraCode: string | null;
  dedupeKey: string;
}

export interface ScraperReport {
  totalMessages: number;
  listingsFound: number;
  duplicatesSkipped: number;
  syncedToSupabase: number;
  syncedToAirtable: number;
  failedRows: number;
  missingInfoCount: number;
  listings: ScrapedListing[];
  missingInfoSummary: Record<string, number>;
  timestamp: string;
}

/* ──────────────────────────────── parsing helpers ─── */

/**
 * Parse a WhatsApp exported .txt file into individual messages.
 * Supports both iOS and Android export formats.
 */
export function parseWhatsAppExport(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  // Android format: [DD/MM/YYYY, HH:MM:SS] Name: message
  // iOS format:     DD/MM/YYYY, HH:MM – Name: message
  const patterns = [
    // Android: [25/11/2024, 14:23:01] Ahmed: Hello
    /^\[(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]\s+([^:]+):\s(.+)/,
    // iOS:     25/11/2024, 14:23 – Ahmed: Hello
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\s+[–-]\s+([^:]+):\s(.+)/,
    // Locale: 11/25/24, 2:23 PM - Name: text
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s?[AP]M)?)\s+[–-]\s+([^:]+):\s(.+)/,
  ];

  const lines = content.split('\n');
  let currentMsg: ParsedMessage | null = null;

  lines.forEach((line, idx) => {
    line = line.trim();
    if (!line) return;

    // Skip system messages
    if (
      line.includes('Messages and calls are end-to-end encrypted') ||
      line.includes('تم تشفير الرسائل') ||
      line.includes('<Media omitted>') ||
      line.includes('image omitted') ||
      line.includes('video omitted') ||
      line.includes('audio omitted') ||
      line.includes('document omitted') ||
      line.includes('sticker omitted') ||
      line.startsWith('~')
    ) {
      return;
    }

    let matched = false;
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        // Save previous message
        if (currentMsg) messages.push(currentMsg);

        const dateStr = match[1];
        const timeStr = match[2];
        const sender = match[3].trim();
        const text = match[4].trim();

        currentMsg = {
          timestamp: `${dateStr} ${timeStr}`,
          sender,
          text,
          lineIndex: idx,
        };
        matched = true;
        break;
      }
    }

    // Continuation line (multi-line message)
    if (!matched && currentMsg && line.length > 0) {
      currentMsg.text += '\n' + line;
    }
  });

  if (currentMsg) messages.push(currentMsg);
  return messages;
}

/* ──────────────────────────── Gemini batch parser ─── */

/**
 * Uses Gemini Flash to parse property listings from messages in batches.
 * Batching reduces API calls — 10 messages per call.
 */
async function batchParseListings(messages: ParsedMessage[]): Promise<ScrapedListing[]> {
  if (!process.env.GOOGLE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
    logger.warn('[Scraper] No Gemini key — falling back to regex parser');
    return messages.map((m) => regexFallbackParse(m));
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const results: ScrapedListing[] = [];
  const BATCH_SIZE = 8;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const batchText = batch
      .map(
        (m, idx) =>
          `MSG_${idx}:\nSender: ${m.sender}\nTime: ${m.timestamp}\nText: ${m.text}`
      )
      .join('\n\n---\n\n');

    const prompt = `You are The Scribe for Sierra Estates Egypt — a real estate listing intelligence system.

Analyze the following ${batch.length} WhatsApp messages from Egyptian real estate groups.
For EACH message (MSG_0 to MSG_${batch.length - 1}), respond with a JSON array.

EXTRACTION RULES:
- Properties are in New Cairo, Madinaty, Uptown Cairo, Golden Square, North Coast, 6th October, Zayed
- Prices in EGP (millions: مليون/م, thousands: ألف/k)
- "إيجار/للإيجار/rent" = rent, else = sale
- Extract phone numbers (Egyptian: 01x, International: +20)
- Area in sqm (م², m2, متر, sqm, m)
- Bedrooms: غرف/rooms/غرفة/bedroom/bed
- Compound names: Mivida/ميفيدا, Hyde Park/هايد بارك, Mountain View/ماونتن فيو, Madinaty/مدينتي, Villette, Eastown, Palm Hills, Uptown Cairo/أبتاون, Swan Lake, Katameya, etc.
- valuationScore 0-100 (80+ = great deal / لقطة)
- urgencyScore 0-100 (high = "urgent/عاجل/يعجل/تحت الطلب")

JSON array schema for each message:
{
  "msgIndex": number,
  "isListing": boolean,
  "compound": string | null,
  "price": number | null,
  "priceType": "sale" | "rent" | "unknown",
  "currency": "EGP" | "USD",
  "area": number | null,
  "bedrooms": number | null,
  "bathrooms": number | null,
  "floor": string | null,
  "unitType": "apartment"|"villa"|"townhouse"|"duplex"|"penthouse"|"studio"|"chalet"|null,
  "finishing": "core_and_shell"|"semi_finished"|"fully_finished"|null,
  "deliveryDate": string | null,
  "ownerPhone": string | null,
  "notes": string,
  "valuationScore": number,
  "urgencyScore": number,
  "sierraCode": string | null
}

Messages to analyze:
${batchText}

Respond ONLY with a valid JSON array. No markdown fences. No explanation.`;

    try {
      const res = await model.generateContent(prompt);
      const raw = res.response.text().replace(/```json|```/g, '').trim();
      const parsed: any[] = JSON.parse(raw);

      parsed.forEach((p) => {
        const msg = batch[p.msgIndex];
        if (!msg) return;

        const listing = buildListing(p, msg);
        results.push(listing);
      });
    } catch (err) {
      logger.warn(`[Scraper] Batch ${i / BATCH_SIZE} parse error:`, err);
      // Fallback for this batch
      batch.forEach((m) => results.push(regexFallbackParse(m)));
    }

    // Rate limit protection
    if (i + BATCH_SIZE < messages.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

function buildListing(parsed: any, msg: ParsedMessage): ScrapedListing {
  const missing: string[] = [];
  if (!parsed.compound) missing.push('compound');
  if (!parsed.price) missing.push('price');
  if (!parsed.area) missing.push('area');
  if (!parsed.unitType) missing.push('unitType');
  if (!parsed.ownerPhone) missing.push('ownerPhone / phone');

  const phone = parsed.ownerPhone
    ? parsed.ownerPhone.replace(/[^0-9+]/g, '')
    : null;

  const dedupeKey = [
    parsed.compound?.toLowerCase().replace(/\s/g, ''),
    parsed.price,
    parsed.area,
    phone,
  ]
    .filter(Boolean)
    .join('_');

  return {
    isListing: parsed.isListing ?? false,
    compound: parsed.compound ?? null,
    price: parsed.price ?? null,
    priceType: parsed.priceType ?? 'unknown',
    currency: parsed.currency ?? 'EGP',
    area: parsed.area ?? null,
    bedrooms: parsed.bedrooms ?? null,
    bathrooms: parsed.bathrooms ?? null,
    floor: parsed.floor ?? null,
    unitType: parsed.unitType ?? null,
    finishing: parsed.finishing ?? null,
    deliveryDate: parsed.deliveryDate ?? null,
    ownerPhone: phone,
    senderName: msg.sender,
    senderPhone: msg.sender.replace(/[^0-9+]/g, '') || null,
    rawText: msg.text,
    timestamp: msg.timestamp,
    missingFields: missing,
    notes: parsed.notes ?? '',
    hasPhoto: false,
    valuationScore: parsed.valuationScore ?? 50,
    urgencyScore: parsed.urgencyScore ?? 50,
    sierraCode: parsed.sierraCode ?? null,
    dedupeKey,
  };
}

/* ──────────────────────────── regex fallback ─── */

function regexFallbackParse(msg: ParsedMessage): ScrapedListing {
  const text = msg.text;
  const isListing =
    /(?:شقة|فيلا|توين|دوبلكس|بنتهاوس|apartment|villa|duplex|penthouse|للبيع|للإيجار|for sale|for rent)/i.test(text);

  const priceMatch = text.match(/(\d[\d,.]*)\s*(?:مليون|million|m\b|ألف|k\b|000)/i);
  const areaMatch = text.match(/(\d+)\s*(?:م²?|sqm?|متر|m2)/i);
  const phoneMatch = text.match(/(?:01[0-9]|011|012|015)\d{8}|(?:\+20)\d{10}/);
  const bedsMatch = text.match(/(\d+)\s*(?:غرف?|rooms?|beds?)/i);

  let price: number | null = null;
  if (priceMatch) {
    const raw = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (/مليون|million|m\b/i.test(priceMatch[0])) price = raw * 1_000_000;
    else if (/ألف|k\b/i.test(priceMatch[0])) price = raw * 1_000;
    else price = raw;
  }

  const listing = buildListing(
    {
      isListing,
      compound: null,
      price,
      priceType: /إيجار|rent/i.test(text) ? 'rent' : 'sale',
      currency: 'EGP',
      area: areaMatch ? parseFloat(areaMatch[1]) : null,
      bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
      ownerPhone: phoneMatch ? phoneMatch[0] : null,
      unitType: /فيلا|villa/i.test(text)
        ? 'villa'
        : /توين/i.test(text)
        ? 'townhouse'
        : /شقة|apartment/i.test(text)
        ? 'apartment'
        : null,
      notes: 'Regex fallback parse',
      valuationScore: 50,
      urgencyScore: /عاجل|urgent/i.test(text) ? 85 : 50,
      sierraCode: null,
    },
    msg
  );

  return listing;
}

/* ──────────────────────────── deduplication ─── */

async function getExistingDedupeKeys(): Promise<Set<string>> {
  try {
    const existing = await listRecords<{ dedupeKey: string }>('units', {
      limit: 5000,
    });
    return new Set(existing.map((u) => u.dedupeKey).filter(Boolean));
  } catch {
    return new Set();
  }
}

/* ─────────────────────────────── Airtable sync ─── */

async function syncToAirtable(listings: ScrapedListing[]): Promise<number> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_SCRAPER_TABLE || 'WhatsApp Scraped Units';

  if (!apiKey || !baseId) return 0;

  let synced = 0;
  for (const listing of listings) {
    try {
      const fields: Record<string, unknown> = {
        'Compound': listing.compound || 'Unknown',
        'Price EGP': listing.price,
        'Deal Type': listing.priceType === 'rent' ? 'Rent' : 'Sale',
        'Area sqm': listing.area,
        'Bedrooms': listing.bedrooms,
        'Unit Type': listing.unitType || 'N/A',
        'Finishing': listing.finishing || 'N/A',
        'Owner Phone': listing.ownerPhone || 'N/A',
        'Sender': listing.senderName,
        'Has Photo': false,
        'Valuation Score': listing.valuationScore,
        'Urgency Score': listing.urgencyScore,
        'Sierra Code': listing.sierraCode || 'TBD',
        'Missing Fields': listing.missingFields.join(', ') || 'Complete',
        'Raw Text': listing.rawText.slice(0, 1000),
        'Timestamp': listing.timestamp,
        'Notes': listing.notes,
        'Source': 'WhatsApp Group Export',
        'Status': 'Needs Review',
      };

      await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      synced++;
    } catch (err) {
      logger.warn('[Scraper→Airtable] Row failed:', err);
    }
  }

  return synced;
}

/* ═══════════════════════════════ MAIN ENTRY ═══════════════════════════════ */

/**
 * Main entry point — called from the API route.
 */
export async function scrapeWhatsAppGroupChat(
  fileContent: string,
  options: {
    groupName?: string;
    skipDuplicates?: boolean;
    syncToAirtable?: boolean;
  } = {}
): Promise<ScraperReport> {
  const {
    groupName = 'Unknown Group',
    skipDuplicates = true,
    syncToAirtable: shouldSyncAirtable = true,
  } = options;

  logger.info(`[Scraper] Starting parse for group: "${groupName}"`);

  // Step 1: Parse raw text → messages
  const messages = parseWhatsAppExport(fileContent);
  logger.info(`[Scraper] Parsed ${messages.length} messages`);

  // Step 2: Filter to non-trivial messages
  const candidates = messages.filter(
    (m) => m.text.length > 20 && !m.text.startsWith('‎')
  );

  // Step 3: AI batch-parse for listings
  const allListings = await batchParseListings(candidates);
  const listings = allListings.filter((l) => l.isListing);
  logger.info(`[Scraper] Found ${listings.length} listings out of ${candidates.length} messages`);

  // Step 4: Deduplicate
  const existingKeys = skipDuplicates ? await getExistingDedupeKeys() : new Set<string>();
  const deduped: ScrapedListing[] = [];
  const seen = new Set<string>();
  let duplicatesSkipped = 0;

  for (const l of listings) {
    if (!l.dedupeKey) {
      deduped.push(l);
      continue;
    }
    if (existingKeys.has(l.dedupeKey) || seen.has(l.dedupeKey)) {
      duplicatesSkipped++;
      continue;
    }
    seen.add(l.dedupeKey);
    deduped.push(l);
  }

  logger.info(`[Scraper] After dedup: ${deduped.length} new listings, ${duplicatesSkipped} duplicates skipped`);

  // Step 5: Upsert to Supabase units
  let syncedToSupabase = 0;
  let failedRows = 0;

  for (const listing of deduped) {
    try {
      await upsertRecord(
        'units',
        {
          compound: listing.compound || groupName,
          price: listing.price,
          priceType: listing.priceType,
          area: listing.area,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          floor: listing.floor,
          type: listing.unitType,
          finishing: listing.finishing,
          deliveryDate: listing.deliveryDate,
          ownerPhone: listing.ownerPhone,
          contactPhone: listing.ownerPhone,
          status: 'available',
          hasPhoto: false,
          source: 'whatsapp_group_export',
          sourceGroup: groupName,
          rawText: listing.rawText,
          dedupeKey: listing.dedupeKey,
          sierraCode: listing.sierraCode,
          valuationScore: listing.valuationScore,
          urgencyScore: listing.urgencyScore,
          needsPhoto: true,
          missingFields: listing.missingFields,
          scrapedAt: new Date().toISOString(),
        },
        'dedupeKey'
      );
      syncedToSupabase++;
    } catch (err) {
      logger.warn('[Scraper] Row upsert failed:', err);
      failedRows++;
    }
  }

  // Step 6: Airtable sync
  let syncedToAirtable = 0;
  if (shouldSyncAirtable && deduped.length > 0) {
    syncedToAirtable = await syncToAirtable(deduped);
  }

  // Step 7: Missing info summary
  const missingInfoSummary: Record<string, number> = {};
  let missingInfoCount = 0;
  for (const l of deduped) {
    if (l.missingFields.length > 0) {
      missingInfoCount++;
      for (const f of l.missingFields) {
        missingInfoSummary[f] = (missingInfoSummary[f] || 0) + 1;
      }
    }
  }

  logger.info(`[Scraper] Done — ${syncedToSupabase} to Supabase, ${syncedToAirtable} to Airtable`);

  return {
    totalMessages: messages.length,
    listingsFound: listings.length,
    duplicatesSkipped,
    syncedToSupabase,
    syncedToAirtable,
    failedRows,
    missingInfoCount,
    listings: deduped,
    missingInfoSummary,
    timestamp: new Date().toISOString(),
  };
}
