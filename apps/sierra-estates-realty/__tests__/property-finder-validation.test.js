/**
 * Tests: lib/property-finder/validation.ts
 *
 * EgyptListingValidator gates what gets pushed to PropertyFinder. A listing
 * that slips through with a bad category/type pair or a missing image is
 * rejected by the upstream API, so each rule is covered here — including the
 * accumulation behaviour (all errors reported at once, not just the first).
 */
import { EgyptListingValidator } from '../lib/property-finder/validation';


/** A minimal listing that passes every rule; tests override single fields. */
function validListing(overrides = {}) {
  return {
    reference: 'SE-HP-VL-04',
    category: 'residential',
    type: 'villa',
    offeringType: 'sale',
    location: { id: 'new-cairo-1' },
    size: 480,
    title: { en: 'Grand Villa in Hyde Park' },
    description: {
      en: 'A spacious five-bedroom villa located in Hyde Park, New Cairo, with a private garden.',
    },
    amenities: ['private-garden', 'security'],
    media: { images: [{ original: { url: 'https://cdn.example.com/1.jpg' } }] },
    price: { type: 'sale', amounts: { sale: 28500000 } },
    ...overrides,
  } ;
}

describe('EgyptListingValidator — happy path', () => {
  it('accepts a fully valid residential listing', () => {
    const result = EgyptListingValidator.validate(validListing());

    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('accepts a valid commercial listing', () => {
    const result = EgyptListingValidator.validate(
      validListing({
        category: 'commercial',
        type: 'office-space',
        amenities: ['covered-parking', 'conference-room'],
      }),
    );

    expect(result.isValid).toBe(true);
  });

  it('accepts a listing with no amenities at all', () => {
    const result = EgyptListingValidator.validate(validListing({ amenities: [] }));

    expect(result.isValid).toBe(true);
  });
});

describe('EgyptListingValidator — required fields', () => {
  it.each([
    ['reference', 'Reference is required.'],
    ['category', 'Category is required (residential or commercial).'],
    ['type', 'Property Type is required.'],
    ['offeringType', 'Offering Type is required (sale or rent).'],
  ])('reports a missing %s', (field, message) => {
    const result = EgyptListingValidator.validate(
      validListing({ [field]: undefined } ),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(message);
  });

  it('reports a missing location id', () => {
    const result = EgyptListingValidator.validate(
      validListing({ location: undefined } ),
    );

    expect(result.errors).toContain('Location ID is required.');
  });

  it.each([[0], [-5], [undefined]])('reports an invalid size: %s', (size) => {
    const result = EgyptListingValidator.validate(
      validListing({ size } ),
    );

    expect(result.errors).toContain('Valid size in sqft is required.');
  });
});

describe('EgyptListingValidator — title and description', () => {
  it('requires an English title of at least 10 characters', () => {
    const message = 'English title is required and must be at least 10 characters.';

    expect(EgyptListingValidator.validate(validListing({ title: { en: 'Short' } })).errors).toContain(
      message,
    );
    expect(
      EgyptListingValidator.validate(validListing({ title: undefined } ))
        .errors,
    ).toContain(message);
  });

  it('accepts a title of exactly 10 characters', () => {
    const result = EgyptListingValidator.validate(validListing({ title: { en: '1234567890' } }));

    expect(result.isValid).toBe(true);
  });

  it('requires an English description of at least 30 characters', () => {
    const message = 'English description is required and must be at least 30 characters.';

    expect(
      EgyptListingValidator.validate(validListing({ description: { en: 'Too short' } })).errors,
    ).toContain(message);
  });

  it('accepts a description of exactly 30 characters', () => {
    const result = EgyptListingValidator.validate(
      validListing({ description: { en: 'x'.repeat(30) } }),
    );

    expect(result.isValid).toBe(true);
  });
});

describe('EgyptListingValidator — category/type compatibility', () => {
  it('rejects a residential-only type used in a commercial listing', () => {
    const result = EgyptListingValidator.validate(
      validListing({ category: 'commercial', type: 'penthouse', amenities: [] }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Property type "penthouse" is not allowed for category "commercial" in Egypt.',
    );
  });

  it('rejects a commercial-only type used in a residential listing', () => {
    const result = EgyptListingValidator.validate(
      validListing({ category: 'residential', type: 'warehouse', amenities: [] }),
    );

    expect(result.errors).toContain(
      'Property type "warehouse" is not allowed for category "residential" in Egypt.',
    );
  });

  it('allows a type valid in both categories', () => {
    const result = EgyptListingValidator.validate(
      validListing({ category: 'commercial', type: 'villa', amenities: ['shared-gym'] }),
    );

    expect(result.isValid).toBe(true);
  });
});

describe('EgyptListingValidator — amenities', () => {
  it('rejects any amenity on a land listing', () => {
    const result = EgyptListingValidator.validate(
      validListing({ type: 'land', amenities: ['security'] }),
    );

    expect(result.errors).toContain('Amenities are not allowed for "land" property type.');
  });

  it('allows a land listing with no amenities', () => {
    const result = EgyptListingValidator.validate(validListing({ type: 'land', amenities: [] }));

    expect(result.isValid).toBe(true);
  });

  it('rejects amenities not permitted for the category', () => {
    const result = EgyptListingValidator.validate(
      validListing({ category: 'commercial', type: 'office-space', amenities: ['private-pool'] }),
    );

    expect(result.errors).toContain(
      'The following amenities are not allowed for commercial listings in Egypt: private-pool',
    );
  });

  it('lists every invalid amenity in one message', () => {
    const result = EgyptListingValidator.validate(
      validListing({
        category: 'commercial',
        type: 'office-space',
        amenities: ['private-pool', 'maids-room', 'covered-parking'],
      }),
    );

    expect(result.errors).toContain(
      'The following amenities are not allowed for commercial listings in Egypt: private-pool, maids-room',
    );
  });
});

describe('EgyptListingValidator — media', () => {
  it('requires at least one image', () => {
    expect(
      EgyptListingValidator.validate(validListing({ media: { images: [] } })).errors,
    ).toContain('At least one image is required.');

    expect(
      EgyptListingValidator.validate(validListing({ media: undefined } ))
        .errors,
    ).toContain('At least one image is required.');
  });

  it('requires at least one image to carry an original URL', () => {
    const result = EgyptListingValidator.validate(
      validListing({ media: { images: [{ original: {} }] } } ),
    );

    expect(result.errors).toContain('At least one image must have a valid original URL.');
  });

  it('accepts a set where only one image has a URL', () => {
    const result = EgyptListingValidator.validate(
      validListing({
        media: {
          images: [{ original: {} }, { original: { url: 'https://cdn.example.com/2.jpg' } }],
        },
      } ),
    );

    expect(result.isValid).toBe(true);
  });
});

describe('EgyptListingValidator — price', () => {
  it('requires price information', () => {
    const result = EgyptListingValidator.validate(
      validListing({ price: undefined } ),
    );

    expect(result.errors).toContain('Price information is required.');
  });

  it('requires the amount matching the price type to be positive', () => {
    const result = EgyptListingValidator.validate(
      validListing({ price: { type: 'sale', amounts: { sale: 0 } } } ),
    );

    expect(result.errors).toContain('Price amount for type "sale" must be greater than 0.');
  });

  it('reports a price type with no matching amount', () => {
    // e.g. type says "rent" but only a sale amount was supplied.
    const result = EgyptListingValidator.validate(
      validListing({ price: { type: 'rent', amounts: { sale: 100 } } } ),
    );

    expect(result.errors).toContain('Price amount for type "rent" must be greater than 0.');
  });
});

describe('EgyptListingValidator — error accumulation', () => {
  it('reports every failure at once rather than stopping at the first', () => {
    const result = EgyptListingValidator.validate({
      amenities: ['private-pool'],
    } );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Reference is required.',
        'Category is required (residential or commercial).',
        'Property Type is required.',
        'Offering Type is required (sale or rent).',
        'Location ID is required.',
        'Valid size in sqft is required.',
        'At least one image is required.',
        'Price information is required.',
      ]),
    );
    expect(result.errors.length).toBeGreaterThanOrEqual(8);
  });
});
