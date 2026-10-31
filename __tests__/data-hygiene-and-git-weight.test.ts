/**
 * DATA HYGIENE & GIT WEIGHT CONTRACT TESTS
 *
 * Prevents future regressions:
 * - No single tracked file > 5 MB
 * - No root-level spreadsheets or large CSV files tracked in git
 * - No duplicate files across root and app boundaries
 * - No CircuitPython / hardware artifacts
 * - No stale agent workspace directories tracked
 * - Single canonical Supabase client factory
 */

import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

/** Helper: get list of git-tracked files */
function gitLsFiles(pattern?: string): string[] {
  const cmd = pattern
    ? `git ls-files "${pattern}"`
    : 'git ls-files';
  try {
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/** Helper: get file size in MB */
function fileSizeMB(relPath: string): number {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return 0;
  return fs.statSync(abs).size / (1024 * 1024);
}

describe('Data Hygiene & Git Weight', () => {

  test('no tracked file exceeds 5 MB', () => {
    // Documented exception (2026-10-19 resolution): the inventory snapshot is
    // the ONE sanctioned tracked data file — four routes statically import it
    // and the public map serves it as the offline fallback on clean checkouts
    // (see the NOTE in .gitignore). It is capped at 8 MB instead of 5 MB so
    // bloat is still caught. Everything else must stay under 5 MB.
    const SNAPSHOT_ALLOWLIST = ['apps/sierra-estates-realty/lib/inventory/snapshot.json'];
    const SNAPSHOT_CAP_MB = 8;
    const allFiles = gitLsFiles();
    const oversized = allFiles
      // Exclude static public assets (images/fonts served by Next.js)
      .filter(f => !/^apps\/[^/]+\/public\//.test(f))
      .map(f => ({ file: f, sizeMB: fileSizeMB(f) }))
      .filter(f =>
        SNAPSHOT_ALLOWLIST.includes(f.file)
          ? f.sizeMB > SNAPSHOT_CAP_MB
          : f.sizeMB > 5
      );

    if (oversized.length > 0) {
      const report = oversized
        .sort((a, b) => b.sizeMB - a.sizeMB)
        .map(f => `  ${f.sizeMB.toFixed(1)} MB  ${f.file}`)
        .join('\n');
      expect.fail(
        `Found ${oversized.length} tracked file(s) exceeding their size limit:\n${report}\n` +
        'Move large data to Supabase Storage and add to .gitignore.'
      );
    }
  }, 30000);

  test('no root-level spreadsheets tracked in git', () => {
    const rootXlsx = gitLsFiles().filter(
      f => !f.includes('/') && f.endsWith('.xlsx')
    );
    expect(rootXlsx).toEqual([]);
  });

  test('no root-level large CSV files tracked in git', () => {
    const rootCsv = gitLsFiles().filter(
      f => !f.includes('/') && f.endsWith('.csv')
    );
    expect(rootCsv).toEqual([]);
  });

  test('data/ directory is not tracked in git', () => {
    const dataFiles = gitLsFiles('data/*');
    expect(dataFiles).toEqual([]);
  });

  test('snapshot.json IS tracked as the documented offline-fallback exception', () => {
    // 2026-10-19: the same e07c047 commit added BOTH this file's old
    // "not tracked" assertion AND the .gitignore NOTE declaring it
    // deliberately committed — an internal contradiction, resolved four days
    // later by f0fca73 actually committing the snapshot (the site requires it
    // on clean checkouts). This pin codifies the CURRENT, documented policy:
    // the snapshot is tracked, stays under the 8 MB bloat cap, and is the
    // ONLY sanctioned tracked data file.
    const snapshot = gitLsFiles(
      'apps/sierra-estates-realty/lib/inventory/snapshot.json'
    );
    expect(snapshot).toEqual(['apps/sierra-estates-realty/lib/inventory/snapshot.json']);
    expect(fileSizeMB(snapshot[0])).toBeLessThanOrEqual(8);
  });

  test('no root hooks/ directory shadowing app hooks', () => {
    const rootHooks = gitLsFiles('hooks/*');
    expect(rootHooks).toEqual([]);
  });

  test('no root lib/supabaseClient.ts duplicate', () => {
    const clientFile = gitLsFiles('lib/supabaseClient.ts');
    expect(clientFile).toEqual([]);
  });

  test('no CircuitPython artifacts tracked', () => {
    const circuitPython = [
      ...gitLsFiles('libArchive/*'),
      ...gitLsFiles('stubArchive/*'),
    ].filter(f => /circuit|adafruit/i.test(f));
    expect(circuitPython).toEqual([]);
  });

  test('no stale agent workspace configs tracked', () => {
    const staleAgentDirs = [
      ...gitLsFiles('.claude-flow/*'),
      ...gitLsFiles('.factory/*'),
      ...gitLsFiles('.qwen/*'),
      ...gitLsFiles('.zencoder/*'),
    ];
    expect(staleAgentDirs).toEqual([]);
  });

  test('no duplicate workspace files', () => {
    const workspaceFiles = gitLsFiles().filter(f =>
      f.endsWith('.code-workspace') && !f.includes('/')
    );
    expect(workspaceFiles.length).toBeLessThanOrEqual(1);
  });

  test('@sierra-estates/db is the canonical Supabase client factory', () => {
    // Root lib/ should not export its own createClient
    const rootLibSupabase = gitLsFiles('lib/supabase.ts');
    const rootLibClient = gitLsFiles('lib/supabaseClient.ts');
    expect(rootLibSupabase).toEqual([]);
    expect(rootLibClient).toEqual([]);

    // The canonical factory must exist in the db package
    const dbPackage = path.join(ROOT, 'packages', 'db');
    expect(fs.existsSync(dbPackage)).toBe(true);
  });

  test('no dead root lib/ context files', () => {
    const deadContexts = [
      'lib/AuthContext.tsx',
      'lib/I18nContext.tsx',
      'lib/lenis.ts',
    ];
    for (const file of deadContexts) {
      const tracked = gitLsFiles(file);
      expect(tracked, `${file} should not be tracked`).toEqual([]);
    }
  });
});
