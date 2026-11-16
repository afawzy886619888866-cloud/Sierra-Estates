/**
 * Tests: OpenAPI 3.1.0 Egypt Location Catalog, Text Sanitizer & Webhook Envelope
 */

const mockUpsertRecord = jest.fn().mockResolvedValue({ id: 'lead-row-1' });
const mockListRecords = jest.fn().mockResolvedValue([]);
const mockUpdateRecord = jest.fn().mockResolvedValue({});

jest.mock('@sierra-estates/db', () => ({
  upsertRecord: (...a: unknown[]) => mockUpsertRecord(...a),
  listRecords: (...a: unknown[]) => mockListRecords(...a),
  updateRecord: (...a: unknown[]) => mockUpdateRecord(...a),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/server/webhook-auth', () => ({
  verifyHmacSignature: () => null,
}));

const mockEnqueueWhatsAppJob = jest.fn().mockResolvedValue('job-123');
const mockClaimEligibleNumber = jest.fn().mockResolvedValue(null);

jest.mock('@/lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: (...a: unknown[]) => mockEnqueueWhatsAppJob(...a),
  claimEligibleNumber: (...a: unknown[]) => mockClaimEligibleNumber(...a),
  DEFAULT_OUTREACH_CONFIG: {},
}));

jest.mock('@/lib/server/twilio-client', () => ({
  sendWhatsApp: jest.fn(),
  getTwilioStatusCallbackUrl: () => undefined,
}));

jest.mock('@/lib/server/pf-lead-greeting', () => ({
  generateLeadGreeting: jest.fn().mockResolvedValue({ body: 'Welcome to Sierra Estates', source: 'template' }),
}));

jest.mock('@/lib/server/whatsapp-language', () => ({
  resolveGreetingLanguage: () => 'ar',
}));

import { NextRequest } from 'next/server';
import { resolveEgyptPfLocationId, SIERRA_PF_PROFILES } from '../lib/property-finder/egypt-locations';
import { EgyptListingValidator, sanitizePfText } from '../lib/property-finder/validation';
import { POST as pfWebhookPost } from '../app/api/webhooks/property-finder/route';

describe('Egypt PF Location Catalog & Sanitizer (OpenAPI 3.1.0)', () => {
  it('resolves verified Cairo compounds in both English and Arabic without guessing', () => {
    expect(resolveEgyptPfLocationId('Mivida')).toBe(2751);
    expect(resolveEgyptPfLocationId('ميڤيدا')).toBe(2751);
    expect(resolveEgyptPfLocationId('Mountain View Hyde Park')).toBe(2763);
    expect(resolveEgyptPfLocationId('Hyde Park')).toBe(2790);
    expect(resolveEgyptPfLocationId('Cairo Festival City')).toBe(2572);
    expect(resolveEgyptPfLocationId('Fifth Square - Al Marasem')).toBe(41671);
    expect(resolveEgyptPfLocationId('Madinaty B12')).toBe(42270);
    expect(resolveEgyptPfLocationId('Uptown Cairo')).toBe(40489);
    // §21: never guesses for unknown locations
    expect(resolveEgyptPfLocationId('NonExistentMarsColony')).toBeNull();
    expect(resolveEgyptPfLocationId('')).toBeNull();
    expect(resolveEgyptPfLocationId('General')).toBeNull();
    expect(SIERRA_PF_PROFILES.company).toBe(79509);
  });

  it('strips HTML tags and emojis while keeping English and Arabic intact', () => {
    const dirty = '<b>Luxury Villa</b> 🏡✨ في ميفيدا 🔥 <script>alert(1)</script>';
    const clean = sanitizePfText(dirty);
    expect(clean).toBe('Luxury Villa في ميفيدا alert(1)');
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('🏡');
  });

  it('allows full-floor and half-floor in Egypt and rejects amenities on farm', () => {
    const okFloor = EgyptListingValidator.validate({
      reference: 'SE-FF-01',
      category: 'commercial',
      type: 'full-floor',
      offeringType: 'rent',
      location: { id: 2572 },
      size: 600,
      title: { en: 'Full Floor Administrative Office in CFC' },
      description: { en: 'Prime full-floor administrative office space available for immediate lease.' },
      media: { images: [{ original: { url: 'https://cdn.sierra-estates.net/1.jpg' } }] },
      price: { type: 'monthly', amounts: { monthly: 250000 } },
    });
    expect(okFloor.isValid).toBe(true);

    const badFarm = EgyptListingValidator.validate({
      reference: 'SE-FARM-01',
      category: 'commercial',
      type: 'farm',
      offeringType: 'sale',
      location: { id: 40892 },
      size: 5000,
      amenities: ['covered-parking'],
      title: { en: 'Agricultural Farm Estate in Sheikh Zayed' },
      description: { en: 'Expansive agricultural farm estate with private access road and irrigation.' },
      media: { images: [{ original: { url: 'https://cdn.sierra-estates.net/2.jpg' } }] },
      price: { type: 'sale', amounts: { sale: 18000000 } },
    });
    expect(badFarm.isValid).toBe(false);
    expect(badFarm.errors).toContain('Amenities are not allowed for "farm" property type.');
  });
});

describe('POST /api/webhooks/property-finder — OpenAPI 3.1.0 WHBaseEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts entity.id and sender.contacts[] phone/email from OpenAPI 3.1.0 lead.created', async () => {
    const req = new NextRequest('https://sierra-estates.net/api/webhooks/property-finder', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt-01',
        type: 'lead.created',
        timestamp: '2026-10-28T16:00:00Z',
        entity: { id: 'pf-lead-999', type: 'lead' },
        payload: {
          channel: 'whatsapp',
          entityType: 'listing',
          status: 'sent',
          sender: {
            name: 'Omar Hassan',
            contacts: [
              { type: 'phone', value: '+201012345678' },
              { type: 'email', value: 'omar@example.com' },
            ],
          },
          listing: { id: '01JNT5', reference: 'MI-S-3S-48M' },
        },
      }),
    });

    const res = await pfWebhookPost(req);
    expect(res.status).toBe(200);
    expect(mockUpsertRecord).toHaveBeenCalledWith(
      'leads',
      expect.objectContaining({
        fullName: 'Omar Hassan',
        phone: '+201012345678',
        email: 'omar@example.com',
        pfLeadId: 'pf-lead-999',
        summaryNotes: 'PF Listing Ref: MI-S-3S-48M',
      }),
      'pf_lead_id',
    );
    expect(mockEnqueueWhatsAppJob).toHaveBeenCalledWith(
      expect.objectContaining({
        toPhone: '+201012345678',
        toName: 'Omar Hassan',
      }),
    );
  });

  it('records publish failure state on listing.publishFailed', async () => {
    mockListRecords.mockResolvedValueOnce([{ id: 'unit-row-7', automation: { isPublishedToPF: true } }]);

    const req = new NextRequest('https://sierra-estates.net/api/webhooks/property-finder', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt-02',
        type: 'listing.publishFailed',
        timestamp: '2026-10-28T16:05:00Z',
        entity: { id: '01JNT999', type: 'listing' },
        payload: {
          reference: 'ET-R90-4S-18.5M',
          reason: 'insufficient_credits',
        },
      }),
    });

    const res = await pfWebhookPost(req);
    expect(res.status).toBe(200);
    expect(mockUpdateRecord).toHaveBeenCalledWith(
      'listings',
      'unit-row-7',
      expect.objectContaining({
        pfStatus: 'publish_failed',
        automation: expect.objectContaining({
          isPublishedToPF: false,
          pfPublishFailureReason: 'insufficient_credits',
        }),
      }),
    );
  });
});
