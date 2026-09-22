import { useState, useEffect, useMemo, useCallback } from 'react';
import { listRecords, updateRecord, type WhereClause } from '@sierra-estates/db';

import type { PFSyncResult, SBRListing } from './property-finder';
import { getPFListingAnalytics, pushListingToPF } from './property-finder';

export type LeadStage =
  | 'new_inquiry'
  | 'contacted'
  | 'viewing_scheduled'
  | 'viewing_done'
  | 'offer_submitted'
  | 'closed_won'
  | 'closed_lost';

export type LeadStatus = 'pending_review' | 'active' | 'warm' | 'hot' | 'cold';

/** A row as it comes back from the database. */
type DocumentData = Record<string, unknown>;

export interface CRMLead extends DocumentData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source: 'property_finder' | 'whatsapp' | 'telegram' | 'direct';
  sbrCodeInterest: string;
  listingId?: string;
  pfLeadId?: string;
  status: LeadStatus;
  stage: LeadStage;
  neuralMatchScore?: number;
  leilaScore?: number;
  agentAssigned?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredCompounds?: string[];
  lastContact?: Date;
  createdAt: Date;
}

export interface UsePFLeadsReturn {
  leads: CRMLead[];
  grouped: Map<LeadStage, CRMLead[]>;
  hot: CRMLead[];
  loading: boolean;
  error: string | null;
  updateStage: (leadId: string, stage: LeadStage) => Promise<void>;
  updateStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  assignAgent: (leadId: string, agentId: string) => Promise<void>;
  totalPFLeads: number;
  conversionRate: number;
}

const STAGE_ORDER: LeadStage[] = [
  'new_inquiry',
  'contacted',
  'viewing_scheduled',
  'viewing_done',
  'offer_submitted',
  'closed_won',
  'closed_lost',
];

export function usePFLeads(options: {
  sourceFilter?: 'property_finder' | 'all';
  minNeuralScore?: number;
  agentId?: string;
  maxLimit?: number;
} = {}): UsePFLeadsReturn {
  const {
    sourceFilter = 'property_finder',
    minNeuralScore = 0,
    agentId,
    maxLimit = 100,
  } = options;

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Firestore's onSnapshot kept this live; a Postgres read is one-shot, so
    // the hook fetches on mount and whenever its inputs change.
    let cancelled = false;

    const where: WhereClause[] = [];
    if (sourceFilter === 'property_finder') {
      where.push({ column: 'source', value: 'property_finder' });
    }
    if (agentId) {
      where.push({ column: 'agentAssigned', value: agentId });
    }

    listRecords<CRMLead>('leads', {
      where,
      orderBy: { column: 'createdAt', ascending: false },
    })
      .then((rows) => {
        if (cancelled) return;
        const filtered = minNeuralScore > 0
          ? rows.filter((lead) => (lead.neuralMatchScore ?? 0) >= minNeuralScore)
          : rows;
        setLeads(filtered.slice(0, maxLimit));
        setLoading(false);
      })
      .catch((queryError: unknown) => {
        if (cancelled) return;
        setError(queryError instanceof Error ? queryError.message : String(queryError));
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [agentId, maxLimit, minNeuralScore, sourceFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<LeadStage, CRMLead[]>();

    for (const stage of STAGE_ORDER) {
      groups.set(stage, []);
    }

    for (const lead of leads) {
      const bucket = groups.get(lead.stage) ?? [];
      bucket.push(lead);
      groups.set(lead.stage, bucket);
    }

    return groups;
  }, [leads]);

  const hot = useMemo(() => leads.filter((lead) => (lead.neuralMatchScore ?? 0) >= 85), [leads]);

  const conversionRate = useMemo(() => {
    if (leads.length === 0) {
      return 0;
    }

    const closed = leads.filter((lead) => lead.stage === 'closed_won').length;
    return Math.round((closed / leads.length) * 100);
  }, [leads]);

  const updateStage = useCallback(
    async (leadId: string, stage: LeadStage) => {
      await updateRecord('leads', leadId, {
        stage,
        lastContact: new Date().toISOString(),
      });
    },
    [],
  );

  const updateStatus = useCallback(
    async (leadId: string, status: LeadStatus) => {
      await updateRecord('leads', leadId, { status });
    },
    [],
  );

  const assignAgent = useCallback(
    async (leadId: string, assignedAgentId: string) => {
      await updateRecord('leads', leadId, { agentAssigned: assignedAgentId });
    },
    [],
  );

  return {
    leads,
    grouped,
    hot,
    loading,
    error,
    updateStage,
    updateStatus,
    assignAgent,
    totalPFLeads: leads.length,
    conversionRate,
  };
}

export interface ListingWithAnalytics extends SBRListing {
  pfViews?: number;
  pfLeads?: number;
  pfPhoneReveals?: number;
  pfImpressions?: number;
  pfCTR?: number;
}

export function usePFListings(options: {
  syncedOnly?: boolean;
  compound?: string;
  maxLimit?: number;
} = {}) {
  const { syncedOnly = false, compound, maxLimit = 50 } = options;
  const [listings, setListings] = useState<ListingWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const where: WhereClause[] = [{ column: 'status', value: 'active' }];
    if (syncedOnly) {
      where.push({ column: 'syncedToPF', value: true });
    }
    if (compound) {
      where.push({ column: 'compound', value: compound });
    }

    listRecords<ListingWithAnalytics>('listings', {
      where,
      orderBy: { column: 'aiScore', ascending: false },
      limit: maxLimit,
    })
      .then((rows) => {
        if (cancelled) return;
        setListings(rows);
        setLoading(false);
      })
      .catch((queryError: unknown) => {
        if (cancelled) return;
        setError(queryError instanceof Error ? queryError.message : String(queryError));
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [compound, maxLimit, syncedOnly]);

  const syncListing = useCallback(async (listing: SBRListing): Promise<PFSyncResult> => pushListingToPF(listing), []);
  const fetchAnalytics = useCallback(async (pfListingId: string) => getPFListingAnalytics(pfListingId), []);

  return {
    listings,
    loading,
    error,
    syncListing,
    fetchAnalytics,
    syncedCount: listings.filter((listing) => listing.syncedToPF).length,
    unsyncedCount: listings.filter((listing) => !listing.syncedToPF).length,
    hiddenGems: listings.filter((listing) => listing.dealStatus === 'Hidden Gem'),
    totalActive: listings.length,
  };
}

export const PROPERTY_FINDER_WEBHOOK_ROUTE_EXAMPLE = `
import { NextRequest, NextResponse } from 'next/server';
import { handlePFLeadWebhook } from '@/lib/integrations/property-finder';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await handlePFLeadWebhook(body, req.headers);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes('signature') ? 401 : 500 },
      );
    }

    return NextResponse.json({ leadId: result.leadId, received: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get('challenge');

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'Sierra Estatese PF Webhook Active' });
}
`.trim();

export const PROPERTY_FINDER_ENV_VARS_EXAMPLE = `
PF_API_BASE_URL=https://api.propertyfinder.com.eg/v3
PF_JWT_TOKEN=your_pf_jwt_token_here
PF_COMPANY_ID=SB-EG-2024-001
PF_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_AI_API_KEY=your_gemini_api_key_here
VERCEL_URL=sierra-estates.net
`.trim();
