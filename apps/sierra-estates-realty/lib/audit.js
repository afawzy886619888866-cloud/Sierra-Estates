import { collection, addDoc, serverTimestamp, } from 'firebase/firestore';
import { db } from './firebase';

 




















export const logAuditAction = async (log) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...log,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Critical: Audit logging failed:", err);
  }
};
