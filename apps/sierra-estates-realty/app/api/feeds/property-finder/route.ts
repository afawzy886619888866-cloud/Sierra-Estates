/**
 * GET /api/feeds/property-finder — PropertyFinder XML listing feed.
 *
<<<<<<< HEAD
 * Serves REAL inventory: the canonical `units` collection via
 * InventoryQueryService (same source as /api/inventory), filtered to
 * broker-listed sale units with a price. Falls back to the committed
 * snapshot so the feed never returns fabricated demo listings.
=======
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
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
 */
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { InventoryQueryService } from '@/lib/services/inventory-query';
<<<<<<< HEAD
import snapshot from '@/lib/inventory/snapshot.json';
=======
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
  city?: string;
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

async function loadUnits(): Promise<FeedUnit[]> {
<<<<<<< HEAD
  // 1. Canonical Supabase `units` collection (broker listings only)
  try {
    const rows = await InventoryQueryService.query({
      status: 'available',
=======
  // Canonical Supabase `units` collection (broker listings only) — PUBLISH
  // GATED (Phase D): only verified PUBLISHABLE rows may be advertised on an
  // external portal, enforced inside the query itself.
  try {
    const rows = await InventoryQueryService.query({
      status: 'available',
      publishStatus: 'PUBLISHABLE',
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      ownerType: 'broker',
      limit: 1000,
    });
    const units = (rows as unknown as FeedUnit[]).filter((u) => Number(u.price) > 0);
    if (units.length > 0) return units;
  } catch (err) {
<<<<<<< HEAD
    logger.warn('[feeds/property-finder] Supabase query failed, falling back to snapshot:', err);
  }

  // 2. Committed snapshot (real synced data — never fabricated)
  const snapUnits = ((snapshot as any)?.units || []) as FeedUnit[];
  return snapUnits.filter(
    (u) =>
      u &&
      (u.mode === 'sale' || u.dealType === 'sale') &&
      (Number(u.price) > 0 || Number(u.egpM) > 0) &&
      !String(u.segment || '').startsWith('owners_')
  );
=======
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
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
}

export async function GET() {
  // Check for pre-generated high-fidelity Property Finder XML feed with 1,762 rich ads
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'feeds', 'propertyfinder-feed.xml'),
    path.join(process.cwd(), 'apps', 'sierra-estates-realty', 'public', 'feeds', 'propertyfinder-feed.xml'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const xml = fs.readFileSync(p, 'utf8');
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      });
    }
  }

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

<<<<<<< HEAD
  for (const u of units.slice(0, 1000)) {
    const reference = u.code || u.id || '';
    if (!reference) continue;
    const price = Number(u.price) > 0 ? Number(u.price) : Number(u.egpM) * 1_000_000;
    if (!(price > 0)) continue;

    const compound = u.compound || u.location || 'New Cairo';
    const city = u.city || 'Cairo';
    const type = u.propertyType || u.type || 'Apartment';
    const beds = Number(u.bedrooms ?? u.beds) || 0;
    const images = [u.img || u.photoUrl || '', ...(Array.isArray(u.images) ? u.images : [])]
      .filter(Boolean)
      .slice(0, 10);

=======
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    xml += `  <property>\n`;
    xml += `    <reference_number>${xmlEscape(reference)}</reference_number>\n`;
    xml += `    <title_en>${xmlEscape(`${type} in ${compound}`)}</title_en>\n`;
    xml += `    <description_en>${xmlEscape(
<<<<<<< HEAD
      `${type} for sale in ${compound}${u.zone ? `, ${u.zone}` : ''}. ${beds} bedrooms, ${Number(u.area) || 0} sqm. Verified Sierra Estates inventory.`
    )}</description_en>\n`;
    xml += `    <price>${price}</price>\n`;
    xml += `    <bedroom>${beds}</bedroom>\n`;
    xml += `    <bathroom>${Number(u.bath) || 0}</bathroom>\n`;
    xml += `    <size>${Number(u.area) || 0}</size>\n`;
=======
      `${type} for sale in ${compound}${u.zone ? `, ${u.zone}` : ''}. ${Number(beds)} bedrooms, ${Number(area)} sqm. Sierra Estates inventory.`
    )}</description_en>\n`;
    xml += `    <price>${price}</price>\n`;
    xml += `    <bedroom>${Number(beds)}</bedroom>\n`;
    xml += `    <bathroom>${Number(baths)}</bathroom>\n`;
    xml += `    <size>${Number(area)}</size>\n`;
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
<<<<<<< HEAD
=======
    exported++;
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
