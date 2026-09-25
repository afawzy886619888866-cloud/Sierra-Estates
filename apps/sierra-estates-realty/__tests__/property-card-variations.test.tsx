import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PropertyCard, { CardListing } from '../components/site/PropertyCard';

// Mock site context
jest.mock('@/lib/site/SiteContext', () => ({
  useSite: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        modeRent: 'Rent',
        modeSale: 'Sale',
        beds: 'Beds',
        baths: 'Baths',
      };
      return dict[key] || key;
    },
    isAr: false,
    currency: 'EGP',
    setCurrency: jest.fn(),
  }),
}));

const mockListing: CardListing = {
  id: 888,
  code: 'SE-LUX-888',
  cmp: 'Mivida',
  zone: 'Golden Square',
  type: 'Villa',
  beds: 4,
  bath: 4,
  area: 320,
  egpM: 25.6,
  usd: 520000,
  ai: 9.8,
  tag: 'Exclusive',
  mode: 'sale',
  agent: 'Yasmine Mansour',
  ago: 'Just now',
  img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  yield: 9.1,
};

describe('PropertyCard Variations Suite', () => {
  it('renders default signature showcase variation correctly', () => {
    const html = renderToStaticMarkup(<PropertyCard p={mockListing} />);
    expect(html).toContain('SE-LUX-888');
    expect(html).toContain('Mivida');
    expect(html).toContain('Golden Square');
    expect(html).toContain('Exclusive');
    expect(html).toContain('AI 9.8');
    expect(html).toContain('spec-sqm');
    expect(html).toContain('80,000');
    expect(html).toContain('EGP/m²');
    expect(html).toContain('href="/property/888"');
  });

  it('renders compact executive horizontal variation', () => {
    const html = renderToStaticMarkup(<PropertyCard p={mockListing} variant="compact" />);
    expect(html).toContain('pcard-compact');
    expect(html).toContain('SE-LUX-888');
    expect(html).toContain('Mivida');
    expect(html).toContain('Villa in Mivida');
    expect(html).toContain('80,000');
    expect(html).toContain('spec-sqm');
    expect(html).toContain('Details');
    expect(html).toContain('href="/property/888"');
  });

  it('renders financial bento investor variation with cap rate and payback metrics', () => {
    const html = renderToStaticMarkup(<PropertyCard p={mockListing} variant="bento" />);
    expect(html).toContain('pcard-bento');
    expect(html).toContain('9.1% Yield');
    expect(html).toContain('Net Cap Rate');
    expect(html).toContain('Est. Payback');
    expect(html).toContain('Underpriced (-6%)');
    expect(html).toContain('spec-sqm');
    expect(html).toContain('80,000');
    expect(html).toContain('Analyze Deal');
    expect(html).toContain('href="/property/888"');
  });

  it('renders architectural quiet luxury editorial variation', () => {
    const html = renderToStaticMarkup(<PropertyCard p={mockListing} variant="editorial" />);
    expect(html).toContain('pcard-editorial');
    expect(html).toContain('SE-LUX-888');
    expect(html).toContain('Mivida');
    expect(html).toContain('specs-editorial');
    expect(html).toContain('320 m²');
    expect(html).toContain('80,000 EGP/m²');
    expect(html).toContain('href="/property/888"');
  });
});
