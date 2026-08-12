/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — Type Validation Tests
 *  File: SE/packages/shared/src/__tests__/types.test.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Validates that the TypeScript interfaces in types/index.ts correctly
 *  enforce the Firestore schema defined by the Solutions Architect.
 *
 *  These tests use TypeScript's compile-time type checking as the test
 *  mechanism — if the types are wrong, the file won't compile.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  COLLECTIONS,
} from '../types';
import type {
  Listing, ListingInput, Owner, OwnerInput, Client, ClientInput,
  Request, RequestInput, Agent, AgentInput, ChatMessage, ClientNeeds,
  ListingStatus, PropertyType, FinishingLevel, LeadSource,
  OwnerSourceType, RequestStatus, AgentRole, DeliveryStatus, ListingMode,
  CreateListingWithOwnerPayload, Timestamp,
} from '../types';

/* ──────────────────────────────────────────────────────────────────────────
 *  HELPER: create a valid Timestamp
 * ────────────────────────────────────────────────────────────────────────── */
function ts(): Timestamp {
  return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  ENUM / UNION TYPE TESTS
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Enum / Union Types', () => {
  it('ListingStatus has correct values', () => {
    const draft: ListingStatus = 'draft';
    const active: ListingStatus = 'active';
    const sold: ListingStatus = 'sold';
    expect([draft, active, sold]).toEqual(['draft', 'active', 'sold']);
  });

  it('PropertyType has all 7 values', () => {
    const types: PropertyType[] = [
      'apartment', 'villa', 'townhouse', 'twin_house',
      'penthouse', 'duplex', 'studio',
    ];
    expect(types).toHaveLength(7);
  });

  it('FinishingLevel has 4 values', () => {
    const levels: FinishingLevel[] = ['core_shell', 'semi', 'fully_finished', 'ultra_lux'];
    expect(levels).toHaveLength(4);
  });

  it('LeadSource has 7 values', () => {
    const sources: LeadSource[] = [
      'website', 'whatsapp_bot', 'property_finder',
      'facebook', 'referral', 'walk_in', 'other',
    ];
    expect(sources).toHaveLength(7);
  });

  it('OwnerSourceType is direct or broker', () => {
    const direct: OwnerSourceType = 'direct';
    const broker: OwnerSourceType = 'broker';
    expect([direct, broker]).toEqual(['direct', 'broker']);
  });

  it('RequestStatus has 3 workflow states', () => {
    const statuses: RequestStatus[] = ['bot_handling', 'ready_for_agent', 'closed'];
    expect(statuses).toHaveLength(3);
  });

  it('AgentRole is super_admin or agent', () => {
    const admin: AgentRole = 'super_admin';
    const agent: AgentRole = 'agent';
    expect([admin, agent]).toEqual(['super_admin', 'agent']);
  });

  it('DeliveryStatus has 3 values', () => {
    const statuses: DeliveryStatus[] = ['ready', 'under_construction', 'off_plan'];
    expect(statuses).toHaveLength(3);
  });

  it('ListingMode is sale or rent', () => {
    const sale: ListingMode = 'sale';
    const rent: ListingMode = 'rent';
    expect([sale, rent]).toEqual(['sale', 'rent']);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  COLLECTION CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('COLLECTIONS constant', () => {
  it('has all 5 collection names', () => {
    expect(COLLECTIONS.LISTINGS).toBe('listings');
    expect(COLLECTIONS.OWNERS).toBe('owners');
    expect(COLLECTIONS.CLIENTS).toBe('clients');
    expect(COLLECTIONS.REQUESTS).toBe('requests');
    expect(COLLECTIONS.AGENTS).toBe('agents');
  });

  it('has exactly 5 keys', () => {
    expect(Object.keys(COLLECTIONS)).toHaveLength(5);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  LISTING INTERFACE
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Listing interface', () => {
  it('accepts a complete valid listing', () => {
    const listing: Listing = {
      id: 'listing-123',
      status: 'active',
      property_type: 'villa',
      compound_name: 'Mivida',
      location_sector: '5th Settlement',
      price_egp: 25000000,
      area_sqm: 480,
      bedrooms: 5,
      bathrooms: 6,
      finishing: 'fully_finished',
      mode: 'sale',
      delivery_status: 'ready',
      payment_plan: '10% down, 5 years',
      virtual_tour_url: 'https://listing3d.com/embed/abc123',
      cover_image_url: 'https://images.unsplash.com/photo-123',
      gallery_urls: ['https://images.unsplash.com/photo-1', 'https://images.unsplash.com/photo-2'],
      ai_score: 9.2,
      assigned_agent_id: 'agent-456',
      created_at: ts(),
      updated_at: ts(),
    };
    expect(listing.id).toBe('listing-123');
    expect(listing.status).toBe('active');
    expect(listing.price_egp).toBe(25000000);
  });

  it('accepts a minimal listing (only required fields)', () => {
    const listing: Listing = {
      id: 'listing-min',
      status: 'draft',
      property_type: 'apartment',
      compound_name: 'Hyde Park',
      location_sector: 'New Cairo',
      price_egp: 5000000,
      area_sqm: 120,
      bedrooms: 2,
      finishing: 'semi',
      mode: 'rent',
      delivery_status: 'under_construction',
      created_at: ts(),
      updated_at: ts(),
    };
    expect(listing.bathrooms).toBeUndefined();
    expect(listing.payment_plan).toBeUndefined();
    expect(listing.gallery_urls).toBeUndefined();
  });

  it('ListingInput excludes id + timestamps', () => {
    const input: ListingInput = {
      status: 'active',
      property_type: 'apartment',
      compound_name: 'Taj City',
      location_sector: 'New Cairo',
      price_egp: 8000000,
      area_sqm: 180,
      bedrooms: 3,
      finishing: 'fully_finished',
      mode: 'sale',
      delivery_status: 'ready',
    };
    // @ts-expect-error — id should not exist on Input type
    expect(input.id).toBeUndefined();
    // @ts-expect-error — created_at should not exist on Input type
    expect(input.created_at).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  OWNER INTERFACE (PII)
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Owner interface (PII)', () => {
  it('accepts a direct owner', () => {
    const owner: Owner = {
      id: 'listing-123', // same as listing ID
      owner_name: 'Ahmed Fawzy',
      phone_number: '+201001234567',
      source_type: 'direct',
      created_at: ts(),
      updated_at: ts(),
    };
    expect(owner.source_type).toBe('direct');
    expect(owner.broker_name).toBeUndefined();
  });

  it('accepts a broker-represented owner', () => {
    const owner: Owner = {
      id: 'listing-456',
      owner_name: 'John Doe',
      phone_number: '+201009876543',
      source_type: 'broker',
      broker_name: 'Century 21',
      broker_agency: 'Century 21 Egypt',
      email: 'john@example.com',
      created_at: ts(),
      updated_at: ts(),
    };
    expect(owner.source_type).toBe('broker');
    expect(owner.broker_name).toBe('Century 21');
  });

  it('OwnerInput excludes id + timestamps', () => {
    const input: OwnerInput = {
      owner_name: 'Test Owner',
      phone_number: '+201000000000',
      source_type: 'direct',
    };
    // @ts-expect-error
    expect(input.id).toBeUndefined();
    // @ts-expect-error
    expect(input.created_at).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  CLIENT INTERFACE
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Client interface', () => {
  it('accepts a complete client', () => {
    const client: Client = {
      id: 'client-123',
      name: 'Ahmed Ali',
      phone_number: '+201001234567',
      email: 'ahmed@example.com',
      lead_source: 'website',
      preferred_language: 'en',
      notes: 'VIP client',
      created_at: ts(),
      updated_at: ts(),
    };
    expect(client.lead_source).toBe('website');
  });

  it('accepts a minimal client', () => {
    const client: Client = {
      id: 'client-min',
      name: 'Test',
      phone_number: '+201000000000',
      lead_source: 'whatsapp_bot',
      created_at: ts(),
      updated_at: ts(),
    };
    expect(client.email).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  REQUEST INTERFACE + SUB-TYPES
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Request interface', () => {
  it('accepts a bot-handling request with chat history', () => {
    const request: Request = {
      id: 'req-123',
      client_id: 'client-123',
      status: 'bot_handling',
      bot_chat_history: [
        { sender: 'client', text: 'Hello', timestamp: new Date().toISOString() },
        { sender: 'bot', text: 'Hi! How can I help?', timestamp: new Date().toISOString() },
      ],
      client_needs: { intent: 'buy', min_bedrooms: 3 },
      matched_listings: ['listing-1', 'listing-2'],
      created_at: ts(),
      updated_at: ts(),
    };
    expect(request.status).toBe('bot_handling');
    expect(request.bot_chat_history).toHaveLength(2);
    expect(request.matched_listings).toHaveLength(2);
  });

  it('accepts a closed request with closed_at', () => {
    const request: Request = {
      id: 'req-456',
      client_id: 'client-456',
      status: 'closed',
      bot_chat_history: [],
      client_needs: {},
      matched_listings: [],
      assigned_agent_id: 'agent-789',
      agent_notes: 'Client purchased Mivida villa',
      created_at: ts(),
      updated_at: ts(),
      closed_at: ts(),
    };
    expect(request.status).toBe('closed');
    expect(request.closed_at).toBeDefined();
  });

  it('ChatMessage has sender + text + timestamp', () => {
    const msg: ChatMessage = {
      sender: 'agent',
      text: 'I will call you back',
      timestamp: new Date().toISOString(),
      media_url: 'https://example.com/voice.ogg',
    };
    expect(msg.sender).toBe('agent');
    expect(msg.media_url).toBeDefined();
  });

  it('ClientNeeds has all optional fields', () => {
    const needs: ClientNeeds = {
      intent: 'rent',
      preferred_compounds: ['Mivida', 'Hyde Park'],
      preferred_zones: ['5th Settlement'],
      property_type: 'apartment',
      min_bedrooms: 2,
      max_budget_egp: 10000000,
      min_area_sqm: 150,
      finishing: 'fully_finished',
      delivery_status: 'ready',
      notes: 'Needs parking',
    };
    expect(needs.intent).toBe('rent');
    expect(needs.preferred_compounds).toHaveLength(2);
  });

  it('ClientNeeds can be empty object', () => {
    const needs: ClientNeeds = {};
    expect(Object.keys(needs)).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  AGENT INTERFACE
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Agent interface', () => {
  it('accepts a super_admin agent', () => {
    const agent: Agent = {
      id: 'uid-123',
      role: 'super_admin',
      name: 'Ahmed Fawzy',
      email: 'ahmed@sierra.com',
      is_active: true,
      created_at: ts(),
      updated_at: ts(),
    };
    expect(agent.role).toBe('super_admin');
  });

  it('accepts a regular agent with phone + avatar', () => {
    const agent: Agent = {
      id: 'uid-456',
      role: 'agent',
      name: 'Karim Fahmy',
      email: 'karim@sierra.com',
      phone: '+201001234567',
      avatar_url: 'https://example.com/avatar.jpg',
      is_active: true,
      created_at: ts(),
      updated_at: ts(),
    };
    expect(agent.role).toBe('agent');
    expect(agent.phone).toBeDefined();
  });

  it('accepts an inactive agent (soft delete)', () => {
    const agent: Agent = {
      id: 'uid-789',
      role: 'agent',
      name: 'Old Agent',
      email: 'old@sierra.com',
      is_active: false,
      created_at: ts(),
      updated_at: ts(),
    };
    expect(agent.is_active).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  BATCH WRITE PAYLOAD
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('CreateListingWithOwnerPayload', () => {
  it('accepts listing + owner together for batch write', () => {
    const payload: CreateListingWithOwnerPayload = {
      listing: {
        status: 'active',
        property_type: 'villa',
        compound_name: 'Mivida',
        location_sector: '5th Settlement',
        price_egp: 25000000,
        area_sqm: 480,
        bedrooms: 5,
        finishing: 'fully_finished',
        mode: 'sale',
        delivery_status: 'ready',
      },
      owner: {
        owner_name: 'Ahmed Fawzy',
        phone_number: '+201001234567',
        source_type: 'direct',
      },
    };
    expect(payload.listing.compound_name).toBe('Mivida');
    expect(payload.owner.owner_name).toBe('Ahmed Fawzy');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  TIMESTAMP TYPE
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Timestamp type', () => {
  it('has seconds + nanoseconds', () => {
    const t: Timestamp = { seconds: 1700000000, nanoseconds: 0 };
    expect(t.seconds).toBe(1700000000);
    expect(t.nanoseconds).toBe(0);
  });
});
