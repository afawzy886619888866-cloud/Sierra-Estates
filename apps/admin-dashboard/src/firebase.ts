import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore — uses the (default) database or explicitly set firestoreDatabaseId.
// Shared with the Sierra-Estates-Final backend (apps/sierra-estates-realty),
// so admin writes (notifications, etc.) land in the same Firestore the backend reads from.
const _dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = (_dbId && _dbId !== '(default)')
  ? getFirestore(app, _dbId)
  : getFirestore(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Operation types for error reporting
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Global Firestore error handler wrapping raw errors with diagnostic metadata context.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Object: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Triggers a real-time notification in Firestore to alert admins
 */
export async function createSierraNotification(
  type: "lead" | "listing" | "error" | "system",
  title: string,
  message: string,
  titleAr?: string,
  messageAr?: string
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      type,
      title,
      message,
      titleAr: titleAr || null,
      messageAr: messageAr || null,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to create notification inside Firestore: ", err);
  }
}
