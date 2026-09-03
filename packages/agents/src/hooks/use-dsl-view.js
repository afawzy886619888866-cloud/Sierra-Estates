 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  parseDSL,
  buildSupabaseQuery,
  applyFieldVisibility,
  groupDocuments,
  computeComparisonDelta,


} from '../dsl-parser';





































export function useDSLView(dsl, options = {}) {
  const {
    collectionName = 'listings',
    maxLimit = 50,
    enabled = true,
    benchmarks = {},
  } = options;

  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

    buildSupabaseQuery(parsedView, maxLimit)
      .then((rows) => {
        if (cancelled) return;
        setRaw(rows.map(({ id, ...rest }) => ({ _id: id, ...rest })));
        setLoading(false);
      })
      .catch((queryError) => {
        if (cancelled) return;
        const message = queryError instanceof Error ? queryError.message : String(queryError);
        console.error('[useDSLView] Query failed:', message);
        setError(message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [enabled, maxLimit, parsedView, tick]);

  const data = useMemo(
    () => raw.map((doc) => {
      const _visibleFields = applyFieldVisibility(doc, parsedView);
      const _comparisons = parsedView.compareFields.map((comparison) => {
        const fieldValue = Number(_nullishCoalesce(doc[comparison.field], () => ( 0)));
        const benchmarkValue = Number(_nullishCoalesce(_nullishCoalesce(benchmarks[comparison.against], () => ( doc[comparison.against])), () => ( 0)));
        const delta = computeComparisonDelta(fieldValue, benchmarkValue);

        return { field: comparison.field, against: comparison.against, ...delta };
      });

      return {
        ...doc,
        _id: doc._id ,
        _visibleFields,
        _comparisons,
      } ;
    }),
    [benchmarks, parsedView, raw],
  );

  const grouped = useMemo(() => {
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
