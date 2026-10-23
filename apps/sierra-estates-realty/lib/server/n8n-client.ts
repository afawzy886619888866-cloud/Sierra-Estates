import 'server-only';
import { logger } from '@/lib/logger';

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

/**
 * Triggers a registered n8n webhook workflow (see workflows/n8n-templates/*.json
 * for the registered `path` values, e.g. "leila-lead-webhook").
 * No-ops with a warning when N8N_BASE_URL isn't configured, mirroring the
 * graceful-degradation pattern used by lib/server/firebase-admin.ts and lib/arize.ts.
 */
export async function triggerN8nWebhook(
  webhookPath: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!N8N_BASE_URL) {
    logger.warn(`⚠️ [n8n] N8N_BASE_URL not configured — skipping webhook "${webhookPath}"`);
    return false;
  }

  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/${webhookPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_API_KEY ? { 'X-N8N-API-KEY': N8N_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      logger.error(`❌ [n8n] Webhook "${webhookPath}" failed (${response.status}): ${errText}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`❌ [n8n] Webhook "${webhookPath}" request failed:`, error);
    return false;
  }
}
