/* cspell:disable */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ECO_SMART_TAGS,
  extractEcoSmartTags,
  getEcoSmartTagMeta,
  normalizeRow,
} from '../lib/services/listing-normalize';
import PropertyCard, { CardListing } from '../components/site/PropertyCard';

// Mock useSite
jest.mock('../lib/site/SiteContext', () => ({
  useSite: () => ({
    lang: 'en',
    isAr: false,
    t: (key: string) => key,
  }),
}));

describe('Phase 3: Eco / Smart Compound Tags Suite', () => {
  describe('1. Tag Taxonomy & Metadata', () => {
    it('defines the 6 canonical eco/smart compound tags with bilingual metadata', () => {
      expect(ECO_SMART_TAGS.length).toBe(6);
      const ids = ECO_SMART_TAGS.map((t) => t.id);
      expect(ids).toContain('solar_powered');
      expect(ids).toContain('smart_home');
      expect(ids).toContain('ev_charging');
      expect(ids).toContain('green_building');
      expect(ids).toContain('water_recycling');
      expect(ids).toContain('energy_efficient');

      // Verify each has both Arabic and English labels
      for (const tag of ECO_SMART_TAGS) {
        expect(tag.labelEn).toBeTruthy();
        expect(tag.labelAr).toBeTruthy();
        expect(['eco', 'smart']).toContain(tag.category);
      }
    });

    it('retrieves tag metadata by id via getEcoSmartTagMeta', () => {
      const solar = getEcoSmartTagMeta('solar_powered');
      expect(solar).toBeDefined();
      expect(solar?.labelEn).toBe('Solar Powered');
      expect(solar?.labelAr).toBe('طاقة شمسية');

      const unknown = getEcoSmartTagMeta('non_existent');
      expect(unknown).toBeUndefined();
    });
  });

  describe('2. Text Extraction & Normalization', () => {
    it('extracts English eco and smart tags from free-text descriptions', () => {
      const text = 'Luxury standalone villa with solar panels and smart home automation in Mivida with EV charging station.';
      const tags = extractEcoSmartTags(text);
      expect(tags).toContain('solar_powered');
      expect(tags).toContain('smart_home');
      expect(tags).toContain('ev_charging');
    });

    it('extracts Arabic eco and smart tags from free-text descriptions', () => {
      const text = 'شقة راقية في كمبوند مستدام مزودة بنظام طاقة شمسية وشاحن سيارة كهربائية مع تدوير مياه لري الحدائق.';
      const tags = extractEcoSmartTags(text);
      expect(tags).toContain('solar_powered');
      expect(tags).toContain('ev_charging');
      expect(tags).toContain('green_building');
      expect(tags).toContain('water_recycling');
    });

    it('returns empty array when text has no eco or smart keywords', () => {
      const text = 'Apartment 150m for sale in New Cairo 3 bedrooms 2 bathrooms core & shell.';
      const tags = extractEcoSmartTags(text);
      expect(tags).toEqual([]);
    });

    it('populates unit.tags during normalizeRow', () => {
      const row = {
        Compound: 'Mountain View iCity',
        Price: '12,500,000',
        Area: '220',
        Bedrooms: '3',
        Bathrooms: '3',
        Comment: 'Smart home villa with solar powered roof and LEED green building certification.',
      };
      const unit = normalizeRow(row);
      expect(unit.tags).toBeDefined();
      expect(unit.tags).toContain('smart_home');
      expect(unit.tags).toContain('solar_powered');
      expect(unit.tags).toContain('green_building');
    });
  });

  describe('3. PropertyCard Filter Chips Rendering [UI]', () => {
    const mockListing: CardListing = {
      id: 'L-101',
      code: 'SE-ECO-01',
      cmp: 'Mivida',
      zone: 'Fifth Settlement',
      type: 'Standalone Villa',
      beds: 4,
      bath: 4,
      area: 350,
      egpM: 25.5,
      usd: 520000,
      ai: 9.4,
      tag: 'Eco Luxury',
      mode: 'sale',
      agent: 'Sierra Advisor Desk',
      ago: 'Today',
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      price: 25500000,
      tags: ['solar_powered', 'smart_home'],
    };

    it('renders eco & smart filter chips in showcase variant', () => {
      const html = renderToStaticMarkup(React.createElement(PropertyCard, { p: mockListing, variant: 'showcase' }));
      expect(html).toContain('eco-tags-chips');
      expect(html).toContain('Solar Powered');
      expect(html).toContain('Smart Home Automation');
    });

    it('renders eco & smart filter chips in compact variant', () => {
      const html = renderToStaticMarkup(React.createElement(PropertyCard, { p: mockListing, variant: 'compact' }));
      expect(html).toContain('eco-tags-chips');
      expect(html).toContain('Solar Powered');
    });

    it('renders eco & smart filter chips in bento variant', () => {
      const html = renderToStaticMarkup(React.createElement(PropertyCard, { p: mockListing, variant: 'bento' }));
      expect(html).toContain('eco-tags-chips');
      expect(html).toContain('Solar Powered');
    });
  });
});
