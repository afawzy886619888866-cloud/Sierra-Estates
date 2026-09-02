 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { useState, useEffect, useMemo, useCallback } from 'react';
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


} from 'firebase/firestore';


import { getPFListingAnalytics, pushListingToPF } from './property-finder';

 













































const STAGE_ORDER = [
  'new_inquiry',
  'contacted',
  'viewing_scheduled',
  'viewing_done',
  'offer_submitted',
  'closed_won',
  'closed_lost',
];

export function usePFLeads(options




 = {}) {
  const {
    sourceFilter = 'property_finder',
    minNeuralScore = 0,
    agentId,
    maxLimit = 100,
  } = options;

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const db = getFirestore();

  useEffect(() => {
    const constraints = [orderBy('createdAt', 'desc')];

    if (sourceFilter === 'property_finder') {
      constraints.unshift(where('source', '==', 'property_finder'));
    }

    if (agentId) {
      constraints.unshift(where('agentAssigned', '==', agentId));
    }

    const leadsQuery = query(collection(db, 'leads'), ...constraints);

    return onSnapshot(
      leadsQuery,
      (snapshot) => {
        let docs = snapshot.docs.map((leadDoc) => ({ id: leadDoc.id, ...leadDoc.data() } ));

        if (minNeuralScore > 0) {
          docs = docs.filter((lead) => (_nullishCoalesce(lead.neuralMatchScore, () => ( 0))) >= minNeuralScore);
        }

        setLeads(docs.slice(0, maxLimit));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
  }, [agentId, db, maxLimit, minNeuralScore, sourceFilter]);

  const grouped = useMemo(() => {
    const groups = new Map();

    for (const stage of STAGE_ORDER) {
      groups.set(stage, []);
    }

    for (const lead of leads) {
      const bucket = _nullishCoalesce(groups.get(lead.stage), () => ( []));
      bucket.push(lead);
      groups.set(lead.stage, bucket);
    }

    return groups;
  }, [leads]);

  const hot = useMemo(() => leads.filter((lead) => (_nullishCoalesce(lead.neuralMatchScore, () => ( 0))) >= 85), [leads]);

  const conversionRate = useMemo(() => {
    if (leads.length === 0) {
      return 0;
    }

    const closed = leads.filter((lead) => lead.stage === 'closed_won').length;
    return Math.round((closed / leads.length) * 100);
  }, [leads]);

  const updateStage = useCallback(
    async (leadId, stage) => {
      await updateDoc(doc(db, 'leads', leadId), {
        stage,
        lastContact: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [db],
  );

  const updateStatus = useCallback(
    async (leadId, status) => {
      await updateDoc(doc(db, 'leads', leadId), {
        status,
        updatedAt: serverTimestamp(),
      });
    },
    [db],
  );

  const assignAgent = useCallback(
    async (leadId, assignedAgentId) => {
      await updateDoc(doc(db, 'leads', leadId), {
        agentAssigned: assignedAgentId,
        updatedAt: serverTimestamp(),
      });
    },
    [db],
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









export function usePFListings(options



 = {}) {
  const { syncedOnly = false, compound, maxLimit = 50 } = options;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const db = getFirestore();

  useEffect(() => {
    const constraints = [where('status', '==', 'active'), orderBy('aiScore', 'desc')];

    if (syncedOnly) {
      constraints.unshift(where('syncedToPF', '==', true));
    }

    if (compound) {
      constraints.unshift(where('compound', '==', compound));
    }

    const listingsQuery = query(collection(db, 'listings'), ...constraints);

    return onSnapshot(
      listingsQuery,
      (snapshot) => {
        const docs = snapshot.docs
          .slice(0, maxLimit)
          .map((listingDoc) => ({ id: listingDoc.id, ...listingDoc.data() } ));
        setListings(docs);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
  }, [compound, db, maxLimit, syncedOnly]);

  const syncListing = useCallback(async (listing) => pushListingToPF(listing), []);
  const fetchAnalytics = useCallback(async (pfListingId) => getPFListingAnalytics(pfListingId), []);

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
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_ADMIN_PRIVATE_KEY=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
GOOGLE_AI_API_KEY=your_gemini_api_key_here
VERCEL_URL=sierra-estates.net
`.trim();
