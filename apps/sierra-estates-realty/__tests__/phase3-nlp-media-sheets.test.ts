import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const arabicNlp = require(path.resolve(__dirname, '../../../packages/arabic-nlp'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const classifier = require(path.resolve(__dirname, '../../../workflows/02-gemini-property-classifier'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mediaHarvester = require(path.resolve(__dirname, '../../../workflows/03-media-harvester'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sheetsSync = require(path.resolve(__dirname, '../../../workflows/14-sheets-supabase-sync/sync'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const outreach = require(path.resolve(__dirname, '../../../workflows/09-owner-outreach/outreach'));

describe('Phase 3: Arabic NLP Pre-Filter, WebP Media & Two-Way Sheets Sync', () => {
  describe('packages/arabic-nlp preFilterArabicListing', () => {
    it('classifies rent signals and demand vs supply deterministically', () => {
      const rentSupply = arabicNlp.preFilterArabicListing(
        'معروض شقة للإيجار الشهري في ميفيدا 180 متر 3 غرف بسعر 45 الف شهريا من المالك ٠١٠١٢٣٤٥٦٧٨',
      );
      expect(rentSupply.mode).toBe('rent');
      expect(rentSupply.intent).toBe('supply');
      expect(rentSupply.advertiserRole).toBe('owner');
      expect(rentSupply.areaSqm).toBe(180);
      expect(rentSupply.bedrooms).toBe(3);
      expect(rentSupply.priceEgp).toBe(45000);
      expect(rentSupply.phone).toBe('01012345678');
      expect(rentSupply.confidence).toBeGreaterThanOrEqual(0.85);
      expect(rentSupply.autoPublishEligible).toBe(true);

      const saleDemand = arabicNlp.preFilterArabicListing(
        'مطلوب فيلا للبيع كاش او تقسيط بمقدم وأوفر في هايد بارك 300م بروكر',
      );
      expect(saleDemand.mode).toBe('sale');
      expect(saleDemand.intent).toBe('demand');
      expect(saleDemand.advertiserRole).toBe('broker');
    });
  });

  describe('workflows/02-gemini-property-classifier', () => {
    it('auto-publishes to STAGING when confidence >= 0.85 without Telegram prompt', async () => {
      const confirmSpy = jest.fn();
      const res = await classifier.classifyPropertyListing({
        unitId: 'UN-HIGH-1',
        rawText: 'معروض شقة للبيع كاش في بالم هيلز 200 متر 3 غرف 9 مليون مباشر من المالك 01099887766',
        skipGemini: true,
        telegramConfirmFn: confirmSpy,
      });

      expect(res.publishStatus).toBe('STAGING');
      expect(res.reviewStatus).toBe('AUTO_PUBLISHED');
      expect(res.mode).toBe('sale');
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('marks REVIEW_REQUIRED and sends 1-tap Telegram Rent/Sale confirmation when confidence < 0.85', async () => {
      const prevToken = process.env.TELEGRAM_BOT_TOKEN;
      const prevChat = process.env.ROLE_MANAGEMENT_CHAT_ID;
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
      process.env.ROLE_MANAGEMENT_CHAT_ID = '-100555666';

      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      try {
        const res = await classifier.classifyPropertyListing({
          unitId: 'UN-LOW-2',
          rawText: 'شقة في التجمع الخامس مساحه كويسه',
          geminiExtractFn: async () => ({ mode: null, confidence: 0.4 }),
          telegramConfirmFn: (args: { unitId: string; rawText: string; confidence: number }) =>
            classifier.sendTelegramModeConfirmation({ ...args, fetchImpl: fetchMock }),
        });

        expect(res.publishStatus).toBe('REVIEW_REQUIRED');
        expect(res.reviewStatus).toBe('REVIEW_REQUIRED');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
        expect(body.chat_id).toBe('-100555666');
        expect(body.reply_markup.inline_keyboard[0]).toEqual([
          { text: 'Rent (إيجار)', callback_data: 'confirm_mode:UN-LOW-2:rent' },
          { text: 'Sale (بيع)', callback_data: 'confirm_mode:UN-LOW-2:sale' },
        ]);
      } finally {
        process.env.TELEGRAM_BOT_TOKEN = prevToken;
        process.env.ROLE_MANAGEMENT_CHAT_ID = prevChat;
      }
    });
  });

  describe('workflows/03-media-harvester', () => {
    it('converts images to 1920px/80% WebP, uploads to unit-photos/{unit_id}/{index}.webp, and updates Supabase', async () => {
      const uploaded: Array<{ objectPath: string; contentType: string; bytes: number }> = [];
      const dbUpdates: Array<{ table: string; payload: Record<string, unknown>; id: string }> = [];

      const sharpMock = jest.fn(() => {
        const chain = {
          resize: jest.fn((opts) => {
            expect(opts).toEqual({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true });
            return chain;
          }),
          webp: jest.fn((opts) => {
            expect(opts).toEqual({ quality: 80 });
            return chain;
          }),
          toBuffer: jest.fn(async () => Buffer.from('webp-bytes')),
        };
        return chain;
      });

      const supabaseMock = {
        storage: {
          from: jest.fn(() => ({
            upload: jest.fn(async (objectPath: string, buf: Buffer, opts: { contentType: string }) => {
              uploaded.push({ objectPath, contentType: opts.contentType, bytes: buf.length });
              return { data: { path: objectPath }, error: null };
            }),
            getPublicUrl: jest.fn((objectPath: string) => ({
              data: { publicUrl: `https://cdn.example.com/storage/v1/object/public/unit-photos/${objectPath}` },
            })),
          })),
        },
        from: jest.fn((table: string) => ({
          update: (payload: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              dbUpdates.push({ table, payload, id });
              return { error: null };
            },
          }),
        })),
      };

      const res = await mediaHarvester.harvestUnitMedia({
        unitId: 'unit-abc-99',
        mediaItems: [Buffer.from('img-0'), Buffer.from('img-1')],
        dryRun: false,
        supabaseClient: supabaseMock,
        sharpImpl: sharpMock,
      });

      expect(res.ok).toBe(true);
      expect(res.photo_count).toBe(2);
      expect(res.storagePaths).toEqual(['unit-photos/unit-abc-99/0.webp', 'unit-photos/unit-abc-99/1.webp']);
      expect(uploaded).toHaveLength(2);
      expect(uploaded[0]).toEqual({ objectPath: 'unit-abc-99/0.webp', contentType: 'image/webp', bytes: 10 });
      expect(dbUpdates.map((d) => d.table)).toEqual(['listings', 'properties']);
      expect(dbUpdates[0].payload.photo_count).toBe(2);
    });
  });

  describe('workflows/14-sheets-supabase-sync/sync.js', () => {
    it('computes deterministic (phone_last7, compound, price) match keys and classifies incomplete broker units as tier_2_search_only', () => {
      const k1 = sheetsSync.compositeRowKey('+201012345678', 'ميفيدا', 8500000);
      const k2 = sheetsSync.compositeRowKey('01012345678', 'Mivida', '8,500,000');
      expect(k1).toBeTruthy();
      expect(k1).toBe(k2);

      const brokerIncomplete = sheetsSync.classifyBrokerTier({
        advertiser_role: 'broker',
        source_type: 'whatsapp_group',
        Price_EGP: 0,
        Area_SQM: 170,
        photo_count: 1,
      });
      expect(brokerIncomplete.score_tier).toBe('tier_2_search_only');
      expect(brokerIncomplete.trigger_outreach).toBe(false);
      expect(brokerIncomplete.request_photos).toBe(false);
    });

    it('falls back to POSTing upsert_units JSON to WF_SHEET_WRITE_URL', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, updated: 1 }),
      });

      const res = await sheetsSync.pushUnitsViaAppsScript(
        'https://script.google.com/macros/s/test/exec',
        {
          rows: [['SE-SL-MVD-001', '2026-11-15']],
          realRows: [],
          tab: 'Master_Inventory',
          realTab: 'Real_Available_Units',
        },
        { dryRun: false, secret: 'sec-1', fetchImpl: fetchMock },
      );

      expect(res.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
      expect(body.action).toBe('upsert_units');
      expect(body.secret).toBe('sec-1');
      expect(body.rows).toHaveLength(1);
    });
  });

  describe('workflows/09-owner-outreach/outreach.js', () => {
    it('marks broker replies as Broker Excluded and moves row to Excluded_Brokers via WF_SHEET_WRITE_URL', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

      const res = await outreach.classifyAndHandleOwnerReply({
        replyText: 'أنا وسيط عقاري ومكتب تسويق مش المالك',
        unitCode: 'SE-SL-HYD-010',
        phone: '01098765432',
        compound: 'Hyde Park',
        price: 7200000,
        writeUrl: 'https://script.google.com/macros/s/test/exec',
        secret: 'sec-2',
        dryRun: false,
        fetchImpl: fetchMock,
      });

      expect(res.isBroker).toBe(true);
      expect(res.status).toBe('Broker Excluded');
      expect(res.moveToTab).toBe('Excluded_Brokers');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(String(fetchMock.mock.calls[0][1].body));
      expect(payload).toEqual({
        secret: 'sec-2',
        action: 'outreach_feedback',
        status: 'Broker Excluded',
        moveToTab: 'Excluded_Brokers',
        match: {
          unit_code: 'SE-SL-HYD-010',
          phone_last7: '8765432',
          compound: 'Hyde Park',
          price: 7200000,
        },
      });
    });
  });
});
