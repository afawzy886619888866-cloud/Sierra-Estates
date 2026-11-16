/**
 * Partner access — client-safe helpers (lib/partner-access.ts).
 * A partner (merged-in property account) sees ONLY Inventory, Ad Listing and
 * CRM. These pure helpers drive the AdminPortal nav filtering.
 */
import {
  PARTNER_NAV_IDS,
  isPartnerRole,
  isTabAllowedForRole,
  navIdsForRole,
} from '../lib/partner-access';

describe('lib/partner-access', () => {
  describe('PARTNER_NAV_IDS', () => {
    it('is exactly the three workspaces a partner may open, in order', () => {
      expect([...PARTNER_NAV_IDS]).toEqual(['inventory_os', 'listings', 'leads']);
    });
  });

  describe('isPartnerRole', () => {
    it('matches the partner role, case-insensitively and trimmed', () => {
      expect(isPartnerRole('partner')).toBe(true);
      expect(isPartnerRole(' Partner ')).toBe(true);
      expect(isPartnerRole('PARTNER')).toBe(true);
    });

    it('rejects every other role and non-strings', () => {
      for (const role of ['admin', 'manager', 'superadmin', 'owner', 'agent', 'viewer', 'client', 'broker', '']) {
        expect(isPartnerRole(role)).toBe(false);
      }
      expect(isPartnerRole(undefined)).toBe(false);
      expect(isPartnerRole(null)).toBe(false);
      expect(isPartnerRole(42)).toBe(false);
    });
  });

  describe('isTabAllowedForRole', () => {
    it('allows a partner only their three tabs', () => {
      expect(isTabAllowedForRole('inventory_os', 'partner')).toBe(true);
      expect(isTabAllowedForRole('listings', 'partner')).toBe(true);
      expect(isTabAllowedForRole('leads', 'partner')).toBe(true);
    });

    it('blocks every staff console for a partner', () => {
      for (const tab of ['overview', 'all_apps', 'security', 'roles', 'settings', 'easy_listing', 'heatmap', 'intelligence', 'whatever-new-tab']) {
        expect(isTabAllowedForRole(tab, 'partner')).toBe(false);
      }
    });

    it('allows every tab to staff and unknown roles', () => {
      expect(isTabAllowedForRole('overview', 'admin')).toBe(true);
      expect(isTabAllowedForRole('anything', 'superadmin')).toBe(true);
      expect(isTabAllowedForRole('anything', null)).toBe(true);
    });
  });

  describe('navIdsForRole', () => {
    const ALL = ['overview', 'inventory_os', 'leads', 'settings', 'listings', 'health'];

    it('keeps the full nav for staff', () => {
      expect(navIdsForRole(ALL, 'admin')).toEqual(ALL);
    });

    it('filters a partner down to their tabs in canonical order', () => {
      // Canonical order must hold even when the input order differs.
      expect(navIdsForRole(ALL, 'partner')).toEqual(['inventory_os', 'listings', 'leads']);
    });

    it('never invents nav ids a partner should not have', () => {
      const result = navIdsForRole(['overview', 'security'], 'partner');
      expect(result).toEqual([]);
    });
  });
});
