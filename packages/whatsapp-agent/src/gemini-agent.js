/**
 * GeminiAgent — wraps Google Gemini AI for contextual WhatsApp conversations.
 * 
 * System prompt is loaded with Sierra Estates context:
 *   - Property database summary
 *   - Market knowledge
 *   - Admin capabilities
 *   - Arabic/English bilingual support
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SIERRA_SYSTEM_PROMPT = `You are the official AI Senior Consultant for **Sierra Estates Realty** (New Cairo, Egypt).

## Language & Persona Rules
- Always mirror the client's language: If Arabic (Egyptian dialect/مصرى), reply in natural, polite Egyptian Arabic. If English, reply in professional, upscale English.
- Tone: Warm, helpful, executive, and direct (no generic bot fluff).
- Length: Concise for WhatsApp (max 2-3 short paragraphs).

## Lead Ingestion & Qualification Protocol (Property Finder Inquiries)

### Stage 1: Initial Inquiry & Availability Check
When a lead asks about a specific unit ([UNIT_REF] / [PROPERTY_NAME]):
- Acknowledge the unit politely.
- Clarify that you are verifying availability with the owner/developer right away.
- Ask for their viewing preferences:
  1. Preferred viewing day & time (الميعاد الأنسب للمعاينة).
  2. Target move-in date (تاريخ الاستلام/الانتقال المناسب).
  3. Desired contract / lease duration (مدة التعاقد أو الإيجار المتوقعة).

### Stage 2: Preferences Qualification (Alternative Matching)
After the client shares viewing preferences or expresses interest in exploring options:
- Confirm that coordination with the owner is in progress.
- Politely ask for search criteria to match alternatives from the database:
  1. Budget Range (الميزانية التقريبية).
  2. Preferred locations/compounds in New Cairo (المناطق المفضلة).
  3. Bedroom count & furnishing status (عدد الغرف ومفروش ولا لأ).

### Stage 3: Structured Extraction Flag
When the lead provides sufficient qualification data, generate a hidden structured JSON payload at the end of your response inside <lead_qualification> tags so the backend can trigger admin notifications and CRM matching:
<lead_qualification>
{
  "lead_ready": true,
  "preferred_viewing": "...",
  "move_in_date": "...",
  "duration": "...",
  "budget": "...",
  "locations": ["..."],
  "bedrooms": "...",
  "furnished": true/false
}
</lead_qualification>

## Knowledge Base & Compounds
- Compounds: Mountain View iCity, Hyde Park, Mivida, Villette (SODIC), Palm Hills, Swan Lake, Eastown, Katameya Heights, The Waterway, District 5, Zed East, CFC Residences, etc.
- Always consult the injected Obsidian Memory / Context notes before replying to pricing or compound-specific questions.
`;

const memoryService = require('./memory-service');

class GeminiAgent {
  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || 
                   process.env.GOOGLE_GENAI_API_KEY || 
                   process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY ||
                   process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
          systemInstruction: SIERRA_SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 512,   // keep WhatsApp responses concise
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        });
        console.log('✅ Gemini AI initialized — model:', process.env.GEMINI_MODEL || 'gemini-2.0-flash');
      } catch (e) {
        console.warn('⚠️ Gemini AI initialization issue, using fallback mode:', e.message);
        this.model = null;
      }
    } else {
      console.warn('⚠️ No GOOGLE_AI_API_KEY / GEMINI_API_KEY found in .env — running in Sierra concierge rule-based mode.');
      this.model = null;
    }
  }

  /**
   * Send a chat message and get a response.
   * @param {string} userMessage - The incoming WhatsApp message
   * @param {Array}  history     - [{role: 'user'|'model', parts: [{text}]}]
   * @param {Object} ctx         - { isAdmin, senderName, senderPhone }
   */
  async chat(userMessage, history = [], ctx = {}) {
    try {
      const phone = ctx.senderPhone || 'unknown';
      const senderName = ctx.senderName || 'Client';

      // 1. Record incoming message into Unified Memory Bus
      if (phone !== 'unknown') {
        await memoryService.recordClientMessage(phone, senderName, userMessage);
      }

      // 2. Fetch memory context + Obsidian Vault knowledge
      const memContext = await memoryService.getContextForClient(phone, userMessage);

      // Build Gemini-compatible history from passed history or memory bus
      const combinedHistory = (memContext.conversationHistory && memContext.conversationHistory.length > 0)
        ? memContext.conversationHistory
        : history;

      const geminiHistory = combinedHistory.slice(-20).map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text || h.content || '' }],
      }));

      if (!this.model) {
        const isArabic = /[\u0600-\u06FF]/.test(userMessage);
        const fallbackReply = isArabic
          ? `أهلاً بك يا ${senderName} في سييرا إستيتس! 🌟\n\nيسعدنا مساعدتك في تلبية طلبك العقاري في القاهرة الجديدة. تم تسجيل استفسارك وسيتواصل معك مستشارك العقاري المختص فوراً.\n\n*Sierra Estates — Beyond Brokerage*`
          : `Hello ${senderName}! 🌟\n\nWelcome to Sierra Estates. We have received your inquiry and our senior property advisor will reach out to you shortly.\n\n*Sierra Estates — Beyond Brokerage*`;
        if (phone !== 'unknown') {
          await memoryService.recordAgentResponse(phone, fallbackReply);
        }
        return fallbackReply;
      }

      const chatSession = this.model.startChat({
        history: geminiHistory,
      });

      // Inject Knowledge Snippets if available
      let extraKnowledge = '';
      if (memContext.knowledgeSnippets && memContext.knowledgeSnippets.length > 0) {
        extraKnowledge = `\n\n[RELEVANT SIERRA KNOWLEDGE]\n${memContext.knowledgeSnippets.join('\n\n')}\n`;
      }

      const contextPrefix = ctx.isAdmin
        ? `[ADMIN: ${senderName}] `
        : `[CLIENT: ${senderName}] `;

      const promptWithContext = contextPrefix + userMessage + extraKnowledge;

      const result = await chatSession.sendMessage(promptWithContext);
      const response = result.response.text();

      // 3. Record bot response into Unified Memory Bus
      if (phone !== 'unknown' && response) {
        await memoryService.recordAgentResponse(phone, response);
      }

      return response || 'I apologize, I couldn\'t generate a response. Please try again.';
    } catch (err) {
      console.error('❌ Gemini API error:', err.message);
      if (err.message?.includes('quota')) {
        return '⚠️ I\'m temporarily at capacity. Please try again in a moment.';
      }
      return '🙏 I\'m having a brief hiccup. Please resend your message.';
    }
  }

  /**
   * Quick single-turn question (no history) — for commands/reports.
   */
  async ask(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.error('❌ Gemini ask error:', err.message);
      return null;
    }
  }
}

module.exports = { GeminiAgent, SIERRA_SYSTEM_PROMPT };
