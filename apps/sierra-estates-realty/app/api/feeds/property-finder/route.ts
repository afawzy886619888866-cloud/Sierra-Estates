/**
 * GET /api/feeds/property-finder — PropertyFinder XML listing feed.
 *
 * PUBLISH GATE (activation plan Phase D): this feed advertises units on a
 * public third-party portal, so it exports ONLY verified
 * `publish_status = 'PUBLISHABLE'` rows from the canonical `units`
 * collection (InventoryQueryService with `publishStatus: 'PUBLISHABLE'`),
 * filtered to broker-listed sale units with a price.
 *
 * ANTI-FABRICATION (§21 + Phase E): every exported field must exist on the
 * unit. Units missing compound, type, area, bedrooms, bathrooms or city are
 * SKIPPED (counted in logs) — the old defaults ('New Cairo' community,
 * 'Apartment' type, 0 beds) misrepresented real units to Property Finder.
 * The committed-snapshot fallback was removed with the same doctrine
 * /api/listings applies: unverified rows never reach a public surface, so
 * when nothing verified exists the honest answer is an empty <list>.
 */
import { NextResponse } from 'next/server';
import { getSupabase } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTACT = {
  name: process.env.PF_AGENT_NAME || 'Sierra Estates Advisory',
  email: process.env.PF_AGENT_EMAIL || 'advisory@sierra-estates.net',
  phone: process.env.PF_AGENT_PHONE || '+201092048333',
};

function xmlEscape(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type FeedUnit = {
  code?: string | null;
  id?: string;
  compound?: string | null;
  location?: string;
  city?: string | null;
  zone?: string;
  propertyType?: string | null;
  type?: string | null;
  bedrooms?: number | null;
  beds?: number | null;
  bath?: number | null;
  area?: number | null;
  price?: number;
  egpM?: number;
  mode?: string;
  dealType?: string | null;
  ownerType?: string | null;
  img?: string | null;
  images?: string[];
  photoUrl?: string | null;
  segment?: string | null;
};

/** Raw `listings` row shape as selected by loadUnits (snake_case columns). */
type ListingRow = {
  id?: string;
  code?: string | null;
  ref_id?: string | null;
  compound?: string | null;
  location_area?: string | null;
  city?: string | null;
  property_type?: string | null;
  deal_type?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  images?: string[] | null;
  source_channel?: string | null;
};

/** Explicit-evidence broker attribution, mirroring /api/inventory's
 * deriveSegment(): source_channel broker/agent/portal markers count as
 * broker-published inventory; owner channels and ambiguous channels do
 * not. Hyphen-tolerant ('property-finder' and 'property_finder' are the
 * same channel with different spellings in the canonical data). The
 * previous implementation filtered an `ownerType` field that no canonical
 * row ever carried, which (together with a status vocabulary mismatch)
 * zeroed the query — the defect the stale-XML branch masked. */
const BROKER_CHANNEL_RE = /(broker|agent|property[-_]finder|dubizzle)/;

function isBrokerListed(row: ListingRow): boolean {
  return BROKER_CHANNEL_RE.test(String(row.source_channel || '').toLowerCase());
}

/** Sale-feed membership: the XML template renders "<type> for sale in …",
 * so rent rows must NEVER be exported (mislabelling rent as for-sale would
 * fabricate the listing's purpose). deal_type 'sale' (primary) and 'resale'
 * (secondary) are both honest for-sale listings. */
function isForSale(row: ListingRow): boolean {
  const dt = String(row.deal_type || '').toLowerCase();
  return dt === 'sale' || dt === 'resale';
}

/** SALE-PRICE PLAUSIBILITY FLOOR (2026-10-21): the priced sale/resale
 * population is bimodal — 1,206 rows under 1M EGP (the annual-rent scale
 * of these same compounds, mis-labelled as sale by ingest) vs 432 rows
 * at 5M+ EGP (real Greater Cairo master-community sale prices). Anything
 * below 2M EGP advertised as FOR SALE would misrepresent the listing on
 * a public portal (anti-fabrication §21); borderline rows stay private
 * until a human re-verifies them. Operators may lower this floor after
 * re-verification — it is an export guard, never a data mutation.
 * Enforced BOTH in-query (.gte) and in-memory (defense in depth). */
const SALE_PRICE_FLOOR_EGP = 2_000_000;

async function loadUnits(): Promise<FeedUnit[]> {
  // Canonical Supabase `listings` table — PUBLISH GATED (Phase D): only
  // verified PUBLISHABLE rows may be advertised on an external portal,
  // enforced in the query itself. STATUS VOCABULARY (2026-10-21 fix): the
  // canonical table carries status='active' (the public RLS policy's own
  // vocabulary — "Public can view active listings"); the previous
  // InventoryQueryService call asked for 'available', a value no row ever
  // carries, so the canonical query ALWAYS returned zero rows and the feed
  // was permanently empty (masked by the removed pre-generated-XML branch).
  //
  // FILTER PLACEMENT (2026-10-21): deal_type / price-floor / broker-channel
  // predicates are pushed INTO the query — the first cut scanned the whole
  // table client-side (HARD_CAP rows) and the newest-rows window could
  // entirely miss the qualifying population (verified live: the newest
  // 5,000 rows held 12 priced-for-sale broker rows, none §21-complete,
  // while the 16 exportable units sat in the older 6,532 rows).
  try {
    const supabase = getSupabase();
    // PAGINATION: PostgREST max-rows silently caps single requests at 1000
    // rows — page through with .range() (same fix /api/inventory applied
    // 2026-10-11).
    const PAGE = 1000;
    const HARD_CAP = 20_000;
    const all: FeedUnit[] = [];
    for (let from = 0; from < HARD_CAP; from += PAGE) {
      const { data, error } = await supabase
        .from('listings')
        .select(
          'id, code, ref_id, compound, location_area, city, property_type, deal_type, price, bedrooms, bathrooms, area_sqm, images, source_channel',
        )
        .eq('status', 'active')
        // PUBLISH GATE (Phase D): verified rows only leave the database.
        .eq('publish_status', 'PUBLISHABLE')
        // For-sale membership in-query: the XML renders "for sale".
        .in('deal_type', ['sale', 'resale'])
        // Sale-price plausibility floor in-query (see SALE_PRICE_FLOOR_EGP).
        .gte('price', SALE_PRICE_FLOOR_EGP)
        // Broker attribution in-query: explicit channel evidence only
        // (hyphen-tolerant property[-_]finder spelling).
        .or(
          'source_channel.ilike.*broker*,source_channel.ilike.*agent*,source_channel.ilike.*property-finder*,source_channel.ilike.*property_finder*,source_channel.ilike.*dubizzle*',
        )
        .order('updated_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as ListingRow[];
      for (const row of page) {
        if (!isBrokerListed(row)) continue; // defense in depth (query filters)
        if (!isForSale(row)) continue; // defense in depth (query filters)
        all.push({
          code: row.code || row.ref_id || row.id,
          id: row.id,
          compound: row.compound,
          location: row.location_area || undefined,
          city: row.city,
          propertyType: row.property_type,
          bedrooms: row.bedrooms,
          bath: row.bathrooms,
          area: row.area_sqm,
          price: Number(row.price) || 0,
          images: Array.isArray(row.images) ? row.images : [],
          dealType: row.deal_type,
        });
      }
      if (page.length < PAGE) break;
    }
    const units = all
      .filter((u) => Number(u.price) > 0)
      .filter((u) => Number(u.price) >= SALE_PRICE_FLOOR_EGP);
    return units;
  } catch (err) {
    logger.warn('[feeds/property-finder] Supabase query failed:', err);
  }

  // ANTI-FABRICATION / Phase D: no snapshot fallback. The snapshot rows are
  // real but UNVERIFIED — exporting them to a public portal is exactly what
  // the publish gate exists to prevent. Honest empty feed over unreviewed
  // inventory (same doctrine /api/listings applies).
  return [];
}

/**
 * Derive the city honestly from the compound vocabulary. The master-sheet
 * scope is Greater Cairo, so unrecognised compounds default to 'Cairo'
 * ONLY when they carry no known non-Cairo marker — coastal/Suez/Zayed
 * compounds resolve to their real city instead of the old blanket 'Cairo'.
 */
function deriveCity(compound: string, unitCity?: string | null): string {
  const c = (unitCity || '').trim();
  if (c) return c;
  const lower = compound.toLowerCase();
  if (/sokhna|سوخنة|azha|أزها/.test(lower)) return 'Ain Sokhna';
  if (/hacienda|marassi|north coast|الساحل|marina/.test(lower)) return 'North Coast';
  if (/sheikh zayed|زايد|6th of october|أكتوبر|october/.test(lower)) return 'Giza';
  if (/new capital|العاصمة|newcapital/.test(lower)) return 'New Administrative Capital';
  if (/shorouk|شروق/.test(lower)) return 'Cairo';
  if (/alex|إسكندرية|اسكندرية/.test(lower)) return 'Alexandria';
  return 'Cairo';
}

export async function GET() {
  // PUBLISH GATE (mandate 2026-10-20): the pre-generated-XML branch that used
  // to live here was REMOVED — it served a stale committed snapshot
  // (public/feeds/propertyfinder-feed.xml, last_update 2026-10-04, ~1,762
  // owner-scraped OWNERS-AUG26-* ads incl. price-on-application rows) BEFORE
  // the canonical query could run, so unverified units were advertised on a
  // public third-party portal and the gate above was dead code in production.
  // Draft XMLs now live in docs/drafts/propertyfinder/ (never auto-served);
  // this route only ever exports canonical, publish-gated rows.
  const units = await loadUnits();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<list>\n`;
  let exported = 0;
  let skippedIncomplete = 0;

  for (const u of units.slice(0, 1000)) {
    const reference = u.code || u.id || '';
    if (!reference) continue;
    const price = Number(u.price) > 0 ? Number(u.price) : Number(u.egpM) * 1_000_000;

    // §21: required fields must exist on the unit itself — no invented
    // 'New Cairo' / 'Apartment' / zero-bedroom placeholders.
    const compound = u.compound || u.location || null;
    const type = u.propertyType || u.type || null;
    const beds = u.bedrooms ?? u.beds;
    const baths = u.bath ?? null;
    const area = u.area ?? null;
    if (
      !(price > 0) ||
      !compound ||
      !type ||
      !(Number(beds) > 0) ||
      !(Number(baths) > 0) ||
      !(Number(area) > 0)
    ) {
      skippedIncomplete++;
      continue;
    }

    const city = deriveCity(compound, u.city);
    const images = [u.img || u.photoUrl || '', ...(Array.isArray(u.images) ? u.images : [])]
      .filter(Boolean)
      .slice(0, 10);

    xml += `  <property>\n`;
    xml += `    <reference_number>${xmlEscape(reference)}</reference_number>\n`;
    xml += `    <title_en>${xmlEscape(`${type} in ${compound}`)}</title_en>\n`;
    xml += `    <description_en>${xmlEscape(
      `${type} for sale in ${compound}${u.zone ? `, ${u.zone}` : ''}. ${Number(beds)} bedrooms, ${Number(area)} sqm. Sierra Estates inventory.`
    )}</description_en>\n`;
    xml += `    <price>${price}</price>\n`;
    xml += `    <bedroom>${Number(beds)}</bedroom>\n`;
    xml += `    <bathroom>${Number(baths)}</bathroom>\n`;
    xml += `    <size>${Number(area)}</size>\n`;
    xml += `    <property_type>${xmlEscape(type)}</property_type>\n`;
    xml += `    <city>${xmlEscape(city)}</city>\n`;
    xml += `    <community>${xmlEscape(compound)}</community>\n`;
    xml += `    <agent>\n`;
    xml += `      <name>${xmlEscape(CONTACT.name)}</name>\n`;
    xml += `      <email>${xmlEscape(CONTACT.email)}</email>\n`;
    xml += `      <phone>${xmlEscape(CONTACT.phone)}</phone>\n`;
    xml += `    </agent>\n`;
    if (images.length > 0) {
      xml += `    <photo>\n`;
      for (const img of images) {
        xml += `      <url>${xmlEscape(img)}</url>\n`;
      }
      xml += `    </photo>\n`;
    }
    xml += `  </property>\n`;
    exported++;
  }

  xml += `</list>`;

  if (skippedIncomplete > 0) {
    logger.info(
      `[feeds/property-finder] Exported ${exported} complete units; skipped ${skippedIncomplete} units lacking required fields (compound/type/beds/baths/area/price).`
    );
  }

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
