import { NextRequest, NextResponse } from 'next/server';
import { OwnerOutreachService } from '@/lib/services/OwnerOutreachService';
import { requireAdminSession } from '@/lib/server-auth-guard';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  try {
    const status = await OwnerOutreachService.getStatus();
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('[api/admin/whatsapp/owner-outreach] GET failed:', err);
    return NextResponse.json({ error: err.message || 'Failed retrieving status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'enqueue';

    if (action === 'preview') {
      const inventory = await OwnerOutreachService.loadEligibleInventory();
      const previewCount = Math.min(Number(body.limit) || 5, 20);
      const preview = inventory.slice(0, previewCount).map((item) => ({
        ...item,
        generatedMessage: require('@/lib/services/OwnerOutreachService').generateOwnerOutreachMessage(item),
      }));

      return NextResponse.json({
        success: true,
        action: 'preview',
        totalEligible: inventory.length,
        preview,
      });
    }

    if (action === 'enqueue') {
      const batchSize = Number(body.batchSize) || 40;
      const targetHourOffset = Number(body.targetHourOffset) || 0;

      const result = await OwnerOutreachService.enqueueBatch({ batchSize, targetHourOffset });

      return NextResponse.json({
        success: true,
        action: 'enqueue',
        batchSize,
        result,
        message: `Successfully enqueued ${result.enqueuedCount} owners for WhatsApp outreach.`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    logger.error('[api/admin/whatsapp/owner-outreach] POST failed:', err);
    return NextResponse.json({ error: err.message || 'Outreach operation failed' }, { status: 500 });
  }
}
