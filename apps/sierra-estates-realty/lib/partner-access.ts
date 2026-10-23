/**
 * PARTNER ACCESS — client-safe constants & pure helpers.
 *
 * A "partner" is a merged-in property account (developer/brokerage) that gets
 * LIMITED access to the admin portal: it sees exactly three workspaces —
 * Inventory, Ad Listing, CRM — and only its own data inside them (scoped
 * server-side; see lib/server/partner-scope.ts).
 *
 * This module is imported by client components, so it must stay free of
 * `process.env` reads and server-only imports.
 */

/** The one role that gets restricted partner access. */
export const PARTNER_ROLE = 'partner' as const;

/**
 * The ONLY admin-portal tabs a partner may open, in sidebar order.
 *   inventory_os → الانفنتوري (Inventory OS workspace)
 *   listings     → Ad Listing (listings grid + Easy Listing studio)
 *   leads        → CRM (the leads board)
 */
export const PARTNER_NAV_IDS = ['inventory_os', 'listings', 'leads'] as const;

export type PartnerNavId = (typeof PARTNER_NAV_IDS)[number];

export function isPartnerRole(role: unknown): boolean {
  return typeof role === 'string' && role.trim().toLowerCase() === PARTNER_ROLE;
}

/** True when `tab` is a nav id the given role may open. */
export function isTabAllowedForRole(tab: string, role: unknown): boolean {
  if (!isPartnerRole(role)) return true;
  return (PARTNER_NAV_IDS as readonly string[]).includes(tab);
}

/**
 * Filter a list of nav items down to what the role may see.
 * Partners keep the canonical PARTNER_NAV_IDS order regardless of input order.
 */
export function navIdsForRole(allIds: readonly string[], role: unknown): string[] {
  if (!isPartnerRole(role)) return [...allIds];
  return PARTNER_NAV_IDS.filter((id) => allIds.includes(id));
}
