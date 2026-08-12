/**
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
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  input: ExchangeCreateInput
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(exchangeCol(), {
    ...input,
    status: input.status ?? 'pending',
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
  id: string,
  updates: Partial<Pick<ExchangeRecord, 'status' | 'result' | 'error' | 'progress' | 'stepName' | 'agentId' | 'workflowId'>>
): Promise<void> {
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
  }
): Unsubscribe {
  let q = query(
    exchangeCol(),
    orderBy('createdAt', 'desc'),
    limit(options.limitTo ?? 100)
  );

  if (options.type) {
    q = query(q, where('type', '==', options.type));
  }
  if (options.status) {
    q = query(q, where('status', '==', options.status));
  }

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const records: ExchangeRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ExchangeRecord, 'id'>),
      }));
      options.onData(records);
    },
    (err) => {
      console.error('[ExchangeSheet] Subscription error:', err);
      options.onError?.(err);
    }
  );
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
