import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  extractChatsFromUpdates,
  filterAdminCandidates,
  vercelArmCommands,
} from '../scripts/discover-telegram-admin-chat.mjs';

/**
 * Sierra Estates 3.0 — admin-chat discovery tool suite.
 *
 * §21 contract under test:
 *   ① The public listings channel (@SierraEstatesNewCairo / TELEGRAM_CHAT_ID)
 *      is ALWAYS refused as an admin-chat candidate — access alerts carry
 *      staff PII and can never be routed to the public channel.
 *   ② Chat extraction is truthful: deduped, only chats that actually
 *      appear in updates, never a guessed or synthesized chat id.
 *   ③ The arming commands are verbatim and complete — the operator can
 *      copy-paste them straight into a shell.
 */

const ENV_KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// extractChatsFromUpdates — truthful, deduplicated extraction
// ─────────────────────────────────────────────────────────────────────────────

describe('extractChatsFromUpdates', () => {
  it('extracts distinct chats from message updates and dedupes by chat id', () => {
    const updates = [
      { message: { chat: { id: 111, type: 'private', first_name: 'Ops', username: 'ops_human' } } },
      { message: { chat: { id: 111, type: 'private', first_name: 'Ops', username: 'ops_human' } } },
      { message: { chat: { id: -100999, type: 'supergroup', title: 'Sierra Ops' } } },
    ];
    const chats = extractChatsFromUpdates(updates);
    expect(chats).toHaveLength(2);
    expect(chats[0]).toMatchObject({ id: 111, type: 'private', username: '@ops_human' });
    expect(chats[1]).toMatchObject({ id: -100999, type: 'supergroup', title: 'Sierra Ops' });
  });

  it('reads chats from every supported update kind and ignores malformed entries', () => {
    const updates = [
      { edited_message: { chat: { id: 222, type: 'private', first_name: 'A' } } },
      { channel_post: { chat: { id: -100333, type: 'channel', title: 'Listings', username: 'SierraEstatesNewCairo' } } },
      { my_chat_member: { chat: { id: 444, type: 'group', title: 'Ops Group' } } },
      { message: { chat: {} } },
      { message: { no_chat_here: true } },
      {},
    ];
    const chats = extractChatsFromUpdates(updates);
    expect(chats.map((c) => c.id)).toEqual([222, -100333, 444]);
  });

  it('returns an empty list for non-array input instead of throwing', () => {
    expect(extractChatsFromUpdates(undefined)).toEqual([]);
    expect(extractChatsFromUpdates(null)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// filterAdminCandidates — the PII guard (§21 ①)
// ─────────────────────────────────────────────────────────────────────────────

describe('filterAdminCandidates', () => {
  it('refuses the canonical public listings channel by username and returns the rest', () => {
    const chats = [
      { id: 111, type: 'private', username: '@ops_human', title: null },
      { id: -100333, type: 'channel', username: '@SierraEstatesNewCairo', title: 'Sierra Estates New Cairo' },
    ];
    const { eligible, refused } = filterAdminCandidates(chats, {});
    expect(eligible.map((c) => c.id)).toEqual([111]);
    expect(refused.map((c) => c.id)).toEqual([-100333]);
  });

  it('refuses whatever channel TELEGRAM_CHAT_ID points at, including numeric ids', () => {
    process.env.TELEGRAM_CHAT_ID = '-100777';
    const chats = [
      { id: -100777, type: 'channel', username: '@some_other_channel', title: null },
      { id: 555, type: 'private', username: null, title: null },
    ];
    const { eligible, refused } = filterAdminCandidates(chats, {});
    expect(refused.map((c) => c.id)).toEqual([-100777]);
    expect(eligible.map((c) => c.id)).toEqual([555]);
  });

  it('refuses a configured @username match case-insensitively', () => {
    process.env.TELEGRAM_CHAT_ID = '@MyListingsFeed';
    const chats = [
      { id: -100888, type: 'channel', username: '@mylistingsfeed', title: null },
      { id: 999, type: 'private', username: '@someone', title: null },
    ];
    const { eligible, refused } = filterAdminCandidates(chats, {});
    expect(refused.map((c) => c.id)).toEqual([-100888]);
    expect(eligible.map((c) => c.id)).toEqual([999]);
  });

  it('treats an explicit publicChatId override the same as the env var', () => {
    const chats = [
      { id: -100111, type: 'channel', username: '@feed', title: null },
      { id: 222, type: 'private', username: null, title: null },
    ];
    const { eligible, refused } = filterAdminCandidates(chats, { publicChatId: '-100111' });
    expect(refused.map((c) => c.id)).toEqual([-100111]);
    expect(eligible.map((c) => c.id)).toEqual([222]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// vercelArmCommands — copy-pasteable, complete guidance (§21 ③)
// ─────────────────────────────────────────────────────────────────────────────

describe('vercelArmCommands', () => {
  it('embeds the chat id and covers env add, redeploy and re-check', () => {
    const lines = vercelArmCommands(-100123456);
    expect(lines[0]).toContain('vercel env add TELEGRAM_ADMIN_CHAT_ID production');
    expect(lines[0]).toContain('-100123456');
    expect(lines[1]).toContain('pnpm deploy:prod');
    expect(lines[2]).toContain('check-live-services');
  });

  it('never echoes the bot token', () => {
    const joined = vercelArmCommands(42).join('\n');
    expect(joined).not.toContain('TELEGRAM_BOT_TOKEN=');
  });
});
