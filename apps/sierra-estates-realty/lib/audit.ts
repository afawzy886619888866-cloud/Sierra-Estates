import { collection, addDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';
import { db } from './firebase';

export type AuditAction = 
  | 'STAKEHOLDER_ONBOARD' 
  | 'STAKEHOLDER_SYNC' 
  | 'PHASE_TRANSITION' 
  | 'LISTING_CREATE' 
  | 'LISTING_SYNC' 
  | 'ASSET_REMOVAL' 
  | 'SETTLEMENT_FINALIZED'
  | 'INTELLIGENCE_UPDATE';


export interface AuditLog {
  action: AuditAction;
  performer: string;
  performerId: string;
  targetId: string;
  targetType: 'listing' | 'partner' | 'sale' | 'stakeholder' | 'system';
  details: string;
  createdAt?: Timestamp | FieldValue;
}

export const logAuditAction = async (log: Omit<AuditLog, 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...log,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Critical: Audit logging failed:", err);
  }
};
