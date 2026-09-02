 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useEffect, useMemo, useCallback } from 'react';
import { onSnapshot, getFirestore } from 'firebase/firestore';

import {
  parseDSL,
  buildFirestoreQuery,
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

    let unsub;

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

    return () => _optionalChain([unsub, 'optionalCall', _ => _()]);
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
