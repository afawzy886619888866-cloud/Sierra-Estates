/**
 * Exchange Sheet client — the shared bus Admin UI, agents, workflows and
 * webhooks post task records to.
 *
 * Backed by the `exchange` table. The Firestore version exposed onSnapshot
 * subscriptions, so the Admin Hub updated live. Postgres reads are one-shot,
 * so `subscribeExchange` polls on an interval and keeps the same
 * subscribe/unsubscribe contract its callers already use — a dashboard that
 * refreshes every few seconds is closer to the old behaviour than one that
 * never refreshes at all. Supabase Realtime is the drop-in upgrade if the
 * latency ever matters.
 */
import { insertRecord, listRecords, updateRecord } from '@sierra-estates/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExchangeType =
  | 'agent_task'
  | 'workflow_run'
  | 'admin_signal'
  | 'crm_event'
  | 'lead_update'
  | 'property_match'
  | 'proposal_ready';

export type ExchangeStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled';

export type ExchangeSource = 'admin' | 'agent' | 'workflow' | 'webhook' | 'system';

export interface ExchangeRecord {
  id: string;
  type: ExchangeType;
  source: ExchangeSource;
  status: ExchangeStatus;
  payload: Record<string, unknown>;
  /** ISO-8601, as timestamptz arrives over PostgREST. */
  createdAt: string;
  updatedAt: string;
  // Optional links
  agentId?: string;
  workflowId?: string;
  leadId?: string;
  propertyId?: string;
  userId?: string;
  // Output
  result?: unknown;
  error?: string;
  // Progress (0–100)
  progress?: number;
  stepName?: string;
}

export type ExchangeCreateInput = Omit<ExchangeRecord, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Table ────────────────────────────────────────────────────────────────────

const EXCHANGE_TABLE = 'exchange';

/** Cancels a subscription started by subscribeExchange. */
export type Unsubscribe = () => void;

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Write a new record to the Exchange Sheet.
 * Used by: Admin UI, Agents, Workflows, Webhooks
 */
export async function writeExchange(
  input: ExchangeCreateInput
): Promise<string> {
  const created = await insertRecord<{ id: string }>(EXCHANGE_TABLE, {
    ...input,
    status: input.status ?? 'pending',
  });
  return created.id;
}

/**
 * Update the status and/or result of an existing exchange record.
 * Used by agents/workflows to report progress or completion.
 */
export async function updateExchange(
  id: string,
  updates: Partial<Pick<ExchangeRecord, 'status' | 'result' | 'error' | 'progress' | 'stepName' | 'agentId' | 'workflowId'>>
): Promise<void> {
  await updateRecord(EXCHANGE_TABLE, id, { ...updates });
}

// ─── Admin Signal (Admin UI → Workflow/Agent) ─────────────────────────────────

/**
 * Admin triggers a workflow or agent task from the Admin Hub.
 */
export async function sendAdminSignal(
  signal: {
    action: string;
    targetAgentId?: string;
    targetWorkflowId?: string;
    payload?: Record<string, unknown>;
  }
): Promise<string> {
  return writeExchange({
    type: 'admin_signal',
    source: 'admin',
    status: 'pending',
    payload: {
      action: signal.action,
      ...signal.payload,
    },
    agentId: signal.targetAgentId,
    workflowId: signal.targetWorkflowId,
  });
}

// ─── Real-Time Subscriptions (Admin UI reads) ─────────────────────────────────

/**
 * Subscribe to live Exchange Sheet updates.
 * Returns unsubscribe function — call it on component unmount.
 */
export function subscribeExchange(
  options: {
    type?: ExchangeType;
    status?: ExchangeStatus;
    limitTo?: number;
    onData: (records: ExchangeRecord[]) => void;
    onError?: (error: Error) => void;
    /** Poll interval in ms. Default 5s. */
    intervalMs?: number;
  }
): Unsubscribe {
  const where: Array<{ column: string; value: unknown }> = [];
  if (options.type) where.push({ column: 'type', value: options.type });
  if (options.status) where.push({ column: 'status', value: options.status });

  let cancelled = false;

  const poll = async () => {
    try {
      const records = await listRecords<ExchangeRecord>(EXCHANGE_TABLE, {
        where,
        orderBy: { column: 'createdAt', ascending: false },
        limit: options.limitTo ?? 100,
      });
      // A response that lands after unsubscribe must not reach the caller,
      // whose component may already be unmounted.
      if (!cancelled) options.onData(records);
    } catch (err) {
      if (cancelled) return;
      console.error('[ExchangeSheet] Poll error:', err);
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  void poll();
  const timer = setInterval(poll, options.intervalMs ?? 5000);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}

/**
 * Subscribe to ALL exchange records (used by the Exchange Sheet tab in Admin Hub).
 */
export function subscribeAllExchange(
  onData: (records: ExchangeRecord[]) => void
): Unsubscribe {
  return subscribeExchange({ limitTo: 200, onData });
}

/**
 * Subscribe to active agent tasks only.
 */
export function subscribeAgentTasks(
  onData: (records: ExchangeRecord[]) => void
): Unsubscribe {
  return subscribeExchange({ type: 'agent_task', limitTo: 50, onData });
}

/**
 * Subscribe to active workflow runs only.
 */
export function subscribeWorkflowRuns(
  onData: (records: ExchangeRecord[]) => void
): Unsubscribe {
  return subscribeExchange({ type: 'workflow_run', limitTo: 50, onData });
}
