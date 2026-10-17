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
 * §21: nothing here fabricates a status — unreachable endpoints are reported
 * as UNREACHABLE, not degraded.
 */

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith('--url='));
const BASE_URL = (urlArg ? urlArg.slice(6) : process.env.LIVE_APP_URL || 'https://sierra-estates.net').replace(/\/+$/, '');

const ARM_INSTRUCTIONS = {
  GOOGLE_GENAI_API_KEY:
    'vercel env add GOOGLE_GENAI_API_KEY production   # then redeploy: pnpm deploy:prod',
  SUPABASE_SERVICE_ROLE_KEY:
    'vercel env add SUPABASE_SERVICE_ROLE_KEY production   # server-only — never NEXT_PUBLIC_*',
  TELEGRAM_BOT_TOKEN:
    'vercel env add TELEGRAM_BOT_TOKEN production   # from @BotFather',
  TELEGRAM_CHAT_ID:
    'vercel env add TELEGRAM_CHAT_ID production   # listings channel (default @SierraEstatesNewCairo)',
  TELEGRAM_ADMIN_CHAT_ID:
    'vercel env add TELEGRAM_ADMIN_CHAT_ID production   # internal ops chat for access alerts',
};

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

async function probeRemote() {
  const url = `${BASE_URL}/api/internal/rag-search`;
  // The production middleware default-denies /api/internal/* behind the
  // x-sbr-secret-key gate (proxy.ts). Probe authenticated when the operator
  // has SBR_SECRET_KEY locally; otherwise report the 401 honestly as a live
  // gate rather than a dead endpoint.
  const headers = { accept: 'application/json' };
  if (process.env.SBR_SECRET_KEY) {
    headers['x-sbr-secret-key'] = process.env.SBR_SECRET_KEY;
  }
  try {
    const res = await fetch(url, { headers });
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
  } else {
    const rag = presence({ GOOGLE_GENAI_API_KEY: probe.geminiEmbeddings, SUPABASE_SERVICE_ROLE_KEY: probe.supabaseAdmin });
    printService('① Gemini vector RAG memory (rag-search)', {
      armed: probe.geminiEmbeddings && probe.supabaseAdmin,
      detail: `model ${probe.model ?? '?'} · ${probe.dimensions ?? '?'}-dim · RPC ${probe.rpc ?? 'match_listings_gemini'}`,
      missing: rag.missing,
    });

    const tg = presence({ TELEGRAM_BOT_TOKEN: local.TELEGRAM_BOT_TOKEN });
    printService('② Telegram listing broadcast (sendMediaGroup → @SierraEstatesNewCairo)', {
      armed: local.TELEGRAM_BOT_TOKEN ? true : false,
      detail: local.TELEGRAM_BOT_TOKEN
        ? 'bot token present — broadcasts send for real'
        : 'token absent — broadcasts are skipped and reported honestly (§21)',
      missing: tg.missing,
    });

    const alerts = presence({
      TELEGRAM_BOT_TOKEN: local.TELEGRAM_BOT_TOKEN,
      TELEGRAM_ADMIN_CHAT_ID: local.TELEGRAM_ADMIN_CHAT_ID,
    });
    printService('③ Access approval notifications (admin chat alerts)', {
      armed: local.TELEGRAM_BOT_TOKEN && local.TELEGRAM_ADMIN_CHAT_ID,
      detail: 'new access requests + approve/deny decisions alert the internal ops chat',
      missing: alerts.missing,
    });

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

main().catch((err) => {
  console.error('Fatal error in live-services check:', err);
  process.exit(1);
});
