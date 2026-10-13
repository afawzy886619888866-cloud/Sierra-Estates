import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Sierra Ops Toolkit Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const OPS_DIR = path.join(ROOT_DIR, 'scripts', 'ops', 'sierra');

  const EXPECTED_FILES = [
    'README.md',
    'smoke_production.sh',
    'generate_worklist.py',
    'apply_enrichment.py',
    'recheck_and_publish.py',
  ];

  it('verifies all ops toolkit files exist and are non-empty', () => {
    for (const file of EXPECTED_FILES) {
      const fullPath = path.join(OPS_DIR, file);
      expect(fs.existsSync(fullPath), `Missing ops file: ${file}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size, `File is empty: ${file}`).toBeGreaterThan(100);
    }
  });

  it('ensures no hardcoded Supabase secrets or JWTs exist in ops toolkit', () => {
    const SECRET_PATTERNS = [
      /sb_secret_[a-zA-Z0-9_\-]+/,
      /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/,
    ];

    for (const file of EXPECTED_FILES) {
      const fullPath = path.join(OPS_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SECRET_PATTERNS) {
        expect(pattern.test(content), `Found hardcoded secret in ${file}`).toBe(false);
      }
    }
  });

  it('ensures python scripts compile cleanly without syntax errors', () => {
    const pyScripts = [
      'generate_worklist.py',
      'apply_enrichment.py',
      'recheck_and_publish.py',
    ];

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    for (const script of pyScripts) {
      const fullPath = path.join(OPS_DIR, script);
      expect(() => {
        execSync(`"${pythonCmd}" -m py_compile "${fullPath}"`, {
          cwd: ROOT_DIR,
          stdio: 'pipe',
        });
      }, `Python script failed compilation: ${script}`).not.toThrow();
    }
  }, 20000);

  it('verifies GitHub Actions workflow production-smoke.yml is present', () => {
    const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'production-smoke.yml');
    expect(fs.existsSync(workflowPath), 'Missing production-smoke.yml').toBe(true);
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('scripts/ops/sierra/smoke_production.sh');
  });
});
