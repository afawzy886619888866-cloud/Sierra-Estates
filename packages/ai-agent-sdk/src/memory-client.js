import { obsidian } from '@sierra-estates/obsidian';
import pino from 'pino';

const logger = pino({ name: 'ai-sdk-memory-client' });









export class MemoryClient {
  /**
   * Query unified agent memory
   */
   async query(queryText, tags = []) {
    try {
      const results = await obsidian.search(queryText, tags);
      return (results || []).map((m) => ({
        id: m.id,
        value: m.value,
        tags: m.tags || [],
        timestamp: m.timestamp || new Date().toISOString(),
      }));
    } catch (err) {
      logger.error({ err, msg: 'Failed to query agent memory' });
      return [];
    }
  }

  /**
   * Save entry to unified agent memory
   */
   async save(id, value, tags = []) {
    try {
      await obsidian.set(id, value, tags);
      return true;
    } catch (err) {
      logger.error({ err, msg: `Failed to save memory entry: ${id}` });
      return false;
    }
  }
}
