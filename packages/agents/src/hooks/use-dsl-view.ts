import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  parseDSL,
  buildSupabaseQuery,
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

/** A row as it comes back from the database. */
export type DocumentData = Record<string, unknown>;

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

    // Firestore's onSnapshot kept this live. Postgres reads are a one-shot
    // fetch, so the view refreshes when `refresh()` bumps `tick` (or an option
    // changes) rather than continuously. `cancelled` guards a resolve that
    // lands after the effect was torn down.
    let cancelled = false;

    buildSupabaseQuery<Record<string, unknown> & { id?: string }>(parsedView, maxLimit)
      .then((rows) => {
        if (cancelled) return;
        setRaw(rows.map(({ id, ...rest }) => ({ _id: id, ...rest })));
        setLoading(false);
      })
      .catch((queryError: unknown) => {
        if (cancelled) return;
        const message = queryError instanceof Error ? queryError.message : String(queryError);
        console.error('[useDSLView] Query failed:', message);
        setError(message);
        setLoading(false);
      });

    return () => { cancelled = true; };
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
