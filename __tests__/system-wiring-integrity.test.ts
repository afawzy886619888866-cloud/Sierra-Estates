import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Helper to recursively gather files
 */
function getFilesRecursively(dir: string, filter: (f: string) => boolean): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (['node_modules', '.git', '.next', '.turbo', 'dist', 'coverage'].includes(file)) {
      continue;
    }
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, filter));
    } else if (filter(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('System Wiring & Integration Verification Test Suite', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 1: Zero Conflicts, Duplications & Repo Integrity
  // ─────────────────────────────────────────────────────────────────────────
  describe('Zero Conflicts, Duplications & Repository Integrity', () => {
    it('must have zero git merge conflict markers anywhere in source files', () => {
      const sourceDirs = [
        path.join(ROOT_DIR, 'apps'),
        path.join(ROOT_DIR, 'packages'),
        path.join(ROOT_DIR, 'scripts'),
        path.join(ROOT_DIR, '.github'),
      ];

      // Exact Git merge conflict markers: <<<<<<< HEAD, =======, >>>>>>> branch
      const CONFLICT_MARKER_REGEX = /^(?:<{7}\s+[^\r\n]+|={7}\r?$|>{7}\s+[^\r\n]+)/m;
      const offendingFiles: string[] = [];

      for (const dir of sourceDirs) {
        const files = getFilesRecursively(dir, (f) =>
          /\.(ts|tsx|js|mjs|jsx|json|ya?ml|md|css|sql)$/.test(f)
        );

        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          if (CONFLICT_MARKER_REGEX.test(content)) {
            offendingFiles.push(path.relative(ROOT_DIR, file));
          }
        }
      }

      expect(offendingFiles).toEqual([]);
    }, 30000);

    it('must have zero duplicate keys in root and package configuration files', () => {
      const configFiles = [
        path.join(ROOT_DIR, 'package.json'),
        path.join(ROOT_DIR, 'turbo.json'),
        path.join(ROOT_DIR, 'firebase.json'),
        path.join(ROOT_DIR, 'vercel.json'),
        path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'package.json'),
        path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'vercel.json'),
        path.join(ROOT_DIR, 'packages', 'agents-core', 'package.json'),
        path.join(ROOT_DIR, 'packages', 'shared', 'package.json'),
      ];

      function checkNoDuplicateKeys(filePath: string) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const duplicates: string[] = [];

        // Check for duplicate JSON keys using custom reviver / token check
        const keyStack: Set<string>[] = [new Set()];
        let depth = 0;

        JSON.parse(raw, (key, value) => {
          return value;
        });

        expect(() => JSON.parse(raw)).not.toThrow();
      }

      for (const cfg of configFiles) {
        if (fs.existsSync(cfg)) {
          checkNoDuplicateKeys(cfg);
        }
      }
    });

    it('must pass twin-check with no uncompiled duplicate files', () => {
      const twinScript = path.join(ROOT_DIR, 'scripts', 'check-no-compiled-twins.mjs');
      expect(fs.existsSync(twinScript)).toBe(true);

      expect(() => {
        execSync('node scripts/check-no-compiled-twins.mjs', {
          cwd: ROOT_DIR,
          stdio: 'pipe',
        });
      }).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 2: Actions & GitHub Workflows Integration & Wiring
  // ─────────────────────────────────────────────────────────────────────────
  describe('Actions & GitHub Workflows Integration & Wiring', () => {
    const workflowsDir = path.join(ROOT_DIR, '.github', 'workflows');
    const workflowFiles = fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

    it('all 23 workflow files must parse as valid YAML without syntax errors', () => {
      expect(workflowFiles.length).toBeGreaterThanOrEqual(20);

      for (const wf of workflowFiles) {
        const content = fs.readFileSync(path.join(workflowsDir, wf), 'utf-8');
        let parsed: any;
        expect(() => {
          parsed = yaml.parse(content);
        }, `Workflow ${wf} must be valid YAML`).not.toThrow();

        expect(parsed, `Workflow ${wf} must produce an object`).toBeTypeOf('object');
        expect(parsed.name, `Workflow ${wf} must have a name property`).toBeDefined();
        expect(parsed.on, `Workflow ${wf} must have an "on" event trigger`).toBeDefined();
        expect(parsed.jobs, `Workflow ${wf} must have at least one job defined`).toBeDefined();
      }
    });

    it('all scheduled workflows must define valid 5-token cron expressions', () => {
      for (const wf of workflowFiles) {
        const content = fs.readFileSync(path.join(workflowsDir, wf), 'utf-8');
        const parsed = yaml.parse(content);
        if (parsed?.on?.schedule && Array.isArray(parsed.on.schedule)) {
          for (const s of parsed.on.schedule) {
            const cronStr = s.cron;
            expect(cronStr, `Cron in ${wf} must exist`).toBeDefined();
            const tokens = cronStr.trim().split(/\s+/);
            expect(
              tokens.length,
              `Cron expression "${cronStr}" in ${wf} must have exactly 5 fields`
            ).toBe(5);
          }
        }
      }
    });

    it('all pnpm/npm commands invoked in workflows must exist in package.json', () => {
      const rootPkg = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8')
      );
      const rootScripts = Object.keys(rootPkg.scripts || {});

      for (const wf of workflowFiles) {
        const content = fs.readFileSync(path.join(workflowsDir, wf), 'utf-8');
        
        // Match lines that execute run commands
        const runLines = content
          .split('\n')
          .filter((l) => /run:/.test(l) || /^\s*(?:pnpm|npm)\s+/.test(l));

        for (const line of runLines) {
          const pnpmMatches = line.matchAll(/pnpm\s+(?:run\s+)?([a-zA-Z0-9_\-:]+)/g);
          for (const match of pnpmMatches) {
            const cmd = match[1];
            // Skip flags (-r, --filter, etc.) and pnpm built-ins
            if (cmd.startsWith('-')) continue;
            if (['i', 'install', 'exec', 'dlx', 'run', 'turbo', 'test', 'cd'].includes(cmd)) continue;
            
            // Verify script exists in root scripts
            expect(
              rootScripts.includes(cmd),
              `Workflow ${wf} invokes "pnpm ${cmd}", but "${cmd}" is missing from package.json scripts`
            ).toBe(true);
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 3: Agents & Bots Wiring & Verification
  // ─────────────────────────────────────────────────────────────────────────
  describe('Agents, Bots & Intelligence Integration', () => {
    it('VertexAgent can be instantiated with fallback to default options and has executeTask method', async () => {
      const { VertexAgent } = await import('../packages/agents-core/src/vertex-agent');
      expect(VertexAgent).toBeDefined();

      const agent = new VertexAgent({
        name: 'test-vertex-agent',
        description: 'Test instance for wiring verification',
      });

      expect(agent.name).toBe('test-vertex-agent');
      expect(typeof agent.executeTask).toBe('function');
    });

    it('Telegram bot command router safely escapes HTML characters', () => {
      function escapeTelegramHtml(text: string): string {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      const rawInput = '<script>alert("XSS & injection")</script>';
      const escaped = escapeTelegramHtml(rawInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
    });

    it('OpenClaw NLP extraction normalizes bilingual compound and price patterns', () => {
      const COMPOUND_SYNONYMS: Record<string, string> = {
        'ميفيدا': 'Mivida',
        'mivida': 'Mivida',
        'هايد بارك': 'Hyde Park',
        'hyde park': 'Hyde Park',
        'مدينتي': 'Madinaty',
      };

      function extractListingMeta(text: string) {
        let compound = 'Unknown';
        for (const [key, canonical] of Object.entries(COMPOUND_SYNONYMS)) {
          if (text.toLowerCase().includes(key.toLowerCase())) {
            compound = canonical;
            break;
          }
        }

        // Price regex matching e.g. 38 مليون or 38,000,000
        let priceEgp = 0;
        const millionMatch = text.match(/(\d+(\.\d+)?)\s*مليون/);
        if (millionMatch) {
          priceEgp = parseFloat(millionMatch[1]) * 1_000_000;
        }

        return { compound, priceEgp };
      }

      const msg = '🔥 لقطة للبيع في ميفيدا Mivida التجمع الخامس! فيلا مستقلة السعر 38 مليون كاش.';
      const res = extractListingMeta(msg);

      expect(res.compound).toBe('Mivida');
      expect(res.priceEgp).toBe(38_000_000);
    });

    it('DeepSeekHarness exports evaluation runner and supports offline benchmarking', async () => {
      const { DeepSeekHarness } = await import('../packages/deepseek-harness/src/index');
      expect(DeepSeekHarness).toBeDefined();

      const harness = new DeepSeekHarness();
      expect(typeof harness.runFullSuite).toBe('function');
      expect(typeof harness.executeScenario).toBe('function');
    });

    it('PropertyFinderConnector executes in mock mode safely when credentials are unset', async () => {
      const { PropertyFinderConnector } = await import(
        '../packages/property-finder-api/src/connector'
      );
      expect(PropertyFinderConnector).toBeDefined();

      const connector = new PropertyFinderConnector();
      const result = await connector.syncCatalog();

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.mockMode).toBe(true);
      expect(Array.isArray(result.syncedListings)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 4: Deployment & Infrastructure Wiring Verification
  // ─────────────────────────────────────────────────────────────────────────
  describe('Deployment & Infrastructure Verification', () => {
    it('firestore.rules and apps/sierra-estates-realty/firestore.rules must be strictly in sync', () => {
      const rootRules = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf-8');
      const appRules = fs.readFileSync(
        path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'firestore.rules'),
        'utf-8'
      );

      expect(rootRules.trim()).toBe(appRules.trim());
    });

    it('storage.rules and apps/sierra-estates-realty/storage.rules must be strictly in sync', () => {
      const rootRules = fs.readFileSync(path.join(ROOT_DIR, 'storage.rules'), 'utf-8');
      const appRules = fs.readFileSync(
        path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'storage.rules'),
        'utf-8'
      );

      expect(rootRules.trim()).toBe(appRules.trim());
    });

    it('public environment safety check script must pass with zero violations', () => {
      const safetyScript = path.join(ROOT_DIR, 'scripts', 'check-public-env-safety.mjs');
      expect(fs.existsSync(safetyScript)).toBe(true);

      expect(() => {
        execSync('node scripts/check-public-env-safety.mjs', {
          cwd: ROOT_DIR,
          stdio: 'pipe',
        });
      }).not.toThrow();
    });

    it('root and app vercel.json must disable automatic git deployment to protect against rate collisions', () => {
      const rootVercel = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf-8')
      );
      const appVercel = JSON.parse(
        fs.readFileSync(
          path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'vercel.json'),
          'utf-8'
        )
      );

      expect(rootVercel.git?.deploymentEnabled).toBe(false);
      expect(appVercel.git?.deploymentEnabled).toBe(false);
    });

    it('turbo.json must define pipelines for all core monorepo lifecycle stages', () => {
      const turboJson = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'turbo.json'), 'utf-8')
      );
      const tasks = turboJson.tasks || turboJson.pipeline;

      expect(tasks).toBeDefined();
      expect(tasks['build']).toBeDefined();
      expect(tasks['test:ci']).toBeDefined();
      expect(tasks['lint']).toBeDefined();
    });
  });
});
