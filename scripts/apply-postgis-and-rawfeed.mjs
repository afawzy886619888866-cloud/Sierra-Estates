import fetch from 'node-fetch';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gaxfqcietzoonlmatiot';

const sql = `
-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add location_coords and reference_code to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS location_coords geometry(Point, 4326);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS reference_code text;

-- Populate location_coords from latitude and longitude if present
UPDATE public.listings
SET location_coords = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_coords IS NULL;

-- 3. Spatial index for radius searches
CREATE INDEX IF NOT EXISTS listings_geo_idx ON public.listings USING gist (location_coords);

-- 4. Staged Scraped Listings
CREATE TABLE IF NOT EXISTS public.raw_feed (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    raw_text text NOT NULL,
    source_channel text NOT NULL,
    sender_phone text,
    extracted_data jsonb,
    is_reviewed boolean DEFAULT false
);

-- 5. Bot Runs / Task Dispatch Table
CREATE TABLE IF NOT EXISTS public.bot_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    bot_name text NOT NULL,
    status text DEFAULT 'idle',
    task_type text,
    metrics jsonb DEFAULT '{}'::jsonb,
    last_run_at timestamptz DEFAULT now(),
    rate_limit_counter int DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.raw_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;

-- Raw feed policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'raw_feed' AND policyname = 'Service role and staff can manage raw_feed'
  ) THEN
    CREATE POLICY "Service role and staff can manage raw_feed" ON public.raw_feed FOR ALL USING (true);
  END IF;
END $$;

-- Bot runs policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bot_runs' AND policyname = 'Service role and staff can manage bot_runs'
  ) THEN
    CREATE POLICY "Service role and staff can manage bot_runs" ON public.bot_runs FOR ALL USING (true);
  END IF;
END $$;

-- 6. Proximity Search Function
CREATE OR REPLACE FUNCTION get_listings_near_capital(capital_lat numeric, capital_lng numeric, radius_meters numeric)
RETURNS SETOF public.listings AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.listings
  WHERE location_coords IS NOT NULL
    AND ST_DWithin(
      location_coords,
      ST_SetSRID(ST_MakePoint(capital_lng::float8, capital_lat::float8), 4326)::geography,
      radius_meters::float8
    )
    AND (status = 'available' OR status = 'active');
END;
$$ LANGUAGE plpgsql;

-- 7. Realtime publication setup
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_feed;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
`;

async function main() {
  console.log('Applying PostGIS, raw_feed, bot_runs and proximity function to Supabase...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('Error applying DDL:', res.status, txt);
    process.exit(1);
  }

  const data = await res.json();
  console.log('Success! DDL result:', data);
}

main().catch(console.error);
