/**
 * Sierra Estates — Central Automation, Cron & Sync Worker Registry (`/automations`)
 * Maps every scheduled worker, scraper, dispatcher, and Google Sheets synchronizer
 * with live environment-readiness verification (`ACTIVE` vs `NEEDS_ENV_KEY`).
 */

export type AutomationStatus = 'ACTIVE' | 'NEEDS_ENV_KEY';

export interface AutomationSpec {
  id: string;
  name: string;
  category: 'whatsapp' | 'telegram' | 'google-sheets' | 'inventory' | 'portal' | 'cron';
  entryPoint: string;
  scheduleOrTrigger: string;
  requiredEnvKeys: string[];
  anyOfEnvKeys?: string[];
  description: string;
}

export interface AutomationMatrixEntry extends AutomationSpec {
  status: AutomationStatus;
  missingEnvKeys: string[];
}

export const AUTOMATION_REGISTRY: AutomationSpec[] = [
  {
    id: 'wa-openwa-8line-pool',
    name: 'OpenWA 8-Line WhatsApp Gateway Pool',
    category: 'whatsapp',
    entryPoint: 'apps/agents/whatsapp-multi-session/server.js',
    scheduleOrTrigger: 'Daemon (Always-On Port 2785 + Cloudflare Tunnel)',
    requiredEnvKeys: ['WA_ADMIN_NUMBER'],
    anyOfEnvKeys: ['WHATSAPP_API_URL', 'WHATSAPP_GATEWAY_URL'],
    description: 'Manages 8 paired WhatsApp sessions with anti-ban human pacing, QR/pairing auth & health watchdog.',
  },
  {
    id: 'wa-group-auto-reply-split',
    name: 'WhatsApp Group Auto-Reply + Private 01092048333 Forwarder',
    category: 'whatsapp',
    entryPoint: 'apps/sierra-estates-realty/app/api/whatsapp/webhook/route.ts',
    scheduleOrTrigger: 'Real-Time Webhook on Inbound Group Messages',
    requiredEnvKeys: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    anyOfEnvKeys: ['WHATSAPP_API_URL', 'WHATSAPP_CLOUD_ACCESS_TOKEN'],
    description: 'Replies in WhatsApp group strictly with unit details + unit code (no phones), forwards owner/broker phone privately to 01092048333.',
  },
  {
    id: 'wa-scheduled-outbox-station',
    name: 'WhatsApp Station Scheduled Sender & Chat Scraper',
    category: 'whatsapp',
    entryPoint: 'apps/sierra-estates-realty/app/api/admin/whatsapp/outbox/route.ts',
    scheduleOrTrigger: 'Manual Dispatch / Scheduled Timer in /admin WhatsApp Station',
    requiredEnvKeys: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET'],
    anyOfEnvKeys: ['WHATSAPP_API_URL', 'WHATSAPP_GATEWAY_URL'],
    description: 'Schedules queued outreach messages and extracts owner vs broker units from pasted/live group chats.',
  },
  {
    id: 'wa-owner-outreach-cron',
    name: 'Owner 8-Line Arabic Outreach Worker',
    category: 'whatsapp',
    entryPoint: '.github/workflows/whatsapp-outreach.yml',
    scheduleOrTrigger: 'Cron every 30 min (10:00–20:00 Africa/Cairo)',
    requiredEnvKeys: ['INVENTORY_SHEET_ID'],
    anyOfEnvKeys: ['WHATSAPP_API_URL', 'SHEETS_WEBAPP_URL'],
    description: 'Executes batched 8-line Arabic owner check-ins with strict opt-out ledger & daily quota enforcement.',
  },
  {
    id: 'tg-intake-bot',
    name: 'Telegram Group & 1-to-1 Intake Bot',
    category: 'telegram',
    entryPoint: 'workflows/12-telegram-intake/bot.js',
    scheduleOrTrigger: 'Always-On Webhook / Long-Poll Listener',
    requiredEnvKeys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET'],
    description: 'Ingests photos & unit specs from authorized Telegram groups/DMs into New_Units / Telegram_Intake & Supabase.',
  },
  {
    id: 'sheets-inventory-bidirectional',
    name: 'Google Sheets Bi-Directional Inventory Sync (Owners Master / Real_Available_Units)',
    category: 'google-sheets',
    entryPoint: 'scripts/sync-sheets-inventory-bidirectional.mjs',
    scheduleOrTrigger: 'Daily Cron (06:30 UTC via /api/cron/sync-master-sheet) + On-Demand Admin',
    requiredEnvKeys: ['INVENTORY_SHEET_ID', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    anyOfEnvKeys: ['SHEETS_WEBAPP_URL', 'WF_SHEET_WRITE_URL'],
    description: 'Mirrors Supabase public.listings and Master_Inventory / Owners Master / Real_Available_Units tabs.',
  },
  {
    id: 'sheets-requests-careers-sync',
    name: 'Client Requests & Career Applications Online Sheet Sync',
    category: 'google-sheets',
    entryPoint: 'apps/sierra-estates-realty/lib/services/RequestSheetSyncService.ts',
    scheduleOrTrigger: 'Real-Time on /request, /api/inquiries, /api/viewing-requests, /api/careers/apply + Admin Sheet Sync',
    requiredEnvKeys: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    anyOfEnvKeys: ['SHEETS_WEBAPP_URL', 'WF_SHEET_WRITE_URL'],
    description: 'Syncs buyer demands, viewing requests, and employee career applications into Client_Requests & Career_Applications Google Sheet tabs.',
  },
  {
    id: 'vercel-cron-leads-listings',
    name: 'Cloudflare & GitHub Scheduled Daily Crons (Leads, Listings, Reservations)',
    category: 'cron',
    entryPoint: 'apps/sierra-estates-realty/app/api/cron/sync-leads/route.ts',
    scheduleOrTrigger: 'Cron: 00:00, 02:00, 06:00, 06:30 UTC (.github/workflows/automations.yml -> sierra-estates)',
    requiredEnvKeys: ['CRON_SECRET', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    description: 'Cleans expired reservations, re-indexes CRM leads, and detects inventory price changes on Cloudflare Worker sierra-estates.',
  },
  {
    id: 'property-finder-atlas-sync',
    name: 'Property Finder Enterprise Atlas v1 Syndication',
    category: 'portal',
    entryPoint: 'scripts/sync-propertyfinder.ts',
    scheduleOrTrigger: 'Daily Agent Fleet (.github/workflows/agent-fleet.yml) + Manual CLI',
    requiredEnvKeys: ['PROPERTY_FINDER_API_KEY', 'PROPERTY_FINDER_API_SECRET'],
    description: 'Publishes 8-gate validated PUBLISHABLE listings and ingests Property Finder portal leads.',
  },
  {
    id: 'rag-pgvector-embeddings',
    name: 'Gemini + pgvector Semantic Inventory Indexer',
    category: 'inventory',
    entryPoint: 'scripts/generate-supabase-embeddings.ts',
    scheduleOrTrigger: 'On New Listing / Daily Maintenance',
    requiredEnvKeys: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    anyOfEnvKeys: ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY'],
    description: 'Generates 768-d vector embeddings for unindexed public.listings rows.',
  },
];

export function getAutomationStatusMatrix(
  envSource: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {}
): AutomationMatrixEntry[] {
  return AUTOMATION_REGISTRY.map((spec) => {
    const missing: string[] = [];

    for (const key of spec.requiredEnvKeys) {
      const val = envSource[key];
      if (!val || String(val).trim().length === 0) {
        missing.push(key);
      }
    }

    if (spec.anyOfEnvKeys && spec.anyOfEnvKeys.length > 0) {
      const hasAny = spec.anyOfEnvKeys.some((k) => {
        const val = envSource[k];
        return Boolean(val && String(val).trim().length > 0);
      });
      if (!hasAny) {
        missing.push(`ONE_OF(${spec.anyOfEnvKeys.join(' | ')})`);
      }
    }

    return {
      ...spec,
      status: missing.length === 0 ? 'ACTIVE' : 'NEEDS_ENV_KEY',
      missingEnvKeys: missing,
    };
  });
}
