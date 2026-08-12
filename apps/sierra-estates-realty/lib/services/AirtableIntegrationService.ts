import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS, Unit } from '../models/schema';
import { mapRowToUnit } from './listing-normalize';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

/**
 * AIRTABLE INTEGRATION
 *
 * Pulls property listings from one or more Airtable tables into the Firestore
 * inventory, mirroring the Google Sheets ingestion path. Records are upserted
 * by their reference code so re-syncing is idempotent.
 *
 * Configuration (env):
 *   AIRTABLE_API_KEY    — personal access token (Bearer)
 *   AIRTABLE_BASE_ID    — base id, e.g. "appXXXXXXXXXXXXXX"
 *   AIRTABLE_TABLE_NAME — table name, or a comma-separated list of tables
 *                         (e.g. "Owners-Rent,Owners-Resale,Brokers,Team Units")
 */

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export interface AirtableSyncResult {
  success: boolean;
  table?: string;
  syncedCount?: number;
  errorCount?: number;
  fetched?: number;
  timestamp?: string;
  error?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tables: string[];
}

export class AirtableIntegrationService {
  /** Reads + validates Airtable config from the environment. */
  static getConfig(): AirtableConfig | null {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableEnv = process.env.AIRTABLE_TABLE_NAME;
    if (!apiKey || !baseId || !tableEnv) return null;
    const tables = tableEnv.split(',').map((t) => t.trim()).filter(Boolean);
    if (tables.length === 0) return null;
    return { apiKey, baseId, tables };
  }

  /** Infers the listing owner type from the Airtable table name. */
  static ownerTypeForTable(table: string): Unit['ownerType'] {
    const t = table.toLowerCase();
    if (t.includes('broker')) return 'broker';
    if (t.includes('team') || t.includes('internal')) return 'internal';
    return 'owner';
  }

  /**
   * Fetches every record from a single Airtable table, following Airtable's
   * cursor pagination (`offset`) until exhausted.
   */
  static async fetchTableRecords(
    cfg: Pick<AirtableConfig, 'apiKey' | 'baseId'>,
    table: string,
  ): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(`${AIRTABLE_API_BASE}/${cfg.baseId}/${encodeURIComponent(table)}`);
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Airtable API ${res.status} for table "${table}": ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as { records?: AirtableRecord[]; offset?: string };
      if (Array.isArray(json.records)) records.push(...json.records);
      offset = json.offset;
    } while (offset);

    return records;
  }

  /** Syncs a single Airtable table into Firestore. */
  static async syncTable(
    cfg: Pick<AirtableConfig, 'apiKey' | 'baseId'>,
    table: string,
  ): Promise<AirtableSyncResult> {
    try {
      console.log(`[AirtableIntegrationService] Syncing table "${table}"...`);
      const records = await this.fetchTableRecords(cfg, table);
      const ownerType = this.ownerTypeForTable(table);

      const unitsCollection = adminDb.collection(COLLECTIONS.units);
      const batch = adminDb.batch();
      let syncedCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          const unit = mapRowToUnit(record.fields, { ownerType, syncSource: 'airtable' });
          if (!unit) continue;

          let docRef;
          if (unit.referenceNumber) {
            const existing = await unitsCollection
              .where('referenceNumber', '==', unit.referenceNumber)
              .limit(1)
              .get();
            docRef = existing.empty ? unitsCollection.doc() : existing.docs[0].ref;
          } else {
            docRef = unitsCollection.doc();
          }

          batch.set(docRef, unit, { merge: true });
          syncedCount++;
        } catch (_err) {
          errorCount++;
        }
      }

      await batch.commit();
      console.log(`[AirtableIntegrationService] "${table}": synced ${syncedCount}, errors ${errorCount}.`);

      return {
        success: true,
        table,
        fetched: records.length,
        syncedCount,
        errorCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[AirtableIntegrationService] Sync failed for "${table}":`, message);
      return { success: false, table, error: message };
    }
  }

  /**
   * Syncs every configured table. Returns a per-table breakdown plus rolled-up
   * totals. Throws a descriptive error if Airtable is not configured.
   */
  static async syncFromEnv(): Promise<{
    success: boolean;
    totalSynced: number;
    totalErrors: number;
    tables: AirtableSyncResult[];
    timestamp: string;
  }> {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error(
        'Airtable is not configured. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.',
      );
    }

    const results: AirtableSyncResult[] = [];
    for (const table of cfg.tables) {
      results.push(await this.syncTable(cfg, table));
    }

    return {
      success: results.every((r) => r.success),
      totalSynced: results.reduce((sum, r) => sum + (r.syncedCount ?? 0), 0),
      totalErrors: results.reduce((sum, r) => sum + (r.errorCount ?? 0), 0),
      tables: results,
      timestamp: new Date().toISOString(),
    };
  }

  /* ────────────────────────────────────────────────────────────────
   * EXPORT (Firestore → Airtable)
   *
   * Mirrors Firestore inventory/leads INTO Airtable so the base stays a
   * live copy of the app data. Upserts via Airtable's performUpsert API:
   * listings merge on "Code", leads merge on "Firestore ID", so repeated
   * exports are idempotent. Airtable caps writes at 10 records/request.
   * ──────────────────────────────────────────────────────────────── */

  static readonly EXPORT_BATCH_SIZE = 10;

  /** Upserts a chunk of records into an Airtable table. */
  static async upsertRecords(
    cfg: Pick<AirtableConfig, 'apiKey' | 'baseId'>,
    table: string,
    records: Array<{ fields: Record<string, unknown> }>,
    mergeOn: string[],
  ): Promise<{ written: number; errors: string[] }> {
    let written = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += this.EXPORT_BATCH_SIZE) {
      const chunk = records.slice(i, i + this.EXPORT_BATCH_SIZE);
      const res = await fetch(`${AIRTABLE_API_BASE}/${cfg.baseId}/${encodeURIComponent(table)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          performUpsert: { fieldsToMergeOn: mergeOn },
          typecast: true,
          records: chunk,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        errors.push(`Airtable API ${res.status} for table "${table}": ${body.slice(0, 200)}`);
        continue;
      }
      const json = (await res.json()) as { records?: unknown[] };
      written += json.records?.length ?? chunk.length;
    }

    return { written, errors };
  }

  /** Maps a Firestore Unit document to the Airtable listing columns. */
  static unitToAirtableFields(id: string, unit: Partial<Unit>): Record<string, unknown> | null {
    const code = unit.referenceNumber || unit.code || `FS-${id}`;
    const fields: Record<string, unknown> = {
      Code: code,
      Name: unit.title ?? '',
      Compound: unit.compound || unit.location || '',
      'Synced From': 'Firebase sierra-blu · listings',
    };
    if (unit.propertyType) {
      // Firestore stores lowercase slugs ("twin-house"); Airtable options are Title Case.
      fields['Property Type'] = String(unit.propertyType)
        .split(/[-_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    fields['Type'] = unit.monthlyRent && !unit.price ? 'Rent' : 'Sale';
    if (typeof unit.price === 'number') fields['Unit Price'] = unit.price;
    if (typeof unit.area === 'number') fields['Area'] = unit.area;
    if (typeof unit.bedrooms === 'number') fields['Bedrooms'] = unit.bedrooms;
    if (typeof unit.bathrooms === 'number') fields['Bathrooms'] = unit.bathrooms;
    if (unit.finishingType) {
      const finishing: Record<string, string> = {
        'fully-finished': 'Fully Finished',
        'semi-finished': 'Semi Finished',
        'core-shell': 'Core & Shell',
        'not-finished': 'Core & Shell',
      };
      fields['Finishing'] = finishing[unit.finishingType] ?? 'Fully Finished';
    }
    if (unit.status) {
      const availability: Record<string, string> = {
        available: 'Available',
        'under-offer': 'Under Offer',
        reserved: 'Under Offer',
        sold: 'Sold',
        rented: 'Rented',
        unavailable: 'Unavailable',
      };
      fields['Availability'] = availability[String(unit.status).toLowerCase()] ?? 'Available';
    }
    if (unit.description) fields['Comment'] = unit.description;
    if (unit.featuredImage) fields['Image URL'] = unit.featuredImage;
    return fields;
  }

  /** Exports Firestore listings into an Airtable table (default "Team Units"). */
  static async exportListings(table = 'Team Units'): Promise<AirtableSyncResult> {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error(
        'Airtable is not configured. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.',
      );
    }

    try {
      const snap = await adminDb.collection(COLLECTIONS.units).get();
      const records: Array<{ fields: Record<string, unknown> }> = [];
      snap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const fields = this.unitToAirtableFields(doc.id, doc.data() as Partial<Unit>);
        if (fields) records.push({ fields });
      });

      const { written, errors } = await this.upsertRecords(cfg, table, records, ['Code']);
      return {
        success: errors.length === 0,
        table,
        fetched: snap.size,
        syncedCount: written,
        errorCount: errors.length,
        timestamp: new Date().toISOString(),
        ...(errors.length > 0 ? { error: errors.join(' | ') } : {}),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, table, error: message };
    }
  }

  /** Exports Firestore leads (stakeholders) into an Airtable table (default "Leads"). */
  static async exportLeads(table = 'Leads'): Promise<AirtableSyncResult> {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error(
        'Airtable is not configured. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.',
      );
    }

    try {
      const snap = await adminDb.collection(COLLECTIONS.stakeholders).get();
      const records = snap.docs.map((doc: QueryDocumentSnapshot) => {
        const d = doc.data() as Record<string, unknown>;
        const createdAt = d.createdAt as { toDate?: () => Date } | undefined;
        const fields: Record<string, unknown> = {
          'Firestore ID': doc.id,
          Name: d.name ?? '',
        };
        if (d.phone) fields['Phone'] = d.phone;
        if (d.email) fields['Email'] = d.email;
        if (d.message) fields['Message'] = d.message;
        if (d.status) fields['Status'] = d.status;
        if (d.priority) fields['Priority'] = d.priority;
        if (d.via) fields['Via'] = d.via;
        if (d.locale === 'en' || d.locale === 'ar') fields['Locale'] = d.locale;
        if (createdAt?.toDate) fields['Created At'] = createdAt.toDate().toISOString();
        return { fields };
      });

      const { written, errors } = await this.upsertRecords(cfg, table, records, ['Firestore ID']);
      return {
        success: errors.length === 0,
        table,
        fetched: snap.size,
        syncedCount: written,
        errorCount: errors.length,
        timestamp: new Date().toISOString(),
        ...(errors.length > 0 ? { error: errors.join(' | ') } : {}),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, table, error: message };
    }
  }

  /** Runs the full Firestore → Airtable export (listings + leads). */
  static async exportToAirtable(): Promise<{
    success: boolean;
    listings: AirtableSyncResult;
    leads: AirtableSyncResult;
    timestamp: string;
  }> {
    const listings = await this.exportListings();
    const leads = await this.exportLeads();
    return {
      success: listings.success && leads.success,
      listings,
      leads,
      timestamp: new Date().toISOString(),
    };
  }
}
