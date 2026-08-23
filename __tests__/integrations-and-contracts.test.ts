import { describe, it, expect } from 'vitest';

describe('Integrations, Security Guards & API Contracts Test Suite', () => {
  describe('Authentication & Header Security Contracts', () => {
    function validateAuthHeaders(headers: Record<string, string>, expectedSecret: string) {
      const authHeader = headers['authorization'] || headers['Authorization'];
      const sbrHeader = headers['x-sbr-secret-key'] || headers['X-SBR-SECRET-KEY'];

      if (sbrHeader && sbrHeader === expectedSecret) {
        return { authorized: true, method: 'sbr-header' };
      }

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        if (token === expectedSecret) {
          return { authorized: true, method: 'bearer-token' };
        }
      }

      return { authorized: false, method: 'none' };
    }

    it('should authenticate requests passing valid SBR secret key header', () => {
      const secret = 'valid-test-sbr-secret-2026';
      const headers = { 'x-sbr-secret-key': 'valid-test-sbr-secret-2026' };
      const res = validateAuthHeaders(headers, secret);
      expect(res.authorized).toBe(true);
      expect(res.method).toBe('sbr-header');
    });

    it('should authenticate requests passing valid Bearer token', () => {
      const secret = 'valid-cron-secret-2026';
      const headers = { 'authorization': 'Bearer valid-cron-secret-2026' };
      const res = validateAuthHeaders(headers, secret);
      expect(res.authorized).toBe(true);
      expect(res.method).toBe('bearer-token');
    });

    it('should reject unauthorized requests', () => {
      const secret = 'valid-secret';
      const headers = { 'authorization': 'Bearer invalid-secret' };
      const res = validateAuthHeaders(headers, secret);
      expect(res.authorized).toBe(false);
    });
  });

  describe('Property Finder Listing Schema Contract', () => {
    interface PropertyFinderPayload {
      id: string | number;
      title: string;
      price: number;
      currency: string;
      location: string;
      compound?: string;
      type: string;
      bedrooms: number;
      bathrooms: number;
      buaSqm: number;
    }

    function validatePropertyFinderListing(listing: any): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      if (!listing.id) errors.push('Missing listing id');
      if (!listing.title || typeof listing.title !== 'string') errors.push('Missing or invalid title');
      if (!listing.price || typeof listing.price !== 'number' || listing.price <= 0) errors.push('Invalid price');
      if (!listing.buaSqm || typeof listing.buaSqm !== 'number' || listing.buaSqm <= 0) errors.push('Invalid BUA');
      if (!listing.type) errors.push('Missing property type');

      return { valid: errors.length === 0, errors };
    }

    it('should validate complete Property Finder listing payload', () => {
      const payload: PropertyFinderPayload = {
        id: 'pf-109283',
        title: 'Luxury Standalone Villa in Mivida New Cairo',
        price: 36000000,
        currency: 'EGP',
        location: '5th Settlement, New Cairo',
        compound: 'Mivida',
        type: 'Standalone Villa',
        bedrooms: 5,
        bathrooms: 6,
        buaSqm: 380,
      };

      const result = validatePropertyFinderListing(payload);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid listing missing mandatory price or BUA', () => {
      const invalidPayload = {
        id: 'pf-109284',
        title: 'Incomplete unit',
        price: -500,
        type: 'Apartment',
      };

      const result = validatePropertyFinderListing(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid price');
      expect(result.errors).toContain('Invalid BUA');
    });
  });

  describe('WhatsApp Inbound Webhook Payload Contract', () => {
    function parseWhatsAppInboundMessage(payload: any) {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];
      const contact = change?.value?.contacts?.[0];

      if (!message) return null;

      return {
        messageId: message.id,
        from: message.from,
        senderName: contact?.profile?.name || 'Unknown',
        type: message.type,
        text: message.text?.body || message.button?.text || '',
        timestamp: message.timestamp,
      };
    }

    it('should parse Meta WhatsApp Cloud webhook message correctly', () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA_12345',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  contacts: [{ profile: { name: 'Karim Mansour' }, wa_id: '201001234567' }],
                  messages: [
                    {
                      from: '201001234567',
                      id: 'wamid.HBgLMjAxMDA...',
                      timestamp: '1724458000',
                      text: { body: 'مهتم بشراء تاون هاوس في ميفيدا أو هايد بارك' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const parsed = parseWhatsAppInboundMessage(webhookPayload);
      expect(parsed).toBeDefined();
      expect(parsed?.from).toBe('201001234567');
      expect(parsed?.senderName).toBe('Karim Mansour');
      expect(parsed?.text).toContain('مهتم بشراء تاون هاوس');
    });
  });
});
