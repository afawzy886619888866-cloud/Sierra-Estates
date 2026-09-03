#!/usr/bin/env node
/**
 * Fails when a compiled `.js` file is committed next to the `.ts`/`.tsx` it was
 * built from.
 *
 * These twins have broken the repository twice. They are invisible in review —
 * a diff of 400 generated files reads as noise — but they shadow their source
 * at runtime: Jest collects `__tests__/foo.test.js` as its own suite and fails
 * to parse it, and a stale twin of a migrated module silently serves the old
 * implementation. Both happened.
 *
 * The root cause each time was a tool emitting alongside the source. The root
 * tsconfig sets `noEmit`, so anything that appears here came from a separate
 * compiler; this check is the backstop for whatever that turns out to be.
 *
 * Pre-existing twins are grandfathered via ALLOWED below so the check can be
 * turned on without a mass deletion. Do not add to that list to silence a new
 * failure — delete the generated file and stop whatever emitted it.
 */
import { execFileSync } from 'node:child_process';

/** Twins that predate this check. Shrink this list; never grow it. */
const ALLOWED = new Set([
  'apps/agents/__tests__/agents-bots.test.js',
  'apps/agents/whatsapp-bot/__tests__/integration.test.js',
  'apps/agents/whatsapp-bot/__tests__/router.test.js',
  'apps/agents/whatsapp-bot/chat-hermes.js',
  'apps/agents/whatsapp-bot/import-whitelist.js',
  'apps/agents/whatsapp-bot/index.js',
  'apps/agents/whatsapp-bot/phone.js',
  'apps/agents/whatsapp-bot/property-finder.js',
  'apps/agents/whatsapp-bot/router.js',
  'apps/automations/src/01-whatsapp-scraper/index.js',
  'apps/automations/src/02-owner-search/index.js',
  'apps/automations/src/03-owner-contact/index.js',
  'apps/automations/src/04-email-sender/index.js',
  'apps/automations/src/05-unit-adder/index.js',
  'apps/sierra-estates-realty/config/views.js',
  'apps/sierra-estates-realty/data/houyez-properties.js',
  'apps/sierra-estates-realty/data/mock-properties.js',
  'apps/sierra-estates-realty/mcp-servers/docusign-signing.mcp.js',
  'apps/sierra-estates-realty/mcp-servers/sierra-deals.mcp.js',
  'apps/sierra-estates-realty/mcp-servers/stage-9-orchestration.mcp.js',
  'apps/sierra-estates-realty/mcp-servers/stripe-payments.mcp.js',
  'apps/sierra-estates-realty/mcp-servers/whatsapp-messaging.mcp.js',
  'apps/sierra-estates-realty/types/crm.js',
  'apps/sierra-estates-realty/types/sierra-estates.js',
  'packages/api/whatsapp-webhook.js',
  'packages/open-memory/apps/vscode-extension/src/detectors/openmemory.js',
  'packages/open-memory/apps/vscode-extension/src/extension.js',
  'packages/open-memory/apps/vscode-extension/src/hooks/ideEvents.js',
  'packages/open-memory/apps/vscode-extension/src/panels/DashboardPanel.js',
  'packages/open-memory/apps/vscode-extension/src/utils/diff.js',
  'packages/open-memory/apps/vscode-extension/src/writers/claude.js',
  'packages/open-memory/apps/vscode-extension/src/writers/codex.js',
  'packages/open-memory/apps/vscode-extension/src/writers/copilot.js',
  'packages/open-memory/apps/vscode-extension/src/writers/cursor.js',
  'packages/open-memory/apps/vscode-extension/src/writers/windsurf.js',
  'packages/open-memory/dashboard/app/api/settings/route.js',
  'packages/open-memory/dashboard/instrumentation.js',
  'packages/open-memory/dashboard/lib/api.js',
  'packages/open-memory/dashboard/lib/colors.js',
  'packages/open-memory/dashboard/lib/memory-ai-engine.js',
  'packages/open-memory/dashboard/lib/utils.js',
  'packages/open-memory/examples/node/agents/research_assistant.js',
  'packages/open-memory/examples/node/conversation_manager.js',
  'packages/open-memory/examples/node/integrations/discord.js',
  'packages/open-memory/examples/node/patterns/semantic_caching.js',
  'packages/open-memory/examples/node/patterns/user_profiling.js',
  'packages/open-memory/packages/openmemory-js/src/ai/graph.js',
  'packages/open-memory/packages/openmemory-js/src/ai/mcp.js',
  'packages/open-memory/packages/openmemory-js/src/ai/mcp_tools.js',
  'packages/open-memory/packages/openmemory-js/src/cli.js',
  'packages/open-memory/packages/openmemory-js/src/core/cfg.js',
  'packages/open-memory/packages/openmemory-js/src/core/db.js',
  'packages/open-memory/packages/openmemory-js/src/core/identifiers.js',
  'packages/open-memory/packages/openmemory-js/src/core/memory.js',
  'packages/open-memory/packages/openmemory-js/src/core/migrate.js',
  'packages/open-memory/packages/openmemory-js/src/core/models.js',
  'packages/open-memory/packages/openmemory-js/src/core/pg_ssl.js',
  'packages/open-memory/packages/openmemory-js/src/core/telemetry.js',
  'packages/open-memory/packages/openmemory-js/src/core/types.js',
  'packages/open-memory/packages/openmemory-js/src/core/vector/postgres.js',
  'packages/open-memory/packages/openmemory-js/src/core/vector/valkey.js',
  'packages/open-memory/packages/openmemory-js/src/core/vector_store.js',
  'packages/open-memory/packages/openmemory-js/src/index.js',
  'packages/open-memory/packages/openmemory-js/src/memory/decay.js',
  'packages/open-memory/packages/openmemory-js/src/memory/embed.js',
  'packages/open-memory/packages/openmemory-js/src/memory/hsg.js',
  'packages/open-memory/packages/openmemory-js/src/memory/reflect.js',
  'packages/open-memory/packages/openmemory-js/src/memory/user_summary.js',
  'packages/open-memory/packages/openmemory-js/src/ops/compress.js',
  'packages/open-memory/packages/openmemory-js/src/ops/dynamics.js',
  'packages/open-memory/packages/openmemory-js/src/ops/extract.js',
  'packages/open-memory/packages/openmemory-js/src/ops/ingest.js',
  'packages/open-memory/packages/openmemory-js/src/server.js',
  'packages/open-memory/packages/openmemory-js/src/server/handler.js',
  'packages/open-memory/packages/openmemory-js/src/server/index.js',
  'packages/open-memory/packages/openmemory-js/src/server/middleware/auth.js',
  'packages/open-memory/packages/openmemory-js/src/server/middleware/tenant.js',
  'packages/open-memory/packages/openmemory-js/src/server/middleware/validate.js',
  'packages/open-memory/packages/openmemory-js/src/server/middleware/webhook.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/compression.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/dashboard.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/dynamics.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/ide.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/index.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/langgraph.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/memory.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/sources.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/system.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/temporal.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/users.js',
  'packages/open-memory/packages/openmemory-js/src/server/routes/vercel.js',
  'packages/open-memory/packages/openmemory-js/src/server/server.js',
  'packages/open-memory/packages/openmemory-js/src/sources/base.js',
  'packages/open-memory/packages/openmemory-js/src/sources/github.js',
  'packages/open-memory/packages/openmemory-js/src/sources/google_drive.js',
  'packages/open-memory/packages/openmemory-js/src/sources/google_sheets.js',
  'packages/open-memory/packages/openmemory-js/src/sources/google_slides.js',
  'packages/open-memory/packages/openmemory-js/src/sources/index.js',
  'packages/open-memory/packages/openmemory-js/src/sources/notion.js',
  'packages/open-memory/packages/openmemory-js/src/sources/onedrive.js',
  'packages/open-memory/packages/openmemory-js/src/sources/web_crawler.js',
  'packages/open-memory/packages/openmemory-js/src/temporal_graph/index.js',
  'packages/open-memory/packages/openmemory-js/src/temporal_graph/query.js',
  'packages/open-memory/packages/openmemory-js/src/temporal_graph/store.js',
  'packages/open-memory/packages/openmemory-js/src/temporal_graph/timeline.js',
  'packages/open-memory/packages/openmemory-js/src/temporal_graph/types.js',
  'packages/open-memory/packages/openmemory-js/src/utils/chunking.js',
  'packages/open-memory/packages/openmemory-js/src/utils/index.js',
  'packages/open-memory/packages/openmemory-js/src/utils/keyword.js',
  'packages/open-memory/packages/openmemory-js/src/utils/text.js',
  'packages/open-memory/packages/openmemory-js/tests/mcp_per_tenant.test.js',
  'packages/open-memory/packages/openmemory-js/tests/multilingual_dedup.test.js',
  'packages/open-memory/packages/openmemory-js/tests/omnibus.test.js',
  'packages/open-memory/packages/openmemory-js/tests/temporal_per_tenant.test.js',
  'packages/open-memory/packages/openmemory-js/tests/test_project_isolation.js',
  'packages/open-memory/packages/openmemory-js/tests/verify.test.js',
  'packages/open-memory/packages/openmemory-js/tests/webhook.test.js',
  'packages/open-memory/packages/openmemory-js/vitest.config.js',
  'scripts/check-thresholds.js',
  'scripts/deploy-smoke-test.js',
  'scripts/estimate-costs.js',
  'scripts/export-airtable-sheet.js',
  'scripts/export-master-excel-csv.js',
  'scripts/extract-whatsapp-chat.js',
  'scripts/generate-daily-briefing.js',
  'scripts/generate-supabase-embeddings.js',
  'scripts/merge-ecc-memory.js',
  'scripts/merge-inventory-master.js',
  'scripts/migrate-data-to-supabase.js',
  'scripts/openclaw-task-runner.js',
  'scripts/publish-recommendation.js',
  'scripts/run-harness.js',
  'scripts/seed-openclaw-memory.js',
  'scripts/sierra-mcp-server.js',
  'scripts/simulate-lead-channels.js',
  'scripts/src/backup-firebase.js',
  'scripts/src/hello.js',
  'scripts/sync-propertyfinder.js',
  'scripts/telegram-bot-runner.js',
  'scripts/test-production.js',
  'scripts/verify-deploy-readiness.js',
  'scripts/vertex-agent-runner.js',
  'scripts/write-memory.js',
]);

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0')
  .filter(Boolean)
  .filter((p) => !p.includes('node_modules/'));

const sources = new Set(tracked.filter((p) => p.endsWith('.ts') || p.endsWith('.tsx')));

const offenders = tracked.filter((p) => {
  if (!p.endsWith('.js') || ALLOWED.has(p)) return false;
  const stem = p.slice(0, -'.js'.length);
  return sources.has(`${stem}.ts`) || sources.has(`${stem}.tsx`);
});

// A grandfathered entry that no longer exists is stale — report it so the list
// shrinks as the twins are cleaned up, rather than drifting out of date.
const trackedSet = new Set(tracked);
const staleAllowances = [...ALLOWED].filter((p) => !trackedSet.has(p));

if (offenders.length > 0) {
  console.error(
    `\n❌ ${offenders.length} compiled .js file(s) are committed beside their TypeScript source:\n`
  );
  for (const p of offenders) console.error(`   ${p}`);
  console.error(
    '\nDelete them and stop whatever emitted them (the root tsconfig sets noEmit).' +
      '\nThese shadow their source at runtime — Jest runs the .js twin as its own' +
      '\nsuite, and a stale twin of a migrated module serves the old code.\n'
  );
  process.exit(1);
}

if (staleAllowances.length > 0) {
  console.log(`note: ${staleAllowances.length} grandfathered entr(y|ies) no longer exist — remove from ALLOWED:`);
  for (const p of staleAllowances) console.log(`   ${p}`);
}

console.log(`✓ no compiled .js twins (${ALLOWED.size} grandfathered)`);
