/**
 * GET /api/feeds/property-finder — PropertyFinder XML listing feed.
 *
 * Serves REAL inventory: the canonical `units` collection via
 * InventoryQueryService (same source as /api/inventory), filtered to
 * broker-listed sale units with a price. Falls back to the committed
 * snapshot so the feed never returns fabricated demo listings.
 */
import { NextResponse } from 'next/server';
import { InventoryQueryService } from '@/lib/services/inventory-query';
import snapshot from '@/lib/inventory/snapshot.json';
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
  // 1. Canonical Supabase `units` collection (broker listings only)
  try {
    const rows = await InventoryQueryService.query({
      status: 'available',
      ownerType: 'broker',
      limit: 1000,
    });
    const units = (rows as unknown as FeedUnit[]).filter((u) => Number(u.price) > 0);
    if (units.length > 0) return units;
  } catch (err) {
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
}

export async function GET() {
  const units = await loadUnits();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<list>\n`;

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

    xml += `  <property>\n`;
    xml += `    <reference_number>${xmlEscape(reference)}</reference_number>\n`;
    xml += `    <title_en>${xmlEscape(`${type} in ${compound}`)}</title_en>\n`;
    xml += `    <description_en>${xmlEscape(
      `${type} for sale in ${compound}${u.zone ? `, ${u.zone}` : ''}. ${beds} bedrooms, ${Number(u.area) || 0} sqm. Verified Sierra Estates inventory.`
    )}</description_en>\n`;
    xml += `    <price>${price}</price>\n`;
    xml += `    <bedroom>${beds}</bedroom>\n`;
    xml += `    <bathroom>${Number(u.bath) || 0}</bathroom>\n`;
    xml += `    <size>${Number(u.area) || 0}</size>\n`;
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
  }

  xml += `</list>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
