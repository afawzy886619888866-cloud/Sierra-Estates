import { useState, useEffect, useMemo, useCallback } from 'react';
import { onSnapshot, DocumentData, getFirestore } from 'firebase/firestore';

import {
  parseDSL,
  buildFirestoreQuery,
  applyFieldVisibility,
  groupDocuments,
  computeComparisonDelta,
  ParsedView,
  CompareClause,
} from '../dsl-parser';

export interface UseDSLViewOptions {
  collectionName?: string;
  maxLimit?: number;
  enabled?: boolean;
  benchmarks?: Record<string, number>;
}

export interface ComparisonResult {
  field: string;
  against: string;
  delta: number;
  label: string;
  direction: 'up' | 'down' | 'neutral';
}

export type EnrichedDoc = DocumentData & {
  _id: string;
  _visibleFields: Partial<DocumentData>;
  _comparisons: ComparisonResult[];
};

export interface UseDSLViewReturn {
  data: EnrichedDoc[];
  grouped: Map<string, EnrichedDoc[]>;
  loading: boolean;
  error: string | null;
  parsedView: ParsedView;
  visibleFields: string[];
  aiTags: string[];
  compareFields: CompareClause[];
  refresh: () => void;
}

export function useDSLView(dsl: string, options: UseDSLViewOptions = {}): UseDSLViewReturn {
  const {
    collectionName = 'listings',
    maxLimit = 50,
    enabled = true,
    benchmarks = {},
  } = options;

  const [raw, setRaw] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const parsedView = useMemo(() => parseDSL(dsl, collectionName), [dsl, collectionName]);
  const refresh = useCallback(() => setTick((value) => value + 1), []);

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
      const q = buildFirestoreQuery(parsedView, db, maxLimit);

      unsub = onSnapshot(
        q,
        (snapshot) => {
          setRaw(snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })));
          setLoading(false);
        },
        (snapshotError) => {
          console.error('[useDSLView] Firestore error:', snapshotError);
          setError(snapshotError.message);
          setLoading(false);
        },
      );
    } catch (queryError) {
      const message = queryError instanceof Error ? queryError.message : String(queryError);
      console.error('[useDSLView] Query build error:', message);
      setError(message);
      setLoading(false);
    }

    return () => unsub?.();
  }, [enabled, maxLimit, parsedView, tick]);

  const data: EnrichedDoc[] = useMemo(
    () => raw.map((doc) => {
      const _visibleFields = applyFieldVisibility(doc, parsedView);
      const _comparisons: ComparisonResult[] = parsedView.compareFields.map((comparison) => {
        const fieldValue = Number(doc[comparison.field] ?? 0);
        const benchmarkValue = Number(benchmarks[comparison.against] ?? doc[comparison.against] ?? 0);
        const delta = computeComparisonDelta(fieldValue, benchmarkValue);

        return { field: comparison.field, against: comparison.against, ...delta };
      });

      return {
        ...doc,
        _id: doc._id as string,
        _visibleFields,
        _comparisons,
      } as EnrichedDoc;
    }),
    [benchmarks, parsedView, raw],
  );

  const grouped = useMemo<Map<string, EnrichedDoc[]>>(() => {
    if (!parsedView.groupBy) {
      return new Map();
    }

    return groupDocuments(data, parsedView.groupBy);
  }, [data, parsedView.groupBy]);

  const visibleFields = useMemo(
    () => parsedView.showFields.filter((field) => !parsedView.hideFields.includes(field)),
    [parsedView.hideFields, parsedView.showFields],
  );

  return {
    data,
    grouped,
    loading,
    error,
    parsedView,
    visibleFields,
    aiTags: parsedView.aiTags,
    compareFields: parsedView.compareFields,
    refresh,
  };
}
