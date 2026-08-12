import { adminDb } from '../server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * MaintenanceMonitor: Intelligence module to handle data freshness and hygiene.
 * Mandate: Flag units not updated in >30 days to ensure "Portfolio Integrity".
 */
export class MaintenanceMonitor {
  /**
   * Scans 'listings' and 'broker_listings' for stagnant data.
   * Stagnant units are flagged for manual review or auto-archived.
   */
  static async flagStaleListings() {
    console.log('--- 🛠️ Starting Maintenance Hygiene Audit ---');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const threshold = Timestamp.fromDate(thirtyDaysAgo);

    const targetCollections = ['listings', 'broker_listings'];
    let totalFlagged = 0;

    for (const colName of targetCollections) {
      try {
        const snapshot = await adminDb.collection(colName)
          .where('updatedAt', '<', threshold)
          .where('status', 'not-in', ['archived', 'sold'])
          .get();

        console.log(`Checking ${colName}: Found ${snapshot.size} potentially stale documents.`);

        for (const docSnap of snapshot.docs) {
          const docData = docSnap.data();
          await docSnap.ref.update({
            isStale: true,
            maintenanceNotes: `Automated hygiene flag: Updated more than 30 days ago (last update: ${docData.updatedAt?.toDate()?.toISOString() || 'unknown'}).`,
            // For broker listings, we auto-archive to keep the feed clean.
            // For company listings, we just flag for the Portfolio Manager.
            status: colName === 'broker_listings' ? 'archived' : (docData.status || 'active'),
            updatedAt: Timestamp.now() // Record the audit timestamp
          });
          totalFlagged++;
        }
      } catch (error) {
        console.error(`❌ Error auditing ${colName}:`, error);
      }
    }

    console.log(`✅ Audit Complete. Flagged ${totalFlagged} assets.`);
    return totalFlagged;
  }

  /**
   * Clears the stale flag for a listing that has been re-detected in the market.
   * Part of the Stage 9 -> Stage 2 feedback loop.
   */
  static async reviveListing(listingId: string) {
    console.log(`♻️ [MaintenanceMonitor] Reviving listing ${listingId} due to re-detection.`);
    
    try {
      await adminDb.collection('broker_listings').doc(listingId).update({
        isStale: false,
        revivedAt: Timestamp.now(),
        status: 'parsed', // Move back to active status
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error(`❌ [MaintenanceMonitor] Failed to revive ${listingId}:`, error);
      return false;
    }
  }
}
