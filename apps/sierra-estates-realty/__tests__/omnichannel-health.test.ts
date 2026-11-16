/**
 * @file omnichannel-health.test.ts
 * @description Integration test verifying Omnichannel Health Dashboard and Telemetry
 * under MCD Milestone M14 (card_c4c33a1434).
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HealthView from '../app/admin/views/HealthView';
import { GET as getHealth } from '../app/api/health/route';

// Mock Supabase admin
jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        count: 42,
        error: null,
      }),
    })),
  })),
}));

// Mock Memory Engine
jest.mock('@sierra-estates/memory-engine', () => ({
  brainRAG: {
    getActiveGoal: jest.fn().mockReturnValue('Operational'),
    vaultCache: new Map([['doc1', {}], ['doc2', {}]]),
  },
}));

describe('Omnichannel Health & Telemetry Integration', () => {
  describe('1. HealthView Omnichannel UI Components', () => {
    it('renders WhatsApp, Telegram, and Master Excel subsystems in English', () => {
      const html = renderToStaticMarkup(React.createElement(HealthView, { lang: 'en' }));

      // Subsystems
      expect(html).toContain('WhatsApp Cloud Gateway');
      expect(html).toContain('August Owners &amp; Concierge Ingest verified');
      expect(html).toContain('Telegram Agent Relay');
      expect(html).toContain('Real-time alert dispatcher');
      expect(html).toContain('Master Excel 2-Way Sync Engine');
      expect(html).toContain('Two-way local workbook sync');

      // Working features under PropTech Agent Fleet
      expect(html).toContain('August Owners WhatsApp Group Ingestion &amp; Slot-Filling');
      expect(html).toContain('Telegram Lead Bot &amp; Instant Deal Notification Relay');
      expect(html).toContain('Master Excel 2-Way Sync Engine with Synced Inventory');
    });

    it('renders cleanly in Arabic without throwing', () => {
      const html = renderToStaticMarkup(React.createElement(HealthView, { lang: 'ar' }));
      expect(html).toContain('حالة وصحة النظام');
      expect(html).toContain('التطبيقات والخدمات العاملة');
      expect(html).toContain('البنية التحتية والشبكات');
    });
  });

  describe('2. /api/health Omnichannel Telemetry Endpoint', () => {
    it('returns omnichannel status and component telemetry', async () => {
      const response = await getHealth();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.components).toBeDefined();

      const { omnichannel } = data.components;
      expect(omnichannel).toBeDefined();
      expect(omnichannel.status).toBe('healthy');

      // WhatsApp Telemetry
      expect(omnichannel.whatsapp).toBeDefined();
      expect(omnichannel.whatsapp.augustOwnersIngest).toBe('active');
      expect(omnichannel.whatsapp.webhookVerified).toBe(true);

      // Telegram Telemetry
      expect(omnichannel.telegram).toBeDefined();
      expect(omnichannel.telegram.channelRelay).toBe('active');

      // Master Excel Sync Telemetry
      expect(omnichannel.excelSync).toBeDefined();
      expect(omnichannel.excelSync.mode).toBe('two-way-sync');
      expect(omnichannel.excelSync.status).toBe('ready');
    });
  });
});
