/**
 * @file packages/db/src/duplicates-schema.ts
 * Canonical schema contract and type definitions for:
 * 1. public.duplicates (DQE duplicates review queue)
 * 2. public.cold_outreach_queue (staged unverified owner cold outreach)
 *
 * Requirements: R2 (Supply Engine), R3 (DQE & Hybrid Sync)
 */

import { z } from 'zod';
import * as crypto from 'crypto';

// ─── Collection Constants ──────────────────────────────────────────────────
export const DQE_COLLECTIONS = {
  listings: 'listings',
  owners: 'owners',
  duplicates: 'duplicates',
  coldOutreachQueue: 'cold_outreach_queue',
} as const;

export type DqeCollectionName = (typeof DQE_COLLECTIONS)[keyof typeof DQE_COLLECTIONS];

// ─── Duplicates Collection Contract ────────────────────────────────────────

export type DuplicateStatus = 'pending_review' | 'merged' | 'rejected' | 'ignored';

export const DuplicateStatusSchema = z.enum([
  'pending_review',
  'merged',
  'rejected',
  'ignored',
]);

export interface DuplicateRecord {
  id?: string;
  target_sync_hash: string;
  original_listing_id?: string | null;
  duplicate_payload: Record<string, unknown>;
  price_drift?: number | null;
  status: DuplicateStatus;
  source?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const DuplicateRecordSchema = z.object({
  id: z.string().uuid().optional(),
  target_sync_hash: z.string().min(1),
  original_listing_id: z.string().uuid().nullable().optional(),
  duplicate_payload: z.record(z.string(), z.unknown()),
  price_drift: z.number().nullable().optional(),
  status: DuplicateStatusSchema.default('pending_review'),
  source: z.string().default('dqe_gate'),
  reviewed_by: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ─── Cold Outreach Queue Contract ──────────────────────────────────────────

export type ColdOutreachStatus =
  | 'staged'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'rejected'
  | 'failed';

export const ColdOutreachStatusSchema = z.enum([
  'staged',
  'pending_approval',
  'approved',
  'sent',
  'rejected',
  'failed',
]);

export interface ColdOutreachCandidate {
  id?: string;
  phone: string;
  owner_name?: string | null;
  compound?: string | null;
  unit_code?: string | null;
  deal_type?: 'rent' | 'resale' | 'sale' | string;
  generated_message?: string | null;
  status: ColdOutreachStatus;
  source_channel?: string;
  batch_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const ColdOutreachCandidateSchema = z.object({
  id: z.string().uuid().optional(),
  phone: z.string().min(10),
  owner_name: z.string().nullable().optional(),
  compound: z.string().nullable().optional(),
  unit_code: z.string().nullable().optional(),
  deal_type: z.string().default('rent'),
  generated_message: z.string().nullable().optional(),
  status: ColdOutreachStatusSchema.default('pending_approval'),
  source_channel: z.string().default('whatsapp_broker_scraper'),
  batch_id: z.string().nullable().optional(),
  approved_by: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ─── DDL Schema Definitions ────────────────────────────────────────────────

export const DUPLICATES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.duplicates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_sync_hash TEXT NOT NULL,
    original_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    duplicate_payload JSONB NOT NULL,
    price_drift NUMERIC(8, 4),
    status TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'merged', 'rejected', 'ignored')),
    source TEXT DEFAULT 'dqe_gate',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_duplicates_target_sync_hash
    ON public.duplicates(target_sync_hash);

CREATE INDEX IF NOT EXISTS idx_duplicates_status
    ON public.duplicates(status);
`;

export const COLD_OUTREACH_QUEUE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.cold_outreach_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    owner_name TEXT,
    compound TEXT,
    unit_code TEXT,
    deal_type TEXT DEFAULT 'rent',
    generated_message TEXT,
    status TEXT NOT NULL DEFAULT 'pending_approval'
        CHECK (status IN ('staged', 'pending_approval', 'approved', 'sent', 'rejected', 'failed')),
    source_channel TEXT DEFAULT 'whatsapp_broker_scraper',
    batch_id TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cold_outreach_status
    ON public.cold_outreach_queue(status);

CREATE INDEX IF NOT EXISTS idx_cold_outreach_phone
    ON public.cold_outreach_queue(phone);
`;

// ─── Utility Helpers ───────────────────────────────────────────────────────

/**
 * Computes deterministic sync_hash across canonical attributes.
 */
export function computeSyncHash(attrs: {
  compound?: string | null;
  unitType?: string | null;
  areaSqm?: number | string | null;
  floor?: number | string | null;
  bedrooms?: number | string | null;
  unitNumber?: string | null;
  code?: string | null;
}): string {
  const norm = [
    String(attrs.compound || '').trim().toLowerCase(),
    String(attrs.unitType || '').trim().toLowerCase(),
    String(attrs.areaSqm || '').trim(),
    String(attrs.floor || '').trim().toLowerCase(),
    String(attrs.bedrooms || '').trim(),
    String(attrs.unitNumber || attrs.code || '').trim().toLowerCase(),
  ].join('|');

  return crypto.createHash('sha256').update(norm).digest('hex');
}
