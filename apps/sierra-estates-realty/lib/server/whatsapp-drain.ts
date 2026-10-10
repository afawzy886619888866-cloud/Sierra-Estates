import 'server-only';
import { listRecords, updateRecord } from '@sierra-estates/db';
import { sendWhatsApp, getConfiguredWhatsAppProvider, getTwilioStatusCallbackUrl } from '@/lib/server/twilio-client';
import {
  getOutreachConfig,
  isWithinOperatingHours,
  ensureNumbersSeeded,
  claimEligibleNumber,
  type ClaimedNumber,
} from '@/lib/server/whatsapp-queue';
import {
  CAIRO_PLAZA_DISCLAIMER_AR,
  mentionsCairoPlaza,
  withCairoPlazaNotice,
} from '@/lib/server/cairo-plaza-notice';
import { logger } from '@/lib/logger';

/**
 * Purposes that are business-to-business (owner-side) threads. Per the
 * disclaimer policy (announcement/DISCLAIMER-POLICY.md) and the Task-14
 * precedent in AvailabilityVerificationService, B2B owner negotiations stay
 * unwrapped — the mandatory Cairo Plaza notice applies to client-facing
 * marketing and auto-replies, not broker-to-owner negotiation pings.
 */
const NOTICE_EXEMPT_PURPOSES = new Set(['owner-negotiation']);

/** Client-facing marketing purposes — ALWAYS carry the notice, mention or not. */
const NOTICE_ALWAYS_PURPOSES = new Set(['campaign-broadcast', 'custom-outreach']);

/**
 * Transport-level defense-in-depth: guarantees the mandatory Cairo Plaza
 * Booking & Contracting notice rides on the bottom of every client-facing
 * queued message that leaves through the drain. Services that already wrap
 * their replies (AvailabilityVerificationService, the WhatsApp webhook) are
 * idempotent here — the exact-text check below skips them. Char-for-char
 * canonical text comes from announcement/DISCLAIMER.txt via cairo-plaza-notice.
 */
export function enforceOutreachNotice(
  purpose: string | null | undefined,
  body: string,
  contextText?: string | null,
): string {
  const raw = String(body ?? '');
  if (!raw) return raw;
  if (purpose && NOTICE_EXEMPT_PURPOSES.has(purpose)) return raw;
  if (raw.includes(CAIRO_PLAZA_DISCLAIMER_AR)) return raw; // already wrapped upstream
  const campaign = String(contextText ?? '');
  const always = purpose ? NOTICE_ALWAYS_PURPOSES.has(purpose) : false;
  if (always || mentionsCairoPlaza(raw) || mentionsCairoPlaza(campaign)) {
    return withCairoPlazaNotice(raw);
  }
  return raw;
}

/**
 * WhatsApp queue drain — the actual dispatch worker body, shared by two
 * triggers so the queue can never become orphaned:
 *
 *   1. /api/cron/whatsapp-dispatch  (manual / external schedulers)
 *   2. /api/cron/sync-leads         (the daily Vercel cron piggybacks the drain
 *      right after importing fresh PF leads — Hobby caps Vercel crons at 2 per
 *      project and both slots are taken, and the GitHub Actions schedules are
 *      disabled by the account spending limit, so this piggyback is what keeps
 *      the queue draining every day inside the outreach window).
 *
 * Sends are subject to the operating-hours window (12:00–20:00 Africa/Cairo by
 * default) and per-sender quota; anything that does not fit in this run stays
 * 'queued' and rolls into the next trigger.
 */

export const MAX_PER_RUN = 80;

/**
 * Gateway-mode rate caps (WHATSAPP_PROVIDER=openwa). The gateway historically
 * sent from ONE paired device — the Sierra Estates number — so the 4-sender
 * WABA quota model did not apply. With the 4-line pool (Oct 2026) the caps
 * remain GLOBAL counters derived from the queue itself (sent rows since the
 * window start — stateless and crash-safe): scale gatewayHourlyCap /
 * gatewayDailyCap in system_config whatsapp_outreach once the extra lines are
 * linked (e.g. 80/hr · 320/day for 4 lines). Per-line fairness is handled by
 * the round-robin in the gateway client; per-line caps land in v2 using the
 * metadata.gatewaySession stamp. Both caps are overridable through
 * system_config whatsapp_outreach as the numbers warm up.
 */
const GATEWAY_HOURLY_CAP_DEFAULT = 20;
const GATEWAY_DAILY_CAP_DEFAULT = 80;

async function countSentSince(sinceIso: string): Promise<number> {
  const rows = await listRecords<{ id: string }>('whatsapp_queue', {
    where: [
      { column: 'status', value: 'sent' },
      { column: 'sentAt', op: 'gte', value: sinceIso },
    ],
    limit: 1000,
    select: 'id',
  });
  return rows.length;
}

export interface WhatsAppDrainSummary {
  skipped?: string;
  processed: number;
  sent: number;
  failed: number;
  skippedQuota: number;
  deferredScheduled: number;
  timestamp: string;
}

export async function drainWhatsAppQueue(): Promise<WhatsAppDrainSummary> {
  const config = await getOutreachConfig();
  const provider = getConfiguredWhatsAppProvider();

  if (!isWithinOperatingHours(config)) {
    return {
      skipped: 'outside-operating-hours',
      processed: 0,
      sent: 0,
      failed: 0,
      skippedQuota: 0,
      deferredScheduled: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Gateway mode: ONE paired sender, quota counted from the queue itself.
  // Legacy mode: seed + claim from the 4 WABA sender rows as before.
  const gatewayMode = provider === 'openwa';
  if (gatewayMode) {
    const hourAgoIso = new Date(Date.now() - 60 * 60_000).toISOString();
    const dayStartCairoIso = (() => {
      // Start of today in Africa/Cairo expressed as a UTC instant: take now,
      // shift by the Cairo offset (+02:00/+03:00 via Intl), floor to midnight.
      const nowMs = Date.now();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: config.timezone || 'Africa/Cairo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).formatToParts(new Date(nowMs));
      const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
      const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
      const offsetMs = asUtc - nowMs;
      return new Date(nowMs - offsetMs - (nowMs - offsetMs) % 86_400_000).toISOString();
    })();

    const [sentLastHour, sentToday] = await Promise.all([
      countSentSince(hourAgoIso),
      countSentSince(dayStartCairoIso),
    ]);
    const hourlyCap = (config as unknown as Record<string, unknown>).gatewayHourlyCap as number | undefined ?? GATEWAY_HOURLY_CAP_DEFAULT;
    const dailyCap = (config as unknown as Record<string, unknown>).gatewayDailyCap as number | undefined ?? GATEWAY_DAILY_CAP_DEFAULT;

    if (sentLastHour >= hourlyCap || sentToday >= dailyCap) {
      logger.warn(`[whatsapp-drain] gateway quota reached (hour ${sentLastHour}/${hourlyCap}, day ${sentToday}/${dailyCap})`);
      return {
        skipped: 'gateway-quota-reached',
        processed: 0,
        sent: 0,
        failed: 0,
        skippedQuota: 1,
        deferredScheduled: 0,
        timestamp: new Date().toISOString(),
      };
    }
  } else {
    await ensureNumbersSeeded(config);
  }

  const statusCallback = getTwilioStatusCallbackUrl();

  const queued = await listRecords<Record<string, any>>('whatsapp_queue', {
    where: [{ column: 'status', value: 'queued' }],
    limit: MAX_PER_RUN,
  });

  let sent = 0;
  let failed = 0;
  let skippedQuota = 0;
  let deferredScheduled = 0;
  const nowMs = Date.now();

  for (const job of queued) {
    // If job is scheduled for a future time/date, leave it queued for later dispatch
    if (job.scheduledFor) {
      const scheduledTimeMs = typeof job.scheduledFor?.toMillis === 'function'
        ? job.scheduledFor.toMillis()
        : new Date(job.scheduledFor).getTime();

      if (!isNaN(scheduledTimeMs) && scheduledTimeMs > nowMs) {
        deferredScheduled++;
        continue;
      }
    }

    let claim: ClaimedNumber | null = null;
    if (!gatewayMode) {
      claim = await claimEligibleNumber(config);
      if (!claim) {
        // No sender has remaining quota this window — leave the rest queued.
        skippedQuota = queued.length - sent - failed;
        break;
      }
    }
    await updateRecord('whatsapp_queue', job.id, {
      status: 'sending',
      ...(claim ? { assignedNumberId: claim.id } : {}),
      updatedAt: new Date().toISOString(),
    });

    try {
      // Disclaimer choke point — see enforceOutreachNotice above. Campaign name
      // (when the job was enqueued through /api/admin/whatsapp/schedule) rides
      // in templateParams/metadata; it participates in the mention evidence.
      const campaignName: string | undefined =
        job.templateParams?.campaignName ?? job.metadata?.campaignName ?? undefined;
      const outboundBody = enforceOutreachNotice(job.purpose, job.messageBody, campaignName);

      const result = await sendWhatsApp(
        gatewayMode ? '' : claim!.e164Phone,
        job.recipientPhone,
        outboundBody,
        statusCallback,
        // 4-line pool: system_config whatsapp_outreach.gatewaySessions (names
        // or UUIDs). Undefined/empty ⇒ the gateway client keeps today's
        // single-session behavior — the pool is fully config-driven.
        gatewayMode
          ? { gatewaySessions: (config as unknown as Record<string, unknown>).gatewaySessions as string[] | undefined }
          : undefined,
      );
      await updateRecord('whatsapp_queue', job.id, {
        status: 'sent',
        twilioMessageSid: result.sid,
        sentAt: new Date().toISOString(),
        attempts: (job.attempts ?? 0) + 1,
        // Observability: record the real delivering channel on the job so the
        // admin outbox can show openwa vs twilio vs simulated per message —
        // and with the 4-line pool, WHICH line carried it (metadata.gatewaySession).
        metadata: {
          ...(typeof job.metadata === 'object' && job.metadata ? job.metadata : {}),
          sentVia: result.provider || 'unknown',
          ...(result.session ? { gatewaySession: result.session } : {}),
        },
        updatedAt: new Date().toISOString(),
      });
      sent++;
    } catch (err: any) {
      await updateRecord('whatsapp_queue', job.id, {
        status: 'failed',
        errorMessage: err?.message || String(err),
        attempts: (job.attempts ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      });
      failed++;
      logger.error(`[whatsapp-drain] send failed for job ${job.id}:`, err);
    }
  }

  return {
    processed: sent + failed,
    sent,
    failed,
    skippedQuota,
    deferredScheduled,
    timestamp: new Date().toISOString(),
  };
}

// ─── Webhook piggyback drain ─────────────────────────────────────────

let piggybackInFlight = false;

/**
 * Fire-and-forget drain triggered by inbound WhatsApp traffic.
 *
 * Both Hobby Vercel cron slots are taken (night/morning windows) and GitHub
 * Actions schedules are disabled by the account spending limit, so between
 * the daily sync-leads piggyback and external cron pings the queue could sit
 * up to a full day even when jobs are DUE. Every inbound WhatsApp webhook hit
 * now opportunistically drains due jobs ~2s later (same serverless invocation
 * lifetime permitting), which makes scheduled sends dispatch within seconds
 * of any live conversation — exactly when the operating-hours window is open.
 *
 * Guarded by a module-level in-flight flag so a burst of inbound messages
 * cannot stampede the queue; the scheduled cron remains the authoritative
 * drain. Never throws.
 */
export function piggybackWhatsAppDrain(delayMs = 2000): void {
  if (piggybackInFlight) return;
  piggybackInFlight = true;
  const timer = setTimeout(() => {
    piggybackInFlight = false;
    drainWhatsAppQueue()
      .then((summary) => {
        if (summary.processed > 0) {
          logger.info(`[whatsapp-drain] piggyback drain: ${summary.sent} sent, ${summary.failed} failed`);
        }
      })
      .catch((err) => logger.debug(`[whatsapp-drain] piggyback skipped: ${err?.message}`));
  }, delayMs);
  // Don't hold the serverless event loop open just for this — if the
  // invocation ends first, the next trigger (cron / next webhook) drains.
  timer.unref?.();
}
