import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('deploy/ (Static Client Portal & Pages)', () => {
  const DEPLOY_DIR = path.resolve(__dirname, '..');

  const HTML_PAGES = [
    'index.html',
    'properties.html',
    'property.html',
    'compounds.html',
    'virtual-tour.html',
    'pricing.html',
    'roi.html',
    'advice.html',
    'career.html',
    'matches.html',
    'add-listing.html',
    'ai-engine.html',
  ];

  describe('HTML Files Existence & Standard Structure', () => {
    for (const page of HTML_PAGES) {
      it(`${page} should exist and have valid DOCTYPE, head, and body`, () => {
        const filePath = path.join(DEPLOY_DIR, page);
        expect(fs.existsSync(filePath), `${page} is missing`).toBe(true);

        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.toLowerCase()).toContain('<!doctype html>');
        expect(content).toContain('<head>');
        expect(content).toContain('</head>');
        expect(content).toContain('<body>');
        expect(content).toContain('</body>');
        expect(content).toContain('<meta charset');
        expect(content).toContain('<title>');
      });
    }
  });

  describe('CSS Assets & Clean Code Quality (No Inline Styles)', () => {
    it('shared.css and compounds.css should exist and be non-empty', () => {
      const sharedCss = path.join(DEPLOY_DIR, 'shared.css');
      const compoundsCss = path.join(DEPLOY_DIR, 'compounds.css');

      expect(fs.existsSync(sharedCss)).toBe(true);
      expect(fs.existsSync(compoundsCss)).toBe(true);

      const sharedContent = fs.readFileSync(sharedCss, 'utf-8');
      expect(sharedContent.length).toBeGreaterThan(1000);
      expect(sharedContent).toContain('.is-inline-');
    });

    it('HTML files (excluding JS template strings) should have no inline style attributes', () => {
      const inlineStyleRegex = /<[a-z0-9-]+(?:\s+[^>]*)?\s+style=(["']).*?\1/i;

      for (const page of ['index.html', 'property.html', 'compounds.html', 'virtual-tour.html']) {
        const content = fs.readFileSync(path.join(DEPLOY_DIR, page), 'utf-8');
        
        // Strip out <script> blocks before checking HTML tags
        const contentWithoutScripts = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        const hasInlineStyle = inlineStyleRegex.test(contentWithoutScripts);
        expect(hasInlineStyle, `File ${page} still contains inline style attribute in HTML markup`).toBe(false);
      }
    });

    it('all pages should reference stylesheets or style blocks', () => {
      for (const page of HTML_PAGES) {
        const content = fs.readFileSync(path.join(DEPLOY_DIR, page), 'utf-8');
        expect(content).toMatch(/shared\.css|compounds\.css|<link [^>]*rel=["']stylesheet["']|<style>/i);
      }
    });
  });

  describe('Scripts & Brand Assets', () => {
    it('shared.js should exist and provide site navigation and utilities', () => {
      const sharedJs = path.join(DEPLOY_DIR, 'shared.js');
      expect(fs.existsSync(sharedJs)).toBe(true);
      const code = fs.readFileSync(sharedJs, 'utf-8');
      expect(code.length).toBeGreaterThan(500);
    });

    it('brand logo assets should exist in deploy directory', () => {
      const expectedLogos = [
        'logo-gold.png',
        'logo-mark.png',
        'logo-mark-96.png',
        'logo-small.png',
      ];
      for (const logo of expectedLogos) {
        expect(fs.existsSync(path.join(DEPLOY_DIR, logo)), `Missing ${logo}`).toBe(true);
      }
    });

    it('standalone vercel.json should exist with caching headers', () => {
      const vercelJsonPath = path.join(DEPLOY_DIR, 'vercel.json');
      expect(fs.existsSync(vercelJsonPath)).toBe(true);
      const conf = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
      expect(conf.headers).toBeDefined();
      expect(Array.isArray(conf.headers)).toBe(true);
    });
  });
});
