import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from '@/lib/logger';

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

interface ECCMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

export class WhatsAppConversationalService {
  private static readonly SYSTEM_PROMPT = `
You are Hermes, the elite real estate Closer and Concierge for Sierra Estates (a luxury real estate brokerage in Egypt).
Your tone is highly professional, concise, slightly persuasive, and highly knowledgeable about luxury compounds (e.g., Mivida, Hyde Park, Mountain View, Villette, Palm Hills).
Your goal is to qualify the client, answer their questions, and gently steer them toward booking a viewing or sharing their budget/requirements.
Do not hallucinate fake listings. If you don't know, offer to check the inventory and get back to them.
Keep your responses short and suited for WhatsApp. Use emojis sparingly.
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
      return replyText;

    } catch (error) {
      logger.error("❌ Neural Conversation Failure:", error);
      return "I'm having a little trouble connecting to my database right now. One of our senior brokers will reach out to you shortly.";
    }
  }
}
