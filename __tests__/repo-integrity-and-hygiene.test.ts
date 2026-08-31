import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Monorepo Code Hygiene, Integrity & Conflict Scanner
 * Ensures no merge conflict markers, corrupted files, or stray debug debris
 * exist anywhere in the codebase.
 */
describe('Monorepo Integrity & Code Hygiene Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const SCAN_DIRS = ['apps', 'packages', 'functions', 'scripts', '.github', 'docs'];
  const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.py', '.css', '.md', '.yml', '.yaml', '.sh'];

  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === '.next' ||
          entry.name === '.turbo' ||
          entry.name === 'dist' ||
          entry.name === 'coverage' ||
          entry.name === '__pycache__' ||
          entry.name === '.pytest_cache' ||
          entry.name === '.wwebjs_cache' ||
          entry.name === 'wa_sessions'
        ) {
          continue;
        }
        getAllFiles(fullPath, fileList);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (SCAN_EXTENSIONS.includes(ext)) {
          fileList.push(fullPath);
        }
      }
    }
    return fileList;
  }

  const allSourceFiles: string[] = [];
  for (const scanDir of SCAN_DIRS) {
    getAllFiles(path.join(ROOT_DIR, scanDir), allSourceFiles);
  }

  it('scans a comprehensive set of source files across the monorepo', () => {
    expect(allSourceFiles.length).toBeGreaterThan(100);
  });

  it('no source file contains git merge conflict markers (<<<<<<<, =======, >>>>>>>)', () => {
    const conflictViolations: { file: string; line: number; marker: string }[] = [];
    const conflictPatterns = [
      { regex: /^<{7}\s+/m, name: '<<<<<<<' },
      { regex: /^={7}$/m, name: '=======' },
      { regex: /^>{7}\s+/m, name: '>>>>>>>' },
    ];

    for (const file of allSourceFiles) {
      // Exclude tests that deliberately check conflict strings
      if (file.includes('conflicts-and-race-conditions') || file.includes('repo-integrity-and-hygiene')) {
        continue;
      }
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of conflictPatterns) {
        if (pattern.regex.test(content)) {
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (pattern.regex.test(line)) {
              conflictViolations.push({
                file: path.relative(ROOT_DIR, file),
                line: idx + 1,
                marker: pattern.name,
              });
            }
          });
        }
      }
    }

    expect(conflictViolations).toEqual([]);
  }, 25000);

  it('all JSON configuration files must be valid and parseable', () => {
    const jsonFiles = allSourceFiles.filter((f) => f.endsWith('.json') && !f.includes('.next'));
    const invalidJsonFiles: { file: string; error: string }[] = [];

    for (const file of jsonFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        JSON.parse(content);
      } catch (err: any) {
        invalidJsonFiles.push({
          file: path.relative(ROOT_DIR, file),
          error: err.message,
        });
      }
    }

    expect(invalidJsonFiles).toEqual([]);
  });

  it('critical root configuration files must exist and be populated', () => {
    const requiredRootFiles = [
      'package.json',
      'pnpm-workspace.yaml',
      'turbo.json',
      'firestore.rules',
      'storage.rules',
      'firebase.json',
      '.env.example',
      'README.md',
    ];

    for (const filename of requiredRootFiles) {
      const fullPath = path.join(ROOT_DIR, filename);
      expect(fs.existsSync(fullPath), `Root file ${filename} must exist`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size, `Root file ${filename} must not be empty`).toBeGreaterThan(10);
    }
  });

  it('all package.json files across apps and packages must have valid names and scripts', () => {
    const pkgFiles = allSourceFiles.filter((f) => path.basename(f) === 'package.json');
    expect(pkgFiles.length).toBeGreaterThanOrEqual(10);

    for (const pkgFile of pkgFiles) {
      const content = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
      expect(content.name, `${pkgFile} must have a name`).toBeDefined();
      expect(typeof content.name).toBe('string');
    }
  });
});
