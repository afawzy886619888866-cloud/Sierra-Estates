#!/usr/bin/env node
/**
 * Sierra Estates 3.0 — TELEGRAM_ADMIN_CHAT_ID discovery helper.
 *
 * Service ③ (access approval notifications) needs an INTERNAL ops chat the
 * bot can write to. The notifier contract (lib/server/access-request-notifier.ts)
 * NEVER falls back to the public listings channel — access requests carry
 * staff PII — so TELEGRAM_ADMIN_CHAT_ID must point at a real chat the bot
 * has actually seen. Bots cannot enumerate their chats; the only honest
 * source is getUpdates, which shows a chat the moment a human interacts
 * with the bot there.
 *
 * One-time human step this tool walks you through:
 *   1. open https://t.me/<bot-username> and press START (private chat), or
 *      create an internal ops group and add the bot as a member;
 *   2. re-run this script — it prints the chat id it just saw;
 *   3. arm it:  vercel env add TELEGRAM_ADMIN_CHAT_ID production
 *               pnpm deploy:prod
 *
 * §21 anti-fabrication:
 *   - never prints the bot token;
 *   - the PUBLIC listings channel (TELEGRAM_CHAT_ID / @SierraEstatesNewCairo)
 *     is reported but explicitly REFUSED as an admin candidate, with the
 *     PII reason — the tool cannot be used to mis-route staff alerts;
 *   - when no chat has interacted yet, it says exactly that and exits 1
 *     with the start-here URL — it never invents or guesses a chat id.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=... node scripts/discover-telegram-admin-chat.mjs
 *   (also reads apps/sierra-estates-realty/.env.local / .env.local best-effort)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_API = 'https://api.telegram.org';
const PUBLIC_LISTINGS_CHANNEL = '@SierraEstatesNewCairo';

// ── tiny best-effort .env.local loader (no dotenv dependency, mirrors the
// check-live-services zero-dependency contract). Never throws.
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* best-effort only */
  }
}

loadEnvFile(path.resolve(__dirname, '../apps/sierra-estates-realty/.env.local'));
loadEnvFile(path.resolve(__dirname, '../.env.local'));

/**
 * Extract the distinct chats from a Telegram getUpdates result.
 * Pure — exported for tests. Handles message / edited_message /
 * channel_post / my_chat_member update kinds; dedupes by chat id.
 */
export function extractChatsFromUpdates(updates) {
  const chats = new Map();
  for (const update of Array.isArray(updates) ? updates : []) {
    for (const kind of ['message', 'edited_message', 'channel_post', 'my_chat_member']) {
      const payload = update?.[kind];
      const chat = payload?.chat;
      if (!chat || typeof chat.id !== 'number') continue;
      if (!chats.has(chat.id)) {
        chats.set(chat.id, {
          id: chat.id,
          type: String(chat.type ?? 'unknown'),
          title: chat.title ?? null,
          username: chat.username ? `@${chat.username}` : null,
          firstName: chat.first_name ?? null,
        });
      }
    }
  }
  return [...chats.values()];
}

/**
 * Split candidates into eligible admin chats vs refused public-channel
 * entries. Pure — exported for tests. A chat is refused when its username
 * equals the configured TELEGRAM_CHAT_ID or the canonical listings channel,
 * or when it is the channel type configured as TELEGRAM_CHAT_ID.
 */
export function filterAdminCandidates(chats, { publicChatId } = {}) {
  const configured = String(publicChatId ?? process.env.TELEGRAM_CHAT_ID ?? '').trim();
  const refused = [];
  const eligible = [];
  for (const chat of chats) {
    const handle = String(chat.username ?? '').toLowerCase();
    const configuredHandle = configured.toLowerCase();
    const isPublicChannel =
      handle === PUBLIC_LISTINGS_CHANNEL.toLowerCase() ||
      (configuredHandle.startsWith('@') && handle === configuredHandle) ||
      (configured && String(chat.id) === configured);
    if (isPublicChannel) {
      refused.push(chat);
    } else {
      eligible.push(chat);
    }
  }
  return { eligible, refused };
}

/** The exact operator arming commands for a discovered chat id. Pure. */
export function vercelArmCommands(chatId) {
  return [
    `vercel env add TELEGRAM_ADMIN_CHAT_ID production   # value: ${chatId}`,
    'pnpm deploy:prod                                   # rebuild with the secret',
    'node scripts/check-live-services.mjs               # ③ flips to ARMED',
  ];
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES 3.0 — TELEGRAM ADMIN CHAT DISCOVERY (service ③)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (!token) {
    console.log('  ✗ TELEGRAM_BOT_TOKEN is not set. Nothing was probed.');
    console.log('    → set: vercel env add TELEGRAM_BOT_TOKEN production   # from @BotFather');
    console.log('      (or export it locally before running this tool)');
    process.exit(1);
  }

  let botUsername = null;
  let updates = [];
  try {
    const me = await (await fetch(`${TELEGRAM_API}/bot${token}/getMe`)).json();
    if (me?.ok !== true) {
      console.log(`  ✗ Bot token REJECTED by Telegram: ${me?.description ?? 'getMe ok:false'}`);
      process.exit(1);
    }
    botUsername = me?.result?.username ?? null;
    console.log(`  ✓ Bot: ${botUsername ? '@' + botUsername : 'unknown username'}`);

    const upd = await (await fetch(`${TELEGRAM_API}/bot${token}/getUpdates?limit=100`)).json();
    if (upd?.ok !== true) {
      console.log(`  ✗ getUpdates failed: ${upd?.description ?? 'ok:false'}`);
      process.exit(1);
    }
    updates = Array.isArray(upd.result) ? upd.result : [];
  } catch (err) {
    console.log(`  ⚪ Telegram unreachable: ${err?.message ?? 'network error'} — retry later.`);
    process.exit(1);
  }

  const chats = extractChatsFromUpdates(updates);
  if (chats.length === 0) {
    const startUrl = botUsername ? `https://t.me/${botUsername}` : 'https://t.me/<bot-username>';
    console.log('\n  · No chats have interacted with the bot yet (updates expire after 24h).');
    console.log('    This is the one human step service ③ needs — it cannot be faked:');
    console.log(`      1. open ${startUrl} and press START  (or create an ops group`);
    console.log('         and add the bot as a member — then send any message);');
    console.log('      2. re-run: node scripts/discover-telegram-admin-chat.mjs');
    console.log('      3. arm the discovered chat id with the printed vercel commands.');
    process.exit(1);
  }

  console.log(`\n  Chats seen by the bot (${chats.length}):`);
  for (const chat of chats) {
    const label = chat.title ?? chat.username ?? chat.firstName ?? chat.id;
    console.log(`    · ${chat.id}  [${chat.type}]  ${label}`);
  }

  const { eligible, refused } = filterAdminCandidates(chats, {});
  for (const chat of refused) {
    console.log(`\n  ✗ REFUSED as admin chat: ${chat.id} (${chat.username ?? chat.title})`);
    console.log('    That is the PUBLIC listings channel — access alerts carry staff PII');
    console.log('    and must never reach it (notifier contract, §21).');
  }

  if (eligible.length === 0) {
    console.log('\n  · Only the public channel was seen — no internal chat yet.');
    console.log('    Open a private chat with the bot (or an ops group), message it, re-run.');
    process.exit(1);
  }

  console.log('\n  ✓ Eligible TELEGRAM_ADMIN_CHAT_ID candidates:');
  for (const chat of eligible) {
    const label = chat.title ?? chat.username ?? chat.firstName ?? chat.id;
    console.log(`    ${chat.id}  [${chat.type}]  ${label}`);
    for (const line of vercelArmCommands(chat.id)) console.log(`        ${line}`);
  }
  console.log('\n  → set ONE of the above, redeploy, then re-run check-live-services.');
}

// Run only when invoked directly (imports for tests stay side-effect free).
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
