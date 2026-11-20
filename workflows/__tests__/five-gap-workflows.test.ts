import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const require = createRequire(import.meta.url);

const syncMod = require('../14-sheets-supabase-sync/sync.js');
const harvesterMod = require('../21-usb-phone-harvester/index.js');
const emailSenderMod = require('../04-email-sender/send.js');
const ownerContactMod = require('../03-owner-contact/contact.js');
const ownerSearchMod = require('../02-owner-search/search.js');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Gap Workflow 1: 14-sheets-supabase-sync/sync.js', () => {
  it('iteratively strips nonexistent DB columns and retries cleanly', async () => {
    const selectedColumnsHistory: string[] = [];
    const mockClient = {
      from: () => ({
        select: (cols: string) => {
          selectedColumnsHistory.push(cols);
          return {
            range: async () => {
              if (cols.includes('sourced_by_agent')) {
                return { data: null, error: { message: 'column listings.sourced_by_agent does not exist' } };
              }
              if (cols.includes('source_channel')) {
                return { data: null, error: { message: 'column listings.source_channel does not exist' } };
              }
              return {
                data: [
                  {
                    id: 'u-1',
                    code: 'SE-SL-MVD-001',
                    compound: 'mvd',
                    deal_type: 'rent',
                    property_type: 'apartment',
                    bathrooms: 2,
                    price: 35000,
                    sourced_by_agent: 'Kareem',
                  },
                ],
                error: null,
              };
            },
          };
        },
      }),
    };

    const rows = await syncMod.loadDbListings(mockClient);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('SE-SL-MVD-001');
    expect(selectedColumnsHistory.length).toBeGreaterThanOrEqual(2);
    expect(selectedColumnsHistory.at(-1)).not.toContain('source_channel');
  });

  it('maps real DB schema columns and infers broker role for tier classification', () => {
    const mapped = syncMod.dbRowToSheetRow({
      id: 'u-2',
      code: 'SE-BRK-01',
      deal_type: 'sale',
      compound: 'hyde park',
      property_type: 'apartment',
      bathrooms: 3,
      price: 0,
      area_sqm: 180,
      photo_count: 0,
      sourced_by_agent: 'Agent Sara',
      broker_name: 'Broker Office X',
      source_channel: 'whatsapp_group',
    });

    expect(mapped.Bathrooms).toBe(3);
    expect(mapped.Sourced_By_Agent).toBe('Agent Sara');
    expect(mapped.Canonical_Compound).toBe('Hyde Park');
    expect(mapped.__scoreTier).toBe('tier_2_search_only');
    expect(mapped.__triggerOutreach).toBe(false);
  });

  it('parses RFC-4180 CSV with quoted commas and escaped quotes', async () => {
    const csv = 'Unit_Code,Notes,Price_EGP\r\n"SE-01","Nice, ""Luxury"" Apt",45000\r\nSE-02,Simple,1200000\r\n';
    const parsed = await syncMod.readPublicSheetCsv({ csvText: csv });
    expect(parsed).toEqual([
      ['Unit_Code', 'Notes', 'Price_EGP'],
      ['SE-01', 'Nice, "Luxury" Apt', '45000'],
      ['SE-02', 'Simple', '1200000'],
    ]);
  });
});

describe('Gap Workflow 2: 21-usb-phone-harvester (CSV exporter & OpenWA fallback)', () => {
  it('filters out requests, sorts chronologically, and writes CSV snapshots without requiring xlsx', async () => {
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'usb-harvester-test-'));
    const { exportUnitsToExcel } = await import('../21-usb-phone-harvester/export-sheets.mjs');

    const res = await exportUnitsToExcel(
      [
        {
          unitCode: 'SE-WA-OLD',
          timestampMs: 1000,
          postedDate: '2026-11-01 10:00',
          postedDay: '2026-11-01',
          isRequest: false,
          advertiser: 'Direct Owner',
          compound: 'Mivida',
          priceEgp: 9000000,
          photosCount: 2,
          driveFolder: path.join(tmpOut, 'SE-WA-OLD'),
        },
        {
          unitCode: 'SE-WA-REQ',
          timestampMs: 5000,
          isRequest: true,
          advertiser: 'Broker',
          compound: 'Hyde Park',
        },
        {
          unitCode: 'SE-WA-NEW',
          timestampMs: 3000,
          postedDate: '2026-11-18 14:00',
          postedDay: '2026-11-18',
          isRequest: false,
          advertiser: 'Broker',
          compound: 'Eastown Sodic',
          priceEgp: 45000,
          photosCount: 0,
        },
      ],
      { outputDir: tmpOut, userDownloadsDir: null },
    );

    expect(res.availableCount).toBe(2);
    expect(res.ownersCount).toBe(1);
    expect(res.drivePhotosCount).toBe(1);
    expect(fs.existsSync(res.csvPath)).toBe(true);
    expect(fs.existsSync(res.ownersCsvPath)).toBe(true);
    expect(fs.existsSync(res.driveCsvPath)).toBe(true);

    const csvText = fs.readFileSync(res.csvPath, 'utf8');
    const lines = csvText.trim().split('\n');
    expect(lines[1]).toContain('SE-WA-NEW');
    expect(lines[2]).toContain('SE-WA-OLD');
    expect(csvText).not.toContain('SE-WA-REQ');
  });

  it('harvests valid real listings from OpenWA /api/harvester/recent and ignores buyer requests', async () => {
    const parseMod = await import('../21-usb-phone-harvester/parse-engine.mjs');
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            senderName: 'Owner Ali',
            rawText: 'شقة للبيع في ميفيدا التجمع الخامس مساحة 180م 3 غرف مطلوب 12 مليون كاش 01012345678',
            sourceGroup: 'Owners VIP',
          },
          {
            senderName: 'Client Buyer',
            rawText: 'مطلوب شقة للايجار في الرحاب فورا 3 غرف الميزانية 35 الف 01122334455',
            sourceGroup: 'Requests',
          },
        ]),
        { status: 200 },
      ),
    );

    const units = await harvesterMod.fetchOpenWaRecentUnits(parseMod, {
      baseUrl: 'http://127.0.0.1:2785',
      apiKey: 'test-key',
      fetchImpl: mockFetch,
    });

    expect(units).toHaveLength(1);
    expect(units[0].compound).toBe('Mivida');
    expect(units[0].isRequest).toBe(false);
  });
});

describe('Gap Workflow 3: 04-email-sender/send.js', () => {
  it('rejects dev placeholder keys and resolves real transports in priority order', () => {
    expect(emailSenderMod.isPlaceholderKey('SG.dev_sierra_estates_key_2026')).toBe(true);
    expect(emailSenderMod.isPlaceholderKey('re_...')).toBe(true);
    expect(emailSenderMod.isPlaceholderKey('')).toBe(true);
    expect(emailSenderMod.isPlaceholderKey('re_live_9876543210abcdef')).toBe(false);

    expect(
      emailSenderMod.resolveEmailTransport({
        SENDGRID_API_KEY: 'SG.dev_sierra_estates_key_2026',
        RESEND_API_KEY: 're_...',
      }),
    ).toBeNull();

    expect(
      emailSenderMod.resolveEmailTransport({
        RESEND_API_KEY: 're_live_9876543210abcdef',
        SENDGRID_API_KEY: 'SG.live_real_key_1234567890',
      })?.kind,
    ).toBe('resend');

    expect(
      emailSenderMod.resolveEmailTransport({
        SENDGRID_API_KEY: 'SG.live_real_key_1234567890',
      })?.kind,
    ).toBe('sendgrid');

    expect(
      emailSenderMod.resolveEmailTransport({
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'alerts@sierra-estates.net',
        SMTP_PASS: 'super_secret_smtp_pass_123',
      })?.kind,
    ).toBe('smtp');

    expect(
      emailSenderMod.resolveEmailTransport({
        EMAIL_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/live-deployment-id/exec',
      })?.kind,
    ).toBe('apps-script-relay');
  });

  it('uses sierra-estates.net URLs in all templates and renders variables', () => {
    for (const tpl of Object.values(emailSenderMod.EMAIL_TEMPLATES) as Array<{ html: string; subject: string }>) {
      expect(tpl.html).not.toContain('vercel.app');
      expect(tpl.html).toContain('sierra-estates.net');
    }

    const rendered = emailSenderMod.renderTemplate('property_alert', {
      property_title: 'Villa in Mivida',
      property_location: 'Mivida',
      property_price: '25,000,000',
      property_id: 'SE-SL-MVD-77',
    });
    expect(rendered.subject).toContain('Villa in Mivida');
    expect(rendered.html).toContain('https://sierra-estates.net/listings/SE-SL-MVD-77');
    expect(rendered.html).toContain('25,000,000 EGP');
  });
});

describe('Gap Workflow 4: 03-owner-contact/contact.js', () => {
  it('builds compliant Arabic outreach messages (no unit code/price, compound fallback + opt-out)', () => {
    const withCompound = ownerContactMod.buildContactMessage({
      location: 'Mivida',
      unitCode: 'SE-9988',
      price: '12,000,000',
    });
    expect(withCompound).toContain('Mivida');
    expect(withCompound).not.toContain('SE-9988');
    expect(withCompound).not.toContain('12,000,000');
    expect(withCompound).toContain('إلغاء');
    expect(withCompound).not.toContain('ليلى');

    const fallbackLoc = ownerContactMod.buildContactMessage({ location: '' });
    expect(fallbackLoc).toContain('القاهرة الجديدة');
  });

  it('loads contacted phones from JSONL ledger for cross-workflow deduplication', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contact-dedup-test-'));
    const ledgerFile = path.join(tmpDir, 'owner-outreach-ledger.jsonl');
    fs.writeFileSync(
      ledgerFile,
      [
        JSON.stringify({ phone: '+201061399688', at: '2026-11-10T10:00:00Z' }),
        JSON.stringify({ phone: '01092048333', at: '2026-11-11T10:00:00Z' }),
      ].join('\n'),
      'utf8',
    );

    const contacted = await ownerContactMod.loadContactedPhones({ ledgerFile, skipSupabase: true });
    expect(contacted.has('201061399688')).toBe(true);
    expect(contacted.has('01061399688')).toBe(true);
    expect(contacted.has('201092048333')).toBe(true);
    expect(contacted.has('01092048333')).toBe(true);
  });
});

describe('Gap Workflow 5: 02-owner-search/search.js', () => {
  it('rethrows Atlas HTTP 429 rate-limit instead of swallowing into UNCONFIGURED', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'tok-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'rate limit' }), { status: 429 }));

    await expect(
      ownerSearchMod.searchPropertyFinder({
        apiKey: 'same-key',
        apiSecret: 'sec-123',
        pfToken: 'same-key',
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/429|rate limited/i);
  });
});
