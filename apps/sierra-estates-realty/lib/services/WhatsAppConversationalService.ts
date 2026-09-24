import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRecord, insertRecord, listRecords, updateRecord, upsertRecord } from "@sierra-estates/db";
import { COLLECTIONS } from "../models/schema";
import { logger } from '@/lib/logger';
import { sharedMemory } from '@sierra-estates/memory-engine';

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

interface ECCMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

interface StakeholderRow {
  id: string;
  fullName?: string;
  summaryNotes?: string;
  aiProfiling?: Record<string, any>;
}

/** The lead row for a phone number, or null. `phone` is not unique in the
 *  schema, so the most recent match wins — same as Firestore's single doc. */
async function findStakeholderByPhone(phone: string): Promise<StakeholderRow | null> {
  const rows = await listRecords<StakeholderRow>(COLLECTIONS.stakeholders, {
    where: [{ column: 'phone', value: phone }],
    orderBy: { column: 'createdAt', ascending: false },
    limit: 1,
  });
  return rows[0] ?? null;
}

export class WhatsAppConversationalService {
  private static readonly SYSTEM_PROMPT = `
You are Sierra Blue AI Advisor (Hermes), the elite real estate Advisor and Senior Private Client Closer for Sierra Estates / Sierra Blue (سييرا العقارية / سييرا بلو), the premier luxury brokerage in Egypt.

═══════════════════════════════════════════════════════════════════════════
📋 IDENTITY & CORE PHILOSOPHY: "ما وراء الوساطة (Beyond Brokerage)"
═══════════════════════════════════════════════════════════════════════════
- We don't just sell or rent units; we advise clients with 100% honesty and data-backed market intelligence.
- GOLDEN RULE: Absolute transparency on unit availability (متاحة / مؤجرة / تم حجزها). Never string a client along on a stale or taken listing.
- When an inquired listing is taken, pivot constructively to verified alternatives from the Master Inventory.
- SIGNATURE TONE: Warm, polished Egyptian Arabic (اللهجة المصرية الراقية) or refined English. "مع سييرا... أسهل، أسرع، وأصدق 🎯".

═══════════════════════════════════════════════════════════════════════════
🔄 6-STEP CONVERSATIONAL WORKFLOW
═══════════════════════════════════════════════════════════════════════════
1. STEP 1 (Greeting & Timeline): Warmly welcome the client, acknowledge their inquiry/code, and gently ask when they plan to move and desired rental duration / purchase timeline.
2. STEP 2 & 3 (Availability Report): Check the unit code/link against the verified inventory and report status transparently (Location, Type, Bedrooms, Furnishing, Price in EGP).
3. STEP 4 (Discovery Pivot): If the property is taken or the client is exploring, qualify their exact needs (Apartment vs Villa vs Duplex, # of bedrooms, furnishing level, preferred compound/area, budget).
4. STEP 5 (Scheduling Automation): Propose 2-3 specific viewing time slots (e.g. tomorrow afternoon or weekend) to see the top matched properties in a single curated tour.
5. STEP 6 (Human Handover): Confirm appointment or summarize needs, assuring the client that their dedicated Senior Portfolio Manager will reach out within the hour.

═══════════════════════════════════════════════════════════════════════════
📍 MASTER INVENTORY EXPERTISE:
═══════════════════════════════════════════════════════════════════════════
You have direct access to Sierra's 25,000+ listing Master Inventory across prime New Cairo, Golden Square, Zayed, October, and North Coast:
- Mivida, Hyde Park, Mountain View (iCity/Hyde Park), Villette (Sodic), Palm Hills, Uptown Cairo, Swan Lake, Madinaty, Rehab.
- Keep WhatsApp messages concise (3-4 sentences max per bubble), well-spaced with clear bullet points and clean emojis (📍, 🏠, 💰, 🛏️, ✓, 📅).
`;

  /**
   * Processes a direct message using ECC Memory.
   */
  static async processDirectMessage(message: string, sender: string): Promise<string> {
    if (!API_KEY) {
      logger.error("❌ [ConversationalService] No API key found for Gemini.");
      return "نعتذر، نقوم حالياً بأعمال صيانة قصيرة، وسيتواصل معك فريقنا البشري في أقرب وقت. 🙏\nWe're briefly undergoing maintenance — our human team will be with you shortly.";
    }

    try {
      // Keyed by phone number, as the Firestore document was.
      const chat = await getRecord<{ messages?: ECCMessage[] }>(
        'whatsapp_conversations',
        sender,
        'phone_number'
      );
      const history: ECCMessage[] = chat?.messages || [];

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
        const prefs = data.aiProfiling?.preferences ?? {};
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

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('AI response timed out')), 4000)
      );

      let replyText: string;
      try {
        replyText = await Promise.race([aiPromise, timeoutPromise]);
      } catch {
        replyText = `Welcome to Sierra Estates! I have logged your inquiry regarding "${message.slice(0, 60)}...". Our dedicated New Cairo portfolio advisor is reviewing the master inventory and will share verified options with you shortly.`;
      }

      // Update ECC Memory
      const newUserMsg: ECCMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
      const newModelMsg: ECCMessage = { role: 'model', content: replyText, timestamp: new Date().toISOString() };
      
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
      } catch {
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
      } catch {}

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
  private static async qualifyAndSyncLead(sender: string, messages: ECCMessage[]): Promise<void> {
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
            : (existing?.fullName || `WhatsApp Client (${cleanPhone.slice(-4)})`),
          phone: cleanPhone,
          channel: 'whatsapp',
          status: 'qualified',
          leadScore: intel.priorityScore || 70,
          summaryNotes: intel.summary,
          // `intent` and `preferences` are not columns; they live in the
          // ai_profiling JSONB alongside whatever profiling already wrote.
          aiProfiling: {
            ...(existing?.aiProfiling ?? {}),
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
}
