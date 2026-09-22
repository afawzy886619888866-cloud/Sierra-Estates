import {
  AugustOwnersAgentService,
  AUGUST_OWNERS_GROUP_ID,
} from '../lib/services/AugustOwnersAgentService';
import { WhatsAppParserService } from '../lib/services/WhatsAppParserService';
import * as ExcelService from '../lib/services/ExcelInventoryService';
import * as TelegramModule from '../lib/telegram';
import * as WhatsAppQueueModule from '../lib/server/whatsapp-queue';
import * as DBModule from '@sierra-estates/db';

jest.mock('@sierra-estates/db', () => ({
  insertRecord: jest.fn().mockResolvedValue({ id: 'mock-doc-id-123' }),
  getRecord: jest.fn().mockResolvedValue(null),
  listRecords: jest.fn().mockResolvedValue([]),
  updateRecord: jest.fn().mockResolvedValue({}),
  getSupabaseAdmin: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}));

jest.mock('../lib/services/WhatsAppParserService');
jest.mock('../lib/services/ExcelInventoryService');
jest.mock('../lib/telegram');
jest.mock('../lib/server/whatsapp-queue');
jest.mock('../lib/services/PFIntegrationService', () => ({
  PFIntegrationService: {
    publishListing: jest.fn().mockResolvedValue({ id: 'pf-123', reference: 'PF-SE-AUG-123' }),
  },
}));

describe('AugustOwnersAgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAugustOwnersGroup', () => {
    it('identifies August group by ID and canonical names', () => {
      expect(AugustOwnersAgentService.isAugustOwnersGroup(AUGUST_OWNERS_GROUP_ID)).toBe(true);
      expect(AugustOwnersAgentService.isAugustOwnersGroup('Owners August 2026')).toBe(true);
      expect(AugustOwnersAgentService.isAugustOwnersGroup('جروب ملاك أغسطس')).toBe(true);
      expect(AugustOwnersAgentService.isAugustOwnersGroup('random-group@g.us')).toBe(false);
    });
  });

  describe('Step 4: Slot-Filling Dialogue (Missing Fields)', () => {
    it('detects missing price and compound, and queries the sender in the group', async () => {
      // Mock parser returning incomplete listing
      (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({
        isListing: true,
        compound: 'Unknown',
        price: 0,
        bedrooms: 3,
        area: 0,
        phoneNumber: '',
      });

      const result = await AugustOwnersAgentService.processGroupMessage({
        rawMessage: 'شقة للبيع 3 غرف في التجمع الخامس',
        sender: '201099887766@c.us',
        group: 'Owners August 2026',
        groupId: AUGUST_OWNERS_GROUP_ID,
      });

      expect(result.handled).toBe(true);
      expect(result.isListing).toBe(true);
      expect(result.action).toBe('missing_info_requested');
      expect(result.missingFields).toContain('compound');
      expect(result.missingFields).toContain('price');
      expect(result.missingFields).toContain('area');
      expect(result.replyMessage).toContain('مطلوب استكمال بيانات الوحدة');
      expect(WhatsAppQueueModule.enqueueWhatsAppJob).toHaveBeenCalledWith(
        expect.objectContaining({
          toPhone: AUGUST_OWNERS_GROUP_ID,
          body: expect.stringContaining('اسم الكومباوند'),
        })
      );
    });
  });

  describe('Steps 1, 2, 3: Complete Unit Ingestion & Publishing', () => {
    it('ingests complete unit into DB, Excel sheet, Property Finder, and sends alerts', async () => {
      (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({
        isListing: true,
        compound: 'Mivida',
        price: 12500000,
        bedrooms: 3,
        bathrooms: 3,
        area: 210,
        finishing: 'Fully Finished',
        phoneNumber: '01012345678',
        ownerName: 'Eng. Tamer',
        type: 'Apartment',
        mode: 'sale',
      });

      const result = await AugustOwnersAgentService.processGroupMessage({
        rawMessage: 'شقة للبيع في ميفيدا مساحة 210م تشطيب كامل 3 غرف 3 حمام بسعر 12.5 مليون تواصل 01012345678',
        sender: '01012345678@c.us',
        group: 'Owners August 2026',
        groupId: AUGUST_OWNERS_GROUP_ID,
      });

      expect(result.handled).toBe(true);
      expect(result.isListing).toBe(true);
      expect(result.action).toBe('unit_published');
      expect(result.listingCode).toMatch(/^SE-AUG-/);
      expect(result.pfReference).toMatch(/^PF-SE-AUG-/);

      // Step 3: Inserted into Supabase
      expect(DBModule.insertRecord).toHaveBeenCalled();

      // Step 2: Appended to Excel Master Sheet marked Available
      expect(ExcelService.appendToExcelInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          compound: 'Mivida',
          price: 12500000,
          inventoryStatus: 'Available',
          operation: 'Sale',
          contactPhone: '01012345678',
        })
      );

      // Step 1: Telegram alert triggered
      expect(TelegramModule.sendTelegramMessage).toHaveBeenCalledWith(
        expect.stringContaining('New August Owner Unit Activated')
      );

      // Step 6: Confirmation sent to WhatsApp Group
      expect(WhatsAppQueueModule.enqueueWhatsAppJob).toHaveBeenCalledWith(
        expect.objectContaining({
          toPhone: AUGUST_OWNERS_GROUP_ID,
          body: expect.stringContaining('تم تفعيل ونشر الوحدة بنجاح'),
        })
      );
    });
  });

  describe('Step 6 (Reverse): Broadcast new units to August Owners group', () => {
    it('enqueues a stylized notification to the August Owners group', async () => {
      await AugustOwnersAgentService.broadcastNewUnitToGroup({
        code: 'SE-SUB-991122',
        compound: 'Hyde Park',
        propertyType: 'Villa',
        price: 24000000,
        beds: 4,
        area: 380,
      });

      expect(WhatsAppQueueModule.enqueueWhatsAppJob).toHaveBeenCalledWith(
        expect.objectContaining({
          toPhone: AUGUST_OWNERS_GROUP_ID,
          body: expect.stringContaining('وحدة جديدة مضافة للنظام'),
        })
      );
    });
  });
});
