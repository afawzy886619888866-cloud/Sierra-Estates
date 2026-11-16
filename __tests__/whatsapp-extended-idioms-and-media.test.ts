import { describe, it, expect } from 'vitest';
import { OpenClawAgent } from '../packages/agents/openclaw';
import { extractAttachedPhotos, extractAttachedMedia } from '../scripts/extract-whatsapp-chat';

describe('Expanded WhatsApp Chat Ingestion & Arabic Idioms Suite', () => {
  const agent = new OpenClawAgent({
    airtableApiKey: '',
    airtableBaseId: '',
    airtableTableName: 'Listings',
    aiApiKey: '',
  });

  describe('Arabic Price Idioms & Numeral Parsing', () => {
    it('parses Arabic-Indic numerals correctly (e.g. ١٩٠م and ١١ مليون)', () => {
      const chat = 'للبيع في هايد بارك شقة ١٩٠م ٣ غرف السعر ١١ مليون كاش';
      const parsed = agent.parseWhatsAppRealEstateText(chat);

      expect(parsed.compound).toBe('Hyde Park');
      expect(parsed.type).toBe('Apartment');
      expect(parsed.area_sqm).toBe(190);
      expect(parsed.bedrooms).toBe(3);
      expect(parsed.price).toBe(11_000_000);
      expect(parsed.operation).toBe('Sale');
    });

    it('parses fractional and colloquial Arabic idioms ("مليون ونصف" and "مليون وربع")', () => {
      const textHalf = 'شقة في التجمع الخامس للبيع بمليون ونصف كاش';
      const parsedHalf = agent.parseWhatsAppRealEstateText(textHalf);
      expect(parsedHalf.price).toBe(1_500_000);

      const textQuarter = 'شقة في الرحاب استلام فوري مليون وربع';
      const parsedQuarter = agent.parseWhatsAppRealEstateText(textQuarter);
      expect(parsedQuarter.price).toBe(1_250_000);

      const textTwoMillion = 'دوبلكس في ميفيدا بمليونين';
      const parsedTwoMillion = agent.parseWhatsAppRealEstateText(textTwoMillion);
      expect(parsedTwoMillion.price).toBe(2_000_000);
    });

    it('parses compound prices with millions and thousands ("11 مليون و 500 الف")', () => {
      const text = 'فيلا في بالم هيلز كاش 11 مليون و 500 الف';
      const parsed = agent.parseWhatsAppRealEstateText(text);
      expect(parsed.compound).toBe('Palm Hills');
      expect(parsed.price).toBe(11_500_000);
    });

    it('parses rental rates and distinguishes rent operation ("للايجار مفروش 45 الف شهريا")', () => {
      const text = 'للايجار شقة في مدينتي مفروش بالكامل 45 الف شهريا';
      const parsed = agent.parseWhatsAppRealEstateText(text);

      expect(parsed.operation).toBe('Rent');
      expect(parsed.furnishing).toBe('Furnished');
      expect(parsed.price).toBe(45_000);
      expect(parsed.compound).toBe('Madinaty');
    });

    it('extracts downpayment, installment years, and delivery date into paymentPlan', () => {
      const text = 'للبيع شقة في سوديك ايستاون مقدم 1.5 مليون واقساط على 7 سنوات واستلام فوري';
      const parsed = agent.parseWhatsAppRealEstateText(text);

      expect(parsed.compound).toBe('Eastown');
      expect(parsed.paymentPlan).toBeDefined();
      expect(parsed.paymentPlan?.downpayment).toBe(1_500_000);
      expect(parsed.paymentPlan?.installments).toBe(7);
      expect(parsed.paymentPlan?.deliveryDate).toBe('فوري');
    });
  });

  describe('Multi-Format Media Extraction', () => {
    it('extracts HEIC, AVIF, and iOS attached tags', () => {
      const chat = 'فيلا في ميفيدا <attached: mivida-front.heic> و صورة الصالون <attached: mivida-salon.avif>';
      const photos = extractAttachedPhotos(chat);

      expect(photos.length).toBe(2);
      expect(photos[0]).toContain('mivida-front.heic');
      expect(photos[1]).toContain('mivida-salon.avif');
    });

    it('extracts videos and voice notes via extractAttachedMedia', () => {
      const chat = `
        تفاصيل الشقة كاملة في الفيديو [video: walkthrough-unit12.mp4]
        وصوت المالك [file: voice-note-01.opus]
        وصور المعاينة IMG-20260901-WA0010.jpg (file attached)
      `;
      const media = extractAttachedMedia(chat);

      expect(media.length).toBe(3);

      const video = media.find((m) => m.type === 'video');
      expect(video).toBeDefined();
      expect(video?.filename).toBe('walkthrough-unit12.mp4');

      const audio = media.find((m) => m.type === 'audio');
      expect(audio).toBeDefined();
      expect(audio?.filename).toBe('voice-note-01.opus');

      const image = media.find((m) => m.type === 'image');
      expect(image).toBeDefined();
      expect(image?.filename).toBe('IMG-20260901-WA0010.jpg');
    });
  });
});
