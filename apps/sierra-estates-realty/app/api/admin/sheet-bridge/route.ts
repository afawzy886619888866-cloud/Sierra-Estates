import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetBridge } from '@/lib/services/GoogleSheetBridge';
import { SheetsIntegrationService } from '@/lib/services/SheetsIntegrationService';
import { verifyAdminRequest } from '@/lib/server/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // P0 7.3: admin route — authenticated staff only (previously unguarded,
  // flagged by the action-routing governance suite).
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || process.env.INVENTORY_SHEET_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return NextResponse.json({
        configured: false,
        message: 'GOOGLE_APPS_SCRIPT_WEBHOOK_URL is not set in environment.',
        help: 'Deploy Apps Script as Web app (Anyone) and set GOOGLE_APPS_SCRIPT_WEBHOOK_URL in .env.local',
      }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const compound = searchParams.get('compound') || undefined;
    const mode = (searchParams.get('mode') as 'Rent' | 'Sale') || undefined;

    const units = await GoogleSheetBridge.searchUnits({
      compound,
      mode,
      limit: 10,
    });

    return NextResponse.json({
      configured: true,
      webhookUrl: webhookUrl.replace(/(.{20}).+(.{10})/, '$1...$2'), // Masked for safety
      count: units.length,
      sampleUnits: units,
    });
  } catch (err: any) {
    return NextResponse.json({
      configured: false,
      error: err.message,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // P0 7.3: admin route — authenticated staff only.
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').toLowerCase();

    if (action === 'reset_outreach') {
      const resetResult = await SheetsIntegrationService.resetOutreachStatus();
      return NextResponse.json({
        success: true,
        action: 'reset_outreach',
        resetCount: resetResult.resetCount,
        lockedCount: resetResult.lockedCount,
      });
    }

    if (action === 'mirror_real_available') {
      const mirrorResult = await SheetsIntegrationService.mirrorRealAvailableUnits();
      return NextResponse.json({
        success: true,
        action: 'mirror_real_available',
        mirroredCount: mirrorResult.mirroredCount,
        removedCount: mirrorResult.removedCount,
      });
    }

    if (action === 'sync_unit' && body.unit) {
      const syncResult = await SheetsIntegrationService.syncUnitToMaster(body.unit);
      return NextResponse.json(syncResult);
    }
    
    // Test push
    const testUnit = body.unit || {
      code: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      compound: 'Mivida',
      propertyType: 'apartment',
      mode: 'Rent' as const,
      price: 45000,
      bedrooms: 3,
      space: 185,
      mediaUrls: ['https://gaxfqcietzoonlmatiot.supabase.co/storage/v1/object/public/property-media/sample.jpg'],
      notes: 'Test ping from Sierra Admin Bridge',
    };

    const result = await GoogleSheetBridge.pushUnitToSheet(testUnit);

    return NextResponse.json({
      success: result.success,
      code: result.code,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
