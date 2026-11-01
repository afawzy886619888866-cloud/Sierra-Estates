/**
 * mission2-5-pipeline.test.ts — regression suite for the 2026-11-01
 * master-order implementation:
 *   · compound canonicalization (Mission 3 rule 4)
 *   · dedup index + ±5% price DQE gate (Mission 2)
 *   · strict listing validation (Mission 3 rules 1–6)
 *   · information shapes (Mission 5)
 *   · paced outreach pacing contract (Mission 2)
 *   · sheets↔supabase sync mapping (Mission 3)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const WORKFLOWS = path.join(__dirname, '..', 'workflows');

// Fresh state dir per run so the dedup index never bleeds between tests.
const STATE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-tests-'));
process.env.WF_STATE_DIR = STATE_DIR;
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';

const compound = require(path.join(WORKFLOWS, 'lib', 'compound-canonical'));
const dedup = require(path.join(WORKFLOWS, 'lib', 'dedup-index'));
const validation = require(path.join(WORKFLOWS, 'lib', 'listing-validation'));
const shapes = require(path.join(WORKFLOWS, 'lib', 'info-shapes'));
const paced = require(path.join(WORKFLOWS, '13-paced-outreach', 'paced-outreach.js'));
const sync = require(path.join(WORKFLOWS, '14-sheets-supabase-sync', 'sync.js'));

beforeAll(() => {
  dedup.__resetForTests();
});

describe('Mission 3 — canonical compound mapping (rule 4)', () => {
  it('maps the owner-specified alias families to famous canonical names', () => {
    expect(compound.resolveCanonicalCompound('cfc')).toBe('Cairo Festival City');
    expect(compound.resolveCanonicalCompound('كايرو فيستيفال')).toBe('Cairo Festival City');
    expect(compound.resolveCanonicalCompound('Cairo Festival')).toBe('Cairo Festival City');
    expect(compound.resolveCanonicalCompound('mvd')).toBe('Mivida');
    expect(compound.resolveCanonicalCompound('ميفيدا')).toBe('Mivida');
    expect(compound.resolveCanonicalCompound('هايد بارك')).toBe('Hyde Park');
    expect(compound.resolveCanonicalCompound('ماونتن فيو اي سيتي')).toBe('Mountain View iCity');
    expect(compound.resolveCanonicalCompound('اب تاون')).toBe('Uptown Cairo');
  });

  it('is stable under case/spacing/digit normalization', () => {
    expect(compound.resolveCanonicalCompound('  CFC ')).toBe('Cairo Festival City');
    expect(compound.resolveCanonicalCompound('Hyde  Park')).toBe('Hyde Park');
  });

  it('passes unknown compounds through titled, never empty', () => {
    expect(compound.resolveCanonicalCompound('')).toBe('New Cairo (General)');
    expect(compound.resolveCanonicalCompound('some unknown place')).toBe('Some Unknown Place');
  });

  it('longer aliases win over shorter ones (business district)', () => {
    expect(compound.resolveCanonicalCompound('hyde park business district')).toBe('Hyde Park');
  });
});

describe('Mission 2 — dedup index + ±5% price DQE gate', () => {
  it('same owner+compound+type+area with price within ±5% → update_in_place', async () => {
    await dedup.record({ ownerPhone: '01008821490', compound: 'cfc', unitType: 'apartment', areaSqm: 175, price: 25000, dealType: 'rent', code: 'SE-RENT-0001' });
    const d = await dedup.checkDuplicate({ ownerPhone: '00201008821490', compound: 'كايرو فيستيفال سيتي', unitType: 'Apartment', areaSqm: 177, price: 25750, dealType: 'rent' });
    expect(d.duplicate).toBe(true);
    expect(d.action).toBe('update_in_place');
    expect(d.drift).toBeCloseTo(0.03, 2);
    expect(d.match.code).toBe('SE-RENT-0001');
  });

  it('same key but price beyond ±5% → PRICE_OUT_OF_BAND flag, not a duplicate', async () => {
    const d = await dedup.checkDuplicate({ ownerPhone: '01008821490', compound: 'CFC', unitType: 'apartment', areaSqm: 175, price: 30000, dealType: 'rent' });
    expect(d.duplicate).toBe(false);
    expect(d.dqeFlag?.reason).toBe('PRICE_OUT_OF_BAND');
    expect(d.dqeFlag?.existingPrice).toBe(25000);
  });

  it('different owner phone → fresh unit', async () => {
    const d = await dedup.checkDuplicate({ ownerPhone: '01111111111', compound: 'cfc', unitType: 'apartment', areaSqm: 175, price: 25000, dealType: 'rent' });
    expect(d.duplicate).toBe(false);
  });

  it('area buckets keep 175 vs 180 together but 175 vs 260 apart', () => {
    const near = dedup.dedupKey({ ownerPhone: '01008821490', compound: 'cfc', unitType: 'apartment', areaSqm: 175 });
    const near2 = dedup.dedupKey({ ownerPhone: '01008821490', compound: 'cfc', unitType: 'apartment', areaSqm: 180 });
    const far = dedup.dedupKey({ ownerPhone: '01008821490', compound: 'cfc', unitType: 'apartment', areaSqm: 260 });
    expect(near).toBe(near2);
    expect(near).not.toBe(far);
  });
});

describe('Mission 3 — strict listing validation', () => {
  it('rule 1: rejects a unit without a valid owner mobile', () => {
    const r = validation.validateListing({ dealType: 'Rent', compound: 'mvd', priceEgp: 25000 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NO_VALID_PHONE');
  });

  it('rule 3: rent ≥ 1,000,000 EGP auto-classifies as Resale', () => {
    const g = validation.enforceDealTypePriceGate('Rent', 1500000);
    expect(g.dealType).toBe('Resale');
    expect(g.autoClassified).toBe(true);
  });

  it('rule 3: rent above the 400k ceiling (but < 1M) flags an anomaly', () => {
    const g = validation.enforceDealTypePriceGate('Rent', 500000);
    expect(g.dealType).toBe('Rent');
    expect(g.anomaly).toBeTruthy();
  });

  it('rule 5: smart coding produces [Compound][Agent]-[ID] (CFC-K204)', () => {
    expect(validation.smartUnitCode({ compound: 'cairo festival city', agentName: 'K', sequence: 204 })).toBe('CFC-K204');
  });

  it('full record: canonical compound, dropdown coercion, defaults, NULL fill', () => {
    const r = validation.validateListing({
      dealType: 'Rent', compound: 'كايرو فيستيفال', unitType: 'apartment', areaSqm: 175,
      bedrooms: 3, bathrooms: 3, furnishing: 'semi furn', finishing: 'full',
      priceEgp: 32000, ownerPhone: '01008821490', ownerName: 'Owner X',
      sourcedByAgent: 'K', sequence: 204,
    });
    expect(r.ok).toBe(true);
    expect(r.record.Canonical_Compound).toBe('Cairo Festival City');
    expect(r.record.Furnishing).toBe('Semi-Furnished');
    expect(r.record.Contact_Status).toBe('Not Contacted Yet');
    expect(r.record.Listing_Status).toBe('Pending Verification');
    expect(r.record.Owner_Mobile_Internal).toBe('201008821490');
    expect(r.record.Media_Links).toBe('NULL'); // rule 2 — never a blank cell
    expect(r.warnings.some((w) => w.includes('normalized'))).toBe(true);
  });

  it('Real_Available_Units gate: only Available + Verified Available', () => {
    expect(validation.isRealAvailable({ Listing_Status: 'Available', Contact_Status: 'Verified Available' })).toBe(true);
    expect(validation.isRealAvailable({ Listing_Status: 'Available', Contact_Status: 'Not Contacted Yet' })).toBe(false);
  });
});

describe('Mission 5 — information shapes', () => {
  const CARD = [
    '📥 [UNIT INTAKE]',
    '• Deal: Rent',
    '• Compound: Mountain View iCity',
    '• Type & Specs: Apartment | 175m² | 3B/3B | Floor: 2',
    '• Furnishing: Semi',
    '• Price & Terms: 32,000 EGP monthly | Quarterly | Deposit: 2 months',
    '• Owner (PRIVATE): Fareda Owner | 01008821490 | Unit #: B-204',
    '• Notes: Garden view, keys with owner',
  ].join('\n');

  it('S1: parses the exact owner-specified card', () => {
    expect(shapes.isUnitIntakeCard(CARD)).toBe(true);
    const p = shapes.parseUnitIntakeCard(CARD);
    expect(p.listingType).toBe('rent');
    expect(p.compound).toBe('Mountain View iCity');
    expect(p.propertyType).toBe('apartment');
    expect(p.areaSqm).toBe(175);
    expect(p.bedrooms).toBe(3);
    expect(p.bathrooms).toBe(3);
    expect(p.floor).toBe('2');
    expect(p.furnishing).toBe('Semi-Furnished');
    expect(p.price).toEqual({ amount: 32000, currency: 'EGP', period: 'month' });
    expect(p.owner).toEqual({ name: 'Fareda Owner', phone: '01008821490', unitNumber: 'B-204' });
  });

  it('S1: Resale + USD + M-multiplier pricing', () => {
    const p = shapes.parseUnitIntakeCard([
      '📥 [UNIT INTAKE]',
      '• Deal: Resale',
      '• Compound: هايد بارك',
      '• Type & Specs: Villa | 400m² | 5B/5B | Floor: Garden',
      '• Furnishing: Unfurnished',
      '• Price & Terms: 3.5M USD | Cash | Deposit: none',
      '• Owner (PRIVATE): Heba Owner | 01111111111 | Unit #: 77',
      '• Notes: lake view',
    ].join('\n'));
    expect(p.dealTypeRaw).toBe('Resale');
    expect(p.price).toEqual({ amount: 3500000, currency: 'USD', period: null });
    expect(p.owner.unitNumber).toBe('77');
  });

  it('S3: owner reply classification (structured + free Arabic)', () => {
    expect(shapes.parseOwnerReply('📞 [OWNER REPLY] yes still available SE-RENT-0042').answer).toBe('available');
    expect(shapes.parseOwnerReply('الوحدة اتباعت خلاص').answer).toBe('unavailable');
  });

  it('S5: command shape', () => {
    expect(shapes.parseCommandShape('⚙️ [COMMAND] reset_outreach_status')).toEqual(
      expect.objectContaining({ command: 'reset_outreach_status' }));
    expect(shapes.parseCommandShape('/ping')).toBeNull();
  });

  it('S6: alert shape renders severity, source and action', () => {
    const a = shapes.renderAlertShape({ severity: 'critical', source: 'scribe-guardian', message: 'Photo request unanswered 12h', unitCode: 'OMV-K204', action: 'Manual follow-up' });
    expect(a).toContain('🚨 [ALERT]');
    expect(a).toContain('scribe-guardian');
    expect(a).toContain('OMV-K204');
  });

  it('parser integration: the card wins and flows through parseListing', () => {
    const parser = require(path.join(WORKFLOWS, '12-telegram-intake', 'parser.js'));
    const listing = parser.parseListing(CARD);
    expect(listing.__shape).toBe('UNIT_INTAKE_CARD');
    expect(listing.compound).toBe('Mountain View iCity');
    expect(listing.price?.amount).toBe(32000);
    expect(listing.owner?.phone).toBe('01008821490');
    expect(parser.missingFields(listing)).toEqual([]); // card is complete
  });
});

describe('Mission 2 — paced outreach pacing contract', () => {
  it('business window: 12:00–20:00 Cairo only', () => {
    expect(paced.inBusinessWindow({ hour: 12 })).toBe(true);
    expect(paced.inBusinessWindow({ hour: 19 })).toBe(true);
    expect(paced.inBusinessWindow({ hour: 20 })).toBe(false); // 20:00 closes
    expect(paced.inBusinessWindow({ hour: 21 })).toBe(false);
    expect(paced.inBusinessWindow({ hour: 9 })).toBe(false);
  });

  it('slot + daily budgets: 30 per 2h slot per bot, 240/day total', () => {
    const left = paced.slotBudgetLeft('active-renting');
    expect(left.slot).toBe(30);
    expect(left.day).toBe(240);
  });

  it('line assignment: line-2 (flagship concierge) is NEVER used', () => {
    const lines = paced.assignLines(['line-1', 'line-2', 'line-3', 'line-4', 'line-5', 'line-6', 'line-7', 'line-8']);
    expect(lines['active-renting']).not.toContain('line-2');
    expect(lines['massive-owners']).not.toContain('line-2');
    expect([...lines['active-renting'], ...lines['massive-owners']]).toHaveLength(7);
  });

  it('compose wires the daemon with the Mission-2 defaults', () => {
    const compose = fs.readFileSync(path.join(__dirname, '..', 'infra', 'docker-compose.runner.yml'), 'utf8');
    expect(compose).toContain('paced-outreach');
    expect(compose).toContain('PACE_TYPE_MIN_MS=${PACE_TYPE_MIN_MS:-45000}');
    expect(compose).toContain('PACE_TYPE_JITTER_MS=${PACE_TYPE_JITTER_MS:-10000}');
    expect(compose).toContain('PACE_SLOT_BUDGET=${PACE_SLOT_BUDGET:-30}');
    expect(compose).toContain('PACE_DAILY_CAP_TOTAL=${PACE_DAILY_CAP_TOTAL:-240}');
  });
});

describe('Mission 3 — sheets↔supabase sync mapping', () => {
  it('23-column Master_Inventory + 24-column Real_Available_Units', () => {
    expect(sync.MASTER_HEADERS).toHaveLength(23);
    expect(sync.REAL_HEADERS).toHaveLength(24);
    expect(sync.REAL_HEADERS).toContain('Verified_Available_Date');
  });

  it('maps a DB row with canonical compound + dropdown coercion', () => {
    const m = sync.dbRowToSheetRow({
      id: 'u1', code: 'CFC-K204', created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T11:00:00Z',
      deal_type: 'rent', compound: 'cfc', property_type: 'apartment', area_sqm: 175,
      bedrooms: 3, bathrooms: 3, furnishing_status: 'semi', finishing_type: 'full',
      price: 32000, owner_name: 'Owner X', owner_phone: '01008821490',
      contact_status: 'Verified Available', listing_status: 'Available',
    });
    expect(m.Canonical_Compound).toBe('Cairo Festival City');
    expect(m.Contact_Status).toBe('Verified Available');
    expect(m.Deal_Type).toBe('Rent');
  });

  it('Real tab masks the internal mobile (100***1490)', () => {
    expect(sync.maskPhone('201008821490')).toBe('100***1490');
    expect(sync.maskPhone('garbage')).toBe('NULL');
  });

  it('merge: newer sheet row wins for operational fields', () => {
    const dbRow = sync.dbRowToSheetRow({
      id: 'u1', code: 'X', created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z',
      deal_type: 'rent', compound: 'mvd', price: 25000, contact_status: 'Not Contacted Yet', listing_status: 'Pending Verification',
    });
    const merged = sync.mergePreferNewer(dbRow, {
      Last_Action_Timestamp: '2026-11-01T12:00:00Z',
      Contact_Status: 'Contacted - No Answer', Listing_Status: 'Available', Price_EGP: '31000',
    });
    expect(merged.Contact_Status).toBe('Contacted - No Answer');
    expect(merged.Price_EGP).toBe(31000);
    // older sheet row does NOT override the DB
    const stale = sync.mergePreferNewer(dbRow, { Last_Action_Timestamp: '2026-11-01T09:00:00Z', Contact_Status: 'Sold' });
    expect(stale.Contact_Status).toBe('Not Contacted Yet');
  });
});

describe('Mission 4 — guardian fleet wiring', () => {
  it('all 5 guardians + paced-outreach-bot are registered in the admin fleet', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'apps', 'sierra-estates-realty', 'app', 'api', 'admin', 'bots', 'route.ts'), 'utf8');
    for (const id of ['paced-outreach-bot', 'scribe-guardian', 'curator-guardian', 'atlas-sync-guardian', 'antigravity-closer-guardian', 'ops-watchdog']) {
      expect(route).toContain(`'${id}'`);
    }
  });

  it('runner.js dispatches every guardian with its script path', () => {
    const runner = fs.readFileSync(path.join(WORKFLOWS, 'runner.js'), 'utf8');
    for (const [slug, script] of [
      ['scribe-guardian', '15-scribe-guardian/scribe.js'],
      ['curator-guardian', '16-curator-guardian/curator.js'],
      ['atlas-sync-guardian', '17-atlas-sync-guardian/atlas.js'],
      ['antigravity-closer-guardian', '18-antigravity-closer-guardian/closer.js'],
      ['ops-watchdog', '19-ops-watchdog/watchdog.js'],
      ['sheets-supabase-sync', '14-sheets-supabase-sync/sync.js'],
    ]) {
      expect(runner).toContain(`'${slug}': '${script}'`);
    }
  });

  it('the intake bot acknowledges with the sub-500ms template before processing', () => {
    const bot = fs.readFileSync(path.join(WORKFLOWS, '12-telegram-intake', 'bot.js'), 'utf8');
    expect(bot).toContain('renderFastAck');
    expect(bot).toContain('MISSION 2: SUB-500ms ACK');
    const render = fs.readFileSync(path.join(WORKFLOWS, '12-telegram-intake', 'render.js'), 'utf8');
    expect(render).toContain('⏳ Unit received — parsing & verifying...');
  });
});
