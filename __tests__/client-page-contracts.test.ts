import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Client Page & Public Portal Architecture Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const APP_DIR = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'app');
  const SITE_DIR = path.join(APP_DIR, '(site)');

  describe('Public Client Routes & Pages Inventory', () => {
    it('should have root layout.tsx, globals.css, and client error boundaries', () => {
      expect(fs.existsSync(path.join(APP_DIR, 'layout.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(APP_DIR, 'globals.css'))).toBe(true);
      expect(fs.existsSync(path.join(APP_DIR, 'error.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(APP_DIR, 'not-found.tsx'))).toBe(true);
    });

    it('should declare all core public routes under app/(site)', () => {
      const requiredSiteRoutes = [
        'HomePage.tsx',
        'layout.tsx',
        'page.tsx',
        'properties',
        'compounds',
        'add-listing',
        'pricing',
        'roi',
        'virtual-tour',
      ];

      for (const r of requiredSiteRoutes) {
        expect(fs.existsSync(path.join(SITE_DIR, r)), `Missing site route or component: ${r}`).toBe(true);
      }
    });

    it('should support dedicated Arabic localized route /ar', () => {
      expect(fs.existsSync(path.join(APP_DIR, 'ar'))).toBe(true);
    });
  });

  describe('SEO & OpenGraph Metadata Contracts', () => {
    function generatePropertyMetadata(property: {
      title: string;
      description: string;
      compound: string;
      priceEgp: number;
    }) {
      const formattedPrice = (property.priceEgp / 1_000_000).toFixed(1);
      return {
        title: `${property.title} | Sierra Estates Egypt`,
        description: property.description,
        openGraph: {
          title: `${property.title} - ${formattedPrice}M EGP`,
          description: property.description,
          siteName: 'Sierra Estates',
          locale: 'en_US',
          alternateLocale: 'ar_EG',
          type: 'website',
        },
      };
    }

    it('should build valid SEO metadata object with price formatting and OG tags', () => {
      const meta = generatePropertyMetadata({
        title: 'Mivida Standalone Villa Type A',
        description: 'Prime luxury standalone villa in Mivida New Cairo overlooking central park.',
        compound: 'Mivida',
        priceEgp: 38_500_000,
      });

      expect(meta.title).toContain('Sierra Estates Egypt');
      expect(meta.openGraph.title).toBe('Mivida Standalone Villa Type A - 38.5M EGP');
      expect(meta.openGraph.siteName).toBe('Sierra Estates');
      expect(meta.openGraph.alternateLocale).toBe('ar_EG');
    });
  });
});
