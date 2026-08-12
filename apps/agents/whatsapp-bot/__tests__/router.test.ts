/**
 * Tests: WhatsApp Bot Router
 * 
 * Tests for intent classification, routing decisions, and message handling.
 * Run: jest apps/agents/whatsapp-bot/__tests__/router.test.ts
 */

import { classifyIntent, determineUrgency, routeMessage, MessageIntent } from '../router'

describe('WhatsApp Bot Router', () => {
  // ── Intent Classification ───────────────────────────────────────────────────

  describe('classifyIntent()', () => {
    it('should classify property code as property_inquiry', () => {
      expect(classifyIntent('عايز اعرف حالة SE001')).toBe('property_inquiry')
      expect(classifyIntent('SB002 متاح؟')).toBe('availability_check')
      expect(classifyIntent('ايه اخبار PROP123?')).toBe('property_inquiry')
    })

    it('should classify availability check', () => {
      expect(classifyIntent('SE003 متاح؟')).toBe('availability_check')
      expect(classifyIntent('هل الوحدة available?')).toBe('availability_check')
      expect(classifyIntent('الشقة دي فاضية؟')).toBe('availability_check')
    })

    it('should classify viewing request', () => {
      expect(classifyIntent('عايز معاينة')).toBe('viewing_request')
      expect(classifyIntent('ممكن أزور الشقة؟')).toBe('viewing_request')
      expect(classifyIntent('I want to schedule a viewing')).toBe('viewing_request')
      expect(classifyIntent('محتاج موعد مشاهدة')).toBe('viewing_request')
    })

    it('should classify price inquiry', () => {
      expect(classifyIntent('الإيجار بكام؟')).toBe('price_inquiry')
      expect(classifyIntent('السعر كام؟')).toBe('price_inquiry')
      expect(classifyIntent('what is the rent?')).toBe('price_inquiry')
    })

    it('should classify property search', () => {
      expect(classifyIntent('عايز شقة 3 غرف في التجمع')).toBe('property_search')
      expect(classifyIntent('محتاج فيلا مفروشة')).toBe('property_search')
      expect(classifyIntent('looking for 2 bedroom apartment')).toBe('property_search')
    })

    it('should classify closing intent', () => {
      expect(classifyIntent('جاهز للتوقيع على العقد')).toBe('closing')
      expect(classifyIntent('عايز أدفع العربون')).toBe('closing')
      expect(classifyIntent('ready to sign the contract')).toBe('closing')
    })

    it('should classify complaint', () => {
      expect(classifyIntent('مش راضي، مشكلة كبيرة')).toBe('complaint')
      expect(classifyIntent('ما ردوش عليا')).toBe('complaint')
      expect(classifyIntent('I am very disappointed')).toBe('complaint')
    })

    it('should classify greetings', () => {
      expect(classifyIntent('اهلا')).toBe('greeting')
      expect(classifyIntent('السلام عليكم')).toBe('greeting')
      expect(classifyIntent('hi')).toBe('greeting')
      expect(classifyIntent('hello')).toBe('greeting')
    })

    it('should return unknown for unclear messages', () => {
      expect(classifyIntent('شكراً')).toBe('unknown')
      expect(classifyIntent('ok')).toBe('unknown')
    })
  })

  // ── Urgency Determination ───────────────────────────────────────────────────

  describe('determineUrgency()', () => {
    it('should mark closing as critical', () => {
      expect(determineUrgency('closing', [])).toBe('critical')
    })

    it('should mark complaint as high', () => {
      expect(determineUrgency('complaint', [])).toBe('high')
    })

    it('should mark viewing request as high', () => {
      expect(determineUrgency('viewing_request', [])).toBe('high')
    })

    it('should mark property inquiry as medium', () => {
      expect(determineUrgency('property_inquiry', [])).toBe('medium')
    })

    it('should mark new clients as medium minimum', () => {
      expect(determineUrgency('unknown', [])).toBe('medium')
    })

    it('should mark returning client general message as low', () => {
      const history = [{ msg: 'previous' }, { msg: 'messages' }]
      expect(determineUrgency('general_info', history)).toBe('low')
    })
  })

  // ── Routing Decision ────────────────────────────────────────────────────────

  describe('routeMessage()', () => {
    it('should route closing to closer agent', () => {
      const route = routeMessage('closing', 'critical', false)
      expect(route.primaryAgent).toBe('closer')
      expect(route.supportingAgents).toContain('hermes')
    })

    it('should route complaint to human', () => {
      const route = routeMessage('complaint', 'high', false)
      expect(route.primaryAgent).toBe('human')
    })

    it('should route property search to hermes with sierra and openclaw support', () => {
      const route = routeMessage('property_search', 'medium', true)
      expect(route.primaryAgent).toBe('hermes')
      expect(route.supportingAgents).toContain('sierra')
      expect(route.supportingAgents).toContain('openclaw')
    })

    it('should route availability check to hermes with data agents', () => {
      const route = routeMessage('availability_check', 'medium', false)
      expect(route.primaryAgent).toBe('hermes')
      expect(route.supportingAgents).toContain('openclaw')
    })

    it('should route viewing request to hermes with sierra', () => {
      const route = routeMessage('viewing_request', 'high', false)
      expect(route.primaryAgent).toBe('hermes')
      expect(route.supportingAgents).toContain('sierra')
    })

    it('should always use hermes as primary or support', () => {
      const intents: MessageIntent[] = ['greeting', 'property_search', 'viewing_request', 'price_inquiry']
      intents.forEach((intent) => {
        const route = routeMessage(intent, 'low', false)
        const hasHermes = route.primaryAgent === 'hermes' || route.supportingAgents.includes('hermes')
        expect(hasHermes).toBe(true)
      })
    })

    it('should include intent in the route decision', () => {
      const route = routeMessage('property_inquiry', 'medium', false)
      expect(route.intent).toBe('property_inquiry')
    })
  })

  // ── Edge Cases ───────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty message body', () => {
      const intent = classifyIntent('')
      expect(intent).toBe('unknown')
    })

    it('should handle mixed Arabic-English messages', () => {
      const intent = classifyIntent('عايز apartment في 5th settlement')
      expect(intent).toBe('property_search')
    })

    it('should handle property codes with spaces', () => {
      const intent = classifyIntent('SE 001 متاح؟')
      expect(['property_inquiry', 'availability_check']).toContain(intent)
    })

    it('should handle very long messages', () => {
      const longMsg = 'عايز شقة '.repeat(100) + 'في التجمع'
      expect(() => classifyIntent(longMsg)).not.toThrow()
    })
  })
})
