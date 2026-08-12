// ════════════════════════════════════════════════════════════════
// FILE 1: sierra-estatese/hooks/useStakeholderPipeline.ts
// React hook — real-time Strategic Pipeline for Investment Stakeholders
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
  QueryConstraint,
} from "firebase/firestore";
import { COLLECTIONS } from "../../lib/models/schema";

export type PipelineStage =
  | "new_inquiry"
  | "contacted"
  | "viewing_scheduled"
  | "viewing_done"
  | "offer_submitted"
  | "closed_won"
  | "closed_lost";

export type StakeholderStatus = "pending_review" | "active" | "warm" | "hot" | "cold";

export interface InvestmentStakeholder extends DocumentData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source: "property_finder" | "whatsapp" | "telegram" | "direct";
  sbrCodeInterest: string;
  portfolioAssetId?: string;
  registryStakeholderId?: string;
  status: StakeholderStatus;
  stage: PipelineStage;
  neuralMatchScore?: number;      // 0-100 from Matchmaker
  leilaScore?: number;            // 0-10 from Matchmaker
  advisorAssigned?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredCompounds?: string[];
  lastEngagement?: Date;
  createdAt: Date;
}

export interface UseStakeholderPipelineReturn {
  stakeholders: InvestmentStakeholder[];
  grouped: Map<PipelineStage, InvestmentStakeholder[]>;
  highNetWorth: InvestmentStakeholder[];
  loading: boolean;
  error: string | null;
  updateStage: (stakeholderId: string, stage: PipelineStage) => Promise<void>;
  updateStatus: (stakeholderId: string, status: StakeholderStatus) => Promise<void>;
  assignAdvisor: (stakeholderId: string, advisorId: string) => Promise<void>;
  totalStakeholders: number;
  strategicConversionRate: number;
}

const STAGE_ORDER: PipelineStage[] = [
  "new_inquiry",
  "contacted",
  "viewing_scheduled",
  "viewing_done",
  "offer_submitted",
  "closed_won",
  "closed_lost",
];

export function useStakeholderPipeline(
  options: {
    sourceFilter?: "property_finder" | "all";
    minNeuralScore?: number;
    advisorId?: string;
    maxLimit?: number;
  } = {}
): UseStakeholderPipelineReturn {
  const {
    sourceFilter   = "all",
    minNeuralScore = 0,
    maxLimit       = 100,
  } = options;

  const [stakeholders, setStakeholders] = useState<InvestmentStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore();
    const constraints: QueryConstraint[] = [];

    if (sourceFilter === "property_finder") {
      constraints.push(where("source", "==", "property_finder"));
    }

    if (options.advisorId) {
      constraints.push(where("advisorAssigned", "==", options.advisorId));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(collection(db, COLLECTIONS.stakeholders), ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as InvestmentStakeholder));

        if (minNeuralScore > 0) {
          docs = docs.filter(l => (l.neuralMatchScore ?? 0) >= minNeuralScore);
        }

        setStakeholders(docs.slice(0, maxLimit));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [sourceFilter, minNeuralScore, options.advisorId, maxLimit]);

  const grouped = useMemo(() => {
    const map = new Map<PipelineStage, InvestmentStakeholder[]>();
    for (const stage of STAGE_ORDER) map.set(stage, []);
    for (const stakeholder of stakeholders) {
      const bucket = map.get(stakeholder.stage) ?? [];
      bucket.push(stakeholder);
      map.set(stakeholder.stage, bucket);
    }
    return map;
  }, [stakeholders]);

  const highNetWorth = useMemo(
    () => stakeholders.filter(l => (l.neuralMatchScore ?? 0) >= 85),
    [stakeholders]
  );

  const strategicConversionRate = useMemo(() => {
    if (!stakeholders.length) return 0;
    const closed = stakeholders.filter(l => l.stage === "closed_won").length;
    return Math.round((closed / stakeholders.length) * 100);
  }, [stakeholders]);

  const db = getFirestore();

  const updateStage = async (stakeholderId: string, stage: PipelineStage) => {
    await updateDoc(doc(db, COLLECTIONS.stakeholders, stakeholderId), {
      stage,
      lastEngagement: serverTimestamp(),
      updatedAt:      serverTimestamp(),
    });
  };

  const updateStatus = async (stakeholderId: string, status: StakeholderStatus) => {
    await updateDoc(doc(db, COLLECTIONS.stakeholders, stakeholderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  };

  const assignAdvisor = async (stakeholderId: string, advisorId: string) => {
    await updateDoc(doc(db, COLLECTIONS.stakeholders, stakeholderId), {
      advisorAssigned: advisorId,
      updatedAt:       serverTimestamp(),
    });
  };

  return {
    stakeholders,
    grouped,
    highNetWorth,
    loading,
    error,
    updateStage,
    updateStatus,
    assignAdvisor,
    totalStakeholders: stakeholders.length,
    strategicConversionRate,
  };
}


// ════════════════════════════════════════════════════════════════
// FILE 2: sierra-estatese/hooks/usePortfolioAssets.ts
// React hook — live Portfolio Asset Registry synced assets
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
import type { SBRAsset, RegistrySyncResult } from "../../lib/integrations/portfolio-asset-registry";
import { pushAssetToRegistry as pushAssetToRegistry_, getAssetRegistryAnalytics } from "../../lib/integrations/portfolio-asset-registry";

export interface AssetWithAnalytics extends SBRAsset {
  registryViews?: number;
  registryStakeholderInterests?: number;
  registryPhoneReveals?: number;
  registryImpressions?: number;
  registryCTR?: number;
  syncedToRegistry?: boolean;
  investmentTier?: string;
}

export function usePortfolioAssets(options: {
  syncedOnly?: boolean;
  compound?: string;
  maxLimit?: number;
} = {}) {
  const { syncedOnly = false, compound, maxLimit = 50 } = options;

  const [assets, _setAssets] = _useState<AssetWithAnalytics[]>([]);
  const [loading, _setLoading] = _useState(true);
  const [error,   _setError]   = _useState<string | null>(null);

  _useEffect(() => {
    const db = _getFirestore();
    const constraints: any[] = [];

    if (syncedOnly) constraints.push(_where("syncedToRegistry", "==", true));
    if (compound)   constraints.push(_where("compound", "==", compound));
    
    constraints.push(_where("status", "==", "active"));
    constraints.push(_orderBy("neuralMatchScore", "desc"));

    const q = _query(_collection(db, COLLECTIONS.portfolioAssets), ...constraints);

    const unsub = _onSnapshot(q, snap => {
      const docs = snap.docs
        .slice(0, maxLimit)
        .map(d => ({ id: d.id, ...d.data() } as AssetWithAnalytics));
      _setAssets(docs);
      _setLoading(false);
    }, err => {
      _setError(err.message);
      _setLoading(false);
    });

    return () => unsub();
  }, [syncedOnly, compound, maxLimit]);

  const syncAsset = useCallback(
    async (asset: SBRAsset): Promise<RegistrySyncResult> => {
      return pushAssetToRegistry_(asset);
    },
    []
  );

  const fetchAnalytics = useCallback(
    async (registryAssetId: string) => {
      return getAssetRegistryAnalytics(registryAssetId);
    },
    []
  );

  const syncedCount   = assets.filter(l => l.syncedToRegistry).length;
  const unsyncedCount = assets.filter(l => !l.syncedToRegistry).length;
  const flagshipAssets = assets.filter(l => l.investmentTier === "Flagship");

  return {
    assets,
    loading,
    error,
    syncAsset,
    fetchAnalytics,
    syncedCount,
    unsyncedCount,
    flagshipAssets,
    totalActive: assets.length,
  };
}
