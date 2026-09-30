'use client';

/**
 * useListingsRealtime
 *
 * Supabase Realtime subscription for the `listings` table.
 * Listens to INSERT / UPDATE / DELETE events and patches the local
 * in-memory listings array in real-time without a full page reload.
 *
 * Architecture notes:
 * - Uses the NEXT_PUBLIC_ anon key to open a wss:// channel — safe for
 *   browser use; RLS on the `listings` table protects data.
 * - Channel is cleaned up on unmount (single-use, not a shared singleton).
 * - Does NOT require SUPABASE_SERVICE_ROLE_KEY on the client.
 */

import { useEffect, useRef } from 'react';
import type { RealListing } from '@/app/(site)/properties/PropertiesPage';

type SetListings = React.Dispatch<React.SetStateAction<RealListing[]>>;

function sanitizeRealtimeListing(raw: Record<string, unknown>, index: number): RealListing {
<<<<<<< HEAD
  const compound = String(raw.compound || raw.location || 'New Cairo');
  const price = Number(raw.price || 8_500_000);
  const isRent =
    raw.mode === 'rent' ||
    (raw.operation && String(raw.operation).toLowerCase() === 'rent');
  const egpM = Number((price / 1_000_000).toFixed(1));
  const usd = isRent ? Math.round(price / 50) : Math.round(price / 5_000);
  const priceLabel = isRent
    ? `${price.toLocaleString()} EGP / mo`
    : egpM >= 1
    ? `${egpM}M EGP`
    : `${price.toLocaleString()} EGP`;

  return {
    id: String(raw.id || `rt-${index}`),
    code: String(raw.code || `SE-RT-${String(index + 1).padStart(4, '0')}`),
    cmp: compound,
    compound,
    location: String(raw.location || compound),
    zone: String(raw.zone || 'New Cairo'),
    type: String(raw.type || raw.propertyType || 'Apartment'),
    beds: Number(raw.beds || raw.bedrooms || 3),
    bath: Number(raw.bath || raw.bathrooms || 2),
    area: Number(raw.area || raw.area_sqm || 160),
=======
  // ANTI-FABRICATION: no invented defaults. Missing values surface as honest
  // zeros / "Unspecified" / "Price on request" exactly like the page-level
  // sanitizer. A realtime row is real data, not a template to embellish.
  const compound = String(raw.compound || raw.location || 'Unspecified');
  const price = Number(raw.price) > 0 ? Number(raw.price) : 0;
  const isRent =
    raw.mode === 'rent' ||
    (raw.operation && String(raw.operation).toLowerCase() === 'rent');
  const egpM = price > 0 ? Number((price / 1_000_000).toFixed(1)) : 0;
  const usd = price > 0 ? (isRent ? Math.round(price / 50) : Math.round(price / 5_000)) : 0;
  const priceLabel =
    price > 0
      ? isRent
        ? `${price.toLocaleString()} EGP / mo`
        : egpM >= 1
        ? `${egpM}M EGP`
        : `${price.toLocaleString()} EGP`
      : 'Price on request';

  return {
    id: String(raw.id || `rt-${index}`),
    code: String(raw.code || raw.id || `REF-RT-${String(index + 1).padStart(4, '0')}`),
    cmp: compound,
    compound,
    location: String(raw.location || compound),
    zone: String(raw.zone || compound),
    type: String(raw.type || raw.propertyType || 'Unspecified'),
    beds: Number(raw.beds ?? raw.bedrooms ?? 0) || 0,
    bath: Number(raw.bath ?? raw.bathrooms ?? 0) || 0,
    area: Number(raw.area ?? raw.area_sqm ?? 0) || 0,
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    price,
    priceLabel: String(raw.priceLabel || priceLabel),
    egpM,
    usd,
<<<<<<< HEAD
    ai: Number(raw.aiScore || 9.1),
    tag: 'Verified Portfolio',
    mode: isRent ? 'rent' : 'sale',
    agent: 'Sierra Advisor Desk',
    ago: 'Live',
    img: String(
      (raw.raw_data as Record<string, unknown> | undefined)?.img ||
        raw.img ||
        "https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/c1817868-a833-4e1b-bdd0-e3de3dafdd39.png"
    ),
    whatsapp: 'https://wa.me/201092048333',
    lat: Number(raw.latitude || raw.lat || 30.045),
    lng: Number(raw.longitude || raw.lng || 31.59),
=======
    ai: Number(raw.aiScore) > 0 ? Number(raw.aiScore) : 0,
    tag: raw.tag ? String(raw.tag) : '',
    mode: isRent ? 'rent' : 'sale',
    agent: 'Sierra Advisor Desk',
    ago: raw.ago ? String(raw.ago) : 'Live update',
    img: String(
      (raw.raw_data as Record<string, unknown> | undefined)?.img ||
        raw.img ||
        ''
    ),
    whatsapp: 'https://wa.me/201092048333',
    lat: Number(raw.latitude || raw.lat || 0),
    lng: Number(raw.longitude || raw.lng || 0),
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    segment: raw.segment ? String(raw.segment) : undefined,
    description: raw.description ? String(raw.description) : undefined,
  };
}

<<<<<<< HEAD
export function useListingsRealtime(setListings: SetListings) {
=======
export function useListingsRealtime(
  setListings: SetListings,
  onStatus?: (connected: boolean) => void
) {
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  const channelRef = useRef<ReturnType<
    typeof import('@supabase/supabase-js').createClient
  >['channel'] extends (...args: infer _A) => infer R ? R : never | null>(null);

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
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'listings',
              filter: "status=eq.active",
            },
            (payload) => {
              const newRow = payload.new as Record<string, unknown>;
              // Skip owner-sourced listings (same filter as initial load)
              if (
                newRow.party === 'Owner' ||
                newRow.sourceType === 'owner' ||
                newRow.segment === 'owners_rent' ||
                newRow.segment === 'owners_buy' ||
                newRow.tag === 'Direct Owner'
              ) {
                return;
              }
              setListings((prev) => {
                if (prev.some((l) => l.id === String(newRow.id))) return prev;
                return [sanitizeRealtimeListing(newRow, prev.length), ...prev];
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'listings',
            },
            (payload) => {
              const updated = payload.new as Record<string, unknown>;
              // If listing becomes unavailable, remove it
              if (updated.status && updated.status !== 'available') {
                setListings((prev) =>
                  prev.filter((l) => l.id !== String(updated.id))
                );
                return;
              }
              setListings((prev) =>
                prev.map((l) =>
                  l.id === String(updated.id)
                    ? { ...l, ...sanitizeRealtimeListing(updated, 0), id: l.id }
                    : l
                )
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'listings',
            },
            (payload) => {
              const deletedId = String((payload.old as Record<string, unknown>).id);
              setListings((prev) => prev.filter((l) => l.id !== deletedId));
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.info('[useListingsRealtime] ✅ Realtime channel connected.');
<<<<<<< HEAD
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[useListingsRealtime] ⚠️ Realtime channel error:', status);
=======
              onStatus?.(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[useListingsRealtime] ⚠️ Realtime channel error:', status);
              onStatus?.(false);
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
<<<<<<< HEAD
  }, [setListings]);
=======
  }, [setListings, onStatus]);
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
}
