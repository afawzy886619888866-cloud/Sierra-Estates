import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenClawAgent } from '../packages/agents/openclaw';

import { batchIngestListings, } from '../packages/agents/tools/inventoryTools';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);








/**
 * Parses raw WhatsApp exported chat text (.txt) into structured message objects.
 * Handles both Android and iOS WhatsApp export formats:
 * - "[24/08/2026, 12:30:15 PM] Ahmed (Owner): Villa for sale..."
 * - "24/08/2026, 12:30 - Ahmed (Owner): Villa for sale..."
 * - "8/24/26, 12:30 PM - Ahmed (Owner): Villa for sale..."
 */
export function parseRawWhatsAppChatLog(rawContent, defaultGroupName = 'WhatsApp Chat Export') {
  const lines = rawContent.split(/\r?\n/);
  const messages = [];
  let currentMsg = null;

  // Regex patterns for WhatsApp timestamps
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
 * Filter messages that contain real estate listing signals.
 */
export function filterRealEstateMessages(messages) {
  const realEstateKeywords = [
    'للبيع', 'للايجار', 'شقة', 'فيلا', 'توين', 'تاون', 'دوبلكس', 'بنتهاوس', 'استلام',
    'مطلوب', 'مساحة', 'متر', 'م2', 'غرف', 'حمام', 'سعر', 'مليون', 'الف', 'مقدم',
    'اقساط', 'تشطيب', 'مدينتي', 'الرحاب', 'ميفيدا', 'هايد بارك', 'سوديك', 'بالم هيلز',
    'التجمع', 'sale', 'rent', 'villa', 'apartment', 'duplex', 'penthouse', 'compound'
  ];

  return messages.filter((msg) => {
    const lower = msg.text.toLowerCase();
    const matchesKeyword = realEstateKeywords.some((kw) => lower.includes(kw));
    // Exclude system messages like "Messages and calls are end-to-end encrypted"
    const isSystemMsg = lower.includes('end-to-end encrypted') || lower.includes('changed the subject') || lower.includes('security code changed');
    return matchesKeyword && !isSystemMsg;
  });
}

/**
 * Main chat extractor CLI & programmatic runner.
 */
export async function extractAndIngestChatFile(filePath, groupName) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Chat file not found at: ${filePath}`);
  }

  const resolvedGroupName = groupName || path.basename(filePath, path.extname(filePath));
  console.log(`\n📂 Reading WhatsApp chat export: ${filePath} (Group: ${resolvedGroupName})`);
  
  const rawText = fs.readFileSync(filePath, 'utf-8');
  const allMessages = parseRawWhatsAppChatLog(rawText, resolvedGroupName);
  console.log(`💬 Parsed ${allMessages.length} total chat messages.`);

  const listingMessages = filterRealEstateMessages(allMessages);
  console.log(`🏢 Identified ${listingMessages.length} real estate listing messages.`);

  if (listingMessages.length === 0) {
    console.log('ℹ️ No real estate listings detected in this chat export.');
    return { total: 0, succeeded: 0 };
  }

  const agent = new OpenClawAgent({
    airtableApiKey: process.env.AIRTABLE_API_KEY || '',
    airtableBaseId: process.env.AIRTABLE_BASE_ID || '',
    airtableTableName: process.env.AIRTABLE_TABLE_NAME || 'Listings',
    aiApiKey: process.env.GOOGLE_GENAI_API_KEY || '',
  });
  const parsedUnits = listingMessages.map((m, idx) => {
    const parsed = agent.parseWhatsAppRealEstateText(m.text, m.sender, m.groupName, undefined, m.timestamp);
    const sierraCode = `WA-CHAT-${Date.now().toString(36).toUpperCase()}-${idx + 1}`;
    return {
      ...parsed,
      sierraCode: parsed.sierraCode || sierraCode,
    };
  });

  console.log(`🔄 Ingesting ${parsedUnits.length} parsed units into Obsidian & master store...`);
  const result = await batchIngestListings({}, parsedUnits, { concurrency: 10, deduplicate: true });
  console.log(`✅ Chat ingestion complete: ${result.succeeded} units ingested (${result.duplicates} duplicates skipped).`);

  return result;
}

// Direct execution from CLI
const isMain = process.argv[1] && process.argv[1].endsWith('extract-whatsapp-chat.ts');
if (isMain) {
  const args = process.argv.slice(2);
  const targetFile = args[0] || path.join(__dirname, '../data/sample_chat_export.txt');
  const customGroup = args[1];

  if (!fs.existsSync(targetFile)) {
    // Generate a demo chat export file for verification
    const sampleChat = `
[24/08/2026, 10:15:22 AM] Mohamed Fouad (Direct Owner): للبيع في هايد بارك التجمع الخامس شقة 190 متر 3 غرف نوم و 3 حمام تشطيب الترا سوبر لوكس فيو بحري فيو لاند سكيب. السعر 11,500,000 كاش بدون عمولة من المالك مباشرة 01012345678
[24/08/2026, 11:20:45 AM] Karim Broker: مطلوب مشتري كاش لفيلا مستقلة في ميفيدا إعمار 500م مباني سعر 48 مليون تواصل 01198765432
[24/08/2026, 12:05:10 PM] Sarah Owner: للايجار مفروش في مدينتي B10 شقة 140م دور تالت فيو وايد جاردن 3 غرف 2 حمام مكيفة بالكامل 38 الف شهريا للتواصل 01234567890
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
