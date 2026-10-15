/**
 * GET /api/cron/uptime-check
 *
 * Pings all 4 production URLs every 5 minutes. If any return non-200,
 * sends a Telegram alert via sendTelegramMessage(). Silent on success
 * (no Telegram message to avoid noise).
 *
 * Auth: Vercel cron auth (Authorization: Bearer <CRON_SECRET>).
 */
import { NextResponse } from 'next/server';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Allow up to 30 seconds (4 URLs × ~3s timeout each)
export const maxDuration = 30;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const URLS_TO_MONITOR = [
  { name: 'Client Portal', url: 'https://sierra-estates.net/' },
  { name: 'Admin Dashboard', url: 'https://admin.sierra-estates.net/' },
  { name: 'Static Portal', url: 'https://sierra-estates-static-portal.vercel.app/' },
  { name: 'Legacy Subdomain', url: 'https://legacy.sierra-estates.net/' },
];

export async function GET(req: Request) {
  // Verify Vercel cron auth
  const authHeader = req.headers.get('authorization') || '';
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret') || '';
  const expectedSecret = process.env.CRON_SECRET;

  const authed =
    (expectedSecret && authHeader === `Bearer ${expectedSecret}`) ||
    (expectedSecret && querySecret === expectedSecret);

  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  // Check each URL in parallel
  const checks = await Promise.all(
    URLS_TO_MONITOR.map(async ({ name, url }) => {
      const start = Date.now();
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(8000),
        });
        const elapsed = Date.now() - start;
        const status = response.status;
        // 200 and 308 (permanent redirect) are OK
        const ok = status === 200 || status === 308 || (status >= 200 && status < 400);
        return { name, url, status, ok, elapsedMs: elapsed, error: null };
      } catch (err: any) {
        const elapsed = Date.now() - start;
        return { name, url, status: 0, ok: false, elapsedMs: elapsed, error: err.message };
      }
    })
  );

  const failed = checks.filter(c => !c.ok);
  const alerted = failed.length > 0;

  if (alerted) {
    const lines = failed.map(c => {
      const status = c.status === 0 ? 'NO_RESPONSE' : `HTTP ${c.status}`;
      const errPart = c.error ? ` (${c.error})` : '';
      return `  • <b>${escapeTelegramHtml(c.name)}</b>: ${status} in ${c.elapsedMs}ms${escapeTelegramHtml(errPart)}`;
    });

    const message = [
      `🚨 <b>URL Uptime Alert</b>`,
      ``,
      `${failed.length}/${URLS_TO_MONITOR.length} deployment(s) down:`,
      ...lines,
      ``,
      `⏱ ${new Date().toISOString()}`,
    ].join('\n');

    await sendTelegramMessage(message);
  }

  return NextResponse.json(
    {
      ok: true,
      alerted,
      totalChecked: checks.length,
      failures: failed.length,
      results: checks,
      timestamp: new Date().toISOString(),
    },
    { headers: NO_STORE }
  );
}
