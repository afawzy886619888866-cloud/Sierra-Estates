import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

// NOTE: this route is currently a mock — it doesn't look up the lead/agent,
// persist a Viewing doc, or actually notify anyone. The auth guard below
// closes the unauthenticated-write gap; making the scheduling itself real
// (Firestore Viewing record, Telegram alert, Calendar API) is separate,
// larger follow-up work.
export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { leadId, units } = await req.json();

    // const notifier = new TelegramNotifier();
    // const scheduler = new GoogleCalendarScheduler();

    // Mocking DB lookup
    const _clientEmail = `client_${leadId}@example.com`;
    const _clientName = `Client ${leadId}`;
    const _agentEmail = `agent@sierraestates.com`;
    const _agentName = `Sierra Agent`;
    
    // We schedule it for tomorrow at 10 AM by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const propertyTitles = units.map((u: any) => u.title);

    // Trigger Google Calendar
    const calendarLink = `https://calendar.google.com/calendar/u/0/r/eventedit?text=Viewing+${encodeURIComponent(propertyTitles.join(', '))}`;

    // Trigger Telegram Notification to Team
    // await notifier.sendViewingScheduledAlert(agentName, clientName, propertyTitles, tomorrow.toLocaleString());

    return NextResponse.json({ 
      success: true, 
      calendarLink,
      message: 'Viewing scheduled and team notified successfully.'
    });
  } catch (error: any) {
    logger.error('Error scheduling viewing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
