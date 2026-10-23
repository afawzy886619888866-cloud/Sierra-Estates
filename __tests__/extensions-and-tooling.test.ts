import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('IDE Extensions, Tooling & Workflow Verification Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const VSCODE_DIR = path.join(ROOT_DIR, '.vscode');
  const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');

  describe('.vscode/extensions.json configuration', () => {
    it('extensions.json must exist and recommend core productivity extensions', () => {
      const extPath = path.join(VSCODE_DIR, 'extensions.json');
      expect(fs.existsSync(extPath), 'extensions.json must exist').toBe(true);

      const data = JSON.parse(fs.readFileSync(extPath, 'utf-8'));
      expect(Array.isArray(data.recommendations)).toBe(true);

      const requiredExtensions = [
        'supabase.postgrestools',
        'ckolkman.vscode-postgres',
        'mtxr.sqltools',
        'dbaeumer.vscode-eslint',
        'vitest.explorer',
        'active-twist.amphion-agent',
        'github.vscode-github-actions',
      ];

      for (const ext of requiredExtensions) {
        expect(data.recommendations).toContain(ext);
      }
    });
  });

  describe('.vscode/mcp.json configuration', () => {
    it('mcp.json must exist and configure local MCP servers', () => {
      const mcpPath = path.join(VSCODE_DIR, 'mcp.json');
      expect(fs.existsSync(mcpPath), 'mcp.json must exist').toBe(true);

      const data = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
      expect(data.servers).toBeDefined();
      expect(data.servers['sierra-estates']).toBeDefined();
      expect(data.servers['amphion-command-deck']).toBeDefined();

      // Ensure sierra-estates does not invoke npx (to avoid C: drive ENOSPC)
      const sierraCmd = data.servers['sierra-estates'].command;
      expect(sierraCmd).not.toBe('npx');
    });
  });

  describe('.vscode/tasks.json configuration', () => {
    it('tasks.json must configure Supabase and production verification tasks', () => {
      const tasksPath = path.join(VSCODE_DIR, 'tasks.json');
      expect(fs.existsSync(tasksPath), 'tasks.json must exist').toBe(true);

      const data = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
      const labels = data.tasks.map((t: { label: string }) => t.label);

      expect(labels).toContain('Apply Supabase Master Schema');
      expect(labels).toContain('Verify Production Deployment Readiness');
      expect(labels).toContain('Verify Production Environment Readiness');
      expect(labels).toContain('Generate Supabase Embeddings');
    });
  });

  describe('.vscode/settings.json configuration', () => {
    it('settings.json must configure postgres as default SQL database and search excludes', () => {
      const settingsPath = path.join(VSCODE_DIR, 'settings.json');
      expect(fs.existsSync(settingsPath), 'settings.json must exist').toBe(true);

      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(data['sql.defaultDatabaseType']).toBe('postgres');
      expect(data['editor.formatOnSave']).toBe(true);
      expect(data['search.exclude']).toBeDefined();
      expect(data['search.exclude']['**/node_modules']).toBe(true);
    });
  });

  describe('Supabase Dominance & Firebase Retirement in CI/CD', () => {
    it('Firebase deployment workflows must be retired from active CI', () => {
      const firebaseDeployPath = path.join(WORKFLOWS_DIR, 'deploy-firebase.yml');
      const firebaseRulesPath = path.join(WORKFLOWS_DIR, 'deploy-firebase-rules.yml');

      expect(fs.existsSync(firebaseDeployPath)).toBe(false);
      expect(fs.existsSync(firebaseRulesPath)).toBe(false);
    });

    it('deploy-supabase.yml must declare explicit permissions block', () => {
      const supabaseDeployPath = path.join(WORKFLOWS_DIR, 'deploy-supabase.yml');
      expect(fs.existsSync(supabaseDeployPath)).toBe(true);

      const content = fs.readFileSync(supabaseDeployPath, 'utf-8');
      expect(content).toContain('permissions:');
      expect(content).toContain('contents: read');
    });

    it('package.json must configure Supabase deployment scripts and no live Firebase deploy scripts', () => {
      const pkgPath = path.join(ROOT_DIR, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      expect(pkg.scripts['deploy:supabase']).toBeDefined();
      expect(pkg.scripts['deploy:schema']).toBeDefined();
      expect(pkg.scripts['deploy:firebase']).toBeUndefined();
      expect(pkg.scripts['deploy:rules']).toBeUndefined();
    });
  });
});
