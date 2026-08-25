import { mapLeadToSpa, mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';

describe('mapLeadToSpa', () => {
  test('detects a Property Finder lead by the canonical hyphenated source value', () => {
    // Regression guard: admin-spa-mappers used to check for 'property_finder'
    // (underscore) while PFIntegrationService actually writes 'property-finder'
    // (hyphen, matching StakeholderAcquisitionSource) - the isPF special-casing
    // never triggered via `source` for real PF leads, only via the pfLeadId
    // fallback.
    const result = mapLeadToSpa('doc-1', {
      source: 'property-finder',
      phone: '+201000000000',
    });

    expect(result.source).toBe('property-finder');
    expect(result.hot).toBe(true);
    expect(result.color).toBe('#f97316');
  });

  test('does not special-case a lead whose source is unrelated to Property Finder', () => {
    const result = mapLeadToSpa('doc-2', {
      source: 'website',
      name: 'Jane',
      phone: '+201000000000',
    });

    expect(result.source).toBe('website');
    expect(result.hot).toBe(false);
  });

  test('falls back to website when no source is present and there is no pfLeadId', () => {
    const result = mapLeadToSpa('doc-3', { name: 'Jane', phone: '+201000000000' });
    expect(result.source).toBe('website');
  });

  test('still detects Property Finder via pfLeadId even without a matching source', () => {
    const result = mapLeadToSpa('doc-4', { pfLeadId: 'PF-123' });
    expect(result.source).toBe('property-finder');
    expect(result.hot).toBe(true);
  });
});

describe('mapSpaToLeadPatch', () => {
  test('passes through a source override', () => {
    const patch = mapSpaToLeadPatch({ source: 'instagram' });
    expect(patch.source).toBe('instagram');
  });
});
