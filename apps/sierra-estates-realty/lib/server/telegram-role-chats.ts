/**
 * lib/server/telegram-role-chats — database-first resolution of the staff
 * ROLE chat ids used by the 3-way viewing dispatch (CEO / Team Leader /
 * Sales Advisor) and the sales lane of /api/inquiries.
 *
 * WHY (2026-11-13): the dispatch routes read TELEGRAM_*_CHAT_ID env vars,
 * but a Telegram chat id only becomes knowable AFTER the stakeholder's
 * operator has messaged the bot once — an env-first design meant the ids
 * could never be captured without a manual secrets edit + redeploy, so the
 * dispatch has honestly skipped all three roles since it shipped.
 * Migration 044 adds public.telegram_role_chats (self-registered via the
 * bot's /staffsetup command, staff-auditable in the admin console).
 *
 * RESOLUTION ORDER (per role):
 *   1. explicit env override — TELEGRAM_CEO_CHAT_ID etc., the ops escape
 *      hatch (existing deployments keep working unchanged);
 *   2. public.telegram_role_chats — the durable, self-registered source;
 *   3. nothing — the caller reports an honest skip, exactly as before.
 *
 * This module NEVER throws on read: a missing table (migration not yet
 * applied) or a Supabase outage degrades to "role unconfigured", keeping
 * the visitor-facing 201 of /api/viewing-requests untouchable (§ dispatch
 * can never break the request).
 */
import { listRecords, getSupabaseAdmin } from '@sierra-estates/db';

export const ROLE_KEYS = ['ceo', 'team_leader', 'sales_advisor'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export interface RoleChatSource {
  role: RoleKey;
  chatId: string;
  /** Where the id came from — surfaced in dispatch results for auditability. */
  source: 'env' | 'database';
}

export interface RoleChatMiss {
  role: RoleKey;
  chatId: null;
  source: 'none';
}

export type RoleChatResolution = RoleChatSource | RoleChatMiss;

/** Dispatch roster — mirrors the roster in /api/viewing-requests. */
export const DISPATCH_ROLES: ReadonlyArray<{
  role: RoleKey;
  label: string;
  envVar: string;
  email: string;
}> = [
  { role: 'ceo', label: 'CEO (Ahmed Fawzy)', envVar: 'TELEGRAM_CEO_CHAT_ID', email: 'a.fawzy8866@gmail.com' },
  { role: 'team_leader', label: 'Team Leader', envVar: 'TELEGRAM_TEAM_LEADER_CHAT_ID', email: 'teamleader@sierra-estates.net' },
  { role: 'sales_advisor', label: 'Sales Advisor', envVar: 'TELEGRAM_SALES_ADVISOR_CHAT_ID', email: 'advisory@sierra-estates.net' },
];

const ENV_FOR_ROLE: Record<RoleKey, string> = {
  ceo: 'TELEGRAM_CEO_CHAT_ID',
  team_leader: 'TELEGRAM_TEAM_LEADER_CHAT_ID',
  sales_advisor: 'TELEGRAM_SALES_ADVISOR_CHAT_ID',
};

/** Env override first (ops escape hatch), trimmed; empty string counts as unset. */
export function envChatIdFor(role: RoleKey): string | null {
  const value = process.env[ENV_FOR_ROLE[role]]?.trim();
  return value ? value : null;
}

/**
 * Reads public.telegram_role_chats once per call (max 3 rows) and returns a
 * role → chat id map. Returns an empty map on any failure — the resolver
 * contract degrades to env-only, never throws.
 */
async function dbChatIdsByRole(): Promise<Partial<Record<RoleKey, string>>> {
  try {
    getSupabaseAdmin(); // throws when unconfigured — same honest check the webhook uses
    const rows = await listRecords<{ role: RoleKey; chatId: string }>('telegram_role_chats', {
      select: 'role,chat_id',
      limit: ROLE_KEYS.length,
    });
    const map: Partial<Record<RoleKey, string>> = {};
    for (const row of rows) {
      if ((ROLE_KEYS as readonly string[]).includes(row.role)) {
        const chatId = row.chatId?.trim();
        if (chatId) map[row.role] = chatId;
      }
    }
    return map;
  } catch {
    return {}; // table missing, DB down, or credentials absent — env-only mode
  }
}

/**
 * Resolve every dispatch role at once (one DB read for all three).
 * Order per role: env override → database → miss.
 */
export async function resolveRoleChats(): Promise<RoleChatResolution[]> {
  const fromDb = await dbChatIdsByRole();
  return ROLE_KEYS.map((role) => {
    const envId = envChatIdFor(role);
    if (envId) return { role, chatId: envId, source: 'env' as const };
    const dbId = fromDb[role];
    if (dbId) return { role, chatId: dbId, source: 'database' as const };
    return { role, chatId: null, source: 'none' as const };
  });
}

/**
 * Resolve a single role (the /api/inquiries sales lane).
 * Same order and degradation contract as resolveRoleChats.
 */
export async function resolveRoleChat(role: RoleKey): Promise<RoleChatResolution> {
  const envId = envChatIdFor(role);
  if (envId) return { role, chatId: envId, source: 'env' };
  try {
    getSupabaseAdmin();
    const rows = await listRecords<{ role: RoleKey; chatId: string }>('telegram_role_chats', {
      select: 'role,chat_id',
      where: [{ column: 'role', value: role }],
      limit: 1,
    });
    const chatId = rows[0]?.chatId?.trim();
    if (chatId) return { role, chatId, source: 'database' };
  } catch {
    /* env-only mode */
  }
  return { role, chatId: null, source: 'none' };
}

/**
 * One-round-trip test send used by the admin console ("verify" button) and
 * by /staffsetup's confirmation echo. Uses the same sendMessage wire format
 * as the telegram-controller. Returns an honest ok/failed result — callers
 * decide what to do with failures (the console shows them; the webhook
 * reports them to the operator in-chat).
 */
export async function sendRoleTestMessage(
  chatId: string,
  roleLabel: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          `✅ <b>Sierra Estates — ${roleLabel} dispatch lane verified</b>\n` +
          `This chat will now receive 3-way viewing dispatches (unit, client, slot, calendar invite).\n` +
          `<i>Registered ${new Date().toISOString()}</i>`,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { description?: string };
      return { ok: false, error: body.description || `Telegram API HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
