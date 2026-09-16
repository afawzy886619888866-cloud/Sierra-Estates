/**
 * m12-audio-video-telemetry.test.ts
 *
 * Milestone M12 Verification Test Suite:
 * - Realtime Egyptian-Arabic Audio Briefings
 * - Automated Video Tour Storyboards
 * - Deep Health & Self-Healing Telemetry
 * - Bilingual Parity (Arabic Virtual Tour)
 */

import { VoiceBriefingEngine, VideoTeaserEngine, NotebookLMEngine } from '@sierra-estates/agents-core';
import { GET as getAudioBriefing, POST as postAudioBriefing } from '../app/api/audio-briefing/route';
import { GET as getDeepHealth } from '../app/api/health/deep/route';
import ArVirtualTourPage, { metadata as arMetadata } from '../app/ar/virtual-tour/page';
import { NextRequest } from 'next/server';

describe('Milestone M12: Realtime Audio, Video Teasers & Autonomous Telemetry', () => {
  describe('1. VoiceBriefingEngine', () => {
    it('calculates investment yield and metrics accurately', () => {
      const metrics = VoiceBriefingEngine.calculateMetrics(12000000, 150, 'Mivida');
      expect(metrics.pricePerSqm).toBe(80000);
      expect(metrics.isUnderpriced).toBe(true);
      expect(metrics.projectedAnnualYieldPct).toBeGreaterThan(8);
      expect(metrics.paybackPeriodYears).toBeGreaterThan(0);
      expect(metrics.compoundAveragePricePerSqm).toBe(145000);
    });

    it('generates authentic Egyptian Arabic spoken scripts', () => {
      const metrics = VoiceBriefingEngine.calculateMetrics(15000000, 200, 'Palm Hills');
      const script = VoiceBriefingEngine.generateScriptArabic(
        {
          sierraCode: 'SE-PH-99',
          compound: 'Palm Hills',
          unitType: 'Standalone Villa',
          priceEGP: 15000000,
          areaSqm: 200,
          investorName: 'فوزي',
        },
        metrics
      );

      expect(script).toContain('أستاذ فوزي');
      expect(script).toContain('Palm Hills');
      expect(script).toContain('سييرا إستيتس');
      expect(script).toContain('العائد الإيجاري');
    });

    it('generates executive English spoken scripts', () => {
      const metrics = VoiceBriefingEngine.calculateMetrics(9500000, 180, 'Mountain View iCity');
      const script = VoiceBriefingEngine.generateScriptEnglish(
        {
          sierraCode: 'SE-MV-04',
          compound: 'Mountain View iCity',
          unitType: 'iVilla',
          priceEGP: 9500000,
          areaSqm: 180,
          investorName: 'David',
        },
        metrics
      );

      expect(script).toContain('Hello David');
      expect(script).toContain('Mountain View iCity');
      expect(script).toContain('Sierra Estates');
      expect(script).toContain('rental yield');
    });

    it('produces valid playable synthetic RIFF/WAVE audio buffer', () => {
      const buffer = VoiceBriefingEngine.createSyntheticAudioBuffer(2);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(44);
      expect(buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(buffer.subarray(8, 12).toString('ascii')).toBe('WAVE');
      expect(buffer.subarray(12, 16).toString('ascii')).toBe('fmt ');
    });

    it('executes generateBriefing end-to-end', async () => {
      const response = await VoiceBriefingEngine.generateBriefing({
        sierraCode: 'SE-TEST-01',
        compound: 'Villette',
        unitType: 'Townhouse',
        priceEGP: 18000000,
        areaSqm: 240,
        language: 'ar-EG',
      });

      expect(response.briefingId).toMatch(/^vb-/);
      expect(response.audioBase64).toContain('data:audio/wav;base64,');
      expect(response.estimatedDurationSeconds).toBeGreaterThan(10);
      expect(response.financialMetrics.pricePerSqm).toBe(75000);
    });
  });

  describe('2. VideoTeaserEngine', () => {
    it('synthesizes multi-scene luxury storyboard frames', () => {
      const frames = VideoTeaserEngine.generateStoryboard({
        sierraCode: 'SE-VID-01',
        compound: 'Mivida',
        unitType: 'Sky Villa',
        priceEGP: 22000000,
        areaSqm: 260,
        subfeatures: ['Private Pool', 'Lagoon View'],
      });

      expect(frames.length).toBeGreaterThanOrEqual(4);
      expect(frames[0].visualType).toBe('hero_facade');
      expect(frames[1].visualType).toBe('masterplan_drone');
      expect(frames[2].visualType).toBe('financial_yield');
      expect(frames[3].visualType).toBe('call_to_action');
      expect(frames[3].captionEn).toContain('+201092048333');
    });
  });

  describe('3. NotebookLMEngine M12 Methods', () => {
    it('generates audio briefing dialogue and highlights', async () => {
      const engine = new NotebookLMEngine();
      const briefingAr = await engine.generateAudioBriefing(
        {
          title: 'Penthouse 360',
          compound: 'Hyde Park',
          price: 14000000,
        },
        'ar'
      );

      expect(briefingAr.language).toBe('ar');
      expect(briefingAr.dialogue.length).toBeGreaterThanOrEqual(2);
      expect(briefingAr.keyHighlights.length).toBeGreaterThan(0);

      const briefingEn = await engine.generateAudioBriefing(
        {
          title: 'Penthouse 360',
          compound: 'Hyde Park',
          price: 14000000,
        },
        'en'
      );
      expect(briefingEn.language).toBe('en');
      expect(briefingEn.dialogue[0].speaker).toBe('Alex');
    });

    it('compiles an automated 5-step video tour storyboard', () => {
      const engine = new NotebookLMEngine();
      const storyboard = engine.compileVideoTourStoryboard({
        title: 'Lake View Villa',
        compound: 'Swan Lake',
        price: 35000000,
        areaSqm: 420,
      });

      expect(storyboard.slides).toHaveLength(5);
      expect(storyboard.totalDurationSeconds).toBe(45);
      expect(storyboard.aspectRatios).toContain('9:16');
      expect(storyboard.slides[0].type).toBe('intro');
      expect(storyboard.slides[4].type).toBe('outro');
    });
  });

  describe('4. API Routes (/api/audio-briefing & /api/health/deep)', () => {
    it('handles GET /api/audio-briefing with query params', async () => {
      const req = new NextRequest('http://localhost:3000/api/audio-briefing?compound=Mivida&price=12000000&area=160&lang=ar');
      const res = await getAudioBriefing(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.briefing.spokenScript).toContain('Mivida');
      expect(json.briefing.financialMetrics).toBeDefined();
    });

    it('handles POST /api/audio-briefing with payload body', async () => {
      const req = new NextRequest('http://localhost:3000/api/audio-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sierraCode: 'SE-POST-01',
          compound: 'Eastown',
          unitType: 'Duplex',
          priceEGP: 11000000,
          areaSqm: 190,
          language: 'en-US',
        }),
      });

      const res = await postAudioBriefing(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.briefing.language).toBe('en-US');
    });

    it('handles GET /api/health/deep with SLA telemetry', async () => {
      const res = await getDeepHealth();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.service).toBe('sierra-estates-deep-telemetry');
      expect(json.telemetry.whatsappGateway.host).toBe('18.232.148.172');
      expect(json.telemetry.supabase).toBeDefined();
      expect(json.selfHealing.autoReconnectLoop).toBe('active');
    });
  });

  describe('5. Bilingual Parity (/ar/virtual-tour)', () => {
    it('exports valid metadata and component for Arabic virtual tours', () => {
      expect(arMetadata.title).toContain('جولة افتراضية');
      expect(arMetadata.alternates?.canonical).toBe('https://sierra-estates.net/ar/virtual-tour');
      expect(typeof ArVirtualTourPage).toBe('function');
    });
  });
});
