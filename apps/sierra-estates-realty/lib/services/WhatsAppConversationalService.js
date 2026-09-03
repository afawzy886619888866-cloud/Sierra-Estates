 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRecord, insertRecord, listRecords, updateRecord, upsertRecord } from "@sierra-estates/db";
import { COLLECTIONS } from "../models/schema";
import { logger } from '@/lib/logger';
import { sharedMemory } from '../../../../packages/memory-engine/src/index.js';

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);














/** The lead row for a phone number, or null. `phone` is not unique in the
 *  schema, so the most recent match wins — same as Firestore's single doc. */
async function findStakeholderByPhone(phone) {
  const rows = await listRecords(COLLECTIONS.stakeholders, {
    where: [{ column: 'phone', value: phone }],
    orderBy: { column: 'createdAt', ascending: false },
    limit: 1,
  });
  return _nullishCoalesce(rows[0], () => ( null));
}

export class WhatsAppConversationalService {
   static  __initStatic() {this.SYSTEM_PROMPT = `
You are Hermes, the elite real estate Closer and Senior Private Client Advisor for Sierra Estates (سييرا العقارية), the premier luxury brokerage in Egypt.

CORE IDENTITY & KNOWLEDGE:
1. BILINGUAL MASTERY: You speak natural, sophisticated Egyptian Arabic (اللهجة المصرية الراقية) and polished English. Always reply in the same language the client used.
2. MASTER INVENTORY EXPERTISE: You have direct access to Sierra Estates' Master Inventory across prime New Cairo, Golden Square, Zayed, October, and North Coast compounds:
   - Mivida (Emaar): Resale & primary standalone villas, townhouses, apartments (avg 90K-140K EGP/sqm).
   - Hyde Park (New Cairo): Prime park-view apartments, twin houses, villas (avg 55K-85K EGP/sqm).
   - Mountain View (iCity, Hyde Park, Chillout Park, Ras El Hekma): Lagoon & iVillas.
   - Villette (Sodic): Sky condos, standalone villas, townhouses in Golden Square.
   - Palm Hills (New Cairo, October, Bamboo, The Crown): Luxury estates & golf residences.
   - Uptown Cairo (Emaar Mokattam): Golf residences & panoramic city-view penthouses.
   - Madinaty & Rehab: Furnished & unfurnished rentals, prime resale phases (B10, B11, B12).
   - Swan Lake (Hassan Allam) & Katameya Dunes: Ultra-luxury gated compounds.
3. CONVERSATIONAL TACTICS (THE CLOSER):
   - Qualify the buyer's budget, preferred compound, unit type, and delivery timeline (immediate resale vs off-plan installments).
   - If they are an owner asking to list a property, warmly collect the unit details (compound, area, price, finish, phone) and assure them of zero-spam discreet marketing.
   - Gently guide serious inquiries toward booking a private viewing or connecting with their dedicated Sierra Estates Senior Portfolio Manager.
   - Never fabricate non-existent units; quote verified market price ranges from the Master Inventory.
   - Keep responses concise, warm, and formatted cleanly for WhatsApp (use line breaks, bullet points, and minimal emojis).
`}

  /**
   * Processes a direct message using ECC Memory.
   */
  static async processDirectMessage(message, sender) {
    if (!API_KEY) {
      logger.error("❌ [ConversationalService] No API key found for Gemini.");
      return "I'm currently undergoing maintenance, but our human agents will be with you shortly.";
    }

    try {
      // Keyed by phone number, as the Firestore document was.
      const chat = await getRecord(
        'whatsapp_conversations',
        sender,
        'phone_number'
      );
      const history = _optionalChain([chat, 'optionalAccess', _2 => _2.messages]) || [];

      // We only want the last 15 messages for context window efficiency (ECC short-term memory)
      const recentHistory = history.slice(-15);

      // Build Gemini History Format
      const geminiHistory = recentHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      // Unified Memory: Fetch Stakeholder Profile & Inject RAG Inventory Context
      const cleanPhone = sender.replace(/[^0-9+]/g, '');
      const stakeholder = await findStakeholderByPhone(cleanPhone);

      let dynamicSystemPrompt = this.SYSTEM_PROMPT;

      if (stakeholder) {
        const data = stakeholder;
        const prefs = _nullishCoalesce(_optionalChain([data, 'access', _3 => _3.aiProfiling, 'optionalAccess', _4 => _4.preferences]), () => ( {}));
        const budget = prefs.budget;
        const compound = prefs.compound;
        const unitType = prefs.unitType;

        dynamicSystemPrompt += `\n\nCLIENT CONTEXT (MEMORY):\n- Name: ${data.fullName || 'Unknown'}\n- Budget: ${budget || 'Unknown'} EGP\n- Preferences: ${compound || 'Any compound'}, ${unitType || 'any unit'}\n- AI Notes: ${data.summaryNotes || 'New lead'}`;
        
        const { RagInventoryService } = await import('./rag-inventory-service');
        const ragContext = await RagInventoryService.getMatchedInventoryContext(budget, compound, unitType);
        
        dynamicSystemPrompt += `\n\n${ragContext}`;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash", systemInstruction: dynamicSystemPrompt });
      
      const chatSession = model.startChat({
        history: geminiHistory,
        generationConfig: {
          maxOutputTokens: 250,
          temperature: 0.7,
        },
      });

      logger.info(`💬 Generating AI response for ${sender}...`);
      
      const aiPromise = (async () => {
        const result = await chatSession.sendMessage(message);
        return result.response.text();
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI response timed out')), 4000)
      );

      let replyText;
      try {
        replyText = await Promise.race([aiPromise, timeoutPromise]);
      } catch (e) {
        replyText = `Welcome to Sierra Estates! I have logged your inquiry regarding "${message.slice(0, 60)}...". Our dedicated New Cairo portfolio advisor is reviewing the master inventory and will share verified options with you shortly.`;
      }

      // Update ECC Memory
      const newUserMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };
      const newModelMsg = { role: 'model', content: replyText, timestamp: new Date().toISOString() };
      
      const updatedMessages = [...history, newUserMsg, newModelMsg];
      
      try {
        await Promise.race([
          upsertRecord('whatsapp_conversations', {
            phoneNumber: sender,
            lastActive: new Date().toISOString(),
            messages: updatedMessages,
          }, 'phone_number'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database write timeout')), 2000)),
        ]);
      } catch (e2) {
        // Local dev or offline mode
      }

      // Update Shared Memory Bus for Multi-Agent Pipeline Visibility
      try {
        await sharedMemory.write(
          `conversation:${sender}:last_turn`,
          {
            userMessage: message,
            modelReply: replyText,
            timestamp: new Date().toISOString(),
          },
          { author: 'hermes', tags: ['whatsapp', 'conversation', sender] }
        );
      } catch (e3) {}

      logger.info(`✅ AI Response sent and saved to ECC memory & Shared Memory Bus for ${sender}`);

      // Asynchronous Lead Qualification & CRM Upsert (non-blocking)
      this.qualifyAndSyncLead(sender, updatedMessages).catch(err => {
        logger.error(`⚠️ [WhatsAppConversationalService] Lead sync error for ${sender}:`, err);
      });

      return replyText;

    } catch (error) {
      logger.error("❌ Neural Conversation Fallback:", error);
      return `Welcome to Sierra Estates! We received your message: "${message.slice(0, 50)}...". A senior luxury portfolio advisor will connect with you momentarily.`;
    }
  }

  /**
   * Background AI Lead Qualification & CRM Ingestion
   */
   static async qualifyAndSyncLead(sender, messages) {
    if (messages.length < 2) return;

    try {
      const recentHistoryText = messages
        .slice(-10)
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      const prompt = `Analyze this real estate WhatsApp conversation and extract structured lead intelligence.
CONVERSATION:
${recentHistoryText}

Respond ONLY with a JSON object:
{
  "isQualified": boolean,
  "clientName": string,
  "intent": "buyer" | "seller" | "renter" | "investor" | "general",
  "compound": string,
  "unitType": "apartment" | "villa" | "townhouse" | "duplex" | "penthouse" | "chalet" | "commercial" | "any",
  "budgetEGP": number,
  "priorityScore": number (1-100),
  "urgency": "immediate" | "soon" | "casual",
  "summary": string
}`;

      const res = await model.generateContent(prompt);
      const text = (await res.response).text().replace(/```json|```/g, "").trim();
      const intel = JSON.parse(text);

      if (intel.isQualified) {
        const cleanPhone = sender.replace(/[^0-9+]/g, '');
        const existing = await findStakeholderByPhone(cleanPhone);

        // Firestore keyed the lead document by phone number, which made this an
        // upsert for free. `leads.id` is a generated id with `phone` as an
        // ordinary column, so the row is looked up first. Two qualifying
        // messages from the same unknown number arriving together could both
        // insert; the intake routes have always had that same race.
        const leadData = {
          fullName: intel.clientName && intel.clientName !== 'unknown'
            ? intel.clientName
            : (_optionalChain([existing, 'optionalAccess', _5 => _5.fullName]) || `WhatsApp Client (${cleanPhone.slice(-4)})`),
          phone: cleanPhone,
          channel: 'whatsapp',
          status: 'qualified',
          leadScore: intel.priorityScore || 70,
          summaryNotes: intel.summary,
          // `intent` and `preferences` are not columns; they live in the
          // ai_profiling JSONB alongside whatever profiling already wrote.
          aiProfiling: {
            ...(_nullishCoalesce(_optionalChain([existing, 'optionalAccess', _6 => _6.aiProfiling]), () => ( {}))),
            intent: intel.intent,
            preferences: {
              compound: intel.compound || 'Any',
              unitType: intel.unitType || 'any',
              budget: intel.budgetEGP || 0,
              urgency: intel.urgency || 'soon',
            },
          },
        };

        if (existing) {
          await updateRecord(COLLECTIONS.stakeholders, existing.id, leadData);
        } else {
          await insertRecord(COLLECTIONS.stakeholders, leadData);
        }
        logger.info(`🎯 [CRM] Upserted WhatsApp lead for ${cleanPhone} (Score: ${intel.priorityScore})`);

        // Broadcast qualified lead intelligence to SharedMemoryBus for all 5 agents (Liela, Sierra, OpenClaw, Hermes, Closer)
        await sharedMemory.write(
          `lead:${cleanPhone}:intelligence`,
          leadData,
          { author: 'liela', tags: ['lead_intel', 'qualified', cleanPhone] }
        );

        // If high priority (Score >= 80 or budget >= 15M EGP), notify Brokers via Telegram
        if (intel.priorityScore >= 80 || (intel.budgetEGP && intel.budgetEGP >= 15000000)) {
          const { TelegramAlertService } = await import('./telegram-alert-service');
          await TelegramAlertService.sendVipMatchAlert({
            leadName: leadData.fullName,
            propertyTitle: `${intel.compound || 'Luxury Compound'} (${intel.unitType || 'Prime Asset'})`,
            matchScore: intel.priorityScore,
            budget: intel.budgetEGP ? `${(intel.budgetEGP / 1000000).toFixed(1)}M EGP` : 'Flexible / High Net Worth',
            proposalUrl: `https://admin.sierra-estates.net/leads`,
            roi: 'High Propensity'
          });
        }
      }
    } catch (err) {
      logger.warn(`Could not qualify lead for ${sender}:`, err);
    }
  }
} WhatsAppConversationalService.__initStatic();
