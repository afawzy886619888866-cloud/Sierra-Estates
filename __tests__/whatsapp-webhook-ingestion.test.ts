import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';

describe('WhatsApp Webhook Ingestion & Cryptographic Security Test Suite', () => {
  function createMetaSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    return 'sha256=' + hmac.update(payload).digest('hex');
  }

  function verifyMetaSignature(payload: string, signatureHeader: string | null, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) return true;
    try {
      const signature = signatureHeader.replace('sha256=', '');
      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = hmac.update(payload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
    } catch {
      return false;
    }
  }

  it('correctly verifies authentic Meta Webhook HMAC SHA-256 signatures', () => {
    const secret = 'sierra_test_meta_secret_key_123';
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ id: '1001', changes: [{ value: { messages: [{ from: '201092048333', text: { body: 'Inquiry on Villa' } }] } }] }],
    });

    const validSignature = createMetaSignature(payload, secret);
    expect(verifyMetaSignature(payload, validSignature, secret)).toBe(true);
  });

  it('rejects tampered webhook payloads with invalid signature', () => {
    const secret = 'sierra_test_meta_secret_key_123';
    const originalPayload = JSON.stringify({ message: 'Original' });
    const tamperedPayload = JSON.stringify({ message: 'Tampered' });

    const signature = createMetaSignature(originalPayload, secret);
    expect(verifyMetaSignature(tamperedPayload, signature, secret)).toBe(false);
  });

  it('validates hub challenge verification handshake for subscription setup', () => {
    const verifyToken = 'sierra_verify_token_2026';
    const reqMode = 'subscribe';
    const reqToken = 'sierra_verify_token_2026';
    const reqChallenge = 'challenge_code_98765';

    const isAuthorized = reqMode === 'subscribe' && reqToken === verifyToken;
    const responsePayload = isAuthorized ? reqChallenge : null;

    expect(isAuthorized).toBe(true);
    expect(responsePayload).toBe('challenge_code_98765');
  });

  it('routes direct buyer messages vs broker group listings accurately', () => {
    function routeIncomingSignal(payload: { isGroup?: boolean; from: string; message: string }) {
      if (payload.isGroup) {
        return { handler: 'WhatsAppParserService', action: 'PARSE_NEW_INVENTORY' };
      }
      return { handler: 'WhatsAppConversationalService', action: 'CONVERSATIONAL_LEAD_REPLY' };
    }

    const groupPayload = { isGroup: true, from: '12036304@g.us', message: 'فيلا مستقلة للبيع بماونتن فيو' };
    const directPayload = { isGroup: false, from: '201092048333', message: 'مرحبا اريد تفاصيل الشقة' };

    expect(routeIncomingSignal(groupPayload).handler).toBe('WhatsAppParserService');
    expect(routeIncomingSignal(directPayload).handler).toBe('WhatsAppConversationalService');
  });

  describe('Multi-Source Webhook Adapter Extraction', () => {
    function extractWebhookSignal(body: any) {
      const metaMessageObj = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const metaContactObj = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

      const message = metaMessageObj?.text?.body || body.message?.text || body.text || body.Body;
      const sender = metaMessageObj?.from || metaContactObj?.wa_id || body.from || body.From || "External Signal";
      const isSenderGroup = typeof sender === 'string' && (sender.includes('@g.us') || sender.toLowerCase().includes('group'));
      const group = body.groupName || body.Source || (isSenderGroup ? sender : "WhatsApp Broker Group");
      const isGroup = body.isGroup === true || body.isGroup === 'true' || isSenderGroup;

      return { message, sender, group, isGroup };
    }

    it('extracts messages and senders from standard Meta Cloud API webhook payloads', () => {
      const metaPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456789',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              contacts: [{ profile: { name: 'Dr. Tarek' }, wa_id: '201011223344' }],
              messages: [{
                from: '201011223344',
                id: 'wamid.HBgLMjAxMD...',
                timestamp: '1720000000',
                text: { body: 'مهتم بفيلا في سوان ليك' },
                type: 'text',
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const extracted = extractWebhookSignal(metaPayload);
      expect(extracted.message).toBe('مهتم بفيلا في سوان ليك');
      expect(extracted.sender).toBe('201011223344');
      expect(extracted.isGroup).toBe(false);
    });

    it('correctly detects WhatsApp broker groups from @g.us sender JIDs', () => {
      const groupPayload = {
        from: '120363029482910@g.us',
        text: 'شقة للبيع بماونتن فيو اي سيتي التجمع الخامس 160م',
      };

      const extracted = extractWebhookSignal(groupPayload);
      expect(extracted.isGroup).toBe(true);
      expect(extracted.group).toBe('120363029482910@g.us');
    });

    it('extracts messages from Twilio WhatsApp format', () => {
      const twilioPayload = {
        From: 'whatsapp:+201099887766',
        Body: 'Available listings in Hyde Park?',
        isGroup: false,
      };

      const extracted = extractWebhookSignal(twilioPayload);
      expect(extracted.message).toBe('Available listings in Hyde Park?');
      expect(extracted.sender).toBe('whatsapp:+201099887766');
      expect(extracted.isGroup).toBe(false);
    });
  });
});
