/**
 * Sierra Estates — Grouped Startup & Runtime Environment Validator
 * Consolidates env validation across LLM APIs, Database, Google Sheets,
 * WhatsApp/Telegram, and Deployment planes.
 */

export type EnvGroup =
  | 'DATABASE'
  | 'LLM_APIS'
  | 'GOOGLE_SHEETS'
  | 'WHATSAPP_TELEGRAM'
  | 'DEPLOYMENT';

export interface EnvVarSpec {
  key: string;
  group: EnvGroup;
  required: boolean;
  description: string;
  anyOfGroup?: string;
}

export const ENV_VAR_SPECS: EnvVarSpec[] = [
  // 1. DATABASE (Supabase)
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    group: 'DATABASE',
    required: true,
    description: 'Authoritative Supabase project URL',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    group: 'DATABASE',
    required: true,
    description: 'Supabase public anon key for RLS-scoped reads',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    group: 'DATABASE',
    required: true,
    description: 'Server-only Supabase admin key for backend mutations & storage',
  },
  {
    key: 'POSTGRES_URL',
    group: 'DATABASE',
    required: false,
    description: 'Direct PostgreSQL pooled connection string for migrations',
  },

  // 2. LLM_APIS
  {
    key: 'GEMINI_API_KEY',
    group: 'LLM_APIS',
    required: false,
    anyOfGroup: 'LLM_PRIMARY',
    description: 'Google Gemini API key for extraction, matching & embeddings',
  },
  {
    key: 'GOOGLE_GEMINI_API_KEY',
    group: 'LLM_APIS',
    required: false,
    anyOfGroup: 'LLM_PRIMARY',
    description: 'Alias Google Gemini API key',
  },
  {
    key: 'OPENAI_API_KEY',
    group: 'LLM_APIS',
    required: false,
    description: 'OpenAI Agents SDK API key',
  },
  {
    key: 'DEEPSEEK_API_KEY',
    group: 'LLM_APIS',
    required: false,
    description: 'DeepSeek reasoning & valuation harness API key',
  },

  // 3. GOOGLE_SHEETS
  {
    key: 'INVENTORY_SHEET_ID',
    group: 'GOOGLE_SHEETS',
    required: true,
    description: 'Master Inventory Google Sheet ID',
  },
  {
    key: 'MASTER_SHEET_ID',
    group: 'GOOGLE_SHEETS',
    required: false,
    description: 'Owners Master spreadsheet ID',
  },
  {
    key: 'SHEETS_WEBAPP_URL',
    group: 'GOOGLE_SHEETS',
    required: false,
    anyOfGroup: 'SHEETS_WRITE_ENDPOINT',
    description: 'Google Apps Script Web App URL for bi-directional sheet sync',
  },
  {
    key: 'WF_SHEET_WRITE_URL',
    group: 'GOOGLE_SHEETS',
    required: false,
    anyOfGroup: 'SHEETS_WRITE_ENDPOINT',
    description: 'Apps Script Web App URL fallback for workflow write-back',
  },
  {
    key: 'SIERRA_SECRET_KEY',
    group: 'GOOGLE_SHEETS',
    required: false,
    description: 'Shared HMAC/secret header for Google Apps Script doPost endpoint',
  },

  // 4. WHATSAPP_TELEGRAM
  {
    key: 'WHATSAPP_API_URL',
    group: 'WHATSAPP_TELEGRAM',
    required: false,
    anyOfGroup: 'WHATSAPP_TRANSPORT',
    description: 'OpenWA 8-line station base URL (e.g. http://127.0.0.1:2785 or tunnel)',
  },
  {
    key: 'WHATSAPP_CLOUD_ACCESS_TOKEN',
    group: 'WHATSAPP_TELEGRAM',
    required: false,
    anyOfGroup: 'WHATSAPP_TRANSPORT',
    description: 'Meta WhatsApp Cloud API permanent access token',
  },
  {
    key: 'OPENWA_ADMIN_API_KEY',
    group: 'WHATSAPP_TELEGRAM',
    required: false,
    description: 'Admin API key authenticating OpenWA multi-session gateway requests',
  },
  {
    key: 'WA_ADMIN_NUMBER',
    group: 'WHATSAPP_TELEGRAM',
    required: false,
    description: 'Private admin phone number for confidential owner/broker contact forwarding (01092048333)',
  },
  {
    key: 'TELEGRAM_BOT_TOKEN',
    group: 'WHATSAPP_TELEGRAM',
    required: false,
    description: 'Telegram bot token for real estate group & 1-to-1 intake',
  },

  // 5. DEPLOYMENT
  {
    key: 'SESSION_SECRET',
    group: 'DEPLOYMENT',
    required: true,
    description: 'HMAC-SHA256 signing key for sierra_sess admin cookies',
  },
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    group: 'DEPLOYMENT',
    required: false,
    description: 'Canonical public portal URL (https://sierra-estates.net)',
  },
  {
    key: 'CRON_SECRET',
    group: 'DEPLOYMENT',
    required: false,
    description: 'Bearer secret protecting /api/cron/dispatch endpoints (GitHub Actions scheduler)',
  },
];

export interface EnvGroupStatus {
  group: EnvGroup;
  configuredCount: number;
  totalCount: number;
  ready: boolean;
  missingRequired: string[];
  missingOptional: string[];
}

export interface EnvValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  groups: Record<EnvGroup, EnvGroupStatus>;
  summary: string;
}

export function validateEnv(options?: {
  strict?: boolean;
  groups?: EnvGroup[];
  source?: Record<string, string | undefined>;
}): EnvValidationResult {
  const envSource = options?.source ?? (typeof process !== 'undefined' ? process.env : {});
  const targetGroups = options?.groups;

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const anyOfSatisfied: Record<string, boolean> = {};

  for (const spec of ENV_VAR_SPECS) {
    if (spec.anyOfGroup) {
      const val = envSource[spec.key];
      if (val && String(val).trim().length > 0) {
        anyOfSatisfied[spec.anyOfGroup] = true;
      }
    }
  }

  const groupBuckets: Record<EnvGroup, EnvGroupStatus> = {
    DATABASE: { group: 'DATABASE', configuredCount: 0, totalCount: 0, ready: true, missingRequired: [], missingOptional: [] },
    LLM_APIS: { group: 'LLM_APIS', configuredCount: 0, totalCount: 0, ready: true, missingRequired: [], missingOptional: [] },
    GOOGLE_SHEETS: { group: 'GOOGLE_SHEETS', configuredCount: 0, totalCount: 0, ready: true, missingRequired: [], missingOptional: [] },
    WHATSAPP_TELEGRAM: { group: 'WHATSAPP_TELEGRAM', configuredCount: 0, totalCount: 0, ready: true, missingRequired: [], missingOptional: [] },
    DEPLOYMENT: { group: 'DEPLOYMENT', configuredCount: 0, totalCount: 0, ready: true, missingRequired: [], missingOptional: [] },
  };

  for (const spec of ENV_VAR_SPECS) {
    if (targetGroups && !targetGroups.includes(spec.group)) continue;

    const bucket = groupBuckets[spec.group];
    bucket.totalCount += 1;

    const raw = envSource[spec.key];
    const isSet = Boolean(raw && String(raw).trim().length > 0);
    const coveredByAnyOf = Boolean(spec.anyOfGroup && anyOfSatisfied[spec.anyOfGroup]);

    if (isSet) {
      bucket.configuredCount += 1;
    } else if (spec.required && !coveredByAnyOf) {
      missingRequired.push(spec.key);
      bucket.missingRequired.push(spec.key);
      bucket.ready = false;
    } else if (!coveredByAnyOf) {
      missingOptional.push(spec.key);
      bucket.missingOptional.push(spec.key);
    }
  }

  const valid = missingRequired.length === 0;
  const summary = valid
    ? `Environment validation PASSED (${Object.values(groupBuckets).reduce((a, b) => a + b.configuredCount, 0)} keys active).`
    : `Environment validation FAILED — missing required keys: ${missingRequired.join(', ')}`;

  if (!valid && options?.strict) {
    throw new Error(
      `[Sierra Core EnvValidator]Startup aborted due to missing required environment variables:\n` +
        missingRequired
          .map((k) => {
            const spec = ENV_VAR_SPECS.find((s) => s.key === k);
            return `  - ${k} (${spec?.group ?? 'UNKNOWN'}): ${spec?.description ?? ''}`;
          })
          .join('\n')
    );
  }

  return {
    valid,
    missingRequired,
    missingOptional,
    groups: groupBuckets,
    summary,
  };
}
