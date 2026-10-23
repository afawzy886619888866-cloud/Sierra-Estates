'use strict';
/**
 * Workflow 10: WhatsApp Dispatch — Drains queued WhatsApp messages from Supabase.
 * ─────────────────────────────────────────────────────────────────────────────
 * Operates on Supabase `public.whatsapp_queue` using the OpenWA WhatsApp Gateway.
 * Can be run:
 *   - By the local runner or EC2 runner (`runner.js`)
 *   - On schedule via crone or direct CLI execution
 *   - Alongside or instead of the Vercel/GHA cron routes
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch {}
const { GatewayClient, normalizeChatId } = require('../lib/gateway-client');
const { requestJson } = require('../lib/gateway-client');

const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BATCH_LIMIT = parseInt(process.env.WHATSAPP_DISPATCH_BATCH || '40', 10);

function sbHeaders(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function isWithinCairoHours() {
  const activeHoursStr = process.env.WF_OUTREACH_ACTIVE_HOURS || '10-20';
  const [startHour, endHour] = activeHoursStr.split('-').map((n) => parseInt(n, 10));
  const cairoTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const currentCairoHour = parseInt(cairoTimeStr, 10);
  return currentCairoHour >= startHour && currentCairoHour < endHour;
}

async function run() {
  console.log(`[whatsapp-dispatch] Starting queue drain at ${new Date().toISOString()}`);

  if (!SB_URL || !SB_KEY) {
    console.error('[whatsapp-dispatch] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(2);
  }

  const force = String(process.env.FORCE_DISPATCH || '').trim() === '1';
  if (!force && !isWithinCairoHours()) {
    console.log('[whatsapp-dispatch] Outside operating hours (10:00-20:00 Cairo). Exiting.');
    process.exit(0);
  }

  const gateway = new GatewayClient();
  const pool = await gateway.healthyPool().catch(() => []);
  if (!pool.length && !gateway.sessionId) {
    console.warn('[whatsapp-dispatch] No active OpenWA gateway session found. Retrying next cycle.');
    process.exit(0);
  }

  // Fetch pending queued jobs
  const queryUrl = `${SB_URL}/rest/v1/whatsapp_queue?status=in.(queued,pending)&select=id,recipient_phone,message_body,scheduled_for,attempts,purpose,metadata&order=created_at.asc&limit=${BATCH_LIMIT}`;
  
  const res = await requestJson(queryUrl, { headers: sbHeaders(), timeoutMs: 15000 });
  if (!res.ok) {
    console.error(`[whatsapp-dispatch] Failed to fetch queue: HTTP ${res.status}`, res.data);
    process.exit(1);
  }

  const jobs = Array.isArray(res.data) ? res.data : [];
  if (!jobs.length) {
    console.log('[whatsapp-dispatch] No queued messages to dispatch.');
    process.exit(0);
  }

  console.log(`[whatsapp-dispatch] Found ${jobs.length} candidate jobs in queue.`);

  let sent = 0;
  let failed = 0;
  let deferred = 0;

  for (const job of jobs) {
    const phone = job.recipient_phone;
    const body = job.message_body;

    if (job.scheduled_for) {
      const scheduledTime = new Date(job.scheduled_for).getTime();
      if (!isNaN(scheduledTime) && scheduledTime > Date.now()) {
        deferred++;
        continue;
      }
    }

    // Mark job as sending
    await requestJson(`${SB_URL}/rest/v1/whatsapp_queue?id=eq.${job.id}`, {
      method: 'PATCH',
      headers: sbHeaders({ Prefer: 'return=minimal' }),
      body: { status: 'sending', updated_at: new Date().toISOString() },
    });

    try {
      console.log(`[whatsapp-dispatch] Sending to ${phone} (job ${job.id})...`);
      const sendResult = await gateway.sendText(phone, body);

      await requestJson(`${SB_URL}/rest/v1/whatsapp_queue?id=eq.${job.id}`, {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: {
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: (job.attempts || 0) + 1,
          metadata: {
            ...(typeof job.metadata === 'object' && job.metadata ? job.metadata : {}),
            sentVia: 'openwa',
            gatewaySession: sendResult.session,
          },
          updated_at: new Date().toISOString(),
        },
      });

      sent++;
      console.log(`[whatsapp-dispatch] ✓ Sent to ${phone}`);
      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      failed++;
      const errMsg = err?.message || String(err);
      console.error(`[whatsapp-dispatch] ✗ Failed for ${phone}:`, errMsg);

      const attempts = (job.attempts || 0) + 1;
      const nextStatus = attempts >= 3 ? 'failed' : 'queued';

      await requestJson(`${SB_URL}/rest/v1/whatsapp_queue?id=eq.${job.id}`, {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: {
          status: nextStatus,
          error_message: errMsg,
          attempts,
          updated_at: new Date().toISOString(),
        },
      });
    }
  }

  console.log(`[whatsapp-dispatch] Finished. Sent: ${sent}, Failed: ${failed}, Deferred: ${deferred}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[whatsapp-dispatch] Fatal error:', err);
  process.exit(1);
});
