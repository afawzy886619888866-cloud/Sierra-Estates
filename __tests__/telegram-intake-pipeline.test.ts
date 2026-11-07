import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// State files must land in a sandbox dir, never the repo's .state.
const TMP_STATE = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-intake-state-'));
process.env.WF_STATE_DIR = TMP_STATE;

const require = createRequire(import.meta.url);
const ROOT_DIR = path.resolve(__dirname, '..');
const parser = require('../workflows/12-telegram-intake/parser.js');
const redact = require('../workflows/12-telegram-intake/redact.js');
const codes = require('../workflows/12-telegram-intake/codes.js');
const render = require('../workflows/12-telegram-intake/render.js');
const bot = require('../workflows/12-telegram-intake/bot.js');
const sheetsLib = require('../workflows/12-telegram-intake/sheets.js');
const { computeUnitSyncHash } = require('../workflows/lib/unit-sync-hash.js');

const COMPOSE = fs.readFileSync(path.join(ROOT_DIR, 'infra', 'docker-compose.runner.yml'), 'utf-8');
const DOCKERFILE = fs.readFileSync(path.join(ROOT_DIR, 'workflows', 'Dockerfile'), 'utf-8');

// A realistic Arabic agent intake (structure modeled on the real sheets):
// owner label + spaced phone + full listing fields.
const AR_INTAKE = [
  'شقة للتأجير في كمبوند فيفيد وايت بالشيخ زايد',
  'المساحة ٢٠٠ متر - الدور الثالث - 3 غرف نوم (2 ماستر) و 3 حمامات',
  'تشطيب ألترا سوبر لوكس - مفروشة بالكامل - فيو لاندسكيب',
  'الإيجار 45 الف جنيه شهري - الدفع كل 3 شهور - مقدم شهرين',
  'اسم المالك: محمد عبد الرحمن - رقم المالك: +20 100 882 1490',
  'الوحدة جاهزة فوري',
].join('\n');

const EN_INTAKE = [
  'Fareda: Apartment for rent in Mivida, New Cairo',
  '250 sqm, 2nd floor, 4 beds (3 master) | 4 baths',
  'Semi-Furnished, Ultra Super Lux, open view',
  'Rent: EGP 120,000 / month, payment semi-annually, deposit 2 months',
  'landlord: Ahmed Samy, contact: 011-0088-8834',
  'Available immediate',
].join('\n');

describe('Telegram intake pipeline — parser', () => {
  it('extracts a full Arabic listing incl. Arabic-Indic digits', () => {
    const l = parser.parseListing(AR_INTAKE);
    expect(l.listingType).toBe('rent');
    expect(l.propertyType).toBe('apartment');
    expect(l.areaSqm).toBe(200);
    expect(l.bedrooms).toBe(3);
    expect(l.bathrooms).toBe(3);
    expect(l.masterBedrooms).toBe(2);
    expect(l.finishing).toBe('Ultra Super Lux');
    expect(l.furnishing).toBe('Fully Furnished');
    expect(l.price.amount).toBe(45000);
    expect(l.price.currency).toBe('EGP');
    expect(l.price.period).toBe('month');
    expect(l.district).toBe('Sheikh Zayed');
    expect(['Quarterly', 'Semi-Annually']).toContain(l.paymentTerms);
    expect(l.missing).toBeUndefined();
    expect(parser.missingFields(l)).toEqual([]);
  });

  it('extracts a full English listing', () => {
    const l = parser.parseListing(EN_INTAKE);
    expect(l.listingType).toBe('rent');
    expect(l.propertyType).toBe('apartment');
    expect(l.areaSqm).toBe(250);
    expect(l.bedrooms).toBe(4);
    expect(l.bathrooms).toBe(4);
    expect(l.price.amount).toBe(120000);
    expect(l.price.period).toBe('month');
    expect(l.paymentTerms).toBe('Semi-Annually');
    expect(l.finishing).toBe('Ultra Super Lux');
    expect(parser.missingFields(l)).toEqual([]);
  });

  it('parses sale listings with millions and Arabic word counts', () => {
    const l = parser.parseListing('فيلا للبيع كمبوند تاج سيتي 5 مليون - مساحة 400 متر - 5 غرف نوم - 4 حمام - بدون تشطيب');
    expect(l.listingType).toBe('sale');
    expect(l.price.amount).toBe(5_000_000);
    expect(l.finishing).toBe('Without Finishing');
    expect(l.bedrooms).toBe(5);
    expect(l.bathrooms).toBe(4);
    expect(parser.missingFields(l)).toEqual([]);
  });

  it('gates incomplete listings with the exact missing field labels', () => {
    const l = parser.parseListing('شقة للبيع 200 متر 3 غرف');
    const missing = parser.missingFields(l);
    expect(missing.some((m) => m.includes('الكمبوند'))).toBe(true);
    expect(missing.some((m) => m.includes('السعر'))).toBe(true);
    expect(missing.some((m) => m.includes('غرف النوم'))).toBe(false); // beds present
  });

  it('never treats a price as a missing field when written with thousands separators', () => {
    const l = parser.parseListing('Townhouse for sale in O West, 300 sqm, 4 bedrooms, price 22,500,000 EGP cash');
    expect(l.price.amount).toBe(22_500_000);
    expect(l.paymentTerms).toBe('Cash');
    expect(parser.missingFields(l)).toEqual([]);
  });

  it('accepts district-only locations (compound OR district)', () => {
    const l = parser.parseListing('Apartment for rent, New Cairo, 180 sqm, 3 beds, 3 baths, 60,000 EGP monthly');
    expect(l.district).toBe('New Cairo');
    expect(parser.missingFields(l)).toEqual([]);
  });
});

describe('Telegram intake pipeline — privacy gate (owner doctrine)', () => {
  it('extracts spaced, dashed and labeled owner phones', () => {
    const phones = redact.extractOwnerPhones(AR_INTAKE + '\n' + EN_INTAKE);
    expect(phones).toContain('1008821490'); // "+20 100 882 1490"
    expect(phones).toContain('1100888834'); // "011-0088-8834"
    expect(phones.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts the landlord name from an explicit owner label', () => {
    expect(redact.extractLandlordName(AR_INTAKE)).toBe('محمد عبد الرحمن');
    expect(redact.extractLandlordName(EN_INTAKE)).toBe('Ahmed Samy');
  });

  it('never treats the concierge line as owner material', () => {
    const phones = redact.extractOwnerPhones('Call the concierge: 01092048333 or +20 109 204 8333');
    expect(phones).toEqual([]);
  });

  it('scrubs every owner contact from team-facing text (idempotent)', () => {
    const once = redact.scrubForTeam(AR_INTAKE);
    const twice = redact.scrubForTeam(once);
    expect(once).not.toContain('882 1490');
    expect(once).not.toContain('محمد عبد الرحمن');
    expect(once).not.toMatch(/1[0125]\d{8}/);
    expect(twice).toBe(once);
  });

  it('masks owner numbers for the internal scrubbed column', () => {
    expect(redact.maskPhone('1008821490')).toBe('100***1490');
    expect(redact.maskPhone('bad')).toBe('—');
  });
});

describe('Telegram intake pipeline — reference codes', () => {
  it('assigns sequential SE-RENT / SE-SALE codes, sheet-led', async () => {
    const rows = [
      ['2026-10-31T09:00:00Z', 'SE-RENT-0007', 'Rent'],
      ['2026-10-31T09:10:00Z', 'SE-SALE-0002', 'Sale'],
      ['2026-10-31T09:20:00Z', 'not-a-code', 'Rent'],
    ];
    const a = await codes.assignCode('rent', rows, 1);
    const b = await codes.assignCode('sale', rows, 1);
    const c = await codes.assignCode('rent', rows, 1);
    expect(a.code).toBe('SE-RENT-0008');
    expect(b.code).toBe('SE-SALE-0003');
    expect(c.code).toBe('SE-RENT-0009'); // in-process mutex prevents dupes
    expect(a.source).toBe('sheet');
  });

  it('falls back to the local counter when the sheet is unreadable', async () => {
    const a = await codes.assignCode('rent', null, 1);
    expect(a.code).toMatch(/^SE-RENT-\d{4}$/);
    expect(a.source).toBe('local');
  });

  it('builds a stable dedupe identity for re-sent listings', () => {
    const h1 = codes.intakeHash('شقة للبيع\n 300 متر', 'Fareda');
    const h2 = codes.intakeHash('شقة للبيع 300 متر', 'Fareda');
    const h3 = codes.intakeHash('شقة للبيع 300 متر', 'Christina');
    expect(h1).toBe(h2); // whitespace-insensitive
    expect(h1).not.toBe(h3); // agent-sensitive
  });
});

describe('Telegram intake pipeline — templates (broadcast privacy)', () => {
  const listing = {
    code: 'SE-RENT-0008', listingType: 'rent', propertyType: 'apartment',
    compound: 'Vivid White', district: 'Sheikh Zayed', areaSqm: 200,
    bedrooms: 3, bathrooms: 3, masterBedrooms: 2, floor: '3rd',
    furnishing: 'Fully Furnished', finishing: 'Ultra Super Lux', view: 'Landscape / Garden',
    price: { amount: 45000, currency: 'EGP', period: 'month' },
    paymentTerms: 'Quarterly', deposit: '2 month(s)', availability: 'Immediate Move-in',
  };

  it('renders the official Sierra-Estates template verbatim in structure', () => {
    const body = render.renderBroadcast(listing, 'Fareda');
    for (const anchor of [
      'Reference: [SE-RENT-0008]',
      '🏢 Exclusive Listing by Sierra-Estates',
      'for Rent in Vivid White, Sheikh Zayed',
      '• Total Area: 200 SQM',
      '• Interior Layout: 3 Beds (2 Master) | 3 Baths | Reception | Kitchen',
      '• Rental Price: 45,000 EGP / month',
      '📞 Internal Concierge Reference: SE-RENT-0008',
      '👤 Sourced by Agent: Fareda',
    ]) {
      expect(body).toContain(anchor);
    }
  });

  it('carries NO owner phone and NO landlord name — structural guarantee', () => {
    const l2 = { ...listing, compound: 'Badya <Phase 2> & Gardens' };
    const body = render.renderBroadcast(l2, 'Fareda & Co <admin>');
    // HTML-escaped untrusted values…
    expect(body).toContain('&lt;Phase 2&gt;');
    // …and zero non-concierge Egyptian mobiles anywhere in the body.
    expect(redact.broadcastLeftovers(body)).toEqual([]);
    expect(body).not.toMatch(/1[0125]\d{8}/);
  });

  it('confirmation matches the owner-approved format exactly', () => {
    const msg = render.renderConfirmation('SE-RENT-0008', 42, { broadcast: true, landlordCount: 1 });
    expect(msg).toContain('✅ Unit Received & Logged!');
    expect(msg).toContain('• Code: <code>SE-RENT-0008</code>');
    expect(msg).toContain('• Added to Master Sheet: Row #42');
    expect(msg).toContain('• Status: Sanitized and broadcasted to General.');
    expect(msg).toContain('stored internally only — never broadcast');
  });

  it('missing-fields reply is bilingual and actionable (never generic)', () => {
    const msg = render.renderMissingFields(['Price — السعر'], true);
    expect(msg).toContain('the unit is NOT logged yet');
    expect(msg).toContain('السعر');
    expect(msg).toContain('📷');
    expect(msg).not.toContain('حدث خطأ غير متوقع');
  });

  it('album caption stays under Telegram\'s 1024-char caption limit', () => {
    const long = { ...listing, compound: 'X'.repeat(200) };
    expect(render.renderAlbumCaption(long).length).toBeLessThan(1024);
  });
});

describe('Telegram intake pipeline — agent group routing (fail-closed)', () => {
  it('parses id:Name mappings and plain ids', () => {
    const groups = bot.parseAgentGroups('-100111:Fareda,-100222:Christina, -100333 , bogus');
    expect(groups.size).toBe(3);
    expect(groups.get('-100111')).toBe('Fareda');
    expect(groups.get('-100222')).toBe('Christina');
    expect(groups.get('-100333')).toBeNull();
  });

  it('ignores updates from chats that are not configured agent groups', async () => {
    // handleUpdate must return without touching intake for unknown chats
    // (fail-closed routing — no token/network needed for this path).
    const update = {
      update_id: 1,
      message: {
        message_id: 10, date: Math.floor(Date.now() / 1000),
        text: 'شقة للبيع 300 متر 5 مليون 4 غرف',
        chat: { id: -999999 },
        from: { id: 5, first_name: 'Stranger', is_bot: false },
      },
    };
    await expect(bot.handleUpdate(update)).resolves.toBeUndefined();
  });

  it('requires explicit group or user allowlisting for listing intake', () => {
    const groups = new Map([['-100111', 'Fareda']]);
    const users = new Set(['42']);

    expect(bot.isAuthorizedIntake(
      { chat: { id: -100111, type: 'supergroup' }, from: { id: 8 } },
      groups,
      users,
    )).toBe(true);
    expect(bot.isAuthorizedIntake(
      { chat: { id: -100999, type: 'group' }, from: { id: 8 } },
      groups,
      users,
    )).toBe(false);
    expect(bot.isAuthorizedIntake(
      { chat: { id: 42, type: 'private' }, from: { id: 42 } },
      groups,
      users,
    )).toBe(true);
    expect(bot.isAuthorizedIntake(
      { chat: { id: 99, type: 'private' }, from: { id: 99 } },
      groups,
      users,
    )).toBe(false);
    expect(bot.isAuthorizedIntake(
      { chat: { id: 99, type: 'private' }, from: { id: 99 } },
      new Map(),
      new Set(),
    )).toBe(false);
  });

  it('parses only numeric Telegram user IDs', () => {
    expect([...bot.parseAgentUserIds('42, 87, bad, -5')]).toEqual(['42', '87']);
  });
});

describe('Telegram intake pipeline — sheet contracts', () => {
  it('keeps the exact 20-column Master ledger header order (owner spec)', () => {
    expect(sheetsLib.INTAKE_HEADERS).toEqual([
      'Timestamp', 'Reference Code', 'Listing Type (Rent/Sale)', 'Agent Name',
      'Compound/Project', 'City/District', 'Unit Type', 'Area SQM', 'Bedrooms',
      'Bathrooms', 'Furnishing', 'Finishing', 'Price/Month', 'Payment Terms',
      'Deposit', 'Sanitized Description', 'Internal Private Notes',
      'Landlord Contact (Scrubbed)', 'Media Links', 'Status',
    ]);
  });

  it('keeps the new_units feed header identical to unit-adder\'s A–M contract (Deal Type in M, 2026-11-01)', () => {
    expect(sheetsLib.NEW_UNITS_HEADERS).toEqual([
      'Compound', 'Bedrooms', 'Bathrooms', 'Area', 'Price', 'Finishing Type',
      'Furnishing', 'Property Type', 'Address', 'Lat', 'Lng', 'Status', 'Deal Type',
    ]);
    // And the unit-adder itself still reads 'new_units'!A:M with PENDING rows
    // (column M = Deal Type written by the Telegram intake so rent units are
    // no longer mislabeled as sale — Mission 2 fix).
    const adder = fs.readFileSync(path.join(ROOT_DIR, 'workflows', '05-unit-adder', 'add.js'), 'utf-8');
    expect(adder).toContain("'new_units'!A:M");
    expect(adder).toContain("=== 'PENDING'");
    expect(adder).toContain("const SHEET_ID = resolveSpreadsheetId()");
  });

  it('resolves the spreadsheet id with the documented fallback chain', () => {
    const prev = {
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
      TELEGRAM_MASTER_SHEET_ID: process.env.TELEGRAM_MASTER_SHEET_ID,
      UNITS_SHEET_ID: process.env.UNITS_SHEET_ID,
      BROKER_INBOX_SHEET_ID: process.env.BROKER_INBOX_SHEET_ID,
    };
    try {
      delete process.env.GOOGLE_SHEET_ID;
      delete process.env.TELEGRAM_MASTER_SHEET_ID;
      delete process.env.BROKER_INBOX_SHEET_ID;
      process.env.UNITS_SHEET_ID = 'units-default';
      expect(sheetsLib.resolveSpreadsheetId()).toBe('units-default');
      process.env.TELEGRAM_MASTER_SHEET_ID = 'master';
      expect(sheetsLib.resolveSpreadsheetId()).toBe('master');
      process.env.GOOGLE_SHEET_ID = 'explicit';
      expect(sheetsLib.resolveSpreadsheetId()).toBe('explicit');
      delete process.env.GOOGLE_SHEET_ID;
      delete process.env.TELEGRAM_MASTER_SHEET_ID;
      delete process.env.UNITS_SHEET_ID;
      process.env.BROKER_INBOX_SHEET_ID = 'broker-fallback';
      expect(sheetsLib.resolveSpreadsheetId()).toBe('broker-fallback');
    } finally {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });

  it('uses the same unit identity hash for Telegram fallback and sheet unit-adder rows', () => {
    const telegramFallback = computeUnitSyncHash({
      compound: 'Mivida',
      area: 190,
      price: 14_500_000,
      bedrooms: 3,
      propertyType: 'apartment',
      dealType: 'sale',
    });
    const sheetUnit = computeUnitSyncHash({
      compound: 'Mivida',
      area: '190',
      price: '14500000',
      bedrooms: '3',
      propertyType: 'Apartment',
      dealType: 'Sale',
    });

    expect(telegramFallback).toBe(sheetUnit);
  });
});

describe('Telegram intake pipeline — deployment wiring', () => {
  it('compose defines the telegram-intake service with env passthrough', () => {
    expect(COMPOSE).toContain('telegram-intake:');
    for (const envVar of [
      'TELEGRAM_BOT_TOKEN', 'TELEGRAM_AGENT_GROUP_IDS', 'TELEGRAM_GENERAL_GROUP_ID',
      'GOOGLE_SERVICE_ACCOUNT_JSON', 'SUPABASE_SERVICE_ROLE_KEY',
    ]) {
      expect(COMPOSE).toContain(envVar);
    }
  });

  it('the bot service NEVER carries OPENWA session ids (WhatsApp fleet is not its lane)', () => {
    const botSvc = COMPOSE.slice(COMPOSE.indexOf('telegram-intake:'));
    expect(botSvc).not.toContain('OPENWA_SESSION_IDS');
    // …and the flagship line-2 stays excluded from the WhatsApp pool it
    // does belong to (guard against accidental rotation creep).
    expect(COMPOSE).toContain('line-1,line-3,line-4,line-5,line-6,line-7,line-8');
  });

  it('the Dockerfile ships the 12-telegram-intake sources', () => {
    expect(DOCKERFILE).toContain('12-telegram-intake');
    expect(DOCKERFILE).toContain('05-unit-adder');
  });

  it('the bot writes its heartbeat into the shared state volume', () => {
    expect(COMPOSE).toContain('telegram-intake-heartbeat');
  });

  it('no Telegram token is committed anywhere in the new pipeline', () => {
    // The one thing this repo must never repeat (see TELEGRAM_BOT_README).
    const dir = path.join(ROOT_DIR, 'workflows', '12-telegram-intake');
    for (const f of fs.readdirSync(dir)) {
      const src = fs.readFileSync(path.join(dir, f), 'utf-8');
      expect(src).not.toMatch(/\d{8,}:[A-Za-z0-9_-]{30,}/); // token-shaped secret
    }
  });
});
