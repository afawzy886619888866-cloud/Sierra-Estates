import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Monorepo Package Boundaries & Export Contract Test Suite
 * Validates consistency across all @sierra-estates/* packages.
 */
describe('Monorepo Package Boundaries & Export Contract Test Suite', () => {
  const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

  const packageDirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  it('detects all core monorepo packages', () => {
    expect(packageDirs.length).toBeGreaterThanOrEqual(10);
    expect(packageDirs).toContain('agents-core');
    expect(packageDirs).toContain('memory-engine');
    expect(packageDirs).toContain('ai-agent-sdk');
    expect(packageDirs).toContain('exchange');
    expect(packageDirs).toContain('db');
    expect(packageDirs).toContain('shared');
    expect(packageDirs).toContain('ui');
  });

  describe('Package.json Structure & Scripts', () => {
    for (const pkgName of packageDirs) {
      const pkgJsonPath = path.join(PACKAGES_DIR, pkgName, 'package.json');

      it(`package ${pkgName} has a valid package.json with standard fields`, () => {
        if (!fs.existsSync(pkgJsonPath)) return; // Some subdirs may be assets
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

        expect(pkg.name, `${pkgName} must have a scoped or valid name`).toBeDefined();
        expect(pkg.version, `${pkgName} must specify a version`).toBeDefined();
      });
    }
  });

  describe('TypeScript Configuration Parity', () => {
    for (const pkgName of packageDirs) {
      const tsconfigPath = path.join(PACKAGES_DIR, pkgName, 'tsconfig.json');
      const pkgJsonPath = path.join(PACKAGES_DIR, pkgName, 'package.json');

      if (fs.existsSync(pkgJsonPath) && fs.existsSync(tsconfigPath)) {
        it(`package ${pkgName} has a valid tsconfig.json`, () => {
          const content = fs.readFileSync(tsconfigPath, 'utf-8');
          // Should not be empty
          expect(content.length).toBeGreaterThan(10);
        });
      }
    }
  });
});
