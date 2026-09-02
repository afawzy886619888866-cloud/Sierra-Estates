 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — THE NEXUS AGENT (V11.0)
 * The Master Core: Persona + Intelligence + External Skills.
 */

import { GoogleAIService } from '../server/google-ai';
import { SkillLoader } from './skill-loader';
import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS, } from '../models/schema';







export class NexusAgent {
  /**
   * Process a high-level operational order.
   * This is the "brain" that chooses which skills to use.
   */
  static async processOrder(chatId, order) {
    const tools = SkillLoader.getToolDefinitions();
    const toolsUsed = [];

    // 1. Identify Lead Context (Memory)
    const lead = await this.getLeadByChatId(chatId);
    const context = lead ? `Stakeholder: ${lead.name}, Budget: ${lead.budget}, State: ${_optionalChain([lead, 'access', _ => _.orchestrationState, 'optionalAccess', _2 => _2.stage])}` : "Unknown Stakeholder";

    try {
      // 2. Initial Thought Loop
      const response = await GoogleAIService.chatCompletions(
        'nexus', 'agentic-order',
        [
          {
            role: 'system',
            content: `You are the NEXUS CORE of Sierra Estates Realty.
            CONTEXT: ${context}
            GOAL: Execute operational orders using the available tools.
            TONE: Institutional, precise, editorial luxury.
            When you see an order that requires a tool, call it. If you have enough info, answer directly.`
          },
          { role: 'user', content: order }
        ],
        {
          model: 'gemini-1.5-pro',
          tools: tools,
          temperature: 0.2
        }
      );

      const message = response.choices[0].message;

      // 3. Handle Tool Calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        let conversationLog = ``;

        for (const tool of message.tool_calls) {
          const fnName = _nullishCoalesce(tool.function.name, () => ( 'unknown'));
          const fnArgs = _nullishCoalesce(tool.function.arguments, () => ( '{}'));
          toolsUsed.push(fnName);
          const args = JSON.parse(fnArgs);
          const result = await SkillLoader.executeSkill(fnName, args);
          conversationLog += `\n[TOOL RESULT: ${fnName}] ${result}`;
        }

        // 4. Final Synthesis
        const finalResponse = await GoogleAIService.chatCompletions(
          'nexus', 'order-synthesis',
          [
            { role: 'system', content: `Summarize the results of the tool execution for the user. Be concise and professional.` },
            { role: 'user', content: `Original Order: ${order}\nTool Results: ${conversationLog}` }
          ],
          { model: 'gemini-1.5-flash' }
        );

        return {
          message: finalResponse.choices[0].message.content,
          toolsUsed,
          success: true
        };
      }

      return {
        message: message.content,
        toolsUsed: [],
        success: true
      };
    } catch (err) {
      console.error("Nexus Execution Failure:", err);
      return { message: "Nexus Core Disruption: Tool synchronization failed.", toolsUsed: [], success: false };
    }
  }

  /**
   * Memory Link: Resolves the Telegram Chat ID to a Firestore Lead.
   */
   static async getLeadByChatId(chatId) {
    const snap = await adminDb.collection(COLLECTIONS.stakeholders)
      .where('automation.telegramId', '==', chatId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } ;
  }
}
