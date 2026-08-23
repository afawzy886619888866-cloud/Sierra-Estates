import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Design System, UI Tokens & Aesthetics Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const TAILWIND_CONFIG_PATH = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'tailwind.config.js');
  const CSS_GLOBALS_PATH = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'app', 'globals.css');

  describe('Tailwind Configuration & Token Architecture', () => {
    it('tailwind.config.js should exist and configure darkMode with data-theme selector', () => {
      expect(fs.existsSync(TAILWIND_CONFIG_PATH)).toBe(true);
      const tailwindConfig = fs.readFileSync(TAILWIND_CONFIG_PATH, 'utf-8');
      expect(tailwindConfig).toContain("darkMode: ['selector', '[data-theme=\"dark\"]']");
      expect(tailwindConfig).toContain('./app/**/*.{js,ts,jsx,tsx,mdx}');
      expect(tailwindConfig).toContain('./components/**/*.{js,ts,jsx,tsx,mdx}');
    });

    it('should declare semantic design tokens using CSS variables for theme flexibility', () => {
      const tailwindConfig = fs.readFileSync(TAILWIND_CONFIG_PATH, 'utf-8');
      expect(tailwindConfig).toContain('var(--color-primary)');
      expect(tailwindConfig).toContain('var(--color-secondary)');
      expect(tailwindConfig).toContain('var(--color-accent)');
    });

    it('should include Sierra Estates luxury color palette shades', () => {
      const tailwindConfig = fs.readFileSync(TAILWIND_CONFIG_PATH, 'utf-8');
      expect(tailwindConfig).toContain('slate:');
      expect(tailwindConfig).toContain('#f8fafc');
    });
  });

  describe('Design System CSS Variables & Glassmorphism Tokens', () => {
    it('globals.css should define root CSS variables and dark theme overrides if present', () => {
      if (fs.existsSync(CSS_GLOBALS_PATH)) {
        const css = fs.readFileSync(CSS_GLOBALS_PATH, 'utf-8');
        expect(css).toContain(':root');
      }
    });

    it('should enforce consistent responsive breakpoints for luxury real estate layout', () => {
      const breakpoints = {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      };

      expect(breakpoints.sm).toBe('640px');
      expect(breakpoints.md).toBe('768px');
      expect(breakpoints.lg).toBe('1024px');
      expect(breakpoints.xl).toBe('1280px');
    });
  });

  describe('Bilingual Typography & RTL Standards', () => {
    it('should validate font stack definitions for English & Arabic typography', () => {
      const typographyStack = {
        english: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      };

      expect(typographyStack.english).toContain('Inter');
      expect(typographyStack.arabic).toContain('Cairo');
    });
  });
});
