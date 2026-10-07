'use client';

/**
 * useListingsRealtime
 *
 * Supabase Realtime subscription for the `listings` table. Listens to
 * INSERT / UPDATE / DELETE events and patches the in-memory listings array
 * in real-time without a full page reload, so the properties map (pins,
 * fan-out, compound cluster badges) updates the instant an admin edit lands.
 *
 * All row decisions (visibility gate, raw-row → RealListing mapping,
 * add/refresh/remove) live in `lib/realtime/listings-realtime-logic.ts` —
 * this file ONLY owns the websocket lifecycle. The logic module is the
 * single source of truth for the /api/inventory contract and is fully
 * unit-tested (see __tests__/listings-realtime-logic.test.ts).
 *
 * Architecture notes:
 * - Uses the NEXT_PUBLIC_ anon key to open a wss:// channel — safe for
 *   browser use; RLS on the `listings` table protects data.
 * - Channel is cleaned up on unmount (single-use, not a shared singleton).
 * - Does NOT require SUPABASE_SERVICE_ROLE_KEY on the client.
 * - onResync: called after the channel RE-subscribes following an error
 *   (events were missed while disconnected — the page refetches the
 *   authoritative /api/inventory snapshot to reconcile).
 * - Known delivery limitation, by design: Realtime delivers an UPDATE to
 *   the anon role only when the NEW row is still SELECT-visible under the
 *   public RLS policy, so a status flip can leave a stale pin with no
 *   event. The page's periodic reconciliation (5-min, aligned with the
 *   route's s-maxage=300 cache window) bounds that staleness.
 */

import { useEffect, useRef } from 'react';
import type { RealListing } from '@/app/(site)/properties/PropertiesPage';
import {
  applyRealtimeInsert,
  applyRealtimeUpdate,
  applyRealtimeDelete,
} from '@/lib/realtime/listings-realtime-logic';

type SetListings = React.Dispatch<React.SetStateAction<RealListing[]>>;

export function useListingsRealtime(
  setListings: SetListings,
  onStatus?: (connected: boolean) => void,
  onResync?: () => void
) {
  const channelRef = useRef<ReturnType<
    typeof import('@supabase/supabase-js').createClient
  >['channel'] extends (...args: infer _A) => infer R ? R : never | null>(null);
  // Track whether we have ever connected: a SUBSCRIBED after a CHANNEL_ERROR
  // is a RE-subscribe — events were missed, so the page must reconcile.
  const everConnectedRef = useRef(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Gracefully degrade: if Supabase is not configured, realtime is skipped.
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[useListingsRealtime] Supabase env vars missing — realtime disabled.');
      return;
    }

    let client: ReturnType<typeof import('@supabase/supabase-js').createClient>;

    (async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        client = createClient(supabaseUrl, supabaseAnonKey, {
          realtime: { params: { eventsPerSecond: 2 } },
        });

        const channel = client
          .channel('sierra-listings-realtime')
          // No channel-level filters on purpose: the visibility contract
          // (status='active' AND publish_status='PUBLISHABLE' AND not
          // owner-sourced) is enforced in ONE place — the logic module —
          // for INSERT and UPDATE alike. A channel filter on publish_status
          // would suppress the very demotion events the client needs to
          // remove a row, leaving a stale pin.
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'listings' },
            (payload) => {
              setListings((prev) => applyRealtimeInsert(prev, payload.new));
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'listings' },
            (payload) => {
              setListings((prev) => applyRealtimeUpdate(prev, payload.new));
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'listings' },
            (payload) => {
              setListings((prev) => applyRealtimeDelete(prev, payload.old));
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.info('[useListingsRealtime] ✅ Realtime channel connected.');
              if (everConnectedRef.current) {
                // Re-connected after a drop: reconcile with a fresh snapshot
                // instead of trusting a possibly-missed event window.
                onResync?.();
              }
              everConnectedRef.current = true;
              onStatus?.(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[useListingsRealtime] ⚠️ Realtime channel error:', status);
              onStatus?.(false);
            }
          });

        channelRef.current = channel as unknown as typeof channelRef.current;
      } catch (err) {
        console.warn('[useListingsRealtime] Failed to initialize:', err);
      }
    })();

    return () => {
      if (channelRef.current && client) {
        client.removeChannel(channelRef.current as Parameters<typeof client.removeChannel>[0]).catch(() => {});
        channelRef.current = null;
      }
    };
  }, [setListings, onStatus, onResync]);
}
