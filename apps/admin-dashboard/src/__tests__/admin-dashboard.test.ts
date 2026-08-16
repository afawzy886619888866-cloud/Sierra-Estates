import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('apps/admin-dashboard (Architecture & Components)', () => {
  const SRC_DIR = path.resolve(__dirname, '..');

  describe('Core Application Setup', () => {
    it('should have main entry point main.tsx and App.tsx', () => {
      expect(fs.existsSync(path.join(SRC_DIR, 'main.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(SRC_DIR, 'App.tsx'))).toBe(true);
    });

    it('App.tsx should configure bilingual support (en, ar)', () => {
      const appCode = fs.readFileSync(path.join(SRC_DIR, 'App.tsx'), 'utf-8');
      expect(appCode).toContain('TRANSLATIONS');
      expect(appCode).toContain('SIERRA ESTATES');
      expect(appCode).toContain('INTELLIGENCE OS');
    });

    it('App.tsx should register all dashboard and intelligence routes', () => {
      const appCode = fs.readFileSync(path.join(SRC_DIR, 'App.tsx'), 'utf-8');
      expect(appCode).toContain('OverviewPage');
      expect(appCode).toContain('AgentsPage');
      expect(appCode).toContain('WorkflowsPage');
      expect(appCode).toContain('LeadsPage');
      expect(appCode).toContain('ListingsHubPage');
      expect(appCode).toContain('CuratorPage');
      expect(appCode).toContain('ReportsPage');
      expect(appCode).toContain('SettingsPage');
    });

    it('should provide styling files admin.css and index.css', () => {
      expect(fs.existsSync(path.join(SRC_DIR, 'admin.css'))).toBe(true);
      expect(fs.existsSync(path.join(SRC_DIR, 'index.css'))).toBe(true);
    });
  });

  describe('Components Structure', () => {
    const COMP_DIR = path.join(SRC_DIR, 'components');

    it('components directory should contain all primary admin views', () => {
      const expectedComponents = [
        'Sidebar.tsx',
        'LoginPage.tsx',
        'OverviewPage.tsx',
        'AgentsPage.tsx',
        'WorkflowsPage.tsx',
        'OpenClawPage.tsx',
        'LeadsPage.tsx',
        'ListingsHubPage.tsx',
        'CuratorPage.tsx',
        'ScribePage.tsx',
        'NexusAIPage.tsx',
        'ReportsPage.tsx',
        'SettingsPage.tsx',
        'Stage9CloserPage.tsx',
        'NotificationCenter.tsx',
        'AutomationToolsPage.tsx',
        'EasyListingPage.tsx',
        'WhatsAppSenderPage.tsx',
        'DataSyncHubPage.tsx',
        'SearchInsightsPage.tsx',
        'DBEditorPage.tsx',
        'AuditLogsPage.tsx',
        'UsersManagerPage.tsx',
        'BotsControlPage.tsx',
        'MegaDashboard.tsx',
        'PipelinePage.tsx',
        'TasksPage.tsx',
        'CommissionLedger.tsx',
        'ActionProtocols.tsx',
        'DedupeReviewQueue.tsx',
        'StaleDataMonitor.tsx',
      ];

      for (const comp of expectedComponents) {
        expect(fs.existsSync(path.join(COMP_DIR, comp)), `Missing component: ${comp}`).toBe(true);
      }
    });

    it('Sidebar.tsx should export NAV_ITEMS with routes and icons', () => {
      const sidebarCode = fs.readFileSync(path.join(COMP_DIR, 'Sidebar.tsx'), 'utf-8');
      expect(sidebarCode).toContain('export const NAV_ITEMS');
      expect(sidebarCode).toContain('id:');
      expect(sidebarCode).toContain('icon:');
    });
  });

  describe('Services & Data Layer', () => {
    it('should provide firebase initialization and seed data script', () => {
      expect(fs.existsSync(path.join(SRC_DIR, 'firebase.ts'))).toBe(true);
      expect(fs.existsSync(path.join(SRC_DIR, 'seed.ts'))).toBe(true);
    });

    it('should provide types definitions', () => {
      expect(
        fs.existsSync(path.join(SRC_DIR, 'types.ts')) ||
        fs.existsSync(path.join(SRC_DIR, 'types', 'index.ts'))
      ).toBe(true);
    });
  });
});
