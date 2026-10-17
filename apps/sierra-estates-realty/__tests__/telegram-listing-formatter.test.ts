/**
 * lib/server/telegram-listing-formatter — Gemini AI property formatter
 * (Sierra Estates 3.0, Phase 2).
 *
 * §21 anti-fabrication is the core contract: the caption renders ONLY the
 * facts the source listing provides. With no Gemini key configured the
 * formatter degrades to the deterministic template and says so.
 */

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
}));

import {
  buildListingCaptionTemplate,
  buildWhatsAppBookingLink,
  captionAsHtml,
  formatListingForTelegram,
} from '../lib/server/telegram-listing-formatter';

const FULL_UNIT = {
  code: 'SE-RNT-HYD-0014',
  compound: 'Hyde Park',
  zone: '5th Settlement',
  unitType: 'Apartment',
  dealType: 'rent',
  areaSqm: 165,
  floor: 3,
  finishing: 'Fully Finished',
  bedrooms: 3,
  bathrooms: 3,
  price: 25000,
  paymentTerms: 'شهري مقدماً + شهرين تأمين',
  locationHighlights: ['فيو لاند سكيب', 'قرب بوابة 16'],
  masterplanProximity: 'النادي الرياضي',
  contactName: 'Sierra Sales',
  contactPhone: '+201001234567',
  description: 'وحدة مميزة استلام فوري',
};

beforeEach(() => {
  delete process.env.GOOGLE_GENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.TELEGRAM_LISTING_CONTACT_PHONE;
  delete process.env.SIERRA_CONTACT_PHONE;
});

describe('buildListingCaptionTemplate — structure', () => {
  it('renders all seven canonical sections from a full spec', () => {
    const caption = buildListingCaptionTemplate(FULL_UNIT);
    expect(caption).toContain('🏷️');
    expect(caption).toContain('SE-RNT-HYD-0014');
    expect(caption).toContain('Hyde Park');
    expect(caption).toContain('📐');
    expect(caption).toContain('165 م²');
    expect(caption).toContain('الدور 3');
    expect(caption).toContain('🛏️');
    expect(caption).toContain('🚿');
    expect(caption).toContain('💰');
    expect(caption).toContain('25,000 EGP');
    expect(caption).toContain('💳');
    expect(caption).toContain('📍');
    expect(caption).toContain('📞');
    expect(caption).toContain('https://wa.me/201001234567');
  });

  it('labels rentals as للإيجار and sales as للبيع', () => {
    expect(buildListingCaptionTemplate(FULL_UNIT)).toContain('للإيجار');
    expect(buildListingCaptionTemplate({ ...FULL_UNIT, dealType: 'sale' })).toContain('للبيع');
  });
});

describe('buildListingCaptionTemplate — §21 no-fabrication', () => {
  it('omits sections whose facts are absent (never invents them)', () => {
    const sparse = buildListingCaptionTemplate({
      compound: 'Mivida',
      dealType: 'rent',
      bedrooms: 2,
    });
    expect(sparse).toContain('Mivida');
    expect(sparse).toContain('🛏️');
    expect(sparse).not.toContain('📐'); // no area/floor/finishing facts
    expect(sparse).not.toContain('💳'); // no payment terms fact
    expect(sparse).not.toContain('📍'); // no location facts
    expect(sparse).toContain('السعر: عند الطلب'); // honest price fallback
  });

  it('generates a canonical unit code when the source carries none', () => {
    const caption = buildListingCaptionTemplate({ compound: 'Hyde Park', dealType: 'rent', price: 20000 });
    expect(caption).toMatch(/SE-RNT-HYD-\d{3,6}/);
  });

  it('falls back to the office contact line when no phone exists anywhere', () => {
    const caption = buildListingCaptionTemplate({ compound: 'Mivida', dealType: 'rent' });
    expect(caption).toContain('📞');
    expect(caption).not.toContain('https://wa.me/');
  });
});

describe('buildWhatsAppBookingLink', () => {
  it('builds a prefilled wa.me link with the unit code', () => {
    const link = buildWhatsAppBookingLink(FULL_UNIT);
    expect(link).toMatch(/^https:\/\/wa\.me\/201001234567\?text=/);
    expect(decodeURIComponent(link)).toContain('SE-RNT-HYD-0014');
  });

  it('normalizes local 01x numbers to the 20 country code', () => {
    const link = buildWhatsAppBookingLink({ compound: 'Mivida', contactPhone: '01001234567' });
    expect(link).toMatch(/^https:\/\/wa\.me\/201001234567/);
  });

  it('returns null when no contact phone is available', () => {
    expect(buildWhatsAppBookingLink({ compound: 'Mivida' })).toBeNull();
  });
});

describe('formatListingForTelegram — degradation honesty', () => {
  it('uses the deterministic template and flags it when Gemini is not configured', async () => {
    const result = await formatListingForTelegram(FULL_UNIT);
    expect(result.source).toBe('template');
    expect(result.unitCode).toBe('SE-RNT-HYD-0014');
    expect(result.generatedAt).toBeTruthy();
    expect(result.caption).toContain('Hyde Park');
    expect(result.model).toBeUndefined();
  });

  it('never throws — even on malformed unit input', async () => {
    const result = await formatListingForTelegram({ compound: '', dealType: 'rent' });
    expect(result.source).toBe('template');
    expect(result.caption.length).toBeGreaterThan(0);
  });
});

describe('captionAsHtml', () => {
  it('escapes Telegram-significant HTML characters only', () => {
    expect(captionAsHtml('a <b> & "c"')).toBe('a &lt;b&gt; &amp; "c"');
  });
});
