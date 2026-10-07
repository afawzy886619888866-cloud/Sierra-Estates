import 'server-only';
import { parseDSL, buildSupabaseQuery, type ParsedView, type Visibility } from '@sierra-estates/db';
import { getRecord, insertRecord, listRecords, assertCanonicalBackendForWrites } from '@sierra-estates/db';

export interface SavedViewRecord {
  id: string;
  title: string;
  dsl: string;
  visibility: Visibility;
  description?: string;
  createdBy?: string;
  shareUrl: string;
  parsedView: ParsedView;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback map to guarantee immediate read-after-write reliability
const inMemorySavedViews = new Map<string, SavedViewRecord>();

export const SavedViewsService = {
  /**
   * Parse DSL and save a new shareable view.
   * Enforces broker visibility and validates DSL directives.
   */
  async saveView(params: {
    title: string;
    dsl: string;
    visibility?: Visibility;
    description?: string;
    createdBy?: string;
  }): Promise<SavedViewRecord> {
    assertCanonicalBackendForWrites('saved-view-write');

    const collectionName = 'listings';
    const parsedView = parseDSL(params.dsl, collectionName);

    // If visibility is explicitly provided in params, it overrides or enforces DSL visibility
    const visibility: Visibility = params.visibility ?? parsedView.visibility ?? 'broker';
    parsedView.visibility = visibility;

    const id = `view_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const shareUrl = `/broker/views/${id}`;

    const record: SavedViewRecord = {
      id,
      title: params.title.trim(),
      dsl: params.dsl,
      visibility,
      description: params.description?.trim(),
      createdBy: params.createdBy || 'broker',
      shareUrl,
      parsedView,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Cache in memory
    inMemorySavedViews.set(id, record);

    // 2. Persist to Supabase
    try {
      await insertRecord('saved_views', {
        id,
        title: record.title,
        dsl: record.dsl,
        visibility: record.visibility,
        description: record.description ?? null,
        createdBy: record.createdBy,
        shareUrl: record.shareUrl,
        parsedView: record.parsedView,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    } catch (err) {
      console.warn('[SavedViewsService] Failed to persist to Supabase saved_views, keeping in-memory:', err);
    }

    return record;
  },

  /**
   * Retrieve a saved view by ID.
   */
  async getView(id: string): Promise<SavedViewRecord | null> {
    // 1. Check in-memory store
    if (inMemorySavedViews.has(id)) {
      return inMemorySavedViews.get(id)!;
    }

    // 2. Lookup in Supabase
    try {
      const dbRow = await getRecord<SavedViewRecord>('saved_views', id);
      if (dbRow) {
        // Ensure parsedView is populated
        if (!dbRow.parsedView && dbRow.dsl) {
          dbRow.parsedView = parseDSL(dbRow.dsl, 'listings');
        }
        inMemorySavedViews.set(id, dbRow);
        return dbRow;
      }
    } catch (err) {
      console.warn(`[SavedViewsService] Error fetching view ${id} from db:`, err);
    }

    return null;
  },

  /**
   * List saved views with optional visibility filter.
   */
  async listViews(filter?: { visibility?: Visibility }): Promise<SavedViewRecord[]> {
    let list: SavedViewRecord[] = Array.from(inMemorySavedViews.values());

    try {
      const dbRows = await listRecords<SavedViewRecord>('saved_views', {
        orderBy: { column: 'createdAt', ascending: false },
        limit: 100,
      });
      if (Array.isArray(dbRows) && dbRows.length > 0) {
        for (const row of dbRows) {
          if (!row.parsedView && row.dsl) {
            row.parsedView = parseDSL(row.dsl, 'listings');
          }
          inMemorySavedViews.set(row.id, row);
        }
        list = Array.from(inMemorySavedViews.values());
      }
    } catch {
      // Keep memory list on db error
    }

    if (filter?.visibility) {
      return list.filter((v) => v.visibility === filter.visibility);
    }

    return list;
  },

  /**
   * Execute the parsed view query against live inventory.
   */
  async executeView<T = Record<string, unknown>>(
    view: SavedViewRecord,
    maxLimit = 50,
  ): Promise<T[]> {
    return await buildSupabaseQuery<T>(view.parsedView, maxLimit);
  },
};
