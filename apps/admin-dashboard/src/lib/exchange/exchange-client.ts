import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';

export interface ExchangeRecord {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'cancelled';
  createdAt: Timestamp | any;
  progress?: number;
  stepName?: string;
  payload?: any;
  result?: any;
  error?: string;
}

const EXCHANGE_COLLECTION = 'exchange';

/**
 * Subscribe to all exchange records
 */
export function subscribeAllExchange(callback: (records: ExchangeRecord[]) => void) {
  const q = query(
    collection(db, EXCHANGE_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExchangeRecord[];
    callback(records);
  }, (error) => {
    console.error('[Exchange] Error subscribing to all records:', error);
  });
}

/**
 * Subscribe to agent tasks only
 */
export function subscribeAgentTasks(callback: (records: ExchangeRecord[]) => void) {
  const q = query(
    collection(db, EXCHANGE_COLLECTION),
    where('type', '==', 'agent_task'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExchangeRecord[];
    callback(records);
  }, (error) => {
    console.error('[Exchange] Error subscribing to agent tasks:', error);
  });
}

/**
 * Subscribe to workflow runs only
 */
export function subscribeWorkflowRuns(callback: (records: ExchangeRecord[]) => void) {
  const q = query(
    collection(db, EXCHANGE_COLLECTION),
    where('type', '==', 'workflow_run'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExchangeRecord[];
    callback(records);
  }, (error) => {
    console.error('[Exchange] Error subscribing to workflow runs:', error);
  });
}

/**
 * Send an admin signal to the exchange
 */
export async function sendAdminSignal(data: { action: string; targetAgentId?: string }) {
  try {
    const docRef = await addDoc(collection(db, EXCHANGE_COLLECTION), {
      type: 'admin_signal',
      status: 'pending',
      createdAt: serverTimestamp(),
      payload: data,
    });
    return docRef.id;
  } catch (error) {
    console.error('[Exchange] Error sending admin signal:', error);
    throw error;
  }
}
