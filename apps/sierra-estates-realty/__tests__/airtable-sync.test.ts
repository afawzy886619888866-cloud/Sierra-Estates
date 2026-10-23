import {
  normalizePropertyType,
  normalizeStatus,
  normalizeListingType,
  normalizeFinishing,
  parseNumeric,
  mapRowToUnit,
} from '@/lib/services/listing-normalize';
import { AirtableIntegrationService } from '@/lib/services/AirtableIntegrationService';

describe('listing-normalize', () => {
  describe('normalizePropertyType', () => {
    test('maps residential types (English + Arabic + typos)', () => {
      expect(normalizePropertyType('Apartment')).toEqual({ propertyType: 'apartment', category: 'residential' });
      expect(normalizePropertyType('Apartment with garden')).toEqual({ propertyType: 'apartment', category: 'residential' });
      expect(normalizePropertyType('Vills')).toEqual({ propertyType: 'villa', category: 'residential' }); // common typo
      expect(normalizePropertyType('Twin House')).toEqual({ propertyType: 'villa', category: 'residential' });
      expect(normalizePropertyType('شقة')).toEqual({ propertyType: 'apartment', category: 'residential' });
      expect(normalizePropertyType('فيلا')).toEqual({ propertyType: 'villa', category: 'residential' });
      expect(normalizePropertyType('Penthouse')).toEqual({ propertyType: 'penthouse', category: 'residential' });
    });

    test('co-working / office / commercial collapse to commercial (the "cowork" fix)', () => {
      expect(normalizePropertyType('co-working-space')).toEqual({ propertyType: 'commercial', category: 'commercial' });
      expect(normalizePropertyType('Co Working')).toEqual({ propertyType: 'commercial', category: 'commercial' });
      expect(normalizePropertyType('Office')).toEqual({ propertyType: 'commercial', category: 'commercial' });
      expect(normalizePropertyType('Business Center')).toEqual({ propertyType: 'commercial', category: 'commercial' });
      expect(normalizePropertyType('Shop')).toEqual({ propertyType: 'commercial', category: 'commercial' });
      expect(normalizePropertyType('مكتب')).toEqual({ propertyType: 'commercial', category: 'commercial' });
    });

    test('unknown / empty falls back to apartment', () => {
      expect(normalizePropertyType('')).toEqual({ propertyType: 'apartment', category: 'residential' });
      expect(normalizePropertyType(undefined)).toEqual({ propertyType: 'apartment', category: 'residential' });
      expect(normalizePropertyType('something weird')).toEqual({ propertyType: 'apartment', category: 'residential' });
    });
  });

  describe('normalizeStatus', () => {
    test('maps availability text', () => {
      expect(normalizeStatus('Available')).toBe('available');
      expect(normalizeStatus('No answer')).toBe('available'); // contact state, keep visible
      expect(normalizeStatus('Sold')).toBe('sold');
      expect(normalizeStatus('محجوز')).toBe('reserved');
      expect(normalizeStatus('غير متاحه')).toBe('off-market');
      expect(normalizeStatus('')).toBe('available');
    });
  });

  describe('normalizeListingType', () => {
    test('detects rent vs sale in both languages', () => {
      expect(normalizeListingType('rent')).toBe('rent');
      expect(normalizeListingType('ايجار')).toBe('rent');
      expect(normalizeListingType('resale')).toBe('sale');
      expect(normalizeListingType('sell')).toBe('sale');
    });
  });

  describe('normalizeFinishing', () => {
    test('maps finishing text to the canonical enum', () => {
      expect(normalizeFinishing('Fully Finished')).toBe('fully-finished');
      expect(normalizeFinishing('Half Furnished')).toBe('semi-finished');
      expect(normalizeFinishing('تشطيبات شركه')).toBe('fully-finished');
      expect(normalizeFinishing('core & shell')).toBe('core-shell');
      expect(normalizeFinishing('')).toBeUndefined();
    });
  });

  describe('parseNumeric', () => {
    test('passes finite numbers through', () => {
      expect(parseNumeric(8500000)).toBe(8500000);
      expect(parseNumeric(109)).toBe(109);
    });
    test('parses dot- and comma-separated thousands', () => {
      expect(parseNumeric('4.600.000')).toBe(4600000);
      expect(parseNumeric('8,500,000')).toBe(8500000);
      expect(parseNumeric('6.200.000')).toBe(6200000);
    });
    test('parses Arabic-Indic digits', () => {
      expect(parseNumeric('١٠٩')).toBe(109);
    });
    test('applies million/thousand word multipliers', () => {
      expect(parseNumeric('6 مليون')).toBe(6000000);
      expect(parseNumeric('65 thousand')).toBe(65000);
    });
    test('returns 0 for unparseable input', () => {
      expect(parseNumeric('')).toBe(0);
      expect(parseNumeric(null)).toBe(0);
      expect(parseNumeric('N/A')).toBe(0);
    });
  });

  describe('mapRowToUnit', () => {
    test('maps an Owners-Rent style row', () => {
      const row = {
        Name: 'Owner A',
        Mobile: '1022844661',
        Availablty: 'Available',
        bedrooms: 3,
        Location: 'Madinaty',
        'Unit Price': 8500000,
        'Furnished or not': 'تشطيبات شركه',
        Type: 'rent',
        'Property Type': 'Apartment',
        Code: 'MT-B14-3U',
        Garden: 55,
        Space: 108,
      };
      const unit = mapRowToUnit(row, { ownerType: 'owner', syncSource: 'airtable' });
      expect(unit).not.toBeNull();
      expect(unit!.referenceNumber).toBe('MT-B14-3U');
      expect(unit!.propertyType).toBe('apartment');
      expect(unit!.category).toBe('residential');
      expect(unit!.price).toBe(8500000);
      expect(unit!.monthlyRent).toBe(8500000); // rent listing
      expect(unit!.area).toBe(108);
      expect(unit!.bedrooms).toBe(3);
      expect(unit!.compound).toBe('Madinaty');
      expect(unit!.finishingType).toBe('fully-finished');
      expect(unit!.ownerType).toBe('owner');
      expect(unit!.ownerContact).toBe('1022844661');
      expect(unit!.amenities).toContain('garden');
      expect(unit!.syncSource).toBe('airtable');
    });

    test('maps an Arabic resale row with messy price + commercial type', () => {
      const row = {
        الكمبوند: 'madinaty',
        السعر: '4.600.000',
        'نوع الوحده': 'Office',
        المساحه: 109,
        'بيع/ ايجار': 'sell',
        الكود: 'MAD-S-2004',
      };
      const unit = mapRowToUnit(row, { ownerType: 'owner', syncSource: 'airtable' });
      expect(unit).not.toBeNull();
      expect(unit!.referenceNumber).toBe('MAD-S-2004');
      expect(unit!.price).toBe(4600000);
      expect(unit!.propertyType).toBe('commercial');
      expect(unit!.category).toBe('commercial');
      expect(unit!.monthlyRent).toBeUndefined(); // sale, not rent
    });

    test('returns null when a row has neither price nor code', () => {
      expect(mapRowToUnit({ Name: 'Just a contact', Mobile: '123' })).toBeNull();
    });
  });
});

describe('AirtableIntegrationService', () => {
  const ORIGINAL_ENV = process.env;
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  test('ownerTypeForTable infers owner/broker/internal from table name', () => {
    expect(AirtableIntegrationService.ownerTypeForTable('Owners-Rent')).toBe('owner');
    expect(AirtableIntegrationService.ownerTypeForTable('Brokers')).toBe('broker');
    expect(AirtableIntegrationService.ownerTypeForTable('Team Units')).toBe('internal');
  });

  test('getConfig returns null when env is missing', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AIRTABLE_API_KEY;
    delete process.env.AIRTABLE_BASE_ID;
    delete process.env.AIRTABLE_TABLE_NAME;
    expect(AirtableIntegrationService.getConfig()).toBeNull();
  });

  test('getConfig parses a comma-separated table list', () => {
    process.env = {
      ...ORIGINAL_ENV,
      AIRTABLE_API_KEY: 'key_test',
      AIRTABLE_BASE_ID: 'appTest',
      AIRTABLE_TABLE_NAME: 'Owners-Rent, Owners-Resale ,Brokers',
    };
    const cfg = AirtableIntegrationService.getConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.baseId).toBe('appTest');
    expect(cfg!.tables).toEqual(['Owners-Rent', 'Owners-Resale', 'Brokers']);
  });
});
