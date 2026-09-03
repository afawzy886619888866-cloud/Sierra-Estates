 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { listRecords, updateRecord } from '@sierra-estates/db';

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
    const threshold = thirtyDaysAgo.toISOString();

    const targetCollections = ['listings', 'broker_listings'];
    let totalFlagged = 0;

    for (const colName of targetCollections) {
      try {
        // Firestore's 'not-in' has no direct record-layer equivalent, so the
        // archived/sold exclusion is applied in code after the date filter.
        const rows = await listRecords(colName, {
          where: [{ column: 'updatedAt', op: 'lt', value: threshold }],
        });
        const stale = rows.filter((r) => !['archived', 'sold'].includes(_nullishCoalesce(r.status, () => ( ''))));

        console.log(`Checking ${colName}: Found ${stale.length} potentially stale documents.`);

        for (const row of stale) {
          await updateRecord(colName, row.id, {
            isStale: true,
            // updatedAt is already an ISO string — no Timestamp .toDate() hop.
            maintenanceNotes: `Automated hygiene flag: Updated more than 30 days ago (last update: ${row.updatedAt || 'unknown'}).`,
            // For broker listings, we auto-archive to keep the feed clean.
            // For company listings, we just flag for the Portfolio Manager.
            status: colName === 'broker_listings' ? 'archived' : (row.status || 'active'),
            updatedAt: new Date().toISOString() // Record the audit timestamp
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
  static async reviveListing(listingId) {
    console.log(`♻️ [MaintenanceMonitor] Reviving listing ${listingId} due to re-detection.`);
    
    try {
      const now = new Date().toISOString();
      await updateRecord('broker_listings', listingId, {
        isStale: false,
        revivedAt: now,
        status: 'parsed', // Move back to active status
        updatedAt: now
      });
      return true;
    } catch (error) {
      console.error(`❌ [MaintenanceMonitor] Failed to revive ${listingId}:`, error);
      return false;
    }
  }
}
