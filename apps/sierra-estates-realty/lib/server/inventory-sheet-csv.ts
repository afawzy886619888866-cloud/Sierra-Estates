import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@sierra-estates/db';
import { redactOwnerCsv } from '@/lib/server/owner-privacy';

export type InventorySheetMode = 'all' | 'rent' | 'resale';

const CSV_HEADERS = [
  'Code',
  'Title',
  'Compound',
  'Zone',
  'PropertyType',
  'DealType',
  'PriceEGP',
  'AreaSqm',
  'Bedrooms',
  'Bathrooms',
  'Finishing',
  'Status',
  'UpdatedAt',
] as const;

interface PublicSheetListingRow {
  ref_id: string | null;
  title: string | null;
  compound: string | null;
  location: string | null;
  property_type: string | null;
  deal_type: string | null;
  price: number | null;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  finishing_type: string | null;
  status: string | null;
  updated_at: string | null;
}

function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvHeaders(mode: InventorySheetMode, source: string): Record<string, string> {
  const filename = mode === 'all' ? 'owners-all.csv' : `owners-${mode}.csv`;
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, s-maxage=300',
    'X-Inventory-Source': source,
  };
}

/**
 * Serve redacted public inventory CSV for `all`, `rent`, or `resale`.
 * Uses local CSV when present (dev/test fixture), otherwise queries live
 * Supabase `listings` (sole system of record) on Cloudflare Workers with
 * strict PUBLISHABLE + privacy-redacted columns only.
 */
export async function serveInventorySheetCsv(mode: InventorySheetMode): Promise<NextResponse> {
  try {
    const filename = `owners-${mode}.csv`;
    const csvPath = path.join(process.cwd(), 'public', 'downloads', filename);
    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf-8');
      return new NextResponse(redactOwnerCsv(csvData), {
        status: 200,
        headers: csvHeaders(mode, 'local-file'),
      });
    }

    if (!isSupabaseAdminConfigured()) {
      return new NextResponse('Service Unavailable: Supabase admin credentials not configured', {
        status: 503,
      });
    }

    let query = getSupabaseAdmin()
      .from('listings')
      .select(
        'ref_id,title,compound,location,property_type,deal_type,price,area_sqm,bedrooms,bathrooms,finishing_type,status,updated_at',
      )
      .eq('publish_status', 'PUBLISHABLE')
      .in('status', ['active', 'available'])
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (mode === 'rent') {
      query = query.ilike('deal_type', '%rent%');
    } else if (mode === 'resale') {
      query = query.in('deal_type', ['sale', 'resale', 'Sale', 'Resale']);
    }

    const { data, error } = await query;
    if (error) {
      return new NextResponse(`Supabase sheet export error: ${error.message}`, { status: 502 });
    }

    const rows = (Array.isArray(data) ? data : []) as PublicSheetListingRow[];
    const csvLines: string[] = [CSV_HEADERS.join(',')];
    for (const row of rows) {
      csvLines.push(
        [
          row.ref_id ?? '',
          row.title ?? '',
          row.compound ?? '',
          row.location ?? '',
          row.property_type ?? '',
          row.deal_type ?? '',
          row.price ?? '',
          row.area_sqm ?? '',
          row.bedrooms ?? '',
          row.bathrooms ?? '',
          row.finishing_type ?? '',
          row.status ?? '',
          row.updated_at ?? '',
        ]
          .map(escapeCsvCell)
          .join(','),
      );
    }

    const safeCsv = redactOwnerCsv(`${csvLines.join('\n')}\n`);
    return new NextResponse(safeCsv, {
      status: 200,
      headers: csvHeaders(mode, 'supabase'),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Error: ${msg}`, { status: 500 });
  }
}
