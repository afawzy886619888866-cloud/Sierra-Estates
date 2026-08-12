import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export class WhatsAppStatusService {
  private static STATUS_DOC = 'system_status/whatsapp_node';

  /**
   * Logs a pulse from the scraper node to indicate it is alive and syncing.
   */
  static async recordHeartbeat(status: 'active' | 'syncing' | 'error' = 'active') {
    try {
      const statusRef = doc(db, this.STATUS_DOC);
      await setDoc(statusRef, {
        status,
        lastPulse: serverTimestamp(),
        nodeId: 'OPENCLAW_NODE_01',
        heartbeatInterval: 60000 // Expected pulse every 60s
      }, { merge: true });
    } catch (error) {
      console.error("❌ Failed to record WhatsApp pulse:", error);
    }
  }

  /**
   * Records specific errors from the scraper node.
   */
  static async recordError(errorMessage: string) {
    try {
      const statusRef = doc(db, this.STATUS_DOC);
      await updateDoc(statusRef, {
        status: 'error',
        lastError: errorMessage,
        errorTimestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("❌ Failed to record node error:", error);
    }
  }
}
