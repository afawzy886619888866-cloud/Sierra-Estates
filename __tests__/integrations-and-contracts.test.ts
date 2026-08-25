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

  describe('Excel & Spreadsheet Ingestion Contracts', () => {
    it('should map bilingual Arabic and English spreadsheet headers into canonical listing fields', () => {
      const rawRows = [
        {
          'الكمبوند': 'Mivida',
          'السعر': 32000000,
          'نوع الوحدة': 'Townhouse',
          'المساحة': 280,
          'غرف': 4,
          'حمامات': 3,
          'تشطيب': 'Ultra Super Lux',
          'المالك / وسيط': 'owner',
          'رقم الهاتف': '01001234567',
        },
        {
          'Compound': 'Hyde Park',
          'Price': '18,500,000',
          'Type': 'Apartment',
          'BUA': '200',
          'Bedrooms': '3',
          'Bathrooms': '2',
          'Finishing': 'Core & Shell',
          'OwnerType': 'broker',
          'Mobile': '+201112345678',
        },
      ];

      const mapped = rawRows.map((row: Record<string, any>, idx) => {
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== '') return row[k];
          }
          return undefined;
        };

        const compound = getVal(['Compound', 'الكمبوند']) || 'New Cairo';
        const priceRaw = getVal(['Price', 'السعر']) || 0;
        const price = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw).replace(/[^0-9.]/g, '')) || 0;
        const type = getVal(['Type', 'نوع الوحدة']) || 'Apartment';
        const areaRaw = getVal(['BUA', 'المساحة']) || 0;
        const area = typeof areaRaw === 'number' ? areaRaw : parseFloat(String(areaRaw).replace(/[^0-9.]/g, '')) || 0;
        const bedsRaw = getVal(['Bedrooms', 'غرف']) || 3;
        const beds = typeof bedsRaw === 'number' ? bedsRaw : parseInt(String(bedsRaw).replace(/[^0-9]/g, ''), 10) || 3;

        return { id: idx + 1, compound, price, type, area, beds };
      });

      expect(mapped[0].compound).toBe('Mivida');
      expect(mapped[0].price).toBe(32000000);
      expect(mapped[0].beds).toBe(4);

      expect(mapped[1].compound).toBe('Hyde Park');
      expect(mapped[1].price).toBe(18500000);
      expect(mapped[1].area).toBe(200);
      expect(mapped[1].beds).toBe(3);
    });
  });
});
