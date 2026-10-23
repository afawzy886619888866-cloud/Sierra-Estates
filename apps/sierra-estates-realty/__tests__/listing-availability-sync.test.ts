import {
  analyzeOwnerMessageText,
  ListingAvailabilitySyncService,
} from '@/lib/services/ListingAvailabilitySyncService';

const getRecordMock = jest.fn();
const listRecordsMock = jest.fn();
const insertRecordMock = jest.fn();
const updateRecordMock = jest.fn();
const maybeSingleMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: maybeSingleMock,
          }),
        }),
        or: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        }),
      }),
    }),
  }),
}));

describe('ListingAvailabilitySyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeOwnerMessageText', () => {
    test('detects available status and price in Arabic', () => {
      const result = analyzeOwnerMessageText('أهلاً يا فندم، الشقة متاحة ومطلوب 45 ألف شهرياً');
      expect(result.status).toBe('available');
      expect(result.extractedPrice).toBe(45000);
    });

    test('detects rented status in Arabic', () => {
      const result = analyzeOwnerMessageText('والله يا فندم اتأجرت الأسبوع اللي فات');
      expect(result.status).toBe('rented');
    });

    test('detects sold status in Arabic', () => {
      const result = analyzeOwnerMessageText('تم البيع خلاص شكراً لحضرتك');
      expect(result.status).toBe('sold');
    });

    test('detects available status in English', () => {
      const result = analyzeOwnerMessageText('Yes it is still available, price 60000');
      expect(result.status).toBe('available');
      expect(result.extractedPrice).toBe(60000);
    });

    test('detects unavailable status', () => {
      const result = analyzeOwnerMessageText('مش متاح حالياً');
      expect(result.status).toBe('unavailable');
    });
  });

  describe('syncFromInboundOwnerMessage', () => {
    test('updates existing database listing to available and updates price', async () => {
      getRecordMock.mockResolvedValue({
        id: 'unit-uuid-123',
        status: 'archived',
        price: 40000,
        ownerPhone: '+201012345678',
      });
      updateRecordMock.mockResolvedValue({ id: 'unit-uuid-123' });

      const res = await ListingAvailabilitySyncService.syncFromInboundOwnerMessage({
        negotiationId: 'neg-456',
        unitId: 'unit-uuid-123',
        ownerPhone: '+201012345678',
        text: 'الوحدة متاحة للتسليم والسعر 50 ألف',
      });

      expect(res.detectedStatus).toBe('available');
      expect(res.extractedPrice).toBe(50000);
      expect(res.actionTaken).toBe('updated_existing');
      expect(updateRecordMock).toHaveBeenCalledWith(
        'listings',
        'unit-uuid-123',
        expect.objectContaining({
          status: 'available',
          price: 50000,
        })
      );
    });

    test('updates existing listing to rented when owner states it is rented', async () => {
      getRecordMock.mockResolvedValue({
        id: 'unit-uuid-123',
        status: 'available',
        ownerPhone: '+201012345678',
      });
      updateRecordMock.mockResolvedValue({ id: 'unit-uuid-123' });

      const res = await ListingAvailabilitySyncService.syncFromInboundOwnerMessage({
        negotiationId: 'neg-456',
        unitId: 'unit-uuid-123',
        ownerPhone: '+201012345678',
        text: 'اتأجرت خلاص من يومين',
      });

      expect(res.detectedStatus).toBe('rented');
      expect(res.actionTaken).toBe('updated_existing');
      expect(updateRecordMock).toHaveBeenCalledWith(
        'listings',
        'unit-uuid-123',
        expect.objectContaining({
          status: 'rented',
        })
      );
    });
  });
});
