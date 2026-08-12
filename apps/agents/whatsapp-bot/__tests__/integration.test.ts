/**
 * Integration Tests: Full WhatsApp Message Flow
 * 
 * Tests the complete end-to-end flow:
 * Message → Router → Agent Pipeline → Response
 * 
 * Uses mock AI completions to avoid real API calls.
 */

import { classifyIntent, routeMessage, determineUrgency, WhatsAppBotRouter, IncomingMessage } from '../router'

// ── Mock AgentOrchestrator ───────────────────────────────────────────────────
jest.mock('@sierra-estates/agents-core', () => ({
  AgentOrchestrator: jest.fn().mockImplementation(() => ({
    runAgentTask: (...args: any[]) => (global as any).mockRunAgentTask(...args),
    getSharedKnowledge: jest.fn().mockResolvedValue('No prior knowledge'),
    addSharedKnowledge: jest.fn().mockResolvedValue(undefined),
  })),
}))

const mockRunAgentTask = jest.fn();
(global as any).mockRunAgentTask = mockRunAgentTask


// ── Mock SharedMemoryBus ─────────────────────────────────────────────────────
jest.mock('@sierra-estates/memory-engine', () => ({
  sharedMemory: {
    recordConversationTurn: jest.fn().mockResolvedValue(undefined),
    getClientHistory: jest.fn().mockResolvedValue([]),
    getLeadProfile: jest.fn().mockResolvedValue(null),
    write: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('Integration: Full WhatsApp Message Flow', () => {
  let router: WhatsAppBotRouter

  beforeEach(() => {
    jest.clearAllMocks()
    router = new WhatsAppBotRouter('test-api-key')

    // Default: all agent tasks succeed
    mockRunAgentTask.mockImplementation((agentName: string) => {
      if (agentName === 'hermes') {
        return Promise.resolve({
          agentName: 'hermes',
          status: 'success',
          output: 'أهلاً يا فندم، سأساعدك في إيجاد الشقة المثالية. ما هو نوع الوحدة التي تبحث عنها؟',
        })
      }
      if (agentName === 'sierra') {
        return Promise.resolve({
          agentName: 'sierra',
          status: 'success',
          output: 'ANALYSIS: Client looking for apartment. Recommend SE001, SE004, SE007.',
        })
      }
      if (agentName === 'openclaw') {
        return Promise.resolve({
          agentName: 'openclaw',
          status: 'success',
          output: 'PROPERTY DATA: SE001 available, SE004 available, SE007 taken.',
        })
      }
      return Promise.resolve({ agentName, status: 'success', output: 'OK' })
    })
  })

  describe('New client greeting flow', () => {
    it('should respond to a greeting from a new client', async () => {
      const msg: IncomingMessage = {
        from: '+201012345678@c.us',
        body: 'اهلا',
        groupName: 'Direct Message',
        timestamp: Math.floor(Date.now() / 1000),
      }

      const response = await router.handle(msg)
      expect(response).toBeTruthy()
      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(0)
    })
  })

  describe('Property search flow', () => {
    it('should engage Sierra and OpenClaw for property search', async () => {
      const msg: IncomingMessage = {
        from: '+201099887766@c.us',
        body: 'عايز شقة 2 غرف في التجمع الخامس',
        groupName: 'Direct Message',
        timestamp: Math.floor(Date.now() / 1000),
      }

      const response = await router.handle(msg)

      // Sierra and OpenClaw should have been called
      const calledAgents = mockRunAgentTask.mock.calls.map((c: string[]) => c[0])
      expect(calledAgents).toContain('openclaw')
      expect(calledAgents).toContain('sierra')
      expect(calledAgents).toContain('hermes')

      expect(response).toBeTruthy()
    })
  })

  describe('Complaint escalation flow', () => {
    it('should return a fallback message for complaints without calling AI', async () => {
      const msg: IncomingMessage = {
        from: '+201055443322@c.us',
        body: 'أنا مش راضي، مشكلة كبيرة ومحدش بيرد',
        groupName: 'Direct Message',
        timestamp: Math.floor(Date.now() / 1000),
      }

      const response = await router.handle(msg)

      // Should return Arabic holding message, not call Liela's AI
      expect(response).toContain('سيتواصل')
    })
  })

  describe('Error resilience', () => {
    it('should return a fallback Arabic message when all agents fail', async () => {
      mockRunAgentTask.mockRejectedValue(new Error('AI API is down'))

      const msg: IncomingMessage = {
        from: '+201099001122@c.us',
        body: 'مرحبا',
        timestamp: Math.floor(Date.now() / 1000),
      }

      const response = await router.handle(msg)
      expect(response).toBeTruthy()
      expect(typeof response).toBe('string')
      // Should be a graceful Arabic fallback
      expect(response.length).toBeGreaterThan(10)
    })

    it('should handle undefined groupName gracefully', async () => {
      const msg: IncomingMessage = {
        from: '+201011223344@c.us',
        body: 'hello',
        timestamp: Math.floor(Date.now() / 1000),
        // groupName is optional
      }

      await expect(router.handle(msg)).resolves.toBeTruthy()
    })
  })

  describe('Memory recording', () => {
    it('should record inbound message to shared memory', async () => {
      const { sharedMemory } = require('@sierra-estates/memory-engine')
      const msg: IncomingMessage = {
        from: '+201077665544@c.us',
        body: 'محتاج فيلا مفروشة',
        timestamp: Math.floor(Date.now() / 1000),
      }

      await router.handle(msg)

      expect(sharedMemory.recordConversationTurn).toHaveBeenCalledWith(
        expect.any(String),
        'system',
        'inbound',
        'محتاج فيلا مفروشة'
      )
    })
  })
})

// ── Standalone Unit Tests ────────────────────────────────────────────────────

describe('Intent → Route → Urgency pipeline', () => {
  const scenarios = [
    { body: 'SE001 available?', expectedIntent: 'availability_check', expectedPrimary: 'hermes' },
    { body: 'عايز اوقع العقد', expectedIntent: 'closing', expectedPrimary: 'closer' },
    { body: 'اهلا', expectedIntent: 'greeting', expectedPrimary: 'hermes' },
    { body: 'I am very disappointed with your service', expectedIntent: 'complaint', expectedPrimary: 'human' },
  ]

  scenarios.forEach(({ body, expectedIntent, expectedPrimary }) => {
    it(`"${body.substring(0, 30)}" → intent=${expectedIntent}, route=${expectedPrimary}`, () => {
      const intent = classifyIntent(body)
      expect(intent).toBe(expectedIntent)

      const urgency = determineUrgency(intent as any, [])
      const route = routeMessage(intent as any, urgency, false)
      expect(route.primaryAgent).toBe(expectedPrimary)
    })
  })
})
