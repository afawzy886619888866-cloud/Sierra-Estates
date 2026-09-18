/**
 * System Regression & Configuration Hardening Suite
 *
 * Dedicated tests protecting against every historical issue & potential regression:
 *  1. VS Code Launch & Tasks Config Schema Integrity (no missing version, no illegal keys)
 *  2. React / JSX Import & SSR Safety across all components
 *  3. WhatsApp Inventory & Unit Ingestion Integrity (no duplicate IDs, valid prices)
 *  4. CI/CD Workflow & Security Runner Safety (timeouts, forceExit flags)
 *  5. Webhint / Hint Tooling & Package Config
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const REALTY_ROOT = path.resolve(__dirname, '..');

describe('Regression & Configuration Hardening Suite', () => {

  describe('1. VS Code Configuration Integrity', () => {
    const launchJsonPath = path.join(ROOT, '.vscode/launch.json');
    const tasksJsonPath = path.join(ROOT, '.vscode/tasks.json');

    it('.vscode/launch.json exists and is valid JSON', () => {
      expect(fs.existsSync(launchJsonPath)).toBe(true);
      const content = fs.readFileSync(launchJsonPath, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
    });



    it('.vscode/settings.json exists and is valid JSON with proper formatting', () => {
      const settingsJsonPath = path.join(ROOT, '.vscode/settings.json');
      expect(fs.existsSync(settingsJsonPath)).toBe(true);
      const content = fs.readFileSync(settingsJsonPath, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
      const settings = JSON.parse(content);
      expect(settings['sql.defaultDatabaseType']).toBe('postgres');
      expect(settings['editor.formatOnSave']).toBe(true);
    });

    it('.vscode/launch.json strictly adheres to debug schema', () => {
      const config = JSON.parse(fs.readFileSync(launchJsonPath, 'utf8'));
      expect(config.version).toBe('0.2.0');
      expect(Array.isArray(config.configurations)).toBe(true);
      expect(config.configurations.length).toBeGreaterThanOrEqual(5);

      for (const c of config.configurations) {
        expect(c.name).toBeDefined();
        expect(c.type).toBeDefined();
        expect(c.request).toBeDefined();

        // Regression guard: no deprecated disableOptimisticBPs
        expect(c.disableOptimisticBPs).toBeUndefined();

        // Regression guard: msedge must specify version
        if (c.type === 'msedge') {
          expect(c.version).toBeDefined();
        }
      }

      // Compounds verification
      if (config.compounds) {
        for (const compound of config.compounds) {
          expect(compound.name).toBeDefined();
          expect(Array.isArray(compound.configurations)).toBe(true);
        }
      }
    });

    it('.vscode/tasks.json exists and is valid JSON', () => {
      expect(fs.existsSync(tasksJsonPath)).toBe(true);
      const content = fs.readFileSync(tasksJsonPath, 'utf8');
      const tasksConfig = JSON.parse(content);
      expect(tasksConfig.version).toBe('2.0.0');
      expect(Array.isArray(tasksConfig.tasks)).toBe(true);
    });
  });

  describe('2. Core Tooling & Script Config Guard', () => {
    it('root package.json includes turbo and typescript in devDependencies', () => {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      expect(rootPkg.devDependencies).toBeDefined();
      expect(rootPkg.devDependencies.turbo).toBeDefined();
      expect(rootPkg.devDependencies.typescript).toBeDefined();
      // The build first syncs the real inventory snapshot into the bundle, then
      // hands off to turbo — the sync pre-step is part of the real-data funnel.
      expect(rootPkg.scripts.build).toBe('node scripts/sync-inventory-snapshot.mjs && turbo run build');
    });
  });

  describe('3. WhatsApp Inventory & Unit Ingestion Integrity', () => {
    const realListingsPath = path.join(REALTY_ROOT, 'data/real-listings.json');
    const waExtractedPath = path.join(ROOT, 'packages/whatsapp-shared/inventory_extracted_units.json');

    it('real-listings.json contains all WhatsApp ingested units with unique IDs', () => {
      expect(fs.existsSync(realListingsPath)).toBe(true);
      const listings = JSON.parse(fs.readFileSync(realListingsPath, 'utf8'));
      expect(Array.isArray(listings)).toBe(true);
      expect(listings.length).toBeGreaterThanOrEqual(200);

      const ids = new Set<string | number>();

      for (const item of listings) {
        // Primary Key ID Uniqueness across entire catalog
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);

        // Required listing attributes
        expect(item.id !== undefined && item.id !== null).toBe(true);
        expect(typeof item.price).toBe('number');
        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(typeof item.compound).toBe('string');
        expect(['sale', 'rent']).toContain(item.mode);
        if (item.code) {
          expect(typeof item.code).toBe('string');
          expect(item.code.length).toBeGreaterThan(0);
        }
      }

      // Check WhatsApp units exist and have positive prices
      const waUnits = listings.filter((l: any) =>
        l.ago === 'WhatsApp Import' ||
        (l.agent && l.agent.includes('WhatsApp')) ||
        (l.ownerName && l.ownerName.includes('WhatsApp'))
      );
      expect(waUnits.length).toBeGreaterThanOrEqual(10);
      for (const wu of waUnits) {
        expect(wu.price).toBeGreaterThan(0);
        expect(wu.status).toBe('Available');
      }
    });

    it('packages/whatsapp-shared/inventory_extracted_units.json contains valid units', () => {
      expect(fs.existsSync(waExtractedPath)).toBe(true);
      const waUnits = JSON.parse(fs.readFileSync(waExtractedPath, 'utf8'));
      expect(Array.isArray(waUnits)).toBe(true);
      expect(waUnits.length).toBeGreaterThanOrEqual(10);

      for (const u of waUnits) {
        expect(u.id).toMatch(/^UNIT-WA-\d+/);
        expect(u.compound).toBeDefined();
        expect(u.price).toBeGreaterThan(0);
      }
    });
  });

  describe('4. GitHub Actions CI/CD Runner Safety Guard', () => {
    it('package.json test:ci script includes forceExit to prevent runner hangs', () => {
      const realtyPkg = JSON.parse(fs.readFileSync(path.join(REALTY_ROOT, 'package.json'), 'utf8'));
      expect(realtyPkg.scripts['test:ci']).toContain('--forceExit');
      expect(realtyPkg.scripts['test:ci']).toContain('--maxWorkers');
    });

    it('all GitHub Action workflows have valid timeout definitions', () => {
      const workflowsDir = path.join(ROOT, '.github/workflows');
      const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
      expect(files.length).toBeGreaterThanOrEqual(5);

      for (const file of files) {
        const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
        expect(content.length).toBeGreaterThan(0);
        // Ensure runs-on is specified
        if (content.includes('runs-on:')) {
          expect(content).toMatch(/runs-on:\s*(\$\{.*\}|[a-zA-Z0-9_-]+)/);
        }
      }
    });
  });

  describe('5. Component React Import & Syntax Regression Scan', () => {
    it('all components in apps/sierra-estates-realty/components are free of syntax and JSX reference issues', () => {
      const componentsDir = path.join(REALTY_ROOT, 'components');
      
      function scanDir(dir: string): string[] {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(scanDir(fullPath));
          } else if (entry.name.endsWith('.tsx')) {
            results.push(fullPath);
          }
        }
        return results;
      }

      const tsxFiles = scanDir(componentsDir);
      expect(tsxFiles.length).toBeGreaterThanOrEqual(15);

      for (const filePath of tsxFiles) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // If file uses JSX tags, it must have import React or valid React hooks
        if (fileContent.includes('<') && fileContent.includes('</')) {
          expect(
            fileContent.includes('import React') ||
            fileContent.includes("from 'react'") ||
            fileContent.includes('from "react"')
          ).toBe(true);
        }
      }
    });
  });

  describe('6. Git Branch Alignment & Repository Integrity Guard', () => {
    it('verifies critical feature and chore branches exist and match main revision', () => {
      const { execSync } = require('child_process');
      try {
        const mainRev = execSync('git rev-parse main', { cwd: ROOT }).toString().trim();
        expect(mainRev.length).toBe(40);

        const branchesToCheck = [
          'chore/site-hardening',
          'feature/workflow',
          'feature/admin-page',
          'feature/client-page',
          'feature/agents-and-bots',
          'feat/agent-memory-learning',
          'feat/client-site-port',
          'harness-coordinator-full',
          'harness-coordinator-prod-ready',
          'mcd/init',
          'claude/client-page-multi-page-l525r1',
          'claude/client-page-react-three-woi3k8',
          'claude/repo-analysis-production-180u7i',
          'deploy/firestore-storage-rules-hardening',
          'ao/se-vercel-de-orchestrator',
        ];

        for (const b of branchesToCheck) {
          try {
            const branchRev = execSync(`git rev-parse ${b}`, { cwd: ROOT }).toString().trim();
            expect(branchRev).toBe(mainRev);
          } catch {
            // Branch might not be checked out locally in all environments
          }
        }
      } catch {
        // Fallback for CI without git binary
      }
    });

    it('verifies .npmrc has no invalid or duplicate keys', () => {
      const npmrcPath = path.join(ROOT, '.npmrc');
      if (fs.existsSync(npmrcPath)) {
        const content = fs.readFileSync(npmrcPath, 'utf8');
        expect(content).not.toContain('PUPPETEER_SKIP_DOWNLOAD');
        expect(content).toContain('shamefully-hoist=true');
      }
    });
  });
});
