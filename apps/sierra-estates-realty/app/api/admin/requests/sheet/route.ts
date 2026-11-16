import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import {
  getRequestsSpreadsheetRows,
  syncRequestToSheet,
  loadLocalRequestsMirror,
  saveLocalRequestsMirror,
  type RequestSheetRow,
} from '@/lib/services/RequestSheetSyncService';
import {
  getCareersSpreadsheetRows,
  syncCareerToSheet,
  loadLocalCareersMirror,
  saveLocalCareersMirror,
  type CareerSheetRow,
} from '@/lib/services/CareerSheetSyncService';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const tab = request.nextUrl.searchParams.get('tab') || 'requests';

    const sheetUrl =
      process.env.SHEETS_SPREADSHEET_URL ||
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';

    if (tab === 'careers') {
      const careerRows = await getCareersSpreadsheetRows();
      const stats = {
        total: careerRows.length,
        salesCount: careerRows.filter((r) => r.role === 'sales').length,
        adminCount: careerRows.filter((r) => r.role === 'admin').length,
        withVehicle: careerRows.filter((r) => r.hasVehicle).length,
        withCv: careerRows.filter((r) => Boolean(r.cvUrl)).length,
        newCount: careerRows.filter((r) => r.status === 'new' || r.status === 'pending_review').length,
        reviewedCount: careerRows.filter((r) => r.status === 'reviewed').length,
        hiredCount: careerRows.filter((r) => r.status === 'hired').length,
      };

      return NextResponse.json({
        ok: true,
        tab: 'careers',
        rows: careerRows,
        stats,
        sheetUrl,
        sheetTab: 'Career_Applications',
        updatedAt: new Date().toISOString(),
      });
    }

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

    return NextResponse.json({
      ok: true,
      tab: 'requests',
      rows,
      stats,
      sheetUrl,
      sheetTab: 'Client_Requests',
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[API_REQUESTS_SHEET] GET Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to load spreadsheet' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { action, tab = 'requests', id, status, requestData, careerData } = body;

    if (action === 'update_status' && id && status) {
      if (tab === 'careers') {
        const rows = loadLocalCareersMirror();
        const target = rows.find((r) => r.id === id);
        if (target) {
          target.status = status;
          saveLocalCareersMirror(rows);
        }
        return NextResponse.json({ ok: true, message: `Career status updated to ${status}` });
      } else {
        const rows = loadLocalRequestsMirror();
        const target = rows.find((r) => r.id === id);
        if (target) {
          target.status = status;
          saveLocalRequestsMirror(rows);
        }
        return NextResponse.json({ ok: true, message: `Request status updated to ${status}` });
      }
    }

    if (action === 'sync_sheet') {
      if (tab === 'careers') {
        const rows = await getCareersSpreadsheetRows();
        let syncedCount = 0;
        for (const row of rows.slice(0, 30)) {
          await syncCareerToSheet(row);
          syncedCount++;
        }
        return NextResponse.json({ ok: true, synced: syncedCount, tab: 'careers' });
      } else {
        const rows = await getRequestsSpreadsheetRows();
        let syncedCount = 0;
        for (const row of rows.slice(0, 30)) {
          await syncRequestToSheet(row);
          syncedCount++;
        }
        return NextResponse.json({ ok: true, synced: syncedCount, tab: 'requests' });
      }
    }

    if (action === 'add' && requestData) {
      const result = await syncRequestToSheet(requestData);
      return NextResponse.json({ ok: true, result });
    }

    if (action === 'add_career' && careerData) {
      const result = await syncCareerToSheet(careerData);
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    logger.error('[API_REQUESTS_SHEET] POST Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to process spreadsheet request' },
      { status: 500 }
    );
  }
}
