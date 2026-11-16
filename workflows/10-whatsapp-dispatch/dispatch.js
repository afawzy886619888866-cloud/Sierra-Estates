'use strict';
/**
 * Workflow 10: WhatsApp Dispatch — Drains queued WhatsApp messages from Supabase.
 * ─────────────────────────────────────────────────────────────────────────────
 * Operates on Supabase `public.whatsapp_queue` using the OpenWA WhatsApp Gateway.
 * Honors `.state/owner-outreach-optouts.jsonl` suppression and emits structured
 * `SUMMARY {...}` telemetry on every exit-0 path for `workflows/runner.js`.
 */
const path = require('path');
const { loadWorkflowEnv } = require('../lib/google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));
const { GatewayClient, requestJson } = require('../lib/gateway-client');
const { loadOptOutSet } = require('../lib/inbox');
const { toLocalPhone } = require('../lib/phone-utils');

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
  const summary = {
    candidates: 0,
    sent: 0,
    failed: 0,
    deferred: 0,
    skippedOptOut: 0,
    skippedHours: false,
    gatewayOffline: false,
  };

  console.log(`[whatsapp-dispatch] Starting queue drain at ${new Date().toISOString()}`);

  if (!SB_URL || !SB_KEY) {
    console.error('[whatsapp-dispatch] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(2);
  }

  const force = String(process.env.FORCE_DISPATCH || '').trim() === '1';
  if (!force && !isWithinCairoHours()) {
    summary.skippedHours = true;
    console.log('[whatsapp-dispatch] Outside operating hours (10:00-20:00 Cairo). Exiting.');
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }

  const gateway = new GatewayClient();
  const pool = await gateway.healthyPool().catch(() => []);
  if (!pool.length && !gateway.sessionId) {
    summary.gatewayOffline = true;
    console.warn('[whatsapp-dispatch] No active OpenWA gateway session found. Retrying next cycle.');
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }

  const queryUrl = `${SB_URL}/rest/v1/whatsapp_queue?status=in.(queued,pending)&select=id,recipient_phone,message_body,scheduled_for,attempts,purpose,metadata&order=created_at.asc&limit=${BATCH_LIMIT}`;

  const res = await requestJson(queryUrl, { headers: sbHeaders(), timeoutMs: 15000 });
  if (!res.ok) {
    console.error(`[whatsapp-dispatch] Failed to fetch queue: HTTP ${res.status}`, res.data);
    process.exit(1);
  }

  const jobs = Array.isArray(res.data) ? res.data : [];
  summary.candidates = jobs.length;
  if (!jobs.length) {
    console.log('[whatsapp-dispatch] No queued messages to dispatch.');
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }

  console.log(`[whatsapp-dispatch] Found ${jobs.length} candidate jobs in queue.`);
  const optedOut = loadOptOutSet();

  for (const job of jobs) {
    const phone = String(job.recipient_phone || '');
    const digits = phone.replace(/\D/g, '');
    const body = job.message_body;

    // Strict safety check: Never dispatch to group JIDs or invalid numbers
    if (phone.includes('@g.us') || phone.startsWith('120363') || digits.length > 15 || digits.length < 9) {
      summary.failed++;
      console.warn(`[whatsapp-dispatch] 🛑 Safety guard: blocked dispatch to group/invalid number ${phone} (job ${job.id})`);
      await requestJson(`${SB_URL}/rest/v1/whatsapp_queue?id=eq.${job.id}`, {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: { status: 'failed', error_message: 'rejected_group_recipient_safety_guard', updated_at: new Date().toISOString() },
      }).catch(() => null);
      continue;
    }

    if (digits && optedOut.has(digits)) {
      summary.skippedOptOut++;
      await requestJson(`${SB_URL}/rest/v1/whatsapp_queue?id=eq.${job.id}`, {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: {
          status: 'cancelled',
          error_message: 'recipient_opted_out',
          updated_at: new Date().toISOString(),
        },
      }).catch(() => null);
      continue;
    }

    if (job.scheduled_for) {
      const scheduledTime = new Date(job.scheduled_for).getTime();
      if (!isNaN(scheduledTime) && scheduledTime > Date.now()) {
        summary.deferred++;
        continue;
      }
    }

    await requestJson(`${SB_URL}/rest/v1/whatsapp_queue?id=eq.${job.id}`, {
      method: 'PATCH',
      headers: sbHeaders({ Prefer: 'return=minimal' }),
      body: { status: 'sending', updated_at: new Date().toISOString() },
    });

    try {
      console.log(`[whatsapp-dispatch] Sending to ${toLocalPhone(phone)} (job ${job.id})...`);
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

      summary.sent++;
      console.log(`[whatsapp-dispatch] ✓ Sent to ${toLocalPhone(phone)}`);
      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      summary.failed++;
      const errMsg = err?.message || String(err);
      console.error(`[whatsapp-dispatch] ✗ Failed for ${toLocalPhone(phone)}:`, errMsg);

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

  console.log(`[whatsapp-dispatch] Finished. Sent: ${summary.sent}, Failed: ${summary.failed}, Deferred: ${summary.deferred}, OptedOut: ${summary.skippedOptOut}`);
  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[whatsapp-dispatch] Fatal error:', err);
  process.exit(1);
});
