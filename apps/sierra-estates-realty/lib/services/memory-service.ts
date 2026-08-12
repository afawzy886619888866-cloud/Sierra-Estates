import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { COLLECTIONS } from '../models/schema';

/**
 * SIERRA ESTATES NEURAL MEMORY HUB
 * Purpose: Global learning across all deals and lead rejections.
 */
export class MemoryService {
  
  /**
   * Records a "Negative Signal" (Objection) and updates global intelligence.
   */
  static async recordRejection(leadId: string, unitId: string, reason: string) {
    // 1. Update Lead's private memory
    const leadRef = doc(db, COLLECTIONS.stakeholders, leadId);
    await updateDoc(leadRef, {
      'intelligence.objections': arrayUnion({
        unitId,
        reason,
        timestamp: new Date()
      }),
      'intelligence.memory.negativeSignals': arrayUnion({
        category: this.categorizeReason(reason),
        description: reason,
        importance: 0.8
      })
    });

    // 2. Update Global Intelligence Patterns
    const globalRef = doc(db, COLLECTIONS.intelligence, 'global_patterns');
    const category = this.categorizeReason(reason);
    
    await setDoc(globalRef, {
      [`rejectionStats.${category}`]: increment(1),
      lastTrendUpdate: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Fetches global trends to inform AI prompts.
   */
  static async getGlobalTrends() {
    const globalRef = doc(db, COLLECTIONS.intelligence, 'global_patterns');
    const snap = await getDoc(globalRef);
    return snap.exists() ? snap.data() : null;
  }

  private static categorizeReason(reason: string): string {
    const r = reason.toLowerCase();
    if (r.includes('price') || r.includes('expensive')) return 'price';
    if (r.includes('location') || r.includes('community')) return 'location';
    if (r.includes('finish') || r.includes('quality')) return 'finishing';
    if (r.includes('small') || r.includes('space') || r.includes('layout')) return 'layout';
    return 'other';
  }
}
