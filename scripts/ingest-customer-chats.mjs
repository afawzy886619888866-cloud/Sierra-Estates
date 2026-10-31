'use strict';
/**
 * scripts/ingest-customer-chats.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Ingests and parses raw WhatsApp chat exports from data/customer-chat-history/,
 * feeds inbound client inquiries through workflows/lib/customer-chat-learner.js,
 * updates .state/customer-chat-learnings.jsonl, and generates docs/CLIENT_CONVERSATIONAL_LEARNINGS.md.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { studyCustomerChat, generateConversationalLearningsMarkdown } = require('../workflows/lib/customer-chat-learner.js');

const CHATS_DIR = path.join(__dirname, '..', 'data', 'customer-chat-history');

function parseWhatsAppExport(fileContent, defaultChatId) {
  const lines = fileContent.split(/\r?\n/);
  const messages = [];
  let currentMsg = null;

  // Handles: M/D/YY, H:MM AM - Sender: Body (including narrow non-breaking space \u202F)
  const headerRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?[\s\u202F]?[APap][Mm])\s+-\s+([^:]+):\s+(.*)$/;

  for (const line of lines) {
    const match = line.match(headerRegex);
    if (match) {
      if (currentMsg) {
        messages.push(currentMsg);
      }
      const sender = match[3].trim();
      const body = match[4].trim();
      const isOutgoing = /^(sierra|ahmed\s*fawzy|abeer|menna)/i.test(sender);

      currentMsg = {
        chatId: defaultChatId,
        sender,
        body,
        fromMe: isOutgoing,
        isGroup: false,
      };
    } else if (currentMsg) {
      currentMsg.body += '\n' + line;
    }
  }

  if (currentMsg) {
    messages.push(currentMsg);
  }

  return messages;
}

async function main() {
  if (!fs.existsSync(CHATS_DIR)) {
    console.error(`Chats directory not found: ${CHATS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(CHATS_DIR).filter((f) => f.endsWith('.txt'));
  console.log(`[Customer Chat Ingestion] Found ${files.length} chat logs in ${CHATS_DIR}`);

  let totalParsed = 0;
  let totalLearned = 0;

  for (const file of files) {
    const filePath = path.join(CHATS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const chatId = file.replace(/WhatsApp Chat with\s*/i, '').replace(/\.txt$/i, '').trim();

    const messages = parseWhatsAppExport(content, chatId);
    totalParsed += messages.length;

    let fileLearned = 0;
    for (const msg of messages) {
      if (msg.fromMe) continue;
      if (/^<Media omitted>$/i.test(msg.body.trim())) continue;

      const res = await studyCustomerChat(msg, { skipDb: true });
      if (res.learned) {
        fileLearned++;
        totalLearned++;
      }
    }

    console.log(`- ${file}: ${messages.length} messages -> ${fileLearned} actionable learning events`);
  }

  const report = generateConversationalLearningsMarkdown();
  console.log(`\n✅ Ingestion Complete!`);
  console.log(`- Total Messages Processed: ${totalParsed}`);
  console.log(`- Actionable Inbound Needs Captured: ${totalLearned}`);
  console.log(`- Documentation Generated: ${report.outputPath}`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
