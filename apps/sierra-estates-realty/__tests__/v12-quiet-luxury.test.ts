/**
 * @file v12-quiet-luxury.test.ts
 * @description Integration and unit tests for Quiet Luxury V12 UI Upgrade
 * under MCD Milestone M15 (ms_f8e65fca5d).
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HomeHero from '../components/site/HomeHero';
import PropertyCard from '../components/site/PropertyCard';
import PropertyDetail from '../app/(site)/property/[id]/PropertyDetail';
import WhatsAppConciergeFloating from '../components/site/WhatsAppConciergeFloating';

// Mock site context
jest.mock('@/lib/site/SiteContext', () => ({
  useSite: () => ({
    t: (key: string) => key,
    isAr: false,
    lang: 'en',
    currency: 'EGP',
    convertPrice: (p: number) => p,
    formatPrice: (p: number) => `${p} EGP`,
  }),
}));

// Mock router / navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Quiet Luxury V12.0 UI Upgrade (Milestone M15)', () => {
  describe('1. HomeHero Parallax & Ambient Spotlight (M15-C01)', () => {
    it('renders hero container with ambient spotlight overlay and laser badge', () => {
      const html = renderToStaticMarkup(React.createElement(HomeHero));

      expect(html).toContain('hero');
      expect(html).toContain('laser-badge');
      expect(html).toContain('radial-gradient');
      expect(html).toContain('AI LASER RADAR');
    });
  });

  describe('2. Magazine-Layout Inventory Grid with Price/m² (M15-C02)', () => {
    const mockListing = {
      id: 101,
      code: 'SE-TEST-001',
      cmp: 'Mivida',
      zone: 'Fifth Settlement',
      type: 'Apartment',
      beds: 3,
      bath: 2,
      area: 200,
      egpM: 10, // 10 Million EGP -> 50,000 EGP/m²
      usd: 200000,
      ai: 9.2,
      tag: 'Verified',
      mode: 'sale',
      agent: 'Karim Mostafa',
      ago: '2 hours ago',
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
    };

    it('renders price per square meter financial metric in PropertyCard', () => {
      const html = renderToStaticMarkup(React.createElement(PropertyCard, { p: mockListing }));

      expect(html).toContain('spec-sqm');
      expect(html).toContain('50,000');
      expect(html).toContain('EGP/m²');
      expect(html).toContain('Mivida');
      expect(html).toContain('SE-TEST-001');
    });
  });

  describe('3. Full-Bleed Property Showcase & Sticky ROI Calculator (M15-C03)', () => {
    it('renders Price/m² spec and Net Cap Rate inside PropertyDetail', () => {
      // Mock listing ID from data
      const html = renderToStaticMarkup(React.createElement(PropertyDetail, { id: '1' }));

      expect(html).toContain('Price / m²');
      expect(html).toContain('Net Cap Rate / Yield');
      expect(html).toContain('Add to VIP Viewing Basket');
      expect(html).toContain('Mortgage &amp; Investment Yield Analyzer');
    });
  });

  describe('4. Leila Concierge Selection Gallery & Tour Dispatcher (M15-C04)', () => {
    it('renders Leila VIP concierge floating drawer with instant messaging options', () => {
      const html = renderToStaticMarkup(React.createElement(WhatsAppConciergeFloating));

      expect(html).toContain('wa-floating-container');
      expect(html).toContain('Open WhatsApp VIP Concierge');
    });
  });
});
