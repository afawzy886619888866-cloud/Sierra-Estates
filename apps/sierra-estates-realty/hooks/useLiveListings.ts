'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface LiveListing {
  id: string;
  created_at?: string;
  updated_at?: string;
  title: string;
  reference_code?: string;
  ref_id?: string;
  compound_name?: string;
  compound?: string;
  district?: string;
  price: number;
  currency?: string;
  unit_type?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  payment_plan?: string;
  is_featured?: boolean;
  featured?: boolean;
  virtual_tour_url?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  location_coords?: unknown;
  source?: string;
  status: string;
  [key: string]: unknown;
}

export function useLiveListings() {
  const [listings, setListings] = useState<LiveListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    supabase
      .from('listings')
      .select('*')
      .in('status', ['available', 'active'])
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) {
          setListings(data as LiveListing[]);
        }
        setLoading(false);
      });

    // Realtime subscription for edits and new units from Admin
    const channel = supabase
      .channel('listings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setListings((prev) => [payload.new as LiveListing, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setListings((prev) =>
              prev.map((item) => (item.id === (payload.new as { id: string }).id ? (payload.new as LiveListing) : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setListings((prev) => prev.filter((item) => item.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { listings, loading };
}

export default useLiveListings;
