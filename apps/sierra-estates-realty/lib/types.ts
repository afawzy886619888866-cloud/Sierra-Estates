/**
 * Sierra Estates — domain types
 * Single source of truth for all entities used by both the client page
 * and the admin page. Mirrors the Firestore collections defined in
 * schema.sql + the Phase 2/3 blueprints.
 */

export type Role =
  | "viewer"
  | "owner"
  | "agent"
  | "partner"
  | "manager"
  | "admin"
  | "superadmin";

/** Roles that may enter the staff admin portal after Firebase authentication. */
export const ADMIN_PORTAL_ROLES = [
  "owner",
  "agent",
  "partner",
  "manager",
  "admin",
  "superadmin",
] as const;

export function isAdminPortalRole(role: unknown): boolean {
  return typeof role === "string" && ADMIN_PORTAL_ROLES.includes(role.trim().toLowerCase() as (typeof ADMIN_PORTAL_ROLES)[number]);
}
export type UserStatus = "active" | "suspended" | "deleted";
export type ListingMode = "sale" | "rent";
export type ListingStatus = "available" | "reserved" | "sold" | "archived";
export type InquiryStatus = "new" | "contacted" | "toured" | "offer" | "closed" | "lost";
export type LeadSource = "property_finder" | "website" | "whatsapp" | "referral";
export type CompoundZone =
  | "5th Settlement"
  | "New Cairo"
  | "Katameya"
  | "Mokattam"
  | "Rehab"
  | "Madinaty"
  | "El Shorouk"
  | "New Capital"
  | "Mostakbal"
  | "6th of October"
  | "North Coast"
  | string;
export type PropertyType =
  | "Apartment"
  | "Villa"
  | "Standalone Villa"
  | "Twin House"
  | "Townhouse"
  | "Penthouse"
  | "Duplex"
  | "Floor with Garden"
  | "Admin Apartment"
  | "Admin"
  | "Clinic"
  | "Studio"
  | string;
export type Locale = "en" | "ar";

export interface Compound {
  id: string;
  name: string;
  zone: CompoundZone;
  lat: number;
  lng: number;
  growth: string;       // "+18%"
  aiScore: number;      // 0-10
  priceM: number;       // EGP per m² (thousands)
  rent: number;         // EGP/month for typical 3BDR
  image?: string;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Listing {
  id: string;
  code: string;         // "HP-VL-01"
  compound: string;
  zone: CompoundZone;
  type: PropertyType;
  beds: number;
  bath: number;
  area: number;         // m²
  egpM: number;         // EGP per m² (thousands)
  usd: number;          // total USD
  aiScore: number;      // 0-10
  tag?: string | null;  // "Premium" | "Featured" | "Smart Match" | null
  mode: ListingMode;
  agent: string;
  ago?: string;         // "2d ago"
  img: string;
  status: ListingStatus;
  description?: string;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  rating: number;
  listingsCount: number;
}

export interface Inquiry {
  id: string;
  mode: ListingMode;
  name: string;
  phone: string;
  email?: string;
  zone?: string;
  type?: PropertyType;
  budget?: string;
  status: InquiryStatus;
  source: LeadSource;
  notes?: string;
  assignedTo?: string;     // agent name
  createdAt: string;
  updatedAt?: string;
}

export interface Lead {
  id: string;
  source: LeadSource;
  name: string;
  phone: string;
  email?: string;
  compound?: string;
  message?: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface CareerApplication {
  id: string;
  name: string;
  phone: string;
  email?: string;
  position: string;
  experience?: string;
  message?: string;
  status: "new" | "reviewed" | "hired" | "rejected";
  createdAt: string;
}

export interface User {
  uid: string;
  id?: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  metadata?: { source: "web" | "import" | "invite"; approvedBy?: string };
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;        // "listing.update" | "inquiry.approve" | ...
  target: string;        // collection/id
  before?: unknown;
  after?: unknown;
  ip?: string;
  createdAt: string;
}

/* Smart-match quiz answers → top listings */
export interface MatchAnswers {
  budget: number;          // total USD
  beds: number;
  type: PropertyType;
  mode: ListingMode;
  preferredZone?: CompoundZone;
}

export interface MatchResult {
  listing: Listing;
  score: number;           // 0-100
  reasons: string[];
  /** Hard constraints the listing violates (empty for normal results). */
  hardConstraintViolations: string[];
  /** True ⇒ returned only because compliant results < limit; explicitly
   *  flagged per the master spec ("alternatives" may not look normal). */
  alternative?: boolean;
}

/* Dashboard KPIs returned by /api/admin/dashboard */
export interface DashboardKPIs {
  totalListings: number;
  activeListings: number;
  newInquiries7d: number;
  conversionRate: number;   // closed / total
  activeCompounds: number;
  totalUsers: number;
  pendingApprovals: number;
  avgAiScore: number | null; // null when no listing carries a real aiScore
  recentActivity: Array<{
    id: string;
    type: "inquiry" | "listing" | "lead" | "user";
    message: string;
    at: string;
  }>;
  topAgents: Array<{ name: string; listings: number; rating: number }>;
  /* ── Phase 12: Data Integrity Control Center (from real listings rows) ── */
  inventoryHealth?: {
    /* source_verified_at recency buckets (30d / 90d / older / never) */
    freshness: { fresh: number; aging: number; stale: number; never: number };
    /* publishability cascade distribution (PUBLISHABLE / REVIEW_REQUIRED / …) */
    publishStatusCounts: Record<string, number>;
    /* listings where verified !== true (staff verification outstanding) */
    needsVerification: number;
    /* listings without a dupe_check_hash — not yet duplicate-fingerprinted */
    unfingerprinted: number;
    totalListings: number;
  } | null;
  /* ── Phase 11/12 tie-in: dispatcher run ledger + DLQ (migration 017) ── */
  automationHealth?: {
    jobs: Array<{
      job: string;
      status: string;
      finishedAt: string | null;
      durationMs: number | null;
      triggerSource: string;
    }>;
    openDeadLetterQueue: number;
  } | null;
}

/* Reports aggregation */
export interface Reports {
  listingsByCompound: Array<{ compound: string; count: number; avgUsd: number }>;
  inquiriesTrend: Array<{ day: string; count: number }>;
  roiLeaderboard: Array<{ compound: string; yield: number; priceM: number; rent: number }>;
  statusBreakdown: Array<{ status: InquiryStatus; count: number }>;
}

/* Auth session shape (signed JWT in cookie) */
export interface Session {
  uid: string;
  email: string;
  name: string;
  role: Role;
  exp: number;
  /**
   * Partner portfolio scope (developers + compounds). Only meaningful when
   * role === 'partner' — the merged-in property accounts that see only their
   * own Inventory / Ad Listing / CRM data. See lib/server/partner-scope.ts.
   */
  scope?: { developers: string[]; compounds: string[] };
}
