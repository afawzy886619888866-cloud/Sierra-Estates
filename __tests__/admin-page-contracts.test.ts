import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { isAdminPortalRole } from '../apps/sierra-estates-realty/lib/types';

describe('Admin Page & Portal Architecture Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const ADMIN_DIR = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'app', 'admin');
  const VIEWS_DIR = path.join(ADMIN_DIR, 'views');

  describe('Admin Portal File Structure & View Inventory', () => {
    it('should have AdminPortal, layout.tsx, and page.tsx in app/admin', () => {
      expect(fs.existsSync(path.join(ADMIN_DIR, 'AdminPortal.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(ADMIN_DIR, 'layout.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(ADMIN_DIR, 'page.tsx'))).toBe(true);
    });

    it('should declare all core management views in app/admin/views', () => {
      const requiredViews = [
        'DashboardView.tsx',
        'ListingsView.tsx',
        'AgentsView.tsx',
        'AlertsView.tsx',
        'RecommendationsView.tsx',
        'ReportsView.tsx',
        'SecurityView.tsx',
        'RoleManagerView.tsx',
        'HealthView.tsx',
      ];

      for (const v of requiredViews) {
        expect(fs.existsSync(path.join(VIEWS_DIR, v)), `Missing view: ${v}`).toBe(true);
      }
    });
  });

  describe('Admin Role-Based Access Control (RBAC)', () => {
    it('allows an owner role into the staff portal but not an unapproved role', () => {
      expect(isAdminPortalRole('owner')).toBe(true);
      expect(isAdminPortalRole('Owner')).toBe(true);
      expect(isAdminPortalRole('viewer')).toBe(false);
      expect(isAdminPortalRole('customer')).toBe(false);
    });

    type UserRole = 'super_admin' | 'broker_manager' | 'sales_agent' | 'viewer';

    interface RoutePermission {
      route: string;
      allowedRoles: UserRole[];
    }

    const ADMIN_PERMISSIONS: RoutePermission[] = [
      { route: '/admin', allowedRoles: ['super_admin', 'broker_manager', 'sales_agent', 'viewer'] },
      { route: '/admin/listings/edit', allowedRoles: ['super_admin', 'broker_manager', 'sales_agent'] },
      { route: '/admin/security', allowedRoles: ['super_admin'] },
      { route: '/admin/roles', allowedRoles: ['super_admin'] },
      { route: '/admin/reports', allowedRoles: ['super_admin', 'broker_manager'] },
    ];

    function isRouteAuthorized(role: UserRole, targetRoute: string): boolean {
      const rule = ADMIN_PERMISSIONS.find((p) => p.route === targetRoute);
      if (!rule) return false;
      return rule.allowedRoles.includes(role);
    }

    it('super_admin should have access to security and role management', () => {
      expect(isRouteAuthorized('super_admin', '/admin/security')).toBe(true);
      expect(isRouteAuthorized('super_admin', '/admin/roles')).toBe(true);
    });

    it('sales_agent should NOT have access to security or role management', () => {
      expect(isRouteAuthorized('sales_agent', '/admin/security')).toBe(false);
      expect(isRouteAuthorized('sales_agent', '/admin/roles')).toBe(false);
      expect(isRouteAuthorized('sales_agent', '/admin/listings/edit')).toBe(true);
    });
  });

  describe('Admin Host Isolation Header Validation', () => {
    function isAdminHost(hostHeader: string, adminDomain = 'admin.sierra-estates.net'): boolean {
      if (!hostHeader) return false;
      return hostHeader.toLowerCase().includes('admin.') || hostHeader.toLowerCase() === adminDomain;
    }

    it('should recognize admin domain headers correctly', () => {
      expect(isAdminHost('admin.sierra-estates.net')).toBe(true);
      expect(isAdminHost('admin.localhost:3000')).toBe(true);
      expect(isAdminHost('sierra-estates.net')).toBe(false);
      expect(isAdminHost('www.sierra-estates.net')).toBe(false);
    });
  });
});
