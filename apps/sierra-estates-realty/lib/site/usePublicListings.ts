'use client';

/**
 * lib/site/usePublicListings.ts — Phase 4 / B3
 *
 * The single client-side way to get REAL unit data. The 6.5 MB
 * lib/inventory/snapshot.json no longer ships in the client bundle
 * (see lib/site/data.ts); pages fetch the public inventory API instead:
 *
 *   - server-backed (Supabase → live sheet → committed snapshot), with a
 *     5-minute server cache and owner-PII stripping already applied
 *   - honest states: loading / error / empty — NEVER fabricated units
 *     (Master Rule 5: never invent property data)
 *
 * Values left undefined by the API stay undefined here; rendering code is
 * responsible for showing "—" / "Price on request" instead of inventing
 * specs.
 */

import { useEffect, useState } from 'react';

export interface PublicListingsState {
  units: any[];
  loading: boolean;
  error: boolean;
  source: string | null;
}

let cache: { units: any[]; source: string | null; at: number } | null = null;
let inflight: Promise<void> | null = null;
const FRESH_MS = 5 * 60 * 1000;

async function loadInventory(limit: number): Promise<void> {
  if (cache && Date.now() - cache.at < FRESH_MS) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`/api/inventory?limit=${limit}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error(`inventory API ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data?.units)) throw new Error('malformed inventory payload');
      cache = { units: data.units, source: data?.source ?? null, at: Date.now() };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Fetch up to `limit` public inventory units (module-level cache: multiple
 * components on one page share a single request).
 */
export function usePublicListings(limit = 48): PublicListingsState {
  const [state, setState] = useState<PublicListingsState>(() =>
    cache ? { units: cache.units.slice(0, limit), loading: false, error: false, source: cache.source } : { units: [], loading: true, error: false, source: null }
  );

  useEffect(() => {
    let active = true;
    loadInventory(limit)
      .then(() => {
        if (active && cache) {
          setState({ units: cache.units.slice(0, limit), loading: false, error: false, source: cache.source });
        }
      })
      .catch(() => {
        if (active) setState((s) => ({ ...s, loading: false, error: true }));
      });
    return () => {
      active = false;
    };
  }, [limit]);

  return state;
}
