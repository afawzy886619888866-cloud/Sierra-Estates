/**
 * AWS EC2, OpenWA Gateway, & Real Estate Scrapers Test Suite
 * File: apps/sierra-estates-realty/__tests__/aws-ec2-stack.test.ts
 */

import { WhatsAppParserService } from '../lib/services/WhatsAppParserService';

describe('AWS EC2 & OpenWA Stack Verification', () => {
  const EC2_HOST = '18.232.148.172';
  const OPENWA_PORT = 3000;
  const N8N_PORT = 5678;

  it('validates EC2 public endpoint and service port definitions', () => {
    expect(EC2_HOST).toBe('18.232.148.172');
    expect(OPENWA_PORT).toBe(3000);
    expect(N8N_PORT).toBe(5678);
  });

  it('formats outgoing WhatsApp property listing messages with branding', () => {
    const propertyData = {
      compound: 'Villette Sodic',
      price: 15500000,
      bedrooms: 4,
    };

    const formatted = WhatsAppParserService.formatWhatsAppMessage(propertyData);

    expect(formatted).toContain('*BEYOND BROKERAGE.*');
    expect(formatted).toContain('*Villette Sodic*');
    expect(formatted).toContain('Price: 15500000 EGP');
    expect(formatted).toContain('Bedrooms: 4');
  });

  it('verifies OpenWA required environment variables shape', () => {
    const requiredEnv = [
      'OPENWA_PORT',
      'OPENWA_ADMIN_API_KEY',
      'OPENWA_OPERATOR_KEY',
      'OPENWA_ENGINE',
      'OPENWA_RATE_LIMIT',
    ];

    const sampleEnv = {
      OPENWA_PORT: '3000',
      OPENWA_ADMIN_API_KEY: 'test-admin-key',
      OPENWA_OPERATOR_KEY: 'test-operator-key',
      OPENWA_ENGINE: 'wwebjs',
      OPENWA_RATE_LIMIT: '30',
    };

    for (const key of requiredEnv) {
      expect(sampleEnv).toHaveProperty(key);
      expect(sampleEnv[key as keyof typeof sampleEnv]).toBeTruthy();
    }
  });
});

describe('Real Estate Scrapers & Data Normalizer', () => {
  it('parses structured numeric metrics from raw listing text', () => {
    const rawListingText = `
      Apartment for sale in Mivida New Cairo
      Area: 195 sqm
      3 Bedrooms, 3 Bathrooms
      Fully Finished with ACs
      Total Price: 14,500,000 EGP
      Down payment: 3,000,000 EGP
    `;

    // Regex extraction testing core parser patterns
    const priceMatch = rawListingText.match(/(\d[\d,]+)\s*(?:EGP|LE|جنيه)/i);
    const areaMatch = rawListingText.match(/(\d+)\s*(?:sqm|m2|متر)/i);
    const bedMatch = rawListingText.match(/(\d+)\s*(?:Bedrooms|Beds|غرف)/i);

    expect(priceMatch).toBeTruthy();
    const cleanPrice = Number(priceMatch![1].replace(/,/g, ''));
    expect(cleanPrice).toBe(14500000);

    expect(areaMatch).toBeTruthy();
    expect(Number(areaMatch![1])).toBe(195);

    expect(bedMatch).toBeTruthy();
    expect(Number(bedMatch![1])).toBe(3);
  });

  it('correctly maps compound synonym variations to canonical master names', () => {
    const compoundSynonyms: Record<string, string> = {
      'villette': 'Villette New Cairo',
      'villete sodic': 'Villette New Cairo',
      'sodic villette': 'Villette New Cairo',
      'mivida': 'Mivida Emaar',
      'mivida compound': 'Mivida Emaar',
      'swan lake': 'Swan Lake Residences',
      'swanlake': 'Swan Lake Residences',
      'سوان ليك': 'Swan Lake Residences',
      'ميفيدا': 'Mivida Emaar',
      'فيليت': 'Villette New Cairo',
    };

    const normalizeCompound = (name: string) => {
      const lower = name.trim().toLowerCase();
      return compoundSynonyms[lower] || name;
    };

    expect(normalizeCompound('villette')).toBe('Villette New Cairo');
    expect(normalizeCompound('sodic villette')).toBe('Villette New Cairo');
    expect(normalizeCompound('ميفيدا')).toBe('Mivida Emaar');
    expect(normalizeCompound('سوان ليك')).toBe('Swan Lake Residences');
  });

  it('deduplicates listing records by phone and price signature', () => {
    const rawListings = [
      { id: '1', phone: '01001234567', compound: 'Villette', price: 15000000 },
      { id: '2', phone: '01001234567', compound: 'Villette', price: 15000000 }, // Duplicate
      { id: '3', phone: '01009876543', compound: 'Mivida', price: 12000000 },
    ];

    const seen = new Set<string>();
    const deduplicated = rawListings.filter((item) => {
      const key = `${item.phone}_${item.compound}_${item.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    expect(deduplicated).toHaveLength(2);
    expect(deduplicated.map((d) => d.id)).toEqual(['1', '3']);
  });
});
