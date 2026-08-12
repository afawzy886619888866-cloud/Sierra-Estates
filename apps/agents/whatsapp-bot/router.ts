/**
 * WhatsApp Bot Router - Sierra Estates
 * 
 * This is the central dispatcher for all incoming WhatsApp messages.
 * It determines which agent should handle each message and coordinates
 * the full response pipeline:
 * 
 *   Liela  ← first contact / triage / direct assist
 *   Sierra ← property search / analysis / recommendations
 *   OpenClaw ← property data lookup / verification
 *   Hermes ← message formatting / delivery / routing
 *   CloserAgent ← deals stage 7-9 / signing
 * 
 * Flow:
 *   1. Incoming WhatsApp message
 *   2. Router classifies intent
 *   3. Routes to Liela (always first for new clients)
 *   4. Liela may request Sierra for property search
 *   5. Sierra calls OpenClaw for data
 *   6. Sierra returns recommendations to Liela
 *   7. Liela formats response via Hermes
 *   8. Hermes delivers to WhatsApp
 */

import { AgentOrchestrator } from '@sierra-estates/agents-core'
import { sharedMemory } from '@sierra-estates/memory-engine'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IncomingMessage {
  from: string           // WhatsApp phone number e.g. "201012345678@c.us"
  body: string           // Message text
  groupName?: string     // "Direct Message" or group name
  timestamp: number      // Unix timestamp
  messageId?: string
}

export interface RouteDecision {
  primaryAgent: 'liela' | 'sierra' | 'hermes' | 'openclaw' | 'closer' | 'human'
  supportingAgents: string[]
  intent: MessageIntent
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

export type MessageIntent =
  | 'greeting'
  | 'property_inquiry'      // Asking about a specific property code
  | 'property_search'       // Looking for properties matching criteria
  | 'viewing_request'       // Wants to schedule a viewing
  | 'price_inquiry'         // Asking about price
  | 'availability_check'    // Is [X] available?
  | 'follow_up'             // Following up on previous conversation
  | 'complaint'             // Expressing frustration / complaint
  | 'closing'               // Ready to sign / close
  | 'general_info'          // General question about the company
  | 'owner_offering'        // Property owner adding/selling/renting unit
  | 'unknown'

// ─────────────────────────────────────────────────────────────────────────────
// Intent Classifier
// ─────────────────────────────────────────────────────────────────────────────

const PROPERTY_CODE_PATTERN = /\b(SE|SB|SBE|PROP)[- ]?(\d{3,6})\b/i

const INTENT_PATTERNS: Array<{ intent: MessageIntent; patterns: RegExp[] }> = [
  {
    intent: 'owner_offering',
    patterns: [/مالك|ملاك|عندي شقة|عندي فيلا|عايز ابيع|عايز أبيع|عايز أأجر|للإيجار|للايجار|للبيع|للبدل/i],
  },
  {
    intent: 'closing',
    patterns: [/عقد|contract|توقيع|sign|هاخد|confirmed|بدفع|دفع|عربون|حجز|deposit|downpayment/i],
  },
  {
    intent: 'viewing_request',
    patterns: [/معاينة|مشاهدة|اشوف|أزور|ازور|viewing|visit|زيارة|موعد/i],
  },
  {
    intent: 'price_inquiry',
    patterns: [/سعر|price|كام|بكام|ايجار|rent|تمن/i],
  },
  {
    intent: 'availability_check',
    patterns: [
      /متاح|available|فاضي|فاضية|موجود/i,
      new RegExp(PROPERTY_CODE_PATTERN.source + '\\s*(متاح|available|فاضي|فاضية|موجود)', 'i'),
      new RegExp('(متاح|available|فاضي|فاضية|موجود).*' + PROPERTY_CODE_PATTERN.source, 'i')
    ],
  },
  {
    intent: 'property_inquiry',
    patterns: [PROPERTY_CODE_PATTERN],
  },
  {
    intent: 'property_search',
    patterns: [/ابحث|عايز|محتاج|أريد|looking for|شقة|فيلا|apartment|villa|غرف|bedroom/i],
  },
  {
    intent: 'complaint',
    patterns: [/مش كويس|زعلان|مشكلة|problem|complaint|disappointed|ما ردوش/i],
  },
  {
    intent: 'greeting',
    patterns: [/^(اهلا|مرحبا|السلام|hi|hello|hey|صباح|مساء).{0,30}$/i],
  },
]


export function classifyIntent(body: string): MessageIntent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(body))) {
      return intent
    }
  }
  return 'unknown'
}

export function determineUrgency(intent: MessageIntent, history: unknown[]): 'low' | 'medium' | 'high' | 'critical' {
  if (intent === 'closing') return 'critical'
  if (intent === 'complaint') return 'high'
  if (intent === 'owner_offering') return 'high'
  if (intent === 'viewing_request') return 'high'
  if (intent === 'availability_check' || intent === 'property_inquiry') return 'medium'
  if (history.length === 0) return 'medium' // New client always medium+
  return 'low'
}

export function routeMessage(intent: MessageIntent, urgency: string, isNewClient: boolean): RouteDecision {
  // Owner offering properties
  if (intent === 'owner_offering') {
    return {
      primaryAgent: 'openclaw',
      supportingAgents: [],
      intent,
      urgency: 'high',
    }
  }

  // Critical path: ready to close
  if (intent === 'closing') {
    return {
      primaryAgent: 'closer',
      supportingAgents: ['hermes'],
      intent,
      urgency: 'critical',
    }
  }

  // Human escalation for complaints
  if (intent === 'complaint' || urgency === 'critical') {
    return {
      primaryAgent: 'human',
      supportingAgents: ['hermes'],
      intent,
      urgency: 'high',
    }
  }

  // Property data needed
  if (['availability_check', 'property_inquiry', 'property_search', 'price_inquiry'].includes(intent)) {
    return {
      primaryAgent: 'hermes',
      supportingAgents: ['openclaw', 'sierra'],
      intent,
      urgency: urgency as RouteDecision['urgency'],
    }
  }

  // Viewing coordination
  if (intent === 'viewing_request') {
    return {
      primaryAgent: 'hermes',
      supportingAgents: ['openclaw', 'sierra'],
      intent,
      urgency: 'high',
    }
  }

  // Default: Hermes handles with OpenClaw for operations/data
  return {
    primaryAgent: 'hermes',
    supportingAgents: ['openclaw'],
    intent,
    urgency: urgency as RouteDecision['urgency'],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Bot Router
// ─────────────────────────────────────────────────────────────────────────────

export class WhatsAppBotRouter {
  private orchestrator: AgentOrchestrator

  constructor(apiKey?: string) {
    this.orchestrator = new AgentOrchestrator({ apiKey })
    console.log('[WhatsAppBotRouter] Initialized. Liela and Sierra are ready.')
  }

  /**
   * Main entry point. Call this for every incoming WhatsApp message.
   * Returns the response text to send back to the client.
   */
  async handle(msg: IncomingMessage): Promise<string> {
    const phone = msg.from.replace('@c.us', '').replace('@g.us', '')
    const startedAt = Date.now()

    try {
      // 1. Record inbound message in shared memory
      await sharedMemory.recordConversationTurn(phone, 'system', 'inbound', msg.body)

      // 2. Get client history
      const history = await sharedMemory.getClientHistory(phone)
      const leadProfile = await sharedMemory.getLeadProfile(phone)
      const isNewClient = history.length === 0

      // 3. Classify intent
      const intent = classifyIntent(msg.body)
      const urgency = determineUrgency(intent, history)
      const route = routeMessage(intent, urgency, isNewClient)

      console.log(`[Router] ${phone} | intent=${intent} | urgency=${urgency} | route=${route.primaryAgent}`)

      // 4. Build context for agents
      const context = this.buildAgentContext(phone, msg, intent, history, leadProfile)

      // 5. If human escalation needed, alert team and send holding message
      if (route.primaryAgent === 'human') {
        await this.escalateToHuman(phone, msg, context)
        return 'سيتواصل معك أحد مستشارينا في أقرب وقت. نعتذر عن أي إزعاج.'
      }

      // 6. Run the pipeline through agents
      const response = await this.runAgentPipeline(route, context, msg.body, phone)

      // 7. Record outbound response in shared memory
      await sharedMemory.recordConversationTurn(phone, route.primaryAgent, 'outbound', response)

      const elapsed = Date.now() - startedAt
      console.log(`[Router] Response delivered in ${elapsed}ms`)

      return response
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[WhatsAppBotRouter] Error handling message:', message)
      // Fallback response
      return 'عذراً، حدث خطأ مؤقت. سيتواصل معك فريقنا قريباً.'
    }
  }

  /**
   * Run multi-agent pipeline based on routing decision
   */
  private async runAgentPipeline(
    route: RouteDecision,
    context: string,
    userMessage: string,
    phone: string
  ): Promise<string> {
    // If the primary agent is OpenClaw (handling owners directly)
    if (route.primaryAgent === 'openclaw') {
      const openclawResult = await this.orchestrator.runAgentTask(
        'openclaw',
        `You are talking directly to a property owner. Extract property details (if any), encourage them to provide more info, and generate a warm, professional WhatsApp response in Egyptian Arabic: "${userMessage}"`,
        context
      )
      return openclawResult.status === 'success' ? openclawResult.output : 'أهلاً بك يا فندم. قسم الملاك هيتواصل مع حضرتك فوراً بخصوص وحدتك.';
    }

    // If supporting agents include openclaw or sierra, run them first
    const needsData = route.supportingAgents.includes('openclaw')
    const needsAnalysis = route.supportingAgents.includes('sierra')

    let enrichedContext = context

    if (needsData) {
      const dataResult = await this.orchestrator.runAgentTask(
        'openclaw',
        `Retrieve property data relevant to this client inquiry: ${userMessage}`,
        context
      )
      if (dataResult.status === 'success') {
        enrichedContext += `\n\nOPENCLAW DATA:\n${dataResult.output}`
      }
    }

    if (needsAnalysis) {
      const analysisResult = await this.orchestrator.runAgentTask(
        'sierra',
        `Analyze client message and generate the best 1-3 property recommendations with response strategy: ${userMessage}`,
        enrichedContext
      )
      if (analysisResult.status === 'success') {
        enrichedContext += `\n\nSIERRA ANALYSIS:\n${analysisResult.output}`
      }
    }

    // Hermes always generates the final client-facing response
    const hermesResult = await this.orchestrator.runAgentTask(
      'hermes',
      `Generate a warm, professional WhatsApp response in Egyptian Arabic to this client message: "${userMessage}"`,
      enrichedContext
    )

    if (hermesResult.status === 'success') {
      return hermesResult.output
    }

    return 'أهلاً! سيتواصل معك أحد مستشارينا في أقرب وقت.'
  }

  /**
   * Build rich context string for agents
   */
  private buildAgentContext(
    phone: string,
    msg: IncomingMessage,
    intent: MessageIntent,
    history: unknown[],
    leadProfile: Record<string, unknown> | null
  ): string {
    return `
CLIENT CONTEXT:
- Phone: ${phone}
- Message Timestamp: ${new Date(msg.timestamp * 1000).toISOString()}
- Source: ${msg.groupName || 'Direct Message'}
- Detected Intent: ${intent}
- Is New Client: ${history.length === 0}
- Conversation History Length: ${history.length} messages

LEAD PROFILE:
${leadProfile ? JSON.stringify(leadProfile, null, 2) : 'No profile yet - this appears to be a new client'}

RECENT CONVERSATION HISTORY (last 5 messages):
${history.slice(-5).map((h: unknown) => JSON.stringify(h)).join('\n') || 'None'}
    `.trim()
  }

  /**
   * Escalate to human agent - send alert to team WhatsApp group
   */
  private async escalateToHuman(phone: string, msg: IncomingMessage, context: string): Promise<void> {
    console.warn(`[Router] ESCALATING TO HUMAN: ${phone} | Reason: complaint/critical`)

    await sharedMemory.write(`escalation-${phone}-${Date.now()}`, {
      phone,
      message: msg.body,
      context,
      escalatedAt: new Date().toISOString(),
      reason: 'complaint-or-critical',
    }, {
      author: 'system',
      tags: ['human-escalation', 'urgent', `phone-${phone}`],
    })
  }
}

// Singleton export
export const router = new WhatsAppBotRouter(process.env.GOOGLE_AI_API_KEY)
export default router
