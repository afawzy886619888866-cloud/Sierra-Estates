import { getRecord, getSupabaseAdmin, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '../models/schema';
import { sharedMemory, openMemoryClient } from '@sierra-estates/memory-engine';

/**
 * SIERRA ESTATES NEURAL MEMORY HUB
 * Purpose: Global learning across all deals and lead rejections.
 * Wired with Supabase, SharedMemoryBus, and OpenMemory HSG.
 */
export class MemoryService {
  
  /**
   * Records a "Negative Signal" (Objection) and updates global intelligence.
   */
  static async recordRejection(leadId: string, unitId: string, reason: string) {
    const category = this.categorizeReason(reason);

    // 1. Update the lead's private memory.
    // `intelligence` is one JSONB column, so both dotted paths address the same
    // object and arrayUnion becomes an explicit append. These entries each
    // carry their own context, so they are not deduped — arrayUnion on object
    // values never collapsed them either.
    try {
      const lead = await getRecord<{ intelligence?: Record<string, any> }>(
        COLLECTIONS.stakeholders,
        leadId
      );
      const intelligence: Record<string, any> = { ...(lead?.intelligence ?? {}) };
      intelligence.objections = [
        ...(intelligence.objections ?? []),
        { unitId, reason, timestamp: new Date().toISOString() },
      ];
      intelligence.memory = {
        ...(intelligence.memory ?? {}),
        negativeSignals: [
          ...(intelligence.memory?.negativeSignals ?? []),
          { category, description: reason, importance: 0.8 },
        ],
      };
      await updateRecord(COLLECTIONS.stakeholders, leadId, { intelligence });

      // 2. Update global intelligence patterns. increment() was atomic, so the
      // counter is bumped inside a single statement rather than read-modify-write.
      const { error } = await getSupabaseAdmin().rpc('bump_rejection_stat', {
        p_id: 'global_patterns',
        p_category: category,
      });
      if (error) throw new Error(error.message);
    } catch (dbErr) {
      console.warn('[MemoryService] Database update warning:', dbErr);
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
    } catch (cacheErr) {
      console.warn('[MemoryService] Cache read failed:', cacheErr);
    }

    try {
      const data = await getRecord(COLLECTIONS.intelligence, 'global_patterns');
      if (data) {
        await sharedMemory.write('global:patterns', data, { author: 'admin', ttlSeconds: 300 })
          .catch((writeErr) => console.warn('[MemoryService] Cache write failed:', writeErr));
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

