/**
 * Site Components — Render & Behaviour Suite
 *
 * Covers:
 *  • CurrencyGoldSelector
 *  • PropertyCard
 *  • VirtualTourBanner
 *  • WhatsAppConciergeFloating
 *  • SiteFooter
 *  • SocialIcons
 *  • AiIcons
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CurrencyGoldSelector } from '../components/site/CurrencyGoldSelector';
import PropertyCard, { CardListing } from '../components/site/PropertyCard';
import VirtualTourBanner from '../components/site/VirtualTourBanner';
import WhatsAppConciergeFloating from '../components/site/WhatsAppConciergeFloating';
import SiteFooter from '../components/site/SiteFooter';
import { Facebook, Instagram, Linkedin, Twitter } from '../components/site/SocialIcons';
import { AI_ICONS } from '../components/site/AiIcons';
import { SiteProvider } from '../lib/site/SiteContext';

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(<SiteProvider>{el}</SiteProvider>);
}

const sampleListing: CardListing = {
  id: 101,
  code: 'SE-HYP-001',
  cmp: 'Hyde Park',
  zone: 'Golden Square',
  type: 'Villa',
  beds: 5,
  bath: 6,
  area: 450,
  egpM: 35,
  usd: 700000,
  ai: 9.6,
  tag: 'Featured',
  mode: 'sale',
  agent: 'Karim Mansour',
  ago: '2h ago',
  img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
};

describe('Site Components Suite', () => {
  describe('CurrencyGoldSelector', () => {
    it('renders without throwing', () => {
      expect(() => render(<CurrencyGoldSelector basePriceEGP={15000000} />)).not.toThrow();
    });

    it('displays base price in EGP by default', () => {
      const html = render(<CurrencyGoldSelector basePriceEGP={15000000} />);
      expect(html).toContain('15,000,000 EGP');
    });

    it('contains currency selection buttons', () => {
      const html = render(<CurrencyGoldSelector basePriceEGP={15000000} />);
      expect(html).toContain('EGP');
      expect(html).toContain('USD');
      expect(html).toContain('AED');
      expect(html).toContain('Gold');
    });
  });

  describe('PropertyCard', () => {
    it('renders property card with correct details', () => {
      const html = render(<PropertyCard p={sampleListing} />);
      expect(html).toContain('SE-HYP-001');
      expect(html).toContain('Hyde Park');
      expect(html).toContain('Golden Square');
      expect(html).toContain('AI 9.6');
      expect(html).toContain('Featured');
    });

    it('links to the correct property page', () => {
      const html = render(<PropertyCard p={sampleListing} />);
      expect(html).toContain('href="/property/101"');
    });
  });

  describe('VirtualTourBanner', () => {
    it('renders without throwing', () => {
      expect(() => render(<VirtualTourBanner />)).not.toThrow();
    });

    it('contains 3D tour features pills', () => {
      const html = render(<VirtualTourBanner />);
      expect(html).toContain('4K HDR Cinema');
      expect(html).toContain('VR Compatible');
    });
  });

  describe('WhatsAppConciergeFloating', () => {
    it('renders without throwing', () => {
      expect(() => render(<WhatsAppConciergeFloating />)).not.toThrow();
    });
  });

  describe('SiteFooter', () => {
    it('renders footer without throwing', () => {
      expect(() => render(<SiteFooter />)).not.toThrow();
    });

    it('contains Sierra Estates brand name', () => {
      const html = render(<SiteFooter />);
      expect(html).toContain('Sierra Estates');
    });
  });

  describe('Social & AI Icons', () => {
    it('renders Facebook, Instagram, Linkedin, and Twitter SVG icons', () => {
      expect(render(<Facebook />)).toContain('<svg');
      expect(render(<Instagram />)).toContain('<svg');
      expect(render(<Linkedin />)).toContain('<svg');
      expect(render(<Twitter />)).toContain('<svg');
    });

    it('renders AI Icons map elements', () => {
      expect(render(AI_ICONS.engine)).toContain('<svg');
      expect(render(AI_ICONS.match)).toContain('<svg');
      expect(render(AI_ICONS.roi)).toContain('<svg');
    });
  });
});
