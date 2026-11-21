#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * SUPER BROKER MEMORY (the Soul) — wiring self-test.
 * Static verification that every piece of the Soul is present and wired:
 * migration ↔ lib ↔ admin/agent/cron routes ↔ dispatcher ↔ automation
 * registry ↔ admin portal ↔ nav-access ↔ engine hooks. Run: node scripts/soul-selftest.js
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'apps', 'sierra-estates-realty');

let pass = 0, fail = 0;
function check(name, condition, detail = '') {
  if (condition) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
function read(p) {
  const full = path.join(ROOT, p);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

console.log('\n=== Super Broker Memory (Soul) wiring self-test ===\n');

// 1. Migration
const migration = read('supabase/migrations/20261120_054_super_broker_memory.sql');
check('migration 054 exists', !!migration);
check('migration creates broker_memory_entries', !!migration && /CREATE TABLE IF NOT EXISTS public\.broker_memory_entries/.test(migration));
check('migration creates broker_memory_digests', !!migration && /CREATE TABLE IF NOT EXISTS public\.broker_memory_digests/.test(migration));
check('migration dedupe unique index', !!migration && /broker_memory_entries_dedupe_key_unique/.test(migration));
check('migration enables RLS on both tables', !!migration && (migration.match(/ENABLE ROW LEVEL SECURITY/g) || []).length >= 2);
check('migration CHECK constraints bind kind/scope/importance', !!migration && /kind_chk/.test(migration) && /scope_chk/.test(migration) && /importance_chk/.test(migration));

// 2. Core lib
const lib = read('apps/sierra-estates-realty/lib/memory/broker-soul.ts');
check('lib/memory/broker-soul.ts exists', !!lib);
for (const fn of ['soulRemember', 'soulRecall', 'soulContext', 'soulConsolidate', 'getSoulStats', 'listSoulDigests', 'soulArchive', 'soulDelete', 'withSoul', 'soulDedupeKey']) {
  check(`lib exports ${fn}`, !!lib && new RegExp(`(export (async )?function ${fn}|export async function ${fn})`).test(lib));
}
check('lib is server-only', !!lib && /import 'server-only'/.test(lib));
check('lib routes consolidation through the free-provider LLM router', !!lib && /routeChatCompletion/.test(lib));
check('lib degrades gracefully when migration not applied', !!lib && /soul-not-migrated/.test(lib));
check('lib carries the privacy lock (no raw phone numbers)', !!lib && /privacy lock/i.test(lib));

// 3. Routes
const adminRoute = read('apps/sierra-estates-realty/app/api/admin/soul/route.ts');
check('admin route /api/admin/soul exists', !!adminRoute);
check('admin route is verifyAdminRequest-guarded', !!adminRoute && /verifyAdminRequest/.test(adminRoute));
check('admin route zod-validated', !!adminRoute && /safeParse/.test(adminRoute));
const agentRoute = read('apps/sierra-estates-realty/app/api/agents/soul/route.ts');
check('agent route /api/agents/soul exists', !!agentRoute);
check('agent route uses the SBR shared secret', !!agentRoute && /x-sbr-secret-key/.test(agentRoute) && /SBR_SECRET_KEY/.test(agentRoute));
check('agent route rejects phone-number content (privacy lock ③)', !!agentRoute && /looksLikePhone/.test(agentRoute));
const cronRoute = read('apps/sierra-estates-realty/app/api/cron/memory-consolidation/route.ts');
check('cron route memory-consolidation exists', !!cronRoute);
check('cron route is verifyCronRequest-guarded', !!cronRoute && /verifyCronRequest/.test(cronRoute));

// 4. Automation wiring
const dispatch = read('apps/sierra-estates-realty/app/api/cron/dispatch/[job]/route.ts');
check('dispatcher maps memory-consolidation', !!dispatch && /'memory-consolidation': \(\) => import\('\.\.\/\.\.\/memory-consolidation\/route'\)/.test(dispatch));
const jobs = read('apps/sierra-estates-realty/lib/server/automation-jobs.ts');
check('automation registry registers memory-consolidation (dedupe 12h)', !!jobs && /name: 'memory-consolidation'/.test(jobs) && /dedupeHours: 12/.test(jobs));

// 5. Admin UI wiring
const view = read('apps/sierra-estates-realty/app/admin/views/SuperBrokerMemoryView.tsx');
check('admin view SuperBrokerMemoryView exists', !!view);
check('view hits /api/admin/soul', !!view && /\/api\/admin\/soul/.test(view));
check('view has a Consolidate action', !!view && /consolidate/.test(view));
check('view is bilingual (ar/en)', !!view && /labelEn|lang === 'ar'|isAr/.test(view) && /الروح/.test(view));
const portal = read('apps/sierra-estates-realty/app/admin/AdminPortal.tsx');
check('portal imports SuperBrokerMemoryView', !!portal && /import SuperBrokerMemoryView from '@\/app\/admin\/views\/SuperBrokerMemoryView'/.test(portal));
check('portal tab super_broker_memory registered', !!portal && /id: 'super_broker_memory'/.test(portal));
check('portal case super_broker_memory renders view', !!portal && /case 'super_broker_memory':return <SuperBrokerMemoryView/.test(portal));
const nav = read('apps/sierra-estates-realty/lib/admin-nav-access.ts');
check('nav access grants super_broker_memory (default-deny map)', !!nav && /super_broker_memory: \['automation:read'\]/.test(nav));

// 6. Engine hooks — the Soul grows from real engines
const ingest = read('apps/sierra-estates-realty/app/api/ingest/whatsapp/route.ts');
check('engine hook: whatsapp ingest remembers listings', !!ingest && /soulRemember/.test(ingest) && /whatsapp-ingest/.test(ingest));
check('engine hook: whatsapp ingest omits sender phone from Soul content', !!ingest && /no phone numbers \(privacy lock/.test(ingest));
const sla = read('apps/sierra-estates-realty/app/api/cron/check-availability-sla/route.ts');
check('engine hook: availability engine remembers SLA sweeps', !!sla && /availability-engine/.test(sla));
const price = read('apps/sierra-estates-realty/app/api/cron/price-index/route.ts');
check('engine hook: price-index engine remembers snapshots', !!price && /price-index-engine/.test(price));
const catalog = read('apps/sierra-estates-realty/app/api/cron/llm-catalog-refresh/route.ts');
check('engine hook: llm-router remembers fleet health', !!catalog && /llm-fleet-health/.test(catalog));

// 7. Secrets hygiene — no literal credentials anywhere in the Soul
const soulFiles = [
  'apps/sierra-estates-realty/lib/memory/broker-soul.ts',
  'apps/sierra-estates-realty/lib/server/agent-bearer.ts',
  'apps/sierra-estates-realty/app/api/admin/soul/route.ts',
  'apps/sierra-estates-realty/app/api/agents/soul/route.ts',
  'apps/sierra-estates-realty/app/api/agents/openclaw/v1/chat/completions/route.ts',
  'apps/sierra-estates-realty/app/api/agents/openclaw/v1/models/route.ts',
  'apps/sierra-estates-realty/app/api/cron/memory-consolidation/route.ts',
  'apps/sierra-estates-realty/app/admin/views/SuperBrokerMemoryView.tsx',
  'supabase/migrations/20261120_054_super_broker_memory.sql',
];
const secretPattern = /(ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_\-]{20,}|Bearer [A-Za-z0-9_\-]{25,})/;
let secretsClean = true;
for (const f of soulFiles) {
  const content = read(f);
  if (content && secretPattern.test(content)) { secretsClean = false; console.log(`        secret-pattern hit in ${f}`); }
}
check('no literal secrets in Soul files', secretsClean);

// 8. OpenClaw gateway — OpenAI-compatible API for the user's OpenClaw agent
const bearer = read('apps/sierra-estates-realty/lib/server/agent-bearer.ts');
check('agent bearer auth helper exists (SBR_SECRET_KEY, constant-time)', !!bearer && /verifyBearerSecret/.test(bearer) && /timingSafeEqual/.test(bearer) && /SBR_SECRET_KEY/.test(bearer));
const ocChat = read('apps/sierra-estates-realty/app/api/agents/openclaw/v1/chat/completions/route.ts');
check('OpenClaw chat/completions route exists (OpenAI-compatible)', !!ocChat && /chat\.completion/.test(ocChat) && /choices/.test(ocChat));
check('OpenClaw gateway is bearer-guarded (never a real LLM key)', !!ocChat && /verifyBearerSecret/.test(ocChat));
check('OpenClaw gateway routes through the free-provider LLM router', !!ocChat && /routeChatCompletion/.test(ocChat) && /agent: 'openclaw'/.test(ocChat));
check('OpenClaw gateway injects Soul memory before answering', !!ocChat && /soulContext/.test(ocChat));
check('OpenClaw gateway remembers the exchange on the spine', !!ocChat && /soulRemember/.test(ocChat) && /'openclaw'/.test(ocChat));
check('OpenClaw gateway enforces the privacy lock on user content', !!ocChat && /looksLikePhone/.test(ocChat) && /422/.test(ocChat));
check('OpenClaw gateway is non-streaming (honest 400 on stream:true)', !!ocChat && /stream/.test(ocChat) && /non-streaming only/.test(ocChat));
const ocModels = read('apps/sierra-estates-realty/app/api/agents/openclaw/v1/models/route.ts');
check('OpenClaw models route exists (soul-auto + enabled defaults)', !!ocModels && /soul-auto/.test(ocModels) && /listProviders/.test(ocModels));

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail ? 1 : 0);
