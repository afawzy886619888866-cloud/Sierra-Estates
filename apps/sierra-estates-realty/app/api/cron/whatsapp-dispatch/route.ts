import { NextRequest, NextResponse } from 'next/server';
import { drainWhatsAppQueue } from '@/lib/server/whatsapp-drain';
import { verifyCronRequest } from '@/lib/server/cron-auth';

/**
 * CRON: WhatsApp dispatch worker.
 *
 * End-to-end Supabase architecture:
 * This worker drains `public.whatsapp_queue` in Supabase Postgres, and both
 * the enqueue side (`enqueueWhatsAppJob` in `lib/server/whatsapp-queue.ts`) and
 * the sender-number quota bookkeeping (`ensureNumbersSeeded` / `claimEligibleNumber`,
 * backed by `public.whatsapp_numbers`) operate authoritatively on Supabase Postgres.
 *
 * Drains the queue subject to operating hours (12:00–20:00 Africa/Cairo,
 * see DEFAULT_OUTREACH_CONFIG) and per-number quota (40/hour window,
 * 80/day across the senders). The heavy lifting lives in
 * lib/server/whatsapp-drain.ts so the daily sync-leads cron can piggyback
 * the same drain — with GitHub Actions disabled and both Hobby Vercel cron
 * slots taken, that piggyback is what guarantees a daily drain.
 */
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    const summary = await drainWhatsAppQueue();
    return NextResponse.json({ success: true, ...summary });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'dispatch failed' },
      { status: 500 },
    );
  }
}
