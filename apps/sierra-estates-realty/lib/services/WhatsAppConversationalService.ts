import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from '@/lib/logger';

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

interface ECCMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

export class WhatsAppConversationalService {
  private static readonly SYSTEM_PROMPT = `
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
`;

  /**
   * Processes a direct message using ECC Memory.
   */
  static async processDirectMessage(message: string, sender: string): Promise<string> {
    if (!API_KEY) {
      logger.error("❌ [ConversationalService] No API key found for Gemini.");
      return "I'm currently undergoing maintenance, but our human agents will be with you shortly.";
    }

    try {
      const chatRef = adminDb.collection('whatsapp_conversations').doc(sender);
      const chatDoc = await chatRef.get();
      
      let history: ECCMessage[] = [];
      if (chatDoc.exists) {
        history = chatDoc.data()?.messages || [];
      }

      // We only want the last 15 messages for context window efficiency (ECC short-term memory)
      const recentHistory = history.slice(-15);

      // Build Gemini History Format
      const geminiHistory = recentHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: this.SYSTEM_PROMPT });
      
      const chatSession = model.startChat({
        history: geminiHistory,
        generationConfig: {
          maxOutputTokens: 250,
          temperature: 0.7,
        },
      });

      logger.info(`💬 Generating AI response for ${sender}...`);
      const result = await chatSession.sendMessage(message);
      const replyText = result.response.text();

      // Update ECC Memory
      const newUserMsg: ECCMessage = { role: 'user', content: message, timestamp: Timestamp.now() };
      const newModelMsg: ECCMessage = { role: 'model', content: replyText, timestamp: Timestamp.now() };
      
      const updatedMessages = [...history, newUserMsg, newModelMsg];
      
      await chatRef.set({
        phoneNumber: sender,
        lastActive: Timestamp.now(),
        messages: updatedMessages,
      }, { merge: true });

      logger.info(`✅ AI Response sent and saved to ECC memory for ${sender}`);

      // Asynchronous Lead Qualification & CRM Upsert (non-blocking)
      this.qualifyAndSyncLead(sender, updatedMessages).catch(err => {
        logger.error(`⚠️ [WhatsAppConversationalService] Lead sync error for ${sender}:`, err);
      });

      return replyText;

    } catch (error) {
      logger.error("❌ Neural Conversation Failure:", error);
      return "I'm having a little trouble connecting to my database right now. One of our senior brokers will reach out to you shortly.";
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

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
        const leadRef = adminDb.collection('stakeholders').doc(cleanPhone);
        const existingSnap = await leadRef.get();

        const leadData = {
          name: intel.clientName && intel.clientName !== 'unknown' ? intel.clientName : (existingSnap.data()?.name || `WhatsApp Client (${cleanPhone.slice(-4)})`),
          phone: cleanPhone,
          channel: 'whatsapp',
          status: 'qualified',
          intent: intel.intent,
          priorityScore: intel.priorityScore || 70,
          preferences: {
            compound: intel.compound || 'Any',
            unitType: intel.unitType || 'any',
            budget: intel.budgetEGP || 0,
            urgency: intel.urgency || 'soon',
          },
          aiSummary: intel.summary,
          updatedAt: Timestamp.now(),
          createdAt: existingSnap.exists ? existingSnap.data()?.createdAt : Timestamp.now(),
        };

        await leadRef.set(leadData, { merge: true });
        logger.info(`🎯 [CRM] Upserted WhatsApp lead for ${cleanPhone} (Score: ${intel.priorityScore})`);

        // If high priority (Score >= 80 or budget >= 15M EGP), notify Brokers via Telegram
        if (intel.priorityScore >= 80 || (intel.budgetEGP && intel.budgetEGP >= 15000000)) {
          const { TelegramAlertService } = await import('./telegram-alert-service');
          await TelegramAlertService.sendVipMatchAlert({
            leadName: leadData.name,
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
