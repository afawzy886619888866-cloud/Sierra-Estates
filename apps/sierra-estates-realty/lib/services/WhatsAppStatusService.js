 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { getRecord, upsertRecord } from '@sierra-estates/db';

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
  static async recordHeartbeat(status = 'active') {
    try {
      // `nodeId` and `heartbeatInterval` are not columns — they are operator
      // metadata, so they go in the `config` JSONB the admin bots page reads.
      const existing = await getRecord(
        'system_status',
        STATUS_ROW_ID
      );
      await upsertRecord('system_status', {
        id: STATUS_ROW_ID,
        status,
        lastPulse: new Date().toISOString(),
        config: {
          ...(_nullishCoalesce(_optionalChain([existing, 'optionalAccess', _ => _.config]), () => ( {}))),
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
  static async recordError(errorMessage) {
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
}
