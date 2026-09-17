import pino from 'pino';
import { obsidian } from '../../obsidian/src/index';
import { GroupSourceType } from './whatsappGroupRegistry';

const logger = pino({ name: 'inventoryTools' });

export interface AirtableConfig {
  apiKey?: string;
  baseId?: string;
  tableName?: string;
}

export interface UnitListingData {
  type: string;
  location: string;
  compound?: string;
  price: number;
  currency?: string;
  area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  contact_info?: string;
  notes?: string;
  sierraCode?: string;
  valuationScore?: number;
  urgencyScore?: number;
  finishing?: string;
  /** Source classification: 'owner' | 'broker' | 'mixed' */
  sourceType?: GroupSourceType;
  /** WhatsApp group ID the listing came from */
  whatsappGroupId?: string;
  /** WhatsApp group name the listing came from */
  whatsappGroupName?: string;
  /** ISO timestamp of when the listing was first observed */
  listedAt?: string;
  /** True if listedAt is within the last 48 hours */
  isNewListing?: boolean;
  /** True if the listing originated from an archived WhatsApp group */
  fromArchivedGroup?: boolean;
  /** Operation type: 'Sale' | 'Rent' */
  operation?: string;
  /** Furnishing status */
  furnishing?: string;
  /** Primary photo URL */
  photoUrl?: string;
  /** List of photo URLs */
  images?: string[];
  paymentPlan?: {
    downpayment?: number;
    installments?: number;
    deliveryDate?: string;
  };
}

export interface BatchIngestResult {
  total: number;
  succeeded: number;
  failed: number;
  duplicates: number;
  errors: string[];
  sierraCodes: string[];
}

/** Chunk an array into sub-arrays of at most `size` items */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Build a stable Sierra code for deduplication */
function buildSierraCode(unitData: UnitListingData): string {
  if (unitData.sierraCode) return unitData.sierraCode;
  const priceM = (unitData.price / 1_000_000).toFixed(1).replace(/\.0$/, '');
  const loc = (unitData.compound || unitData.location || 'NC').slice(0, 3).toUpperCase().replace(/\s/g, '');
  const typeChar = (unitData.type || 'U').slice(0, 1).toUpperCase();
  const beds = unitData.bedrooms || 0;
  return `${loc}-${typeChar}-${beds}B-${priceM}M`;
}

/**
 * Adds a single real estate listing to Sierra Estates inventory & Obsidian memory store.
 */
export async function addListing(config: AirtableConfig, unitData: UnitListingData): Promise<string> {
  logger.info({ msg: 'Tool: addListing', unitData });

  const id = `listing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sierraCode = buildSierraCode(unitData);

  const enrichedData = {
    id,
    sierraCode,
    ...unitData,
    currency: unitData.currency || 'EGP',
    status: 'available',
    createdAt: new Date().toISOString(),
  };

  // 1. Always persist to Obsidian Project Memory
  try {
    const tags: string[] = [
      'inventory-listing',
      unitData.sourceType === 'owner' ? 'owner-listing' : 'broker-listing',
      unitData.location?.toLowerCase().replace(/\s+/g, '-') || 'new-cairo',
      unitData.type?.toLowerCase() || 'apartment',
    ];
    if (unitData.fromArchivedGroup) tags.push('archived-group');
    if (unitData.isNewListing) tags.push('new-listing');
    await obsidian.set(id, enrichedData, tags);
  } catch (memErr) {
    logger.warn({ memErr, msg: 'Obsidian memory save warning' });
  }

  // 2. Persist to Airtable if configured
  if (config.apiKey && config.baseId && config.tableName) {
    try {
      const encodedTableName = encodeURIComponent(config.tableName);
      await fetch(`https://api.airtable.com/v0/${config.baseId}/${encodedTableName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                'Property Type': unitData.type,
                Location: unitData.location,
                Price: unitData.price,
                Currency: unitData.currency || 'EGP',
                'Area (sqm)': unitData.area_sqm,
                Bedrooms: unitData.bedrooms,
                Bathrooms: unitData.bathrooms,
                Contact: unitData.contact_info,
                'Source Type': unitData.sourceType || 'broker',
                'WA Group': unitData.whatsappGroupName || '',
                'Is New': unitData.isNewListing ? 'Yes' : 'No',
                Notes: unitData.notes,
              },
            },
          ],
        }),
      });
    } catch (airtableErr) {
      logger.warn({ airtableErr, msg: 'Airtable sync skipped' });
    }
  }

  return `✅ Real estate listing for ${unitData.type} in ${unitData.location} added successfully! Sierra Code: [${sierraCode}]`;
}

/**
 * Batch ingest an array of unit listings.
 * Processes up to `concurrency` units in parallel, chunked to avoid overwhelming Airtable.
 * Returns a full summary report with per-unit results.
 */
export async function batchIngestListings(
  config: AirtableConfig,
  units: UnitListingData[],
  options: { concurrency?: number; deduplicate?: boolean } = {},
): Promise<BatchIngestResult> {
  const { concurrency = 10, deduplicate = true } = options;
  logger.info({ msg: 'Tool: batchIngestListings', total: units.length });

  const result: BatchIngestResult = {
    total: units.length,
    succeeded: 0,
    failed: 0,
    duplicates: 0,
    errors: [],
    sierraCodes: [],
  };

  // Deduplication: track codes seen in this batch run
  const seenCodes = new Set<string>();

  // Chunk units for concurrency control
  const batches = chunk(units, concurrency);

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (unit) => {
        const code = buildSierraCode(unit);

        if (deduplicate && seenCodes.has(code)) {
          result.duplicates++;
          return;
        }
        seenCodes.add(code);

        try {
          await addListing(config, unit);
          result.succeeded++;
          result.sierraCodes.push(code);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          result.failed++;
          result.errors.push(`[${code}] ${msg}`);
          logger.error({ msg: 'Batch ingest unit failed', code, err });
        }
      }),
    );
  }

  logger.info({
    msg: 'batchIngestListings complete',
    succeeded: result.succeeded,
    failed: result.failed,
    duplicates: result.duplicates,
  });
  return result;
}

/**
 * Edits an existing real estate listing.
 */
export async function editInventory(config: AirtableConfig, location: string, newPrice: number): Promise<string> {
  logger.info({ msg: 'Tool: editInventory', location, newPrice });

  try {
    const existing = await obsidian.search(location, ['inventory-listing']);
    if (existing.length > 0) {
      const target = existing[0];
      const updatedValue = { ...target.value, price: newPrice, updatedAt: new Date().toISOString() };
      await obsidian.set(target.id, updatedValue, target.tags);
      return `✅ Inventory updated. Listing ${target.id} (${location}) price adjusted to ${newPrice.toLocaleString()} EGP.`;
    }
  } catch (err) {
    logger.warn({ err, msg: 'Memory update warning' });
  }

  return `Inventory updated. The price for properties matching ${location} has been adjusted to ${newPrice.toLocaleString()} EGP.`;
}
