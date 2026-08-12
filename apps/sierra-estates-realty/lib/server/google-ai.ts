import 'server-only'; // gRPC dependency — server only
import { GoogleGenerativeAI } from "@google/generative-ai";
import { instrumentAgent } from "../arize";

/**
 * SIERRA ESTATES — DIRECT GOOGLE AI STUDIO INTEGRATION
 * Updated V12.1: Resolving Model 404s by using latest aliases.
 */

const API_KEY = process.env.GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Expanded model support to include latest previews and stable aliases
export type GeminiModel = 
  | "gemini-1.5-flash" 
  | "gemini-1.5-pro" 
  | "gemini-flash-latest" 
  | "gemini-pro-latest" 
  | "gemini-3-pro-preview" 
  | "gemini-3-flash-preview";

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: any[];
}

export const GoogleAIService = {
  /**
   * Generates a text response using the selected Gemini model.
   * Auto-instrumented for Arize Phoenix observability.
   */
  async generateContent(
    agentName: string,
    stage: string,
    prompt: { system?: string; user: string | any[] },
    options: { model?: string; temperature?: number; jsonMode?: boolean } = {}
  ): Promise<string> {
    if (!API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured. Direct AI Studio integration disabled.");
    }

    // Default to 'gemini-flash-latest' to avoid 404s on older version strings
    const modelName = options.model || "gemini-flash-latest";
    
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature ?? 0.1,
          responseMimeType: options.jsonMode ? "application/json" : "text/plain",
        },
        systemInstruction: prompt.system,
      });

      return await instrumentAgent(agentName, stage, "AI_STUDIO_DIRECT", async () => {
        console.log(`📡 [GoogleAI] Direct Call: ${agentName}:${stage} using ${modelName}`);
        
        const result = await model.generateContent(prompt.user);
        const response = await result.response;
        const text = response.text();

        return text;
      });
    } catch (err: any) {
      console.error(`❌ [GoogleAI] Failed with ${modelName}:`, err.message);
      
      // Automatic fallback if the specified model fails with 404
      if (err.message.includes('404') && modelName !== 'gemini-flash-latest') {
        console.log("🔄 [GoogleAI] Retrying with fallback: gemini-flash-latest");
        return this.generateContent(agentName, stage, prompt, { ...options, model: 'gemini-flash-latest' });
      }
      throw err;
    }
  },

  /**
   * OpenAI-compatible wrapper for legacy services.
   */
  async chatCompletions(
    agentId: string,
    unitName: string,
    messages: Array<{ role: string; content: string }>,
    options: ChatOptions = {}
  ): Promise<{
    choices: Array<{
      message: {
        role: string;
        content: string;
        tool_calls?: Array<any>;
      };
    }>;
  }> {
    return instrumentAgent(agentId, unitName, JSON.stringify(messages), async () => {
      const modelName = options.model || 'gemini-flash-latest';
      
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          tools: options.tools ? [{ functionDeclarations: options.tools }] : undefined
        });

        const chat = model.startChat({
          history: messages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 2048,
          },
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();
        
        const functionCalls = response.candidates?.[0].content.parts.filter(p => p.functionCall);

        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: text,
                tool_calls: functionCalls?.map(fc => ({
                  id: fc.functionCall?.name,
                  type: 'function',
                  function: {
                    name: fc.functionCall?.name,
                    arguments: JSON.stringify(fc.functionCall?.args)
                  }
                }))
              }
            }
          ]
        };
      } catch (err: any) {
        console.error(`❌ [GoogleAI] Chat Error with ${modelName}:`, err.message);
        if (err.message.includes('404') && modelName !== 'gemini-flash-latest') {
          return this.chatCompletions(agentId, unitName, messages, { ...options, model: 'gemini-flash-latest' });
        }
        throw err;
      }
    });
  }
};
