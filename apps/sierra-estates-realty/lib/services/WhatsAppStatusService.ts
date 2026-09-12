import { getRecord, upsertRecord } from '@sierra-estates/db';

/**
 * The scraper node's heartbeat row in `system_status`, which /api/admin/bots
 * and /api/admin/agents read. Firestore addressed it as the document path
 * 'system_status/whatsapp_node'; here the collection is the table and the
 * document id is the primary key.
 */
const STATUS_ROW_ID = 'whatsapp_node';

export class WhatsAppStatusService {
  /**
   * Logs a pulse from the scraper node to indicate it is alive and syncing.
   */
  static async recordHeartbeat(status: 'active' | 'syncing' | 'error' = 'active') {
    try {
      // `nodeId` and `heartbeatInterval` are not columns — they are operator
      // metadata, so they go in the `config` JSONB the admin bots page reads.
      const existing = await getRecord<{ config?: Record<string, unknown> }>(
        'system_status',
        STATUS_ROW_ID
      );
      await upsertRecord('system_status', {
        id: STATUS_ROW_ID,
        status,
        lastPulse: new Date().toISOString(),
        config: {
          ...(existing?.config ?? {}),
          nodeId: 'OPENCLAW_NODE_01',
          heartbeatInterval: 60000, // Expected pulse every 60s
        },
      });
    } catch (error) {
      console.error("❌ Failed to record WhatsApp pulse:", error);
    }
  }

  /**
   * Records specific errors from the scraper node.
   */
  static async recordError(errorMessage: string) {
    try {
      // Upsert, not update: a node that errors before its first heartbeat had
      // no row to update, and Firestore's updateDoc failed silently there.
      await upsertRecord('system_status', {
        id: STATUS_ROW_ID,
        status: 'error',
        lastError: errorMessage,
      });
    } catch (error) {
      console.error("❌ Failed to record node error:", error);
    }
  }

  /**
   * Retrieves the current node status from system_status.
   */
  static async getStatus(): Promise<{ status: string; lastPulse?: string }> {
    try {
      const record = await getRecord<{ status?: string; lastPulse?: string }>(
        'system_status',
        STATUS_ROW_ID
      );
      return {
        status: record?.status || 'active',
        lastPulse: record?.lastPulse,
      };
    } catch {
      return { status: 'active' };
    }
  }
}
