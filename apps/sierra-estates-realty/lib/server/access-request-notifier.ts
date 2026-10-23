import 'server-only';
import { escapeTelegramHtml } from '@/lib/telegram';
import { logger } from '@/lib/logger';

/**
 * SIERRA ESTATES 3.0 — ACCESS APPROVAL NOTIFICATIONS (Phase 1 extension)
 *
 * Every durable access event now notifies the operations staff through the
 * internal Telegram admin chat:
 *
 *   • a NEW Google OAuth / Magic-Link access request  → admin alert, so the
 *     super-admin approval queue never silently waits;
 *   • an APPROVED / DENIED decision                   → admin confirmation
 *     with the granted role and the deciding operator.
 *
 * Delivery contract (§21 anti-fabrication):
 *  - Target chat is TELEGRAM_ADMIN_CHAT_ID ONLY. It is NEVER defaulted to
 *    TELEGRAM_CHAT_ID / @SierraEstatesNewCairo — access requests carry staff
 *    PII and must never reach the public listings channel.
 *  - No TELEGRAM_BOT_TOKEN or no admin chat → the notification is honestly
 *    reported as not attempted (`channel: 'log-only'`, exact gap logged);
 *    the durable request/decision in Supabase remains the source of truth.
 *  - The notifier NEVER throws — a notification failure can never break a
 *    login or an approval decision.
 *
 * The requester learns the decision honestly at their next sign-in attempt
 * (the /api/auth pending path reads the access_requests ledger — see
 * auth-route tests), which is why access_requests.notified stays false until
 * a real requester-facing delivery channel is wired.
 */

const TELEGRAM_API = 'https://api.telegram.org';

export type AccessNotificationChannel = 'telegram-admin-chat' | 'log-only';

export interface AccessRequestNotificationResult {
  attempted: boolean;
  channel: AccessNotificationChannel;
  ok: boolean;
  messageId?: number | null;
  error?: string;
}

/** Resolve the internal admin chat. Never falls back to the public channel. */
export function resolveTelegramAdminChat(): { token: string; chatId: string } {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN?.trim() || '',
    chatId: process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || '',
  };
}

/** New access-request alert (pure formatter — exported for tests). */
export function formatAccessRequestNotification(params: {
  email: string;
  fullName: string;
  provider: string;
  requestedAt?: string;
}): string {
  const e = escapeTelegramHtml(params.email);
  const name = escapeTelegramHtml(params.fullName || '—');
  const provider = escapeTelegramHtml(params.provider || 'google');
  const when = escapeTelegramHtml(params.requestedAt ?? new Date().toISOString());
  return [
    '🔔 <b>NEW PORTAL ACCESS REQUEST</b>',
    '',
    `👤 Name: <b>${name}</b>`,
    `✉️ Email: ${e}`,
    `🔐 Provider: ${provider}`,
    `🕒 Time: ${when}`,
    '',
    '→ Review in <b>Admin Portal → Access Approvals</b> (super-admin only).',
  ].join('\n');
}

/** Approval/denial decision alert (pure formatter — exported for tests). */
export function formatAccessDecisionNotification(params: {
  email: string;
  decision: 'approved' | 'denied';
  grantedRole?: string | null;
  decidedBy?: string | null;
  note?: string | null;
}): string {
  const e = escapeTelegramHtml(params.email);
  const by = escapeTelegramHtml(params.decidedBy ?? '');
  const note = params.note?.trim() ? escapeTelegramHtml(params.note.trim().slice(0, 300)) : '';
  if (params.decision === 'approved') {
    const role = escapeTelegramHtml(params.grantedRole || 'viewer');
    return [
      '✅ <b>ACCESS REQUEST APPROVED</b>',
      '',
      `✉️ Email: ${e}`,
      `🎭 Granted role: <b>${role}</b>`,
      ...(by ? [`🛡️ By: ${by}`] : []),
      ...(note ? [`📝 Note: ${note}`] : []),
    ].join('\n');
  }
  return [
    '🚫 <b>ACCESS REQUEST DENIED</b>',
    '',
    `✉️ Email: ${e}`,
    ...(by ? [`🛡️ By: ${by}`] : []),
    ...(note ? [`📝 Note: ${note}`] : []),
  ].join('\n');
}

/**
 * Send an admin-chat message. HTML first; a malformed-markup 400 triggers one
 * plain-text retry so an alert is never lost to formatting (broadcaster
 * contract). Returns the honest outcome — never throws.
 */
async function sendToAdminChat(html: string, plain: string): Promise<AccessRequestNotificationResult> {
  const { token, chatId } = resolveTelegramAdminChat();

  if (!token || !chatId) {
    const gap = !token && !chatId
      ? 'TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID'
      : !token
        ? 'TELEGRAM_BOT_TOKEN'
        : 'TELEGRAM_ADMIN_CHAT_ID';
    logger.warn(
      `[access-notifier] ${gap} not configured — admin Telegram notification skipped. ` +
      'The request/decision stays durable in the admin queue; add the secrets in Vercel to arm live alerts.',
    );
    return { attempted: false, channel: 'log-only', ok: false, error: `${gap} not configured` };
  }

  try {
    let res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML' }),
    });
    let body = (await res.json().catch(() => ({}))) as {
      ok: boolean;
      result?: { message_id?: number };
      description?: string;
    };

    if ((!res.ok || !body.ok) && res.status === 400) {
      // One plain-text retry — formatting must never eat an alert.
      res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: plain }),
      });
      body = (await res.json().catch(() => ({}))) as {
        ok: boolean;
        result?: { message_id?: number };
        description?: string;
      };
    }

    if (res.ok && body.ok) {
      return {
        attempted: true,
        channel: 'telegram-admin-chat',
        ok: true,
        messageId: body.result?.message_id ?? null,
      };
    }
    return {
      attempted: true,
      channel: 'telegram-admin-chat',
      ok: false,
      error: body.description || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      attempted: true,
      channel: 'telegram-admin-chat',
      ok: false,
      error: (err as Error)?.message || 'network error',
    };
  }
}

/** Alert the admin chat that a new access request is pending approval. */
export async function notifyAccessRequestCreated(params: {
  email: string;
  fullName: string;
  provider: string;
  requestedAt?: string;
}): Promise<AccessRequestNotificationResult> {
  const html = formatAccessRequestNotification(params);
  const plain = html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const result = await sendToAdminChat(html, plain);
  if (!result.ok) {
    logger.warn(
      `[access-notifier] new-request alert for ${params.email} not delivered: ${result.error ?? 'unknown'}`,
    );
  }
  return result;
}

/** Confirm an approval/denial decision to the admin chat. */
export async function notifyAccessRequestDecided(params: {
  email: string;
  decision: 'approved' | 'denied';
  grantedRole?: string | null;
  decidedBy?: string | null;
  note?: string | null;
}): Promise<AccessRequestNotificationResult> {
  const html = formatAccessDecisionNotification(params);
  const plain = html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const result = await sendToAdminChat(html, plain);
  if (!result.ok) {
    logger.warn(
      `[access-notifier] decision alert for ${params.email} (${params.decision}) not delivered: ${result.error ?? 'unknown'}`,
    );
  }
  return result;
}
