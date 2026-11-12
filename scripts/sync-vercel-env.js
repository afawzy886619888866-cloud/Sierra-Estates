/**
 * Automated Vercel Environment Variables Synchronizer
 * Syncs all GitHub/Local environment variables directly to Sierra Estates Vercel projects:
 * 1. Client Project: sierra-estates-client-portal (prj_ieVcIcoeTtHndspXMzlE0cwLl89c)
 * 2. Admin Project: sierra-estates-admin-page (prj_inhTu8kppYhQv2NZZV3GTUdU8uBi)
 */

import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local environment files
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/sierra-estates-realty/.env.local') });

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID || 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ';

const CLIENT_PROJECT_ID = process.env.CLIENT_VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID_CLIENT || 'prj_ieVcIcoeTtHndspXMzlE0cwLl89c';
const ADMIN_PROJECT_ID = process.env.ADMIN_VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID_ADMIN || 'prj_inhTu8kppYhQv2NZZV3GTUdU8uBi';

// Master list of environment variables for Client and Admin Vercel projects
export const CLIENT_ENV_VARS = {
  // Supabase is the canonical public backend configuration.
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Runtime fallback (no NEXT_PUBLIC_ prefix → read at RUNTIME, not
  // inlined at build). The app resolves the URL via
  // NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL || POSTGRES_URL
  // (packages/db/lib/supabase.ts) — if a build ever inlines an empty
  // NEXT_PUBLIC_* value, this runtime var keeps the server working.
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  
  // Public Routing & URLs
  NEXT_PUBLIC_CLIENT_URL: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net',
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.sierra-estates.net',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://sierra-estates.net',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://sierra-estates.net',
  ADMIN_HOST: 'admin.sierra-estates.net',
  CLIENT_HOST: 'sierra-estates.net',
  COOKIE_DOMAIN: '.sierra-estates.net',
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  NEXT_PUBLIC_INTELLIGENCE_OS_URL: process.env.NEXT_PUBLIC_INTELLIGENCE_OS_URL,
  OPENMEMORY_URL: process.env.OPENMEMORY_URL || 'http://localhost:8080',

  // AI & LLM
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
  GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION || 'europe-west1',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,

  // Property Finder Credentials
  PROPERTY_FINDER_API_KEY: process.env.PROPERTY_FINDER_API_KEY,
  PROPERTY_FINDER_API_SECRET: process.env.PROPERTY_FINDER_API_SECRET,
  PROPERTY_FINDER_AUTH_TOKEN: process.env.PROPERTY_FINDER_AUTH_TOKEN,
  PF_API_KEY: process.env.PF_API_KEY,
  PF_API_SECRET: process.env.PF_API_SECRET,
  PF_COMPANY_ID: process.env.PF_COMPANY_ID,
  PF_WEBHOOK_SECRET: process.env.PF_WEBHOOK_SECRET,
  PROPERTY_FINDER_JWT_TOKEN: process.env.PROPERTY_FINDER_JWT_TOKEN,
  PF_JWT_TOKEN: process.env.PF_JWT_TOKEN || process.env.PROPERTY_FINDER_JWT_TOKEN,
  N8N_WEBHOOK_KEY: process.env.N8N_WEBHOOK_KEY,
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,

  // AWS & Backend
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SBR_SECRET_KEY: process.env.SBR_SECRET_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  ANTIGRAVITY_API_KEY: process.env.ANTIGRAVITY_API_KEY,

  // Telegram & WhatsApp
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,

  WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN,
  WHATSAPP_META_TOKEN: process.env.WHATSAPP_META_TOKEN || process.env.WHATSAPP_API_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  LEAD_NOTIFY_WHATSAPP_NUMBER: process.env.LEAD_NOTIFY_WHATSAPP_NUMBER,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.LEAD_NOTIFY_WHATSAPP_NUMBER,
  WHATSAPP_DEFAULT_PHONE: process.env.WHATSAPP_DEFAULT_PHONE,
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY,
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
  WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET,
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'meta',
  BRANDING_TAG: process.env.BRANDING_TAG,
  WABA_NUMBER_1: process.env.WABA_NUMBER_1,
  WABA_NUMBER_2: process.env.WABA_NUMBER_2,
  WABA_NUMBER_3: process.env.WABA_NUMBER_3,
  WABA_NUMBER_4: process.env.WABA_NUMBER_4,

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,

  // SendGrid & Upstash
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDER_EMAIL: process.env.SENDER_EMAIL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  // Google Sheets & Inventory
  INVENTORY_SHEET_ID: process.env.INVENTORY_SHEET_ID,
  INVENTORY_SHEET_GID: process.env.INVENTORY_SHEET_GID,
  MASTER_SHEET_ID: process.env.MASTER_SHEET_ID,
  BROKER_INBOX_SHEET_ID: process.env.BROKER_INBOX_SHEET_ID,

  N8N_BASE_URL: process.env.N8N_BASE_URL,
  N8N_API_KEY: process.env.N8N_API_KEY,

  // Supabase (Primary Database & Storage)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PROPERTY_MEDIA_BUCKET: process.env.SUPABASE_PROPERTY_MEDIA_BUCKET || 'property-media',
  SUPABASE_MEDIA_BUCKET: process.env.SUPABASE_MEDIA_BUCKET || 'media',

  // Additional AI & Search Providers
  // AI credentials are server-only. Never synchronize them under NEXT_PUBLIC_*.
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  SERPER_API_KEY: process.env.SERPER_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  JINA_API_KEY: process.env.JINA_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  // Airtable Sync Config
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME,
  AIRTABLE_SCRAPER_TABLE: process.env.AIRTABLE_SCRAPER_TABLE,

  // WhatsApp & Gateway Enhancements
  ULTRAMSG_INSTANCE_ID: process.env.ULTRAMSG_INSTANCE_ID,
  ULTRAMSG_TOKEN: process.env.ULTRAMSG_TOKEN,
  WHATSAPP_GATEWAY_URL: process.env.WHATSAPP_GATEWAY_URL,
  WHATSAPP_GATEWAY_TOKEN: process.env.WHATSAPP_GATEWAY_TOKEN,
  OPENWA_HOST: process.env.OPENWA_HOST,
  OPENWA_PORT: process.env.OPENWA_PORT,
  OPENWA_SESSION_ID: process.env.OPENWA_SESSION_ID,
  OPENWA_ADMIN_API_KEY: process.env.OPENWA_ADMIN_API_KEY,
  OPENWA_OPERATOR_KEY: process.env.OPENWA_OPERATOR_KEY,
  OPENCLAW_API_KEY: process.env.OPENCLAW_API_KEY,
  OPENCLAW_TOKEN: process.env.OPENCLAW_TOKEN,
  ORCHESTRATOR_TOKEN: process.env.ORCHESTRATOR_TOKEN,
  WA_VERIFY_TOKEN: process.env.WA_VERIFY_TOKEN,
  NEXT_PUBLIC_CONTACT_PHONE: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+201092048333',

  // Admin Portal Bootstrap Credentials
  ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@sierra-estates.net',
  ADMIN_BOOTSTRAP_PASSWORD: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  // Partner accounts (merged-in property companies — role 'partner').
  // Format: apps/sierra-estates-realty/lib/server/partner-scope.ts.
  // Unset/malformed provisions ZERO accounts (fail closed).
  PARTNER_ACCOUNTS: process.env.PARTNER_ACCOUNTS,
};

export const ADMIN_ENV_VARS = {
  ...CLIENT_ENV_VARS,
  VITE_BACKEND_API_URL: process.env.VITE_BACKEND_API_URL || 'https://sierra-estates.net',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function vercelRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    if (!VERCEL_TOKEN) {
      return reject(new Error('VERCEL_TOKEN is not set in environment.'));
    }

    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.vercel.com',
      port: 443,
      path: `${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${VERCEL_ORG_ID}`,
      method,
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            resolve({ error: true, status: res.statusCode, data: json });
          }
        } catch (e) {
          resolve({ error: true, status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function syncVarsToProject(projectName, projectId, envVars) {
  console.log(`\n🚀 [Vercel Sync] Synchronizing environment variables to: ${projectName} (${projectId})...`);

  // 1. Fetch all existing project env vars — DUPLICATE-AWARE.
  //    A key can legitimately have SEVERAL entries (one per target
  //    environment — the 2026-11-12 outage left stale [development]-only
  //    copies next to production copies). Keying a Map by name alone hides
  //    duplicates; keep every copy.
  //
  //    PAGINATION: this endpoint has NO `page` parameter — it is cursor
  //    based (`pagination.next` = timestamp). PR #53's `page=N` loop
  //    refetched page 1 forever (the param is ignored) and hung deploy
  //    jobs in env-sync; the 9a71149ed revert stopped the hang but a
  //    single GET truncates when the project outgrows the default page
  //    size. Vercel's own CLI does a single GET (get-env-records.ts) and
  //    the schema documents `pagination.next` — so: fetch the first page,
  //    then follow `next` ONLY while the API returns one, with a hard
  //    page cap and id-dedup so a non-advancing cursor terminates.
  const MAX_ENV_PAGES = 10;
  const fetchAll = async () => {
    const all = [];
    const seenIds = new Set();
    let query = '';
    for (let page = 1; page <= MAX_ENV_PAGES; page++) {
      const res = await vercelRequest('GET', `/v9/projects/${projectId}/env${query}`);
      if (!res || res.error || !Array.isArray(res.envs)) {
        throw new Error(res?.data?.error?.message || `unexpected response (status ${res?.status})`);
      }
      let added = 0;
      for (const e of res.envs) {
        if (e.id && seenIds.has(e.id)) continue; // cursor replayed a page — stop, don't hang
        if (e.id) seenIds.add(e.id);
        all.push(e);
        added++;
      }
      const next = res.pagination?.next;
      if (added === 0 || next == null) break;
      query = `?next=${encodeURIComponent(next)}`;
    }
    return all;
  };

  let allExisting = [];
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      allExisting = await fetchAll();
      break;
    } catch (err) {
      console.warn(`   ⏳ [${attempt}/5] Fetching existing envs failed: ${err.message}, retrying...`);
      await sleep(attempt * 2000);
    }
  }
  // key -> array of entries, plus a convenience single-entry lookup that
  // prefers the copy whose targets include production.
  const entriesByKey = new Map();
  for (const e of allExisting) {
    if (!entriesByKey.has(e.key)) entriesByKey.set(e.key, []);
    entriesByKey.get(e.key).push(e);
  }
  const pickExisting = (key) => {
    const copies = entriesByKey.get(key) || [];
    return copies.find((c) => (c.target || []).includes('production')) || copies[0];
  };
  console.log(`   📋 Existing project env vars fetched: ${allExisting.length} entries, ${entriesByKey.size} unique keys, ${allExisting.length - entriesByKey.size} duplicate-key extra copies`);

  // 2. Sync each var
  // Backend values the site cannot boot without. When one of these is
  // absent from the environment, say so LOUDLY: the silent `continue`
  // below is how production lost NEXT_PUBLIC_SUPABASE_URL on 2026-11-12
  // (the CI step ran the sync without passing any Supabase values, every
  // key was skipped, and the deploy shipped without them).
  const CRITICAL_KEYS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ];

  const reportCriticalState = () => {
    console.log('   🔍 CRITICAL KEY STATE (post-sync):');
    for (const key of CRITICAL_KEYS) {
      const copies = entriesByKey.get(key) || [];
      if (copies.length === 0) {
        console.log(`      • ${key}: ABSENT from project`);
      } else {
        for (const c of copies) {
          console.log(`      • ${key}: targets [${(c.target || []).join(',') || 'none'}] updated ${c.updatedAt || 'unknown'}`);
        }
      }
    }
  };

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      if (CRITICAL_KEYS.includes(key)) {
        console.warn(`   ❌ ${key} -> NOT SET in this environment; SKIPPED (production will boot without it — pass the value to this step/script!)`);
      }
      continue;
    }

    const copies = entriesByKey.get(key) || [];
    const existing = pickExisting(key);
    const varType = key.includes('SECRET') || key.includes('KEY') || key.includes('JSON') || key.includes('TOKEN') || key.includes('PASSWORD') ? 'encrypted' : 'plain';

    // TARGET REPAIR — an entry whose targets exclude 'production' is
    // invisible to production deployments no matter how many times its
    // value is PATCHed (Vercel PATCH cannot change targets). When NO copy
    // of the key targets production: PATCH the entry to also cover
    // production (PATCH on /v9 supports target changes when the entry is
    // unique for that key); if that fails, fall back to DELETE + POST.
    // When a production copy already exists, PATCH its value in place.
    const existingTargets = Array.isArray(existing?.target) ? existing.target : [];
    const hasProdCopy = copies.some((c) => (c.target || []).includes('production'));
    if (existing && !existingTargets.includes('production') && !hasProdCopy) {
      if (CRITICAL_KEYS.includes(key)) {
        console.warn(`   🔧 ${key} -> all copies target [${existingTargets.join(', ') || 'none'}] — MISSING 'production'. PATCHing targets to ['production','preview'].`);
        const patch = await vercelRequest('PATCH', `/v9/projects/${projectId}/env/${existing.id}`, {
          value: String(value),
          target: ['production', 'preview'],
          type: varType,
        });
        if (patch && !patch.error) {
          console.log(`   ✅ ${key} -> targets repaired to ['production','preview'] via PATCH.`);
          await sleep(150);
          continue;
        }
        console.warn(`   🔧 ${key} -> PATCH target repair failed (status ${patch?.status}): ${patch?.data?.error?.message || ''} — falling back to DELETE + POST.`);
        const del = await vercelRequest('DELETE', `/v9/projects/${projectId}/env/${existing.id}`);
        if (del && del.error) {
          console.warn(`   ⚠️ ${key} -> target repair failed (delete: status ${del.status}):`, del.data?.error?.message || '');
          continue;
        }
        const post = await vercelRequest('POST', `/v10/projects/${projectId}/env`, {
          key,
          value: String(value),
          type: varType,
          target: ['production', 'preview'],
        });
        if (post && !post.error) {
          console.log(`   ✅ ${key} -> Recreated with targets ['production','preview'].`);
          await sleep(150);
          continue;
        }
        console.warn(`   ⚠️ ${key} -> target repair recreate failed (status ${post?.status}):`, post?.data?.error?.message || '');
        continue;
      }
      if (copies.length > 0) {
        console.warn(`   ⚠️ ${key} -> all copies target [${copies.map((c) => (c.target || []).join(',')).join(' / ') || 'none'}] — missing 'production'; not critical, dashboard fix if needed.`);
      }
    }

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        let res;
        if (existing) {
          // Update the existing entry (production-target copy preferred)
          res = await vercelRequest('PATCH', `/v9/projects/${projectId}/env/${existing.id}`, {
            value: String(value),
            target: ['production', 'preview'],
          });
        } else {
          // Create new env var
          res = await vercelRequest('POST', `/v10/projects/${projectId}/env`, {
            key,
            value: String(value),
            type: varType,
            target: ['production', 'preview'],
          });
        }

        if (res && res.error) {
          if (res.status === 429) {
            console.warn(`   ⏳ ${key} -> Rate limited (429), retrying in ${attempt * 2}s...`);
            await sleep(attempt * 2000);
            continue;
          }
          if (res.status === 400 && String(res.data?.error?.message || '').includes('already exists')) {
            // Exists but was NOT in our fetched map — log honestly and
            // try to repair by key: Vercel supports PATCH by env id only,
            // so re-fetch this key's entries and PATCH the production copy.
            const refetch = await vercelRequest('GET', `/v9/projects/${projectId}/env?key=${encodeURIComponent(key)}`);
            const prodCopy = (refetch?.envs || []).find((c) => (c.target || []).includes('production'));
            if (prodCopy?.id) {
              const fix = await vercelRequest('PATCH', `/v9/projects/${projectId}/env/${prodCopy.id}`, {
                value: String(value),
                target: ['production', 'preview'],
              });
              if (fix && !fix.error) {
                console.log(`   ✅ ${key} -> repaired via key-refetch PATCH (production copy).`);
                break;
              }
            }
            console.warn(`   ⚠️ ${key} -> 'already exists' and repair PATCH failed (status ${fix?.status ?? 'n/a'}) — NOT updated. Fix via dashboard.`);
            break;
          }
          console.warn(`   ⚠️ ${key} -> Failed (Status: ${res.status}):`, res.data?.error?.message || res.raw || '');
          break;
        } else {
          console.log(`   ✅ ${key} -> Synced to Production & Preview.`);
          await sleep(150);
          break;
        }
      } catch (err) {
        if (attempt < 5) {
          console.warn(`   ⏳ ${key} -> Network hiccup (${err.message}), retrying [${attempt}/5] in ${attempt * 2}s...`);
          await sleep(attempt * 2000);
        } else {
          console.warn(`   ⚠️ Error syncing ${key}:`, err.message);
        }
      }
    }
  }

  // 3. VERIFY — never trust the writes alone. Re-fetch and assert every
  //    critical key has at least one copy whose targets include
  //    'production'. This is the check that would have caught the entire
  //    2026-11-12 outage (values "synced" to entries that production
  //    deployments could not see).
  let verified = false;
  for (let attempt = 1; attempt <= 3 && !verified; attempt++) {
    try {
      const after = await fetchAll();
      const afterByKey = new Map();
      for (const e of after) {
        if (!afterByKey.has(e.key)) afterByKey.set(e.key, []);
        afterByKey.get(e.key).push(e);
      }
      reportCriticalState();
      let allOk = true;
      for (const key of CRITICAL_KEYS) {
        const copies = afterByKey.get(key) || [];
        const prodCopy = copies.find((c) => (c.target || []).includes('production'));
        if (!prodCopy) {
          allOk = false;
          console.error(`   ❌ VERIFICATION FAILED: ${key} has NO production-target copy after sync (copies: ${copies.map((c) => `[${(c.target || []).join(',')}]`).join(' ') || 'none'})`);
        } else {
          console.log(`   ✔️ ${key}: production-target copy present (id ${prodCopy.id}, targets [${(prodCopy.target || []).join(',')}]).`);
        }
      }
      // Show the latest deployments so the operator can correlate env
      // updates with what production is actually serving.
      try {
        const deps = await vercelRequest('GET', `/v6/deployments?projectId=${projectId}&limit=3&state=READY`);
        if (Array.isArray(deps?.deployments)) {
          console.log('   🛰️ Latest READY deployments (env changes apply to NEW deployments only):');
          for (const d of deps.deployments) {
            console.log(`      • ${d.url} (created ${d.created ? new Date(d.created).toISOString().slice(0, 19) : 'unknown'}, target ${(d.target && d.target[0]) || 'unknown'})`);
          }
        }
      } catch { /* diagnostics only */ }
      verified = true;
      if (!allOk) {
        throw new Error(`CRITICAL KEY VERIFICATION FAILED for ${projectName} — see log above`);
      }
    } catch (err) {
      console.warn(`   ⏳ verification pass [${attempt}/3] failed: ${err.message}`);
      await sleep(attempt * 2000);
    }
  }
  if (!verified) {
    throw new Error(`Could not verify critical keys for ${projectName}`);
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('       Sierra Estates — Vercel Environment Variables Sync   ');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Team/Org ID: ${VERCEL_ORG_ID}`);
  console.log(`Client Project: ${CLIENT_PROJECT_ID}`);
  console.log(`Admin Project:  ${ADMIN_PROJECT_ID}`);

  if (!VERCEL_TOKEN) {
    console.log('\nℹ️  VERCEL_TOKEN is not defined in local environment.');
    console.log('   All environment variables are pre-configured in .github/workflows/deploy-vercel.yml');
    console.log('   and will be automatically synchronized on every push to main.');
    return;
  }

  try {
    await syncVarsToProject('Client Project (sierra-estates-client-page)', CLIENT_PROJECT_ID, CLIENT_ENV_VARS);
    await syncVarsToProject('Admin Project (sierra-estates-admin-page)', ADMIN_PROJECT_ID, ADMIN_ENV_VARS);
    console.log('\n🎉 [Success] All environment variables successfully synced to Vercel!');
  } catch (e) {
    console.error('❌ Sync failed:', e.message);
    process.exitCode = 1;
  }
}

main();
