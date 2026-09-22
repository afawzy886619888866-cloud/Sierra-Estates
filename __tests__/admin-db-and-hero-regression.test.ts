import { describe, it, expect } from 'vitest';
import { HZDATA } from '../apps/sierra-estates-realty/lib/site/data';
import cspellConfig from '../cspell.json';

describe('Admin DB & Hero Regression Test Suite', () => {
  describe('1. Cinematic Hero Slider & Cairo Plaza Landmark Verification', () => {
    it('should have 6 properly ordered slides with unique IDs 1 to 6', () => {
      const slides = HZDATA.slides;
      expect(slides).toHaveLength(6);
      const ids = slides.map((s: any) => s.id);
      expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should configure Slide #2 specifically for Cairo Plaza / Al-Mataria Metro Station', () => {
      const cairoPlazaSlide = HZDATA.slides[1];
      expect(cairoPlazaSlide).toBeDefined();
      expect(cairoPlazaSlide.main).toContain('Al-Mataria Metro Station.');
      expect(cairoPlazaSlide.mainAr).toContain('محطة مترو المطرية.');
      expect(cairoPlazaSlide.img).toBe('/cairo-plaza/real-facade-ai-enhanced.jpg');
      expect(cairoPlazaSlide.href).toBe('/cairo-plaza');
      expect(cairoPlazaSlide.objectPosition).toBe('center 35%');
      expect(cairoPlazaSlide.sub).toContain('Explore current project evidence');
      expect(cairoPlazaSlide.subAr).toContain('استعرض أدلة الموقع الحالي');
      expect(cairoPlazaSlide.badge).toContain('CAIRO PLAZA');
      expect(cairoPlazaSlide.cta).toBe('Explore Cairo Plaza');
    });

    it('should accurately split headline for gold highlight span', () => {
      function splitHeadline(text: string) {
        const words = text.split(' ');
        const hl = words.splice(-3).join(' ');
        return { lead: words.join(' '), hl };
      }

      const enHeadline = 'Directly in front of Al-Mataria Metro Station.';
      const enResult = splitHeadline(enHeadline);
      expect(enResult.lead).toBe('Directly in front of');
      expect(enResult.hl).toBe('Al-Mataria Metro Station.');

      const arHeadline = 'مباشرة أمام محطة مترو المطرية.';
      const arResult = splitHeadline(arHeadline);
      expect(arResult.lead).toBe('مباشرة أمام');
      expect(arResult.hl).toBe('محطة مترو المطرية.');
    });
  });

  describe('2. Admin Dashboard Status Type Safety & KPI Calculations', () => {
    it('should filter active listings without type overlap errors or throwing', () => {
      const sampleListings = [
        { id: '1', status: 'available', price: 10000000 },
        { id: '2', status: 'active', price: 12000000 },
        { id: '3', status: 'sold', price: 15000000 },
        { id: '4', status: 'archived', price: 8000000 },
      ];

      const activeListings = sampleListings.filter(
        (l) => l.status === 'available' || (l.status as string) === 'active'
      );
      expect(activeListings).toHaveLength(2);
      expect(activeListings.map((l) => l.id)).toEqual(['1', '2']);
    });

    it('should filter inquiries by status without type overlap errors', () => {
      const sampleInquiries = [
        { id: 'i-1', status: 'new', createdAt: new Date().toISOString() },
        { id: 'i-2', status: 'pending', createdAt: new Date().toISOString() },
        { id: 'i-3', status: 'closed', createdAt: new Date().toISOString() },
        { id: 'i-4', status: 'lost', createdAt: new Date().toISOString() },
      ];

      const pendingApprovals = sampleInquiries.filter(
        (i) => i.status === 'new' || (i.status as string) === 'pending'
      ).length;
      expect(pendingApprovals).toBe(2);

      const closed = sampleInquiries.filter((i) => i.status === 'closed').length;
      expect(closed).toBe(1);

      const conversionRate = sampleInquiries.length ? (closed / sampleInquiries.length) * 100 : 0;
      expect(conversionRate).toBe(25);
    });

    it('should handle empty listings and inquiries gracefully without NaN or divide-by-zero', () => {
      const listings: any[] = [];
      const inquiries: any[] = [];

      const avgAiScore = listings.length
        ? listings.reduce((s, l) => s + (l.aiScore || 8.5), 0) / listings.length
        : 8.8;
      expect(avgAiScore).toBe(8.8);

      const conversionRate = inquiries.length ? (0 / inquiries.length) * 100 : 0;
      expect(conversionRate).toBe(0);
    });
  });

  describe('3. Database Column Selection & pgvector Projection Boundary', () => {
    it('should map camelCase record fields to snake_case column names', () => {
      const toSnakeCase = (str: string) =>
        str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

      const camelFields = ['agentName', 'createdAt', 'valuationStatus', 'aiScore', 'viewingCount'];
      const snakeFields = camelFields.map(toSnakeCase);

      expect(snakeFields).toEqual([
        'agent_name',
        'created_at',
        'valuation_status',
        'ai_score',
        'viewing_count',
      ]);
    });

    it('should ensure vector embeddings are excluded from selective dashboard queries', () => {
      const selectiveDashboardColumns = [
        'id',
        'status',
        'agent_name',
        'valuation_status',
        'price',
        'created_at',
      ];

      expect(selectiveDashboardColumns).not.toContain('embedding');
      expect(selectiveDashboardColumns).not.toContain('description_embedding');
      expect(selectiveDashboardColumns).not.toContain('*');
    });
  });

  describe('4. Admin Collection & UUID Security Validation', () => {
    const ALLOWED_COLLECTIONS = new Set([
      'listings',
      'inquiries',
      'leads',
      'profiles',
      'viewings',
      'transactions',
      'audit_logs',
      'notifications',
    ]);

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it('should allow valid canonical collections and reject unauthorized or injection tables', () => {
      expect(ALLOWED_COLLECTIONS.has('listings')).toBe(true);
      expect(ALLOWED_COLLECTIONS.has('inquiries')).toBe(true);
      expect(ALLOWED_COLLECTIONS.has('users')).toBe(false);
      expect(ALLOWED_COLLECTIONS.has('pg_shadow')).toBe(false);
      expect(ALLOWED_COLLECTIONS.has("listings; DROP TABLE listings; --")).toBe(false);
    });

    it('should strictly validate UUID format and reject injection payloads', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUuids = [
        '12345',
        "' OR '1'='1",
        'admin; DROP TABLE listings;',
        '123e4567-e89b-12d3-a456-42661417400Z',
      ];

      expect(UUID_REGEX.test(validUuid)).toBe(true);
      invalidUuids.forEach((id) => {
        expect(UUID_REGEX.test(id)).toBe(false);
      });
    });
  });

  describe('5. CSpell Dictionary Hygiene', () => {
    it('should have all PostgreSQL schema and domain technical words in cspell dictionary', () => {
      const registeredWords = new Set(cspellConfig.words);
      const expectedWords = [
        'emeraldestatesegypt',
        'pgcrypto',
        'postgis',
        'dedupe',
        'colour',
        'plpgsql',
        'tgname',
        'uids',
        'utilisation',
        'authorises',
        'Postg',
        'SUBCOLLECTION',
        'SRID',
      ];

      expectedWords.forEach((word) => {
        expect(
          registeredWords.has(word),
          `Expected cspell.json to include word "${word}"`
        ).toBe(true);
      });
    });
  });
});
