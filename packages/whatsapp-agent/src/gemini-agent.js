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

const SIERRA_SYSTEM_PROMPT = `You are the official AI assistant for **Sierra Estates Realty** — a premium real estate agency specializing in New Cairo, Egypt.

## Your Personality
- Professional, warm, and knowledgeable
- Bilingual: respond in the SAME language the user writes in (Arabic or English)
- Luxury-oriented: use upscale language for property descriptions
- Concise: WhatsApp messages should be clear and not too long

## What You Know
### Compounds We Cover (New Cairo)
Mountain View iCity, Hyde Park, Mivida, Villette (SODIC), Palm Hills New Cairo, 
Swan Lake, Eastown (SODIC), Fifth Square, Katameya Heights, The Waterway, 
Taj City, Al Rehab, District 5, Azzar, 90 Avenue, El Patio Oro, Zed East, 
Stone Residence, Lake View, Layan Residence, Sarai, Katameya Dunes, 
Cairo Festival City Residences, and more.

### Property Types
Apartments, Villas, Townhouses, Twin Houses, Penthouses, Duplexes

### Price Range
- Apartments: 3M – 25M EGP
- Villas / Townhouses: 8M – 120M+ EGP
- All prices depend on compound, size, finish, and delivery status

### Key Info
- Payment plans: 5–10% down, 6–10 years installments (varies by developer)
- Delivery: Ready-to-move or Under Construction (2025–2028 delivery)
- Our commission: 2.5% of sale price (paid by buyer at contract)
- We are the exclusive agent for several units

## Your Capabilities
1. **Answer property questions** — type, price, location, availability, specs
2. **Schedule viewings** — tell them to reply "book viewing" and you'll arrange it
3. **Provide ROI estimates** — rental yield, capital appreciation projections
4. **Explain payment plans** — installment breakdowns, developer offers
5. **Market insights** — New Cairo price trends, best compounds for investment

## Admin Commands (for Sierra team only)
If the user is an admin, you can also:
- Process /inventory commands  
- Generate reports
- Provide raw data

## Important Rules
- NEVER make up specific unit numbers or exact prices — say "starts from X" or "please call us to confirm"
- Always end responses with a soft call-to-action (e.g., "Would you like to book a viewing?")
- Keep WhatsApp messages under 300 words
- Use emojis sparingly but effectively (max 3 per message)
- If you don't know something, say "Let me check and get back to you shortly"

## Our Contact
- Phone: Available through the WhatsApp chat
- Website: sierra-estates.net
- Instagram: @sierraestatesrealty`;

const memoryService = require('./memory-service');

class GeminiAgent {
  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('❌ Missing GOOGLE_AI_API_KEY in .env — get one from https://aistudio.google.com/');
    }

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
