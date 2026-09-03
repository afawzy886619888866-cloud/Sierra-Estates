 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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
import { insertRecord, listRecords, updateRecord } from '../db/lib/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

 





































// ─── Table ────────────────────────────────────────────────────────────────────

const EXCHANGE_TABLE = 'exchange';

/** Cancels a subscription started by subscribeExchange. */
 

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Write a new record to the Exchange Sheet.
 * Used by: Admin UI, Agents, Workflows, Webhooks
 */
export async function writeExchange(
  input
) {
  const created = await insertRecord(EXCHANGE_TABLE, {
    ...input,
    status: _nullishCoalesce(input.status, () => ( 'pending')),
  });
  return created.id;
}

/**
 * Update the status and/or result of an existing exchange record.
 * Used by agents/workflows to report progress or completion.
 */
export async function updateExchange(
  id,
  updates
) {
  await updateRecord(EXCHANGE_TABLE, id, { ...updates });
}

// ─── Admin Signal (Admin UI → Workflow/Agent) ─────────────────────────────────

/**
 * Admin triggers a workflow or agent task from the Admin Hub.
 */
export async function sendAdminSignal(
  signal





) {
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
  options








) {
  const where = [];
  if (options.type) where.push({ column: 'type', value: options.type });
  if (options.status) where.push({ column: 'status', value: options.status });

  let cancelled = false;

  const poll = async () => {
    try {
      const records = await listRecords(EXCHANGE_TABLE, {
        where,
        orderBy: { column: 'createdAt', ascending: false },
        limit: _nullishCoalesce(options.limitTo, () => ( 100)),
      });
      // A response that lands after unsubscribe must not reach the caller,
      // whose component may already be unmounted.
      if (!cancelled) options.onData(records);
    } catch (err) {
      if (cancelled) return;
      console.error('[ExchangeSheet] Poll error:', err);
      _optionalChain([options, 'access', _ => _.onError, 'optionalCall', _2 => _2(err instanceof Error ? err : new Error(String(err)))]);
    }
  };

  void poll();
  const timer = setInterval(poll, _nullishCoalesce(options.intervalMs, () => ( 5000)));

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}

/**
 * Subscribe to ALL exchange records (used by the Exchange Sheet tab in Admin Hub).
 */
export function subscribeAllExchange(
  onData
) {
  return subscribeExchange({ limitTo: 200, onData });
}

/**
 * Subscribe to active agent tasks only.
 */
export function subscribeAgentTasks(
  onData
) {
  return subscribeExchange({ type: 'agent_task', limitTo: 50, onData });
}

/**
 * Subscribe to active workflow runs only.
 */
export function subscribeWorkflowRuns(
  onData
) {
  return subscribeExchange({ type: 'workflow_run', limitTo: 50, onData });
}
