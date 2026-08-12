// ════════════════════════════════════════════════════════════════
// FILE 1: sierra-estatese/hooks/usePFLeads.ts
// React hook — real-time Property Finder leads CRM
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";

export type LeadStage =
  | "new_inquiry"
  | "contacted"
  | "viewing_scheduled"
  | "viewing_done"
  | "offer_submitted"
  | "closed_won"
  | "closed_lost";

export type LeadStatus = "pending_review" | "active" | "warm" | "hot" | "cold";

export interface CRMLead extends DocumentData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source: "property_finder" | "whatsapp" | "telegram" | "direct";
  sbrCodeInterest: string;
  listingId?: string;
  pfLeadId?: string;
  status: LeadStatus;
  stage: LeadStage;
  neuralMatchScore?: number;      // 0-100 from Matchmaker
  leilaScore?: number;            // 0-10 from Matchmaker
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
  "new_inquiry",
  "contacted",
  "viewing_scheduled",
  "viewing_done",
  "offer_submitted",
  "closed_won",
  "closed_lost",
];

export function usePFLeads(
  options: {
    sourceFilter?: "property_finder" | "all";
    minNeuralScore?: number;
    agentId?: string;
    maxLimit?: number;
  } = {}
): UsePFLeadsReturn {
  const {
    sourceFilter   = "property_finder",
    minNeuralScore = 0,
    maxLimit       = 100,
  } = options;

  const [leads,   setLeads]   = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore();
    const whereConstraints: any[] = [];

    if (sourceFilter === "property_finder") {
      whereConstraints.push(where("source", "==", "property_finder"));
    }

    if (options.agentId) {
      whereConstraints.push(where("agentAssigned", "==", options.agentId));
    }

    const constraints = [...whereConstraints, orderBy("createdAt", "desc")];
    const q = query(collection(db, "leads"), ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMLead));

        // Client-side neural score filter
        if (minNeuralScore > 0) {
          docs = docs.filter(l => (l.neuralMatchScore ?? 0) >= minNeuralScore);
        }

        setLeads(docs.slice(0, maxLimit));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [sourceFilter, minNeuralScore, options.agentId, maxLimit]);

  // Group by stage for Kanban view
  const grouped = useMemo(() => {
    const map = new Map<LeadStage, CRMLead[]>();
    for (const stage of STAGE_ORDER) map.set(stage, []);
    for (const lead of leads) {
      const bucket = map.get(lead.stage) ?? [];
      bucket.push(lead);
      map.set(lead.stage, bucket);
    }
    return map;
  }, [leads]);

  // Hot leads (score >= 85)
  const hot = useMemo(
    () => leads.filter(l => (l.neuralMatchScore ?? 0) >= 85),
    [leads]
  );

  // Conversion rate
  const conversionRate = useMemo(() => {
    if (!leads.length) return 0;
    const closed = leads.filter(l => l.stage === "closed_won").length;
    return Math.round((closed / leads.length) * 100);
  }, [leads]);

  // Actions
  const db = getFirestore();

  const updateStage = async (leadId: string, stage: LeadStage) => {
    await updateDoc(doc(db, "leads", leadId), {
      stage,
      lastContact: serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
  };

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    await updateDoc(doc(db, "leads", leadId), {
      status,
      updatedAt: serverTimestamp(),
    });
  };

  const assignAgent = async (leadId: string, agentId: string) => {
    await updateDoc(doc(db, "leads", leadId), {
      agentAssigned: agentId,
      updatedAt:     serverTimestamp(),
    });
  };

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


// ════════════════════════════════════════════════════════════════
// FILE 2: sierra-estatese/hooks/usePFListings.ts
// React hook — live Property Finder synced listings
// ════════════════════════════════════════════════════════════════

import { useState as _useState, useEffect as _useEffect, useCallback } from "react";
import {
  getFirestore as _getFirestore,
  collection as _collection,
  query as _query,
  where as _where,
  orderBy as _orderBy,
  onSnapshot as _onSnapshot,
} from "firebase/firestore";
import type { PFListing } from "../../apps/sierra-estates-realty/lib/integrations/property-finder";
import { PFIntegrationService } from "../../apps/sierra-estates-realty/lib/integrations/property-finder";

// Type aliases for hook compatibility
export type SBRListing = PFListing;
export type PFSyncResult = { success: boolean; id?: string; error?: string };

// Note: pfClient analytics methods are available via lib/property-finder-client
// but not exposed through lib/integrations/property-finder re-exports yet

export interface ListingWithAnalytics extends SBRListing {
  pfViews?: number;
  pfLeads?: number;
  pfPhoneReveals?: number;
  pfImpressions?: number;
  pfCTR?: number;
  syncedToPF?: boolean;
  dealStatus?: string;
}

export function usePFListings(options: {
  syncedOnly?: boolean;
  compound?: string;
  maxLimit?: number;
} = {}) {
  const { syncedOnly = false, compound, maxLimit = 50 } = options;

  const [listings, _setListings] = _useState<ListingWithAnalytics[]>([]);
  const [loading,  _setLoading]  = _useState(true);
  const [error,    _setError]    = _useState<string | null>(null);

  _useEffect(() => {
    const db = _getFirestore();
    const constraints: unknown[] = [
      _where("status", "==", "active"),
      _orderBy("aiScore", "desc"),
    ];

    if (syncedOnly) constraints.unshift(_where("syncedToPF", "==", true));
    if (compound)   constraints.unshift(_where("compound", "==", compound));

    const q = _query(_collection(db, "listings"), ...(constraints as Parameters<typeof _query>[1][]));

    const unsub = _onSnapshot(q, snap => {
      const docs = snap.docs
        .slice(0, maxLimit)
        .map(d => ({ id: d.id, ...d.data() } as ListingWithAnalytics));
      _setListings(docs);
      _setLoading(false);
    }, err => {
      _setError(err.message);
      _setLoading(false);
    });

    return () => unsub();
  }, [syncedOnly, compound, maxLimit]);

  // Sync a single listing to PF
  const syncListing = useCallback(
    async (listing: SBRListing): Promise<PFSyncResult> => {
      try {
        const result = await PFIntegrationService.publishListing(listing.id || '');
        return { success: true, id: result.id };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
    []
  );

  // Fetch PF analytics for a listing (TODO: integrate with pfClient when analytics API available)
  const fetchAnalytics = useCallback(
    async (_pfListingId: string) => {
      return {
        views: 0,
        leads: 0,
        phoneReveals: 0,
        impressions: 0,
        ctr: 0,
      };
    },
    []
  );

  const syncedCount   = listings.filter(l => l.syncedToPF).length;
  const unsyncedCount = listings.filter(l => !l.syncedToPF).length;
  const hiddenGems    = listings.filter(l => l.dealStatus === "Hidden Gem");

  return {
    listings,
    loading,
    error,
    syncListing,
    fetchAnalytics,
    syncedCount,
    unsyncedCount,
    hiddenGems,
    totalActive: listings.length,
  };
}


// ════════════════════════════════════════════════════════════════
// FILE 3: app/api/pf-webhook/route.ts
// Next.js App Router — Property Finder Lead Webhook endpoint
// ════════════════════════════════════════════════════════════════

// This file must live at: sierra-estatese/app/api/pf-webhook/route.ts

/*
import { NextRequest, NextResponse } from "next/server";
import { handlePFLeadWebhook } from "@/lib/integrations/property-finder";

export const runtime = "nodejs"; // needs crypto for HMAC verification

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await handlePFLeadWebhook(body, req.headers);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes("signature") ? 401 : 500 }
      );
    }

    return NextResponse.json({ leadId: result.leadId, received: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// PF sends GET to verify the webhook endpoint on first setup
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: "Sierra Estatese PF Webhook Active" });
}
*/


// ════════════════════════════════════════════════════════════════
// FILE 4: Environment Variables Reference
// Add to .env.local in your Next.js project root
// ════════════════════════════════════════════════════════════════

/*
# Property Finder API
PF_API_BASE_URL=https://api.propertyfinder.com.eg/v3
PF_JWT_TOKEN=your_pf_jwt_token_here
PF_COMPANY_ID=SB-EG-2024-001
PF_WEBHOOK_SECRET=your_webhook_secret_here

# Firebase (already in your project)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_ADMIN_PRIVATE_KEY=...
FIREBASE_ADMIN_CLIENT_EMAIL=...

# AI
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Vercel
VERCEL_URL=sierra-estates.net
*/
