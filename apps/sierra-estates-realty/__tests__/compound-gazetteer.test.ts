/**
 * lib/server/compound-gazetteer — map-pin coordinate gazetteer contract
 * (Sierra Estates 3.0, Phase 2.4 extension).
 *
 * Contract under test:
 *  - exact English / Arabic matches resolve to the shipped GPS coordinates;
 *  - forward containment ('hyde park new cairo phase 2' → Hyde Park);
 *  - reverse containment is FORBIDDEN for verified compounds ('new cairo'
 *    must NOT pin to 'Palm Hills New Cairo');
 *  - district-level queries fall back to the explicitly unverified district
 *    centroids, carrying verified:false so callers label the pin honestly;
 *  - unknown compounds → null (never an invented coordinate);
 *  - every gazetteer entry holds sane, finite, Egypt-region coordinates and
 *    a unique code.
 */
import {
  lookupCompoundCoordinate,
  gazetteerEntryCount,
  verifiedGazetteerEntries,
} from '../lib/server/compound-gazetteer';
import { NEW_CAIRO_COMPOUNDS } from '../components/Maps/compounds-data';
import { resolveLocation } from '../lib/inventory/gazetteer';

describe('lookupCompoundCoordinate — exact matches', () => {
  it('resolves Hyde Park by English name (case-insensitive)', () => {
    const hit = lookupCompoundCoordinate('  hyde park ');
    expect(hit).not.toBeNull();
    expect(hit?.code).toBe('HP');
    expect(hit?.verified).toBe(true);
    expect(hit?.lat).toBeCloseTo(30.008);
    expect(hit?.lng).toBeCloseTo(31.645);
  });

  it('resolves compounds by their Arabic name', () => {
    const hit = lookupCompoundCoordinate('ميفيدا');
    expect(hit?.name).toBe('Mivida');
    expect(hit?.verified).toBe(true);
  });

  it('resolves Arabic compound names with different casing/spacing', () => {
    const hit = lookupCompoundCoordinate('هايد بارك');
    expect(hit?.code).toBe('HP');
  });
});

describe('lookupCompoundCoordinate — containment rules', () => {
  it('forward containment: a longer query containing the compound name resolves', () => {
    const hit = lookupCompoundCoordinate('Hyde Park New Cairo Phase 2 Villa');
    expect(hit?.code).toBe('HP');
  });

  it('reverse containment is forbidden: "new cairo" never pins to Palm Hills New Cairo', () => {
    // 'new cairo' ⊂ 'Palm Hills New Cairo' — that match must be rejected.
    const hit = lookupCompoundCoordinate('new cairo');
    expect(hit?.code).not.toBe('PH');
    // It resolves to the explicitly district-level fallback instead…
    expect(hit?.verified).toBe(false);
    expect(hit?.name).toBe('General New Cairo Area (Unspecified Sector)');
  });

  it('vague district names resolve to the district centroid, flagged unverified', () => {
    const narges = lookupCompoundCoordinate('narges');
    expect(narges?.verified).toBe(false);
    expect(narges?.name).toBe('El Narges & Choueifat Area');
  });

  it('Arabic district name resolves to the district centroid', () => {
    const hit = lookupCompoundCoordinate('القاهرة الجديدة');
    expect(hit?.verified).toBe(false);
  });
});

describe('lookupCompoundCoordinate — honest misses', () => {
  it('returns null for a genuinely unknown compound', () => {
    expect(lookupCompoundCoordinate('Unknown Estates')).toBeNull();
    expect(lookupCompoundCoordinate('Some Random Tower')).toBeNull();
  });

  it('returns null for empty / whitespace / nullish input', () => {
    expect(lookupCompoundCoordinate('')).toBeNull();
    expect(lookupCompoundCoordinate('   ')).toBeNull();
    expect(lookupCompoundCoordinate(null)).toBeNull();
    expect(lookupCompoundCoordinate(undefined)).toBeNull();
  });

  it('does not invent a pin for a near-miss query that is not a containment', () => {
    expect(lookupCompoundCoordinate('Hyde Parc')).toBeNull();
    expect(lookupCompoundCoordinate('Mivid')).toBeNull();
    expect(lookupCompoundCoordinate('Cairo Festival')).toBeNull();
  });

  it('still fuzzy-matches a query that fully contains a compound name (typo tolerance)', () => {
    // 'Mividaa Residence' contains 'mivida' — an honest forward-containment hit.
    expect(lookupCompoundCoordinate('Mividaa Residence')?.code).toBe('MIV');
  });
});

describe('gazetteer data integrity', () => {
  it('every entry carries finite coordinates inside the Greater Cairo region', () => {
    for (const entry of NEW_CAIRO_COMPOUNDS) {
      expect(Number.isFinite(entry.lat)).toBe(true);
      expect(Number.isFinite(entry.lng)).toBe(true);
      // Greater Cairo / Nile delta region — coarse sanity bounds.
      expect(entry.lat).toBeGreaterThan(29.5);
      expect(entry.lat).toBeLessThan(30.6);
      expect(entry.lng).toBeGreaterThan(30.5);
      expect(entry.lng).toBeLessThan(31.9);
    }
  });

  it('every entry code is unique', () => {
    const codes = NEW_CAIRO_COMPOUNDS.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('counts verified vs district-level entries consistently', () => {
    const counts = gazetteerEntryCount();
    expect(counts.verified).toBe(NEW_CAIRO_COMPOUNDS.filter((c) => c.isGpsVerified).length);
    expect(counts.districtLevel).toBe(NEW_CAIRO_COMPOUNDS.filter((c) => !c.isGpsVerified).length);
    expect(counts.verified).toBeGreaterThan(30);
    expect(counts.districtLevel).toBe(2);
  });

  it('verifiedGazetteerEntries returns only GPS-verified entries', () => {
    const verified = verifiedGazetteerEntries();
    expect(verified.length).toBe(gazetteerEntryCount().verified);
    expect(verified.every((e) => e.isGpsVerified === true)).toBe(true);
  });

  it('covers the core New Cairo portfolio compounds used by the pipeline', () => {
    for (const compound of [
      'Hyde Park',
      'Palm Hills New Cairo',
      'Mivida',
      'Mountain View iCity',
      'Madinaty',
      'Cairo Festival City',
      'Villette',
      'Eastown',
      'Taj City',
      'Al Rehab',
    ]) {
      expect(lookupCompoundCoordinate(compound)?.name).toBeTruthy();
    }
  });
});

describe('cross-dataset consistency — public map gazetteer (lib/inventory/gazetteer)', () => {
  it('every GPS-verified compound resolves a non-approx public map pin', () => {
    // The public inventory map (resolveLocation) used to miss Cairo Plaza;
    // this guard keeps every verified compound pinned on BOTH gazetteers.
    const unpinned = NEW_CAIRO_COMPOUNDS
      .filter((c) => c.isGpsVerified)
      .filter((c) => resolveLocation(c.nameEn).approx)
      .map((c) => c.nameEn);
    expect(unpinned).toEqual([]);
  });

  it('Cairo Plaza pins to its El-Mataria coordinates (not the New Cairo centroid)', () => {
    const resolved = resolveLocation('Cairo Plaza');
    expect(resolved.approx).toBe(false);
    expect(resolved.label).toBe('Cairo Plaza');
    expect(resolved.zone).toBe('El-Mataria');
    expect(resolved.lat).toBeCloseTo(30.129);
    expect(resolved.lng).toBeCloseTo(31.312);
  });
});
