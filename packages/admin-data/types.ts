/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — Shared TypeScript Types
 *  File: SE/apps/admin/src/types/index.ts
 *  Also mirrored to: SE/packages/shared/src/types/index.ts (monorepo shared)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Mirrors the Firestore schema defined by the Solutions Architect.
 *  All collections are strictly typed to prevent runtime drift between
 *  the Admin SPA and the Client Portal.
 *
 *  🔒 Zero-Trust PII policy:
 *    - `owners` is NEVER exposed to the public client portal.
 *    - `clients` and `requests` are admin-only (enforced by Firestore rules).
 *    - Only `listings` with status="active" are publicly readable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ──────────────────────────────────────────────────────────────────────────
 *  ENUMS & UNION TYPES
 * ────────────────────────────────────────────────────────────────────────── */

/** Lifecycle status of a listing. Only "active" is publicly visible. */
export type ListingStatus = 'draft' | 'active' | 'sold';

/** Property category. Drives filtering on both client + admin. */
export type PropertyType =
  | 'apartment'
  | 'villa'
  | 'townhouse'
  | 'twin_house'
  | 'penthouse'
  | 'duplex'
  | 'studio';

/** Finishing level — affects AVM pricing multiplier. */
export type FinishingLevel = 'core_shell' | 'semi' | 'fully_finished' | 'ultra_lux';

/** Where the lead originated — drives attribution analytics. */
export type LeadSource =
  | 'website'
  | 'whatsapp_bot'
  | 'property_finder'
  | 'facebook'
  | 'referral'
  | 'walk_in'
  | 'other';

/** Ownership source — broker listings get commission markup. */
export type OwnerSourceType = 'direct' | 'broker';

/** Workflow status of a client request / ticket. */
export type RequestStatus = 'bot_handling' | 'ready_for_agent' | 'closed';

/** Role-based access control. Drives UI + Firestore rules. */
export type AgentRole = 'super_admin' | 'agent';

/** Delivery status — when the unit is physically ready. */
export type DeliveryStatus = 'ready' | 'under_construction' | 'off_plan';

/** Sale or rent — affects pricing + search filters. */
export type ListingMode = 'sale' | 'rent';

/* ──────────────────────────────────────────────────────────────────────────
 *  CORE COLLECTION INTERFACES
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Collection: `listings` (PUBLIC — readable by anyone when status="active")
 *
 * Contains ONLY public marketing data. Owner PII lives in the `owners`
 * collection, linked by the same document ID (batch-written together).
 */
export interface Listing {
  /** Firestore document ID — same ID used for the corresponding owner doc. */
  id: string;

  /** Lifecycle: only "active" listings are publicly visible. */
  status: ListingStatus;

  /** Category of the property. */
  property_type: PropertyType;

  /** Compound / development name (e.g. "Mivida", "Hyde Park New Cairo"). */
  compound_name: string;

  /** Zone / sector (e.g. "5th Settlement", "Mostakbal"). */
  location_sector: string;

  /** Price in EGP. For rentals, this is the monthly rent. */
  price_egp: number;

  /** Built-up area in square meters. */
  area_sqm: number;

  /** Bedroom count (exact integer). */
  bedrooms: number;

  /** Bathroom count (optional — some listings omit this). */
  bathrooms?: number;

  /** Finishing level — affects AVM pricing. */
  finishing: FinishingLevel;

  /** Sale or rent. */
  mode: ListingMode;

  /** When the unit is physically ready to move in. */
  delivery_status: DeliveryStatus;

  /** Optional payment plan description (e.g. "10% down, 5 years"). */
  payment_plan?: string;

  /** Optional 3D virtual tour URL (listing3d.com embed). */
  virtual_tour_url?: string;

  /** Optional cover image + gallery (Unsplash URLs in dev, Storage in prod). */
  cover_image_url?: string;
  gallery_urls?: string[];

  /** Optional AI match score (0-10) — populated by n8n workflow. */
  ai_score?: number;

  /** Optional agent who listed this (FK to agents collection). */
  assigned_agent_id?: string;

  /** Timestamps (Firestore server timestamps). */
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Input type for creating a listing (no id/timestamps — those are auto-set).
 */
export type ListingInput = Omit<Listing, 'id' | 'created_at' | 'updated_at'>;

/**
 * Collection: `owners` (STRICTLY PRIVATE — PII, admin-only)
 *
 * 🔒 NEVER exposed to the client portal. Firestore rules block all public
 *    access. The document ID matches the corresponding listing's ID, so
 *    admins can look up the owner by querying owners/{listingId}.
 *
 *    This separation enforces the Zero-Trust policy: even if the client
 *    portal is compromised, owner contact info cannot leak.
 */
export interface Owner {
  /** Same as the listing document ID (batch-written together). */
  id: string;

  /** Full legal name of the property owner. */
  owner_name: string;

  /** Egyptian phone number (E.164 format: +20XXXXXXXXXX). */
  phone_number: string;

  /** Optional secondary contact (WhatsApp, landline). */
  alternate_phone?: string;

  /** Direct owner vs. broker-represented. */
  source_type: OwnerSourceType;

  /** If broker, the broker's name + agency. */
  broker_name?: string;
  broker_agency?: string;

  /** Optional email for contract communication. */
  email?: string;

  /** Timestamps. */
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type OwnerInput = Omit<Owner, 'id' | 'created_at' | 'updated_at'>;

/**
 * Collection: `clients` (CRM Data — admin-only)
 *
 * Leads captured from the website, WhatsApp bot, Property Finder, etc.
 * Each client can have multiple `requests` over time.
 */
export interface Client {
  id: string;

  /** Display name (from form submission or WhatsApp profile). */
  name: string;

  /** Primary phone — used as the unique identifier for dedup. */
  phone_number: string;

  /** Optional email. */
  email?: string;

  /** Where this lead came from. */
  lead_source: LeadSource;

  /** Optional: preferred language for bot communication. */
  preferred_language?: 'en' | 'ar';

  /** Optional: free-form notes added by agents. */
  notes?: string;

  created_at: Timestamp;
  updated_at: Timestamp;
}

export type ClientInput = Omit<Client, 'id' | 'created_at' | 'updated_at'>;

/**
 * Collection: `requests` (Workflow Tickets — admin-only)
 *
 * A "request" is a workflow ticket that tracks a client's journey:
 *   1. Client contacts the WhatsApp bot → request created with status="bot_handling"
 *   2. Bot collects needs + matches listings → status stays "bot_handling"
 *   3. Bot escalates to human agent → status="ready_for_agent"
 *   4. Agent closes the request → status="closed"
 */
export interface Request {
  id: string;

  /** FK to clients collection. */
  client_id: string;

  /** Optional: specific listing the client asked about. */
  listing_reference_id?: string;

  /** Workflow status. */
  status: RequestStatus;

  /** Full WhatsApp conversation log (bot ↔ client). */
  bot_chat_history: ChatMessage[];

  /** Structured needs extracted by the bot from the conversation. */
  client_needs: ClientNeeds;

  /** Listings the bot matched (array of listing IDs). */
  matched_listings: string[];

  /** Agent assigned to handle this request (empty until escalated). */
  assigned_agent_id?: string;

  /** Optional: agent's internal notes (not visible to client). */
  agent_notes?: string;

  /** Timestamps. */
  created_at: Timestamp;
  updated_at: Timestamp;
  /** When the request was closed (if status="closed"). */
  closed_at?: Timestamp;
}

export type RequestInput = Omit<Request, 'id' | 'created_at' | 'updated_at'>;

/**
 * A single message in the bot chat history.
 * Used in Request.bot_chat_history array.
 */
export interface ChatMessage {
  /** Who sent the message. */
  sender: 'client' | 'bot' | 'agent';
  /** Message text. */
  text: string;
  /** When the message was sent (ISO string for portability). */
  timestamp: string;
  /** Optional: attached media URL (image, voice note). */
  media_url?: string;
}

/**
 * Structured client needs — extracted by the bot from natural conversation.
 * Drives the AI matching logic.
 */
export interface ClientNeeds {
  /** What they want to do. */
  intent?: 'buy' | 'rent' | 'sell' | 'invest';
  /** Preferred compounds (array of names). */
  preferred_compounds?: string[];
  /** Preferred zones. */
  preferred_zones?: string[];
  /** Property type preference. */
  property_type?: PropertyType;
  /** Minimum bedrooms. */
  min_bedrooms?: number;
  /** Maximum budget in EGP. */
  max_budget_egp?: number;
  /** Minimum area in sqm. */
  min_area_sqm?: number;
  /** Finishing preference. */
  finishing?: FinishingLevel;
  /** Delivery timeline. */
  delivery_status?: DeliveryStatus;
  /** Free-form notes the bot captured. */
  notes?: string;
}

/**
 * Collection: `agents` (RBAC Directory — admin-only write, auth-required read)
 *
 * Agents are authenticated users of the Admin SPA. Their role determines
 * what they can see and do.
 */
export interface Agent {
  /** Same as Firebase Auth UID. */
  id: string;

  /** Role — super_admin can do everything, agent has limited scope. */
  role: AgentRole;

  /** Display name. */
  name: string;

  /** Login email (must match Firebase Auth email). */
  email: string;

  /** Optional: phone for WhatsApp contact. */
  phone?: string;

  /** Optional: avatar URL (Storage path). */
  avatar_url?: string;

  /** Whether this agent is currently active (soft delete). */
  is_active: boolean;

  created_at: Timestamp;
  updated_at: Timestamp;
}

export type AgentInput = Omit<Agent, 'id' | 'created_at' | 'updated_at'>;

/* ──────────────────────────────────────────────────────────────────────────
 *  FIRESTORE TIMESTAMP TYPE
 * ──────────────────────────────────────────────────────────────────────────
 *  We use a structural type that matches firebase.firestore.Timestamp
 *  without importing the SDK (keeps the types file framework-agnostic
 *  so it can be shared between admin + client + infra).
 * ────────────────────────────────────────────────────────────────────────── */

export interface Timestamp {
  /** Seconds since Unix epoch. */
  seconds: number;
  /** Non-negative nanoseconds fraction. */
  nanoseconds: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  HELPER: Firestore collection name constants
 *  Centralized to prevent typos in query strings.
 * ────────────────────────────────────────────────────────────────────────── */

export const COLLECTIONS = {
  LISTINGS: 'listings',
  OWNERS: 'owners',
  CLIENTS: 'clients',
  REQUESTS: 'requests',
  AGENTS: 'agents',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/* ──────────────────────────────────────────────────────────────────────────
 *  BATCH WRITE PAYLOAD — used by createListingWithOwner()
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Payload for the atomic listing+owner creation.
 * The listing is public; the owner is private PII.
 * Both share the same Firestore document ID (batch-written).
 */
export interface CreateListingWithOwnerPayload {
  listing: ListingInput;
  owner: OwnerInput;
}
