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
import { sharedMemory, openMemoryClient } from '@sierra-estates/memory-engine';

/**
 * SIERRA ESTATES NEURAL MEMORY HUB
 * Purpose: Global learning across all deals and lead rejections.
 * Wired with Firebase Firestore, SharedMemoryBus, and OpenMemory HSG.
 */
export class MemoryService {
  
  /**
   * Records a "Negative Signal" (Objection) and updates global intelligence.
   */
  static async recordRejection(leadId: string, unitId: string, reason: string) {
    const category = this.categorizeReason(reason);

    // 1. Update Lead's private memory in Firestore
    try {
      const leadRef = doc(db, COLLECTIONS.stakeholders, leadId);
      await updateDoc(leadRef, {
        'intelligence.objections': arrayUnion({
          unitId,
          reason,
          timestamp: new Date()
        }),
        'intelligence.memory.negativeSignals': arrayUnion({
          category,
          description: reason,
          importance: 0.8
        })
      });

      // 2. Update Global Intelligence Patterns in Firestore
      const globalRef = doc(db, COLLECTIONS.intelligence, 'global_patterns');
      await setDoc(globalRef, {
        [`rejectionStats.${category}`]: increment(1),
        lastTrendUpdate: serverTimestamp()
      }, { merge: true });
    } catch (fsErr) {
      console.warn('[MemoryService] Firestore update warning:', fsErr);
    }

    // 3. Wire into SharedMemoryBus
    try {
      await sharedMemory.write(
        `objection:${leadId}:${unitId}`,
        { leadId, unitId, reason, category, timestamp: new Date().toISOString() },
        { author: 'closer', tags: ['objection', category], ttlSeconds: 86400 * 30 }
      );
    } catch (smErr) {
      console.warn('[MemoryService] SharedMemoryBus write warning:', smErr);
    }

    // 4. Wire semantic indexing into OpenMemory
    try {
      await openMemoryClient.add(
        `Lead ${leadId} rejected unit ${unitId} due to ${category}: "${reason}"`,
        {
          userId: leadId,
          projectId: 'sierra-estates',
          tags: ['objection', category, unitId],
          metadata: { leadId, unitId, category, reason }
        }
      );
    } catch (omErr) {
      console.warn('[MemoryService] OpenMemory add warning:', omErr);
    }
  }

  /**
   * Fetches global trends to inform AI prompts.
   */
  static async getGlobalTrends() {
    try {
      // Check shared memory bus cache first
      const cachedTrends = await sharedMemory.read('global:patterns');
      if (cachedTrends) return cachedTrends;
    } catch {}

    try {
      const globalRef = doc(db, COLLECTIONS.intelligence, 'global_patterns');
      const snap = await getDoc(globalRef);
      const data = snap.exists() ? snap.data() : null;
      if (data) {
        await sharedMemory.write('global:patterns', data, { author: 'admin', ttlSeconds: 300 }).catch(() => {});
      }
      return data;
    } catch {
      return null;
    }
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

