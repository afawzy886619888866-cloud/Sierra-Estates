import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { redactOwnerCsv } from '@/lib/server/owner-privacy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'downloads', 'owners-resale.csv');
    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf-8');
      // Section D (2026-10-27): defense-in-depth — the tracked files are
      // redacted at rest, but the serving route ALSO redacts owner contact
      // columns itself (concierge doctrine) so a regenerated raw file can
      // never leak owner phones through this route again.
      const redacted = redactOwnerCsv(csvData);
      return new NextResponse(redacted, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'inline; filename="owners-resale.csv"',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      });
    }

    return new NextResponse('Error: CSV file not found', { status: 404 });
  } catch (err: any) {
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}
