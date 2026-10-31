import { assertDbConfigured, insertRecord } from '../lib/db';

/**
 * 03-owner-contact — owner WhatsApp outreach adapter (REAL-PROVIDER-ONLY).
 *
 * MOCK PATH REMOVED (2026-10-25): the previous revision logged "Hook sent
 * via API" with the actual fetch call commented out and then wrote a
 * `communications` row with status 'sent' — a fabricated delivery record
 * with zero provider involvement. That path is gone. This module now
 * follows the same contract as the ACTIVE production workflows
 * (workflows/03-owner-contact + workflows/09-owner-outreach):
 *
 *   1. A communication may be marked 'sent' ONLY after the OpenWA gateway
 *      (the project's real WhatsApp provider) returns HTTP 2xx for the
 *      send-text call. Anything else — network error, non-2xx, missing
 *      configuration — is an explicit failure, never a success.
 *   2. Dry-run mode is DISTINCT from a real send: it sends nothing, writes
 *      nothing, and reports status 'dry_run'.
 *   3. Unconfigured provider = the module is DISABLED by design: it returns
 *      { success: false, status: 'provider_unconfigured' } and touches no
 *      database, so an unconfigured environment can never masquerade as a
 *      working outreach channel.
 *
 * Provider contract (verified against the deployed gateway, Oct 2026 —
 * same as workflows/lib/gateway-client.js):
 *   POST {WHATSAPP_API_URL}/api/sessions/{OPENWA_SESSION_ID}/messages/send-text
 *   headers: X-API-Key: {WHATSAPP_API_TOKEN | WHATSAPP_API_KEY}
 *   body: { chatId: "<phone>@c.us", text }
 *
 * NOTE: this scaffolded package is NOT the active production entry point —
 * the EC2 workflow runner dispatches workflows/03-owner-contact/contact.js.
 * This adapter exists for library parity and must never drift back into
 * "mock success" behavior.
 */

export type OwnerContactResult = {
  success: boolean;
  status: 'sent' | 'dry_run' | 'provider_unconfigured' | 'send_failed' | 'db_unconfigured';
  providerMessageId?: string | null;
  error?: string;
  dryRun?: boolean;
  timestamp: string;
};

const HOOK_MESSAGE = 'مساء الخير، هل الوحدة متاحة؟ لدينا عملاء جاهزين.';

/** Normalize an Egyptian phone number to a @c.us chat id. */
function toChatId(phone: string): string | null {
  let p = String(phone || '').trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if (!p) return null;
  p = p.replace(/[^\d]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = `20${p}`;
  if (!/^\d{8,15}$/.test(p)) return null;
  return `${p}@c.us`;
}

export async function runOwnerContact(
  ownerPhone: string,
  propertyContext: Record<string, unknown> = {},
  opts: { dryRun?: boolean; message?: string; timeoutMs?: number } = {},
): Promise<OwnerContactResult> {
  const dryRun = opts.dryRun === true;
  const baseUrl = (process.env.WHATSAPP_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_API_KEY || '';
  const sessionId = process.env.OPENWA_SESSION_ID || '';
  const timestamp = new Date().toISOString();

  // Provider gate — fail loudly and touch nothing when unconfigured. This
  // is the "clearly disabled" state for the mock era: no send, no record.
  if (!baseUrl || !apiKey || !sessionId) {
    return { success: false, status: 'provider_unconfigured', dryRun, timestamp };
  }

  const chatId = toChatId(ownerPhone);
  if (!chatId) {
    return { success: false, status: 'send_failed', error: `unusable phone number: ${ownerPhone}`, dryRun, timestamp };
  }

  const text = opts.message ?? HOOK_MESSAGE;

  if (dryRun) {
    // DISTINCT from a real send: nothing is sent, nothing is recorded.
    return { success: true, status: 'dry_run', dryRun: true, timestamp };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
    let res: Response;
    try {
      res = await fetch(
        `${baseUrl}/api/sessions/${sessionId}/messages/send-text`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          body: JSON.stringify({ chatId, text }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // Real provider rejection — NEVER marked sent, NEVER audited as sent.
      const body = await res.text().catch(() => '');
      return {
        success: false,
        status: 'send_failed',
        error: `gateway HTTP ${res.status}: ${body.slice(0, 200)}`,
        dryRun,
        timestamp,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string; message_id?: string };

    // Audit trail — written ONLY for provider-confirmed real sends.
    if (assertDbConfigured('Owner Contact')) {
      await insertRecord('communications', {
        targetPhone: ownerPhone,
        direction: 'outbound',
        type: 'whatsapp',
        message: text,
        context: propertyContext,
        status: 'sent',
        providerMessageId: data?.id ?? data?.message_id ?? null,
        sentAt: timestamp,
      });
    }

    return {
      success: true,
      status: 'sent',
      providerMessageId: data?.id ?? data?.message_id ?? null,
      dryRun: false,
      timestamp,
    };
  } catch (error: any) {
    return { success: false, status: 'send_failed', error: error?.message ?? String(error), dryRun, timestamp };
  }
}

// Allow direct execution (honest smoke: unconfigured must refuse)
if (require.main === module) {
  runOwnerContact('201234567890', { location: 'Mivida' }).then((res) => {
    console.log(JSON.stringify(res, null, 2));
    if (res.status === 'sent' || res.status === 'dry_run') process.exit(0);
    process.exit(2); // unconfigured / failed — never reported as success
  });
}
