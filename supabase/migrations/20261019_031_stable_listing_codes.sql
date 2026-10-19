-- ═══════════════════════════════════════════════════════════════════════════
-- 20261019_031_stable_listing_codes.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- STABLE LISTING CODES (canonical inventory architecture, mandate §4):
--   • One authoritative inventory DB (public.listings) — kept.
--   • Permanent DB id (uuid) — already exists.
--   • STABLE human-readable listing code: assigned ONCE, then IMMUTABLE —
--     price edits, description edits, re-ingestion can never change it.
--   • Anti-collision: a Postgres SEQUENCE mints serials atomically, so
--     concurrent inserts can never mint the same code (unlike the old
--     Math.random() technicalId or the price-embedded VS-3F-45K display
--     format, which collided for identical units).
--   • Dedup identity stays SEPARATE: dupe_check_hash / listing_fingerprint()
--     remain the mutable near-duplicate detector — codes are never used for
--     dedup, fingerprints are never used as codes.
--
-- Format (matches lib/server/unit-codes.ts canonical form):
--   SE-{RNT|SL}-{AREA}-{SERIAL}     e.g. SE-SL-HYD-0142
--   RNT = rent/rental, SL = sale/resale/primary (dealToken parity)
--   AREA = 2–4 char gazetteer code, initials fallback
--   SERIAL = zero-padded sequence value (4+ digits, grows naturally)
--
-- Idempotent + additive + backward compatible:
--   • Existing non-NULL codes are PRESERVED VERBATIM (never regenerated).
--   • Rows with NULL/empty code are backfilled exactly once, oldest first
--     (deterministic order by created_at, id). Re-runs are no-ops.
--   • Pre-existing duplicate codes are disambiguated with a -D2/-D3 suffix
--     (repair, not regeneration) and reported via RAISE NOTICE.
--   • All statements are IF NOT EXISTS / OR REPLACE — safe to re-run.
-- Order of operations matters: area-code function FIRST (the backfill calls
-- it), backfill + repair BEFORE the unique index and BEFORE the freeze
-- trigger exists (otherwise the repair's own UPDATEs would be blocked).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Area-code helper (gazetteer parity with lib/server/unit-codes.ts).
--    Defined first: every later statement uses it.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.listing_area_code(p_compound TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_compound IS NULL OR TRIM(LOWER(p_compound)) = '' THEN 'GCA'
    WHEN TRIM(LOWER(p_compound)) LIKE '%hyde park%'   THEN 'HYD'
    WHEN TRIM(LOWER(p_compound)) LIKE '%palm hills%'  THEN 'PK'
    WHEN TRIM(LOWER(p_compound)) LIKE '%mountain view%' THEN 'MVI'
    WHEN TRIM(LOWER(p_compound)) LIKE '%mivida%'      THEN 'MVD'
    WHEN TRIM(LOWER(p_compound)) LIKE '%madinaty%'    THEN 'MDN'
    WHEN TRIM(LOWER(p_compound)) LIKE '%uptown%'      THEN 'UPC'
    WHEN TRIM(LOWER(p_compound)) LIKE '%eastown%'     THEN 'EST'
    WHEN TRIM(LOWER(p_compound)) LIKE '%villette%'    THEN 'VIL'
    WHEN TRIM(LOWER(p_compound)) LIKE '%katameya dunes%' THEN 'KTD'
    WHEN TRIM(LOWER(p_compound)) LIKE '%katameya%'    THEN 'KAT'
    WHEN TRIM(LOWER(p_compound)) LIKE '%mostakbal%'   THEN 'MBC'
    WHEN TRIM(LOWER(p_compound)) LIKE '%rehab%'       THEN 'REH'
    WHEN TRIM(LOWER(p_compound)) LIKE '%shorouk%'     THEN 'SHR'
    WHEN TRIM(LOWER(p_compound)) LIKE '%5th settlement%' OR TRIM(LOWER(p_compound)) LIKE '%fifth settlement%' THEN '5ST'
    WHEN TRIM(LOWER(p_compound)) LIKE '%new capital%' THEN 'NCP'
    WHEN TRIM(LOWER(p_compound)) LIKE '%zayed%'       THEN 'ZAY'
    WHEN TRIM(LOWER(p_compound)) LIKE '%october%'     THEN 'OCT'
    WHEN TRIM(LOWER(p_compound)) LIKE '%north coast%' THEN 'NCS'
    WHEN TRIM(LOWER(p_compound)) LIKE '%sokhna%'      THEN 'SOK'
    WHEN TRIM(LOWER(p_compound)) LIKE '%cairo plaza%' THEN 'CPL'
    WHEN TRIM(LOWER(p_compound)) LIKE '%new cairo%'   THEN 'AUC'
    -- Deterministic initials fallback: first 3 alphanumerics, uppercased.
    ELSE UPPER(LEFT(REGEXP_REPLACE(p_compound, '[^a-zA-Z0-9]', '', 'g'), 3))
  END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Atomic serial source (collision-proof under concurrent inserts)
-- ─────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.sierra_listing_code_seq START 1000;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Backfill: rows that never got a code receive one ONCE (deterministic
--    order: oldest first). Re-running is a no-op (NULL filter re-checked).
-- ─────────────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.listings
  WHERE code IS NULL OR TRIM(code) = ''
)
UPDATE public.listings l
SET code = 'SE-' ||
       CASE WHEN LOWER(COALESCE(l.deal_type, l.offer_type, 'sale')) LIKE '%rent%' THEN 'RNT' ELSE 'SL' END ||
       '-' ||
       COALESCE(public.listing_area_code(l.compound), 'GCA') ||
       '-' ||
       lpad((1000 + ranked.rn)::text, 4, '0')
FROM ranked
WHERE l.id = ranked.id
  AND (l.code IS NULL OR TRIM(l.code) = '');

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Repair: disambiguate pre-existing duplicate codes (keep oldest).
--    Duplicates could only exist because the legacy price-embedded
--    generator (coding-algorithm.ts) minted the same display code for
--    identical units. The oldest row (by created_at, id) keeps the code;
--    younger duplicates get a -D2, -D3 … suffix. This is a disambiguation
--    repair, NOT a regeneration: the code stem is preserved.
-- ─────────────────────────────────────────────────────────────────────────
DO $block$
DECLARE
  dup_row RECORD;
  victim  RECORD;
  suffix_counter INT;
BEGIN
  FOR dup_row IN
    SELECT code,
           (SELECT id FROM public.listings l2 WHERE l2.code = l1.code
             ORDER BY created_at NULLS LAST, id LIMIT 1) AS keeper_id
    FROM public.listings l1
    WHERE code IS NOT NULL AND TRIM(code) <> ''
    GROUP BY code
    HAVING COUNT(*) > 1
  LOOP
    suffix_counter := 1;
    FOR victim IN
      SELECT id, code FROM public.listings
      WHERE code = dup_row.code AND id <> dup_row.keeper_id
      ORDER BY created_at NULLS LAST, id
    LOOP
      suffix_counter := suffix_counter + 1;
      UPDATE public.listings
      SET code = victim.code || '-D' || suffix_counter::text
      WHERE id = victim.id;
      RAISE NOTICE 'stable-listing-codes: disambiguated duplicate % on row % -> %',
        victim.code, victim.id, victim.code || '-D' || suffix_counter::text;
    END LOOP;
  END LOOP;
END
$block$;

-- Bump the sequence past every serial already minted (existing + backfilled
-- codes) so future trigger-assigned codes can never collide with them.
SELECT setval(
  'public.sierra_listing_code_seq',
  GREATEST(
    (SELECT COALESCE(MAX(
      NULLIF(regexp_substr(code, '([0-9]+)$'), '')::bigint), 0)
      FROM public.listings
      WHERE code ~ '^SE-(RNT|SL)-[A-Z0-9]{2,4}-[0-9]+$'
         OR code ~ '^SE-(RNT|SL)-[A-Z0-9]{2,4}-[0-9]+-D[0-9]+$'),
    1000,
    (SELECT last_value FROM public.sierra_listing_code_seq)
  ) + 1
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Uniqueness guarantee (partial index: enforces uniqueness wherever a
--    code is set; the sequence + this index are the anti-collision pair)
-- ─────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_listings_code
  ON public.listings (code)
  WHERE code IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. INSERT trigger: mint a canonical code when the caller supplies none.
--    Sequence-backed serial => atomic under concurrent inserts; the unique
--    index above is the final backstop if a caller supplies a colliding code.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_listing_code()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code IS NULL OR TRIM(NEW.code) = '' THEN
    NEW.code := 'SE-' ||
      CASE WHEN LOWER(COALESCE(NEW.deal_type, NEW.offer_type, 'sale')) LIKE '%rent%' THEN 'RNT' ELSE 'SL' END ||
      '-' ||
      COALESCE(public.listing_area_code(NEW.compound), 'GCA') ||
      '-' ||
      lpad(nextval('public.sierra_listing_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_assign_code ON public.listings;
CREATE TRIGGER trg_listings_assign_code
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_listing_code();

-- ─────────────────────────────────────────────────────────────────────────
-- 7. UPDATE trigger: a set code is FROZEN. Price edits, description edits,
--    status transitions and re-syncs can never renumber an identity —
--    replacing or clearing a set code raises loudly instead of silently
--    forking the audit trail.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.freeze_listing_code()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.code IS NOT NULL AND TRIM(OLD.code) <> ''
     AND NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION
      'listing code is immutable: % cannot become % (stable-code mandate §4)',
      OLD.code, COALESCE(NEW.code, '<null>')
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_freeze_code ON public.listings;
CREATE TRIGGER trg_listings_freeze_code
  BEFORE UPDATE OF code ON public.listings
  FOR EACH ROW
  WHEN (OLD.code IS NOT NULL AND TRIM(OLD.code) <> '')
  EXECUTE FUNCTION public.freeze_listing_code();
