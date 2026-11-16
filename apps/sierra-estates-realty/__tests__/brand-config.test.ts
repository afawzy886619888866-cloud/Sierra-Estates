/**
 * BRAND CONFIGURATION REGRESSION TEST (Phase 1, master execution command)
 *
 * Guards the active display brand: exactly "Sierra Estates". The old blended
 * string "Sierra Blu Realty / Sierra Estates" must never come back into
 * production-facing configuration, while the legal entity name stays
 * truthful and separate.
 */
import { SiteConfig } from '../lib/config';

describe('Active brand configuration', () => {
  it('uses exactly "Sierra Estates" as the active display brand', () => {
    expect(SiteConfig.branding.name).toBe('Sierra Estates');
  });

  it('never re-introduces the blended "Sierra Blu Realty / Sierra Estates" string', () => {
    expect(SiteConfig.branding.name).not.toContain('/');
    expect(SiteConfig.branding.name).not.toContain('Sierra Blu');
  });

  it('keeps the legal entity name separate and truthful (unchanged)', () => {
    expect(SiteConfig.branding.legalName).toBe(
      'Sierra Blu Realty & Sierra Estates Real Estate Investment'
    );
  });
});
