/**
 * SIERRA ESTATES — UNIFIED TELEGRAM NOTIFIER
 *
 * One import for every notification lane in the intake pipelines:
 *   - sendTelegramNotification(message)            → default chat
 *   - sendTelegramNotification(message, {chatId})  → explicit chat
 *   - sendRoleNotification('hr'|'sales'|..., msg)  → role lane resolution
 *
 * Wraps the raw `lib/telegram.ts` primitives (escape + send) and adds:
 *   - role-lane routing via lib/server/telegram-role-chats (DB-backed
 *     telegram_role_chats + env fallbacks — migration 044);
 *   - honest result reporting (`ok:false` + error, never a silent no-op);
 *   - a single place where the HTML-escaping doctrine is enforced: values
 *     are escaped by the CALLER with escapeTelegramHtml before template
 *     interpolation (same rule as lib/telegram.ts).
 */

import { escapeTelegramHtml } from '@/lib/telegram';

export { escapeTelegramHtml };

export type TelegramRole = 'sales_advisor' | 'hr' | 'team_leader' | 'ceo' | 'admin' | 'general';

export interface TelegramSendResult {
  ok: boolean;
  chatId?: string;
  error?: string;
}

/** Resolve a role lane to a concrete chat id (env first, then DB, then ''). */
async function resolveRoleChatId(role: TelegramRole): Promise<string> {
  const envMap: Partial<Record<TelegramRole, string | undefined>> = {
    hr: process.env.TELEGRAM_HR_CHAT_ID,
    sales_advisor: process.env.TELEGRAM_SALES_REP_CHAT_ID,
    team_leader: process.env.TELEGRAM_TEAM_LEADER_CHAT_ID,
    ceo: process.env.TELEGRAM_CEO_CHAT_ID,
    admin: process.env.TELEGRAM_ADMIN_CHAT_ID,
    general: process.env.TELEGRAM_GENERAL_CHAT_ID || process.env.TELEGRAM_GENERAL_GROUP_ID,
  };
  const fromEnv = envMap[role]?.trim();
  if (fromEnv) return fromEnv;

  try {
    const { resolveRoleChat } = await import('@/lib/server/telegram-role-chats');
    // resolveRoleChat only models ceo/team_leader/sales_advisor; every other
    // lane (hr/general) is env-only today.
    if (role === 'ceo' || role === 'team_leader' || role === 'sales_advisor') {
      const resolved = await resolveRoleChat(role);
      return resolved.chatId ?? '';
    }
    return '';
  } catch {
    return '';
  }
}

/** Send an HTML-formatted Telegram message to an explicit or default chat. */
export async function sendTelegramNotification(
  message: string,
  options: { chatId?: string; role?: TelegramRole } = {},
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: 'telegram_not_configured (TELEGRAM_BOT_TOKEN missing)' };
  }

  let chatId = options.chatId?.trim();
  if (!chatId && options.role) chatId = await resolveRoleChatId(options.role);
  if (!chatId) chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!chatId) {
    return { ok: false, error: 'telegram_not_configured (no chat id resolved)' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { ok: false, chatId, error: `telegram_http_${response.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true, chatId };
  } catch (err) {
    return {
      ok: false,
      chatId,
      error: `telegram_send_failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  FORMATTED NOTIFICATION BUILDERS                                    */
/* ------------------------------------------------------------------ */

export interface ClientRequestNotification {
  requestId: string;
  clientName: string;
  phone: string;
  transactionType: string;
  propertyType?: string | null;
  compoundZone?: string | null;
  budgetEgp?: number | null;
  bedrooms?: number | null;
  promoApplied?: string | null;
  matchedUnitCodes?: string[];
  notes?: string | null;
}

/** Formatted Telegram alert for a new Client_Requests row. */
export function formatClientRequestMessage(n: ClientRequestNotification): string {
  const matched = n.matchedUnitCodes?.length
    ? n.matchedUnitCodes.map((c) => `<code>${escapeTelegramHtml(c)}</code>`).join(', ')
    : '—';
  const lines = [
    '<b>🔔 NEW CLIENT REQUEST</b>',
    '',
    `<b>Request ID:</b> <code>${escapeTelegramHtml(n.requestId)}</code>`,
    `<b>Client:</b> ${escapeTelegramHtml(n.clientName)}`,
    `<b>Phone:</b> <code>${escapeTelegramHtml(n.phone)}</code>`,
    `<b>Transaction:</b> ${escapeTelegramHtml(n.transactionType)}`,
  ];
  if (n.propertyType) lines.push(`<b>Property:</b> ${escapeTelegramHtml(n.propertyType)}`);
  if (n.compoundZone) lines.push(`<b>Compound / Zone:</b> ${escapeTelegramHtml(n.compoundZone)}`);
  if (n.budgetEgp != null && n.budgetEgp > 0) {
    lines.push(`<b>Budget:</b> ${n.budgetEgp.toLocaleString('en-US')} EGP`);
  }
  if (n.bedrooms != null && n.bedrooms > 0) lines.push(`<b>Bedrooms:</b> ${n.bedrooms}`);
  if (n.promoApplied) lines.push(`<b>Promo:</b> ${escapeTelegramHtml(n.promoApplied)}`);
  lines.push(`<b>Matched Units:</b> ${matched}`);
  if (n.notes) lines.push(`<b>Notes:</b> ${escapeTelegramHtml(n.notes.slice(0, 500))}`);
  return lines.join('\n');
}

export interface CareerApplicantNotification {
  appId: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  workMode: string;
  experienceYears?: number | null;
  brokerage?: string | null;
  cvLink?: string | null;
  pitch?: string | null;
}

/** Formatted Telegram HR alert for a new Careers_Applicants row. */
export function formatCareerApplicantMessage(n: CareerApplicantNotification): string {
  const lines = [
    '<b>👤 NEW JOB APPLICANT</b>',
    '',
    `<b>App ID:</b> <code>${escapeTelegramHtml(n.appId)}</code>`,
    `<b>Name:</b> ${escapeTelegramHtml(n.fullName)}`,
    `<b>Phone:</b> <code>${escapeTelegramHtml(n.phone)}</code>`,
    `<b>Email:</b> ${escapeTelegramHtml(n.email)}`,
    `<b>Role:</b> ${escapeTelegramHtml(n.role)}`,
    `<b>Work Mode:</b> ${escapeTelegramHtml(n.workMode)}`,
  ];
  if (n.experienceYears != null) lines.push(`<b>Experience:</b> ${n.experienceYears} yrs (New Cairo RE)`);
  if (n.brokerage) lines.push(`<b>Previous Brokerage:</b> ${escapeTelegramHtml(n.brokerage)}`);
  if (n.cvLink) lines.push(`<b>CV:</b> ${escapeTelegramHtml(n.cvLink)}`);
  if (n.pitch) lines.push(`<b>Pitch:</b> ${escapeTelegramHtml(n.pitch.slice(0, 400))}`);
  return lines.join('\n');
}

export interface NewListingNotification {
  unitCode: string;
  submitterRole: string;
  contactName: string;
  phone: string;
  transaction: string;
  category: string;
  compound: string;
  zone?: string | null;
  areaSqm?: number | null;
  gardenSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  finishing?: string | null;
  priceEgp?: number | null;
  monthlyRentEgp?: number | null;
  availability: string;
  adminUrl: string;
  mapUrl?: string | null;
  mergedInto?: string | null;
}

/** Formatted Telegram alert for a new/merged unit from /add-listing. */
export function formatNewListingMessage(n: NewListingNotification): string {
  const lines = [
    n.mergedInto
      ? '<b>🔁 LISTING MERGED (duplicate)</b>'
      : '<b>🏠 NEW LISTING SUBMITTED</b>',
    '',
    `<b>Unit Code:</b> <code>${escapeTelegramHtml(n.unitCode)}</code>`,
  ];
  if (n.mergedInto) lines.push(`<b>Merged Into:</b> <code>${escapeTelegramHtml(n.mergedInto)}</code>`);
  lines.push(
    `<b>Submitter:</b> ${escapeTelegramHtml(n.submitterRole)} — ${escapeTelegramHtml(n.contactName)} (<code>${escapeTelegramHtml(n.phone)}</code>)`,
    `<b>Deal:</b> ${escapeTelegramHtml(n.transaction)} · ${escapeTelegramHtml(n.category)}`,
    `<b>Compound:</b> ${escapeTelegramHtml(n.compound)}${n.zone ? ` — ${escapeTelegramHtml(n.zone)}` : ''}`,
  );
  const specs: string[] = [];
  if (n.areaSqm) specs.push(`BUA ${n.areaSqm} m²`);
  if (n.gardenSqm) specs.push(`Garden ${n.gardenSqm} m²`);
  if (n.bedrooms) specs.push(`${n.bedrooms} BR`);
  if (n.bathrooms) specs.push(`${n.bathrooms} BA`);
  if (n.finishing) specs.push(n.finishing);
  if (specs.length) lines.push(`<b>Specs:</b> ${escapeTelegramHtml(specs.join(' · '))}`);
  if (n.priceEgp) lines.push(`<b>Price:</b> ${n.priceEgp.toLocaleString('en-US')} EGP`);
  if (n.monthlyRentEgp) lines.push(`<b>Rent:</b> ${n.monthlyRentEgp.toLocaleString('en-US')} EGP/month`);
  lines.push(`<b>Status:</b> ${escapeTelegramHtml(n.availability)}`);
  if (n.mapUrl) lines.push(`🗺 <a href="${escapeTelegramHtml(n.mapUrl)}">Map pin</a>`);
  lines.push(`⚙️ <a href="${escapeTelegramHtml(n.adminUrl)}">Open in Admin</a>`);
  return lines.join('\n');
}
