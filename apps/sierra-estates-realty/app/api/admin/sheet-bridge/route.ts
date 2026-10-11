import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetBridge } from '@/lib/services/GoogleSheetBridge';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
  try {
    const body = await req.json().catch(() => ({}));
    
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
