import { NextRequest, NextResponse } from 'next/server';
import {
  getRequestsSpreadsheetRows,
  syncRequestToSheet,
  loadLocalRequestsMirror,
  saveLocalRequestsMirror,
  type RequestSheetRow,
} from '@/lib/services/RequestSheetSyncService';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rows = await getRequestsSpreadsheetRows();

    const stats = {
      total: rows.length,
      buyerDemands: rows.filter((r) => r.type === 'buyer_demand').length,
      viewingRequests: rows.filter((r) => r.type === 'viewing_request').length,
      campaigns: rows.filter((r) => Boolean(r.campaign || r.voucherCode)).length,
      newCount: rows.filter((r) => r.status === 'new').length,
      contactedCount: rows.filter((r) => r.status === 'contacted').length,
      scheduledCount: rows.filter((r) => r.status === 'viewing_scheduled').length,
    };

    const sheetUrl =
      process.env.SHEETS_SPREADSHEET_URL ||
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';

    return NextResponse.json({
      ok: true,
      rows,
      stats,
      sheetUrl,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[API_REQUESTS_SHEET] GET Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to load requests spreadsheet' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, status, requestData } = body;

    if (action === 'update_status' && id && status) {
      const rows = loadLocalRequestsMirror();
      const target = rows.find((r) => r.id === id);
      if (target) {
        target.status = status;
        saveLocalRequestsMirror(rows);
      }
      return NextResponse.json({ ok: true, message: `Status updated to ${status}` });
    }

    if (action === 'sync_sheet') {
      const rows = await getRequestsSpreadsheetRows();
      let syncedCount = 0;
      for (const row of rows.slice(0, 20)) {
        await syncRequestToSheet(row);
        syncedCount++;
      }
      return NextResponse.json({ ok: true, synced: syncedCount });
    }

    if (action === 'add' && requestData) {
      const result = await syncRequestToSheet(requestData);
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    logger.error('[API_REQUESTS_SHEET] POST Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
