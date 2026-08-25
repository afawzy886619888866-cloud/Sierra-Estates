/**
 * whatsappGroupRegistry.ts
 *
 * Canonical registry of all Sierra Estates WhatsApp groups.
 * Every active and archived group — owner, broker, and mixed — is listed here.
 * This is the authoritative source used for:
 *  - Bulk ingestion audits (ensuring every group has been scraped)
 *  - Source type classification (owner vs broker vs archive)
 *  - Test coverage assertions
 */

export type GroupSourceType = 'owner' | 'broker' | 'mixed';

export interface WhatsAppGroup {
  /** Internal WhatsApp JID or synthetic key */
  id: string;
  /** Human-readable group name */
  name: string;
  /** Source classification */
  type: GroupSourceType;
  /** True if the group has been archived / is no longer active */
  archived: boolean;
  /** Optional human-readable description */
  description?: string;
}

/** All known Sierra Estates WhatsApp groups — active + archived */
export const WHATSAPP_GROUP_REGISTRY: WhatsAppGroup[] = [
  // ── Active Owner Groups ──────────────────────────────────────────────────
  {
    id: '120363044918239011@g.us',
    name: 'Owners August 2026',
    type: 'owner',
    archived: false,
    description: 'Primary owner intake group — August 2026 season',
  },
  {
    id: '120363081293019284@g.us',
    name: 'Owners Units',
    type: 'owner',
    archived: false,
    description: 'Standing owner units group — verified direct sellers',
  },
  {
    id: '120363198471092831@g.us',
    name: 'New units from owner',
    type: 'owner',
    archived: false,
    description: 'New owner-direct listings drop group',
  },
  {
    id: '120363290184719280@g.us',
    name: 'Group Data Owner',
    type: 'owner',
    archived: false,
    description: 'Owner data intake — mixed New Cairo compounds',
  },
  {
    id: '120363384910294811@g.us',
    name: 'Owners Project inventory',
    type: 'owner',
    archived: false,
    description: 'Project-level owner inventory — compound-specific listings',
  },
  {
    id: '120363491028471922@g.us',
    name: 'Owners Inventory project',
    type: 'owner',
    archived: false,
    description: 'Owner inventory project group — multi-compound coverage',
  },
  {
    id: '120363888888888888@g.us',
    name: 'Owners Direct Intake',
    type: 'owner',
    archived: false,
    description: 'Direct owner intake channel — high-priority VIP sellers',
  },
  // ── Active Broker Groups ─────────────────────────────────────────────────
  {
    id: '120363999999999999@g.us',
    name: 'EasyListing Intake',
    type: 'broker',
    archived: false,
    description: 'EasyListing Studio automatic intake webhook group',
  },
  {
    id: 'broker-elite-001@g.us',
    name: 'New Cairo Elite Brokers (VIP)',
    type: 'broker',
    archived: false,
    description: 'VIP broker network — premium New Cairo listings',
  },
  {
    id: 'broker-commercial@g.us',
    name: 'East Cairo Commercial & Luxury Network',
    type: 'broker',
    archived: false,
    description: 'Commercial & luxury brokers — East Cairo zone',
  },
  {
    id: 'broker-palmhills@g.us',
    name: 'Palm Hills & Golden Square Direct Owners',
    type: 'broker',
    archived: false,
    description: 'Broker/owner hybrid — Palm Hills & Golden Square zone',
  },
  {
    id: 'broker-madinaty@g.us',
    name: 'Madinaty Broker Network',
    type: 'broker',
    archived: false,
    description: 'Madinaty-specific broker channel',
  },
  {
    id: 'broker-cairo-rentals@g.us',
    name: 'Cairo Rentals & Seasonal',
    type: 'broker',
    archived: false,
    description: 'Rental listings — seasonal and long-term Cairo market',
  },
  {
    id: 'broker-north-coast@g.us',
    name: 'North Coast & Sahel Brokers',
    type: 'broker',
    archived: false,
    description: 'North Coast seasonal and investment properties',
  },
  {
    id: 'broker-october@g.us',
    name: '6th October & Zayed Broker Hub',
    type: 'broker',
    archived: false,
    description: 'West Cairo broker channel — Zayed, October, Badya',
  },
  // ── Archived Groups ──────────────────────────────────────────────────────
  {
    id: '120363777777777777@g.us',
    name: 'Group Data Owner (Archived)',
    type: 'owner',
    archived: true,
    description: 'Archived owner data group — historical listings',
  },
  {
    id: 'archived-broker-001@g.us',
    name: 'Old Cairo Brokers Network',
    type: 'broker',
    archived: true,
    description: 'Archived broker network — pre-2026 season listings',
  },
  {
    id: 'archived-owners-2025@g.us',
    name: 'Owners 2025 Season',
    type: 'owner',
    archived: true,
    description: 'Archived owner intake — 2025 full-year listings',
  },
  {
    id: 'archived-broker-luxury@g.us',
    name: 'Cairo Luxury Brokers (Archived)',
    type: 'broker',
    archived: true,
    description: 'Archived luxury broker group — closed 2025 Q4',
  },
  {
    id: 'archived-marassi-owners@g.us',
    name: 'Marassi & North Coast Owners (Archived)',
    type: 'owner',
    archived: true,
    description: 'Archived owner group — Marassi & North Coast units',
  },
];

/** Active groups only */
export const ACTIVE_GROUPS = WHATSAPP_GROUP_REGISTRY.filter((g) => !g.archived);

/** Archived groups only */
export const ARCHIVED_GROUPS = WHATSAPP_GROUP_REGISTRY.filter((g) => g.archived);

/** Active owner groups */
export const OWNER_GROUPS = WHATSAPP_GROUP_REGISTRY.filter((g) => g.type === 'owner' && !g.archived);

/** Active broker groups */
export const BROKER_GROUPS = WHATSAPP_GROUP_REGISTRY.filter((g) => g.type === 'broker' && !g.archived);

/** Lookup a group by ID or name (case-insensitive) */
export function findGroup(idOrName: string): WhatsAppGroup | undefined {
  const lower = idOrName.toLowerCase();
  return WHATSAPP_GROUP_REGISTRY.find(
    (g) => g.id === idOrName || g.name.toLowerCase() === lower || g.name.toLowerCase().includes(lower),
  );
}

/**
 * Classify source type from sender string and group name heuristics.
 * Used when parsing raw WhatsApp messages without a registry match.
 */
export function classifySourceType(sender: string, groupName: string): GroupSourceType {
  const text = `${sender} ${groupName}`.toLowerCase();
  if (/(owner|مالك|مالكة|صاحب|من المالك|direct.*owner|verified owner|owner direct)/i.test(text)) {
    return 'owner';
  }
  if (/(broker|سمسار|وسيط|agent|agency|مكتب|عقاري)/i.test(text)) {
    return 'broker';
  }
  // Group name dominant signals
  if (/owner/i.test(groupName)) return 'owner';
  return 'broker';
}

/** Determine if a listing timestamp qualifies as "new" (within 48 hours) */
export function isNewListing(listedAt: string | Date): boolean {
  const ts = typeof listedAt === 'string' ? new Date(listedAt) : listedAt;
  const diffMs = Date.now() - ts.getTime();
  return diffMs < 48 * 60 * 60 * 1000;
}

/** Determine if a listing timestamp is within the last 30 days (1 month) */
export function isWithinOneMonth(listedAt: string | Date): boolean {
  const ts = typeof listedAt === 'string' ? new Date(listedAt) : listedAt;
  if (isNaN(ts.getTime())) return true;
  const diffMs = Date.now() - ts.getTime();
  return diffMs <= 30 * 24 * 60 * 60 * 1000;
}

