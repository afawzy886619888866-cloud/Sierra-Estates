import 'server-only';
import { escapeTelegramHtml } from '@/lib/telegram';
import type { TelegramListingSpec } from '@/lib/server/telegram-listing-formatter';

/**
 * SIERRA ESTATES 3.0 — TELEGRAM CHANNEL BROADCAST WORKER (Phase 2)
 *
 * `sendListingToTelegramChannel(unit, formattedArabicText, photoUrls)` posts
 * the formatted listing to the channel as a photo album (sendMediaGroup)
 * with the caption riding on the first photo. Degradations are explicit:
 *  - one photo  → sendPhoto with the caption
 *  - no photos  → sendMessage with the full text
 *  - no token   → skipped, reported honestly (§21: no fake success)
 *
 * Target: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (default @SierraEstatesNewCairo
 * per the master directive). HTML parse mode is used with values escaped —
 * a malformed-markup 400 from Telegram triggers one plain-text retry so a
 * broadcast is never lost to formatting.
 */

const TELEGRAM_API = 'https://api.telegram.org';

/** Telegram hard limits (characters). */
const MEDIA_CAPTION_LIMIT = 1024;
const MESSAGE_TEXT_LIMIT = 4096;
const ALBUM_PHOTO_LIMIT = 10;

export interface TelegramBroadcastResult {
  ok: boolean;
  skipped: boolean;
  chatId: string;
  mode: 'media-group' | 'photo' | 'text' | 'none';
  messageId?: number | null;
  mediaMessageIds?: number[];
  error?: string;
  captionTruncated: boolean;
}

function truncate(text: string, limit: number): { text: string; truncated: boolean } {
  const clean = text.trim();
  if (clean.length <= limit) return { text: clean, truncated: false };
  return { text: `${clean.slice(0, limit - 1)}…`, truncated: true };
}

export function resolveTelegramChannel(): { token: string; chatId: string } {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || '@SierraEstatesNewCairo';
  return { token, chatId };
}

function sanitizePhotoUrls(photoUrls: string[]): string[] {
  const urls = (photoUrls ?? [])
    .map((u) => String(u ?? '').trim())
    .filter((u) => /^https?:\/\//i.test(u));
  return [...new Set(urls)].slice(0, ALBUM_PHOTO_LIMIT);
}

async function callTelegramApi(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; result?: Record<string, unknown>; description?: string; status?: number }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok: boolean;
      result?: Record<string, unknown>;
      description?: string;
    };
    if (!res.ok || !body.ok) {
      return { ok: false, description: body.description || `HTTP ${res.status}`, status: res.status };
    }
    return { ok: true, result: body.result };
  } catch (err) {
    return { ok: false, description: (err as Error)?.message || 'network error' };
  }
}

/**
 * Broadcast a formatted listing to the Telegram channel as a photo album.
 * `unit` is carried for context/audit only — the caption is the formatted
 * Arabic text produced by the Gemini formatter.
 */
export async function sendListingToTelegramChannel(
  unit: TelegramListingSpec,
  formattedArabicText: string,
  photoUrls: string[],
): Promise<TelegramBroadcastResult> {
  const { token, chatId } = resolveTelegramChannel();

  if (!token) {
    return {
      ok: false,
      skipped: true,
      chatId,
      mode: 'none',
      error: 'TELEGRAM_BOT_TOKEN is not configured — broadcast skipped (no silent sends)',
      captionTruncated: false,
    };
  }

  const photos = sanitizePhotoUrls(photoUrls);
  const htmlCaption = escapeTelegramHtml(formattedArabicText);

  // ── Photo album (2+ photos): sendMediaGroup, caption on the first photo.
  if (photos.length >= 2) {
    const { text, truncated } = truncate(htmlCaption, MEDIA_CAPTION_LIMIT);
    const media = photos.map((url, index) => ({
      type: 'photo',
      media: url,
      ...(index === 0 ? { caption: text, parse_mode: 'HTML' } : {}),
    }));
    let res = await callTelegramApi(token, 'sendMediaGroup', { chat_id: chatId, media });
    if (!res.ok && res.status === 400) {
      // Malformed markup — one plain-text retry (no parse_mode) so the
      // broadcast is never lost to formatting.
      const plainMedia = photos.map((url, index) => ({
        type: 'photo',
        media: url,
        ...(index === 0 ? { caption: truncate(formattedArabicText, MEDIA_CAPTION_LIMIT).text } : {}),
      }));
      res = await callTelegramApi(token, 'sendMediaGroup', { chat_id: chatId, media: plainMedia });
    }
    if (res.ok) {
      const messages = Array.isArray(res.result) ? (res.result as Array<Record<string, unknown>>) : [];
      return {
        ok: true,
        skipped: false,
        chatId,
        mode: 'media-group',
        messageId: (messages[0]?.message_id as number) ?? null,
        mediaMessageIds: messages.map((m) => m.message_id as number).filter((n) => typeof n === 'number'),
        captionTruncated: truncated,
      };
    }
    const fallback = await sendTextFallback(token, chatId, formattedArabicText);
    return { ...fallback, captionTruncated: truncated, error: res.description ?? fallback.error };
  }

  // ── Single photo: sendPhoto with the caption.
  if (photos.length === 1) {
    const { text, truncated } = truncate(htmlCaption, MEDIA_CAPTION_LIMIT);
    let res = await callTelegramApi(token, 'sendPhoto', {
      chat_id: chatId,
      photo: photos[0],
      caption: text,
      parse_mode: 'HTML',
    });
    if (!res.ok && res.status === 400) {
      res = await callTelegramApi(token, 'sendPhoto', {
        chat_id: chatId,
        photo: photos[0],
        caption: truncate(formattedArabicText, MEDIA_CAPTION_LIMIT).text,
      });
    }
    if (res.ok) {
      return {
        ok: true,
        skipped: false,
        chatId,
        mode: 'photo',
        messageId: (res.result?.message_id as number) ?? null,
        captionTruncated: truncated,
      };
    }
    const fallback = await sendTextFallback(token, chatId, formattedArabicText);
    return { ...fallback, captionTruncated: truncated };
  }

  // ── No photos: plain text message.
  const result = await sendTextFallback(token, chatId, formattedArabicText);
  return result;
}

async function sendTextFallback(
  token: string,
  chatId: string,
  formattedArabicText: string,
): Promise<TelegramBroadcastResult> {
  const { text, truncated } = truncate(escapeTelegramHtml(formattedArabicText), MESSAGE_TEXT_LIMIT);
  let res = await callTelegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: false },
  });
  if (!res.ok && res.status === 400) {
    res = await callTelegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: truncate(formattedArabicText, MESSAGE_TEXT_LIMIT).text,
    });
  }
  if (res.ok) {
    return {
      ok: true,
      skipped: false,
      chatId,
      mode: 'text',
      messageId: (res.result?.message_id as number) ?? null,
      captionTruncated: truncated,
    };
  }
  return {
    ok: false,
    skipped: false,
    chatId,
    mode: 'none',
    error: res.description,
    captionTruncated: truncated,
  };
}
