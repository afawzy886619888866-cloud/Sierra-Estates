import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  PROMPT_REGISTRY,
  listRegisteredPrompts,
  validatePromptOutput,
  formatPublicGroupAutoReply,
  formatPrivateAdminContactForward,
} from '../prompts/index';
import {
  AGENCY_HELPLINE,
  validateEnv,
  normalizeEgyptianPhone,
  normalizeCompoundName,
  generateCanonicalUnitCode,
  isDuplicateListing,
  stripPhoneNumbers,
} from '../core/index';
import {
  AGENT_REGISTRY,
  getAgentManifest,
  runPropertyParserDryRun,
  runUnitCoderDryRun,
  runInventoryMatcherDryRun,
  runLeadQualifierDryRun,
  runWhatsAppDispatcherDryRun,
  runCareerEvaluatorDryRun,
} from '../agents/index';
import { getAutomationStatusMatrix } from '../automations/index';

describe('Sierra Estates 5-Phase System Architecture Alignment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Phase 1 & 3: Centralized Prompt Registry & Zod Validation', () => {
    it('registers all 6 canonical system prompts with non-empty templates and schemas', () => {
      const list = listRegisteredPrompts();
      expect(list).toHaveLength(6);
      const ids = list.map((p) => p.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'property-parser',
          'unit-coder',
          'inventory-matcher',
          'lead-qualifier',
          'owner-reply-classifier',
          'career-evaluator',
        ])
      );

      for (const item of list) {
        const def = PROMPT_REGISTRY[item.id];
        expect(def.systemPrompt.length).toBeGreaterThan(80);
        expect(def.version).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });

    it('validates conforming outputs and rejects malformed payloads strictly', () => {
      const valid = validatePromptOutput('property-parser', {
        compound: 'Mivida',
        unitType: 'Apartment',
        unitCode: 'SE-MIV-S-180-5678',
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 180,
        priceEgp: 14000000,
        mode: 'sale',
        ownerPhone: '01012345678',
        channelSource: 'owner',
      });
      expect(valid.ok).toBe(true);

      const invalid = validatePromptOutput('property-parser', {
        compound: '',
        mode: 'invalid_mode',
      });
      expect(invalid.ok).toBe(false);
    });
  });

  describe('Phase 1 & 2: Core Normalization, Unit Coding & Deduplication Locks', () => {
    it('normalizes Egyptian phone numbers into 11-digit 01xxxxxxxxx format', () => {
      expect(normalizeEgyptianPhone('+20 101 234 5678')).toBe('01012345678');
      expect(normalizeEgyptianPhone('00201092048333')).toBe('01092048333');
      expect(normalizeEgyptianPhone('1092048333')).toBe('01092048333');
    });

    it('normalizes Arabic/English compound names and enforces deduplication locks', () => {
      expect(normalizeCompoundName('كايرو فيستيفال')).toEqual({
        code: 'CFC',
        canonicalName: 'Cairo Festival City',
      });
      expect(normalizeCompoundName('ميفيدا التجمع')).toEqual({
        code: 'MIV',
        canonicalName: 'Mivida',
      });

      const existing = new Set<string>();
      const first = isDuplicateListing(
        { compound: 'CFC', mode: 'rent', areaSqm: 202, phone: '+201092048333' },
        existing
      );
      expect(first.duplicate).toBe(false);
      existing.add(first.key);

      const second = isDuplicateListing(
        { compound: 'كايرو فيستيفال', mode: 'rent', areaSqm: 201, phone: '01092048333' },
        existing
      );
      expect(second.duplicate).toBe(true);
    });
  });

  describe('Phase 3 & 4: Agent Pipeline Dry-Run & Group Privacy Invariant', () => {
    it('runs PropertyParserAgent -> UnitCoderAgent -> InventoryMatcherAgent end-to-end', () => {
      const parsed = runPropertyParserDryRun({
        rawText: 'من المالك شقة للبيع في ميفيدا 185م 3 غرف بسعر 14.5 مليون تواصل 01012345678',
      });

      expect(parsed.compound).toBe('Mivida');
      expect(parsed.mode).toBe('sale');
      expect(parsed.areaSqm).toBe(185);
      expect(parsed.priceEgp).toBe(14500000);
      expect(parsed.ownerPhone).toBe('01012345678');
      expect(parsed.channelSource).toBe('owner');
      expect(parsed.unitCode).toContain('SE-MIV-S-185');

      const coded = runUnitCoderDryRun({
        compound: parsed.compound,
        mode: parsed.mode,
        areaSqm: parsed.areaSqm,
        phone: parsed.ownerPhone,
      });
      expect(coded.canonicalCode).toBe(generateCanonicalUnitCode({
        compound: 'Mivida',
        mode: 'sale',
        areaSqm: 185,
        phone: '01012345678',
      }));

      const matched = runInventoryMatcherDryRun({
        requestId: 'REQ-TEST-101',
        zone: 'Mivida',
        mode: 'sale',
        budgetEgp: 15000000,
        candidates: [
          {
            unitCode: coded.canonicalCode,
            compound: parsed.compound,
            mode: parsed.mode,
            priceEgp: parsed.priceEgp,
            areaSqm: parsed.areaSqm,
          },
        ],
      });
      expect(matched.matchedUnitIds).toContain(coded.canonicalCode);
      expect(matched.matchScore).toBeGreaterThanOrEqual(80);
    });

    it('strips ALL phone numbers from public group replies and forwards owner/broker contacts privately to 01092048333', () => {
      const dispatch = runWhatsAppDispatcherDryRun({
        unitCode: 'SE-CFC-S-220-5678',
        compound: 'Cairo Festival City',
        unitType: 'Apartment',
        mode: 'sale',
        areaSqm: 220,
        bedrooms: 3,
        priceEgp: 16500000,
        contactPhone: '+20 101 234 5678',
        channelSource: 'broker',
        groupName: 'New Cairo Brokers VIP',
      });

      // Public message strictly exposes unit details + unit code ONLY, zero phones
      expect(dispatch.publicGroupMessage).toContain('SE-CFC-S-220-5678');
      expect(dispatch.publicGroupMessage).toContain('Cairo Festival City');
      expect(dispatch.publicGroupMessage).not.toMatch(/01[0125]\d{8}/);
      expect(stripPhoneNumbers('Call 01012345678')).not.toContain('01012345678');

      // Private forward contains full phone and targets 01092048333 exclusively
      expect(dispatch.adminRecipient).toBe(AGENCY_HELPLINE);
      expect(dispatch.adminRecipient).toBe('01092048333');
      expect(dispatch.privateAdminForward).toContain('01012345678');
      expect(formatPublicGroupAutoReply({ unitCode: 'SE-X', compound: 'Hyde Park', unitType: 'Villa', mode: 'sale' })).not.toMatch(/01[0125]\d{8}/);
      expect(formatPrivateAdminContactForward({
        unitCode: 'SE-X',
        compound: 'Hyde Park',
        unitType: 'Villa',
        contactPhone: '01234567890',
        channelSource: 'owner',
      })).toContain('01234567890');
    });

    it('runs LeadQualifierAgent and CareerEvaluatorAgent dry runs cleanly', () => {
      const manifest = getAgentManifest();
      expect(manifest.length).toBe(Object.keys(AGENT_REGISTRY).length);

      const lead = runLeadQualifierDryRun({
        leadId: 'LEAD-99',
        name: 'أحمد محمود',
        zone: 'Hyde Park',
        budget: '18,000,000 EGP',
      });
      expect(lead.intent).toBe('HIGH');
      expect(lead.whatsappReplyAr).toContain(AGENCY_HELPLINE);

      const applicant = runCareerEvaluatorDryRun({
        applicationId: 'CAR-99',
        role: 'sales',
        experienceYears: 4,
        hasVehicle: true,
        achievements: 'Closed over 120M EGP across Fifth Settlement and Mivida resale units.',
      });
      expect(applicant.tier).toBe('A');
      expect(applicant.roleFitScore).toBe(100);
    });
  });

  describe('Phase 4: Environment Validator & Automation Matrix Verification', () => {
    it('fails fast in strict mode when required env vars are missing and passes when supplied', () => {
      const incomplete = validateEnv({
        strict: false,
        source: {},
      });
      expect(incomplete.valid).toBe(false);
      expect(incomplete.missingRequired).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(incomplete.missingRequired).toContain('SESSION_SECRET');

      expect(() =>
        validateEnv({ strict: true, source: {} })
      ).toThrow(/Startup aborted/);

      const complete = validateEnv({
        strict: true,
        source: {
          NEXT_PUBLIC_SUPABASE_URL: 'https://gaxfqcietzoonlmatiot.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'service-key',
          INVENTORY_SHEET_ID: '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk',
          SESSION_SECRET: 'super-secret-hex-value',
        },
      });
      expect(complete.valid).toBe(true);
      expect(complete.missingRequired).toHaveLength(0);
    });

    it('computes accurate ACTIVE vs NEEDS_ENV_KEY matrix across all automations', () => {
      const matrixPartial = getAutomationStatusMatrix({});
      expect(matrixPartial.length).toBeGreaterThanOrEqual(8);
      expect(matrixPartial.every((m) => m.status === 'NEEDS_ENV_KEY')).toBe(true);

      const matrixActive = getAutomationStatusMatrix({
        NEXT_PUBLIC_SUPABASE_URL: 'https://gaxfqcietzoonlmatiot.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
        SESSION_SECRET: 'secret',
        WA_ADMIN_NUMBER: '01092048333',
        WHATSAPP_API_URL: 'http://127.0.0.1:2785',
        INVENTORY_SHEET_ID: 'sheet-id',
        SHEETS_WEBAPP_URL: 'https://script.google.com/macros/s/test/exec',
        TELEGRAM_BOT_TOKEN: 'tg-token',
        TELEGRAM_WEBHOOK_SECRET: 'tg-secret',
        CRON_SECRET: 'cron-secret',
        PROPERTY_FINDER_API_KEY: 'pf-key',
        PROPERTY_FINDER_API_SECRET: 'pf-secret',
        GEMINI_API_KEY: 'gem-key',
      });
      expect(matrixActive.every((m) => m.status === 'ACTIVE')).toBe(true);
    });

    it('documents online spreadsheets & Google Apps Script handlers for Client_Requests & Career_Applications', () => {
      const rootDir = path.resolve(__dirname, '..');
      const gasUnified = fs.readFileSync(
        path.join(rootDir, 'scripts', 'GoogleAppsScript_SierraEstates_Unified_Engine.gs'),
        'utf-8'
      );
      expect(gasUnified).toContain('request_submission');
      expect(gasUnified).toContain('career_submission');
      expect(gasUnified).toContain('Client_Requests');
      expect(gasUnified).toContain('Career_Applications');

      const archDoc = fs.readFileSync(path.join(rootDir, 'ARCHITECTURE.md'), 'utf-8');
      expect(archDoc).toContain('Stage 1');
      expect(archDoc).toContain('Stage 4');
      expect(archDoc).toContain('01092048333');

      const agentsDoc = fs.readFileSync(path.join(rootDir, 'AGENTS.md'), 'utf-8');
      expect(agentsDoc).toContain('BEGIN:turborepo-agent-rules');
      expect(agentsDoc).toContain('WhatsAppDispatcherAgent');
      expect(agentsDoc).toContain('CareerEvaluatorAgent');
    });
  });
});
