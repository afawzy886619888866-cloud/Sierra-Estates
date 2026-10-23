#!/usr/bin/env node
/**
 * Sierra Estates 3.0 — Live Services Status (arm-the-pipeline check)
 *
 * Reports, honestly and per-service, whether the Sierra Estates 3.0 live
 * pipeline is ARMED or DEGRADED on a deployment:
 *
 *   ① Gemini vector RAG memory   GOOGLE_GENAI_API_KEY + SUPABASE_SERVICE_ROLE_KEY
 *   ② Telegram listing pipeline  TELEGRAM_BOT_TOKEN (+ TELEGRAM_CHAT_ID / TELEGRAM_ADMIN_CHAT_ID)
 *   ③ Access approval alerts     TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID
 *   ④ Supabase writes            SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/check-live-services.mjs                          # default https://sierra-estates.net
 *   node scripts/check-live-services.mjs --url=https://admin.sierra-estates.net
 *   LIVE_APP_URL=https://admin.sierra-estates.net node scripts/check-live-services.mjs
 *
 * The remote probe reads the capability report from GET /api/internal/rag-search
 * (read-only, no secret values ever leave the server). Production gates that
 * route behind x-sbr-secret-key — set SBR_SECRET_KEY locally to probe
 * authenticated. Local environment variables are checked presence-only so
 * the same tool doubles as a pre-flight before `vercel --prod`.
 *
 * Deep probes (§21: presence is NOT validity):
 *   ① When authenticated, the tool also POSTs a one-word query to
 *      /api/internal/rag-search. HTTP 200 proves the full Gemini embedding →
 *      match_listings_gemini RPC round-trip works with the deployed key.
 *      HTTP 503 surfaces the server's honest failure reason — e.g. a
 *      GOOGLE_GENAI_API_KEY that is PRESENT but REJECTED (an OAuth/access
 *      token pasted instead of an AI Studio key). The service is only
 *      reported ARMED when this round-trip succeeds.
 *   ② When TELEGRAM_BOT_TOKEN is present locally, the tool calls
 *      getMe (token validity) and getChat on TELEGRAM_CHAT_ID (bot ↔ channel
 *      visibility). A token the bot cannot use, or a channel the bot has not
 *      been added to as admin, is reported DEGRADED with the exact fix.
 *
 * §21: nothing here fabricates a status — unreachable endpoints are reported
 * as UNREACHABLE, not degraded, and secret VALUES are never printed.
 */

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith('--url='));
const BASE_URL = (urlArg ? urlArg.slice(6) : process.env.LIVE_APP_URL || 'https://sierra-estates.net').replace(/\/+$/, '');

const ARM_INSTRUCTIONS = {
  GOOGLE_GENAI_API_KEY:
    'vercel env add GOOGLE_GENAI_API_KEY production   # AI Studio key (AIza…) — then redeploy: pnpm deploy:prod',
  SUPABASE_SERVICE_ROLE_KEY:
    'vercel env add SUPABASE_SERVICE_ROLE_KEY production   # server-only — never NEXT_PUBLIC_*',
  TELEGRAM_BOT_TOKEN:
    'vercel env add TELEGRAM_BOT_TOKEN production   # from @BotFather',
  TELEGRAM_CHAT_ID:
    'vercel env add TELEGRAM_CHAT_ID production   # listings channel (default @SierraEstatesNewCairo)',
  TELEGRAM_ADMIN_CHAT_ID:
    'vercel env add TELEGRAM_ADMIN_CHAT_ID production   # internal ops chat for access alerts',
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported probes (unit-tested in __tests__/check-live-services.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the capability report from GET /api/internal/rag-search.
 * Presence-only flags exactly as the server reports them.
 */
export async function probeRemote(baseUrl = BASE_URL, headers = {}) {
  const url = `${baseUrl}/api/internal/rag-search`;
  // The production middleware default-denies /api/internal/* behind the
  // x-sbr-secret-key gate (proxy.ts). Probe authenticated when the operator
  // has SBR_SECRET_KEY locally; otherwise report the 401 honestly as a live
  // gate rather than a dead endpoint.
  const merged = { accept: 'application/json', ...headers };
  if (process.env.SBR_SECRET_KEY && !merged['x-sbr-secret-key']) {
    merged['x-sbr-secret-key'] = process.env.SBR_SECRET_KEY;
  }
  try {
    const res = await fetch(url, { headers: merged });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body !== 'object' || body === null) {
      return { ok: false, status: res.status, gated: res.status === 401 };
    }
    const configured = body.configured ?? {};
    return {
      ok: true,
      status: res.status,
      geminiEmbeddings: configured.geminiEmbeddings === true,
      supabaseAdmin: configured.supabaseAdmin === true,
      model: body.model,
      dimensions: body.dimensions,
      rpc: body.rpc,
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? 'network error' };
  }
}

/**
 * Deep probe for service ① — one real POST search round-trip.
 * Verifies the deployed Gemini key can actually vectorize (not merely that
 * the env var exists). Returns a classification:
 *   verified    HTTP 200 — embedding + RPC round-trip succeeded
 *   failed      HTTP 4xx/5xx from the search itself — reason surfaced
 *   gated       HTTP 401 — no SBR secret locally; presence-only remains
 *   unreachable network failure — NEVER reported as degraded
 */
export async function probeRagLive(baseUrl = BASE_URL, headers = {}) {
  const merged = { 'content-type': 'application/json', ...headers };
  if (process.env.SBR_SECRET_KEY && !merged['x-sbr-secret-key']) {
    merged['x-sbr-secret-key'] = process.env.SBR_SECRET_KEY;
  }
  try {
    const res = await fetch(`${baseUrl}/api/internal/rag-search`, {
      method: 'POST',
      headers: merged,
      body: JSON.stringify({ query: 'probe', matchCount: 1 }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      return { state: 'gated', httpStatus: 401 };
    }
    if (res.ok && body?.ok === true) {
      return {
        state: 'verified',
        httpStatus: res.status,
        matches: Number(body?.count ?? 0),
      };
    }
    return {
      state: 'failed',
      httpStatus: res.status,
      error: body?.error ?? `HTTP ${res.status}`,
      reason: typeof body?.reason === 'string' ? body.reason : undefined,
    };
  } catch (err) {
    return { state: 'unreachable', error: err?.message ?? 'network error' };
  }
}

/**
 * Deep probe for service ② — Telegram token validity + bot ↔ channel
 * visibility (getMe / getChat). Values of the token are never logged.
 * Returns:
 *   skipped      no local token (presence-only pre-flight remains)
 *   verified     token valid AND bot can see TELEGRAM_CHAT_ID
 *   token-rejected / channel-unreachable / failed  with a reason
 */
export async function probeTelegramLeg({ token, chatId } = {}) {
  const t = token ?? process.env.TELEGRAM_BOT_TOKEN;
  const c = chatId ?? process.env.TELEGRAM_CHAT_ID;
  if (!t) return { state: 'skipped', note: 'no local TELEGRAM_BOT_TOKEN — presence-only' };
  const out = { state: 'failed', botUsername: null, chatHandle: null };
  try {
    const me = await (await fetch(`https://api.telegram.org/bot${t}/getMe`)).json();
    if (me?.ok !== true) {
      return {
        ...out,
        state: 'token-rejected',
        reason: me?.description ?? 'getMe returned ok:false',
      };
    }
    out.botUsername = me?.result?.username ?? null;
    if (!c) {
      // Token works; channel leg cannot be verified without TELEGRAM_CHAT_ID.
      return { state: 'verified-token-only', botUsername: out.botUsername };
    }
    const chat = await (await fetch(`https://api.telegram.org/bot${t}/getChat?chat_id=${encodeURIComponent(c)}`)).json();
    if (chat?.ok !== true) {
      return {
        ...out,
        state: 'channel-unreachable',
        reason: chat?.description ?? 'getChat returned ok:false',
        chatId: c,
      };
    }
    out.chatHandle = chat?.result?.username ? `@${chat.result.username}` : (chat?.result?.title ?? c);
    out.state = 'verified';
    return out;
  } catch (err) {
    return { ...out, reason: err?.message ?? 'network error' };
  }
}

/** Map a live-probe failure reason onto the missing-secret guidance. */
export function classifyRagFailure(reason = '') {
  const r = reason.toLowerCase();
  if (r.includes('gemini') || r.includes('api key') || r.includes('embedding')) {
    return 'GOOGLE_GENAI_API_KEY';
  }
  if (r.includes('supabase') || r.includes('service_role') || r.includes('service role')) {
    return 'SUPABASE_SERVICE_ROLE_KEY';
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Presentation helpers
// ─────────────────────────────────────────────────────────────────────────────

function presence(flags) {
  const present = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const missing = Object.entries(flags)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return { present, missing };
}

function printService(name, { armed, detail, missing }) {
  const badge = armed === true ? '🟢 ARMED    ' : armed === false ? '🟡 DEGRADED ' : '⚪ UNREACHABLE';
  console.log(`  ${badge} ${name}`);
  if (detail) console.log(`      ${detail}`);
  for (const key of missing) {
    console.log(`      → set: ${ARM_INSTRUCTIONS[key] ?? `vercel env add ${key} production`}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES 3.0 — LIVE SERVICES STATUS');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Target: ${BASE_URL}\n`);

  const local = {
    GOOGLE_GENAI_API_KEY: Boolean(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    TELEGRAM_BOT_TOKEN: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    TELEGRAM_CHAT_ID: Boolean(process.env.TELEGRAM_CHAT_ID),
    TELEGRAM_ADMIN_CHAT_ID: Boolean(process.env.TELEGRAM_ADMIN_CHAT_ID),
    SBR_SECRET_KEY: Boolean(process.env.SBR_SECRET_KEY),
  };

  console.log('─ Local environment (presence only) ─────────────────────────────────');
  const localPresence = presence(local);
  if (localPresence.present.length === 0) {
    console.log('  (no pipeline secrets present locally — expected for operator machines)');
  } else {
    for (const key of localPresence.present) console.log(`  ✓ ${key}`);
  }
  for (const key of localPresence.missing) console.log(`  · ${key} — not set`);
  console.log('');

  console.log('─ Remote deployment probe ────────────────────────────────────────────');
  const probe = await probeRemote();

  if (!probe.ok) {
    printService('Deployment probe', {
      armed: null,
      detail: probe.error
        ? `GET /api/internal/rag-search failed: ${probe.error}`
        : probe.gated
          ? 'HTTP 401 — the default-deny SBR gate is LIVE (good). Export SBR_SECRET_KEY locally to read the authenticated capability report.'
          : `GET /api/internal/rag-search returned HTTP ${probe.status}`,
      missing: [],
    });
    console.log('      (deep probes skipped — capability report unreadable)');
  } else {
    // ① Gemini vector RAG memory — capability flags + LIVE round-trip probe.
    const flagsBoth = probe.geminiEmbeddings && probe.supabaseAdmin;
    const live = await probeRagLive();
    if (live.state === 'verified') {
      printService('① Gemini vector RAG memory (rag-search)', {
        armed: true,
        detail:
          `model ${probe.model ?? '?'} · ${probe.dimensions ?? '?'}-dim · RPC ${probe.rpc ?? 'match_listings_gemini'}\n` +
          `      verified live — embedding → RPC round-trip OK (${live.matches} match(es) above threshold)`,
        missing: [],
      });
    } else if (live.state === 'failed') {
      const missingKey = classifyRagFailure(live.reason ?? live.error ?? '');
      const reason = (live.reason ?? live.error ?? '').replace(/\s+/g, ' ').slice(0, 240);
      printService('① Gemini vector RAG memory (rag-search)', {
        armed: false,
        detail:
          `presence flags say configured (gemini=${probe.geminiEmbeddings}, supabase=${probe.supabaseAdmin}) BUT the live round-trip failed (HTTP ${live.httpStatus}):\n` +
          `      ${reason}\n` +
          `      presence ≠ validity — a present-but-rejected key is still DEGRADED (§21)`,
        missing: missingKey ? [missingKey] : [],
      });
    } else if (live.state === 'unreachable') {
      printService('① Gemini vector RAG memory (rag-search)', {
        armed: null,
        detail: `capability flags present (gemini=${probe.geminiEmbeddings}, supabase=${probe.supabaseAdmin}) but the live probe could not reach the route: ${live.error} — reported UNREACHABLE, not degraded`,
        missing: flagsBoth ? [] : presence({ GOOGLE_GENAI_API_KEY: probe.geminiEmbeddings, SUPABASE_SERVICE_ROLE_KEY: probe.supabaseAdmin }).missing,
      });
    } else {
      // gated (401) — fall back to presence-only with an honest note.
      const rag = presence({ GOOGLE_GENAI_API_KEY: probe.geminiEmbeddings, SUPABASE_SERVICE_ROLE_KEY: probe.supabaseAdmin });
      printService('① Gemini vector RAG memory (rag-search)', {
        armed: flagsBoth,
        detail:
          `model ${probe.model ?? '?'} · ${probe.dimensions ?? '?'}-dim · RPC ${probe.rpc ?? 'match_listings_gemini'}\n` +
          `      presence only (capability report) — export SBR_SECRET_KEY locally to verify the live round-trip`,
        missing: rag.missing,
      });
    }

    // ② Telegram listing broadcast — token presence + live getMe/getChat probe.
    const tgProbe = await probeTelegramLeg();
    if (tgProbe.state === 'skipped') {
      printService('② Telegram listing broadcast (sendMediaGroup → @SierraEstatesNewCairo)', {
        armed: false,
        detail: 'token absent — broadcasts are skipped and reported honestly (§21)',
        missing: ['TELEGRAM_BOT_TOKEN'],
      });
    } else if (tgProbe.state === 'verified') {
      printService('② Telegram listing broadcast (sendMediaGroup → @SierraEstatesNewCairo)', {
        armed: true,
        detail: `verified live — bot @${tgProbe.botUsername} can see the listings channel (${tgProbe.chatHandle})`,
        missing: [],
      });
    } else if (tgProbe.state === 'verified-token-only') {
      printService('② Telegram listing broadcast (sendMediaGroup → @SierraEstatesNewCairo)', {
        armed: true,
        detail: `bot token verified live (@${tgProbe.botUsername}); TELEGRAM_CHAT_ID not set locally — channel leg unverified`,
        missing: ['TELEGRAM_CHAT_ID'],
      });
    } else if (tgProbe.state === 'token-rejected') {
      printService('② Telegram listing broadcast (sendMediaGroup → @SierraEstatesNewCairo)', {
        armed: false,
        detail: `TELEGRAM_BOT_TOKEN present but REJECTED by Telegram: ${tgProbe.reason} — replace it via @BotFather (/revoke + issue a fresh token)`,
        missing: ['TELEGRAM_BOT_TOKEN'],
      });
    } else if (tgProbe.state === 'channel-unreachable') {
      printService('② Telegram listing broadcast (sendMediaGroup → @SierraEstatesNewCairo)', {
        armed: false,
        detail:
          `bot token valid (@${tgProbe.botUsername ?? '?'}) but the bot cannot see TELEGRAM_CHAT_ID (${tgProbe.chatId}): ${tgProbe.reason}\n` +
          `      add the bot as an ADMIN of the listings channel (or correct the channel handle), then re-run`,
        // Not an env-var gap — TELEGRAM_CHAT_ID is set; the fix is bot ↔
        // channel membership, which the detail line above states exactly.
        missing: [],
      });
    } else {
      printService('② Telegram listing broadcast (sendMediaGroup → @SierraEstatesNewCairo)', {
        armed: null,
        detail: `Telegram probe unreachable: ${tgProbe.reason ?? 'unknown'} — reported UNREACHABLE, not degraded`,
        missing: [],
      });
    }

    // ③ Access approval notifications — presence only (sending test alerts to
    // the ops chat would be intrusive; no read-only probe exists for chat ids).
    const alerts = presence({
      TELEGRAM_BOT_TOKEN: local.TELEGRAM_BOT_TOKEN,
      TELEGRAM_ADMIN_CHAT_ID: local.TELEGRAM_ADMIN_CHAT_ID,
    });
    printService('③ Access approval notifications (admin chat alerts)', {
      armed: local.TELEGRAM_BOT_TOKEN && local.TELEGRAM_ADMIN_CHAT_ID,
      detail: 'new access requests + approve/deny decisions alert the internal ops chat',
      missing: alerts.missing,
    });

    // ④ Supabase writes — capability flag from the server (the ① live probe
    // already exercised the service-role RPC path when it verified).
    printService('④ Supabase writes (listings upsert / compounds gazetteer)', {
      armed: probe.supabaseAdmin,
      detail: probe.supabaseAdmin
        ? 'service-role client live — syndication upserts land in public.listings'
        : 'service-role client unconfigured — upserts are skipped and reported',
      missing: probe.supabaseAdmin ? [] : ['SUPABASE_SERVICE_ROLE_KEY'],
    });
  }

  console.log('\n─ Arming runbook (Vercel) ────────────────────────────────────────────');
  console.log('  pnpm link:vercel                                   # once per machine');
  for (const line of Object.values(ARM_INSTRUCTIONS)) console.log(`  ${line}`);
  console.log('  # after the last env add:');
  console.log('  pnpm deploy:prod                                   # rebuild with secrets');
  console.log('  pnpm gazetteer:sync                                # arm map pins in public.compounds');
  console.log('  pnpm embeddings:generate                           # 768-dim vectors for listings');
  console.log('  pnpm live:status                                   # re-run this check — all 🟢');
  console.log('');
}

// Run as a CLI entry point only (importable for tests).
import { pathToFileURL } from 'url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Fatal error in live-services check:', err);
    process.exit(1);
  });
}

export { main };
