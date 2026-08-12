// sierra-estates/hooks/useDSLView.ts
// sierra estates — Universal DSL View Hook
//
// Converts any DSL string into:
//   → Live Firestore real-time subscription
//   → Parsed view config (fields, tags, groups, compares)
//   → Grouped data map (if GROUP BY is used)
//   → Ready-to-use field/tag metadata for the UI layer
//
// Usage:
//   const { data, loading, parsedView } = useDSLView(VIEW_CONFIGS.public_inventory.dsl);
//   const { grouped }                  = useDSLView(VIEW_CONFIGS.crm_kanban.dsl);

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  onSnapshot,
  DocumentData,
  getFirestore,
} from "firebase/firestore";

import {
  parseDSL,
  buildFirestoreQuery,
  applyFieldVisibility,
  groupDocuments,
  computeComparisonDelta,
  ParsedView,
  CompareClause,
} from "@/lib/dsl/parser";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export interface UseDSLViewOptions {
  /** Firestore collection to query (default: "listings") */
  collectionName?: string;
  /** Max results to fetch (default: 50) */
  maxLimit?: number;
  /** Disable query while false (default: true) */
  enabled?: boolean;
  /** Override benchmark data for COMPARE directives */
  benchmarks?: Record<string, number>;
}

export interface ComparisonResult {
  field: string;
  against: string;
  delta: number;
  label: string;
  direction: "up" | "down" | "neutral";
}

export type EnrichedDoc = DocumentData & {
  _id: string;
  _visibleFields: Partial<DocumentData>;
  _comparisons: ComparisonResult[];
};

export interface UseDSLViewReturn {
  /** All documents (enriched with visibility + compare data) */
  data: EnrichedDoc[];
  /** Documents grouped by GROUP BY field (empty Map if no groupBy) */
  grouped: Map<string, EnrichedDoc[]>;
  /** True while initial load is in progress */
  loading: boolean;
  /** Firestore or parse error, if any */
  error: string | null;
  /** The full parsed view object from the DSL */
  parsedView: ParsedView;
  /** Ordered list of fields to render (SHOW minus HIDE) */
  visibleFields: string[];
  /** AI tag names to render on cards */
  aiTags: string[];
  /** COMPARE directives metadata */
  compareFields: CompareClause[];
  /** Manually re-trigger the subscription */
  refresh: () => void;
}

// ════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════

export function useDSLView(
  dsl: string,
  options: UseDSLViewOptions = {},
): UseDSLViewReturn {
  const {
    collectionName = "listings",
    maxLimit       = 50,
    enabled        = true,
    benchmarks     = {},
  } = options;

  const [raw,     setRaw]     = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  // Parse DSL once (memoized — re-runs only when dsl or collection changes)
  const parsedView = useMemo(
    () => parseDSL(dsl, collectionName),
    [dsl, collectionName],
  );

  const refresh = useCallback(() => setTick(t => t + 1), []);

  // ── Real-time Firestore subscription ──────────────────────────
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsub: (() => void) | undefined;

    try {
      const db = getFirestore();
      const q  = buildFirestoreQuery(parsedView, db, maxLimit);

      unsub = onSnapshot(
        q,
        snapshot => {
          setRaw(snapshot.docs.map(d => ({ _id: d.id, ...d.data() })));
          setLoading(false);
        },
        err => {
          console.error("[useDSLView] Firestore error:", err);
          setError(err.message);
          setLoading(false);
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useDSLView] Query build error:", msg);
      setError(msg);
      setLoading(false);
    }

    return () => unsub?.();
  }, [parsedView, maxLimit, enabled, tick]);

  // ── Enrich documents ──────────────────────────────────────────
  const data: EnrichedDoc[] = useMemo(() => {
    return raw.map(doc => {
      // Apply SHOW / HIDE field visibility
      const _visibleFields = applyFieldVisibility(doc, parsedView);

      // Apply COMPARE directives
      const _comparisons: ComparisonResult[] = parsedView.compareFields.map(c => {
        const fieldVal     = Number(doc[c.field]     ?? 0);
        const benchmarkVal = Number(benchmarks[c.against] ?? doc[c.against] ?? 0);
        const delta        = computeComparisonDelta(fieldVal, benchmarkVal);
        return { field: c.field, against: c.against, ...delta };
      });

      return {
        ...doc,
        _id: doc._id as string,
        _visibleFields,
        _comparisons,
      } as EnrichedDoc;
    });
  }, [raw, parsedView, benchmarks]);

  // ── Group by GROUP BY field ────────────────────────────────────
  const grouped = useMemo<Map<string, EnrichedDoc[]>>(() => {
    if (!parsedView.groupBy) return new Map();
    return groupDocuments(data, parsedView.groupBy);
  }, [data, parsedView.groupBy]);

  // ── Derived metadata ──────────────────────────────────────────
  const visibleFields = useMemo(
    () => parsedView.showFields.filter(f => !parsedView.hideFields.includes(f)),
    [parsedView.showFields, parsedView.hideFields],
  );

  return {
    data,
    grouped,
    loading,
    error,
    parsedView,
    visibleFields,
    aiTags:        parsedView.aiTags,
    compareFields: parsedView.compareFields,
    refresh,
  };
}

// ════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ════════════════════════════════════════════════════════════════

/*
── EXAMPLE 1: Public Inventory Grid ──────────────────────────────

import { VIEW_CONFIGS }  from "@/config/views";
import { useDSLView }    from "@/hooks/useDSLView";
import PropertyCard      from "@/components/PropertyCard";

export default function InventoryPage() {
  const { data, loading, parsedView, aiTags } = useDSLView(
    VIEW_CONFIGS.public_inventory.dsl,
    { collectionName: "listings", maxLimit: 24 },
  );

  if (loading) return <InventorySkeleton />;

  return (
    <div className="grid grid-cols-3 gap-6">
      {data.map(unit => (
        <PropertyCard
          key={unit._id}
          unit={unit}
          visibleFields={parsedView.showFields}
          aiTags={aiTags}
          cover={parsedView.cover}
        />
      ))}
    </div>
  );
}


── EXAMPLE 2: CRM Kanban Board ───────────────────────────────────

import { VIEW_CONFIGS } from "@/config/views";
import { useDSLView }   from "@/hooks/useDSLView";
import KanbanColumn     from "@/components/KanbanColumn";

export default function CRMPage() {
  const { grouped, loading } = useDSLView(
    VIEW_CONFIGS.crm_kanban.dsl,
    { collectionName: "leads" },
  );

  if (loading) return <KanbanSkeleton />;

  return (
    <div className="flex gap-4 overflow-x-auto">
      {Array.from(grouped.entries()).map(([stage, leads]) => (
        <KanbanColumn key={stage} title={stage} leads={leads} />
      ))}
    </div>
  );
}


── EXAMPLE 3: Investor Intelligence with Comparisons ─────────────

import { VIEW_CONFIGS }   from "@/config/views";
import { useDSLView }     from "@/hooks/useDSLView";
import CompoundROICard    from "@/components/CompoundROICard";

export default function InvestorPage() {
  const benchmarks = {
    Market_ROI:    4.2,   // Fetched from your market data API
    Cairo_Average: 28500, // EGP/sqm Cairo-wide
  };

  const { data, loading, parsedView } = useDSLView(
    VIEW_CONFIGS.investor_intelligence.dsl,
    { collectionName: "listings", benchmarks },
  );

  return (
    <div>
      {data.map(compound => (
        <CompoundROICard
          key={compound._id}
          compound={compound}
          comparisons={compound._comparisons}
          chart={parsedView.chart}
        />
      ))}
    </div>
  );
}
*/
