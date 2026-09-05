/**
 * Tests: lib/format.ts — currency / area / score / relative-time formatting.
 *
 * These run under a fixed clock where relative time is involved, so the
 * boundary cases (59m vs 1h, 6d vs 1w, 3w vs absolute date) are deterministic
 * rather than dependent on when the suite happens to run.
 */
import {
  fmtUSD,
  fmtEGP,
  fmtEGPM,
  fmtArea,
  fmtScore,
  fmtRelative,
  fmtDate,
  fmtDateTime,
  fmtPercent,
  fmtYield,
  fmtPaybackYears,
} from '../lib/format';

describe('currency formatting', () => {
  it('formats USD with no fraction digits', () => {
    expect(fmtUSD(1234567)).toBe('$1,234,567');
  });

  it('rounds USD fractions away', () => {
    expect(fmtUSD(1234.89)).toBe('$1,235');
  });

  it('formats zero and negative USD', () => {
    expect(fmtUSD(0)).toBe('$0');
    expect(fmtUSD(-500)).toBe('-$500');
  });

  it('formats EGP', () => {
    expect(fmtEGP(28500000)).toContain('28,500,000');
  });

  it('formats EGP per square metre in thousands', () => {
    expect(fmtEGPM(52.35)).toBe('52.4K EGP/m²');
    expect(fmtEGPM(1000)).toBe('1,000K EGP/m²');
  });
});

describe('fmtArea', () => {
  it('formats area with a thousands separator and unit', () => {
    expect(fmtArea(480)).toBe('480 m²');
    expect(fmtArea(1250)).toBe('1,250 m²');
  });
});

describe('fmtScore', () => {
  it('renders one decimal place', () => {
    expect(fmtScore(9)).toBe('9.0');
    expect(fmtScore(8.44)).toBe('8.4');
    expect(fmtScore(8.46)).toBe('8.5');
  });

  it('rounds half-way values per toFixed, which is binary-float dependent', () => {
    // 8.45 has no exact binary representation and lands just below the
    // half-way point, so toFixed(1) yields "8.4", not "8.5". Pinned so a
    // future switch to a decimal-rounding helper is a visible change.
    expect(fmtScore(8.45)).toBe('8.4');
    expect(fmtScore(8.55)).toBe('8.6');
  });

  it('falls back to "0.0" for null and undefined', () => {
    expect(fmtScore(null)).toBe('0.0');
    expect(fmtScore(undefined)).toBe('0.0');
  });

  it('does not treat 0 as missing', () => {
    expect(fmtScore(0)).toBe('0.0');
  });
});

describe('fmtPercent', () => {
  it('defaults to one decimal place', () => {
    expect(fmtPercent(12.34)).toBe('12.3%');
  });

  it('honours an explicit digit count', () => {
    expect(fmtPercent(12.345, 2)).toBe('12.35%');
    expect(fmtPercent(12.9, 0)).toBe('13%');
  });

  it('falls back to "0%" for null and undefined', () => {
    expect(fmtPercent(null)).toBe('0%');
    expect(fmtPercent(undefined)).toBe('0%');
  });

  it('does not treat 0 as missing', () => {
    expect(fmtPercent(0)).toBe('0.0%');
  });
});

describe('fmtYield', () => {
  it('computes gross yield as a percentage', () => {
    expect(fmtYield(120000, 1200000)).toBe(10);
  });

  it('returns 0 when price is zero, rather than dividing by zero', () => {
    expect(fmtYield(120000, 0)).toBe(0);
    expect(Number.isFinite(fmtYield(120000, 0))).toBe(true);
  });
});

describe('fmtPaybackYears', () => {
  it('computes payback period in years', () => {
    expect(fmtPaybackYears(100000, 1000000)).toBe(10);
  });

  it('returns 0 when annual rent is zero, rather than dividing by zero', () => {
    expect(fmtPaybackYears(0, 1000000)).toBe(0);
    expect(Number.isFinite(fmtPaybackYears(0, 1000000))).toBe(true);
  });
});

describe('fmtRelative', () => {
  const NOW = new Date('2026-08-15T12:00:00.000Z').getTime();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** ISO string for `ms` milliseconds before the frozen now. */
  const ago = (ms) => new Date(NOW - ms).toISOString();

  const MIN = 60000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('renders sub-minute ages as "just now"', () => {
    expect(fmtRelative(ago(0))).toBe('just now');
    expect(fmtRelative(ago(59000))).toBe('just now');
  });

  it('renders minutes up to the hour boundary', () => {
    expect(fmtRelative(ago(MIN))).toBe('1m ago');
    expect(fmtRelative(ago(59 * MIN))).toBe('59m ago');
  });

  it('renders hours up to the day boundary', () => {
    expect(fmtRelative(ago(HOUR))).toBe('1h ago');
    expect(fmtRelative(ago(23 * HOUR))).toBe('23h ago');
  });

  it('renders days up to the week boundary', () => {
    expect(fmtRelative(ago(DAY))).toBe('1d ago');
    expect(fmtRelative(ago(6 * DAY))).toBe('6d ago');
  });

  it('renders weeks up to four weeks', () => {
    expect(fmtRelative(ago(7 * DAY))).toBe('1w ago');
    expect(fmtRelative(ago(27 * DAY))).toBe('3w ago');
  });

  it('falls back to an absolute date at four weeks and beyond', () => {
    expect(fmtRelative(ago(28 * DAY))).toBe('Jul 18');
  });
});

describe('fmtDate / fmtDateTime', () => {
  it('formats an ISO date', () => {
    expect(fmtDate('2026-08-15T12:00:00.000Z')).toBe('Aug 15, 2026');
  });

  it('formats an ISO date-time including hour and minute', () => {
    const out = fmtDateTime('2026-08-15T12:00:00.000Z');
    expect(out).toContain('Aug 15, 2026');
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});
