 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — EXCHANGE SHEET CLIENT
 * Central data contract between Admin UI, Agents, and Workflows
 * Uses Firestore /exchange collection as the shared message bus
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  Timestamp,



} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Initialize a default instance if not provided by the consumer
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ─── Types ────────────────────────────────────────────────────────────────────

 




































// ─── Collection Reference ─────────────────────────────────────────────────────

const EXCHANGE_COLLECTION = 'exchange';

function exchangeCol() {
  return collection(db, EXCHANGE_COLLECTION);
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Write a new record to the Exchange Sheet.
 * Used by: Admin UI, Agents, Workflows, Webhooks
 */
export async function writeExchange(
  input
) {
  const now = Timestamp.now();
  const docRef = await addDoc(exchangeCol(), {
    ...input,
    status: _nullishCoalesce(input.status, () => ( 'pending')),
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

/**
 * Update the status and/or result of an existing exchange record.
 * Used by agents/workflows to report progress or completion.
 */
export async function updateExchange(
  id,
  updates
) {
  const ref = doc(db, EXCHANGE_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
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
  let q = query(
    exchangeCol(),
    orderBy('createdAt', 'desc'),
    limit(_nullishCoalesce(options.limitTo, () => ( 100)))
  );

  if (options.type) {
    q = query(q, where('type', '==', options.type));
  }
  if (options.status) {
    q = query(q, where('status', '==', options.status));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() ),
      }));
      options.onData(records);
    },
    (err) => {
      console.error('[ExchangeSheet] Subscription error:', err);
      _optionalChain([options, 'access', _ => _.onError, 'optionalCall', _2 => _2(err)]);
    }
  );
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
