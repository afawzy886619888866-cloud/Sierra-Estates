const { normalizeProperty, parsePrice } = require('../transform');

describe('parsePrice', () => {
  it('passes finite numbers through unchanged', () => {
    expect(parsePrice(4500000)).toBe(4500000);
    expect(parsePrice(1500.5)).toBe(1500.5);
    expect(parsePrice(0)).toBe(0);
  });

  it('parses plain numeric strings', () => {
    expect(parsePrice('250000')).toBe(250000);
    expect(parsePrice('1500.50')).toBe(1500.5);
  });

  it('parses formatted strings with separators and currency symbols', () => {
    // Regression: a bare parseFloat truncated these to the first segment.
    expect(parsePrice('2,000,000')).toBe(2000000);
    expect(parsePrice('EGP 2,500,000')).toBe(2500000);
    expect(parsePrice('$ 750,000')).toBe(750000);
  });

  it('falls back to 0 for unparseable or non-primitive input', () => {
    expect(parsePrice('N/A')).toBe(0);
    expect(parsePrice(undefined)).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice({})).toBe(0);
    expect(parsePrice(NaN)).toBe(0);
  });
});

describe('normalizeProperty', () => {
  it('maps a complete raw payload to the canonical shape', () => {
    expect(
      normalizeProperty({
        title: 'Sea View Villa',
        price: '4,500,000',
        location: 'New Cairo',
        source: 'PropertyFinder',
      })
    ).toEqual({
      title: 'Sea View Villa',
      price: 4500000,
      location: 'New Cairo',
      source: 'PropertyFinder',
      isAvailable: true,
    });
  });

  it('applies safe defaults when fields are missing', () => {
    expect(normalizeProperty({})).toEqual({
      title: 'Untitled Property',
      price: 0,
      location: 'Unknown',
      source: 'Scraper Bot',
      isAvailable: true,
    });
  });

  it('tolerates being called with no argument', () => {
    expect(normalizeProperty().title).toBe('Untitled Property');
  });
});
