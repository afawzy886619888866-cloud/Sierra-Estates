import { logger } from '@/lib/logger';

export interface P0InboundLeadPayload {
  leadId: string;
  phone: string;
  name: string;
  reference: string;
  greetingBody: string;
}

export interface P0InboundDispatchResult {
  dispatched: boolean;
  priority: 'P0_INBOUND';
  endpoint: string;
  status?: number;
  error?: string;
}

/**
 * Triggers workflow 13 (`13-paced-outreach`) with priority `P0_INBOUND` so a
 * Property Finder inbound lead receives a warm WhatsApp intro within 60s.
 */
export async function dispatchP0InboundToWorkflowRunner(
  payload: P0InboundLeadPayload,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<P0InboundDispatchResult> {
  const baseUrl = (process.env.WORKFLOW_RUNNER_URL || 'http://127.0.0.1:2786').replace(/\/$/, '');
  const endpoint = `${baseUrl}/api/workflows/13-paced-outreach/run`;

  if (typeof fetchImpl !== 'function') {
    return { dispatched: false, priority: 'P0_INBOUND', endpoint, error: 'fetch_unavailable' };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = (process.env.RUNNER_API_KEY || '').trim();
  if (apiKey) headers['X-API-Key'] = apiKey;

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        priority: 'P0_INBOUND',
        leadId: payload.leadId,
        phone: payload.phone,
        name: payload.name,
        reference: payload.reference,
        greeting: payload.greetingBody,
        source: 'property-finder',
      }),
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(5000)
        : undefined,
    });
    return {
      dispatched: res.ok,
      priority: 'P0_INBOUND',
      endpoint,
      status: res.status,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.warn(`[pf-webhook] P0_INBOUND dispatch to ${endpoint} failed (non-fatal): ${errMsg}`);
    return {
      dispatched: false,
      priority: 'P0_INBOUND',
      endpoint,
      error: errMsg,
    };
  }
}
