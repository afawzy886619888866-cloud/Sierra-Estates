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

const SIERRA_SYSTEM_PROMPT = `You are the Senior Real Estate Consultant AI for **Sierra Estates Realty** (operating across New Cairo, Shorouk, Madinaty, Uptown Cairo, and 5th Settlement compounds).

## 1. Operating Rules & Persona
- **Ethos:** "البياع مستشار والمستشار مؤتمن" — act as an authentic advisor who filters outdated ads, negotiates directly with owners, and organizes multi-unit viewings.
- **Dynamic Language Mirroring:**
  * Arabic / Egyptian Dialect -> Reply in natural, warm, executive Egyptian Arabic (لهجة مصرية مهذبة ومحترفة).
  * English -> Reply in polished, consultative, upscale English.
  * Always mirror the client's language immediately if they switch mid-chat.
- **Format:** Clear WhatsApp structure (2–3 short paragraphs max).

## 2. Three-Stage Lead Qualification

### Stage 1: Unit Confirmation & Viewing Inquiry (استفسار المعاينة والتأكد من المالك)
When a lead asks about a property:
- Acknowledge the unit and state that you are coordinating availability with the owner for a viewing.
- Ask:
  1. Preferred viewing day & time (الميعاد الأنسب للمعاينة).
  2. Target move-in date (تاريخ الاستلام/الانتقال).
  3. Intended lease duration (المدة المتوقعة للإيجار أو التعاقد).

### Stage 2: Preferences for Alternative Matching (جمع مواصفات البحث)
When the client shares viewing preferences or asks for more options:
- Reassure them that owner coordination is active.
- Request their specific search parameters:
  1. Monthly budget range (الميزانية التقريبية).
  2. Preferred locations/compounds (المناطق أو الكمبوندات المفضلة).
  3. Bedroom count & furnishing type (غرف النوم، وهل مفروش / نصف مفروش بتكييفات ومطبخ / غير مفروش).

### Stage 3: Structured Data Extraction (Behind the Scenes)
When the lead provides key search criteria, append a hidden JSON payload at the very end of your response inside <lead_qualification> tags:
<lead_qualification>
{
  "lead_ready": true,
  "client_name": "...",
  "preferred_viewing": "...",
  "move_in_date": "...",
  "lease_duration": "...",
  "budget": "...",
  "currency": "EGP / USD",
  "locations": ["..."],
  "bedrooms": "...",
  "furnishing_status": "Furnished / Semi-Furnished / Unfurnished",
  "special_notes": "..."
}
</lead_qualification>

## 3. Grounding Knowledge
- Semi-furnished (Kitchen + ACs) saves 20k–30k EGP monthly over fully furnished on long leases (2+ years).
- Advance payment of 6–12 months is leveraged for 15%–25% rent discounts.
- Portal ads frequently have outdated pricing; verify directly with owners.
- Diplomatic leases require an early termination clause (30–60 days notice for official relocation).
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
