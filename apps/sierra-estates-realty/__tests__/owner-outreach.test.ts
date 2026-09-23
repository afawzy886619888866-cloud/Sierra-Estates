import {
  normalizeEgyptPhone,
  generateOwnerOutreachMessage,
  OwnerOutreachService,
  type OwnerInventoryItem,
} from '../lib/services/OwnerOutreachService';

jest.mock('@sierra-estates/db', () => ({
  listRecords: jest.fn(async () => []),
  getRecord: jest.fn(async () => null),
  insertRecord: jest.fn(async (_table: string, data: any) => ({ id: `mock-${Date.now()}`, ...data })),
  updateRecord: jest.fn(async () => null),
}));

jest.mock('../lib/server/whatsapp-queue', () => {
  const actual = jest.requireActual('../lib/server/whatsapp-queue');
  return {
    ...actual,
    startOrContinueOwnerNegotiation: jest.fn(async (_params: any) => ({
      negotiationId: `neg-${Date.now()}`,
      jobId: `job-${Date.now()}`,
    })),

    getOutreachConfig: jest.fn(async () => ({
      operatingHourStart: 12,
      operatingHourEnd: 20,
      timezone: 'Africa/Cairo',
      batchSizePerNumber: 40,
      windowMinutes: 60,
      dailyCapPerNumber: 80,
      dailyCapTotal: 320,
    })),
  };
});

describe('OwnerOutreachService — Phone Normalization & Message Templating', () => {
  it('normalizes local Egyptian mobile numbers to E.164', () => {
    expect(normalizeEgyptPhone('01022844661')).toBe('+201022844661');
    expect(normalizeEgyptPhone('01145678901')).toBe('+201145678901');
    expect(normalizeEgyptPhone('01234567890')).toBe('+201234567890');
    expect(normalizeEgyptPhone('01598765432')).toBe('+201598765432');
    expect(normalizeEgyptPhone('+201022844661')).toBe('+201022844661');
    expect(normalizeEgyptPhone('201022844661')).toBe('+201022844661');
    expect(normalizeEgyptPhone('010-2284-4661')).toBe('+201022844661');
  });

  it('rejects invalid, landline, or non-Egyptian numbers', () => {
    expect(normalizeEgyptPhone('0227941234')).toBeNull(); // Cairo landline
    expect(normalizeEgyptPhone('12345')).toBeNull();
    expect(normalizeEgyptPhone('')).toBeNull();
    expect(normalizeEgyptPhone(null)).toBeNull();
  });

  it('generates courteous, personalized Arabic outreach message with compound and deal type', () => {
    const owner: OwnerInventoryItem = {
      id: 'test-1',
      name: 'أحمد فوزي',
      phone: '01022844661',
      e164Phone: '+201022844661',
      compound: 'Madinaty',
      zone: 'New Cairo',
      dealType: 'rent',
      propertyType: 'شقة',
      priceEgp: 35000,
    };

    const message = generateOwnerOutreachMessage(owner);
    expect(message).toContain('أحمد فوزي');
    expect(message).toContain('Madinaty');
    expect(message).toContain('للإيجار');
    expect(message).toContain('سييرا إستيتس');
    expect(message).toContain('Sierra Estates');
  });

  it('handles owners without names gracefully', () => {
    const owner: OwnerInventoryItem = {
      id: 'test-2',
      name: '',
      phone: '01123456789',
      e164Phone: '+201123456789',
      compound: 'Mivida',
      zone: 'New Cairo',
      dealType: 'sale',
      propertyType: 'Villa',
      priceEgp: 25000000,
    };

    const message = generateOwnerOutreachMessage(owner);
    expect(message).toContain('فندم');
    expect(message).toContain('Mivida');
    expect(message).toContain('للبيع');
  });
});

describe('OwnerOutreachService — Batch Enqueue & Schedule Scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes next hourly slot ISO string within expected boundaries', () => {
    const slot0 = OwnerOutreachService.getNextHourlySlot(0);
    const slot1 = OwnerOutreachService.getNextHourlySlot(1);

    expect(typeof slot0).toBe('string');
    expect(typeof slot1).toBe('string');
    const diff = new Date(slot1).getTime() - new Date(slot0).getTime();
    expect(diff).toBeCloseTo(3600000, -3); // ~1 hour difference
  });

  it('enqueues batch capped at requested size (40)', async () => {
    // Mock loadEligibleInventory to return 50 mock items
    jest.spyOn(OwnerOutreachService, 'loadEligibleInventory').mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        id: `mock-${i}`,
        name: `Owner ${i}`,
        phone: `010200000${String(i).padStart(2, '0')}`,
        e164Phone: `+2010200000${String(i).padStart(2, '0')}`,
        compound: 'Swan Lake',
        zone: 'New Cairo',
        dealType: 'sale' as const,
        propertyType: 'Apartment',
        priceEgp: 8000000,
      }))
    );

    const result = await OwnerOutreachService.enqueueBatch({ batchSize: 40 });
    expect(result.enqueuedCount).toBe(40);
    expect(result.jobs).toHaveLength(40);
    expect(result.jobs[0].compound).toBe('Swan Lake');
    expect(result.jobs[0].jobId).toBeDefined();
  });

  it('returns outreach status summary with operating window flags', async () => {
    const status = await OwnerOutreachService.getStatus();
    expect(status.config.operatingHourStart).toBe(12);
    expect(status.config.operatingHourEnd).toBe(20);
    expect(status.config.batchSizePerNumber).toBe(40);
    expect(typeof status.currentCairoHour).toBe('number');
    expect(typeof status.isOperatingWindow).toBe('boolean');
  });
});
