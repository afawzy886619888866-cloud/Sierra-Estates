import { obsidian } from '@sierra-estates/obsidian';
import pino from 'pino';

const logger = pino({ name: 'ai-sdk-memory-client' });

export interface MemoryRecord {
  id: string;
  value: any;
  tags: string[];
  importance?: number;
  timestamp: string;
}

export class MemoryClient {
  /**
   * Query unified agent memory
   */
  public async query(queryText: string, tags: string[] = []): Promise<MemoryRecord[]> {
    try {
      const results = await obsidian.search(queryText, tags);
      return (results || []).map((m: any) => ({
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
  public async save(id: string, value: any, tags: string[] = []): Promise<boolean> {
    try {
      await obsidian.set(id, value, tags);
      return true;
    } catch (err) {
      logger.error({ err, msg: `Failed to save memory entry: ${id}` });
      return false;
    }
  }
}
