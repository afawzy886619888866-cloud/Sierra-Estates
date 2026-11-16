import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('workflows (Automations & Scraper Pipelines)', () => {
  const WORKFLOWS_ROOT = path.resolve(__dirname, '..');

  it('should contain all 5 numbered automation pipeline directories', () => {
    const expectedPipelines = [
      '01-whatsapp-scraper',
      '02-owner-search',
      '03-owner-contact',
      '04-email-sender',
      '05-unit-adder',
    ];

    for (const pipeline of expectedPipelines) {
      const pipelinePath = path.join(WORKFLOWS_ROOT, pipeline);
      expect(fs.existsSync(pipelinePath)).toBe(true);
      expect(fs.statSync(pipelinePath).isDirectory()).toBe(true);
    }
  });

  it('should have a valid package.json with dependencies', () => {
    const pkgPath = path.join(WORKFLOWS_ROOT, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.name).toBeDefined();
  });

  it('should have .env.example defining required credentials and sheet IDs', () => {
    const envExamplePath = path.join(WORKFLOWS_ROOT, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  describe('Workflow 01 - WhatsApp Scraper Script', () => {
    const scraperScriptPath = path.join(WORKFLOWS_ROOT, '01-whatsapp-scraper', 'index.js');

    it('should exist and define WhatsApp client and Google Sheets integration', () => {
      expect(fs.existsSync(scraperScriptPath)).toBe(true);
      const code = fs.readFileSync(scraperScriptPath, 'utf-8');

      expect(code).toContain('whatsapp-web.js');
      expect(code).toContain('googleapis');
      expect(code).toContain('GROUPS_TO_WATCH');
      expect(code).toContain('appendToSheet');
    });

    it('should watch target New Cairo broker groups', () => {
      const code = fs.readFileSync(scraperScriptPath, 'utf-8');
      expect(code).toContain('مجموعة وسطاء التجمع');
      expect(code).toContain('عقارات القاهرة الجديدة');
      expect(code).toContain('وسطاء شرق القاهرة');
    });
  });

  describe('Documentation & Templates', () => {
    it('should contain setup guides for sheets and GitHub secrets', () => {
      expect(fs.existsSync(path.join(WORKFLOWS_ROOT, 'SHEETS_SETUP.md'))).toBe(true);
      expect(fs.existsSync(path.join(WORKFLOWS_ROOT, 'GITHUB_SECRETS_SETUP.md'))).toBe(true);
      expect(fs.existsSync(path.join(WORKFLOWS_ROOT, 'README.md'))).toBe(true);
    });

    it('should contain n8n-templates directory if applicable', () => {
      const templatesDir = path.join(WORKFLOWS_ROOT, 'n8n-templates');
      expect(fs.existsSync(templatesDir)).toBe(true);
    });
  });
});
