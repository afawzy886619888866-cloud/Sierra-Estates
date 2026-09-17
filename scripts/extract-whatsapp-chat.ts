import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenClawAgent } from '../packages/agents/openclaw';
import { classifySourceType, isNewListing } from '../packages/agents/tools/whatsappGroupRegistry';
import { batchIngestListings, UnitListingData } from '../packages/agents/tools/inventoryTools';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ExtractedChatMessage {
  timestamp: string;
  sender: string;
  text: string;
  groupName: string;
  attachedPhotos?: string[];
}

/**
 * Extracts photo attachments from WhatsApp chat text.
 * Matches:
 * - <attached: 00000012-PHOTO-2026-08-24-10-15-22.jpg> (iOS export)
 * - IMG-20260824-WA0001.jpg (file attached) (Android export)
 * - [photo: filename.jpg]
 * - Direct HTTP(S) image URLs: https://.../image.jpg
 */
export function extractAttachedPhotos(text: string, baseDir?: string): string[] {
  const photos: string[] = [];

  // 1. Direct URLs
  const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s]*)?)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    photos.push(match[1]);
  }

  // 2. iOS attachment tags: <attached: filename.jpg>
  const iosRegex = /<attached:\s*([^>]+)>/gi;
  while ((match = iosRegex.exec(text)) !== null) {
    const filename = match[1].trim();
    if (/\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      photos.push(resolveMediaFilePath(filename, baseDir));
    }
  }

  // 3. Android attachment tags: filename.jpg (file attached)
  const androidRegex = /([A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp))\s*(?:\(file attached\))/gi;
  while ((match = androidRegex.exec(text)) !== null) {
    const filename = match[1].trim();
    photos.push(resolveMediaFilePath(filename, baseDir));
  }

  return Array.from(new Set(photos));
}

/**
 * Resolves media file path to a valid public URL or relative app asset path
 */
function resolveMediaFilePath(filename: string, baseDir?: string): string {
  if (baseDir) {
    const candidatePaths = [
      path.join(baseDir, filename),
      path.join(baseDir, 'Media', filename),
      path.join(baseDir, 'Images', filename),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return `/media/whatsapp/${encodeURIComponent(filename)}`;
      }
    }
  }
  return `/media/whatsapp/${encodeURIComponent(filename)}`;
}

/**
 * Parses raw WhatsApp exported chat text (.txt) into structured message objects.
 * Handles both Android and iOS WhatsApp export formats.
 */
export function parseRawWhatsAppChatLog(
  rawContent: string,
  defaultGroupName = 'WhatsApp Chat Export',
  baseDir?: string
): ExtractedChatMessage[] {
  const lines = rawContent.split(/\r?\n/);
  const messages: ExtractedChatMessage[] = [];
  let currentMsg: ExtractedChatMessage | null = null;

  // Regex patterns for WhatsApp timestamps
  const timestampRegex = /^(?:\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,.]?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?)\s*[-:]?\s*([^:]+):\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(timestampRegex);
    if (match) {
      if (currentMsg && currentMsg.text.trim()) {
        currentMsg.attachedPhotos = extractAttachedPhotos(currentMsg.text, baseDir);
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
    currentMsg.attachedPhotos = extractAttachedPhotos(currentMsg.text, baseDir);
    messages.push(currentMsg);
  }

  return messages;
}

/**
 * Filter messages that contain real estate listing signals.
 */
export function filterRealEstateMessages(messages: ExtractedChatMessage[]): ExtractedChatMessage[] {
  const realEstateKeywords = [
    'للبيع', 'للايجار', 'شقة', 'فيلا', 'توين', 'تاون', 'دوبلكس', 'بنتهاوس', 'استلام',
    'مطلوب', 'مساحة', 'متر', 'م2', 'غرف', 'حمام', 'سعر', 'مليون', 'الف', 'مقدم',
    'اقساط', 'تشطيب', 'مدينتي', 'الرحاب', 'ميفيدا', 'هايد بارك', 'سوديك', 'بالم هيلز',
    'التجمع', 'sale', 'rent', 'villa', 'apartment', 'duplex', 'penthouse', 'compound'
  ];

  return messages.filter((msg) => {
    const lower = msg.text.toLowerCase();
    const matchesKeyword = realEstateKeywords.some((kw) => lower.includes(kw));
    const isSystemMsg = lower.includes('end-to-end encrypted') || lower.includes('changed the subject') || lower.includes('security code changed');
    return matchesKeyword && !isSystemMsg;
  });
}

/**
 * Main chat extractor CLI & programmatic runner.
 * Ingests WhatsApp listings with photos into Obsidian, Airtable, and local inventory cache.
 */
export async function extractAndIngestChatFile(filePath: string, groupName?: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Chat file not found at: ${filePath}`);
  }

  const baseDir = path.dirname(filePath);
  const resolvedGroupName = groupName || path.basename(filePath, path.extname(filePath));
  console.log(`\n📂 Reading WhatsApp chat export: ${filePath} (Group: ${resolvedGroupName})`);

  const rawText = fs.readFileSync(filePath, 'utf-8');
  const allMessages = parseRawWhatsAppChatLog(rawText, resolvedGroupName, baseDir);
  console.log(`💬 Parsed ${allMessages.length} total chat messages.`);

  const listingMessages = filterRealEstateMessages(allMessages);
  console.log(`🏢 Identified ${listingMessages.length} real estate listing messages.`);

  if (listingMessages.length === 0) {
    console.log('ℹ️ No real estate listings detected in this chat export.');
    return { total: 0, succeeded: 0 };
  }

  const airtableCfg = {
    apiKey: process.env.AIRTABLE_API_KEY || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Listings',
  };

  const agent = new OpenClawAgent({
    airtableApiKey: airtableCfg.apiKey,
    airtableBaseId: airtableCfg.baseId,
    airtableTableName: airtableCfg.tableName,
    aiApiKey: process.env.GOOGLE_GENAI_API_KEY || '',
  });

  const parsedUnits: UnitListingData[] = listingMessages.map((m, idx) => {
    const parsed = agent.parseWhatsAppRealEstateText(m.text, m.sender, m.groupName, undefined, m.timestamp);
    const sierraCode = `WA-CHAT-${Date.now().toString(36).toUpperCase()}-${idx + 1}`;
    const photos = m.attachedPhotos || [];
    return {
      ...parsed,
      sierraCode: parsed.sierraCode || sierraCode,
      photoUrl: photos[0] || undefined,
      images: photos.length > 0 ? photos : undefined,
    };
  });

  console.log(`🔄 Ingesting ${parsedUnits.length} parsed units with photos into memory & Airtable...`);
  const result = await batchIngestListings(airtableCfg, parsedUnits, { concurrency: 10, deduplicate: true });
  console.log(`✅ Chat ingestion complete: ${result.succeeded} units ingested (${result.duplicates} duplicates skipped).`);

  // Staging for Next.js live map & inventory API
  try {
    const stagePath = path.join(__dirname, '../apps/sierra-estates-realty/data/whatsapp-ingested-units.json');
    fs.mkdirSync(path.dirname(stagePath), { recursive: true });
    let existingUnits: any[] = [];
    if (fs.existsSync(stagePath)) {
      try {
        existingUnits = JSON.parse(fs.readFileSync(stagePath, 'utf-8'));
      } catch {
        existingUnits = [];
      }
    }
    const merged = [...parsedUnits, ...existingUnits];
    // Deduplicate by sierraCode
    const unique = Array.from(new Map(merged.map((u) => [u.sierraCode, u])).values());
    fs.writeFileSync(stagePath, JSON.stringify(unique, null, 2), 'utf-8');
    console.log(`📍 Staged ${unique.length} units into whatsapp-ingested-units.json for interactive live map.`);
  } catch (err) {
    console.warn('Could not stage to whatsapp-ingested-units.json:', err);
  }

  return result;
}

// Direct execution from CLI
const isMain = process.argv[1] && process.argv[1].endsWith('extract-whatsapp-chat.ts');
if (isMain) {
  const args = process.argv.slice(2);
  const targetFile = args[0] || path.join(__dirname, '../data/sample_chat_export.txt');
  const customGroup = args[1];

  if (!fs.existsSync(targetFile)) {
    // Generate a demo chat export with photos for verification
    const sampleChat = `
[24/08/2026, 10:15:22 AM] Mohamed Fouad (Direct Owner): للبيع في هايد بارك التجمع الخامس شقة 190 متر 3 غرف نوم و 3 حمام تشطيب الترا سوبر لوكس فيو بحري فيو لاند سكيب. السعر 11,500,000 كاش بدون عمولة من المالك مباشرة 01012345678 <attached: 00000012-PHOTO-2026-08-24-10-15-22.jpg>
[24/08/2026, 11:20:45 AM] Karim Broker: مطلوب مشتري كاش لفيلا مستقلة في ميفيدا إعمار 500م مباني سعر 48 مليون تواصل 01198765432 https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80
[24/08/2026, 12:05:10 PM] Sarah Owner: للايجار مفروش في مدينتي B10 شقة 140م دور تالت فيو وايد جاردن 3 غرف 2 حمام مكيفة بالكامل 38 الف شهريا للتواصل 01234567890 IMG-20260824-WA0003.jpg (file attached)
    `.trim();
    const demoPath = path.join(__dirname, '../apps/sierra-estates-realty/data/sample_chat_export.txt');
    fs.mkdirSync(path.dirname(demoPath), { recursive: true });
    fs.writeFileSync(demoPath, sampleChat, 'utf-8');
    extractAndIngestChatFile(demoPath, 'WhatsApp Demo Direct Owners')
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else {
    extractAndIngestChatFile(targetFile, customGroup)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
      });
  }
}
