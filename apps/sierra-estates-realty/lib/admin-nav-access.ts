/**
 * ADMIN NAV ACCESS — permission-driven sidebar gating (Phase 1, RBAC overhaul).
 *
 * Client-safe constants & pure helpers (no `process.env`, no server imports):
 * every Admin Portal tab declares the ROLE_PERMISSIONS key(s) that unlock it
 * (OR semantics — any listed permission grants the tab). Anything not
 * explicitly granted is denied (default-deny), so a new tab without an entry
 * here is invisible to every role until it is deliberately mapped.
 *
 * Partners keep their canonical three-workspace restriction
 * (lib/partner-access.ts); this module composes that rule instead of
 * duplicating it.
 */
import { roleHasPermission, type Role } from './types';
import { isPartnerRole, PARTNER_NAV_IDS } from './partner-access';

export interface NavAccessItem {
  id: string;
  [key: string]: unknown;
}

/**
 * nav id → acceptable permissions (OR). Drawn from the canonical
 * ROLE_PERMISSIONS vocabulary in lib/types.ts — never invented ad-hoc.
 *
 * Spec mapping (Sierra Estates 3.0 master directive):
 *  - superadmin/admin ……… all views, user management (roles), security
 *  - ops/inventory manager … inventory_command, easy_listing, excel_merger,
 *                            viewings, real_estate_processor
 *  - marketing manager ……… campaigns (whatsapp_outreach), PropertyTeaserBrochure
 *                            (curator), reports, deep_insights
 *  - sales agent / agent ……… leads, viewings, NegotiationSimulator (closer),
 *                            inventory view-only
 *  - viewer …………………… read-only dashboards + public inventory overview
 */
export const NAV_REQUIRED_PERMISSIONS: Readonly<Record<string, readonly string[]>> = {
  // Main
  overview: ['inventory:read'],
  inventory_command: ['inventory:write'],
  easy_listing: ['inventory:write'],
  whatsapp_outreach: ['campaigns:write'],
  agents: ['automation:read'],
  workflows: ['automation:read'],
  all_apps: ['inventory:read'],

  // Operations
  leads: ['leads:read:all', 'leads:read:assigned'],
  pipeline: ['leads:read:all'],
  tasks: ['leads:read:all'],
  inventory_os: ['inventory:read'],
  masterplan_gis: ['inventory:read'],
  cairo_plaza: ['inventory:read'],
  listings: ['inventory:read'],
  viewings: ['leads:read:all', 'leads:read:assigned', 'verification:perform'],
  excel_merger: ['inventory:write'],
  whatsapp_chat_import: ['inventory:write'],
  real_estate_processor: ['inventory:write'],
  curator: ['inventory:write', 'campaigns:write'],
  scribe: ['inventory:write'],
  closer: ['leads:write:all', 'leads:write:assigned'],
  contracts: ['leads:write:all'],

  // System
  health: ['automation:read'],
  monitoring: ['automation:read'],
  workflow_studio: ['automation:retry'],
  workflow_ops: ['automation:read'],
  automations: ['automation:read'],
  openclaw: ['automation:retry'],
  nexus: ['automation:read'],
  roles: ['users:read'],
  security: ['audit:read'],
  access_approvals: ['access:approve'],
  deployment: ['settings:write'],
  api_gateway: ['settings:write'],
  settings: ['settings:write'],

  // Analytics
  deep_insights: ['campaigns:read'],
  reports: ['campaigns:read', 'audit:read'],
  intelligence: ['automation:read'],
  recommendations: ['inventory:read'],
  alerts: ['leads:read:all', 'leads:read:assigned', 'automation:read'],
  memory_brain: ['automation:read'],
  notebookllm: ['campaigns:read'],
  heatmap: ['inventory:read'],
};

/** Render-time aliases in AdminPortal's switch(tab) that share a nav entry. */
const NAV_ALIASES: Readonly<Record<string, string>> = {
  dashboard: 'overview',
  whatsapp_sync: 'whatsapp_outreach',
  whatsapp_sender: 'whatsapp_outreach',
  deepseek: 'memory_brain',
  mempalace: 'memory_brain',
  ecc: 'memory_brain',
};

function requiredPermissionsFor(tab: string): readonly string[] | null {
  const canonical = NAV_ALIASES[tab] ?? tab;
  const perms = NAV_REQUIRED_PERMISSIONS[canonical];
  return perms ?? null;
}

/**
 * True when `tab` is a nav id the given role may open.
 * Default-deny: unmapped tabs and unknown roles see nothing.
 */
export function isNavTabAllowedForRole(tab: string, role: unknown): boolean {
  // Partner accounts keep their exact three-workspace scope.
  if (isPartnerRole(role)) {
    return (PARTNER_NAV_IDS as readonly string[]).includes(tab);
  }

  const perms = requiredPermissionsFor(tab);
  if (!perms) return false; // unmapped tab → denied for everyone
  if (typeof role !== 'string') return false; // unresolved session → deny
  return perms.some((permission) => roleHasPermission(role as Role, permission));
}

/**
 * Filter a list of nav items down to what the role may see, preserving order.
 * Partners keep the canonical PARTNER_NAV_IDS order regardless of input order.
 */
export function navItemsForRole<T extends NavAccessItem>(items: readonly T[], role: unknown): T[] {
  if (isPartnerRole(role)) {
    const allowed = new Set<string>(PARTNER_NAV_IDS);
    return items.filter((item) => allowed.has(item.id));
  }
  return items.filter((item) => isNavTabAllowedForRole(item.id, role));
}

/** The permission(s) gating a tab — used by the 403 card to explain a denial. */
export function navRequiredPermissionsFor(tab: string): readonly string[] {
  return requiredPermissionsFor(tab) ?? [];
}
