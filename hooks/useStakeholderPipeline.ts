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
  pfLeadId?: string; // Original ID from Property Finder
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
  highNetWorth: InvestmentStakeholder[]; // Formerly 'hot'
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
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

    if (sourceFilter === "property_finder") {
      constraints.unshift(where("source", "==", "property_finder"));
    }

    if (options.advisorId) {
      constraints.unshift(where("advisorAssigned", "==", options.advisorId));
    }

    const q = query(collection(db, "stakeholders"), ...constraints);

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
    await updateDoc(doc(db, "stakeholders", stakeholderId), {
      stage,
      lastEngagement: serverTimestamp(),
      updatedAt:      serverTimestamp(),
    });
  };

  const updateStatus = async (stakeholderId: string, status: StakeholderStatus) => {
    await updateDoc(doc(db, "stakeholders", stakeholderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  };

  const assignAdvisor = async (stakeholderId: string, advisorId: string) => {
    await updateDoc(doc(db, "stakeholders", stakeholderId), {
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
