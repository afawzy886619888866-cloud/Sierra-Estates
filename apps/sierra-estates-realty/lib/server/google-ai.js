 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only'; // gRPC dependency — server only
import { GoogleGenerativeAI } from "@google/generative-ai";
import { instrumentAgent } from "../arize";

/**
 * SIERRA ESTATES — DIRECT GOOGLE AI STUDIO INTEGRATION
 * Updated V12.1: Resolving Model 404s by using latest aliases.
 */

const API_KEY = process.env.GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Expanded model support to include latest previews and stable aliases
 














function normalizeModelName(model) {
  if (!model) return "gemini-3.6-flash";
  if (model.includes("1.5") || model.includes("2.5")) return "gemini-3.6-flash";
  return model;
}

export const GoogleAIService = {
  /**
   * Generates a text response using the selected Gemini model.
   * Auto-instrumented for Arize Phoenix observability.
   */
  async generateContent(
    agentName,
    stage,
    prompt,
    options = {}
  ) {
    if (!API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured. Direct AI Studio integration disabled.");
    }

    const modelName = normalizeModelName(options.model);
    
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: _nullishCoalesce(options.temperature, () => ( 0.1)),
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
    } catch (err) {
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
    agentId,
    unitName,
    messages,
    options = {}
  )







 {
    return instrumentAgent(agentId, unitName, JSON.stringify(messages), async () => {
      const modelName = normalizeModelName(options.model);
      
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
            temperature: _nullishCoalesce(options.temperature, () => ( 0.7)),
            maxOutputTokens: _nullishCoalesce(options.maxOutputTokens, () => ( 2048)),
          },
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();
        
        const functionCalls = _optionalChain([response, 'access', _ => _.candidates, 'optionalAccess', _2 => _2[0], 'access', _3 => _3.content, 'access', _4 => _4.parts, 'access', _5 => _5.filter, 'call', _6 => _6(p => p.functionCall)]);

        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: text,
                tool_calls: _optionalChain([functionCalls, 'optionalAccess', _7 => _7.map, 'call', _8 => _8(fc => ({
                  id: _optionalChain([fc, 'access', _9 => _9.functionCall, 'optionalAccess', _10 => _10.name]),
                  type: 'function',
                  function: {
                    name: _optionalChain([fc, 'access', _11 => _11.functionCall, 'optionalAccess', _12 => _12.name]),
                    arguments: JSON.stringify(_optionalChain([fc, 'access', _13 => _13.functionCall, 'optionalAccess', _14 => _14.args]))
                  }
                }))])
              }
            }
          ]
        };
      } catch (err) {
        console.error(`❌ [GoogleAI] Chat Error with ${modelName}:`, err.message);
        if (err.message.includes('404') && modelName !== 'gemini-flash-latest') {
          return this.chatCompletions(agentId, unitName, messages, { ...options, model: 'gemini-flash-latest' });
        }
        throw err;
      }
    });
  }
};
