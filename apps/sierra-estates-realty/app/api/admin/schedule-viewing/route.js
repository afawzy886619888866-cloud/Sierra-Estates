import { NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { scheduleViewing } from '@/lib/services/viewing-engine';
import { logger } from '@/lib/logger';








export async function POST(req) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { leadId, units } = (await req.json()) ;

    if (!leadId || !Array.isArray(units) || units.length === 0) {
      return NextResponse.json({ error: 'leadId and at least one unit are required' }, { status: 400 });
    }

    // We schedule it for tomorrow at 10 AM by default
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);

    const agentId = authResult.uid || 'admin';

    const viewingIds = await Promise.all(
      units.map((unit) => {
        const unitId = unit.id || unit.code || unit.unitId;
        if (!unitId) {
          throw new Error(`Unit is missing an id/code: ${JSON.stringify(unit)}`);
        }
        return scheduleViewing(leadId, unitId, agentId, scheduledAt);
      })
    );

    const propertyTitles = units.map((u) => u.title).filter(Boolean);
    const calendarLink = `https://calendar.google.com/calendar/u/0/r/eventedit?text=Viewing+${encodeURIComponent(propertyTitles.join(', '))}`;

    return NextResponse.json({
      success: true,
      viewingIds,
      calendarLink,
      scheduledAt: scheduledAt.toISOString(),
      message: 'Viewing scheduled and team notified successfully.',
    });
  } catch (error) {
    logger.error('Error scheduling viewing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
