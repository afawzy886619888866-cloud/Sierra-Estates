/**
 * PARTNER SCOPE — server-side data scoping for partner accounts.
 *
 * A partner (merged-in property account) authenticates into the admin portal
 * but every read is filtered to the partner's own portfolio:
 *   · Inventory + Ad Listing rows → listings whose developer/compound matches
 *   · CRM rows                    → leads whose target compound matches
 *
 * Scope source of truth:
 *   1. Supabase Auth path — public.profiles.metadata.partner_scope
 *      { "developers": ["Mountain View"], "compounds": ["iCity"] }
 *   2. Env-provisioned path — PARTNER_ACCOUNTS (see lib/auth.ts tryPartnerLogin)
 *
 * Scope matching is intentionally name-based (developer/compound names, both
 * directions, case-insensitive, trimmed) because the legacy listings table
 * carries free-text `developer` / `compound` columns. An EMPTY scope is valid
 * and means the partner sees NOTHING — a misconfigured account must fail
 * closed, not leak the whole portfolio.
 */
import { isPartnerRole } from '@/lib/partner-access';

export interface PartnerScope {
  developers: string[];
  compounds: string[];
}

export const EMPTY_PARTNER_SCOPE: PartnerScope = { developers: [], compounds: [] };

/** Normalize one side of a name list: trim, lowercase, drop empties + dupes. */
function normalizeNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const clean = item.trim().toLowerCase();
    if (clean) seen.add(clean);
  }
  return [...seen];
}

/**
 * Coerce an arbitrary value (profiles.metadata.partner_scope, session payload,
 * env JSON) into a PartnerScope. Unknown shapes → empty scope (fail closed).
 */
export function normalizeScope(raw: unknown): PartnerScope {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PARTNER_SCOPE };
  const obj = raw as Record<string, unknown>;
  return {
    developers: normalizeNames(obj.developers),
    compounds: normalizeNames(obj.compounds),
  };
}

export function isEmptyScope(scope: PartnerScope | null | undefined): boolean {
  if (!scope) return true;
  return scope.developers.length === 0 && scope.compounds.length === 0;
}

/** Case-insensitive name match, tolerant of name-variant directions. */
function nameMatches(value: unknown, needles: string[]): boolean {
  if (typeof value !== 'string' || needles.length === 0) return false;
  const clean = value.trim().toLowerCase();
  if (!clean) return false;
  return needles.some((n) => clean === n || clean.includes(n) || n.includes(clean));
}

/**
 * True when a listings row (raw table row or v_inventory_os view row —
 * toRecord camelCases column names) belongs to the partner's portfolio.
 * Rows carry developer/compound as free text; the OS view adds
 * developerName/projectName from the normalized joins.
 */
export function listingInScope(
  row: Record<string, unknown> | null | undefined,
  scope: PartnerScope | null | undefined
): boolean {
  if (!row || !scope) return false;
  if (isEmptyScope(scope)) return false;

  const developerFields = [row.developer, row.developerName];
  const compoundFields = [row.compound, row.compoundName, row.projectName];

  if (scope.developers.length > 0 && developerFields.some((v) => nameMatches(v, scope.developers))) {
    return true;
  }
  return compoundFields.some((v) => nameMatches(v, scope.compounds));
}

/**
 * True when a leads row (CRM) belongs to the partner's portfolio.
 * Leads have no developer dimension — they are scoped by the compound the
 * client is targeting (target_compound / targetCompound).
 */
export function leadInScope(
  lead: Record<string, unknown> | null | undefined,
  scope: PartnerScope | null | undefined
): boolean {
  if (!lead || !scope) return false;
  if (isEmptyScope(scope)) return false;
  const target = lead.targetCompound ?? lead.target_compound ?? undefined;
  return nameMatches(target, scope.compounds);
}

/* ─────────────────────────────────────────────────────────────────────────
 * PARTNER_ACCOUNTS env provisioning
 * ─────────────────────────────────────────────────────────────────────────
 * Format (JSON, one object or an array — values are read on EVERY call so
 * operators can rotate credentials without a re-import):
 *
 * PARTNER_ACCOUNTS='[
 *   {"email":"partner1@example.com","password":"...","name":"Partner One",
 *    "developers":["Mountain View"],"compounds":["iCity"]},
 *   {"email":"partner2@example.com","password":"...","name":"Partner Two",
 *    "developers":["Emaar"],"compounds":["Mivida"]}
 * ]'
 *
 * There is deliberately NO committed default: an unset or malformed value
 * provisions ZERO partner accounts (fail closed — same doctrine as
 * ADMIN_BOOTSTRAP_PASSWORD in lib/auth.ts).
 * ───────────────────────────────────────────────────────────────────────── */

export interface PartnerAccount {
  email: string;
  password: string;
  name: string;
  scope: PartnerScope;
}

/** Constant-time string comparison (same impl as lib/auth.ts). */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Parse PARTNER_ACCOUNTS into validated accounts. Malformed → [] (never throw). */
export function parsePartnerAccounts(raw: string | undefined | null): PartnerAccount[] {
  if (!raw || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[partner-scope] PARTNER_ACCOUNTS is not valid JSON — no partner accounts provisioned.');
    return [];
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const out: PartnerAccount[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const email = typeof obj.email === 'string' ? obj.email.trim().toLowerCase() : '';
    const password = typeof obj.password === 'string' ? obj.password : '';
    if (!email || !password) {
      console.warn('[partner-scope] PARTNER_ACCOUNTS entry missing email/password — skipped.');
      continue;
    }
    out.push({
      email,
      password,
      name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : email.split('@')[0],
      scope: normalizeScope(obj.scope ?? obj),
    });
  }
  return out;
}

/** Read the live env (per-call, never cached) and return the parsed accounts. */
export function getPartnerAccounts(): PartnerAccount[] {
  return parsePartnerAccounts(process.env.PARTNER_ACCOUNTS);
}

/**
 * Resolve a partner login attempt against PARTNER_ACCOUNTS.
 * Constant-time per-account compare; returns the account or null.
 */
export function findPartnerAccount(email: string, password: string): PartnerAccount | null {
  if (!email || !password) return null;
  const clean = email.trim().toLowerCase();
  for (const account of getPartnerAccounts()) {
    if (account.email === clean && constantTimeEqual(password, account.password)) {
      return account;
    }
  }
  return null;
}

/** Read the scope off a profiles row (metadata.partner_scope / partnerScope). */
export function scopeFromProfile(profile: Record<string, unknown> | null | undefined): PartnerScope {
  if (!profile || typeof profile !== 'object') return { ...EMPTY_PARTNER_SCOPE };
  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  return normalizeScope(metadata.partner_scope ?? metadata.partnerScope ?? undefined);
}

export { isPartnerRole };
