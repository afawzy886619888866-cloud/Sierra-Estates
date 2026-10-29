import { describe, it, expect } from 'vitest';
import {
  generateCanonicalRentCode,
  generateRentMarketingScript,
  validateRentListingForPropertyFinder,
  buildPropertyFinderRentPayload,
} from '../workflows/lib/propertyfinder-rent-ad';
import { classifyOwnerReply } from '../workflows/lib/inbox';

describe('Owner Rent Workflow & Property Finder Rent Ad Suite', () => {
  it('generates canonical rent code matching {Compound}-{Beds}{Furnished}-{PriceTag}', () => {
    const code1 = generateCanonicalRentCode({
      compound: 'Mivida',
      bedrooms: 3,
      furnished: 'furnished',
      price: 45000,
    });
    expect(code1).toBe('MI-3F-45K');

    const code2 = generateCanonicalRentCode({
      compound: 'Hyde Park',
      bedrooms: 4,
      furnished: 'unfurnished',
      price: 65000,
    });
    expect(code2).toBe('HP-4U-65K');

    const code3 = generateCanonicalRentCode({
      compound: 'Villette',
      bedrooms: 3,
      furnished: 'furnished',
      price: 120000,
    });
    expect(code3).toBe('VS-3F-120K');
  });

  it('generates institutional Arabic and English rent scripts with monthly pricing and WhatsApp broadcast', () => {
    const script = generateRentMarketingScript({
      compound: 'Mivida',
      propertyType: 'Luxury Apartment',
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 180,
      price: 45000,
      furnished: 'furnished',
      ownerPhone: '01061399688',
    });

    expect(script.code).toBe('MI-3F-45K');
    expect(script.titleAr).toContain('شقة فاخرة');
    expect(script.titleAr).toContain('للإيجار');
    expect(script.titleAr).toContain('ميفيدا');
    expect(script.descriptionAr).toContain('45,000 ج.م / شهرياً');
    expect(script.whatsappBroadcast).toContain('45,000 ج.م / شهرياً');
    expect(script.whatsappBroadcast).toContain('كود: MI-3F-45K');
    expect(script.whatsappBroadcast).toContain('https://wa.me/201061399688?text=معاينة_إيجار_كود_MI-3F-45K');
  });

  it('validates Property Finder 6-photo and pricing gate for Rent listings', () => {
    const incompleteUnit = {
      compound: 'Mivida',
      price: 0,
      photoCount: 2,
      images: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
    };
    const invalidRes = validateRentListingForPropertyFinder(incompleteUnit);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors).toContain('Missing asking rental price (price <= 0)');
    expect(invalidRes.errors.some(e => e.includes('at least 6 photos'))).toBe(true);

    const readyUnit = {
      compound: 'Mivida',
      price: 55000,
      photoCount: 6,
      images: [
        'https://cdn.example.com/1.jpg',
        'https://cdn.example.com/2.jpg',
        'https://cdn.example.com/3.jpg',
        'https://cdn.example.com/4.jpg',
        'https://cdn.example.com/5.jpg',
        'https://cdn.example.com/6.jpg',
      ],
    };
    const validRes = validateRentListingForPropertyFinder(readyUnit);
    expect(validRes.valid).toBe(true);
    expect(validRes.errors.length).toBe(0);
  });

  it('builds official Property Finder Atlas v1 payload with RR offering type', () => {
    const payload = buildPropertyFinderRentPayload({
      compound: 'Mivida',
      propertyType: 'Apartment',
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 175,
      price: 50000,
      photoCount: 6,
      images: [
        'https://cdn.example.com/1.jpg',
        'https://cdn.example.com/2.jpg',
        'https://cdn.example.com/3.jpg',
        'https://cdn.example.com/4.jpg',
        'https://cdn.example.com/5.jpg',
        'https://cdn.example.com/6.jpg',
      ],
    });

    expect(payload.offering_type).toBe('RR');
    expect(payload.property_type).toBe('AP');
    expect(payload.category).toBe('residential');
    expect(payload.price.amounts[0].value).toBe(50000);
    expect(payload.price.amounts[0].frequency).toBe('monthly');
    expect(payload.price.amounts[0].currency).toBe('EGP');
    expect(payload.specs.bedrooms).toBe(3);
    expect(payload.media.photos.length).toBe(6);
    expect(payload.compliance.isCertified).toBe(true);
  });

  it('correctly classifies owner reply intents for rent (rented vs available)', () => {
    expect(classifyOwnerReply('الوحدة اتأجرت خلاص')).toBe('unavailable');
    expect(classifyOwnerReply('اتاجرت امبارح')).toBe('unavailable');
    expect(classifyOwnerReply('تم الايجار الحمد لله')).toBe('unavailable');
    expect(classifyOwnerReply('مؤجرة حاليا')).toBe('unavailable');
    expect(classifyOwnerReply('ايوه متاحة والإيجار 40 الف')).toBe('available');
    expect(classifyOwnerReply('متاحة وجاهزة للمعاينة')).toBe('available');
    expect(classifyOwnerReply('إلغاء مش عاوز رسايل')).toBe('opt_out');
  });

  it('extracts updated rent prices from owner replies', () => {
    const parsePrice = (text: string) => {
      const priceThousand = text.match(/(\d+(?:[.,]\d+)?)\s*(?:الف|ألف|k\b)/i);
      const priceMillion = text.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|ملون|million|m\b)/i);
      const priceDirect = text.match(/(?:سعر|مطلوب|الايجار|الإيجار|بـ|ب)\s*[:=]?\s*(\d[0-9,]{3,9})/i);
      if (priceThousand) return Math.round(parseFloat(priceThousand[1].replace(/,/g, '')) * 1000);
      if (priceMillion) return Math.round(parseFloat(priceMillion[1].replace(/,/g, '')) * 1000000);
      if (priceDirect) return Math.round(parseFloat(priceDirect[1].replace(/,/g, '')));
      return null;
    };

    expect(parsePrice('متاحة والإيجار 35 الف شهريا')).toBe(35000);
    expect(parsePrice('مطلوب 40,000 ج.م')).toBe(40000);
    expect(parsePrice('الايجار بـ 50000')).toBe(50000);
    expect(parsePrice('السعر 1.5 مليون')).toBe(1500000);
  });
});
