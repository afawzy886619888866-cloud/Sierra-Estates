 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS, } from '../models/schema';
import { mapRowToUnit } from './listing-normalize';


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























export class AirtableIntegrationService {
  /** Reads + validates Airtable config from the environment. */
  static getConfig() {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableEnv = process.env.AIRTABLE_TABLE_NAME;
    if (!apiKey || !baseId || !tableEnv) return null;
    const tables = tableEnv.split(',').map((t) => t.trim()).filter(Boolean);
    if (tables.length === 0) return null;
    return { apiKey, baseId, tables };
  }

  /** Infers the listing owner type from the Airtable table name. */
  static ownerTypeForTable(table) {
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
    cfg,
    table,
  ) {
    const records = [];
    let offset;

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

      const json = (await res.json()) ;
      if (Array.isArray(json.records)) records.push(...json.records);
      offset = json.offset;
    } while (offset);

    return records;
  }

  /** Syncs a single Airtable table into Firestore. */
  static async syncTable(
    cfg,
    table,
  ) {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[AirtableIntegrationService] Sync failed for "${table}":`, message);
      return { success: false, table, error: message };
    }
  }

  /**
   * Syncs every configured table. Returns a per-table breakdown plus rolled-up
   * totals. Throws a descriptive error if Airtable is not configured.
   */
  static async syncFromEnv()





 {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error(
        'Airtable is not configured. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.',
      );
    }

    const results = [];
    for (const table of cfg.tables) {
      results.push(await this.syncTable(cfg, table));
    }

    return {
      success: results.every((r) => r.success),
      totalSynced: results.reduce((sum, r) => sum + (_nullishCoalesce(r.syncedCount, () => ( 0))), 0),
      totalErrors: results.reduce((sum, r) => sum + (_nullishCoalesce(r.errorCount, () => ( 0))), 0),
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

  static  __initStatic() {this.EXPORT_BATCH_SIZE = 10}

  /** Upserts a chunk of records into an Airtable table. */
  static async upsertRecords(
    cfg,
    table,
    records,
    mergeOn,
  ) {
    let written = 0;
    const errors = [];

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
      const json = (await res.json()) ;
      written += _nullishCoalesce(_optionalChain([json, 'access', _ => _.records, 'optionalAccess', _2 => _2.length]), () => ( chunk.length));
    }

    return { written, errors };
  }

  /** Maps a Firestore Unit document to the Airtable listing columns. */
  static unitToAirtableFields(id, unit) {
    const code = unit.referenceNumber || unit.code || `FS-${id}`;
    const fields = {
      Code: code,
      Name: _nullishCoalesce(unit.title, () => ( '')),
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
      const finishing = {
        'fully-finished': 'Fully Finished',
        'semi-finished': 'Semi Finished',
        'core-shell': 'Core & Shell',
        'not-finished': 'Core & Shell',
      };
      fields['Finishing'] = _nullishCoalesce(finishing[unit.finishingType], () => ( 'Fully Finished'));
    }
    if (unit.status) {
      const availability = {
        available: 'Available',
        'under-offer': 'Under Offer',
        reserved: 'Under Offer',
        sold: 'Sold',
        rented: 'Rented',
        unavailable: 'Unavailable',
      };
      fields['Availability'] = _nullishCoalesce(availability[String(unit.status).toLowerCase()], () => ( 'Available'));
    }
    if (unit.description) fields['Comment'] = unit.description;
    if (unit.featuredImage) fields['Image URL'] = unit.featuredImage;
    return fields;
  }

  /**
   * Exports Firestore listings into an Airtable table (default "Team Units").
   * Scoped to owner-sourced inventory (`ownerType === 'owner'`) — Sheets and
   * Airtable are the owner-listing sync surface, not a mirror of broker or
   * internal/team inventory.
   */
  static async exportListings(table = 'Team Units') {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error(
        'Airtable is not configured. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.',
      );
    }

    try {
      const snap = await adminDb
        .collection(COLLECTIONS.units)
        .where('ownerType', '==', 'owner')
        .get();
      const records = [];
      snap.docs.forEach((doc) => {
        const fields = this.unitToAirtableFields(doc.id, doc.data() );
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, table, error: message };
    }
  }

  /** Exports Firestore leads (stakeholders) into an Airtable table (default "Leads"). */
  static async exportLeads(table = 'Leads') {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new Error(
        'Airtable is not configured. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.',
      );
    }

    try {
      const snap = await adminDb.collection(COLLECTIONS.stakeholders).get();
      const records = snap.docs.map((doc) => {
        const d = doc.data() ;
        const createdAt = d.createdAt ;
        const fields = {
          'Firestore ID': doc.id,
          Name: _nullishCoalesce(d.name, () => ( '')),
        };
        if (d.phone) fields['Phone'] = d.phone;
        if (d.email) fields['Email'] = d.email;
        if (d.message) fields['Message'] = d.message;
        if (d.status) fields['Status'] = d.status;
        if (d.priority) fields['Priority'] = d.priority;
        if (d.via) fields['Via'] = d.via;
        if (d.locale === 'en' || d.locale === 'ar') fields['Locale'] = d.locale;
        if (_optionalChain([createdAt, 'optionalAccess', _3 => _3.toDate])) fields['Created At'] = createdAt.toDate().toISOString();
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, table, error: message };
    }
  }

  /** Runs the full Firestore → Airtable export (listings + leads). */
  static async exportToAirtable()




 {
    const listings = await this.exportListings();
    const leads = await this.exportLeads();
    return {
      success: listings.success && leads.success,
      listings,
      leads,
      timestamp: new Date().toISOString(),
    };
  }
} AirtableIntegrationService.__initStatic();
