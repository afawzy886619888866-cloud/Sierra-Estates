import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Design System, Claymorphism & Visual Tokens Test Suite
 * Asserts structural token integrity, pneumatic shadow depth,
 * Double-Bezel boundaries, and accessibility fallbacks.
 */
describe('Design System, Claymorphism & Visual Tokens Test Suite', () => {
  const REALTY_APP_DIR = path.resolve(__dirname, '..', 'apps', 'sierra-estates-realty');
  const ADMIN_CSS_PATH = path.join(REALTY_APP_DIR, 'app', 'admin', 'admin-portal.css');
  const SITE_REFINEMENTS_CSS_PATH = path.join(REALTY_APP_DIR, 'app', 'site-styles', 'site-refinements.css');

  describe('Admin Portal — Tactile Claymorphism Tokens', () => {
    it('admin-portal.css exists and defines core claymorphism tokens', () => {
      expect(fs.existsSync(ADMIN_CSS_PATH)).toBe(true);
      const css = fs.readFileSync(ADMIN_CSS_PATH, 'utf-8');

      const requiredClayTokens = [
        '--clay-card-shadow',
        '--clay-card-inset',
        '--clay-btn-shadow',
        '--clay-input-inset',
        '--clay-rad-lg',
        '--clay-rad-md',
        '--clay-rad-sm',
        '--clay-trans',
        '--gold',
        '--gold-lt',
      ];

      for (const token of requiredClayTokens) {
        expect(css, `admin-portal.css must define ${token}`).toContain(token);
      }
    });

    it('contains pneumatic depth shadow definitions (outer + inner bevel)', () => {
      const css = fs.readFileSync(ADMIN_CSS_PATH, 'utf-8');
      // Claymorphism uses dual box-shadows (inset highlight + deep outer shadow)
      expect(css).toContain('inset');
      expect(css).toContain('border-radius:');
    });

    it('includes dark mode token overrides for claymorphic surfaces', () => {
      const css = fs.readFileSync(ADMIN_CSS_PATH, 'utf-8');
      expect(css).toContain('[data-theme="dark"]');
    });

    it('declares reduced-motion accessibility overrides for pneumatic transitions', () => {
      const css = fs.readFileSync(ADMIN_CSS_PATH, 'utf-8');
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    });
  });

  describe('Client Portal — Double-Bezel & Luxury Glass Navigation', () => {
    it('site-refinements.css exists and defines Double-Bezel card and glassmorphic styles', () => {
      expect(fs.existsSync(SITE_REFINEMENTS_CSS_PATH)).toBe(true);
      const css = fs.readFileSync(SITE_REFINEMENTS_CSS_PATH, 'utf-8');

      expect(css).toContain('.pcard');
      expect(css).toContain('backdrop-filter');
      expect(css).toContain('.nav.scrolled');
    });

    it('defines smooth spring timing functions for interactive cards', () => {
      const css = fs.readFileSync(SITE_REFINEMENTS_CSS_PATH, 'utf-8');
      expect(css).toContain('cubic-bezier');
    });
  });
});
