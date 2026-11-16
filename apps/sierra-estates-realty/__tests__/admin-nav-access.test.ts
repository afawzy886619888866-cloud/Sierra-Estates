/**
 * lib/admin-nav-access — permission-driven Admin Portal navigation gating
 * (Sierra Estates 3.0, Phase 1).
 *
 * Contract under test:
 *  - Default-deny: unmapped tabs are denied for every role.
 *  - The spec's per-role tab matrix holds (superadmin/admin broad, ops and
 *    inventory managers get the operations toolchain, marketing gets the
 *    campaigns/brochure/analytics set, sales agents get CRM + viewings +
 *    negotiation simulator + view-only inventory, viewer is read-only).
 *  - Partners keep their canonical three-workspace scope.
 */
import {
  NAV_REQUIRED_PERMISSIONS,
  isNavTabAllowedForRole,
  navItemsForRole,
  navRequiredPermissionsFor,
} from '../lib/admin-nav-access';
import { NAV_ITEMS } from '../app/admin/views/data-constants';
import { ROLE_PERMISSIONS, ADMIN_PORTAL_ROLES } from '../lib/types';

const T = (key: string) => key;

describe('lib/admin-nav-access — NAV_REQUIRED_PERMISSIONS map', () => {
  it('maps every sidebar nav item to at least one permission', () => {
    const navIds = NAV_ITEMS(T).map((n) => n.id);
    for (const id of navIds) {
      expect(NAV_REQUIRED_PERMISSIONS[id]).toBeDefined();
      expect(NAV_REQUIRED_PERMISSIONS[id].length).toBeGreaterThan(0);
    }
  });

  it('only references permissions that exist in the ROLE_PERMISSIONS vocabulary', () => {
    const vocabulary = new Set<string>();
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      for (const p of perms) vocabulary.add(p);
    }
    for (const perms of Object.values(NAV_REQUIRED_PERMISSIONS)) {
      for (const p of perms) {
        expect(vocabulary.has(p)).toBe(true);
      }
    }
  });
});

describe('lib/admin-nav-access — isNavTabAllowedForRole (default-deny)', () => {
  it('denies unmapped tabs for every role, including superadmin', () => {
    for (const role of ['superadmin', 'admin', 'viewer', 'partner']) {
      expect(isNavTabAllowedForRole('brand-new-unmapped-tab', role)).toBe(false);
    }
  });

  it('denies everything when the role is unresolved or garbage', () => {
    expect(isNavTabAllowedForRole('overview', null)).toBe(false);
    expect(isNavTabAllowedForRole('overview', undefined)).toBe(false);
    expect(isNavTabAllowedForRole('overview', 42)).toBe(false);
    expect(isNavTabAllowedForRole('overview', 'not-a-role')).toBe(false);
  });

  it('resolves switch() aliases to their canonical nav permission', () => {
    expect(isNavTabAllowedForRole('dashboard', 'viewer')).toBe(true);
    expect(isNavTabAllowedForRole('whatsapp_sender', 'marketing_manager')).toBe(true);
    expect(isNavTabAllowedForRole('deepseek', 'operations_manager')).toBe(true);
    expect(isNavTabAllowedForRole('whatsapp_sender', 'sales_agent')).toBe(false);
  });
});

describe('lib/admin-nav-access — spec role matrix', () => {
  it('gives superadmin and admin every mapped tab except superadmin-only approvals for admin', () => {
    for (const id of Object.keys(NAV_REQUIRED_PERMISSIONS)) {
      expect(isNavTabAllowedForRole(id, 'superadmin')).toBe(true);
    }
    // Admin lacks access:approve — the approvals queue is superadmin-only.
    expect(isNavTabAllowedForRole('access_approvals', 'superadmin')).toBe(true);
    expect(isNavTabAllowedForRole('access_approvals', 'admin')).toBe(false);
  });

  it('gives operations & inventory managers the operations toolchain', () => {
    for (const role of ['operations_manager', 'inventory_manager']) {
      for (const id of ['inventory_command', 'easy_listing', 'excel_merger', 'viewings', 'real_estate_processor']) {
        expect(isNavTabAllowedForRole(id, role)).toBe(true);
      }
      // Mutating security/user consoles stay out of reach.
      expect(isNavTabAllowedForRole('settings', role)).toBe(false);
      expect(isNavTabAllowedForRole('access_approvals', role)).toBe(false);
    }
  });

  it('gives the marketing manager campaigns, brochure (curator), reports and deep insights', () => {
    for (const id of ['whatsapp_outreach', 'curator', 'reports', 'deep_insights']) {
      expect(isNavTabAllowedForRole(id, 'marketing_manager')).toBe(true);
    }
    // No inventory write, no settings, no approvals.
    expect(isNavTabAllowedForRole('easy_listing', 'marketing_manager')).toBe(false);
    expect(isNavTabAllowedForRole('settings', 'marketing_manager')).toBe(false);
    expect(isNavTabAllowedForRole('access_approvals', 'marketing_manager')).toBe(false);
  });

  it('gives sales agents leads, viewings, the negotiation simulator (closer) and view-only inventory', () => {
    for (const role of ['sales_agent', 'agent']) {
      for (const id of ['leads', 'viewings', 'closer', 'inventory_os', 'listings', 'overview']) {
        expect(isNavTabAllowedForRole(id, role)).toBe(true);
      }
      // Inventory mutation + management consoles stay out of reach.
      expect(isNavTabAllowedForRole('inventory_command', role)).toBe(false);
      expect(isNavTabAllowedForRole('easy_listing', role)).toBe(false);
      expect(isNavTabAllowedForRole('settings', role)).toBe(false);
      expect(isNavTabAllowedForRole('roles', role)).toBe(false);
    }
  });

  it('restricts viewer to read-only dashboards and the inventory overview', () => {
    for (const id of ['overview', 'inventory_os', 'listings', 'masterplan_gis', 'heatmap']) {
      expect(isNavTabAllowedForRole(id, 'viewer')).toBe(true);
    }
    // Nothing that writes or administers.
    for (const id of ['inventory_command', 'easy_listing', 'excel_merger', 'real_estate_processor', 'leads', 'settings', 'roles', 'access_approvals', 'security', 'curator']) {
      expect(isNavTabAllowedForRole(id, 'viewer')).toBe(false);
    }
  });

  it('keeps partners on their three canonical workspaces only', () => {
    expect(isNavTabAllowedForRole('inventory_os', 'partner')).toBe(true);
    expect(isNavTabAllowedForRole('listings', 'partner')).toBe(true);
    expect(isNavTabAllowedForRole('leads', 'partner')).toBe(true);
    expect(isNavTabAllowedForRole('overview', 'partner')).toBe(false);
    expect(isNavTabAllowedForRole('access_approvals', 'partner')).toBe(false);
  });
});

describe('lib/admin-nav-access — navItemsForRole filtering', () => {
  it('filters the real NAV_ITEMS list per role and preserves order', () => {
    const all = NAV_ITEMS(T);
    const viewerNav = navItemsForRole(all, 'viewer');
    expect(viewerNav.length).toBeGreaterThan(0);
    expect(viewerNav.length).toBeLessThan(all.length);
    for (const item of viewerNav) {
      expect(isNavTabAllowedForRole(item.id, 'viewer')).toBe(true);
    }

    const superNav = navItemsForRole(all, 'superadmin');
    expect(superNav.map((n) => n.id)).toEqual(all.map((n) => n.id));
  });

  it('returns an empty nav for unresolved roles (deny-by-default)', () => {
    expect(navItemsForRole(NAV_ITEMS(T), null)).toEqual([]);
  });

  it('includes the access approvals tab in the sidebar for superadmin only', () => {
    const superIds = navItemsForRole(NAV_ITEMS(T), 'superadmin').map((n) => n.id);
    const adminIds = navItemsForRole(NAV_ITEMS(T), 'admin').map((n) => n.id);
    expect(superIds).toContain('access_approvals');
    expect(adminIds).not.toContain('access_approvals');
  });
});

describe('lib/admin-nav-access — portal role vocabulary alignment', () => {
  it('maps nav permissions for every portal role', () => {
    // Every portal role must be able to see at least the overview.
    for (const role of ADMIN_PORTAL_ROLES) {
      if (role === 'partner') continue; // partners land on inventory_os
      expect(isNavTabAllowedForRole('overview', role)).toBe(true);
    }
  });
});

describe('lib/admin-nav-access — navRequiredPermissionsFor', () => {
  it('reports the permissions gating a tab and an empty list for unmapped tabs', () => {
    expect(navRequiredPermissionsFor('settings')).toEqual(['settings:write']);
    expect(navRequiredPermissionsFor('nope')).toEqual([]);
  });
});
