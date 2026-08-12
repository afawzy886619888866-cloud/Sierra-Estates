/**
 * SIERRA BLU — FIRESTORE DATA MODEL
 * Canonical type definitions for all collections.
 * This is the single source of truth for the database schema.
 */

import { Timestamp, FieldValue } from 'firebase/firestore';

// ─── Base Types ──────────────────────────────────────────────────────

export interface BaseDocument {
  id?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  createdBy?: string;
  
  // Orchestration Metadata
  orchestrationState?: {
    stage: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    lastTriggeredAt?: Timestamp;
    engineVersion?: string;
    errors?: string[];
  };
}

export type PropertyStatus = 'available' | 'reserved' | 'sold' | 'rented' | 'off-market';
export type PropertyType = 'apartment' | 'villa' | 'townhouse' | 'duplex' | 'penthouse' | 'studio' | 'chalet' | 'commercial' | 'land';
export type PipelineStage = 'inbound' | 'qualify' | 'engage' | 'proposal' | 'viewing' | 'negotiate' | 'reserve' | 'contract' | 'handover' | 'closed-won';
export type StakeholderAcquisitionSource = 'property-finder' | 'olx' | 'website' | 'referral' | 'walk-in' | 'social-media' | 'whatsapp' | 'other';
export type CurrencyCode = 'EGP' | 'USD';
export type FurnishingCode = 'F' | 'U' | 'K' | 'S';
export type SierraFeatureCode = 'G' | 'P' | 'R' | 'V';
export type ListingSentiment = 'positive' | 'neutral' | 'aggressive' | 'desperate';

export interface IntelligenceObject {
  code?: string;
  locationCode?: string;
  furnishingStatus?: FurnishingCode;
  normalizedPrice?: number;
  currency?: CurrencyCode;
  featureCodes?: SierraFeatureCode[];
  valuationScore?: number;
  localityScore?: number;
  standard?: 'luxury' | 'normal' | 'simple';
  condition?: 'new' | 'good' | 'fair' | 'poor';
  legalRiskLevel?: 'low' | 'medium' | 'high';
  legalFlags?: string[];
  marketVelocity?: 'fast' | 'stable' | 'slow';
  urgencyScore?: number;
  sentiment?: ListingSentiment;
  matchingKeywords?: string[];
  roi?: string;
  duplicateCandidateId?: string;
  duplicateConfidence?: number;
  parserVersion?: string;
  lastUpdatedAt?: Timestamp | FieldValue;
  
  // Urban Hub OS - Smart Coding & Protection
  building?: string;
  tower?: string;
  floor?: string;
  unitNumber?: string;
  manual_override?: boolean;

  // Financial & Finishing Intelligence
  finishingGrade?: string;
  paymentTerms?: {
    downpayment?: number;
    installmentsYears?: number;
  };
  valuation?: {
    appraisedValue: number;
    marketDifference: number;
    downpaymentRequired: number;
    installmentMonths: number;
    monthlyInstallment: number;
    valuationStatus: 'underpriced' | 'fair' | 'overpriced';
  };
}

// ─── Units (Listings) ───────────────────────────────────────────────

export interface Unit extends BaseDocument {
  // Identity
  title: string;
  titleAr?: string;
  referenceNumber?: string;
  code?: string;
  slug?: string;

  // Classification
  propertyType: PropertyType;
  category: 'residential' | 'commercial';
  status: PropertyStatus;

  // Location
  projectId?: string;       // FK to projects collection
  developerId?: string;     // FK to developers collection
  compound?: string;
  location?: string;
  city?: string;
  governorate?: string;
  coordinates?: { lat: number; lng: number };

  // Specifications
  area: number;             // in sqm
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  finishingType?: 'fully-finished' | 'semi-finished' | 'core-shell' | 'not-finished';
  view?: string;
  amenities?: string[];

  // Financial
  price: number;
  originalPrice?: number;
  pricePerSqm?: number;
  monthlyRent?: number;
  annualServiceCharge?: number;
  downPayment?: number;
  installmentYears?: number;
  monthlyInstallment?: number;

  // Media
  featuredImage?: string;
  images?: string[];        // Firebase Storage URLs
  videoUrl?: string;
  virtualTourUrl?: string;
  floorPlanUrl?: string;

  // Sync
  syncSource?: 'manual' | 'property-finder' | 'airtable' | 'sheets';
  pfReferenceNumber?: string;
  manualOverrides?: string[];   // Fields that should not be overwritten by sync
  lastSyncAt?: Timestamp | FieldValue | string;

  // Distribution & Automation
  automation?: {
    isBranded: boolean;
    isPublishedToPF: boolean;
    isPublishedToFB: boolean;
    whatsappAdGenerated: boolean;
    pfReference?: string;
  };

  // Lifecycle
  ownerType: 'owner' | 'broker' | 'internal';
  ownerContact?: string;
  dupeCheckHash?: string;

  // Metadata
  description?: string;
  descriptionAr?: string;
  isFeatured?: boolean;
  publishedAt?: Timestamp;
  archivedAt?: Timestamp | null;

  // Intelligence Layer
  intelligence?: IntelligenceObject;
}

export type PortfolioAsset = Unit;
export type Property = PortfolioAsset;

// ─── Projects (Developments) ────────────────────────────────────────

export interface Project extends BaseDocument {
  name: string;
  nameAr?: string;
  developerId: string;      // FK to developers collection
  slug?: string;

  // Location
  location: string;
  city: string;
  governorate?: string;
  coordinates?: { lat: number; lng: number };

  // Details
  description?: string;
  descriptionAr?: string;
  totalUnits?: number;
  availableUnits?: number;
  launchDate?: Timestamp;
  deliveryDate?: Timestamp;
  completionPercent?: number;

  // Financial
  priceRangeMin?: number;
  priceRangeMax?: number;
  paymentPlan?: string;

  // Media
  logo?: string;
  heroImage?: string;
  images?: string[];
  masterPlanUrl?: string;
  brochureUrl?: string;

  // Status
  status: 'pre-launch' | 'launching' | 'under-construction' | 'delivered' | 'resale';
  isFeatured?: boolean;
}

// ─── Developers ─────────────────────────────────────────────────────

export interface Developer extends BaseDocument {
  name: string;
  nameAr?: string;
  slug?: string;

  // Details
  description?: string;
  descriptionAr?: string;
  foundedYear?: number;
  headquarters?: string;
  website?: string;

  // Reputation
  rating?: number;          // 1-5
  totalProjects?: number;
  tier?: 'premium' | 'standard' | 'emerging';

  // Media
  logo?: string;
  coverImage?: string;

  // Contact
  contactEmail?: string;
  contactPhone?: string;
}

// ─── Media Assets ───────────────────────────────────────────────────

export interface MediaAsset extends BaseDocument {
  // Identity
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;

  // Storage
  storagePath: string;      // Firebase Storage path
  downloadUrl: string;      // Public download URL
  thumbnailUrl?: string;

  // Classification
  assetType: 'photo' | 'video' | 'floorplan' | 'brochure' | 'document' | 'logo';
  category?: 'exterior' | 'interior' | 'amenity' | 'location' | 'lifestyle';

  // Relations
  unitId?: string;          // FK to units
  projectId?: string;       // FK to projects
  developerId?: string;     // FK to developers

  // Metadata
  altText?: string;
  altTextAr?: string;
  sortOrder?: number;
  isFeatured?: boolean;
  dimensions?: { width: number; height: number };

  // Moderation
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;
  moderatedAt?: Timestamp;
}

// ─── Investment Stakeholders (Strategic Pipeline) ────────────────────
export interface InvestmentStakeholder extends BaseDocument {
  // Contact Info
  name: string;
  phone: string;
  email?: string;
  nationality?: string;

  // Strategic Pipeline
  stage: PipelineStage;
  source: StakeholderAcquisitionSource;
  assignedTo?: string;      // User ID

  // Interest
  interestedUnitIds?: string[];
  interestedProjectIds?: string[];
  budget?: number;
  budgetMax?: number;
  preferredPropertyType?: PropertyType;
  preferredLocations?: string[];
  preferredBedrooms?: number;
  timeline?: 'immediate' | '1-3months' | '3-6months' | '6-12months' | '12+months';
  investmentGoal?: string;
  relocating?: boolean;
  preferencedCompounds?: string[];

  // Activity
  notes?: string;
  lastContactAt?: Timestamp;
  nextFollowUpAt?: Timestamp;
  interactionCount?: number;

  // Outcome
  wonUnitId?: string;
  wonAmount?: number;
  lostReason?: string;
  closedAt?: Timestamp;

  // AI Matching & Intelligence
  aiProfiling?: {
    score: number;             // Importance score
    interests: string[];       // NLP extracted interests
    topMatches?: Array<{
      unitId: string;
      matchScore: number;
      matchReason: string;
    }>;
    lastMatchRunAt?: Timestamp;
  };

  // Interaction History for Concierge Funnel
  interactionHistory?: Array<{
    unitId: string;
    action: 'click' | 'pass' | 'interested';
    timestamp: Timestamp | FieldValue;
    reason?: string;
  }>;

  // Automation Status
  automation?: {
    botInitiated: boolean;
    scoringCompleted: boolean;
    whatsappFollowupSent: boolean;
    viewingReminderSent: boolean;
    selectionUrlSent?: boolean;
    viewingRewardActive?: boolean;
    lastIncentiveAt?: Timestamp | FieldValue;
    feedbackRequested?: boolean;
    lastFeedbackAt?: Timestamp | FieldValue;
  };

  // PF Sync
  pfLeadId?: string;

  // Intelligence Layer (Neural Memory V9.0)
  intelligence?: {
    closedAssetId?: string;
    lastFeedbackComment?: string;
    contractUrl?: string;
    profile?: {
      bedrooms?: number;
      budget?: number;
      location?: string;
      furnishingStatus?: 'furnished' | 'unfurnished' | 'any';
      moveInDate?: string;
      duration?: string;
      nationality?: string;
      familySize?: number;
    };
    
    // Neural Memory: Semantic Rejections & Patterns
    memory?: {
      negativeSignals: Array<{
        category: 'price' | 'location' | 'finishing' | 'layout' | 'view';
        description: string;
        vector?: number[];      // Embeddings for semantic matching
        importance: number;     // 0-1 weighting
      }>;
      positiveSignals: string[]; 
    };

    // Objections Historical Log
    objections?: Array<{
      unitId: string;
      reason: string;
      category: string;
      sentiment?: ListingSentiment;
      timestamp: Timestamp | FieldValue;
    }>;

    // Cognitive Decision Matrix
    matrix?: {
      lossAversionSensitivity: number; // 0-1 SCARCITY impact
      premiumTolerance: number;        // 0-1 LUXURY impact
    };

    preferences?: {
      likes?: string[];
      dislikes?: string[];
    };
  };
}

export type Lead = InvestmentStakeholder;

// ─── Sales / Transactions ───────────────────────────────────────────

export interface Sale extends BaseDocument {
  unitId: string;
  leadId: string;
  agentId: string;

  // Financial
  salePrice: number;
  commissionPercent: number;
  commissionAmount: number;
  closingDate: Timestamp;

  // Status
  status: 'pending' | 'contracted' | 'completed' | 'cancelled';
  contractNumber?: string;

  // Notes
  notes?: string;
}

// ─── Inbound Asset Signals (Stage 1 & 2 Intake) ─────────────────────
export interface InboundAssetSignal extends BaseDocument {
  // Source Information
  rawMessage: string;
  sourceGroup?: string;
  sourcePlatform: 'whatsapp' | 'telegram' | 'other';
  senderInfo?: string; // Phone or Name
  coordinates?: { lat: number; lng: number };

  // NLP Extracted Data
  extractedData: {
    compound?: string;
    propertyType?: PropertyType;
    bedrooms?: number;
    price?: number;
    currency?: CurrencyCode;
    area?: number;
    finishingType?: string;
    furnishingStatus?: FurnishingCode;
    paymentPlan?: {
      downpayment: number;
      installments: number;
      deliveryDate: string;
    };
    phoneNumber?: string;
    urgencyScore?: number;
    valuationScore?: number;
    sentiment?: ListingSentiment;
    matchingKeywords?: string[];
    features?: SierraFeatureCode[];
    sierraCode?: string;
  };

  intelligence?: IntelligenceObject;

  // Processing
  status: 'new' | 'parsed' | 'validated' | 'duplicate' | 'archived';
  isVerified: boolean;
  duplicateOf?: string; // ID of existing unit

  // Link to canonical asset if converted
  portfolioAssetId?: string; 
}

export type BrokerListing = InboundAssetSignal;

// ─── Vouchers / Incentives ──────────────────────────────────────────

export interface Voucher extends BaseDocument {
  code: string;
  type: 'discount' | 'commission-bonus' | 'viewing-reward';
  value: number;
  currency: string;
  leadId?: string;          // Assigned lead
  status: 'active' | 'redeemed' | 'expired';
  expiresAt: Timestamp;
  conditions?: string;
}

// ─── Proposals / Options Packages (Stage 7) ──────────────────────────

export interface Proposal extends BaseDocument {
  leadId: string;
  leadName?: string;
  
  // Selection
  unitIds: string[];
  units: Array<{
    id: string;
    title: string;
    price: number;
    matchScore: number;
    matchReason: string;
    images?: string[];
    area_name?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    financialAnalysis?: {
      projectedROI: number;
      annualYield: number;
    };
  }>;

  // AI Insights
  strategicSummary?: string;
  strategicSummaryAr?: string;
  
  // Lifecycle
  status: 'draft' | 'deployed' | 'accepted' | 'rejected';
  deployedAt?: Timestamp;
  expiresAt?: Timestamp;
  
  // Analytics
  viewCount?: number;
  lastViewedAt?: Timestamp;
  shareableUrl?: string;

  // Strategic Insights
  financialAnalysis?: {
    projectedROI: number;
    annualYield: number;
    valuationAnalysis: string; // Brief reasoning for the deal quality
    totalPortfolioCapital?: number;
  };
}

// ─── Viewings / Inspections (Stage 8) ───────────────────────────────

export interface Viewing extends BaseDocument {
  leadId: string;
  unitId: string;
  agentId: string;
  scheduledAt: Timestamp;
  status: 'scheduled' | 'completed' | 'cancelled';
  location: string;
  notes?: string;
  reminderSent: boolean;
}

// ─── Users / Staff Profiles ──────────────────────────────────────────
export interface UserProfile extends BaseDocument {
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'agent';
  pfUsername?: string;
  pfAgentId?: string;
  phoneNumber?: string;
  status: 'active' | 'inactive';
}

// ─── Activities / Audit Log ─────────────────────────────────────────

export interface Activity extends BaseDocument {
  type: 'lead_created' | 'lead_stage_changed' | 'listing_added' | 'listing_updated' |
        'sale_closed' | 'sync_completed' | 'note_added' | 'assignment_changed';
  actorId: string;
  actorName: string;
  description: string;
  relatedId?: string;
  relatedType?: 'unit' | 'lead' | 'sale' | 'project';
  metadata?: Record<string, unknown>;
}

// ─── WhatsApp Outreach (Twilio, 4 dedicated numbers) ─────────────────
//
// Replaces the stubbed quota math in WhatsAppParserService.dispatchBulkOwnerOutreach
// with real, Firestore-backed per-number rate tracking. One `whatsapp_numbers` doc
// per Twilio WhatsApp sender; every outbound send is a `whatsapp_message_queue` doc
// so retries, delivery status (via Twilio status callbacks), and the 12pm-8pm /
// 30-per-2hr / 480-per-day caps are all auditable instead of in-memory.

export type WhatsAppNumberStatus = 'active' | 'paused' | 'suspended';

export interface WhatsAppNumber extends BaseDocument {
  label: string;                       // e.g. "Sender 1"
  e164Phone: string;                   // +201234567890
  twilioMessagingServiceSid?: string;  // or a single Sender SID if not using a Messaging Service
  status: WhatsAppNumberStatus;

  // Rolling 2-hour window (resets every 2hrs within operating hours)
  windowSentCount: number;
  windowResetAt: Timestamp;

  // Calendar-day counter (resets at local midnight)
  dailySentCount: number;
  dailyResetAt: Timestamp;

  lastSentAt?: Timestamp;
  lastError?: string;
}

export type WhatsAppMessagePurpose = 'owner-negotiation' | 'client-recommendation' | 'general-outreach';
export type WhatsAppMessageDirection = 'outbound' | 'inbound';
export type WhatsAppMessageQueueStatus =
  | 'queued'          // accepted, waiting for an eligible number + operating window
  | 'sending'         // claimed by a number, Twilio call in flight
  | 'sent'            // Twilio accepted (message SID assigned)
  | 'delivered'       // Twilio status callback confirmed delivery
  | 'read'            // Twilio status callback confirmed read receipt
  | 'failed'          // Twilio rejected or callback reported failure
  | 'skipped-quota'   // no number had remaining window/daily quota
  | 'skipped-hours';  // outside the 12pm-8pm operating window

export interface WhatsAppMessageJob extends BaseDocument {
  direction: WhatsAppMessageDirection;
  purpose: WhatsAppMessagePurpose;

  // Relations (one of leadId/ownerNegotiationId is expected depending on purpose)
  leadId?: string;              // FK -> leads, for client-recommendation
  unitId?: string;               // FK -> listings, the unit being recommended/negotiated
  ownerNegotiationId?: string;  // FK -> owner_negotiations, for owner-negotiation

  toPhone: string;              // E.164
  body: string;
  templateName?: string;        // Twilio WhatsApp template (approved HSM) name, if used
  templateParams?: Record<string, string>;

  assignedNumberId?: string;    // FK -> whatsapp_numbers, set once claimed
  status: WhatsAppMessageQueueStatus;
  scheduledFor?: Timestamp;     // earliest send time; used to defer outside operating hours
  sentAt?: Timestamp;

  twilioMessageSid?: string;
  twilioStatus?: string;        // raw status string from Twilio's callback
  errorMessage?: string;
  attempts: number;
}

// ─── Owner Negotiations ──────────────────────────────────────────────

// Lifecycle: contacted ("Pending" in the admin UI) -> negotiating -> agreed
// -> completed (terms finalized/converted), with rejected/stale as the other
// two terminal outcomes. `completed` is distinct from `agreed`: agreed means
// terms were settled in conversation; completed means the deal/paperwork is
// actually done (set manually by staff once that happens elsewhere).
export type OwnerNegotiationStatus = 'contacted' | 'negotiating' | 'agreed' | 'completed' | 'rejected' | 'stale';

export interface OwnerNegotiation extends BaseDocument {
  unitId?: string;               // FK -> listings, once a canonical unit exists
  brokerListingId?: string;      // FK -> broker_listings (InboundAssetSignal), the raw source
  ownerName?: string;
  ownerPhone: string;

  // The buyer/renter lead this negotiation is being conducted on behalf of,
  // if any (e.g. negotiating with an owner because a specific client wants
  // this unit). Optional — many negotiations are speculative/inventory-side.
  interestedLeadId?: string;     // FK -> stakeholders

  askingPrice?: number;
  currentOfferPrice?: number;
  status: OwnerNegotiationStatus;

  history: Array<{
    direction: WhatsAppMessageDirection;
    message: string;
    price?: number;
    timestamp: Timestamp | FieldValue;
  }>;

  assignedAgentId?: string;     // FK -> users
  lastContactAt?: Timestamp;
}

// ─── Outreach Operating Config (singleton doc) ───────────────────────

export interface WhatsAppOutreachConfig {
  operatingHourStart: number;    // 12 (24hr, local timezone)
  operatingHourEnd: number;      // 20
  timezone: string;              // 'Africa/Cairo'
  batchSizePerNumber: number;    // 30
  windowMinutes: number;         // 120
  dailyCapPerNumber: number;     // 120 (30 * 4 windows between 12pm-8pm)
  dailyCapTotal: number;         // 480 across all 4 numbers
}

// ─── Property Owners (CRM/PF sync) ───────────────────────────────────
// Written by app/api/crm/property-finder on unit import. Keyed by phone
// (cleanMobileId) as the doc ID — one owner doc per phone number.

export interface Owner extends BaseDocument {
  ownerName: string;
  primaryMobile: string;        // doc ID
  lastSyncAt: Timestamp;
}

// ─── Viewing Requests (inbound, pre-confirmation) ────────────────────
// Distinct from `Viewing` (COLLECTIONS.viewings): this is the raw inbound
// request from the public site (app/api/viewing-requests); once an agent
// schedules it, a Viewing doc is created. lib/firebase-config.ts also
// writes here directly from the client SDK.

export type ViewingRequestStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface ViewingRequest extends BaseDocument {
  propertyCode: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  preferredDate: string;        // ISO date
  preferredTime?: string;
  numberOfPeople?: number;
  message?: string;
  status: ViewingRequestStatus;
}

// ─── Follow-ups (agent task management) ──────────────────────────────
// app/api/admin/followups. Each agent sees their own; admins see all.

export type FollowupType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'viewing' | 'other';
export type FollowupStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type FollowupPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Followup extends BaseDocument {
  leadId: string;                // FK -> stakeholders
  agentId?: string;               // FK -> users (uid)
  type: FollowupType;
  title: string;
  notes?: string;
  dueAt: Timestamp;
  completedAt?: Timestamp;
  status: FollowupStatus;
  priority: FollowupPriority;
}

// ─── Pages (public-site CMS) ─────────────────────────────────────────
// app/api/admin/pages (write) + app/api/pages/[slug] (public read).
// Lets admins edit public-site copy without a code deploy.

export type PageSlug =
  | 'home' | 'about' | 'listings' | 'contact' | 'invest'
  | 'concierge' | 'careers' | 'pricing' | 'blog' | 'success-stories'
  | 'roi' | 'virtual-tour' | 'dream-decision';

export interface Page extends BaseDocument {
  slug: PageSlug;
  locale: 'en' | 'ar';
  sections: Record<string, Record<string, unknown>>;
  published: boolean;
  updatedBy?: string;            // uid
}

// ─── Knowledge Base (AI agent reference notes) ───────────────────────
// app/api/admin/knowledge-base. Falls back to scanning the Obsidian vault
// locally when this collection is empty (dev mode).

export interface KnowledgeBaseEntry extends BaseDocument {
  title: string;
  content: string;
  tags?: string[];
  lastModified?: Timestamp;
  metadata?: Record<string, unknown>;
}

// ─── Bot Commands (operator control plane) ───────────────────────────
// app/api/admin/bots. Bots (whatsapp-scraper, n8n, the orchestration
// agents) poll/subscribe to this queue; their live status is a sibling
// doc at system_status/{botId} (see SystemStatus below).

export type BotCommandAction = 'start' | 'stop' | 'restart' | 'run_now';
export type BotCommandStatus = 'pending' | 'acknowledged' | 'completed' | 'failed';

export interface BotCommand extends BaseDocument {
  botId: string;
  command: BotCommandAction;
  status: BotCommandStatus;
  issuedBy: string;               // uid or 'system'
  issuedAt: Timestamp;
}

// ─── System Status (per-bot heartbeat doc, NOT a collection) ─────────
// Doc path: system_status/{botId} — written by WhatsAppStatusService,
// the scraper heartbeat, and app/api/admin/bots. Not added to COLLECTIONS
// since callers address it by doc path, not a queried collection.

export interface SystemStatus {
  status: 'active' | 'syncing' | 'error' | 'idle' | 'offline';
  lastPulse: Timestamp;
  lastError?: string;
  lastCommand?: BotCommandAction;
  lastCommandAt?: Timestamp;
  config?: { interval?: number; enabled?: boolean };
  stats?: { processedToday?: number; errorsToday?: number };
}

// ─── Failed Orchestrations (dead-letter queue) ───────────────────────
// Written by OrchestratorService when a pipeline exhausts its retries.

export interface FailedOrchestration {
  docId: string;
  collection: string;
  stage: string;
  error: string;
  timestamp: Timestamp;
}

// ─── Search Queries (semantic-search analytics) ──────────────────────
// Populated by app/api/search/semantic; aggregated by
// app/api/admin/search-insights.

export interface SearchQueryLog {
  query: string;
  locale?: string;
  intent?: string;
  extractionMethod?: string;
  total?: number;
  timestamp: Date | Timestamp;
  userAgent?: string;
}

// ─── Stakeholder Messages (per-lead chat log SUBcollection) ──────────
// Path: leads/{stakeholderId}/messages — NOT a top-level collection.
// Written by OmnichannelChatService.logChatMessage.

export interface StakeholderMessage {
  sender: 'user' | 'sierra';
  text: string;
  platform: string;
  timestamp: Timestamp;
}

// ─── Collection Names (Constants) ───────────────────────────────────

export const COLLECTIONS = {
  units: 'listings',        // keeping backward compat with existing 'listings' collection
  portfolioAssets: 'portfolio_assets',
  projects: 'projects',
  developers: 'developers',
  mediaAssets: 'mediaAssets',
  stakeholders: 'leads',
  sales: 'sales',
  activities: 'activities',
  users: 'users',
  syncQueue: 'syncQueue',
  syncLog: 'syncLog',
  vouchers: 'vouchers',
  proposals: 'proposals',
  brokerListings: 'broker_listings',
  viewings: 'viewings',
  intelligence: 'intelligence', // Global Neural Memory
  conciergeSelections: 'concierge_selections', // S8 Curated Portfolios
  strategicPipeline: 'strategic_pipeline',      // S9 Deal Pipeline
  agentStatus: 'agents',         // operational status reported by workers (n8n, whatsapp-scraper, etc.)
  automationWorkflows: 'workflows', // admin-managed automation toggles, surfaced in /admin
  whatsappNumbers: 'whatsapp_numbers',                 // 4 Twilio senders + their quota state
  whatsappMessageQueue: 'whatsapp_message_queue',       // every outbound/inbound WhatsApp message
  ownerNegotiations: 'owner_negotiations',              // owner-side buy/sell negotiation threads
  systemConfig: 'system_config',                        // singleton config docs, e.g. system_config/whatsapp_outreach
  owners: 'owners',                       // property owners (keyed by phone), from CRM/PF sync
  viewingRequests: 'viewing_requests',     // inbound pre-confirmation viewing requests
  followups: 'followups',                 // agent follow-up tasks
  pages: 'pages',                         // public-site CMS content
  knowledgeBase: 'knowledge_base',         // AI agent reference notes
  botCommands: 'bot_commands',            // operator -> bot command queue
  failedOrchestrations: 'failed_orchestrations', // orchestration dead-letter queue
  searchQueries: 'search_queries',        // semantic-search analytics log
} as const;
