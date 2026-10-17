/**
 * lib/server/unit-codes — Sierra Estates 3.0 standard property coding.
 *
 * Canonical formats under test:
 *   Rental ……… SE-RNT-[AREA]-[SERIAL]   / compound form HYD-RNT-014
 *   Sale …………… SE-SL-[AREA]-[SERIAL]    / compound form PK-SL-007
 * Deterministic generation: Compound + Deal Type + serial hash — the same
 * input ALWAYS produces the same code.
 */
import {
  areaCodeForCompound,
  canonicalUnitCode,
  compoundUnitCode,
  dealToken,
  isCanonicalSierraCode,
  normalizeDealType,
  parseSierraUnitCode,
  resolveUnitCode,
  serialForSeed,
} from '../lib/server/unit-codes';

describe('dealToken / normalizeDealType', () => {
  it('maps rentals (EN + AR) to RNT and everything else to SL', () => {
    expect(dealToken('rent')).toBe('RNT');
    expect(dealToken('RENTAL')).toBe('RNT');
    expect(dealToken('إيجار')).toBe('RNT');
    expect(dealToken('sale')).toBe('SL');
    expect(dealToken('resale')).toBe('SL');
    expect(dealToken(undefined)).toBe('SL');
  });

  it('normalizes deal types into the four canonical values', () => {
    expect(normalizeDealType('rent')).toBe('rent');
    expect(normalizeDealType('resale')).toBe('resale');
    expect(normalizeDealType('primary')).toBe('primary');
    expect(normalizeDealType('unknown')).toBe('sale');
  });
});

describe('areaCodeForCompound', () => {
  it('uses the gazetteer for known compounds', () => {
    expect(areaCodeForCompound('Hyde Park')).toBe('HYD');
    expect(areaCodeForCompound('palm hills nc')).toBe('PK');
    expect(areaCodeForCompound('Mivida')).toBe('MVD');
    expect(areaCodeForCompound('Uptown Cairo')).toBe('UPC');
  });

  it('falls back to a deterministic initialism for unknown compounds', () => {
    expect(areaCodeForCompound('Taj City')).toBe('TC');
    expect(areaCodeForCompound('Royal Bueva')).toBe('RB');
    expect(areaCodeForCompound('')).toBe('GCA');
    expect(areaCodeForCompound(null)).toBe('GCA');
  });

  it('is deterministic — same input, same code, always', () => {
    for (let i = 0; i < 25; i++) {
      expect(areaCodeForCompound('Royal Bueva')).toBe(areaCodeForCompound('Royal Bueva'));
    }
  });
});

describe('canonical code builders', () => {
  it('builds the spec rental and sale forms', () => {
    expect(canonicalUnitCode({ compound: 'Hyde Park', dealType: 'rent', serial: 14 })).toBe('SE-RNT-HYD-0014');
    expect(canonicalUnitCode({ compound: 'Palm Hills', dealType: 'sale', serial: 7 })).toBe('SE-SL-PK-0007');
    expect(compoundUnitCode({ compound: 'Hyde Park', dealType: 'rent', serial: 14 })).toBe('HYD-RNT-0014');
    expect(compoundUnitCode({ compound: 'Palm Hills', dealType: 'sale', serial: 7 })).toBe('PK-SL-0007');
  });
});

describe('isCanonicalSierraCode / parseSierraUnitCode', () => {
  it('accepts both canonical forms and rejects legacy/foreign codes', () => {
    expect(isCanonicalSierraCode('SE-RNT-HYD-0014')).toBe(true);
    expect(isCanonicalSierraCode('se-sl-pk-0007')).toBe(true);
    expect(isCanonicalSierraCode('HYD-RNT-032')).toBe(true);
    expect(isCanonicalSierraCode('AUC-SL-101')).toBe(true);
    expect(isCanonicalSierraCode('SE-AUG-LX4Q2K1B')).toBe(false); // legacy intake code
    expect(isCanonicalSierraCode('SE-WA-ABC123')).toBe(false);
    expect(isCanonicalSierraCode('')).toBe(false);
    expect(isCanonicalSierraCode(null)).toBe(false);
  });

  it('parses the parts of a canonical code', () => {
    expect(parseSierraUnitCode('SE-RNT-HYD-0014')).toEqual({
      prefix: 'SE',
      deal: 'RNT',
      area: 'HYD',
      serial: '0014',
    });
    expect(parseSierraUnitCode('PK-SL-007')).toEqual({
      prefix: 'PK',
      deal: 'SL',
      area: 'PK',
      serial: '007',
    });
    expect(parseSierraUnitCode('SE-WA-XYZ')).toBeNull();
  });
});

describe('deterministic serial generation', () => {
  it('produces the same serial for the same compound + dealType + seed', () => {
    const a = serialForSeed('Hyde Park', 'rent', 'photo-album-123');
    const b = serialForSeed('Hyde Park', 'rent', 'photo-album-123');
    expect(a).toBe(b);
  });

  it('varies across compounds, deal types and seeds', () => {
    const serials = new Set([
      serialForSeed('Hyde Park', 'rent', 'seed-1'),
      serialForSeed('Hyde Park', 'sale', 'seed-1'),
      serialForSeed('Mivida', 'rent', 'seed-1'),
      serialForSeed('Hyde Park', 'rent', 'seed-2'),
    ]);
    expect(serials.size).toBeGreaterThan(1);
  });

  it('emits 3–6 digit serials', () => {
    const s = serialForSeed('Hyde Park', 'rent', 'anything');
    expect(s).toMatch(/^\d{3,6}$/);
  });
});

describe('resolveUnitCode', () => {
  it('passes through a valid provided canonical code (normalized)', () => {
    const res = resolveUnitCode({ code: 'se-rnt-hyd-0014', compound: 'Hyde Park', dealType: 'rent' });
    expect(res).toEqual({ code: 'SE-RNT-HYD-0014', generated: false, basedOn: 'provided-canonical' });
  });

  it('generates a deterministic canonical code when the code is missing', () => {
    const unit = {
      compound: 'Hyde Park',
      dealType: 'rent',
      title: 'شقة 3 غرف — دور ثالث',
      contactPhone: '+20 100 123 4567',
      areaSqm: 165,
      price: 25000,
    };
    const first = resolveUnitCode(unit);
    const second = resolveUnitCode(unit);
    expect(first.generated).toBe(true);
    expect(first.basedOn).toBe('deterministic-hash');
    expect(first.code).toMatch(/^SE-RNT-HYD-\d{3,6}$/);
    expect(second.code).toBe(first.code); // idempotent re-ingest
  });

  it('derives deterministically from a legacy code when provided', () => {
    const a = resolveUnitCode({ code: 'SE-AUG-LX4Q2K1B', compound: 'Mivida', dealType: 'sale' });
    const b = resolveUnitCode({ code: 'SE-AUG-LX4Q2K1B', compound: 'Mivida', dealType: 'sale' });
    expect(a.code).toMatch(/^SE-SL-MVD-\d{3,6}$/);
    expect(a.code).toBe(b.code);
  });

  it('honors an explicit seed for repeatable generation', () => {
    const a = resolveUnitCode({ compound: 'Palm Hills', dealType: 'sale', seed: 'album-42' });
    const b = resolveUnitCode({ compound: 'Palm Hills', dealType: 'sale', seed: 'album-42' });
    expect(a.code).toBe(b.code);
    expect(a.code).toMatch(/^SE-SL-PK-\d{3,6}$/);
  });
});
