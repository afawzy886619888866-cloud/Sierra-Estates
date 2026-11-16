import { describe, it, expect } from 'vitest';
import { VoiceBriefingEngine } from '../voice-briefing';

describe('VoiceBriefingEngine Suite', () => {
  it('calculates financial metrics and detects underpriced status correctly', () => {
    // Mivida benchmark is 145,000 EGP/sqm.
    // 200 sqm at 24M = 120,000 EGP/sqm (< 145,000 * 0.95), so it should be underpriced!
    const metricsUnderpriced = VoiceBriefingEngine.calculateMetrics(24000000, 200, 'Mivida');
    expect(metricsUnderpriced.pricePerSqm).toBe(120000);
    expect(metricsUnderpriced.isUnderpriced).toBe(true);
    expect(metricsUnderpriced.projectedAnnualYieldPct).toBe(8.8);
    expect(metricsUnderpriced.paybackPeriodYears).toBeGreaterThan(0);

    // Madinaty benchmark is 70,000 EGP/sqm.
    // 100 sqm at 10M = 100,000 EGP/sqm (> 70,000), so not underpriced.
    const metricsNormal = VoiceBriefingEngine.calculateMetrics(10000000, 100, 'Madinaty');
    expect(metricsNormal.pricePerSqm).toBe(100000);
    expect(metricsNormal.isUnderpriced).toBe(false);
    expect(metricsNormal.projectedAnnualYieldPct).toBe(7.5);
  });

  it('generates natural spoken Arabic script with Egyptian phrasing', () => {
    const metrics = VoiceBriefingEngine.calculateMetrics(25000000, 200, 'Hyde Park');
    const scriptAr = VoiceBriefingEngine.generateScriptArabic(
      {
        sierraCode: 'SE-HYD-401',
        compound: 'Hyde Park',
        unitType: 'Standalone Villa',
        priceEGP: 25000000,
        areaSqm: 200,
        investorName: 'كريم',
      },
      metrics
    );

    expect(scriptAr).toContain('أستاذ كريم');
    expect(scriptAr).toContain('SE-HYD-401');
    expect(scriptAr).toContain('Hyde Park');
    expect(scriptAr).toContain('سييرا إستيتس');
  });

  it('generates structured English briefing script for wealth investors', () => {
    const metrics = VoiceBriefingEngine.calculateMetrics(35000000, 250, 'Mivida');
    const scriptEn = VoiceBriefingEngine.generateScriptEnglish(
      {
        sierraCode: 'SE-MIV-902',
        compound: 'Mivida',
        unitType: 'Twin House',
        priceEGP: 35000000,
        areaSqm: 250,
        investorName: 'Dr. Tarek',
      },
      metrics
    );

    expect(scriptEn).toContain('Dr. Tarek');
    expect(scriptEn).toContain('SE-MIV-902');
    expect(scriptEn).toContain('Mivida');
    expect(scriptEn).toContain('+201092048333');
  });

  it('generates a valid RIFF WAVE audio buffer with proper header bytes', () => {
    const audioBuf = VoiceBriefingEngine.createSyntheticAudioBuffer(1);
    expect(audioBuf).toBeDefined();
    expect(audioBuf.length).toBeGreaterThan(44);
    // Verify RIFF and WAVE magic headers
    expect(audioBuf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(audioBuf.toString('ascii', 8, 12)).toBe('WAVE');
    expect(audioBuf.toString('ascii', 12, 16)).toBe('fmt ');
    expect(audioBuf.toString('ascii', 36, 40)).toBe('data');
  });

  it('generateBriefing returns complete payload with WebRTC session ID and audioBase64', async () => {
    const briefing = await VoiceBriefingEngine.generateBriefing({
      sierraCode: 'SE-SWN-101',
      compound: 'Swan Lake',
      unitType: 'Penthouse',
      priceEGP: 45000000,
      areaSqm: 300,
      language: 'en-US',
    });

    expect(briefing.briefingId).toMatch(/^vb-/);
    expect(briefing.webrtcSessionId).toMatch(/^webrtc-sierra-vb-/);
    expect(briefing.language).toBe('en-US');
    expect(briefing.audioBase64).toContain('data:audio/wav;base64,');
    expect(briefing.voiceModel).toBe('gemini-2.0-flash-live-streaming');
    expect(briefing.financialMetrics.pricePerSqm).toBe(150000);
    expect(briefing.estimatedDurationSeconds).toBeGreaterThan(10);
  });
});
