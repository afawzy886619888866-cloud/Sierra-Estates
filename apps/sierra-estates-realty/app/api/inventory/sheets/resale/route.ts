import { serveInventorySheetCsv } from '@/lib/server/inventory-sheet-csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return serveInventorySheetCsv('resale');
}
