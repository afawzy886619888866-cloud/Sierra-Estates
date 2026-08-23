/**
 * Client Components — Render & Behaviour Suite
 *
 * Covers:
 *  • AddListingForm
 *  • CairoPlazaCalculator
 *  • CairoPlazaRouteShell
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AddListingForm from '../components/client/AddListingForm';
import CairoPlazaCalculator from '../components/client/CairoPlazaCalculator';
import CairoPlazaRouteShell from '../components/client/CairoPlazaRouteShell';

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el);
}

describe('Client Components Suite', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, id: 'SE-TEST-001' }),
    } as Response);
  });

  describe('AddListingForm', () => {
    it('renders without throwing in English', () => {
      expect(() => render(<AddListingForm lang="en" />)).not.toThrow();
    });

    it('renders without throwing in Arabic', () => {
      expect(() => render(<AddListingForm lang="ar" />)).not.toThrow();
    });

    it('renders with default props', () => {
      expect(() => render(<AddListingForm />)).not.toThrow();
    });

    it('contains listing submission fields', () => {
      const html = render(<AddListingForm lang="en" />);
      expect(html).toContain('List your unit with');
      expect(html).toContain('Sierra Estates');
      expect(html).toContain('Compound');
      expect(html).toContain('Submit listing');
    });

    it('contains Arabic copy when lang=ar', () => {
      const html = render(<AddListingForm lang="ar" />);
      expect(html).toContain('سجّل عقارك مع');
    });
  });

  describe('CairoPlazaCalculator', () => {
    it('renders without throwing in English', () => {
      expect(() => render(<CairoPlazaCalculator lang="en" />)).not.toThrow();
    });

    it('renders without throwing in Arabic', () => {
      expect(() => render(<CairoPlazaCalculator lang="ar" />)).not.toThrow();
    });

    it('renders with default props', () => {
      expect(() => render(<CairoPlazaCalculator />)).not.toThrow();
    });

    it('calculates and shows total cost and NOI', () => {
      const html = render(<CairoPlazaCalculator lang="en" />);
      expect(html).toContain('ILLUSTRATIVE CALCULATOR');
      expect(html).toContain('Test an investment-return scenario');
      expect(html).toContain('Purchase price');
      expect(html).toContain('Annual NOI');
    });

    it('displays Arabic calculator labels when lang=ar', () => {
      const html = render(<CairoPlazaCalculator lang="ar" />);
      expect(html).toContain('حاسبة توضيحية');
      expect(html).toContain('سعر الشراء');
    });
  });

  describe('CairoPlazaRouteShell', () => {
    it('renders route shell in English without throwing', () => {
      expect(() => render(<CairoPlazaRouteShell lang="en" section="overview" />)).not.toThrow();
    });

    it('renders in Arabic without throwing', () => {
      expect(() => render(<CairoPlazaRouteShell lang="ar" section="inventory" />)).not.toThrow();
    });
  });
});
