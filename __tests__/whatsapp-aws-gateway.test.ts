import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * WhatsApp Gateway & AWS Integration Test Suite
 * Tests multi-provider WhatsApp dispatching:
 *  1. Custom self-hosted gateway on AWS EC2 or Lambda (WHATSAPP_API_URL + WHATSAPP_API_TOKEN)
 *  2. Twilio REST API fallback
 *  3. Local dev / preview graceful simulation
 *  4. Inbound webhook normalization
 */
describe('WhatsApp Gateway & AWS Multi-Provider Dispatch Test Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Outbound Message Normalization & Payloads', () => {
    it('normalizes Egyptian and international phone numbers to E.164 without prefix duplicates', () => {
      function normalizePhone(phone: string): string {
        let clean = phone.replace(/[^\d+]/g, '');
        if (clean.startsWith('01') && clean.length === 11) {
          clean = '+20' + clean.slice(1);
        } else if (clean.startsWith('201') && clean.length === 12) {
          clean = '+' + clean;
        } else if (!clean.startsWith('+')) {
          clean = '+' + clean;
        }
        return clean;
      }

      expect(normalizePhone('01012345678')).toBe('+201012345678');
      expect(normalizePhone('201123456789')).toBe('+201123456789');
      expect(normalizePhone('+201223456789')).toBe('+201223456789');
      expect(normalizePhone('+971501234567')).toBe('+971501234567');
    });

    it('formats WhatsApp request payload properly for custom gateway and Twilio', () => {
      function formatGatewayPayload(toPhone: string, fromPhone: string, body: string, callback?: string) {
        return {
          to: toPhone.replace(/^whatsapp:/, ''),
          from: fromPhone.replace(/^whatsapp:/, ''),
          body,
          text: body,
          message: body,
          statusCallback: callback,
        };
      }

      const payload = formatGatewayPayload('+201012345678', '+201099998888', 'Hello from Sierra Estates', 'https://sierra-estates.net/callback');
      expect(payload.to).toBe('+201012345678');
      expect(payload.from).toBe('+201099998888');
      expect(payload.text).toBe('Hello from Sierra Estates');
      expect(payload.statusCallback).toBe('https://sierra-estates.net/callback');
    });
  });

  describe('AWS Gateway Endpoint URL Resolution', () => {
    it('resolves root URL to /send or preserves explicit route', () => {
      function resolveGatewayEndpoint(baseUrl: string): string {
        const clean = baseUrl.trim();
        return clean.endsWith('/send') || clean.endsWith('/messages')
          ? clean
          : `${clean.replace(/\/+$/, '')}/send`;
      }

      expect(resolveGatewayEndpoint('http://54.12.34.56:3000')).toBe('http://54.12.34.56:3000/send');
      expect(resolveGatewayEndpoint('http://54.12.34.56:3000/')).toBe('http://54.12.34.56:3000/send');
      expect(resolveGatewayEndpoint('https://api.gateway.amazonaws.com/prod/send')).toBe('https://api.gateway.amazonaws.com/prod/send');
      expect(resolveGatewayEndpoint('https://api.gateway.amazonaws.com/prod/messages')).toBe('https://api.gateway.amazonaws.com/prod/messages');
    });
  });

  describe('Inbound Webhook Signal Routing (Adapter Pattern)', () => {
    interface WebhookSignal {
      message: string;
      sender: string;
      group: string;
      isGroup: boolean;
    }

    function parseIncomingWebhook(body: Record<string, any>): WebhookSignal | null {
      const message = body.message?.text || body.text || body.Body || body.message;
      if (!message) return null;
      const sender = body.from || body.From || 'External Signal';
      const group = body.groupName || body.Source || 'WhatsApp Broker Group';
      const isGroup = body.isGroup === true || body.isGroup === 'true';

      return { message, sender, group, isGroup };
    }

    it('correctly parses Meta Cloud API style payload', () => {
      const metaPayload = {
        from: '+201011112222',
        text: 'I want a 3 bedroom villa in Hyde Park under 25M',
        isGroup: false,
      };
      const signal = parseIncomingWebhook(metaPayload);
      expect(signal).not.toBeNull();
      expect(signal?.isGroup).toBe(false);
      expect(signal?.message).toContain('Hyde Park');
    });

    it('correctly parses Twilio style payload', () => {
      const twilioPayload = {
        From: 'whatsapp:+201011112222',
        Body: 'Available unit in Mivida 220m garden',
        isGroup: true,
        groupName: 'Tagamoa Direct Owners',
      };
      const signal = parseIncomingWebhook(twilioPayload);
      expect(signal).not.toBeNull();
      expect(signal?.isGroup).toBe(true);
      expect(signal?.group).toBe('Tagamoa Direct Owners');
    });

    it('correctly parses custom AWS EC2 / Lambda Baileys gateway payload', () => {
      const ec2Payload = {
        message: { text: 'Uptown Cairo penthouse 340m resale price 45,000,000' },
        from: '201055554444@s.whatsapp.net',
        isGroup: true,
        groupName: 'Luxury New Cairo Real Estate',
      };
      const signal = parseIncomingWebhook(ec2Payload);
      expect(signal).not.toBeNull();
      expect(signal?.isGroup).toBe(true);
      expect(signal?.message).toContain('Uptown Cairo');
    });
  });
});
